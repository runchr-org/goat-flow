/**
 * GOAT Flow Setup checks for `goat-flow audit`.
 * 4 setup-scope checks that validate project structure.
 */
import type { BuildCheck } from "./types.js";
import { AUDIT_VERSION } from "../constants.js";

const requiredFilesExist: BuildCheck = {
  id: "required-files",
  name: "Required files",
  scope: "setup",
  run: (ctx) => {
    const missing = ctx.structure.required_files.filter(
      (f) => !ctx.fs.exists(f),
    );
    if (missing.length === 0) return null;
    return {
      check: "Required files",
      message: `Missing: ${missing.join(", ")}`,
      evidence: missing[0],
      howToFix: `Create ${missing.join(", ")} by running \`goat-flow setup\` or creating them manually.`,
    };
  },
};

const requiredDirsExist: BuildCheck = {
  id: "required-dirs",
  name: "Required directories",
  scope: "setup",
  run: (ctx) => {
    const missing = ctx.structure.required_dirs.filter((d) => {
      const trimmed = d.endsWith("/") ? d.slice(0, -1) : d;
      return ctx.fs.listDir(trimmed).length === 0 && !ctx.fs.exists(trimmed);
    });
    if (missing.length === 0) return null;
    return {
      check: "Required directories",
      message: `Missing: ${missing.join(", ")}`,
      evidence: missing[0],
      howToFix: `Create the missing ${missing.length === 1 ? "directory" : "directories"}: ${missing.map((d) => `\`mkdir -p ${d}\``).join(", ")}.`,
    };
  },
};

const configExistsAndParses: BuildCheck = {
  id: "config-parses",
  name: "Config file",
  scope: "setup",
  run: (ctx) => {
    if (!ctx.config.exists) {
      return {
        check: "Config file",
        message: ".goat-flow/config.yaml does not exist",
        howToFix: "Create .goat-flow/config.yaml by running `goat-flow setup`.",
      };
    }
    if (ctx.config.parseError) {
      return {
        check: "Config file",
        message: `Parse error: ${ctx.config.parseError}`,
        evidence: ".goat-flow/config.yaml",
        howToFix: "Fix the YAML syntax error in .goat-flow/config.yaml.",
      };
    }
    return null;
  },
};

const configVersionCurrent: BuildCheck = {
  id: "config-version",
  name: "Config version",
  scope: "setup",
  run: (ctx) => {
    if (!ctx.config.exists) return null;
    const version = ctx.config.config.version;
    if (!version) {
      return {
        check: "Config version",
        message: "version field missing from config.yaml",
        howToFix: `Add \`version: "${AUDIT_VERSION}"\` to .goat-flow/config.yaml.`,
      };
    }
    if (version !== AUDIT_VERSION) {
      return {
        check: "Config version",
        message: `Config version ${version} does not match current ${AUDIT_VERSION}`,
        howToFix: `Update the version field in .goat-flow/config.yaml to "${AUDIT_VERSION}".`,
      };
    }
    return null;
  },
};

/** 4 setup-scope build checks */
export const SETUP_CHECKS: BuildCheck[] = [
  requiredFilesExist,
  requiredDirsExist,
  configExistsAndParses,
  configVersionCurrent,
];
