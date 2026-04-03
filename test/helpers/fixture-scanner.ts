/**
 * Helper utilities for scanning disk-backed project fixtures.
 * The helpers copy fixtures into temporary workspaces so tests can mutate them without touching checked-in data.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createFS } from '../../src/cli/facts/fs.js';
import { scanProject } from '../../src/cli/scanner/scan.js';
import type { AgentId, Grade, ScanReport } from '../../src/cli/types.js';

const FIXTURE_ROOT = resolve('test/fixtures/projects');

interface FixtureExpectation {
  percentage?: number;
  maxPercentage?: number;
  grade?: Grade;
  failedChecks?: string[];
  triggeredAntiPatterns?: string[];
}

export interface FixtureManifest {
  extends?: string;
  agentFilter?: AgentId | null;
  expected?: Record<string, FixtureExpectation>;
}

export interface ScannedFixture {
  root: string;
  report: ScanReport;
  manifest: FixtureManifest;
  cleanup: () => void;
}

/** Read the manifest that describes how a disk-backed fixture should be scanned. */
function readManifest(fixtureDir: string): FixtureManifest {
  const manifestPath = join(fixtureDir, 'fixture.json');
  return JSON.parse(readFileSync(manifestPath, 'utf-8')) as FixtureManifest;
}

/** Copy a fixture layer and any inherited base layers into a temp workspace. */
function copyFixtureLayer(sourceDir: string, destDir: string): void {
  const manifest = readManifest(sourceDir);
  if (manifest.extends) {
    const baseDir = resolve(sourceDir, manifest.extends);
    copyFixtureLayer(baseDir, destDir);
  }

  cpSync(sourceDir, destDir, {
    recursive: true,
    force: true,
    filter: (source) => source !== join(sourceDir, 'fixture.json'),
  });
}

/** Materialize a named fixture into a temp directory and run a full scan over it. */
export function scanFixture(name: string): ScannedFixture {
  const sourceDir = join(FIXTURE_ROOT, name);
  const manifest = readManifest(sourceDir);
  const root = mkdtempSync(join(tmpdir(), `goat-flow-fixture-${name}-`));

  copyFixtureLayer(sourceDir, root);

  return {
    root,
    manifest,
    report: scanProject(createFS(root), root, {
      agentFilter: manifest.agentFilter ?? null,
    }),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

/** Return the checked-in root directory for a named project fixture. */
export function getFixtureRoot(name: string): string {
  return join(FIXTURE_ROOT, name);
}

/** Return the manifest file path for a named project fixture. */
export function getFixtureManifestPath(name: string): string {
  return join(getFixtureRoot(name), 'fixture.json');
}

/** Return the source directory that owns a fixture manifest. */
export function getFixtureSourceDir(name: string): string {
  return dirname(getFixtureManifestPath(name));
}
