/**
 * Dashboard error handling: the server returns 404 for unknown routes and for unknown asset file
 * requests rather than falling through to the HTML shell.
 */
import { assert, baseUrl, describe, it } from "./dashboard-server.helpers.js";
describe("dashboard error handling", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await fetch(`${baseUrl}/nonexistent`);
    assert.equal(res.status, 404);
  });

  it("returns 404 for unknown asset files", async () => {
    const res = await fetch(`${baseUrl}/assets/nonexistent.js`);
    assert.equal(res.status, 404);
  });
});
