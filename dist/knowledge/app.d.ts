export type KnowledgeEntry = {
    id: string;
    topic: string;
    questions: string[];
    keywords: string[];
    answer: string;
};
export declare const appKnowledge: {
    readonly name: "Crybots";
    readonly scope: "Crybots app assistance";
    readonly topics: readonly ["account", "portfolio", "deposits", "withdrawals", "trading", "bots", "API keys", "webhooks", "security", "settings", "voice"];
    readonly rules: readonly ["Only answer within Crybots or directly related app topics.", "Never invent balances, transactions, bot status, prices, or account data.", "Use an app action only when the intent is sufficiently confident.", "Ask for clarification instead of guessing when multiple intents are plausible."];
};
export declare const knowledge: KnowledgeEntry[];
