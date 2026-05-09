/**
 * Deterministic skill-quality scoring engine.
 *
 * Scores one artifact (skill or reference) across structural metrics
 * without executing agent prompts. Produces a recommendation:
 * keep-skill, split-skill, merge-or-demote, reference-playbook, retire,
 * or needs-human-review.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ArtifactKind = "skill" | "shared-reference";
type ArtifactSource = "workflow" | "installed" | "shared-reference";
type Recommendation =
  | "keep-skill"
  | "split-skill"
  | "merge-or-demote"
  | "reference-playbook"
  | "retire"
  | "needs-human-review";
type MetricSeverity = "ok" | "warn" | "fail";

export interface ArtifactEntry {
  id: string;
  name: string;
  path: string;
  kind: ArtifactKind;
  source: ArtifactSource;
}

interface MetricResult {
  metric: string;
  label: string;
  score: number;
  maxScore: number;
  severity: MetricSeverity;
  detail: string;
}

export interface SkillQualityReport {
  artifact: ArtifactEntry;
  totalScore: number;
  maxTotalScore: number;
  recommendation: Recommendation;
  metrics: MetricResult[];
  fitNotes: string[];
}

// ---------------------------------------------------------------------------
// Artifact Inventory
// ---------------------------------------------------------------------------

// eslint-disable-next-line complexity -- inventory walks three artifact roots with structural filters; splitting per-root would obscure the unified ID dedupe
export function discoverArtifacts(projectRoot: string): ArtifactEntry[] {
  const artifacts: ArtifactEntry[] = [];

  const skillsDir = join(projectRoot, ".claude/skills");
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFile = join(skillsDir, entry.name, "SKILL.md");
      if (!existsSync(skillFile)) continue;
      artifacts.push({
        id: `skill:${entry.name}`,
        name: entry.name,
        path: relative(projectRoot, skillFile),
        kind: "skill",
        source: "installed",
      });
    }
  }

  const refDir = join(projectRoot, ".goat-flow/skill-reference");
  if (existsSync(refDir)) {
    for (const entry of readdirSync(refDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      if (entry.name === "README.md") continue;
      const name = entry.name.replace(/\.md$/, "");
      artifacts.push({
        id: `reference:${name}`,
        name,
        path: relative(projectRoot, join(refDir, entry.name)),
        kind: "shared-reference",
        source: "shared-reference",
      });
    }
  }

  const workflowSkillsDir = join(projectRoot, "workflow/skills");
  if (existsSync(workflowSkillsDir)) {
    for (const entry of readdirSync(workflowSkillsDir, {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) continue;
      const skillFile = join(workflowSkillsDir, entry.name, "SKILL.md");
      if (!existsSync(skillFile)) continue;
      const installedId = `skill:${entry.name}`;
      if (artifacts.some((a) => a.id === installedId)) continue;
      artifacts.push({
        id: installedId,
        name: entry.name,
        path: relative(projectRoot, skillFile),
        kind: "skill",
        source: "workflow",
      });
    }
  }

  return artifacts;
}

export function findArtifact(
  projectRoot: string,
  artifactId: string,
): ArtifactEntry | null {
  return (
    discoverArtifacts(projectRoot).find((a) => a.id === artifactId) ?? null
  );
}

// ---------------------------------------------------------------------------
// Content helpers
// ---------------------------------------------------------------------------

function readArtifactContent(
  projectRoot: string,
  artifact: ArtifactEntry,
): string {
  const fullPath = join(projectRoot, artifact.path);
  if (!existsSync(fullPath)) return "";
  return readFileSync(fullPath, "utf-8");
}

function countHeadings(content: string, level: number): number {
  const prefix = "#".repeat(level) + " ";
  return content.split("\n").filter((l) => l.startsWith(prefix)).length;
}

function hasSection(content: string, pattern: RegExp): boolean {
  return pattern.test(content);
}

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

function countSubReferences(
  projectRoot: string,
  artifact: ArtifactEntry,
): number {
  const dir = join(projectRoot, artifact.path, "..");
  const artifactDir = join(dir, artifact.name);
  if (!existsSync(artifactDir) || !statSync(artifactDir).isDirectory())
    return 0;
  return readdirSync(artifactDir).filter((f) => f.endsWith(".md")).length;
}

// ---------------------------------------------------------------------------
// Metric scorers
// ---------------------------------------------------------------------------

type MetricScorer = (
  content: string,
  artifact: ArtifactEntry,
  projectRoot: string,
) => MetricResult;

// eslint-disable-next-line complexity -- exhaustive structural signal scoring; each branch maps to one trigger-clarity rule
const triggerClarity: MetricScorer = (content, artifact) => {
  const metric = "trigger-clarity";
  const label = "Trigger Clarity";
  const maxScore = 15;

  let score = 0;
  const notes: string[] = [];

  if (artifact.kind === "skill") {
    const hasFrontmatterDesc =
      /^---[\s\S]*?description:\s*".+"[\s\S]*?---/m.test(content);
    const hasWhenToUse = hasSection(content, /##\s+When to Use/i);
    const hasNotThisSkill = /NOT this skill/i.test(content);

    if (hasFrontmatterDesc) {
      score += 5;
    } else {
      notes.push("missing frontmatter description");
    }
    if (hasWhenToUse) {
      score += 5;
    } else {
      notes.push('missing "When to Use" section');
    }
    if (hasNotThisSkill) {
      score += 5;
    } else {
      notes.push('missing "NOT this skill" exclusion list');
    }
  } else {
    const hasPurpose =
      hasSection(content, /##\s+Purpose/i) ||
      hasSection(content, /##\s+When to (load|use)/i) ||
      /^---[\s\S]*?goat-flow-reference-version/m.test(content);
    if (hasPurpose) score += 10;
    else notes.push("missing purpose or version header");

    const hasAvailCheck = hasSection(content, /Availability Check/i);
    if (hasAvailCheck) score += 5;
    else notes.push("missing Availability Check");
  }

  return {
    metric,
    label,
    score,
    maxScore,
    severity: score >= 10 ? "ok" : score >= 5 ? "warn" : "fail",
    detail: notes.length > 0 ? notes.join("; ") : "clear trigger definition",
  };
};

// eslint-disable-next-line complexity -- exhaustive structural signal scoring; each branch maps to one workflow-completeness rule
const workflowCompleteness: MetricScorer = (content, artifact) => {
  const metric = "workflow-completeness";
  const label = "Workflow Completeness";
  const maxScore = 15;

  let score = 0;
  const notes: string[] = [];

  if (artifact.kind === "skill") {
    const hasStep0 = hasSection(content, /##\s+Step 0/i);
    const phaseCount = countHeadings(content, 2) + countHeadings(content, 3);
    const hasCheckpoint = /CHECKPOINT/i.test(content);

    if (hasStep0) {
      score += 5;
    } else {
      notes.push("missing Step 0 intake");
    }
    if (phaseCount >= 4) {
      score += 5;
    } else {
      notes.push(`only ${phaseCount} sections (expected 4+)`);
    }
    if (hasCheckpoint) {
      score += 5;
    } else {
      notes.push("no CHECKPOINT stops");
    }
  } else {
    const hasWorkflow =
      hasSection(content, /##\s+.*Workflow/i) ||
      hasSection(content, /##\s+Steps/i) ||
      hasSection(content, /###\s+Step\s+\d/i);
    const hasTroubleshooting =
      hasSection(content, /Troubleshoot/i) || hasSection(content, /Fallback/i);
    const sectionCount = countHeadings(content, 2);

    if (hasWorkflow) score += 5;
    else notes.push("no workflow/steps section");
    if (hasTroubleshooting) score += 5;
    else notes.push("no troubleshooting/fallback");
    if (sectionCount >= 3) score += 5;
    else notes.push(`only ${sectionCount} top-level sections`);
  }

  return {
    metric,
    label,
    score,
    maxScore,
    severity: score >= 10 ? "ok" : score >= 5 ? "warn" : "fail",
    detail: notes.length > 0 ? notes.join("; ") : "complete workflow",
  };
};

// eslint-disable-next-line complexity -- exhaustive structural signal scoring; each branch maps to one gate-quality rule
const gateQuality: MetricScorer = (content, artifact) => {
  const metric = "gate-quality";
  const label = "Gate Quality";
  const maxScore = 10;

  let score = 0;
  const notes: string[] = [];

  const hasVerificationGate =
    /verification gate/i.test(content) ||
    /exit criteria/i.test(content) ||
    /\- \[ \]/m.test(content);
  const hasExplicitPass =
    /pass[/ ]fail/i.test(content) || /must confirm/i.test(content);

  if (hasVerificationGate) {
    score += 5;
  } else {
    notes.push("no verification gates or checklists");
  }
  if (hasExplicitPass) {
    score += 5;
  } else if (artifact.kind === "skill") {
    notes.push("no explicit pass/fail criteria");
  } else {
    score += 3;
    if (score < maxScore) notes.push("implicit gate only");
  }

  return {
    metric,
    label,
    score,
    maxScore,
    severity: score >= 8 ? "ok" : score >= 5 ? "warn" : "fail",
    detail: notes.length > 0 ? notes.join("; ") : "strong gates",
  };
};

const evidenceTestability: MetricScorer = (content) => {
  const metric = "evidence-testability";
  const label = "Evidence & Testability";
  const maxScore = 10;

  let score = 0;
  const notes: string[] = [];

  const hasEvidenceTag =
    /OBSERVED|INFERRED/i.test(content) || /evidence[_-]quality/i.test(content);
  const hasProofGate =
    /Proof Gate/i.test(content) || /evidence.*required/i.test(content);
  const hasSemanticAnchors =
    /\(search:\s*"[^"]+"\)/i.test(content) || /search:.*`[^`]+`/i.test(content);

  if (hasEvidenceTag) score += 4;
  else notes.push("no evidence quality tags");
  if (hasProofGate) score += 3;
  else notes.push("no proof gate");
  if (hasSemanticAnchors) score += 3;
  else notes.push("no semantic anchors");

  return {
    metric,
    label,
    score,
    maxScore,
    severity: score >= 7 ? "ok" : score >= 4 ? "warn" : "fail",
    detail: notes.length > 0 ? notes.join("; ") : "strong evidence contract",
  };
};

// eslint-disable-next-line complexity -- exhaustive structural signal scoring; each branch maps to one cold-start rule
const coldStartExecutability: MetricScorer = (content, artifact) => {
  const metric = "cold-start";
  const label = "Cold-Start Executability";
  const maxScore = 10;

  let score = 0;
  const notes: string[] = [];

  if (artifact.kind === "skill") {
    const loadsPreamble =
      /skill-preamble/i.test(content) || /Shared Conventions/i.test(content);
    const hasReadFirst =
      /Read First/i.test(content) || /read.*before/i.test(content);
    const hasContextSetup =
      /context.*setup/i.test(content) || /load.*before/i.test(content);

    if (loadsPreamble) score += 5;
    else notes.push("no preamble/conventions loading");
    if (hasReadFirst || hasContextSetup) score += 5;
    else notes.push("no Read First or context setup");
  } else {
    const hasPurpose =
      hasSection(content, /##\s+Purpose/i) ||
      /^This (reference|playbook|document)/im.test(content);
    const hasPrereqs =
      /prerequisite/i.test(content) ||
      /requires?:/i.test(content) ||
      /Availability Check/i.test(content);

    if (hasPurpose) score += 5;
    else notes.push("no clear purpose statement");
    if (hasPrereqs) score += 5;
    else notes.push("no prerequisites or availability check");
  }

  return {
    metric,
    label,
    score,
    maxScore,
    severity: score >= 8 ? "ok" : score >= 5 ? "warn" : "fail",
    detail: notes.length > 0 ? notes.join("; ") : "good cold-start",
  };
};

const tokenCost: MetricScorer = (content, artifact, projectRoot) => {
  const metric = "token-cost";
  const label = "Token / Load Cost";
  const maxScore = 10;

  const tokens = estimateTokens(content);
  const subRefs = countSubReferences(projectRoot, artifact);
  const notes: string[] = [];

  let score: number;
  if (tokens > 20000) {
    score = 0;
    notes.push(`~${tokens} tokens — very large`);
  } else if (tokens > 10000) {
    score = 3;
    notes.push(`~${tokens} tokens — large`);
  } else if (tokens > 5000) {
    score = 7;
    notes.push(`~${tokens} tokens`);
  } else {
    score = 10;
  }

  if (subRefs > 5) {
    score = Math.max(0, score - 3);
    notes.push(`${subRefs} sub-references loaded`);
  } else if (subRefs > 0) {
    notes.push(`${subRefs} sub-reference(s)`);
  }

  return {
    metric,
    label,
    score,
    maxScore,
    severity: score >= 7 ? "ok" : score >= 3 ? "warn" : "fail",
    detail: notes.length > 0 ? notes.join("; ") : `~${tokens} tokens`,
  };
};

const toolDependencyHandling: MetricScorer = (content) => {
  const metric = "tool-deps";
  const label = "Tool Dependency Handling";
  const maxScore = 10;

  let score = 5;
  const notes: string[] = [];

  const hasAvailCheck = /Availability Check/i.test(content);
  const hasFallback =
    /fallback/i.test(content) || /if.*unavailable/i.test(content);
  const hasToolRef = /browser-use|page-capture|command -v|which\s/i.test(
    content,
  );

  if (hasToolRef) {
    if (hasAvailCheck) score += 3;
    else notes.push("references tools without availability check");
    if (hasFallback) score += 2;
    else notes.push("no fallback for tool dependencies");
  } else {
    score = 10;
  }

  return {
    metric,
    label,
    score,
    maxScore,
    severity: score >= 8 ? "ok" : score >= 5 ? "warn" : "fail",
    detail:
      notes.length > 0
        ? notes.join("; ")
        : hasToolRef
          ? "tools handled"
          : "no external tool dependencies",
  };
};

// eslint-disable-next-line complexity -- exhaustive structural signal scoring; each branch maps to one write-risk rule
const writeRisk: MetricScorer = (content, artifact) => {
  const metric = "write-risk";
  const label = "Write Risk";
  const maxScore = 10;

  let score = 10;
  const notes: string[] = [];

  if (artifact.kind === "skill") {
    const hasModeSystem =
      /Read-Only|File-Write|Plan|Implement/i.test(content) &&
      /mode/i.test(content);
    const hasEscalation =
      /approval/i.test(content) || /ask.*before/i.test(content);

    if (!hasModeSystem) {
      score -= 4;
      notes.push("no read-only vs write mode system");
    }
    if (!hasEscalation) {
      score -= 3;
      notes.push("no escalation gate for writes");
    }
  } else {
    const writesFiles =
      /write|create|modify|edit.*file/i.test(content) &&
      !/read-only/i.test(content);
    if (writesFiles) {
      score -= 2;
      notes.push("reference mentions file writes");
    }
  }

  return {
    metric,
    label,
    score,
    maxScore,
    severity: score >= 8 ? "ok" : score >= 5 ? "warn" : "fail",
    detail: notes.length > 0 ? notes.join("; ") : "controlled write risk",
  };
};

// eslint-disable-next-line complexity -- exhaustive structural signal scoring; each branch maps to one skill-vs-reference fit rule
const skillReferenceFit: MetricScorer = (content, artifact) => {
  const metric = "skill-reference-fit";
  const label = "Skill vs Reference Fit";
  const maxScore = 10;

  const signals = {
    hasFrontmatterName: /^---[\s\S]*?name:\s*".+"[\s\S]*?---/m.test(content),
    hasIntake: hasSection(content, /##\s+Step 0/i),
    hasCheckpoint: /CHECKPOINT/i.test(content),
    hasModes: /Read-Only|File-Write|Plan.*mode|Implement.*mode/i.test(content),
    hasAvailCheck: /Availability Check/i.test(content),
    isToolProtocol:
      /tool.*protocol|observation.*workflow|capture.*workflow/i.test(content),
    hasRefVersion: /goat-flow-reference-version/i.test(content),
    hasSkillVersion: /goat-flow-skill-version/i.test(content),
  };

  const skillSignals = [
    signals.hasFrontmatterName,
    signals.hasIntake,
    signals.hasCheckpoint,
    signals.hasModes,
    signals.hasSkillVersion,
  ].filter(Boolean).length;

  const refSignals = [
    signals.hasAvailCheck,
    signals.isToolProtocol,
    signals.hasRefVersion,
    !signals.hasFrontmatterName,
    !signals.hasIntake,
  ].filter(Boolean).length;

  const notes: string[] = [];
  let score: number;

  if (artifact.kind === "skill") {
    if (skillSignals >= 3) {
      score = 10;
    } else if (skillSignals >= 2) {
      score = 7;
      notes.push("weak skill identity — missing some structural signals");
    } else {
      score = 3;
      notes.push(
        "artifact lacks skill structure — may belong in skill-reference/",
      );
    }
    if (refSignals >= 3) {
      score = Math.max(0, score - 3);
      notes.push("strong reference signals — consider demoting to reference");
    }
  } else {
    if (refSignals >= 3) {
      score = 10;
    } else if (refSignals >= 2) {
      score = 7;
      notes.push("adequate reference identity");
    } else {
      score = 5;
      notes.push("reference lacks typical structural signals");
    }
    if (skillSignals >= 3) {
      score = Math.max(0, score - 3);
      notes.push("strong skill signals — consider promoting to skill");
    }
  }

  return {
    metric,
    label,
    score,
    maxScore,
    severity: score >= 8 ? "ok" : score >= 5 ? "warn" : "fail",
    detail:
      notes.length > 0
        ? notes.join("; ")
        : "good fit for current classification",
  };
};

const ALL_METRICS: MetricScorer[] = [
  triggerClarity,
  workflowCompleteness,
  gateQuality,
  evidenceTestability,
  coldStartExecutability,
  tokenCost,
  toolDependencyHandling,
  writeRisk,
  skillReferenceFit,
];

// ---------------------------------------------------------------------------
// Recommendation engine
// ---------------------------------------------------------------------------

// eslint-disable-next-line complexity -- recommendation tree dispatches over kind × score-band × fit-signal; each branch represents one explicit recommendation rule
function deriveRecommendation(
  artifact: ArtifactEntry,
  metrics: MetricResult[],
  totalScore: number,
  maxTotalScore: number,
): { recommendation: Recommendation; fitNotes: string[] } {
  const fitNotes: string[] = [];
  const pct = maxTotalScore > 0 ? totalScore / maxTotalScore : 0;
  const fitMetric = metrics.find((m) => m.metric === "skill-reference-fit");
  const failCount = metrics.filter((m) => m.severity === "fail").length;

  if (artifact.kind === "skill") {
    if (fitMetric && fitMetric.score <= 3) {
      fitNotes.push(
        "Artifact lacks skill structure. Consider demoting to .goat-flow/skill-reference/.",
      );
      return { recommendation: "reference-playbook", fitNotes };
    }
    if (pct < 0.3) {
      fitNotes.push(
        "Very low quality score. Verify the artifact is still maintained and useful.",
      );
      return { recommendation: "retire", fitNotes };
    }
    if (failCount >= 4) {
      fitNotes.push(
        `${failCount} metrics scored "fail". Manual review recommended.`,
      );
      return { recommendation: "needs-human-review", fitNotes };
    }
    if (pct >= 0.7) {
      fitNotes.push("Strong skill identity with adequate structural quality.");
      return { recommendation: "keep-skill", fitNotes };
    }
    fitNotes.push(
      "Moderate quality. Review metric details for improvement opportunities.",
    );
    return { recommendation: "needs-human-review", fitNotes };
  }

  // shared-reference
  if (fitMetric && fitMetric.detail.includes("consider promoting")) {
    fitNotes.push(
      "Strong skill signals detected. Consider promoting to a first-class goat-* skill.",
    );
    return { recommendation: "needs-human-review", fitNotes };
  }
  if (pct < 0.3) {
    fitNotes.push("Very low quality score for a reference.");
    return { recommendation: "retire", fitNotes };
  }
  fitNotes.push("Fits reference/playbook classification.");
  return { recommendation: "reference-playbook", fitNotes };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function scoreArtifact(
  projectRoot: string,
  artifact: ArtifactEntry,
): SkillQualityReport {
  const content = readArtifactContent(projectRoot, artifact);
  const metrics = ALL_METRICS.map((scorer) =>
    scorer(content, artifact, projectRoot),
  );

  const totalScore = metrics.reduce((sum, m) => sum + m.score, 0);
  const maxTotalScore = metrics.reduce((sum, m) => sum + m.maxScore, 0);
  const { recommendation, fitNotes } = deriveRecommendation(
    artifact,
    metrics,
    totalScore,
    maxTotalScore,
  );

  return {
    artifact,
    totalScore,
    maxTotalScore,
    recommendation,
    metrics,
    fitNotes,
  };
}

export function scoreAllArtifacts(projectRoot: string): SkillQualityReport[] {
  return discoverArtifacts(projectRoot).map((a) =>
    scoreArtifact(projectRoot, a),
  );
}
