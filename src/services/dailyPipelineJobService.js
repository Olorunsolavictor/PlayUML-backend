import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const pipelineScriptPath = fileURLToPath(
  new URL("../scripts/runDailyPipeline.js", import.meta.url),
);

const pipelineState = {
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
  pipelineState.recentLogs.push({
    level,
    message,
    at: new Date().toISOString(),
  });

  if (pipelineState.recentLogs.length > 80) {
    pipelineState.recentLogs = pipelineState.recentLogs.slice(-80);
  }
};

const forwardLogs = (stream, method, pid) => {
  stream.on("data", (chunk) => {
    const message = String(chunk || "").trim();
    if (!message) return;
    pushLog(method, `[daily-pipeline:${pid}] ${message}`);
    console[method](`[daily-pipeline:${pid}] ${message}`);
  });
};

export const getDailyPipelineJobStatus = () => ({ ...pipelineState });

export const triggerDailyPipelineJob = () => {
  if (pipelineState.running) {
    return {
      started: false,
      reason: "already-running",
      status: getDailyPipelineJobStatus(),
    };
  }

  const child = spawn(process.execPath, [pipelineScriptPath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  pipelineState.running = true;
  pipelineState.startedAt = new Date().toISOString();
  pipelineState.finishedAt = null;
  pipelineState.lastStatus = "running";
  pipelineState.lastError = null;
  pipelineState.lastExitCode = null;
  pipelineState.pid = child.pid ?? null;
  pipelineState.recentLogs = [];
  pushLog("log", "Daily pipeline process started");

  if (child.stdout) forwardLogs(child.stdout, "log", child.pid ?? "n/a");
  if (child.stderr) forwardLogs(child.stderr, "error", child.pid ?? "n/a");

  child.on("error", (error) => {
    pipelineState.running = false;
    pipelineState.finishedAt = new Date().toISOString();
    pipelineState.lastStatus = "failed";
    pipelineState.lastError = error.message;
    pipelineState.lastExitCode = null;
    pipelineState.pid = null;
    pushLog("error", error.message);
  });

  child.on("exit", (code) => {
    pipelineState.running = false;
    pipelineState.finishedAt = new Date().toISOString();
    pipelineState.lastExitCode = code;
    pipelineState.lastStatus = code === 0 ? "succeeded" : "failed";
    pipelineState.lastError = code === 0 ? null : `Exited with code ${code}`;
    pipelineState.pid = null;
    pushLog(
      code === 0 ? "log" : "error",
      code === 0
        ? "Daily pipeline process completed successfully"
        : `Daily pipeline process exited with code ${code}`,
    );
  });

  return {
    started: true,
    status: getDailyPipelineJobStatus(),
  };
};
