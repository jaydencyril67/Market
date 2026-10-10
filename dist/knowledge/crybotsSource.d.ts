export type VerifiedAppFact = {
    id: string;
    topic: string;
    route?: string;
    keywords: string[];
    questions: string[];
    answer: string;
    source: "crybots-frontend";
    sourcePath: string;
    verifiedAt: string;
};
export declare const crybotsSource: {
    readonly repository: "jaydencyril67/Kingshall";
    readonly ref: "f0eca3c11019d7a6d2f5516358d1b8a145166d3f";
    readonly scope: "CryBots frontend source-of-truth snapshot";
    readonly rule: "Use verified app facts first. Never invent balances, transactions, bot state, supported assets, prices, limits, permissions, or backend behavior that is not represented in verified source.";
};
export declare const verifiedFacts: VerifiedAppFact[];
