import { BrainContext, BrainResult } from "./types";
export declare class BrainSession {
    context: BrainContext;
    ask(input: string): BrainResult;
    reset(): void;
    get history(): string[];
    get entities(): import("./types").BrainEntities;
    get lastIntent(): string | undefined;
    get lastTarget(): string | undefined;
}
