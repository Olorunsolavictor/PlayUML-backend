import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const digestScriptPath = fileURLToPath(
  new URL("../scripts/sendDailyDigest.js", import.meta.url),
);

const digestState = {
  running: false,
  startedAt: null,
  finishedAt: null,
  lastStatus: "idle",
  lastError: null,
  lastExitCode: null,
  pid: null,
  recentLogs: [],
};

const pushLog = (level, message) => {
  digestState.recentLogs.push({
    level,
    message,
    at: new Date().toISOString(),
  });

  if (digestState.recentLogs.length > 80) {
    digestState.recentLogs = digestState.recentLogs.slice(-80);
  }
};

const forwardLogs = (stream, method, pid) => {
  stream.on("data", (chunk) => {
    const message = String(chunk || "").trim();
    if (!message) return;
    pushLog(method, `[daily-digest:${pid}] ${message}`);
    console[method](`[daily-digest:${pid}] ${message}`);
  });
};

export const getDailyDigestJobStatus = () => ({ ...digestState });

export const triggerDailyDigestJob = () => {
  if (digestState.running) {
    return {
      started: false,
      reason: "already-running",
      status: getDailyDigestJobStatus(),
    };
  }

  const child = spawn(process.execPath, [digestScriptPath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  digestState.running = true;
  digestState.startedAt = new Date().toISOString();
  digestState.finishedAt = null;
  digestState.lastStatus = "running";
  digestState.lastError = null;
  digestState.lastExitCode = null;
  digestState.pid = child.pid ?? null;
  digestState.recentLogs = [];
  pushLog("log", "Daily digest process started");

  if (child.stdout) forwardLogs(child.stdout, "log", child.pid ?? "n/a");
  if (child.stderr) forwardLogs(child.stderr, "error", child.pid ?? "n/a");

  child.on("error", (error) => {
    digestState.running = false;
    digestState.finishedAt = new Date().toISOString();
    digestState.lastStatus = "failed";
    digestState.lastError = error.message;
    digestState.lastExitCode = null;
    digestState.pid = null;
    pushLog("error", error.message);
  });

  child.on("exit", (code) => {
    digestState.running = false;
    digestState.finishedAt = new Date().toISOString();
    digestState.lastExitCode = code;
    digestState.lastStatus = code === 0 ? "succeeded" : "failed";
    digestState.lastError = code === 0 ? null : `Exited with code ${code}`;
    digestState.pid = null;
    pushLog(
      code === 0 ? "log" : "error",
      code === 0
        ? "Daily digest process completed successfully"
        : `Daily digest process exited with code ${code}`,
    );
  });

  return {
    started: true,
    status: getDailyDigestJobStatus(),
  };
};

