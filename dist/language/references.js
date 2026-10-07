"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveReferences = resolveReferences;
const brain_1 = require("../brain");
function resolveReferences(input, context, entities) {
    const text = (0, brain_1.normalize)(input);
    const out = [];
    if (/\\b(it|that bot|this bot|the bot)\\b/.test(text) && entities.botId)
        out.push({ type: "bot", value: entities.botId, source: "context" });
    if (/\\b(that key|this key|the api key|it)\\b/.test(text) && entities.apiKeyId)
        out.push({ type: "apiKey", value: entities.apiKeyId, source: "context" });
    if (/\\b(that webhook|this webhook|the webhook|it)\\b/.test(text) && entities.webhookId)
        out.push({ type: "webhook", value: entities.webhookId, source: "context" });
    if (/\\b(there|that page|this page)\\b/.test(text) && context.lastTarget)
        out.push({ type: "page", value: context.lastTarget, source: "context" });
    if (/\\b(that amount|that money|it)\\b/.test(text) && entities.amount)
        out.push({ type: "amount", value: entities.amount, source: "context" });
    return out;
}
