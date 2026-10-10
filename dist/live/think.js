"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.thinkLive = thinkLive;
const brain_1 = require("../brain");
const router_1 = require("./router");
const adaptation_1 = require("../knowledge/adaptation");
const verifiedTopicMap = {
    "verified:portfolio": "account-state", "verified:my-bots": "bots", "verified:bot-performance": "bots", "verified:bot-lifecycle": "bots",
    "verified:webhooks": "webhooks", "verified:webhook-history": "webhooks", "verified:notifications": "notifications", "verified:history": "transactions", "verified:trade": "market",
};
function topicFor(result) { return (0, router_1.liveTopicForResult)(result) ?? verifiedTopicMap[result.intent ?? ""]; }
const asRecord = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : null;
const formatAmount = (value, currency) => { const n = Number(value); return Number.isFinite(n) ? n.toFixed(2) + (currency ? " " + String(currency) : "") : String(value ?? ""); };
function recordCount(value) {
    if (Array.isArray(value))
        return value.length;
    const record = asRecord(value);
    if (!record)
        return undefined;
    for (const key of ["investments", "bots", "transactions", "webhooks", "deliveries", "deliveryHistory", "notifications", "records", "items", "history", "logs"]) {
        if (Array.isArray(record[key]))
            return record[key].length;
    }
    return undefined;
}
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
    const bots = asRecord(records.bots);
    const investments = Array.isArray(bots?.investments) ? bots.investments : Array.isArray(records.bots) ? records.bots : [];
    const transactions = Array.isArray(records.transactions) ? records.transactions : [];
    const account = records["account-state"];
    const webhooksData = asRecord(records.webhooks);
    const webhooks = Array.isArray(webhooksData?.webhooks) ? webhooksData.webhooks : Array.isArray(records.webhooks) ? records.webhooks : [];
    const deliveryValue = webhooksData?.deliveries ?? webhooksData?.deliveryHistory ?? webhooksData?.history ?? webhooksData?.logs;
    const deliveries = Array.isArray(deliveryValue) ? deliveryValue : [];
    if (goal === "bot-performance") {
        const active = investments.filter((item) => item?.active === true || ["activating", "active"].includes(String(item?.lifecycleStatus ?? item?.status ?? "").toLowerCase()));
        let response = "I checked " + investments.length + " bot investment record" + (investments.length === 1 ? "" : "s") + " and " + transactions.length + " transaction record" + (transactions.length === 1 ? "" : "s") + ". ";
        response += active.length + " bot investment" + (active.length === 1 ? " is" : "s are") + " marked active or activating. ";
        response += "That confirms status, not profitability: I will only rank bots when the returned records provide comparable profit or loss figures for the same period.";
        return response;
    }
    if (goal === "account-overview") {
        const balance = explicitBalanceSummary(account);
        let response = "I checked the connected account-state and transaction records. ";
        if (balance)
            response += "The returned account data reports " + balance + ". ";
        else
            response += "The account response did not expose a recognized balance field, so I won't guess your balance. ";
        response += "I also found " + transactions.length + " transaction record" + (transactions.length === 1 ? "" : "s") + " in the returned history.";
        return response;
    }
    const enabled = webhooks.filter((item) => item?.enabled === true).length;
    let response = "I checked " + webhooks.length + " webhook configuration record" + (webhooks.length === 1 ? "" : "s") + ". ";
    response += enabled + " are marked enabled and " + (webhooks.length - enabled) + " are marked disabled or not explicitly enabled. ";
    if (deliveryValue !== undefined)
        response += "The returned payload includes " + deliveries.length + " delivery/log record" + (deliveries.length === 1 ? "" : "s") + ". ";
    else
        response += "The returned payload did not include a recognizable delivery-history list, so configuration alone cannot confirm delivery success. ";
    response += "I won't infer delivery success from enabled status alone.";
    return response;
}
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
        const amount = latest.amount !== undefined && latest.amount !== null ? formatAmount(latest.amount, latest.currency ?? "USDT") : "an amount not recorded";
        const status = latest.status ? String(latest.status) : "status not recorded";
        const parsedDate = latest.createdAt ? new Date(String(latest.createdAt)) : null;
        const when = parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate.toLocaleString() : "date not recorded";
        if (/latest|last|most recent|recent transaction/.test(text))
            return "Your latest recorded transaction is " + title + ", amount " + amount + ", status " + status + ", recorded " + when + ". This is from your CryBots transaction history.";
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
    if (live.topic === "account-state" && (/balance|how much|portfolio|holdings|assets|available/.test(text))) {
        const summary = explicitBalanceSummary(data);
        if (summary)
            return "Your current account data reports " + summary + ".";
        return "I retrieved your account data, but it did not include a recognized balance field. I won't guess a financial value.";
    }
    if (live.topic === "market" && Array.isArray(data) && data.length && (/price|market|movers|change|symbol|trading/.test(text))) {
        const rows = data.slice(0, 5).map((item) => {
            const record = asRecord(item);
            if (!record)
                return "";
            const symbol = record.symbol ?? record.asset ?? record.pair;
            const price = record.price ?? record.lastPrice ?? record.currentPrice;
            const change = record.change24h ?? record.priceChangePercent ?? record.changePercent;
            if (!symbol || price === undefined || price === null)
                return "";
            return String(symbol) + " " + formatAmount(price, record.currency ?? "USDT") + (change !== undefined && change !== null ? ", 24h change " + String(change) + "%" : "");
        }).filter(Boolean);
        if (rows.length)
            return "Current market data returned: " + rows.join("; ") + ".";
    }
    if (live.topic === "bots") {
        const record = asRecord(data);
        const investments = Array.isArray(record?.investments) ? record.investments : Array.isArray(data) ? data : [];
        if (/how many|count|total|my bots|bots do i have/.test(text) && investments.length >= 0) {
            const active = investments.filter((item) => item?.active === true || ["activating", "active"].includes(String(item?.lifecycleStatus ?? item?.status ?? "").toLowerCase())).length;
            return "The live response contains " + investments.length + " bot investment record" + (investments.length === 1 ? "" : "s") + ", including " + active + " marked active or activating. This is a status count, not a profitability assessment.";
        }
    }
    if (live.topic === "webhooks") {
        const record = asRecord(data);
        const webhooks = Array.isArray(record?.webhooks) ? record.webhooks : Array.isArray(data) ? data : [];
        if (/how many|count|total/.test(text) && /webhook/.test(text))
            return "The live response contains " + webhooks.length + " webhook configuration record" + (webhooks.length === 1 ? "" : "s") + ".";
    }
    if (live.topic === "notifications") {
        const record = asRecord(data);
        const notifications = Array.isArray(record?.notifications) ? record.notifications : Array.isArray(data) ? data : [];
        if (/how many|count|unread/.test(text))
            return "The live response contains " + notifications.length + " notification record" + (notifications.length === 1 ? "" : "s") + ". This count only reflects the records returned by CryBots.";
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
                return { topic, live: { topic, ok: false, data: null, message: "Live data request failed." } };
            }
        }));
        const available = results.filter(item => item.live.ok);
        const missing = results.filter(item => !item.live.ok);
        if (!available.length)
            return { ...result, response: "I understood the goal, but I couldn't retrieve the connected CryBots records needed to investigate it. Please try again when the connection is available.", liveData: undefined };
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
        return { ...result, response: live.message ?? "I could not retrieve your current CryBots data right now. Please try again.", action: result.action, liveData: undefined };
    const summary = reasonOverLiveData(input, live) ?? (live.topic === "account-state" ? "I retrieved your current account data, but the response did not include a recognized balance summary. I won't guess a financial value." : live.topic === "market" ? "I retrieved current market data, but the returned payload did not include a recognized price summary. I won't invent a price." : live.topic === "bots" ? "I retrieved your current bot records, but the payload did not match a known status summary. I won't infer activity or profitability." : "I retrieved the current CryBots data, but the returned payload does not contain fields I can safely summarize for this question.");
    const freshness = live.fetchedAt ? " Data fetched at " + live.fetchedAt + "." : "";
    return { ...result, response: summary + freshness, action: result.action, liveData: live.data, context: { ...result.context, lastTarget: result.context.lastTarget } };
}
