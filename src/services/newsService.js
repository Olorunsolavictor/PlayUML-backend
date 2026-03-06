const DEFAULT_FEEDS = [
  "https://www.notjustok.com/feed/",
  "https://www.pulse.ng/entertainment/rss",
  "https://www.musicbusinessworldwide.com/feed/",
];

const CACHE_TTL_MS = Number(process.env.NEWS_CACHE_TTL_MS ?? 10 * 60 * 1000);
const REQUEST_TIMEOUT_MS = Number(process.env.NEWS_REQUEST_TIMEOUT_MS ?? 8000);
const MAX_ITEMS_DEFAULT = Number(process.env.NEWS_MAX_ITEMS ?? 20);
const REQUIRE_AFROBEATS =
  String(process.env.NEWS_REQUIRE_AFROBEATS ?? "true").toLowerCase() !==
  "false";

const MUSIC_KEYWORDS = [
  "music",
  "song",
  "single",
  "album",
  "ep",
  "track",
  "artist",
  "record label",
  "charts",
  "stream",
  "streaming",
  "playlist",
  "video",
  "audiomack",
  "spotify",
  "apple music",
  "youtube",
];

const AFROBEATS_KEYWORDS = [
  "afrobeats",
  "afrobeat",
  "afropop",
  "naija",
  "nigerian",
  "burna boy",
  "wizkid",
  "davido",
  "tems",
  "rema",
  "asake",
  "ayra starr",
  "fireboy",
  "omah lay",
  "joeboy",
  "simi",
  "tiwa savage",
  "kizz daniel",
  "adekunle gold",
  "naira marley",
];

let cache = {
  expiresAt: 0,
  items: [],
};

function getFeeds() {
  const configured = (process.env.NEWS_RSS_FEEDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_FEEDS;
}

function decodeEntities(input = "") {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(input = "") {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTagText(block, tagNames = []) {
  for (const tagName of tagNames) {
    const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
    const match = block.match(pattern);
    if (match?.[1]) return stripHtml(decodeEntities(match[1]));
  }
  return "";
}

function extractRssItems(xml, sourceLabel) {
  const rawItems = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return rawItems
    .map((block) => {
      const title = extractTagText(block, ["title"]);
      const link = extractTagText(block, ["link"]);
      const summary = extractTagText(block, ["description", "content:encoded"]);
      const publishedAt = extractTagText(block, ["pubDate", "dc:date"]);
      const image = (
        block.match(/<enclosure[^>]*url=["']([^"']+)["']/i)?.[1] ||
        block.match(/<media:content[^>]*url=["']([^"']+)["']/i)?.[1] ||
        block.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i)?.[1] ||
        block.match(/<itunes:image[^>]*href=["']([^"']+)["']/i)?.[1] ||
        block.match(/<img[^>]*src=["']([^"']+)["']/i)?.[1] ||
        ""
      ).trim();

      if (!title || !link) return null;

      return {
        id: link,
        title,
        url: link,
        summary,
        imageUrl: image,
        source: sourceLabel,
        publishedAt: publishedAt || null,
      };
    })
    .filter(Boolean);
}

function extractAtomItems(xml, sourceLabel) {
  const rawEntries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];

  return rawEntries
    .map((block) => {
      const title = extractTagText(block, ["title"]);
      const summary = extractTagText(block, ["summary", "content"]);
      const publishedAt = extractTagText(block, ["published", "updated"]);
      const link =
        block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]?.trim() || "";
      const image = (
        block.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i)?.[1] ||
        block.match(/<media:content[^>]*url=["']([^"']+)["']/i)?.[1] ||
        block.match(/<img[^>]*src=["']([^"']+)["']/i)?.[1] ||
        ""
      ).trim();

      if (!title || !link) return null;

      return {
        id: link,
        title,
        url: link,
        summary,
        imageUrl: image,
        source: sourceLabel,
        publishedAt: publishedAt || null,
      };
    })
    .filter(Boolean);
}

function extractSourceLabel(xml, feedUrl) {
  const channelTitle = xml.match(/<channel\b[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (channelTitle) {
    return stripHtml(decodeEntities(channelTitle)).slice(0, 80);
  }

  const title = extractTagText(xml, ["title"]);
  if (title) return title.slice(0, 80);

  try {
    const host = new URL(feedUrl).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return "feed";
  }
}

function containsAnyKeyword(haystack, keywords) {
  const text = haystack.toLowerCase();
  return keywords.some((keyword) => text.includes(keyword));
}

function isRelevant(item) {
  const haystack = `${item.title || ""} ${item.summary || ""}`.toLowerCase();
  const hasMusicSignal = containsAnyKeyword(haystack, MUSIC_KEYWORDS);
  if (!hasMusicSignal) return false;
  if (!REQUIRE_AFROBEATS) return true;
  return containsAnyKeyword(haystack, AFROBEATS_KEYWORDS);
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) => {
    const da = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const db = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return db - da;
  });
}

async function fetchXml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PlayUML-NewsBot/1.0 (+https://playuml.site)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function getLatestNews(limit = MAX_ITEMS_DEFAULT) {
  const now = Date.now();
  if (cache.expiresAt > now && cache.items.length > 0) {
    return cache.items.slice(0, limit);
  }

  const feeds = getFeeds();
  const feedResults = await Promise.allSettled(
    feeds.map(async (feedUrl) => {
      const xml = await fetchXml(feedUrl);
      const source = extractSourceLabel(xml, feedUrl);
      const rssItems = extractRssItems(xml, source);
      if (rssItems.length > 0) return rssItems;
      return extractAtomItems(xml, source);
    }),
  );

  const merged = [];
  for (const result of feedResults) {
    if (result.status === "fulfilled") merged.push(...result.value);
  }

  const deduped = [];
  const seen = new Set();
  for (const item of sortByDateDesc(merged)) {
    if (seen.has(item.url)) continue;
    if (!isRelevant(item)) continue;
    seen.add(item.url);
    deduped.push(item);
  }

  cache = {
    expiresAt: now + CACHE_TTL_MS,
    items: deduped,
  };

  return deduped.slice(0, limit);
}
