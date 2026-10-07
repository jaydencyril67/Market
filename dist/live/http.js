"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpCryBotsBridge = createHttpCryBotsBridge;
function createHttpCryBotsBridge(options) {
    const fetchImpl = options.fetchImpl ?? fetch;
    return {
        async query(query) {
            try {
                const token = await options.getAccessToken?.();
                const headers = { "content-type": "application/json" };
                if (token)
                    headers.authorization = `Bearer ${token}`;
                const response = await fetchImpl(options.endpoint, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(query),
                });
                const body = await response.json().catch(() => null);
                if (!response.ok) {
                    return {
                        topic: query.topic,
                        ok: false,
                        data: null,
                        message: typeof body?.message === "string" ? body.message : "CryBots live data request failed.",
                    };
                }
                return {
                    topic: query.topic,
                    ok: body?.ok !== false,
                    data: body?.data ?? null,
                    message: typeof body?.message === "string" ? body.message : undefined,
                    fetchedAt: typeof body?.fetchedAt === "string" ? body.fetchedAt : new Date().toISOString(),
                };
            }
            catch {
                return { topic: query.topic, ok: false, data: null, message: "CryBots live data is temporarily unavailable." };
            }
        },
    };
}
