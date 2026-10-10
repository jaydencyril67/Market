"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const brain_1 = require("./brain");
const session_1 = require("./session");
const runtime_1 = require("./execution/runtime");
const think_1 = require("./live/think");
function assert(condition, message) {
    if (!condition)
        throw new Error("Behavior test failed: " + message);
}
function test(name, run) {
    run();
    console.log("PASS " + name);
}
async function testAsync(name, run) {
    await run();
    console.log("PASS " + name);
}
async function main() {
    test("normalization handles casual language and common typos", () => {
        assert((0, brain_1.normalize)("Wanna check my balnce pls") === "want to check my balance please", "normalization should expand slang and correct supported typos");
        assert((0, brain_1.normalize)("  ") === "", "blank input should normalize to an empty string");
    });
    test("brain returns a structured, non-empty result for a supported request", () => {
        const result = (0, brain_1.think)("open my bots");
        assert(typeof result.response === "string" && result.response.trim().length > 0, "response should be present");
        assert(typeof result.confidence === "number" && result.confidence >= 0 && result.confidence <= 1, "confidence should be within 0..1");
        assert(result.action !== undefined && typeof result.action.type === "string", "an action shape should be present");
        assert(result.normalized === "open my bots", "normalized input should be retained");
        assert(result.action.type === "navigate" && result.action.target === "/bots", "request should resolve to the My Bots route; got " + JSON.stringify(result.action));
    });
    test("brain handles different user phrasings without crashing", () => {
        const inputs = [
            "Can you show me what I have?",
            "I wanna put money in my account",
            "where can I manage my developer access",
            "I need a new bot",
            "is bot abc123 running",
            "how can I protect my account",
            "can I speak to Crybots",
            "show my portfolio and then open settings",
            "what webhook events are supported",
            "are bot profits guaranteed"
        ];
        for (const input of inputs) {
            const result = (0, brain_1.think)(input);
            assert(result.response.trim().length > 0, "empty response for input: " + input);
            assert(result.context !== undefined, "context missing for input: " + input);
            assert(Array.isArray(result.alternatives), "alternatives should be an array for input: " + input);
        }
    });
    test("a balance request resolves to the balance intent", () => {
        const result = (0, brain_1.think)("check my balance");
        assert(result.intent === "balance", "balance intent should win for a direct balance request");
        assert(result.action.type === "navigate" && result.action.target === "details", "balance request should open the details route");
    });
    test("conversation session retains context and can reset", () => {
        const session = new session_1.BrainSession();
        session.ask("open my bots");
        assert((session.history ?? []).length > 0, "first turn should enter session history");
        session.ask("open my portfolio");
        assert((session.history ?? []).length >= 2, "follow-up should be retained in history");
        session.reset();
        assert(session.history.length === 0, "reset should clear history");
        assert(session.lastIntent === undefined, "reset should clear last intent");
    });
    test("multi-step requests produce a decision instead of throwing", () => {
        const result = (0, brain_1.think)("open my bots and check bot abc123");
        assert(result.context.decision !== undefined, "decision metadata should be attached");
        assert(["single", "sequence", "clarify"].includes(result.context.decision.mode), "decision mode should be valid");
        assert(result.context.decision.steps.length >= 1, "decision should contain at least one step");
    });
    await testAsync("live balance reasoning never infers a missing financial value", async () => {
        const seen = [];
        const bridge = { query: async (query) => { seen.push(query); return { topic: query.topic, ok: true, data: { accountId: "account-1", unrelatedMetric: 500 }, fetchedAt: "2026-10-10T00:00:00Z" }; } };
        const result = await (0, think_1.thinkLive)("check my balance", {}, bridge);
        assert(seen.length === 1 && seen[0].topic === "account-state", "balance request should query account-state data");
        assert(result.response.toLowerCase().includes("cannot be inferred") || result.response.toLowerCase().includes("cannot infer") || result.response.toLowerCase().includes("won't guess"), "response should explain that missing balance cannot be inferred");
        assert(!result.response.includes("500"), "unrelated numeric data must not be presented as a balance");
    });
    await testAsync("live data failures identify the unavailable source without implying success", async () => {
        const bridge = { query: async (query) => ({ topic: query.topic, ok: false, data: null, message: "service timeout" }) };
        const result = await (0, think_1.thinkLive)("check my balance", {}, bridge);
        assert(result.response.toLowerCase().includes("account and balance data"), "failure should name the unavailable data domain");
        assert(result.response.includes("service timeout"), "useful source error detail should be preserved");
        assert(!/balance is|balance was|successfully retrieved/i.test(result.response), "failure must not imply that current data was retrieved");
    });
    await testAsync("live bot summaries report returned status without claiming profitability", async () => {
        const bridge = { query: async (query) => ({ topic: query.topic, ok: true, data: { investments: [{ botId: "BOT-7", status: "active", profit: 99 }] } }) };
        const result = await (0, think_1.thinkLive)("show my active bots", {}, bridge);
        assert(result.response.includes("BOT-7"), "active bot response should include the returned bot ID");
        assert(!/profitable|profit is|earned|guaranteed/i.test(result.response), "status alone must not become a profitability claim");
    });
    await testAsync("sensitive actions are rejected until explicitly confirmed", async () => {
        const command = {
            id: "test-withdrawal", intent: "withdraw",
            action: { type: "api", operation: "bot_withdraw", target: "BOT123", parameters: { amount: "10" } },
            parameters: { amount: "10" }, risk: "high", requiresConfirmation: true, status: "ready"
        };
        const executions = { value: 0 };
        const executionCount = () => executions.value;
        const executor = async () => { executions.value++; return { commandId: command.id, status: "executed", message: "accepted" }; };
        const blocked = await (0, runtime_1.executeCommand)(command, executor);
        assert(blocked.status === "rejected", "unconfirmed sensitive command should be rejected");
        assert(executionCount() === 0, "executor must not run before confirmation");
        const approved = await (0, runtime_1.executeCommand)(command, executor, true);
        assert(approved.status === "executed", "confirmed valid command should reach executor");
        assert(executionCount() === 1, "executor should run exactly once after confirmation");
    });
    await testAsync("API execution refuses a missing bot identifier", async () => {
        const command = {
            id: "test-missing-bot", intent: "bot_activate",
            action: { type: "api", operation: "bot_activate", parameters: { amount: "10" } },
            parameters: { amount: "10" }, risk: "high", requiresConfirmation: true, status: "ready"
        };
        const result = await (0, runtime_1.executeCommand)(command, async () => ({ commandId: command.id, status: "executed", message: "must not run" }), true);
        assert(result.status === "failed", "missing bot ID should fail validation");
        assert(result.message.toLowerCase().includes("bot id"), "validation failure should explain the missing identifier");
    });
    await testAsync("executor errors become structured failures", async () => {
        const command = {
            id: "test-executor-error", intent: "portfolio",
            action: { type: "navigate", target: "portfolio" }, parameters: {}, risk: "low", requiresConfirmation: false, status: "ready"
        };
        const result = await (0, runtime_1.executeCommand)(command, async () => { throw new Error("simulated executor fault"); });
        assert(result.status === "failed", "thrown executor error should become a failed result");
        assert(result.message === "simulated executor fault", "failure should preserve the useful error message");
    });
    console.log("All CryBots Brain behavior tests passed.");
}
void main().catch(error => {
    console.error(error);
    throw error;
});
