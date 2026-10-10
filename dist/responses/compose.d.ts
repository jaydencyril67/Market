import { BrainAction, BrainContext } from "../types";
export declare function composeIntentResponse(intentId: string, action: BrainAction, input: string, context?: BrainContext): string;
export declare function composeClarificationResponse(kind: "unclear" | "fallback", input: string, context?: BrainContext): string;
export declare function composeGoalResponse(goalId: string, topics: string[], target: string, input: string, context?: BrainContext): string;
export declare function composeApiClarification(reason: "not-direct" | "missing-id" | "missing-amount", operation: string, botId?: string): string;
export declare function composePreparedApiResponse(operation: string, target?: string): string;
