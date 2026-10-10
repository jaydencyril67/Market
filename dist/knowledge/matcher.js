"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findKnowledge = findKnowledge;
exports.findVerifiedKnowledge = findVerifiedKnowledge;
const crybotsSource_1 = require("./crybotsSource");
const brain_1 = require("../brain");
const stopWords = new Set(["a", "an", "the", "i", "me", "my", "mine", "we", "our", "you", "your", "yours", "it", "this", "that", "these", "those", "is", "am", "are", "was", "were", "be", "been", "being", "do", "does", "did", "can", "could", "would", "should", "will", "shall", "to", "of", "for", "in", "on", "at", "by", "with", "from", "about", "please", "how", "what", "where", "when", "why", "who", "which", "want", "need", "like", "help", "tell", "show", "find", "get", "give", "let", "know", "would", "like", "just", "now", "can", "i"]);
const tokens = (value) => new Set((0, brain_1.normalize)(value).split(/\s+/).filter(word => word.length > 1 && !stopWords.has(word)));
const overlap = (inputTokens, candidateTokens) => {
    if (!inputTokens.size || !candidateTokens.size)
        return 0;
    let matched = 0;
    for (const token of candidateTokens)
        if (inputTokens.has(token))
            matched++;
    return matched / candidateTokens.size;
};
const distance = (a, b) => {
    const x = (0, brain_1.normalize)(a), y = (0, brain_1.normalize)(b), d = Array.from({ length: y.length + 1 }, (_, i) => i);
    for (let i = 1; i <= x.length; i++) {
        let p = d[0];
        d[0] = i;
        for (let j = 1; j <= y.length; j++) {
            const q = d[j];
            d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (x[i - 1] === y[j - 1] ? 0 : 1));
            p = q;
        }
    }
    return d[y.length];
};
/**
 * Rank source-backed knowledge by meaning-bearing token overlap as well as exact phrases.
 * This lets natural requests such as "I want to delete my account" match a verified
 * "delete account" capability without requiring the exact sentence in the catalogue.
 */
const scoreEntry = (input, questions, keywords, route) => {
    const text = (0, brain_1.normalize)(input);
    const inputTokens = tokens(text);
    let score = 0;
    for (const question of questions) {
        const normalizedQuestion = (0, brain_1.normalize)(question);
        if (text === normalizedQuestion)
            score = Math.max(score, .98);
        else if (text.includes(normalizedQuestion))
            score = Math.max(score, .88);
        else {
            const questionScore = overlap(inputTokens, tokens(question));
            if (questionScore >= .5)
                score = Math.max(score, .28 + questionScore * .48);
            if (distance(text, normalizedQuestion) <= 2)
                score = Math.max(score, .28);
        }
    }
    for (const keyword of keywords) {
        const normalizedKeyword = (0, brain_1.normalize)(keyword);
        if (normalizedKeyword && text.includes(normalizedKeyword))
            score = Math.max(score, .84);
        else {
            const keywordScore = overlap(inputTokens, tokens(keyword));
            if (keywordScore > 0)
                score = Math.max(score, keywordScore >= .99 ? .82 : .18 + keywordScore * .52);
        }
    }
    const routeTokens = route ? tokens(route.split("/").filter(Boolean).join(" ")) : new Set();
    const routeScore = overlap(inputTokens, routeTokens);
    if (routeScore >= .99)
        score = Math.max(score, .72);
    return Math.min(.99, score);
};
function findKnowledge(input, entries) {
    let best = null;
    for (const entry of entries) {
        const score = scoreEntry(input, entry.questions, entry.keywords);
        if (!best || score > best.score)
            best = { entry, score };
    }
    return best && best.score >= .42 ? best : null;
}
function findVerifiedKnowledge(input, entries = crybotsSource_1.verifiedFacts) {
    let best = null;
    for (const entry of entries) {
        const score = scoreEntry(input, entry.questions, entry.keywords, entry.route);
        if (!best || score > best.score)
            best = { entry, score };
    }
    return best && best.score >= .42 ? best : null;
}
