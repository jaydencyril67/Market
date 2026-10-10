import { BrainContext, BrainDiscoveredFeature, BrainResult } from "../types";
import { LiveCryBotsBridge } from "./types";
export type ThinkLiveOptions = {
    userId?: string;
    runtimeFeatures?: BrainDiscoveredFeature[];
};
export declare function thinkLive(input: string, context: BrainContext | undefined, bridge: LiveCryBotsBridge, options?: ThinkLiveOptions): Promise<BrainResult>;
