import type { BrainDiscoveredFeature } from "../types";
export type AppMapChange = {
    kind: "added" | "removed" | "changed";
    route: string;
    name: string;
    details: string;
};
/**
 * Compares two verified app-map snapshots. Removed routes are reported for
 * awareness only; they must never be used as navigation targets.
 */
export declare function compareAppMap(previous?: BrainDiscoveredFeature[], current?: BrainDiscoveredFeature[]): AppMapChange[];
