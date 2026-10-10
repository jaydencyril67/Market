export type CryBotsRouteFact = {
    route: string;
    key: string;
    component: string;
    access: "public" | "protected" | "admin" | "mixed";
    area: string;
    sourcePath: string;
};
export type CryBotsRelationship = {
    from: string;
    to: string[];
    relationship: string;
};
export type DynamicDataRule = {
    topic: string;
    examples: string[];
    rule: "live-from-crybots" | "verified-static";
    reason: string;
};
export declare const crybotsAudit: {
    readonly repository: "jaydencyril67/Kingshall";
    readonly ref: "f0eca3c11019d7a6d2f5516358d1b8a145166d3f";
    readonly verifiedFrom: "src/index.tsx";
    readonly purpose: "v1.3 current CryBots app knowledge audit";
    readonly rule: "The Brain may explain verified navigation, marketplace, WorldScope, developer, security, and history features, but must query CryBots for live account state instead of inventing it.";
};
export declare const verifiedRoutes: CryBotsRouteFact[];
export declare const verifiedRelationships: CryBotsRelationship[];
export declare const dynamicDataRules: DynamicDataRule[];
