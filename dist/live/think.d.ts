import { BrainContext, BrainResult } from "../types";
import { LiveCryBotsBridge } from "./types";
export type ThinkLiveOptions = {
    userId?: string;
};
export declare function thinkLive(input: string, context: BrainContext | undefined, bridge: LiveCryBotsBridge, options?: ThinkLiveOptions): Promise<BrainResult>;
