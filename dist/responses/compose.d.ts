import { BrainAction, BrainContext } from "../types";
export declare function composeIntentResponse(intentId: string, action: BrainAction, input: string, context?: BrainContext): string;
export declare function composeClarificationResponse(kind: "unclear" | "fallback", input: string, context?: BrainContext): string;
export declare function composeGoalResponse(goalId: string, topics: string[], target: string, input: string, context?: BrainContext): string;
