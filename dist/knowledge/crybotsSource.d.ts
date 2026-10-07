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
    readonly ref: "c6d258521400c5feb18d31b0e3f5e6b02621a993";
    readonly scope: "CryBots frontend source-of-truth snapshot";
    readonly rule: "Use verified app facts first. Never invent balances, transactions, bot state, supported assets, prices, limits, permissions, or backend behavior that is not represented in verified source.";
};
export declare const verifiedFacts: VerifiedAppFact[];
