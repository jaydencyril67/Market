"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = void 0;
exports.think = think;
const core_1 = require("./intents/core");
const core_2 = require("./responses/core");
const synonyms_1 = require("./language/synonyms");
const app_1 = require("./knowledge/app");
const matcher_1 = require("./knowledge/matcher");
const patterns_1 = require("./language/patterns");
const entities_1 = require("./language/entities");
const references_1 = require("./language/references");
const decision_1 = require("./reasoning/decision");
const planner_1 = require("./reasoning/planner");
const executor_1 = require("./reasoning/executor");
const normalize = (input) => input.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
exports.normalize = normalize;
const variants = (value) => { const n = (0, exports.normalize)(value); const out = new Set([n]); for (const [key, items] of Object.entries(synonyms_1.synonyms)) {
    if (items.includes(n) || key === n)
        for (const item of items)
            out.add((0, exports.normalize)(item));
} return [...out]; };
const tokenSet = (text) => new Set((0, exports.normalize)(text).split(" ").filter(Boolean));
const distance = (a, b) => { const x = (0, exports.normalize)(a), y = (0, exports.normalize)(b); const d = Array.from({ length: y.length + 1 }, (_, i) => i); for (let i = 1; i <= x.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= y.length; j++) {
        const cur = d[j];
        d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (x[i - 1] === y[j - 1] ? 0 : 1));
        prev = cur;
    }
} return d[y.length]; };
function typoBoost(text, forms) { let boost = 0; for (const word of text.split(" ")) {
    if (word.length < 4)
        continue;
    for (const form of forms) {
        if (form.includes(" ") || form === word)
            continue;
        const d = distance(word, form);
        if (d === 1)
            boost = Math.max(boost, .10);
        else if (d === 2 && word.length >= 6)
            boost = Math.max(boost, .05);
    }
} return boost; }
function patternScore(input, intentId) { const text = (0, exports.normalize)(input); let best = 0; for (const item of patterns_1.patterns.filter(x => x.intent === intentId)) {
    for (const p of item.patterns) {
        const parts = p.split("*").map(exports.normalize);
        if (parts.length === 1) {
            if (text.includes(parts[0]))
                best = Math.max(best, item.weight);
        }
        else {
            const first = parts[0], last = parts[1];
            if (text.startsWith(first) && text.endsWith(last) && text.length >= first.length + last.length)
                best = Math.max(best, item.weight);
        }
    }
} return best; }
function score(input, intent) { const text = (0, exports.normalize)(input); if (!text)
    return 0; let score = 0; for (const p of intent.phrases) {
    const n = (0, exports.normalize)(p);
    if (text === n)
        score += .85;
    else if (text.includes(n))
        score += .58;
} for (const k of intent.keywords) {
    const forms = variants(k);
    if (forms.some(v => text.includes(v)))
        score += .18;
    score += typoBoost(text, forms);
} for (const k of intent.keywords)
    if (tokenSet(text).has((0, exports.normalize)(k)))
        score += .08; return Math.min(.99, score + patternScore(input, intent.id) + (intent.priority ?? 0)); }
