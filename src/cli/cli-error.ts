/** Structured error with an exit code for CLI process termination. */
export class CLIError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
  ) {
    super(message);
  }
}
