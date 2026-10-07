"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.thinkLive = thinkLive;
const brain_1 = require("../brain");
const router_1 = require("./router");
const verifiedTopicMap = {
    "verified:portfolio": "account-state",
    "verified:my-bots": "bots",
    "verified:bot-performance": "bots",
    "verified:bot-lifecycle": "bots",
    "verified:webhooks": "webhooks",
    "verified:webhook-history": "webhooks",
    "verified:notifications": "notifications",
    "verified:history": "transactions",
    "verified:trade": "market",
};
function topicFor(result) {
    return (0, router_1.liveTopicForResult)(result) ?? verifiedTopicMap[result.intent ?? ""];
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
    if (!live.ok) {
        return {
            ...result,
            response: live.message ?? "I couldn't retrieve your current CryBots data right now. Please try again.",
            action: result.action,
        };
    }
    return {
        ...result,
        response: live.message ?? "I checked the current CryBots data, but there is no live summary available yet.",
        action: result.action,
        context: { ...result.context, lastTarget: result.context.lastTarget },
    };
}
