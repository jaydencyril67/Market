"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.thinkLive = thinkLive;
const brain_1 = require("../brain");
const router_1 = require("./router");
const adaptation_1 = require("../knowledge/adaptation");
const compose_1 = require("../responses/compose");
const verifiedTopicMap = {
    "verified:portfolio": "account-state", "verified:my-bots": "bots", "verified:bot-performance": "bots", "verified:bot-lifecycle": "bots",
    "verified:webhooks": "webhooks", "verified:webhook-history": "webhooks", "verified:notifications": "notifications", "verified:history": "transactions", "verified:trade": "market",
};
function topicFor(result) { return (0, router_1.liveTopicForResult)(result) ?? verifiedTopicMap[result.intent ?? ""]; }
const asRecord = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : null;
const formatAmount = (value, currency) => { const n = Number(value); return Number.isFinite(n) ? n.toFixed(2) + (currency ? " " + String(currency) : "") : String(value ?? ""); };
function explicitBalanceSummary(data) {
    const record = asRecord(data);
    if (!record)
        return undefined;
    const labels = { availableBalance: "available balance", usdtBalance: "USDT balance", balance: "balance", totalBalance: "total balance", walletBalance: "wallet balance", available: "available balance" };
    const parts = [];
    for (const [key, label] of Object.entries(labels)) {
        const value = record[key];
        if (value !== undefined && value !== null && (typeof value === "number" || typeof value === "string") && String(value).trim() !== "") {
            if (parts.some(part => part.startsWith(label + ":")))
                continue;
            parts.push(label + ": " + formatAmount(value, key.toLowerCase().includes("usdt") ? "USDT" : undefined));
        }
    }
    return parts.length ? parts.join("; ") : undefined;
}
function summarizeGoal(goal, records) {
    const recordList = (value, key) => { const record = asRecord(value); return Array.isArray(record?.[key]) ? record[key] : Array.isArray(value) ? value : []; };
    const report = (subject, items) => {
        const facts = items.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "").map(([label, value]) => label + ": " + String(value));
        return subject + (facts.length ? " — " + facts.join("; ") : "") + ".";
    };
    if (goal === "bot-performance") {
        const investments = recordList(records.bots, "investments"), transactions = recordList(records.transactions, "transactions");
        const active = investments.filter((item) => item?.active === true || ["activating", "active"].includes(String(item?.lifecycleStatus ?? item?.status ?? "").toLowerCase()));
        return report("Bot performance review", [
            ["bot investment records", investments.length], ["transaction records", transactions.length],
            ["active or activating investments", active.length],
            ["performance limitation", "status and record counts do not establish profitability; comparable profit/loss figures over the same period are required to rank bots"]
        ]);
    }
    if (goal === "account-overview") {
        const balance = explicitBalanceSummary(records["account-state"]), transactions = recordList(records.transactions, "transactions");
        return report("Account overview", [
            ["reported balance fields", balance], ["returned transaction records", transactions.length],
            ["data limitation", balance ? "balance values reflect only the fields returned by CryBots" : "no recognized balance field was returned, so the balance cannot be inferred"]
        ]);
    }
    const webhookData = asRecord(records.webhooks), webhooks = recordList(records.webhooks, "webhooks");
    const deliveryValue = webhookData?.deliveries ?? webhookData?.deliveryHistory ?? webhookData?.history ?? webhookData?.logs;
    const deliveries = Array.isArray(deliveryValue) ? deliveryValue : undefined;
    const enabled = webhooks.filter((item) => item?.enabled === true).length;
    return report("Webhook troubleshooting", [
        ["configuration records", webhooks.length], ["enabled records", enabled], ["disabled or not explicitly enabled records", webhooks.length - enabled],
        ["delivery/log records", deliveries?.length],
        ["delivery verification", deliveries ? "inspect individual returned delivery results" : "configuration alone does not establish delivery success"]
    ]);
}
function reasonOverLiveData(input, live) {
    const query = input.toLowerCase(), data = live.data;
    const facts = (values) => values.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "").map(([k, v]) => k + ": " + String(v));
    const report = (subject, values) => { const entries = facts(values); return entries.length ? subject + " — " + entries.join("; ") + "." : undefined; };
    if (live.topic === "transactions" && Array.isArray(data)) {
        if (!data.length)
            return report("Transaction history", [["record count", 0]]);
        const item = asRecord(data[0]);
        if (!item)
            return live.message;
        if (/latest|last|most recent|recent transaction/.test(query)) {
            const date = item.createdAt ? new Date(String(item.createdAt)) : null;
            return report("Latest recorded transaction", [
                ["type", item.title ?? item.category ?? item.direction],
                ["amount", item.amount !== undefined ? formatAmount(item.amount, item.currency ?? "USDT") : undefined],
                ["status", item.status],
                ["recorded", date && Number.isFinite(date.getTime()) ? date.toLocaleString() : undefined]
            ]) ?? live.message;
        }
        return live.message;
    }
    if (live.topic === "bots") {
        const record = asRecord(data), items = Array.isArray(record?.investments) ? record.investments : Array.isArray(data) ? data : [];
        const active = items.filter((x) => x?.active === true || ["activating", "active"].includes(String(x?.lifecycleStatus ?? x?.status ?? "").toLowerCase()));
        if (/which|what|show|list/.test(query) && /active|running/.test(query)) {
            const ids = active.map((x) => x?.botId).filter(Boolean);
            return report("Active or activating bot investments", [["count", active.length], ["bot IDs", ids.length ? ids.join(", ") : undefined]]);
        }
        if (active.length === 1 && /active|running|status/.test(query)) {
            const item = asRecord(active[0]);
            return report("Bot status", [["bot ID", item?.botId], ["lifecycle status", item?.lifecycleStatus ?? item?.status ?? (item?.active === true ? "active" : undefined)]]) ?? live.message;
        }
        if (/how many|count|total|my bots|bots do i have/.test(query)) {
            return report("Returned bot investment records", [["total", items.length], ["active or activating", active.length], ["interpretation", "status counts do not establish profitability"]]);
        }
    }
    if (live.topic === "webhooks") {
        const record = asRecord(data), items = Array.isArray(record?.webhooks) ? record.webhooks : Array.isArray(data) ? data : [];
        if (/which|what|show|list/.test(query) && /webhook/.test(query)) {
            if (!items.length)
                return report("Webhook configurations", [["record count", 0]]);
            return items.map((x, i) => "Webhook " + (i + 1) + (facts([["name", x?.name ?? x?._id], ["enabled", x?.enabled === true ? "yes" : x?.enabled === false ? "no" : undefined], ["status", x?.status], ["destination", x?.url ?? x?.endpoint]]).length ? " — " + facts([["name", x?.name ?? x?._id], ["enabled", x?.enabled === true ? "yes" : x?.enabled === false ? "no" : undefined], ["status", x?.status], ["destination", x?.url ?? x?.endpoint]]).join("; ") : "")).join(". ") + ".";
        }
        if (/how many|count|total/.test(query) && /webhook/.test(query))
            return report("Returned webhook configuration records", [["total", items.length]]);
    }
    if (live.topic === "notifications") {
        const record = asRecord(data), items = Array.isArray(record?.notifications) ? record.notifications : Array.isArray(data) ? data : [];
        if (/latest|recent|last/.test(query) && items.length) {
            const item = asRecord(items[0]);
            if (item)
                return report("Latest notification", [["title", item.title], ["message", item.message], ["status", item.status], ["created", item.createdAt]]) ?? live.message;
        }
        if (/how many|count|unread/.test(query))
            return report("Returned notification records", [["total", items.length], ["scope", "records returned by CryBots"]]);
    }
    if (live.topic === "account-state" && /balance|how much|portfolio|holdings|assets|available/.test(query)) {
        const summary = explicitBalanceSummary(data);
        return summary ? report("Current account data", [["reported balances", summary]]) : "Account data was retrieved, but no recognized balance field was returned; a financial value cannot be inferred.";
    }
    if (live.topic === "market" && Array.isArray(data) && data.length && /price|market|movers|change|symbol|trading/.test(query)) {
        const rows = data.slice(0, 5).map((x) => { const item = asRecord(x); return item ? facts([["symbol", item.symbol ?? item.asset ?? item.pair], ["price", item.price ?? item.lastPrice ?? item.currentPrice], ["24h change", item.change24h ?? item.priceChangePercent ?? item.changePercent], ["currency", item.currency]]).join("; ") : ""; }).filter(Boolean);
        if (rows.length)
            return "Returned market records: " + rows.map((row, i) => "record " + (i + 1) + " — " + row).join(". ") + ".";
    }
    return live.message;
}
async function thinkLive(input, context = {}, bridge, options = {}) {
    let refreshedContext = context;
    try {
        if (bridge.discover) {
            const snapshot = await bridge.discover();
            if (snapshot && typeof snapshot.version === "string" && typeof snapshot.updatedAt === "string" && Array.isArray(snapshot.features)) {
                const discoveredFeatures = snapshot.features.filter(feature => feature && feature.verified === true && typeof feature.id === "string" && typeof feature.name === "string" &&
                    typeof feature.route === "string" && /^\/[a-z0-9/_-]+$/i.test(feature.route) &&
                    typeof feature.description === "string" && Array.isArray(feature.keywords) && feature.keywords.every((keyword) => typeof keyword === "string"));
                const runtimeFacts = Array.isArray(snapshot.facts) ? snapshot.facts.filter(fact => fact && typeof fact.id === "string" && typeof fact.topic === "string" && typeof fact.answer === "string" &&
                    Array.isArray(fact.questions) && fact.questions.every((question) => typeof question === "string") &&
                    Array.isArray(fact.keywords) && fact.keywords.every((keyword) => typeof keyword === "string") &&
                    typeof fact.source === "string" && typeof fact.verifiedAt === "string") : undefined;
                const previousMap = context.appMapSnapshot ?? [];
                const hasPriorMap = previousMap.length > 0;
                const appMapChanges = hasPriorMap ? (0, adaptation_1.compareAppMap)(previousMap, discoveredFeatures) : [];
                refreshedContext = { ...context, discoveredFeatures, runtimeFacts, discoveryVersion: snapshot.version, discoveryUpdatedAt: snapshot.updatedAt, appMapCompared: hasPriorMap, appMapSnapshot: discoveredFeatures, appMapChanges };
            }
        }
    }
    catch {
        // Discovery is opportunistic; a temporary catalogue outage must not block normal Brain responses.
    }
    if (options.runtimeFeatures?.length) {
        const merged = new Map();
        for (const feature of refreshedContext.discoveredFeatures ?? [])
            merged.set(feature.route, feature);
        for (const feature of options.runtimeFeatures) {
            if (feature && feature.verified === true && typeof feature.route === "string" && /^\/[a-z0-9/_-]+$/i.test(feature.route))
                merged.set(feature.route, feature);
        }
        const mergedFeatures = [...merged.values()];
        const previousMap = context.appMapSnapshot ?? [];
        const hasPriorMap = previousMap.length > 0;
        refreshedContext = { ...refreshedContext, discoveredFeatures: mergedFeatures, appMapSnapshot: mergedFeatures, appMapCompared: hasPriorMap, appMapChanges: hasPriorMap ? (0, adaptation_1.compareAppMap)(previousMap, mergedFeatures) : [] };
    }
    const result = (0, brain_1.think)(input, refreshedContext);
    const goal = result.context.activeGoal;
    const relatedTopics = {
        "bot-performance": ["bots", "transactions"],
        "account-overview": ["account-state", "transactions"],
        "webhook-troubleshooting": ["webhooks"],
    };
    const goalTopics = goal ? relatedTopics[goal] : undefined;
    if (goalTopics?.length) {
        const results = await Promise.all(goalTopics.map(async (topic) => {
            try {
                const live = await bridge.query({ topic, input, entities: result.entities, userId: options.userId });
                return { topic, live };
            }
            catch {
                return { topic, live: { topic, ok: false, data: null } };
            }
        }));
        const available = results.filter(item => item.live.ok);
        const missing = results.filter(item => !item.live.ok);
        if (!available.length)
            return { ...result, response: (0, compose_1.composeLiveGoalUnavailable)(goal ?? "", goalTopics), liveData: undefined };
        const liveData = Object.fromEntries(available.map(item => [item.topic, item.live.data]));
        let response = summarizeGoal(goal ?? "", liveData);
        if (missing.length)
            response += " Some related records could not be retrieved (" + missing.map(item => item.topic).join(", ") + "), so this assessment is incomplete.";
        return { ...result, response, liveData: { goal, checkedTopics: available.map(item => item.topic), records: liveData, unavailableTopics: missing.map(item => item.topic) }, context: { ...result.context, lastTarget: result.context.lastTarget } };
    }
    const topic = topicFor(result);
    if (!topic)
        return result;
    const query = (0, router_1.buildLiveQuery)(result, input, result.entities, options.userId);
    const liveQuery = query ?? { topic, input, entities: result.entities, userId: options.userId };
    liveQuery.topic = topic;
    const live = await bridge.query(liveQuery);
    if (!live.ok)
        return { ...result, response: (0, compose_1.composeLiveDataStatus)(live.topic, "unavailable", live.message), action: result.action, liveData: undefined };
    const summary = reasonOverLiveData(input, live) ?? (0, compose_1.composeLiveDataStatus)(live.topic, "unrecognized");
    const freshness = live.fetchedAt ? " Data fetched at " + live.fetchedAt + "." : "";
    return { ...result, response: summary + freshness, action: result.action, liveData: live.data, context: { ...result.context, lastTarget: result.context.lastTarget } };
}
