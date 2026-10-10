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
    readonly topics: readonly ["account", "portfolio", "deposits", "withdrawals", "transactions", "trading", "trade history", "bots", "marketplace", "WorldScope", "subscriptions", "API keys", "webhooks", "security", "device sessions", "notifications", "support", "logs", "settings", "navigation", "downloads", "voice", "admin"];
    readonly rules: readonly ["Only answer within CryBots or directly related app topics.", "Prefer verified facts sourced from the current CryBots frontend over generic assumptions.", "Never invent balances, transactions, bot status, prices, subscription state, delivery outcomes, permissions, or account data.", "Treat live account and market values as dynamic and query the connected CryBots bridge when available.", "Use an app action only when the intent is sufficiently confident.", "Ask for clarification instead of guessing when multiple intents are plausible.", "Never claim that a navigation, subscription, transfer, withdrawal, bot action, webhook delivery, or security change succeeded unless the connected app confirms it."];
};
export declare const knowledge: KnowledgeEntry[];
