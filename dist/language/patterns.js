"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patterns = void 0;
exports.patterns = [
    { intent: "deposit", weight: .24, patterns: ["how can i * money", "i want to * my account", "help me * funds", "i need to put money", "where can i fund"] },
    { intent: "withdraw", weight: .24, patterns: ["how can i * money out", "i want to * money", "help me * funds", "i need to cash out", "where can i withdraw"] },
    { intent: "portfolio", weight: .22, patterns: ["show me what i have", "how much do i have", "what are my assets", "let me see my holdings", "show my account value"] },
    { intent: "bots", weight: .22, patterns: ["show me my automated bots", "where can i manage bots", "let me see my bots", "what bots do i have"] },
    { intent: "bot_create", weight: .25, patterns: ["i want to create * bot", "help me make a bot", "i need a new bot", "can i create a bot"] },
    { intent: "bot_status", weight: .25, patterns: ["what is my bot doing", "check how my bot is doing", "is my bot running", "show me my bot activity"] },
    { intent: "api_keys", weight: .22, patterns: ["where can i manage developer access", "show my developer keys", "i need an api credential", "where are my api credentials"] },
    { intent: "webhooks", weight: .22, patterns: ["where can i manage callbacks", "show my webhook settings", "i need webhook access", "where are my event callbacks"] },
    { intent: "security", weight: .22, patterns: ["how do i protect my account", "how can i secure my account", "help me with account security", "where can i enable two factor"] },
    { intent: "voice", weight: .20, patterns: ["i want to talk to you", "can i speak to crybots", "help me use voice", "how can i talk instead of typing"] }
];
