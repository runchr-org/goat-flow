import {
  describe,
  it,
  assert,
  evaluateContent,
  evaluateUploadedBundle,
  PROJECT_ROOT,
} from "./helpers.js";

describe("uploaded shared-reference evaluation", () => {
  it("uses the skill-playbooks path for single uploaded shared references", () => {
    const report = evaluateContent(PROJECT_ROOT, {
      content: "# Lefthook\n\n## Availability Check\ncommand -v lefthook\n",
      suggestedName: "lefthook.md",
      kind: "shared-reference",
    });

    assert.equal(
      report.artifact.path,
      ".goat-flow/skill-playbooks/lefthook.md",
    );
  });

  it("uses the skill-playbooks path for uploaded shared-reference bundles", () => {
    const report = evaluateUploadedBundle(PROJECT_ROOT, {
      files: [
        {
          name: "lefthook.md",
          content: "# Lefthook\n\n## Availability Check\ncommand -v lefthook\n",
        },
      ],
      suggestedName: "lefthook",
      kind: "shared-reference",
    });

    assert.equal(
      report.artifact.path,
      ".goat-flow/skill-playbooks/lefthook.md",
    );
  });
});
