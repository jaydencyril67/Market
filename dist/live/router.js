"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveTopicForResult = liveTopicForResult;
exports.buildLiveQuery = buildLiveQuery;
const topicByIntent = {
    portfolio: "account-state",
    bot_status: "bots",
    bots: "bots",
    webhooks: "webhooks",
};
function liveTopicForResult(result) {
    return topicByIntent[result.intent ?? ""];
}
function buildLiveQuery(result, input, entities = {}, userId) {
    const topic = liveTopicForResult(result);
    if (!topic)
        return undefined;
    const query = { topic, input, entities: entities, userId };
    return query;
}
