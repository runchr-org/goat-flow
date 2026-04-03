/**
 * Migrates lessons between the legacy monolithic file and the category-bucket layout.
 * It groups ordinary lessons and reusable patterns into bucket files while preserving their metadata.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { dump, load } from 'js-yaml';

interface MigrationResult {
  fileCount: number;
  files: string[];
  warnings: string[];
}

interface LessonEntry {
  name: string;
  created: string;
  type: 'entry' | 'pattern';
  related: string[];
  body: string;
}

interface ParsedLessonEntry {
  name: string;
  created: string;
  type: 'entry' | 'pattern';
  body: string;
  relatedNames: string[];
}

interface MergedLessonEntry {
  name: string;
  created: string;
  type: 'entry' | 'pattern';
  related: unknown[];
  body: string;
}

/** Trim surrounding blank lines while preserving a trailing newline. */
function trimBody(body: string): string {
  return body.replace(/^\n+/, '').replace(/\s+$/, '') + '\n';
}

/** Parse YAML frontmatter and return the remaining markdown body. */
function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  const frontmatter = match[1] ?? '';
  const parsed = load(frontmatter) as Record<string, unknown> | null;
  return { data: parsed ?? {}, body: match[2] ?? '' };
}

/** Render a YAML frontmatter block with goat-flow's stable formatting. */
function renderFrontmatter(data: Record<string, unknown>): string {
  return `---\n${dump(data, { lineWidth: -1 }).trimEnd()}\n---\n\n`;
}

interface RawLessonBlock {
  heading: string;
  section: 'entries' | 'patterns';
  rawBody: string;
}

/** Split the legacy lessons document into raw entry and pattern blocks. */
function collectLessonBlocks(body: string): RawLessonBlock[] {
  const blocks: RawLessonBlock[] = [];
  let section: 'entries' | 'patterns' = 'entries';
  let heading = '';
  let rawBody: string[] = [];

  /** Push the current in-progress lesson block into the output list. */
  const flush = (): void => {
    if (!heading) return;
    blocks.push({
      heading,
      section,
      rawBody: rawBody.join('\n'),
    });
  };

  for (const line of body.split('\n')) {
    if (/^##\s+Entries\s*$/i.test(line)) {
      flush();
      section = 'entries';
      heading = '';
      rawBody = [];
      continue;
    }

    if (/^##\s+Patterns\s*$/i.test(line)) {
      flush();
      section = 'patterns';
      heading = '';
      rawBody = [];
      continue;
    }

    const headingMatch = line.match(/^###\s+(.+)$/);
    if (headingMatch) {
      flush();
      heading = headingMatch[1]?.trim() ?? '';
      rawBody = [];
      continue;
    }

    if (heading) rawBody.push(line);
  }

  flush();
  return blocks;
}

/** Extract lesson metadata. */
function extractLessonMetadata(
  rawBody: string,
): Pick<ParsedLessonEntry, 'created' | 'body' | 'relatedNames'> {
  const createdMatch =
    rawBody.match(/^\*\*created_at:\*\*\s*(.+)\n?/im) ??
    rawBody.match(/^created_at:\s*(.+)\n?/im);
  const relatedMatch = rawBody.match(/^_Entries:\s*(.+)_\n?/m);
  const relatedNames = relatedMatch?.[1]
    ? Array.from(relatedMatch[1].matchAll(/"([^"]+)"/g))
        .map((match) => match[1] ?? '')
        .filter(Boolean)
    : [];
  const body = rawBody
    .replace(/^\*\*created_at:\*\*.+\n?/im, '')
    .replace(/^created_at:\s*.+\n?/im, '')
    .replace(/^_Entries:\s*.+_\n?/m, '')
    .replace(/\n{3,}/g, '\n\n');

  return {
    created: createdMatch?.[1]?.trim() ?? '',
    body: trimBody(body),
    relatedNames,
  };
}

/** Parse one legacy lesson block into normalized lesson metadata. */
function parseLessonBlock(
  block: RawLessonBlock,
  warnings: string[],
): ParsedLessonEntry | null {
  const heading = block.heading.trim();
  if (!heading) return null;

  const isPattern =
    block.section === 'patterns' || heading.startsWith('Pattern:');
  const name = isPattern ? heading.replace(/^Pattern:\s*/, '').trim() : heading;
  const metadata = extractLessonMetadata(block.rawBody);

  if (!metadata.created)
    warnings.push(`Lesson "${name}" has no created_at date`);
  if (!metadata.body.trim())
    warnings.push(`Lesson "${name}" has empty body after metadata extraction`);

  return {
    name,
    created: metadata.created,
    type: isPattern ? 'pattern' : 'entry',
    body: metadata.body,
    relatedNames: metadata.relatedNames,
  };
}

/** Split a monolithic lessons document into its preamble and normalized entries. */
function parseLessons(
  content: string,
  warnings: string[],
): { preamble: string; entries: LessonEntry[] } {
  const entriesIndex = content.search(/^## Entries\s*$/m);
  const preamble = entriesIndex >= 0 ? content.slice(0, entriesIndex) : content;
  if (entriesIndex < 0) return { preamble, entries: [] };

  const body = content.slice(entriesIndex);
  const entries = collectLessonBlocks(body)
    .map((block) => parseLessonBlock(block, warnings))
    .filter((entry): entry is ParsedLessonEntry => entry !== null)
    .map((entry) => ({
      name: entry.name,
      created: entry.created,
      type: entry.type,
      related: entry.relatedNames,
      body: entry.body,
    }));

  return { preamble, entries };
}

/** Render one lesson or pattern entry for a category bucket file. */
function buildLessonBucketEntry(entry: LessonEntry): string {
  const heading =
    entry.type === 'pattern'
      ? `## Pattern: ${entry.name}`
      : `## Lesson: ${entry.name}`;
  const lines = [heading, `**Created:** ${entry.created}`];
  if (entry.type === 'pattern' && entry.related.length > 0) {
    lines.push(
      `_Entries: ${entry.related.map((name) => `"${name}"`).join(', ')}_`,
    );
  }
  lines.push('');
  lines.push(entry.body.trimEnd());
  return lines.join('\n');
}

/** Render a category bucket file for one or more lessons. */
function renderLessonBucket(entries: LessonEntry[], category: string): string {
  const sections = entries.map(buildLessonBucketEntry);
  return renderFrontmatter({ category }) + sections.join('\n\n') + '\n';
}

/** Convert a monolithic lessons file into the category-bucket directory layout. */
export function splitLessons(
  inputPath: string,
  outputDir: string,
): MigrationResult {
  const content = readFileSync(inputPath, 'utf8');
  const warnings: string[] = [];
  const { preamble, entries } = parseLessons(content, warnings);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'README.md'), preamble.trimEnd() + '\n');

  const files = ['README.md'];
  const normalEntries = entries.filter((entry) => entry.type === 'entry');
  const patternEntries = entries.filter((entry) => entry.type === 'pattern');

  if (normalEntries.length > 0) {
    writeFileSync(
      join(outputDir, 'general.md'),
      renderLessonBucket(normalEntries, 'general'),
    );
    files.push('general.md');
  }

  if (patternEntries.length > 0) {
    writeFileSync(
      join(outputDir, 'patterns.md'),
      renderLessonBucket(patternEntries, 'patterns'),
    );
    files.push('patterns.md');
  }

  return { fileCount: entries.length, files, warnings };
}

