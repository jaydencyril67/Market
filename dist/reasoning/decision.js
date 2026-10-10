"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitRequests = splitRequests;
exports.decide = decide;
exports.isCompatible = isCompatible;
function splitRequests(input) {
    const actionLead = /^(?:open|go to|take me to|navigate to|show|check|review|compare|scroll|click|tap|press|create|delete|remove|enable|disable|update|save|deposit|withdraw|transfer|buy|sell|rent|activate|deactivate|find|tell me|explain|list|view|inspect|then)\b/i;
    return input.replace(/[.;]+|\s*,\s*(?=(?:open|go to|take me to|navigate to|show|check|review|compare|scroll|click|tap|press|create|delete|remove|enable|disable|update|save|deposit|withdraw|transfer|buy|sell|rent|activate|deactivate|find|tell me|explain|list|view|inspect|then)\b)/gi, "|").split("|").flatMap(part => {
        const pieces = part.split(/\s+and\s+/i);
        if (pieces.length < 2)
            return [part.trim()].filter(Boolean);
        const out = [];
        let current = pieces[0];
        for (let i = 1; i < pieces.length; i++) {
            if (actionLead.test(pieces[i].trim())) {
                out.push(current.trim());
                current = pieces[i];
            }
            else
                current += " and " + pieces[i];
        }
        out.push(current.trim());
        return out.filter(Boolean);
    }).map(part => part.replace(/^then\s+/i, "").trim()).filter(Boolean);
}
function decide(steps, intents) {
    if (!steps.length)
        return { mode: "clarify", steps: [], reason: "No actionable request was detected." };
    const uncertain = steps.filter(s => { const runnerUp = s.alternatives?.[0]; return s.confidence < .45 || Boolean(runnerUp && s.confidence < .72 && s.confidence - runnerUp.confidence < .12); });
    if (uncertain.length)
        return { mode: "clarify", steps, reason: "At least one requested action is uncertain or has a near-tied alternative; clarify before planning execution." };
    if (steps.length === 1)
        return { mode: "single", steps, reason: "One clear request was detected." };
    return { mode: "sequence", steps, reason: "Multiple clear requests were detected and will be handled in order, verifying each result before continuing." };
}
function isCompatible(a, b) {
    if (a.type === "none" || b.type === "none")
        return true;
    if (a.type === "navigate" && b.type === "navigate")
        return a.target !== b.target;
    return a.type !== b.type;
}
