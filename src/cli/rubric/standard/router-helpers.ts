/**
 * Router Table check helpers.
 */
import type { FactContext, CheckResult } from '../../types.js';

function extractRouterSection(content: string | null): string | null {
  if (content === null) return null;
  const lines = content.split('\n');
  const section: string[] = [];
  let inRouterSection = false;

  for (const line of lines) {
    if (/^##\s+router(?:\s+table)?\s*$/i.test(line)) {
      inRouterSection = true;
      section.push(line);
      continue;
    }

    if (inRouterSection && /^##\s+/.test(line)) break;
    if (inRouterSection) section.push(line);
  }

  return section.length > 0 ? section.join('\n') : null;
}

/** Normalize a router path reference into a comparable local path, or drop non-path refs. */
function normalizeRouterReference(path: string): string | null {
  const trimmed = path.trim();
  if (trimmed.length === 0 || trimmed.startsWith('http')) return null;
  return trimmed.replace(/\/+$/, '');
}

/** Extract every local path reference from the Router Table section. */
function extractRouterReferences(content: string | null): string[] {
  const section = extractRouterSection(content);
  if (section === null) return [];

  const refs: string[] = [];
  for (const match of section.matchAll(/`([^`]+)`/g)) {
    const candidate = match[1];
    if (candidate === undefined) continue;
    const normalized = normalizeRouterReference(candidate);
    if (normalized !== null && refs.includes(normalized) === false) {
      refs.push(normalized);
    }
  }

  for (const match of section.matchAll(/\]\(([^)]+)\)/g)) {
    const candidate = match[1];
    if (candidate === undefined) continue;
    const normalized = normalizeRouterReference(candidate);
    if (normalized !== null && refs.includes(normalized) === false) {
      refs.push(normalized);
    }
  }

  return refs;
}

/** Extract every skills-path reference from the Router Table section. */
function extractRouterSkillsReferences(content: string | null): string[] {
  return extractRouterReferences(content).filter((path) =>
    /\/skills(?:\/|$)/.test(path),
  );
}

/** Return whether the Router Table explicitly references one required repo path. */
function routerReferencesPath(content: string | null, expectedPath: string): boolean {
  const normalizedExpected = normalizeRouterReference(expectedPath);
  if (normalizedExpected === null) return false;
  return extractRouterReferences(content).includes(normalizedExpected);
}

/** Build a router completeness check result for one required literal path. */
export function getRequiredRouterPathCheckResult(
  id: string,
  name: string,
  expectedPath: string,
  missingWhy: string,
  ctx: FactContext,
): CheckResult {
  const hasReference = routerReferencesPath(
    ctx.agentFacts.instruction.content,
    expectedPath,
  );
  return {
    id,
    name,
    tier: 'standard',
    category: 'Router Table',
    status: hasReference ? 'pass' : 'fail',
    points: hasReference ? 1 : 0,
    maxPoints: 1,
    confidence: 'high',
    message: hasReference
      ? `Router references ${expectedPath}`
      : `Router does not reference ${expectedPath}. ${missingWhy}`,
  };
}

/** Score whether the Router Table points at the full skills directory instead of the buggy `goat-*` glob. */
export function getRouterSkillsCheckResult(ctx: FactContext): CheckResult {
  const expectedDir = ctx.agentFacts.agent.skillsDir.replace(/\/+$/, '');
  const actualRefs = extractRouterSkillsReferences(
    ctx.agentFacts.instruction.content,
  );
  const legacyGlob = `${expectedDir}/goat-*`;

  if (actualRefs.includes(expectedDir)) {
    return {
      id: '2.4.3',
      name: 'Skills referenced in router',
      tier: 'standard',
      category: 'Router Table',
      status: 'pass',
      points: 1,
      maxPoints: 1,
      confidence: 'high',
      message: `Router points at ${expectedDir}/, covering both the \`goat/\` dispatcher and the 5 \`goat-*\` skills.`,
    };
  }

  if (actualRefs.includes(legacyGlob)) {
    return {
      id: '2.4.3',
      name: 'Skills referenced in router',
      tier: 'standard',
      category: 'Router Table',
      status: 'fail',
      points: 0,
      maxPoints: 1,
      confidence: 'high',
      message: `Router points at ${legacyGlob}/, which misses the \`goat/\` dispatcher. Route the skills root ${expectedDir}/ instead so the router matches the real layout.`,
      evidence: legacyGlob,
    };
  }

  if (actualRefs.length === 0) {
    return {
      id: '2.4.3',
      name: 'Skills referenced in router',
      tier: 'standard',
      category: 'Router Table',
      status: 'fail',
      points: 0,
      maxPoints: 1,
      confidence: 'high',
      message: `No skills directory path found in the Router Table. Add ${expectedDir}/ so agents can find the dispatcher and the 5 goat-* skills.`,
    };
  }

  return {
    id: '2.4.3',
    name: 'Skills referenced in router',
    tier: 'standard',
    category: 'Router Table',
    status: 'fail',
    points: 0,
    maxPoints: 1,
    confidence: 'high',
    message: `Router references skill paths ${actualRefs.join(', ')}, but the canonical entry for this agent is ${expectedDir}/.`,
    evidence: actualRefs.join(', '),
  };
}
