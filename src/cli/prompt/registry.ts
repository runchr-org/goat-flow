/**
 * Registry that flattens all prompt fragment catalogs into a single lookup surface.
 * Use this module when mapping failed checks or anti-patterns to prompt content.
 */
import type { Fragment, FragmentPhase } from "./types.js";
import { foundationFragments } from "./fragments/foundation.js";
import { standardFragments } from "./fragments/standard.js";
import { promotedFragments } from "./fragments/full.js";
import { antiPatternFragments } from "./fragments/anti-patterns.js";

/** Combined array of all prompt fragments across every phase */
const allFragments: Fragment[] = [
  ...foundationFragments,
  ...standardFragments,
  ...promotedFragments,
  ...antiPatternFragments,
];

/** Lookup map from fragment key to its definition for O(1) retrieval */
const fragmentMap = new Map<string, Fragment>(
  allFragments.map((f) => [f.key, f]),
);

/** Retrieve a single fragment by its unique key */
export function getFragment(key: string): Fragment | undefined {
  return fragmentMap.get(key);
}

/** Retrieve all fragments belonging to a specific phase */
export function getFragmentsByPhase(phase: FragmentPhase): Fragment[] {
  return allFragments.filter((f) => f.phase === phase);
}
