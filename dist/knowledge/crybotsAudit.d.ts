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
    readonly ref: "c6d258521400c5feb18d31b0e3f5e6b02621a993";
    readonly verifiedFrom: "src/index.tsx";
    readonly purpose: "v1.2 route and architecture audit";
    readonly rule: "The Brain may explain verified navigation and feature relationships, but must query CryBots for live account state instead of inventing it.";
};
export declare const verifiedRoutes: CryBotsRouteFact[];
export declare const verifiedRelationships: CryBotsRelationship[];
export declare const dynamicDataRules: DynamicDataRule[];
