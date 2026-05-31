import {
  PROJECT_ROOT,
  STUB_AGENT_PROFILE,
  assert,
  describe,
  extractHookFacts,
  extractHookFactsForDenyContent,
  it,
  readFileSync,
  resolve,
  stubFS,
} from "./helpers.js";

describe("hook fact extraction", () => {
  it("detects current deny hook secret coverage from generalized path matcher", () => {
    const gitTemplate = readFileSync(
      resolve(PROJECT_ROOT, "workflow/hooks/deny-dangerous.sh"),
      "utf8",
    );
    const secretTemplate = readFileSync(
      resolve(PROJECT_ROOT, "workflow/hooks/hook-lib/patterns-paths.sh"),
      "utf8",
    );
    const destructiveTemplate = readFileSync(
      resolve(PROJECT_ROOT, "workflow/hooks/hook-lib/patterns-shell.sh"),
      "utf8",
    );
    const fs = stubFS({
      exists: (path) =>
        [
          ".claude/hooks/deny-dangerous.sh",
          ".goat-flow/hook-lib/patterns-shell.sh",
          ".goat-flow/hook-lib/patterns-paths.sh",
          ".goat-flow/hook-lib/patterns-writes.sh",
          ".goat-flow/hook-lib/deny-dangerous-self-test.sh",
        ].includes(path),
      readFile: (path) => {
        if (path === ".goat-flow/hook-lib/patterns-shell.sh") {
          return destructiveTemplate;
        }
        if (path === ".goat-flow/hook-lib/patterns-paths.sh") {
          return secretTemplate;
        }
        if (path === ".claude/hooks/deny-dangerous.sh") {
          return gitTemplate;
        }
        return null;
      },
    });
    const facts = extractHookFacts(fs, STUB_AGENT_PROFILE, {}, true, true);
    assert.equal(facts.bashDenyCoversSecrets, true);
  });

  it("does not count self-test-only secret probes as Bash secret coverage", () => {
    const facts = extractHookFactsForDenyContent(`
run_self_test() {
  run_case "cat .env" "cat .env" 2
  run_case "cat ./.env" "cat ./.env" 2
  run_case "cat ../.env" "cat ../.env" 2
  run_case "cat .env.example" "cat .env.example" 0
  run_case "cat ssh key" "cat ~/.ssh/id_rsa" 2
  run_case "cat relative ssh key" "cat .ssh/id_rsa" 2
  run_case "cat aws credentials" "cat ~/.aws/credentials" 2
  run_case "cat relative aws credentials" "cat .aws/credentials" 2
  run_case "cat secrets token" "cat secrets/token.txt" 2
  run_case "cat credentials.json" "cat credentials.json" 2
  run_case "xxd pem" "xxd server.pem" 2
}
`);
    assert.equal(facts.bashDenyCoversSecrets, false);
  });
});
