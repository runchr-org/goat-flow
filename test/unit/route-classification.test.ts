/**
 * Route classification consistency test.
 *
 * Every POST/DELETE entry in DASHBOARD_ROUTE_INVENTORY whose class is
 * "side-effectful" must also appear in SIDE_EFFECTFUL_EXACT_API_ROUTES. This
 * catches drift where a new mutating route is added to the inventory but the
 * Origin/CSRF check never fires because the exact-match set was not updated.
 *
 * Routes marked "privileged-websocket" or with parameter segments (`:id`) are
 * intentionally exempt - they have their own enforcement paths.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  DASHBOARD_ROUTE_INVENTORY,
  SIDE_EFFECTFUL_EXACT_API_ROUTES,
} from "../../src/cli/server/dashboard.js";

type DashboardRoute = (typeof DASHBOARD_ROUTE_INVENTORY)[number];

/**
 * Return side-effectful exact-route keys missing from the CSRF enforcement set.
 *
 * @param inventory - dashboard route inventory entries to validate
 * @returns route keys whose side-effect class is not enforced by exact match
 */
function missingSideEffectfulRouteKeys(
  inventory: ReadonlyArray<DashboardRoute>,
): string[] {
  return inventory
    .filter((entry) => entry.class === "side-effectful")
    .filter((entry) => !entry.path.includes(":"))
    .map((entry) => `${entry.method} ${entry.path}`)
    .filter((key) => !SIDE_EFFECTFUL_EXACT_API_ROUTES.has(key));
}

/**
 * Return exact-match CSRF keys that do not exist in the current route inventory.
 *
 * @param inventory - dashboard route inventory entries to validate against
 * @returns exact route keys with no matching inventory entry
 */
function orphanedSideEffectfulRouteKeys(
  inventory: ReadonlyArray<DashboardRoute>,
): string[] {
  const inventoryKeys = new Set(
    inventory
      .filter((entry) => !entry.path.includes(":"))
      .map((entry) => `${entry.method} ${entry.path}`),
  );
  return [...SIDE_EFFECTFUL_EXACT_API_ROUTES].filter(
    (key) => !inventoryKeys.has(key),
  );
}

/**
 * Assert every inventory entry uses an uppercase HTTP method.
 *
 * @param inventory - dashboard route inventory entries to validate
 */
function assertRouteMethodsAreUppercase(
  inventory: ReadonlyArray<DashboardRoute>,
): void {
  inventory.forEach((entry) => {
    assert.equal(
      entry.method,
      entry.method.toUpperCase(),
      `${entry.method} ${entry.path} uses non-uppercase method`,
    );
  });
}

describe("dashboard route classification", () => {
  it("registers every side-effectful POST/DELETE in the exact-match set", () => {
    const missing = missingSideEffectfulRouteKeys(DASHBOARD_ROUTE_INVENTORY);
    assert.deepEqual(
      missing,
      [],
      `These routes are class:"side-effectful" but missing from SIDE_EFFECTFUL_EXACT_API_ROUTES: ${missing.join(", ")}`,
    );
  });

  it("only lists keys whose route exists in the inventory", () => {
    const orphans = orphanedSideEffectfulRouteKeys(DASHBOARD_ROUTE_INVENTORY);
    assert.deepEqual(
      orphans,
      [],
      `These keys are in SIDE_EFFECTFUL_EXACT_API_ROUTES but not in DASHBOARD_ROUTE_INVENTORY: ${orphans.join(", ")}`,
    );
  });

  it("uses upper-case HTTP methods in inventory entries", () => {
    assertRouteMethodsAreUppercase(DASHBOARD_ROUTE_INVENTORY);
  });
});
