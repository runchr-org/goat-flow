/**
 * Top-level orchestration of the skill-quality scoring pipeline. Wires the stages together -
 * classify the artifact, detect its semantic shape, compose its scoring surface, run every metric,
 * then derive a recommendation - and returns the assembled SkillQualityReport.
 *
 * Three entry points sit at different I/O levels: `scoreContent` is pure (content passed in, no
 * disk read) for uploads and pastes; `scoreArtifact` reads one artifact from disk first; and
 * `scoreAllArtifacts` walks the inventory and scores everything. Keep `scoreContent` the shared
 * core so disk-backed and in-memory scoring stay identical.
 */
import {
  loadQualityConfig,
  profileMaxForSubtype,
  type QualityConfig,
} from "./quality-config.js";
import {
  composeArtifactContent,
  discoverArtifacts,
  readArtifactContent,
} from "./skill-quality-content.js";
import {
  classifyArtifact,
  detectArtifactShape,
} from "./skill-quality-classification.js";
import { ALL_METRICS } from "./skill-quality-metrics.js";
import { deriveRecommendation } from "./skill-quality-recommendation.js";
import type {
  ArtifactEntry,
  ComposeOptions,
  MetricInput,
  SkillQualityReport,
} from "./skill-quality-types.js";

/**
 * Score raw content against the rubric without reading any file from disk.
 * Used by both `scoreArtifact` (which reads first) and `evaluateContent`
 * (which gets content from an upload or paste).
 *
 * @param projectRoot - absolute project root; used for path-relative composition, not as a read key.
 * @param artifact - inventory record being scored; its kind/path drive classification and composition.
 * @param rawContent - the artifact text to score; supplied by the caller, never re-read here.
 * @param config - resolved quality config providing subtype profiles, caps, and composition sources.
 * @param preReadNotes - notes from an earlier disk read (e.g. truncation) prepended to `fitNotes`.
 * @param options - composition toggles; pass `scanDisk: false` for uploads so sibling files are not read.
 * @returns the full report - score, capped metric rows, classification, shape, and recommendation;
 *   `shapeMismatch` true means the content shape differs from the scored subtype and needs review.
 */
export function scoreContent(
  projectRoot: string,
  artifact: ArtifactEntry,
  rawContent: string,
  config: QualityConfig,
  preReadNotes: string[] = [],
  options: ComposeOptions = {},
): SkillQualityReport {
  const classification = classifyArtifact(artifact, rawContent, config);
  const subtype = classification.detectedSubtype;
  const shape = detectArtifactShape(artifact, rawContent);
  const profileMax = profileMaxForSubtype(config, subtype);
  const composed = composeArtifactContent(
    projectRoot,
    artifact,
    rawContent,
    config,
    options,
  );
  const metricInput: MetricInput = {
    rawContent: composed.raw,
    composedContent: composed.composed,
    artifact,
    subtype,
    profileMax,
    projectRoot,
    config,
  };
  const metrics = ALL_METRICS.map((scorer) => scorer(metricInput));

  const totalScore = metrics.reduce((sum, m) => sum + m.score, 0);
  const maxTotalScore = metrics.reduce((sum, m) => sum + m.maxScore, 0);
  const { recommendation, fitNotes } = deriveRecommendation(
    artifact,
    metrics,
    totalScore,
    maxTotalScore,
    classification,
    shape,
  );

  return {
    artifact,
    totalScore,
    maxTotalScore,
    profileMax,
    subtype,
    detectedShape: shape.detectedShape,
    shapeConfidence: shape.confidence,
    shapeMismatch: shape.detectedShape !== subtype,
    classification,
    recommendation,
    metrics,
    composedFrom: composed.sources,
    fitNotes: [...preReadNotes, ...composed.notes, ...fitNotes],
  };
}

export function scoreArtifact(
  projectRoot: string,
  artifact: ArtifactEntry,
  config: QualityConfig = loadQualityConfig(projectRoot),
): SkillQualityReport {
  const raw = readArtifactContent(projectRoot, artifact, config);
  return scoreContent(projectRoot, artifact, raw.content, config, raw.notes);
}

export function scoreAllArtifacts(
  projectRoot: string,
  config: QualityConfig = loadQualityConfig(projectRoot),
): SkillQualityReport[] {
  return discoverArtifacts(projectRoot, config).map((a) =>
    scoreArtifact(projectRoot, a, config),
  );
}
