/**
 * Shared type contracts for the goat-flow config file.
 * These interfaces describe the normalized shape used after YAML parsing and validation.
 */
export interface GoatFlowConfig {
  version: string;
  footguns: { committed: string; local: string };
  lessons: { committed: string; local: string };
  decisions: { path: string };
  evals: { path: string };
  codingStandards: { path: string };
  tasks: { path: string };
  logs: { path: string };
  agents: string[] | null;
  skills: { install: string[] | 'all' };
  lineLimits: { target: number; limit: number };
  persona: 'developer' | 'investigator';
}

export interface ValidationIssue {
  level: 'warning' | 'error';
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
}

export interface LoadedConfig {
  exists: boolean;
  valid: boolean;
  config: GoatFlowConfig;
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
  parseError: string | null;
}
