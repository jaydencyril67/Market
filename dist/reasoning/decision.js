"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitRequests = splitRequests;
exports.decide = decide;
exports.isCompatible = isCompatible;
function splitRequests(input) { return input.replace(/\\band\\b/gi, "|").replace(/[.;]+/g, "|").split("|").map(x => x.trim()).filter(Boolean); }
function decide(steps, intents) {
    if (!steps.length)
        return { mode: "clarify", steps: [], reason: "No actionable request was detected." };
    const uncertain = steps.filter(s => s.confidence < .45);
    if (uncertain.length)
        return { mode: "clarify", steps, reason: "At least one requested action is not confident enough to execute safely." };
    if (steps.length === 1)
        return { mode: "single", steps, reason: "One clear request was detected." };
    return { mode: "sequence", steps, reason: "Multiple compatible requests were detected and can be handled in order." };
}
function isCompatible(a, b) {
    if (a.type === "none" || b.type === "none")
        return true;
    if (a.type === "navigate" && b.type === "navigate")
        return a.target !== b.target;
    return a.type !== b.type;
}
