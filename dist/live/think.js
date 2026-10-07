"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.thinkLive = thinkLive;
const brain_1 = require("../brain");
const router_1 = require("./router");
const verifiedTopicMap = {
    "verified:portfolio": "account-state", "verified:my-bots": "bots", "verified:bot-performance": "bots", "verified:bot-lifecycle": "bots",
    "verified:webhooks": "webhooks", "verified:webhook-history": "webhooks", "verified:notifications": "notifications", "verified:history": "transactions", "verified:trade": "market",
};
function topicFor(result) { return (0, router_1.liveTopicForResult)(result) ?? verifiedTopicMap[result.intent ?? ""]; }
const asRecord = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : null;
const formatAmount = (value, currency) => { const n = Number(value); return Number.isFinite(n) ? n.toFixed(2) + (currency ? " " + String(currency) : "") : String(value ?? ""); };
function reasonOverLiveData(input, live) {
    const text = input.toLowerCase();
    const data = live.data;
    if (live.topic === "transactions" && Array.isArray(data)) {
        if (!data.length)
            return "You do not have any recorded CryBots transactions yet.";
        const latest = asRecord(data[0]);
        if (!latest)
            return live.message;
        const title = String(latest.title ?? latest.category ?? latest.direction ?? "Transaction");
        const amount = formatAmount(latest.amount, latest.currency);
        const status = latest.status ? String(latest.status) : "";
        const when = latest.createdAt ? new Date(String(latest.createdAt)).toLocaleString() : "";
        if (/latest|last|most recent|recent transaction/.test(text))
            return "Your latest transaction is " + title + " for " + amount + (status ? ", status: " + status : "") + (when ? ", recorded " + when : "") + ".";
        return live.message;
    }
    if (live.topic === "bots") {
        const record = asRecord(data);
        const investments = Array.isArray(record?.investments) ? record.investments : [];
        const active = investments.filter((item) => item?.active === true || ["activating", "active"].includes(String(item?.lifecycleStatus ?? "").toLowerCase()));
        if (/which|what|show|list/.test(text) && /active|running/.test(text)) {
            if (!active.length)
                return "None of your bot investments are currently active or activating.";
            const ids = active.map((item) => item?.botId).filter(Boolean);
            return ids.length ? "Your active or activating bots are: " + ids.join(", ") + "." : "You have " + active.length + " active or activating bot investment" + (active.length === 1 ? "" : "s") + ".";
        }
        if (active.length === 1 && /active|running|status/.test(text)) {
            const id = active[0]?.botId;
            return id ? "Bot " + id + " is currently active or activating." : live.message;
        }
        return live.message;
    }
    if (live.topic === "webhooks") {
        const record = asRecord(data);
        const webhooks = Array.isArray(record?.webhooks) ? record.webhooks : [];
        if (/which|what|show|list/.test(text) && /webhook/.test(text)) {
            if (!webhooks.length)
                return "You do not have any webhooks yet.";
            return webhooks.map((item) => String(item?.name ?? item?._id ?? "Webhook") + " — " + (item?.enabled ? "enabled" : "disabled")).join("; ");
        }
    }
    if (live.topic === "notifications") {
        const record = asRecord(data);
        const notifications = Array.isArray(record?.notifications) ? record.notifications : [];
        if (/latest|recent|last/.test(text) && notifications.length) {
            const n = asRecord(notifications[0]);
            if (n)
                return "Your latest notification is: " + String(n.title ?? n.message ?? "Notification") + ".";
        }
    }
    return live.message;
}
async function thinkLive(input, context = {}, bridge, options = {}) {
    const result = (0, brain_1.think)(input, context);
    const topic = topicFor(result);
    if (!topic)
        return result;
    const query = (0, router_1.buildLiveQuery)(result, input, result.entities, options.userId);
    const liveQuery = query ?? { topic, input, entities: result.entities, userId: options.userId };
    liveQuery.topic = topic;
    const live = await bridge.query(liveQuery);
    if (!live.ok)
        return { ...result, response: live.message ?? "I could not retrieve your current CryBots data right now. Please try again.", action: result.action, liveData: undefined };
    return { ...result, response: reasonOverLiveData(input, live) ?? "I checked the current CryBots data, but there is no live summary available yet.", action: result.action, liveData: live.data, context: { ...result.context, lastTarget: result.context.lastTarget } };
}