function think(input, context = {}) {
    const requests = (0, decision_1.splitRequests)(input);
    if (requests.length > 1) {
        const steps = requests.map(part => {
            const normalizedPart = (0, exports.normalize)(part);
            const rankedPart = core_1.intents.map(intent => ({ intent, confidence: score(part, intent) })).sort((a, b) => b.confidence - a.confidence);
            const bestPart = rankedPart[0];
            const entitiesPart = (0, entities_1.extractEntities)(part, context.entities);
            const refsPart = (0, references_1.resolveReferences)(part, context, entitiesPart);
            return { intent: bestPart?.intent.id ?? "", confidence: bestPart?.confidence ?? 0, input: part, action: bestPart?.intent.action ?? { type: "none" }, references: refsPart };
        });
        const decision = (0, decision_1.decide)(steps, core_1.intents);
        const actionPlan = (0, planner_1.buildActionPlan)(steps, steps.flatMap(s => s.references));
        const execution = (0, executor_1.compileExecution)(actionPlan, context.entities ?? {});
        decision.reason += " Action plan: " + actionPlan.status + ". Execution: " + execution.status + ". ";
        if (decision.mode === "clarify")
            return { intent: null, confidence: Math.min(...steps.map(s => s.confidence)), response: "I understood multiple requests, but one part is not clear enough yet. Tell me which action you want first.", action: { type: "none" }, normalized: (0, exports.normalize)(input), alternatives: steps.map(s => s.intent).filter(Boolean), needsClarification: true, entities: context.entities ?? {}, context: { ...context, decision, history: [...(context.history ?? []), (0, exports.normalize)(input)].slice(-10) } };
        const first = steps[0];
        const response = core_2.responses[first.intent] ?? core_2.responses.fallback;
        return { intent: first.intent, confidence: first.confidence, response: response[0], action: first.action, normalized: (0, exports.normalize)(input), alternatives: steps.map(s => s.intent), needsClarification: false, entities: context.entities ?? {}, context: { ...context, lastIntent: first.intent, lastTarget: first.action.type === "navigate" ? first.action.target : context.lastTarget, history: [...(context.history ?? []), (0, exports.normalize)(input)].slice(-10), decision } };
    }
    const normalized = (0, exports.normalize)(input);
    const entities = (0, entities_1.extractEntities)(input, context.entities);
    const references = (0, references_1.resolveReferences)(input, context, entities);
    const verifiedHit = (0, matcher_1.findVerifiedKnowledge)(input);
    const knowledgeHit = (0, matcher_1.findKnowledge)(input, app_1.knowledge);
    if (verifiedHit && verifiedHit.score >= .52) {
        const nextContext = { ...context, history: [...(context.history ?? []), normalized].slice(-10), pendingIntent: null };
        return { intent: `verified:${verifiedHit.entry.id}`, confidence: verifiedHit.score, response: verifiedHit.entry.answer, action: verifiedHit.entry.route ? { type: "navigate", target: verifiedHit.entry.route } : { type: "none" }, normalized, alternatives: [], needsClarification: false, entities, context: { ...nextContext, entities } };
    }
    if (knowledgeHit && knowledgeHit.score >= .55) {
        const nextContext = { ...context, history: [...(context.history ?? []), normalized].slice(-10), pendingIntent: null };
        return { intent: `knowledge:${knowledgeHit.entry.id}`, confidence: knowledgeHit.score, response: knowledgeHit.entry.answer, action: { type: "none" }, normalized, alternatives: [], needsClarification: false, entities, context: { ...nextContext, entities, references } };
    }
    const ranked = core_1.intents.map(intent => ({ intent, confidence: score(input, intent) })).sort((a, b) => b.confidence - a.confidence);
    let best = ranked[0];
    if (context.lastTarget === "my-bots" && /\\b(status|activity|doing|running|active)\\b/.test(normalized)) {
        const candidate = core_1.intents.find(x => x.id === "bot_status");
        if (candidate)
            best = { intent: candidate, confidence: Math.max(best?.confidence ?? 0, .82) };
    }
    if (context.pendingIntent) {
        const pending = core_1.intents.find(x => x.id === context.pendingIntent);
        if (pending) {
            const pendingScore = score(input, pending);
            if (pendingScore > .15)
                best = { intent: pending, confidence: Math.min(.99, pendingScore + .15) };
        }
    }
    if (!best || best.confidence < .30)
        return { intent: null, confidence: best?.confidence ?? 0, response: core_2.responses.fallback[0], action: { type: "none" }, normalized, alternatives: ranked.slice(0, 3).filter(x => x.confidence > 0).map(x => x.intent.id), needsClarification: false, entities, context: { ...context, entities, references } };
    const alternatives = ranked.filter(x => x.confidence > 0).slice(0, 3);
    const ambiguous = alternatives.length > 1 && best.confidence < .7 && best.confidence - alternatives[1].confidence < .12;
    if (ambiguous)
        return { intent: null, confidence: best.confidence, response: core_2.responses.unclear[0], action: { type: "none" }, normalized, alternatives: alternatives.map(x => x.intent.id), needsClarification: true, entities, context: { ...context, pendingIntent: best.intent.id, entities, references } };
    if (references.length) {
        const ref = references[0];
        if (ref.type === "bot" && best.intent.id === "bot_status") {
            best = { intent: core_1.intents.find(x => x.id === "bot_status"), confidence: Math.max(best.confidence, .88) };
        }
    }
    const pool = core_2.responses[best.intent.id] ?? core_2.responses.fallback;
    const response = pool[0];
    const nextContext = { lastIntent: best.intent.id, lastTarget: best.intent.action?.type === "navigate" ? best.intent.action.target : context.lastTarget, history: [...(context.history ?? []), normalized].slice(-10), pendingIntent: null };
    return { intent: best.intent.id, confidence: best.confidence, response, action: best.intent.action ?? { type: "none" }, normalized, alternatives: alternatives.map(x => x.intent.id), needsClarification: false, entities, context: nextContext };
}
