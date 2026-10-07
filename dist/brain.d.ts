import { BrainContext, BrainResult } from "./types";
export declare const normalize: (input: string) => string;
export declare function think(input: string, context?: BrainContext): BrainResult;
