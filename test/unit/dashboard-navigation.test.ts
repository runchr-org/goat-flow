/**
 * Unit tests for dashboard navigation markup and route targets.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");
const DASHBOARD_INDEX_PATH = resolve(
  PROJECT_ROOT,
  "src",
  "dashboard",
  "index.html",
);
const DASHBOARD_APP_FRAGMENT_PATHS = [
  "dashboard-app-state-fragments.ts",
  "dashboard-app-prompts-audit-fragments.ts",
  "dashboard-app-data-loading-fragments.ts",
  "dashboard-app-skill-quality-fragments.ts",
  "dashboard-app-project-terminal-fragments.ts",
].map((filename) => resolve(PROJECT_ROOT, "src", "dashboard", filename));
const PLANS_VIEW_PATH = resolve(
  PROJECT_ROOT,
  "src",
  "dashboard",
  "views",
  "plans.html",
);
const COMING_SOON_VIEW_PATH = resolve(
  PROJECT_ROOT,
  "src",
  "dashboard",
  "views",
  "coming-soon.html",
);

/** Read dashboard source fixtures as text for navigation assertions. */
function read(path: string): string {
  return readFileSync(path, "utf-8");
}

/** Read the split browser app fragments as the effective dashboard app source. */
function readAppSource(): string {
  return DASHBOARD_APP_FRAGMENT_PATHS.map(read).join("\n");
}

/**
 * Assert each navigation label is rendered in the supplied menu markup.
 *
 * @param menuMarkup - HTML fragment for the side navigation menu
 * @param labels - visible labels that must appear as text nodes
 */
function assertMenuContainsLabels(
  menuMarkup: string,
  labels: ReadonlyArray<string>,
): void {
  labels.forEach((label) => {
    assert.match(menuMarkup, new RegExp(`>\\s*${label}\\s*<`));
  });
}

/**
 * Assert each navigation label is absent from the supplied menu markup.
 *
 * @param menuMarkup - HTML fragment for the side navigation menu
 * @param labels - visible labels that must not render in the menu
 */
function assertMenuOmitsLabels(
  menuMarkup: string,
  labels: ReadonlyArray<string>,
): void {
  labels.forEach((label) => {
    assert.doesNotMatch(menuMarkup, new RegExp(`>\\s*${label}\\s*<`));
  });
}

/**
 * Assert deferred dashboard views are not exposed through coming-soon metadata.
 *
 * @param appSource - concatenated dashboard app source
 * @param views - view identifiers deferred from the dashboard
 */
function assertComingSoonMetaOmitsDeferredViews(
  appSource: string,
  views: ReadonlyArray<string>,
): void {
  views.forEach((view) => {
    assert.doesNotMatch(
      appSource,
      new RegExp(`["']?${view}["']?\\s*:\\s*\\{\\s*title:\\s*["']`, "u"),
      `${view} is deferred; it should not appear in comingSoonMeta`,
    );
  });
}

/**
 * Assert deferred dashboard views are not included in the HTML shell.
 *
 * @param html - dashboard index HTML
 * @param views - view identifiers whose include comments must be absent
 */
function assertDashboardOmitsDeferredViews(
  html: string,
  views: ReadonlyArray<string>,
): void {
  views.forEach((view) => {
    assert.doesNotMatch(
      html,
      new RegExp(`<!-- include: views\\/${view}\\.html -->`),
    );
  });
}

