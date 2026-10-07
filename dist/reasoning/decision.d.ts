import { BrainAction, BrainStep, ReasoningDecision, Intent } from "../types";
export declare function splitRequests(input: string): string[];
export declare function decide(steps: BrainStep[], intents: Intent[]): ReasoningDecision;
export declare function isCompatible(a: BrainAction, b: BrainAction): boolean;
