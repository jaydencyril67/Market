"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildActionPlan = buildActionPlan;
function buildActionPlan(steps, references = []) {
    const plan = steps.map((step, i) => {
        const needsEntity = /bot_status|bot_create/.test(step.intent);
        const hasEntity = step.references.some(r => r.type === "bot") || references.some(r => r.type === "bot");
        if (needsEntity && !hasEntity && step.intent === "bot_status")
            return { order: i + 1, intent: step.intent, action: step.action, status: "blocked", requiresEntity: true, reason: "A specific bot reference is required." };
        return { order: i + 1, intent: step.intent, action: step.action, status: "ready" };
    });
    const blocked = plan.some(x => x.status === "blocked");
    return { status: blocked ? "partial" : "ready", steps: plan, reason: blocked ? "Some actions need information before they can safely execute." : "All requested actions have an executable plan." };
}