/** List markdown files in stable alphabetical order. */
function listMarkdownFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));
}

/** Read the bucket README preamble, or fall back to the default heading. */
function readLessonsPreamble(inputDir: string, files: string[]): string {
  return files.includes('README.md')
    ? readFileSync(join(inputDir, 'README.md'), 'utf8').trimEnd()
    : '# Lessons';
}

/** Map lesson file names back to their declared lesson names. */
function buildLessonNameIndex(
  inputDir: string,
  entryFiles: string[],
): Map<string, string> {
  const entryNameByFile = new Map<string, string>();

  for (const file of entryFiles) {
    const { data } = parseFrontmatter(
      readFileSync(join(inputDir, file), 'utf8'),
    );
    if (typeof data.name === 'string') entryNameByFile.set(file, data.name);
  }

  return entryNameByFile;
}

/** Split a lesson bucket file into per-entry sections. */
function splitBucketLessonSections(
  body: string,
): Array<{ type: 'entry' | 'pattern'; name: string; body: string }> {
  const matches = Array.from(
    body.matchAll(/^##\s+(Lesson|Pattern):\s+(.+)$/gm),
  );
  const sections: Array<{
    type: 'entry' | 'pattern';
    name: string;
    body: string;
  }> = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (match === undefined || match.index === undefined) continue;
    const type = match[1] === 'Pattern' ? 'pattern' : 'entry';
    const name = (match[2] ?? '').trim();
    const start = match.index + match[0].length;
    const end = matches[i + 1]?.index ?? body.length;
    sections.push({
      type,
      name,
      body: body.slice(start, end).replace(/^\n+/, '').trimEnd(),
    });
  }

  return sections;
}

