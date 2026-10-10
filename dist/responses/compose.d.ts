import { BrainAction, BrainContext } from "../types";
export declare function composeIntentResponse(intentId: string, action: BrainAction, input: string, context?: BrainContext): string;
export declare function composeClarificationResponse(kind: "unclear" | "fallback", input: string, context?: BrainContext): string;
export declare function composeGoalResponse(goalId: string, topics: string[], target: string, input: string, context?: BrainContext): string;
export declare function composeApiClarification(reason: "not-direct" | "missing-id" | "missing-amount", operation: string, botId?: string): string;
export declare function composePreparedApiResponse(operation: string, target?: string): string;
export declare function composeSequenceResponse(inputs: string[], firstAction: BrainAction): string;
export declare function composeRuntimeControlResponse(label: string, kind: "matched" | "sensitive" | "ambiguous"): string;
export declare function composeAppMapChangeResponse(state: "no-baseline" | "unchanged" | "changed", changes: Array<{
    kind: string;
    name: string;
    route: string;
    details: string;
}>): string;
export declare function composeVerifiedFactFollowUp(topic: string, answer: string, hasRelated: boolean): string;
export declare function composeBalanceNavigationResponse(target: string): string;
export declare function composeLiveDataStatus(topic: "account-state" | "transactions" | "bots" | "market" | "webhooks" | "notifications", state: "unavailable" | "unrecognized", detail?: string): string;
export declare function composeLiveGoalUnavailable(goal: string, topics: string[]): string;
