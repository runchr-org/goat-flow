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

function readManifest(fixtureDir: string): FixtureManifest {
  const manifestPath = join(fixtureDir, 'fixture.json');
  return JSON.parse(readFileSync(manifestPath, 'utf-8')) as FixtureManifest;
}

function copyFixtureLayer(sourceDir: string, destDir: string): void {
  const manifest = readManifest(sourceDir);
  if (manifest.extends) {
    const baseDir = resolve(sourceDir, manifest.extends);
    copyFixtureLayer(baseDir, destDir);
  }

  cpSync(sourceDir, destDir, {
    recursive: true,
    force: true,
    filter: source => source !== join(sourceDir, 'fixture.json'),
  });
}

export function scanFixture(name: string): ScannedFixture {
  const sourceDir = join(FIXTURE_ROOT, name);
  const manifest = readManifest(sourceDir);
  const root = mkdtempSync(join(tmpdir(), `goat-flow-fixture-${name}-`));

  copyFixtureLayer(sourceDir, root);

  return {
    root,
    manifest,
    report: scanProject(createFS(root), root, { agentFilter: manifest.agentFilter ?? null }),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

export function getFixtureRoot(name: string): string {
  return join(FIXTURE_ROOT, name);
}

export function getFixtureManifestPath(name: string): string {
  return join(getFixtureRoot(name), 'fixture.json');
}

export function getFixtureSourceDir(name: string): string {
  return dirname(getFixtureManifestPath(name));
}
