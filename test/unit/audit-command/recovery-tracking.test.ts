import {
  HARNESS_CHECKS,
  assert,
  describe,
  it,
  join,
  makeCtx,
  stubFS,
} from "./helpers.js";

describe("recovery harness milestone tracking", () => {
  function taskCtx(
    files: Record<string, string>,
    tasksExists = true,
  ): AuditContext {
    const dirs = new Map<string, Set<string>>();
    dirs.set(".goat-flow/tasks", new Set());
    for (const file of Object.keys(files)) {
      const parts = file.split("/");
      for (let i = 1; i < parts.length; i++) {
        const parent = parts.slice(0, i).join("/");
        const child = parts[i];
        if (child === undefined) continue;
        if (!dirs.has(parent)) dirs.set(parent, new Set());
        dirs.get(parent)!.add(child);
      }
    }
    return makeCtx({
      fs: stubFS({
        exists: (path) =>
          (tasksExists && path === ".goat-flow/tasks") || path in files,
        listDir: (path) => [...(dirs.get(path) ?? new Set<string>())],
        readFile: (path) => files[path] ?? null,
      }),
    });
  }

  const check = HARNESS_CHECKS.find((c) => c.id === "milestone-tracking")!;

  it("fails when the tasks directory is missing", () => {
    const result = check.run(taskCtx({}, false));
    assert.equal(result.status, "fail");
    assert.ok(result.findings.some((f) => f.includes("No tasks directory")));
  });

  it("passes with an empty tasks directory", () => {
    const result = check.run(taskCtx({}));
    assert.equal(result.status, "pass");
    assert.ok(result.findings.some((f) => f.includes("tracking is optional")));
  });

  it("reports optional task files without scoring completion", () => {
    const result = check.run(
      taskCtx({
        ".goat-flow/tasks/current/Milestone-demo.md":
          "**Status:** in-progress\n\n## Tasks\n- [x] One\n- [ ] Two\n",
      }),
    );
    assert.equal(result.status, "pass");
    assert.ok(result.findings.some((f) => f.includes("1 markdown file")));
    assert.ok(result.findings.some((f) => f.includes("2 checkbox marker")));
    assert.ok(result.findings.some((f) => f.includes("not audited")));
  });

  it("does not fail active, testing-gate, or roadmap checkbox gaps", () => {
    const result = check.run(
      taskCtx({
        ".goat-flow/tasks/current/Milestone-active.md":
          "**Status:** in-progress\n\n## Tasks\n- [ ] One\n- [ ] Two\n",
        ".goat-flow/tasks/current/Milestone-testing.md":
          "**Status:** testing-gate\n\n## Testing Gate\n- [ ] npm test passes\n",
        ".goat-flow/tasks/later/Milestone-runtime-verification.md":
          "**Status:** planned\n\n## Long-term ideas\n- [ ] Explore runtime probes\n",
      }),
    );
    assert.equal(result.status, "pass");
    assert.doesNotMatch(result.findings.join("\n"), /Recovery degraded|0%/);
  });
});

// ---------------------------------------------------------------------------
// Test 10: quality recommendation howToFix includes actionable path
// ---------------------------------------------------------------------------
