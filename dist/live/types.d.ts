export type LiveTopic = "account-state" | "transactions" | "bots" | "market" | "webhooks" | "notifications";
export type LiveQuery = {
    topic: LiveTopic;
    input: string;
    entities?: Record<string, string>;
    userId?: string;
};
export type LiveDataResult = {
    topic: LiveTopic;
    ok: boolean;
    data: unknown;
    message?: string;
    fetchedAt?: string;
};
export type LiveCryBotsBridge = {
    query: (query: LiveQuery) => Promise<LiveDataResult>;
};
