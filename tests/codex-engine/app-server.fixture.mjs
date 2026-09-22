import { createInterface } from "node:readline";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
const root = process.argv[2];
const path = join(root, "engine.json");
let state;
try {
  state = JSON.parse(await readFile(path, "utf8"));
} catch {
  state = { threads: {}, count: 0 };
}
const save = () => writeFile(path, JSON.stringify(state));
const send = (value) => process.stdout.write(JSON.stringify(value) + "\n");
const pending = new Map();
const user = (id, value) => ({ id, type: "userMessage", content: [{ type: "text", text: value }] });
async function complete(threadId, turn, answer) {
  const item = { id: `answer-${turn.id}`, type: "agentMessage", text: answer };
  turn.items.push(item);
  turn.status = "completed";
  await save();
  send({ method: "item/completed", params: { threadId, turnId: turn.id, item } });
  send({ method: "turn/completed", params: { threadId, turn } });
}
async function handle(m) {
  await appendFile(join(root, "wire.jsonl"), JSON.stringify(m) + "\n");
  if (!m.method) {
    const task = pending.get(m.id);
    if (task) {
      pending.delete(m.id);
      await complete(task.threadId, task.turn, JSON.stringify(m.result));
    }
    return;
  }
  if (m.id === undefined) return;
  const p = m.params || {};
  const result = (r) => send({ id: m.id, result: r });
  const failure = (code, message) => send({ id: m.id, error: { code, message } });
  if (m.method === "initialize") return result({ userAgent: "codex-cli/fixture", codexHome: root });
  if (m.method === "account/read") {
    let type = "chatgpt";
    try {
      type = await readFile(join(root, "account-type"), "utf8");
    } catch {}
    return result({ account: { type, planType: "pro" } });
  }
  if (m.method === "account/login/start")
    return result({ loginId: "test-login", authUrl: "https://auth.openai.com/test" });
  if (m.method === "account/login/cancel") return result({ status: "canceled" });
  if (m.method === "model/list")
    return result({
      data: [
        { id: "real-model", model: "real-model", displayName: "Actual model", isDefault: true },
      ],
    });
  if (m.method === "account/rateLimits/read") return result({ rateLimits: null });
  if (m.method === "thread/start") {
    const thread = { id: `new-${++state.count}`, cwd: p.cwd, turns: [] };
    state.threads[thread.id] = thread;
    await save();
    return result({ thread });
  }
  if (m.method === "thread/list")
    return result({ data: Object.values(state.threads), nextCursor: null });
  const thread = state.threads[p.threadId];
  if (!thread) return failure(-32001, "Unknown thread");
  if (m.method === "thread/read")
    return result({ thread: p.includeTurns ? thread : { ...thread, turns: [] } });
  if (m.method === "thread/turns/list") {
    const start = Number(p.cursor || 0),
      end = Math.min(thread.turns.length, start + (p.limit || 50));
    return result({
      data: thread.turns.slice(start, end),
      nextCursor: end < thread.turns.length ? String(end) : null,
    });
  }
  if (m.method === "thread/fork") {
    if (thread.compatibility) return failure(-32601, "Fork unavailable");
    const copy = structuredClone(thread);
    copy.id = `copy-${++state.count}`;
    const boundary = copy.turns.findIndex((t) => t.id === p.lastTurnId);
    copy.turns = copy.turns.slice(0, boundary + 1);
    state.threads[copy.id] = copy;
    await save();
    return result({ thread: copy });
  }
  if (m.method === "thread/resume") return result({ thread });
  if (m.method === "turn/start") {
    const text = p.input[0].text;
    const turn = {
      id: `turn-${++state.count}`,
      status: "inProgress",
      items: [user(`user-${state.count}`, text)],
    };
    thread.turns.push(turn);
    await save();
    send({ method: "turn/started", params: { threadId: thread.id, turn } });
    send({
      method: "item/completed",
      params: { threadId: thread.id, turnId: turn.id, item: turn.items[0] },
    });
    if (text === "immediate") {
      await complete(thread.id, turn, "Finished before acknowledgement");
      return result({ turn });
    }
    result({ turn });
    if (text.startsWith("approval")) {
      const method = text.split(" ")[1] || "item/commandExecution/requestApproval";
      pending.set(900, { threadId: thread.id, turn });
      send({
        id: 900,
        method,
        params: {
          threadId: thread.id,
          turnId: turn.id,
          itemId: "command-1",
          command: "printf test",
          availableDecisions: ["accept", "acceptForSession", "decline", "cancel"],
          permissions: { network: { enabled: true } },
        },
      });
    } else if (text !== "keep-running") await complete(thread.id, turn, "Done");
    return;
  }
  if (m.method === "turn/steer") return result({ turnId: p.expectedTurnId });
  if (m.method === "turn/interrupt") {
    const turn = thread.turns.find((t) => t.id === p.turnId);
    turn.status = "interrupted";
    await save();
    send({ method: "turn/completed", params: { threadId: thread.id, turn } });
    return result({});
  }
  return failure(-32601, "Unsupported fixture method");
}
let queue = Promise.resolve();
createInterface({ input: process.stdin }).on("line", (line) => {
  queue = queue
    .then(() => handle(JSON.parse(line)))
    .catch((e) => {
      process.stderr.write(String(e));
      process.exit(1);
    });
});
