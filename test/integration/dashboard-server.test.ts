/**
 * Dashboard HTML shell contract: GET / returns text/html injecting the runtime globals (default
 * path, version, token, agents, runner ids, presets), links every dashboard asset script, and
 * renders exactly one Home view root.
 */
import { assert, baseUrl, describe, it } from "./dashboard-server.helpers.js";
import {
  assembleDashboardHtml,
  loadDashboardAssetCached,
  loadDashboardPresets,
} from "../../src/cli/server/dashboard-assets.js";
import { createAuditRouteHandlers } from "../../src/cli/server/dashboard-audit-routes.js";
import { createProjectRouteHandlers } from "../../src/cli/server/dashboard-project-routes.js";
import { resolveProjectIdentity } from "../../src/cli/server/dashboard-project-state.js";
import { createQualityRouteHandlers } from "../../src/cli/server/dashboard-quality-routes.js";
import {
  createDashboardAuditProfiler,
  shouldProfileAuditRequest,
} from "../../src/cli/server/dashboard-reporting.js";
import { createDashboardRouteContext } from "../../src/cli/server/dashboard-route-context.js";
import { createDashboardRouteHandlers } from "../../src/cli/server/dashboard-routes.js";
import { createShellRouteHandlers } from "../../src/cli/server/dashboard-shell-routes.js";
import { createSkillQualityRouteHandlers } from "../../src/cli/server/dashboard-skill-quality-routes.js";
import { buildDashboardTaskState } from "../../src/cli/server/dashboard-task-state.js";
import { createDashboardTerminalHandlers } from "../../src/cli/server/dashboard-terminal.js";
import {
  buildSetupDetectPayload,
  isProjectDirectory,
} from "../../src/cli/server/setup-detect.js";

describe("dashboard HTML", () => {
  it("keeps dashboard route modules importable behind the server integration surface", () => {
    const profiler = createDashboardAuditProfiler(true);
    const profiled = profiler.span("demo", () => "ok");

    assert.equal(typeof assembleDashboardHtml, "function");
    assert.equal(typeof loadDashboardAssetCached, "function");
    assert.equal(loadDashboardPresets().length > 0, true);
    assert.equal(typeof createAuditRouteHandlers, "function");
    assert.equal(typeof createProjectRouteHandlers, "function");
    assert.equal(typeof createQualityRouteHandlers, "function");
    assert.equal(typeof createDashboardRouteContext, "function");
    assert.equal(typeof createDashboardRouteHandlers, "function");
    assert.equal(typeof createShellRouteHandlers, "function");
    assert.equal(typeof createSkillQualityRouteHandlers, "function");
    assert.equal(typeof buildDashboardTaskState, "function");
    assert.equal(typeof createDashboardTerminalHandlers, "function");
    assert.equal(
      resolveProjectIdentity(process.cwd()).currentPath.length > 0,
      true,
    );
    assert.equal(
      shouldProfileAuditRequest(
        new URL("http://localhost/?profile=true"),
        true,
      ),
      true,
    );
    assert.equal(profiled, "ok");
    assert.equal(profiler.spans.length, 1);
    assert.equal(isProjectDirectory(process.cwd()), true);
    assert.equal(
      buildSetupDetectPayload(process.cwd()).languages.length > 0,
      true,
    );
  });

  it("GET / returns HTML shell with the expected scripts", async () => {
    const res = await fetch(baseUrl);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/html/i);

    const html = await res.text();
    assert.match(html, /__GOAT_FLOW_DEFAULT_PATH__/);
    assert.match(html, /__GOAT_FLOW_VERSION__/);
    assert.match(html, /__GOAT_FLOW_DASHBOARD_TOKEN__/);
    assert.match(html, /__GOAT_FLOW_AGENTS__/);
    assert.match(html, /__GOAT_FLOW_RUNNER_IDS__/);
    assert.match(html, /__GOAT_FLOW_PRESETS__/);
    assert.match(html, /alpinejs@3/i);
    assert.match(html, /\/assets\/dashboard-readers\.js/);
    assert.match(html, /\/assets\/dashboard-setup-quality\.js/);
    assert.match(html, /\/assets\/dashboard-projects\.js/);
    assert.match(html, /\/assets\/dashboard-custom-prompts\.js/);
    assert.match(html, /\/assets\/dashboard-prompts\.js/);
    assert.match(html, /\/assets\/dashboard-terminal\.js/);
    assert.match(html, /\/assets\/app\.js/);
    assert.equal(
      html.match(/x-show="activeView === 'home'"/g)?.length ?? 0,
      1,
      "dashboard HTML should contain exactly one Home view root",
    );
  });
});
