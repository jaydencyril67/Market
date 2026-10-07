import { BrainEntities, BrainResult } from "../types";
import { LiveQuery, LiveTopic } from "./types";
export declare function liveTopicForResult(result: BrainResult): LiveTopic | undefined;
export declare function buildLiveQuery(result: BrainResult, input: string, entities?: BrainEntities, userId?: string): LiveQuery | undefined;
