/**
 * Eval fact extraction - analyzes eval markdown files for frontmatter, skill coverage, and content quality.
 */
import type { SharedFacts, ReadonlyFS } from '../../types.js';

/** Analysis results for a single eval markdown file. */
interface EvalFileAnalysis {
  hasOrigin: boolean;
  hasAgents: boolean;
  hasReplay: boolean;
  hasFrontmatter: boolean;
  hasRealContent: boolean;
  skillNames: string[];
}

/** Running aggregate of analysis results across multiple eval files. */
interface EvalAggregate {
  allHaveOrigin: boolean;
  allHaveAgents: boolean;
  allHaveReplay: boolean;
  allHaveFrontmatter: boolean;
  realContentCount: number;
  skillNames: Set<string>;
}

/** Skill names that should each have at least one eval covering them. */
const CANONICAL_EVAL_SKILLS = [
  'goat',
  'goat-debug',
  'goat-review',
  'goat-plan',
  'goat-security',
  'goat-test',
];
/** Set view of canonical eval skills for O(1) membership checks. */
const CANONICAL_EVAL_SKILL_SET = new Set(CANONICAL_EVAL_SKILLS);

/** List eval markdown files, excluding directory metadata documents. */
function listEvalFiles(fs: ReadonlyFS, evalsPath: string): string[] {
  if (!fs.exists(evalsPath)) return [];
  return fs
    .listDir(evalsPath)
    .filter(
      (file) =>
        file.endsWith('.md') && file !== 'README.md' && file !== 'FORMAT.md',
    );
}

/** Build the empty eval-facts result used when no eval files are present. */
function createEmptyEvalFacts(
  dirExists: boolean,
  count: number,
  hasReadme: boolean,
  evalsPath: string,
): SharedFacts['evals'] {
  return {
    dirExists,
    count,
    hasReadme,
    hasOriginLabels: false,
    hasAgentsLabels: false,
    hasReplayPrompts: false,
    hasRealContent: false,
    hasFrontmatter: false,
    evalSkillCount: 0,
    missingSkills: [],
    path: evalsPath,
  };
}

/** Collect canonical skill names referenced inside one eval file. */
function collectEvalSkillNames(content: string): string[] {
  const skillNames = new Set<string>();
  const skillMatches = content.matchAll(
    /\*\*Skill:\*\*\s*(.+)|skill:\s*(.+)/gi,
  );

  for (const match of skillMatches) {
    const name = (match[1] ?? match[2] ?? '').trim().toLowerCase();
    if (name && CANONICAL_EVAL_SKILL_SET.has(name)) skillNames.add(name);
  }

  return Array.from(skillNames);
}

/** Count an eval as real only when its scenario section has substantive non-placeholder text. */
function hasEvalRealContent(content: string): boolean {
  const scenarioMatch = content.match(
    /##+ (?:Replay Prompt|Scenario)\s*\n([\s\S]*?)(?=\n##|\n---|$)/i,
  );
  const scenarioBody = scenarioMatch?.[1]?.trim() ?? '';
  return scenarioBody.length >= 100 && !/^(?:TODO|TBD)/i.test(scenarioBody);
}

/** Analyze one eval file for labels, frontmatter, replay prompts, and skill coverage. */
function analyzeEvalFile(
  fs: ReadonlyFS,
  evalsPath: string,
  fileName: string,
): EvalFileAnalysis {
  const content = fs.readFile(`${evalsPath}/${fileName}`);
  if (content === null) {
    return {
      hasOrigin: false,
      hasAgents: false,
      hasReplay: false,
      hasFrontmatter: false,
      hasRealContent: false,
      skillNames: [],
    };
  }

  return {
    hasOrigin:
      /\*\*Origin:\*\*/i.test(content) ||
      /^## Origin/im.test(content) ||
      /^origin:/im.test(content),
    hasAgents: /\*\*Agents:\*\*/i.test(content) || /^agents:/im.test(content),
    hasReplay:
      /##+ Replay Prompt/i.test(content) || /##+ Scenario/i.test(content),
    hasFrontmatter: /^---\n/.test(content),
    hasRealContent: hasEvalRealContent(content),
    skillNames: collectEvalSkillNames(content),
  };
}

/** Create the accumulator used while analyzing multiple eval files. */
function createEvalAggregate(): EvalAggregate {
  return {
    allHaveOrigin: true,
    allHaveAgents: true,
    allHaveReplay: true,
    allHaveFrontmatter: true,
    realContentCount: 0,
    skillNames: new Set<string>(),
  };
}

/** Merge one eval-file analysis result into the running aggregate. */
function mergeEvalAnalysis(
  aggregate: EvalAggregate,
  analysis: EvalFileAnalysis,
): void {
  aggregate.allHaveOrigin &&= analysis.hasOrigin;
  aggregate.allHaveAgents &&= analysis.hasAgents;
  aggregate.allHaveReplay &&= analysis.hasReplay;
  aggregate.allHaveFrontmatter &&= analysis.hasFrontmatter;
  if (analysis.hasRealContent) aggregate.realContentCount++;
  for (const skillName of analysis.skillNames) {
    aggregate.skillNames.add(skillName);
  }
}

/** Extract eval facts: directory, file count, replay prompts, origin labels, skill coverage. */
export function extractEvalFacts(
  fs: ReadonlyFS,
  rawEvalsPath: string,
): SharedFacts['evals'] {
  const evalsPath = rawEvalsPath.replace(/\/$/, '');
  const dirExists = fs.exists(evalsPath);
  const evalFiles = listEvalFiles(fs, evalsPath);
  const count = evalFiles.length;
  const hasReadme = dirExists && fs.exists(`${evalsPath}/README.md`);

  if (count === 0)
    return createEmptyEvalFacts(dirExists, count, hasReadme, evalsPath);

  const aggregate = createEvalAggregate();
  for (const fileName of evalFiles) {
    mergeEvalAnalysis(aggregate, analyzeEvalFile(fs, evalsPath, fileName));
  }

  return {
    dirExists,
    count,
    hasReadme,
    hasOriginLabels: aggregate.allHaveOrigin,
    hasAgentsLabels: aggregate.allHaveAgents,
    hasReplayPrompts: aggregate.allHaveReplay,
    hasRealContent: aggregate.realContentCount >= Math.ceil(count * 0.6),
    hasFrontmatter: aggregate.allHaveFrontmatter,
    evalSkillCount: aggregate.skillNames.size,
    missingSkills: CANONICAL_EVAL_SKILLS.filter(
      (skill) => !aggregate.skillNames.has(skill),
    ).sort(),
    path: evalsPath,
  };
}
