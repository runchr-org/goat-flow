import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Script, createContext } from "node:vm";

interface Preset {
  id: string;
  name: string;
  desc: string;
  prompt: string;
  cat: string;
}

const PRESETS_PATH = join(
  import.meta.dirname,
  "../../src/dashboard/preset-prompts.js",
);

function loadPresets(): Preset[] {
  const content = readFileSync(PRESETS_PATH, "utf-8");
  const box: { __PRESETS?: unknown } = {};
  const context = createContext(box);
  new Script(content + "\nthis.__PRESETS = PRESETS;").runInContext(context);
  assert.ok(
    Array.isArray(box.__PRESETS),
    "PRESETS should evaluate to an array",
  );
  return box.__PRESETS as Preset[];
}

describe("Dashboard preset prompts", () => {
  const presets = loadPresets();

  it("every preset has the required fields", () => {
    for (const preset of presets) {
      assert.ok(preset.id.trim().length > 0, "Preset missing id");
      assert.ok(preset.name.trim().length > 0, `${preset.id}: missing name`);
      assert.ok(preset.desc.trim().length > 0, `${preset.id}: missing desc`);
      assert.ok(
        preset.prompt.trim().length > 10,
        `${preset.id}: prompt too short`,
      );
      assert.ok(preset.cat.trim().length > 0, `${preset.id}: missing category`);
    }
  });

  it("preset ids are unique", () => {
    const ids = presets.map((preset) => preset.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.equal(
      duplicates.length,
      0,
      `Duplicate preset ids: ${duplicates.join(", ")}`,
    );
  });

  it("preset categories are from the allowed set", () => {
    const allowed = new Set([
      "debug",
      "review",
      "plan",
      "critique",
      "test",
      "security",
    ]);

    for (const preset of presets) {
      assert.ok(
        allowed.has(preset.cat),
        `${preset.id}: unknown category '${preset.cat}'`,
      );
    }
  });

  it("goat-prefixed prompts use known entry points", () => {
    const validPrefixes = [
      "/goat",
      "/goat-debug",
      "/goat-plan",
      "/goat-review",
      "/goat-sbao",
      "/goat-security",
      "/goat-test",
    ];

    for (const preset of presets) {
      if (!preset.prompt.startsWith("/goat")) continue;
      const prefix = preset.prompt.split(/\s+/, 1)[0];
      assert.ok(
        validPrefixes.includes(prefix),
        `${preset.id}: unknown goat entry point '${prefix}'`,
      );
    }
  });
});
