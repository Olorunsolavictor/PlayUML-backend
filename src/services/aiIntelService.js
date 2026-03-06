const AI_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function extractJsonObject(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || trimmed;

  const objMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objMatch?.[0]) return null;

  try {
    return JSON.parse(objMatch[0]);
  } catch {
    return null;
  }
}

function deterministicLine(artist, mode) {
  const momentum = Number(artist.momentumScore || 0).toFixed(2);
  const sentiment = Number(artist.newsSentiment || 0).toFixed(2);
  const coinDelta = Number(artist.coinDelta || 0).toFixed(2);

  if (mode === "risk") {
    return `${artist.name}: weak momentum (${momentum}) and news sentiment ${sentiment}. Coin move ${coinDelta}.`;
  }
  return `${artist.name}: momentum ${momentum}, news sentiment ${sentiment}, coin move ${coinDelta}.`;
}

export async function generateIntelCopy({
  captainPicks,
  transferTargets,
  riskAlerts,
}) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || AI_PROVIDER !== "gemini") {
    return {
      provider: "rules-only",
      captain: Object.fromEntries(
        captainPicks.map((item) => [item.artisteId, deterministicLine(item, "captain")]),
      ),
      transfer: Object.fromEntries(
        transferTargets.map((item) => [item.artisteId, deterministicLine(item, "transfer")]),
      ),
      risk: Object.fromEntries(
        riskAlerts.map((item) => [item.artisteId, deterministicLine(item, "risk")]),
      ),
    };
  }

  const payload = {
    captainPicks: captainPicks.map((item) => ({
      id: item.artisteId,
      name: item.name,
      momentumScore: item.momentumScore,
      newsMentions: item.newsMentions,
      newsSentiment: item.newsSentiment,
      coinDelta: item.coinDelta,
    })),
    transferTargets: transferTargets.map((item) => ({
      id: item.artisteId,
      name: item.name,
      momentumScore: item.momentumScore,
      newsMentions: item.newsMentions,
      newsSentiment: item.newsSentiment,
      coinDelta: item.coinDelta,
    })),
    riskAlerts: riskAlerts.map((item) => ({
      id: item.artisteId,
      name: item.name,
      momentumScore: item.momentumScore,
      newsMentions: item.newsMentions,
      newsSentiment: item.newsSentiment,
      coinDelta: item.coinDelta,
    })),
  };

  const prompt = `
You are an analyst for a fantasy afrobeats game.
Write short explanations (max 22 words each), simple and non-hype.
Return ONLY JSON object:
{
  "captain": {"<id>":"..."},
  "transfer": {"<id>":"..."},
  "risk": {"<id>":"..."}
}
Data:
${JSON.stringify(payload)}
`.trim();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        GEMINI_MODEL,
      )}:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 700,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini failed with ${response.status}`);
    }

    const json = await response.json();
    const text =
      json?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .join("\n") || "";

    const parsed = extractJsonObject(text);
    if (!parsed) throw new Error("Invalid Gemini JSON output");

    return {
      provider: `gemini:${GEMINI_MODEL}`,
      captain: parsed.captain || {},
      transfer: parsed.transfer || {},
      risk: parsed.risk || {},
    };
  } catch (error) {
    console.error("generateIntelCopy failed", error);
    return {
      provider: "rules-fallback",
      captain: Object.fromEntries(
        captainPicks.map((item) => [item.artisteId, deterministicLine(item, "captain")]),
      ),
      transfer: Object.fromEntries(
        transferTargets.map((item) => [item.artisteId, deterministicLine(item, "transfer")]),
      ),
      risk: Object.fromEntries(
        riskAlerts.map((item) => [item.artisteId, deterministicLine(item, "risk")]),
      ),
    };
  }
}