/** Extract inline metadata fields from a bucket lesson section. */
function parseBucketLessonMetadata(rawBody: string): MergedLessonEntry {
  const createdMatch =
    rawBody.match(/^\*\*Created:\*\*\s*(.+)\n?/im) ??
    rawBody.match(/^\*\*created_at:\*\*\s*(.+)\n?/im);
  const relatedMatch = rawBody.match(/^_Entries:\s*(.+)_\n?/m);
  const related = relatedMatch?.[1]
    ? Array.from(relatedMatch[1].matchAll(/"([^"]+)"/g))
        .map((match) => match[1] ?? '')
        .filter(Boolean)
    : [];
  const body = rawBody
    .replace(/^\*\*Created:\*\*.+\n?/im, '')
    .replace(/^\*\*created_at:\*\*.+\n?/im, '')
    .replace(/^_Entries:\s*.+_\n?/m, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();

  return {
    name: '',
    created: createdMatch?.[1]?.trim() ?? '',
    type: 'entry',
    related,
    body,
  };
}

/** Read normalized entries from either a bucket file or a legacy single-entry file. */
function readMergedLessonEntries(
  inputDir: string,
  file: string,
): MergedLessonEntry[] {
  const { data, body } = parseFrontmatter(
    readFileSync(join(inputDir, file), 'utf8'),
  );
  if (
    typeof data.category === 'string' &&
    /^##\s+(Lesson|Pattern):\s+/m.test(body)
  ) {
    return splitBucketLessonSections(body).map((section) => {
      const metadata = parseBucketLessonMetadata(section.body);
      return {
        ...metadata,
        name: section.name,
        type: section.type,
      };
    });
  }

  return [
    {
      name: typeof data.name === 'string' ? data.name : basename(file, '.md'),
      created: typeof data.created === 'string' ? data.created : '',
      type: data.type === 'pattern' ? 'pattern' : 'entry',
      related: Array.isArray(data.related) ? data.related : [],
      body: body.trimEnd(),
    },
  ];
}

/** Resolve related lesson file names back to human-readable lesson names. */
function mapRelatedLessonNames(
  related: unknown[],
  entryNameByFile: Map<string, string>,
): string[] {
  return related
    .map((item) =>
      typeof item === 'string' ? (entryNameByFile.get(item) ?? item) : '',
    )
    .filter(Boolean)
    .map((item) => `"${item}"`);
}

/** Render one merged lesson back into the legacy monolithic document shape. */
function buildMergedLessonSection(
  entry: MergedLessonEntry,
  entryNameByFile: Map<string, string>,
  warnings: string[],
): { section: string; type: MergedLessonEntry['type'] } {
  const lines: string[] = [
    `### ${entry.type === 'pattern' ? `Pattern: ${entry.name}` : entry.name}`,
  ];
  const relatedNames =
    entry.type === 'pattern'
      ? mapRelatedLessonNames(entry.related, entryNameByFile)
      : [];

  if (relatedNames.length > 0) {
    lines.push(`_Entries: ${relatedNames.join(', ')}_`);
    lines.push('');
  }
  lines.push(entry.body);
  if (entry.created) {
    lines.push('');
    lines.push(`**created_at:** ${entry.created}`);
  } else {
    warnings.push(`Lesson "${entry.name}" has no created date`);
  }

  return { section: lines.join('\n'), type: entry.type };
}

/** Merge bucketed lesson files back into the legacy monolithic document. */
export function mergeLessons(
  inputDir: string,
  outputPath: string,
): MigrationResult {
  const files = listMarkdownFiles(inputDir);
  const preamble = readLessonsPreamble(inputDir, files);
  const entryFiles = files.filter((file) => file !== 'README.md');
  const entrySections: string[] = [];
  const patternSections: string[] = [];
  const warnings: string[] = [];
  const entryNameByFile = buildLessonNameIndex(inputDir, entryFiles);
  let entryCount = 0;

  for (const file of entryFiles) {
    const entries = readMergedLessonEntries(inputDir, file);
    entryCount += entries.length;
    for (const entry of entries) {
      const section = buildMergedLessonSection(
        entry,
        entryNameByFile,
        warnings,
      );
      if (section.type === 'pattern') patternSections.push(section.section);
      else entrySections.push(section.section);
    }
  }

  const parts = [preamble, '## Entries', ...entrySections];
  if (patternSections.length > 0) {
    parts.push('## Patterns', ...patternSections);
  }
  writeFileSync(outputPath, parts.filter(Boolean).join('\n\n') + '\n');
  return { fileCount: entryCount, files, warnings };
}