describe("dashboard side navigation", () => {
  it("renders the requested desktop side menu without disabled destinations", () => {
    const html = read(DASHBOARD_INDEX_PATH);
    const sideMenu = html.slice(
      html.indexOf('<aside class="no-print gf-side-nav"'),
      html.indexOf("</aside>") + "</aside>".length,
    );

    assert.doesNotMatch(html, /class="gf-nav-wrap"/);
    assert.match(html, /'gf-side-collapsed': sideNavCollapsed/);
    assert.match(sideMenu, /class="gf-side-collapse-btn"/);
    assert.match(sideMenu, /@click="toggleSideNav\(\)"/);
    assert.match(sideMenu, /aria-label="goat-flow Home"/);
    assert.match(sideMenu, /class="gf-side-logo-emoji"[\s\S]*🐐/);
    assert.match(sideMenu, /class="gf-side-logo-text"[\s\S]*goat-flow/);
    assert.match(html, /id="gf-side-icon-home"/);
    assert.match(sideMenu, /href="#gf-side-icon-home"/);
    assert.match(sideMenu, /class="gf-side-icon"/);
    assert.match(sideMenu, /aria-label="Primary navigation"/);
    assertMenuContainsLabels(sideMenu, ["Managers", "Operations"]);
    assert.match(
      sideMenu,
      />\s*Home\s*<[\s\S]*>\s*Prompts\s*<[\s\S]*>\s*Workspace\s*</,
    );
    assert.match(
      sideMenu,
      />\s*Managers\s*<[\s\S]*>\s*Hooks\s*<[\s\S]*>\s*Plans\s*<[\s\S]*>\s*Skill Evaluator\s*</,
    );
    assert.match(
      sideMenu,
      />\s*Operations\s*<[\s\S]*>\s*Projects\s*<[\s\S]*>\s*Quality\s*<[\s\S]*>\s*Setup\s*</,
    );
    assertMenuContainsLabels(sideMenu, [
      "Home",
      "Prompts",
      "Workspace",
      "Skill Evaluator",
      "Plans",
      "Projects",
      "Quality",
      "Setup",
      "Hooks",
    ]);
    assertMenuOmitsLabels(sideMenu, [
      "Context",
      "Constraints",
      "Verification",
      "Recovery",
      "Feedback Loop",
      "Harness Overview",
      "Harness",
      "Memory",
      "Playbooks",
      "Telemetry",
    ]);
    assertMenuOmitsLabels(sideMenu, ["Settings", "About"]);
    assert.doesNotMatch(sideMenu, /\sdisabled(?:=|\s|>)/);
  });

  it("keeps Settings and About in the header and supports a compact rail", () => {
    const html = read(DASHBOARD_INDEX_PATH);
    const appSource = readAppSource();
    const sideMenu = html.slice(
      html.indexOf('<aside class="no-print gf-side-nav"'),
      html.indexOf("</aside>") + "</aside>".length,
    );

    assert.doesNotMatch(sideMenu, /gf-side-nav-group-secondary/);
    assert.doesNotMatch(sideMenu, /data-short="St"[\s\S]*Settings/);
    assert.doesNotMatch(sideMenu, /data-short="A"[\s\S]*About/);
    assert.match(html, /title="Settings"[\s\S]*aria-label="Settings"/);
    assert.match(html, /title="About"[\s\S]*aria-label="About"/);
    assert.match(appSource, /sideNavCollapsed:/);
    assert.match(appSource, /localStorage\.getItem\("gf-side-nav-collapsed"\)/);
    assert.match(appSource, /toggleSideNav\(\)/);
    assert.match(
      appSource,
      /localStorage\.setItem\(\s*"gf-side-nav-collapsed"/,
    );
  });

  it("keeps project switching in the header and includes Plans plus Coming Soon views", () => {
    const html = read(DASHBOARD_INDEX_PATH);
    const plansView = read(PLANS_VIEW_PATH);
    const comingSoonView = read(COMING_SOON_VIEW_PATH);

    assert.match(html, /@click="openBrowser\(\)"/);
    assert.match(html, /<!-- include: views\/plans\.html -->/);
    assert.match(html, /<!-- include: views\/coming-soon\.html -->/);
    assert.match(plansView, /x-show="activeView === 'plans'"/);
    assert.match(plansView, /loadTasks\(\)/);
    assert.match(
      plansView,
      /@gf-set-active-task-plan="setActiveTaskPlan\(\$event\.detail\.planName\)"/,
    );
    assert.match(
      plansView,
      /\$dispatch\('gf-set-active-task-plan', \{ planName: plan\.name \}\)/,
    );
    assert.match(plansView, /What active plan means/);
    assert.match(plansView, /Active is the default work plan/);
    assert.match(plansView, /Set active plan/);
    assert.match(comingSoonView, /x-show="isComingSoonView\(\)"/);
    assert.match(comingSoonView, /comingSoonMeta\(activeView\)/);
  });

  it("keeps deferred dashboard pages out of coming-soon metadata", () => {
    const appSource = readAppSource();

    assertComingSoonMetaOmitsDeferredViews(appSource, [
      "harness",
      "playbooks",
      "memory",
      "telemetry",
    ]);
  });

  it("does not include deferred harness manager views", () => {
    const html = read(DASHBOARD_INDEX_PATH);
    assertDashboardOmitsDeferredViews(html, [
      "harness",
      "feedback-loop",
      "context",
      "constraints",
      "verification",
      "recovery",
      "memory",
      "playbooks",
    ]);
  });
});
