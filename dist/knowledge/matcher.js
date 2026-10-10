"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findKnowledge = findKnowledge;
exports.findVerifiedKnowledge = findVerifiedKnowledge;
const crybotsSource_1 = require("./crybotsSource");
const brain_1 = require("../brain");
const distance = (a, b) => { const x = (0, brain_1.normalize)(a), y = (0, brain_1.normalize)(b); const d = Array.from({ length: y.length + 1 }, (_, i) => i); for (let i = 1; i <= x.length; i++) {
    let p = d[0];
    d[0] = i;
    for (let j = 1; j <= y.length; j++) {
        const q = d[j];
        d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (x[i - 1] === y[j - 1] ? 0 : 1));
        p = q;
    }
} return d[y.length]; };
const scoreEntry = (input, questions, keywords, route) => {
    const text = (0, brain_1.normalize)(input);
    let score = 0;
    for (const q of questions) {
        const n = (0, brain_1.normalize)(q);
        if (text === n)
            score += .96;
        else if (text.includes(n))
            score += .72;
        else if (distance(text, n) <= 2)
            score += .28;
    }
    for (const k of keywords)
        if (text.includes((0, brain_1.normalize)(k)))
            score += .10;
    const navigationRequest = /\b(open|go to|take me to|navigate to|bring up|switch to|visit|load|show me)\b/.test(text);
    if (navigationRequest && route) {
        const routeName = (0, brain_1.normalize)(route.split("/").filter(Boolean).join(" "));
        const routeAliases = keywords.some(k => { const keyword = (0, brain_1.normalize)(k); return keyword.length >= 4 && text.includes(keyword); });
        if ((routeName && text.includes(routeName)) || routeAliases)
            score += .72;
    }
    return Math.min(.99, score);
};
function findKnowledge(input, entries) { let best = null; for (const entry of entries) {
    const score = scoreEntry(input, entry.questions, entry.keywords);
    if (!best || score > best.score)
        best = { entry, score };
} return best && best.score >= .38 ? best : null; }
function findVerifiedKnowledge(input, entries = crybotsSource_1.verifiedFacts) { let best = null; for (const entry of entries) {
    const score = scoreEntry(input, entry.questions, entry.keywords, entry.route);
    if (!best || score > best.score)
        best = { entry, score };
} return best && best.score >= .42 ? best : null; }
