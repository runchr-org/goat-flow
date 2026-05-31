/**
 * Dashboard /api/projects state endpoint: classifies a project's state, persists titles/favorites
 * and identities (deduping by git remote, using a local marker for non-git projects across renames)
 * without leaking raw private remote URLs or creating markers during passive browse, migrates the
 * legacy projects file, blocks shared temp roots, and returns 400/405 for bad input or methods.
 */
import {
  assert,
  DASHBOARD_STATE_PATH,
  describe,
  expectRecord,
  fetchJson,
  it,
  join,
  LEGACY_PROJECTS_LIST_PATH,
  mkdtemp,
  PROJECT_PATH,
  readFile,
  rename,
  resolve,
  rm,
  runGit,
  tmpdir,
  writeFile,
  writeProjectFile,
} from "./dashboard-server.helpers.js";
describe("dashboard /api/projects", () => {
  it("classifies project state for a valid path", async () => {
    const { res, body } = await fetchJson(
      `/api/projects/status?paths=${encodeURIComponent(PROJECT_PATH)}`,
    );
    assert.equal(res.status, 200);

    const data = expectRecord(body, "Projects status response");
    assert.ok(Array.isArray(data.projects));
    assert.equal((data.projects as unknown[]).length, 1);
    const project = expectRecord(
      (data.projects as unknown[])[0],
      "Projects status item",
    );
    assert.equal(project.path, PROJECT_PATH);
    assert.equal(typeof project.identity, "string");
    assert.match(
      String(project.identitySource),
      /^(git-remote|goat-marker|path)$/,
    );
    assert.equal(typeof project.state, "string");
    assert.equal(typeof project.action, "string");
    assert.equal(typeof project.details, "string");
  });

  it("clears a project title when an empty string is posted", async () => {
    const post = await fetchJson("/api/projects/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paths: [PROJECT_PATH],
        favorites: [],
        projectTitles: { [PROJECT_PATH]: "" },
      }),
    });
    assert.equal(post.res.status, 200);

    const get = await fetchJson("/api/projects/list");
    const body = expectRecord(get.body, "dashboard state");
    assert.deepEqual(body.projectTitles, {});
    assert.ok(
      Object.keys(expectRecord(body.projects, "dashboard projects")).length >=
        1,
    );
  });

  it("does not create project identity markers during passive browse", async () => {
    const root = await mkdtemp(join(tmpdir(), "goat-flow-browse-project-"));
    try {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        "version: 1.7.0\n",
      );
      const { res } = await fetchJson(
        `/api/browse?path=${encodeURIComponent(root)}`,
      );
      assert.equal(res.status, 200);
      await assert.rejects(
        readFile(join(root, ".goat-flow", "project-id"), "utf-8"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("migrates the legacy projects file with empty favorites and titles", async () => {
    await rm(DASHBOARD_STATE_PATH, { force: true });
    const nextPaths = [PROJECT_PATH, resolve(PROJECT_PATH, "docs")];
    await writeFile(
      LEGACY_PROJECTS_LIST_PATH,
      JSON.stringify({ paths: nextPaths }, null, 2),
    );

    const get = await fetchJson("/api/projects/list");
    assert.equal(get.res.status, 200);
    const body = expectRecord(get.body, "dashboard state");
    assert.deepEqual(body.paths, nextPaths);
    assert.deepEqual(body.favorites, []);
    assert.deepEqual(body.projectTitles, {});
    const projects = expectRecord(body.projects, "dashboard projects");
    assert.ok(Object.keys(projects).length >= 1);
  });

  it("persists project identities without raw private remote URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "goat-flow-private-remote-"));
    const alias = await mkdtemp(join(tmpdir(), "goat-flow-private-alias-"));
    const remoteUrl = "ssh://git@example.internal/private/repo.git";
    try {
      runGit(root, ["init"]);
      runGit(root, ["remote", "add", "origin", remoteUrl]);
      runGit(alias, ["init"]);
      runGit(alias, ["remote", "add", "origin", remoteUrl]);
      const post = await fetchJson("/api/projects/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paths: [root, alias],
          favorites: [],
          projectTitles: { [root]: "Private Project" },
        }),
      });
      assert.equal(post.res.status, 200);
      const persisted = await readFile(DASHBOARD_STATE_PATH, "utf-8");
      assert.equal(persisted.includes(remoteUrl), false);
      assert.match(persisted, /"remoteUrlHash":/);
      assert.match(persisted, /"title": "Private Project"/);
      const parsed = expectRecord(
        JSON.parse(persisted),
        "Persisted dashboard state",
      );
      const projects = expectRecord(parsed.projects, "Persisted projects");
      assert.equal(Object.keys(projects).length, 1);
      const project = expectRecord(
        Object.values(projects)[0],
        "Persisted project",
      );
      assert.deepEqual(
        new Set(project.paths as string[]),
        new Set([root, alias]),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(alias, { recursive: true, force: true });
    }
  });

  it("persists the dashboard state roundtrip", async () => {
    const nextPaths = [PROJECT_PATH, resolve(PROJECT_PATH, "src")];
    const nextFavorites = ["goat-review", "goat-qa"];
    const nextProjectTitles = { [PROJECT_PATH]: "goat-flow WSL" };
    const post = await fetchJson("/api/projects/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paths: nextPaths,
        favorites: nextFavorites,
        projectTitles: nextProjectTitles,
      }),
    });
    assert.equal(post.res.status, 200);
    assert.deepEqual(post.body, { ok: true });

    const get = await fetchJson("/api/projects/list");
    assert.equal(get.res.status, 200);
    const body = expectRecord(get.body, "dashboard state");
    assert.deepEqual(new Set(body.paths as string[]), new Set(nextPaths));
    assert.deepEqual(body.favorites, nextFavorites);
    const projectTitles = expectRecord(
      body.projectTitles,
      "dashboard state projectTitles",
    );
    assert.ok(Object.values(projectTitles).includes("goat-flow WSL"));
    const projects = expectRecord(body.projects, "dashboard state projects");
    assert.ok(Object.keys(projects).length >= 1);
  });

  it("rejects exact shared temp roots when saving project state", async () => {
    if (process.platform === "win32") return;

    const { res, body } = await fetchJson("/api/projects/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paths: ["/tmp"],
        favorites: [],
        projectTitles: {},
      }),
    });
    assert.equal(res.status, 400);
    const data = expectRecord(body, "Projects list blocked-root error");
    assert.match(String(data.error), /Local path validation failed/);
    assert.doesNotMatch(String(data.error), /\/tmp/);
  });

  it("reports blocked roots through the project status result", async () => {
    if (process.platform === "win32") return;

    const { res, body } = await fetchJson(
      `/api/projects/status?paths=${encodeURIComponent("/tmp")}`,
    );
    assert.equal(res.status, 200);
    const data = expectRecord(body, "Projects status blocked-root response");
    assert.ok(Array.isArray(data.projects));
    const project = expectRecord(
      (data.projects as unknown[])[0],
      "Projects status blocked-root item",
    );
    assert.equal(project.state, "error");
    assert.match(String(project.details), /Local path validation failed/);
  });

  it("resolves matching git remotes to one dashboard project identity", async () => {
    const one = await mkdtemp(join(tmpdir(), "goat-flow-git-project-one-"));
    const two = await mkdtemp(join(tmpdir(), "goat-flow-git-project-two-"));
    const remoteUrl = "git@github.com:Example/PrivateRepo.git";
    try {
      runGit(one, ["init"]);
      runGit(one, ["remote", "add", "origin", remoteUrl]);
      runGit(two, ["init"]);
      runGit(two, ["remote", "add", "origin", remoteUrl]);

      const { body } = await fetchJson(
        `/api/projects/status?paths=${encodeURIComponent(`${one},${two}`)}`,
      );
      const data = expectRecord(body, "Projects status response");
      assert.ok(Array.isArray(data.projects));
      const [first, second] = data.projects as unknown[];
      const firstProject = expectRecord(first, "First project");
      const secondProject = expectRecord(second, "Second project");
      assert.equal(firstProject.identity, secondProject.identity);
      assert.equal(firstProject.identitySource, "git-remote");
      assert.equal(typeof firstProject.remoteUrlHash, "string");
      assert.equal(JSON.stringify(data).includes(remoteUrl), false);
    } finally {
      await rm(one, { recursive: true, force: true });
      await rm(two, { recursive: true, force: true });
    }
  });

  it("returns 400 for invalid project list JSON", async () => {
    const { res, body } = await fetchJson("/api/projects/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(res.status, 400);

    const data = expectRecord(body, "Projects list error");
    assert.equal(typeof data.error, "string");
  });

  it("returns 400 without paths", async () => {
    const { res } = await fetchJson("/api/projects/status");
    assert.equal(res.status, 400);
  });

  it("returns 405 for unsupported project list methods", async () => {
    const { res, body } = await fetchJson("/api/projects/list", {
      method: "DELETE",
    });
    assert.equal(res.status, 405);
    assert.deepEqual(body, { error: "Method not allowed" });
  });

  it("uses a local goat-flow marker for non-git projects across renames", async () => {
    const root = await mkdtemp(join(tmpdir(), "goat-flow-marker-project-"));
    const moved = `${root}-renamed`;
    try {
      await writeProjectFile(
        root,
        ".goat-flow/config.yaml",
        "version: 1.7.0\n",
      );
      const first = await fetchJson(
        `/api/projects/status?paths=${encodeURIComponent(root)}`,
      );
      const firstBody = expectRecord(first.body, "First status");
      assert.ok(Array.isArray(firstBody.projects));
      const firstProject = expectRecord(
        (firstBody.projects as unknown[])[0],
        "First project",
      );
      assert.equal(firstProject.identitySource, "goat-marker");
      const marker = await readFile(
        join(root, ".goat-flow", "project-id"),
        "utf-8",
      );
      assert.match(marker, /gf_[0-9a-f-]{36}/i);

      await rename(root, moved);
      const second = await fetchJson(
        `/api/projects/status?paths=${encodeURIComponent(moved)}`,
      );
      const secondBody = expectRecord(second.body, "Second status");
      assert.ok(Array.isArray(secondBody.projects));
      const secondProject = expectRecord(
        (secondBody.projects as unknown[])[0],
        "Second project",
      );
      assert.equal(secondProject.identity, firstProject.identity);
      assert.equal(secondProject.path, moved);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(moved, { recursive: true, force: true });
    }
  });
});
