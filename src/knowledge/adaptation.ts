import type { BrainDiscoveredFeature } from "../types";

export type AppMapChange = {
  kind: "added" | "removed" | "changed";
  route: string;
  name: string;
  details: string;
};

const verifiedByRoute = (features: BrainDiscoveredFeature[]): Map<string, BrainDiscoveredFeature> =>
  new Map<string, BrainDiscoveredFeature>(
    features
      .filter((feature) =>
        feature &&
        feature.verified === true &&
        typeof feature.route === "string" &&
        /^\/[a-z0-9/_-]+$/i.test(feature.route)
      )
      .map((feature): [string, BrainDiscoveredFeature] => [feature.route, feature]),
  );

/**
 * Compares two verified app-map snapshots. Removed routes are reported for
 * awareness only; they must never be used as navigation targets.
 */
export function compareAppMap(
  previous: BrainDiscoveredFeature[] = [],
  current: BrainDiscoveredFeature[] = [],
): AppMapChange[] {
  const before = verifiedByRoute(previous);
  const after = verifiedByRoute(current);
  const changes: AppMapChange[] = [];

  for (const [route, feature] of after) {
    const old = before.get(route);
    if (!old) {
      changes.push({ kind: "added", route, name: feature.name, details: "New verified route or feature." });
      continue;
    }
    const changedName = old.name !== feature.name;
    const changedDescription = old.description !== feature.description;
    const oldKeywords = [...old.keywords].sort().join("|");
    const newKeywords = [...feature.keywords].sort().join("|");
    if (changedName || changedDescription || oldKeywords !== newKeywords) {
      const details = [
        changedName ? "display name changed" : "",
        changedDescription ? "description changed" : "",
        oldKeywords !== newKeywords ? "keywords changed" : "",
      ].filter(Boolean).join(", ");
      changes.push({ kind: "changed", route, name: feature.name, details });
    }
  }

  for (const [route, feature] of before) {
    if (!after.has(route)) {
      changes.push({
        kind: "removed",
        route,
        name: feature.name,
        details: "Route no longer appears in the latest verified map; do not navigate to it.",
      });
    }
  }

  return changes.sort((a, b) =>
    a.kind.localeCompare(b.kind) || a.route.localeCompare(b.route),
  );
}
