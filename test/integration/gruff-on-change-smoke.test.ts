import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..");
const HOOK = join(PROJECT_ROOT, "workflow", "hooks", "gruff-on-change.sh");
const disposables: string[] = [];

after(() => {
  for (const dir of disposables) rmSync(dir, { recursive: true, force: true });
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "goat-flow-gruff-hook-"));
  disposables.push(root);
  return root;
}

function writeMockGruff(root: string): string {
  const binDir = join(root, "bin");
  mkdirSync(binDir, { recursive: true });
  const bin = join(binDir, "gruff-ts");
  writeFileSync(
    bin,
    "#!/usr/bin/env bash\nprintf 'mock finding for %s\\n' \"$2\"\nexit 1\n",
  );
  chmodSync(bin, 0o755);
  return binDir;
}

function runHook(
  root: string,
  payload: unknown,
  pathPrefix: string,
): ReturnType<typeof spawnSync> {
  return spawnSync("bash", [HOOK], {
    cwd: root,
    input: JSON.stringify(payload),
    encoding: "utf-8",
    env: { ...process.env, PATH: pathPrefix },
  });
}

describe("gruff-on-change hook", () => {
  it("prints findings and footer for edited TypeScript files", () => {
    const root = makeRoot();
    const binDir = writeMockGruff(root);
    writeFileSync(join(root, ".gruff-ts.yaml"), "rules: {}\n");
    const result = runHook(
      root,
      { tool_name: "Edit", tool_input: { file_path: "src/example.ts" } },
      `${binDir}:/usr/bin:/bin`,
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /mock finding for src\/example\.ts/);
    assert.match(
      result.stdout,
      /For triage: consult \.goat-flow\/skill-playbooks\/gruff-code-quality\.md/,
    );
  });

  it("exits silently for fail-soft skip cases", () => {
    const root = makeRoot();
    const binDir = writeMockGruff(root);
    writeFileSync(join(root, ".gruff-ts.yaml"), "rules: {}\n");
    const cases = [
      { tool_name: "Read", tool_input: { file_path: "src/example.ts" } },
      { tool_name: "Edit", tool_input: { file_path: "README.md" } },
      { tool_name: "Edit", tool_input: { file_path: "node_modules/x.ts" } },
    ];

    for (const payload of cases) {
      const result = runHook(root, payload, `${binDir}:/usr/bin:/bin`);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, "");
    }
  });

  it("exits silently when binary or project config is missing", () => {
    const root = makeRoot();
    const noBinary = runHook(
      root,
      { tool_name: "Edit", tool_input: { file_path: "src/example.ts" } },
      "/usr/bin:/bin",
    );
    assert.equal(noBinary.status, 0, noBinary.stderr);
    assert.equal(noBinary.stdout, "");

    const binDir = writeMockGruff(root);
    const noConfig = runHook(
      root,
      { tool_name: "Edit", tool_input: { file_path: "src/example.ts" } },
      `${binDir}:/usr/bin:/bin`,
    );
    assert.equal(noConfig.status, 0, noConfig.stderr);
    assert.equal(noConfig.stdout, "");
  });
});
