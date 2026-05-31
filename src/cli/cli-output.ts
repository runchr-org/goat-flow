import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ParsedCLI } from "./cli-types.js";

/** Writes rendered output to a requested file path or stdout, creating parent directories for files. */
export function writeOutput(options: ParsedCLI, rendered: string): void {
  if (options.output) {
    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(options.output, rendered + "\n", "utf-8");
    console.error(`Written to ${options.output}`);
    return;
  }

  process.stdout.write(rendered + "\n");
}
