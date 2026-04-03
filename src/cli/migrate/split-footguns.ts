/**
 * Migrates footguns between the legacy monolithic file and the category-bucket layout.
 * It preserves entry metadata while normalizing bucket structure for repo-owned footgun docs.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { dump, load } from 'js-yaml';

interface MigrationResult {
  fileCount: number;
  files: string[];
  warnings: string[];
}

interface FootgunEntry {
  name: string;
  evidenceType: string;
  status: string;
  created: string;
  body: string;
}

interface ParsedFootgunMetadata {
  evidenceType: string;
  status: string;
  created: string;
  body: string;
}

interface MergedFootgunEntry {
  name: string;
  created: string;
  evidenceType: string;
  status: string;
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

/** Extract inline metadata fields from a legacy footgun body. */
function parseFootgunMetadata(body: string): ParsedFootgunMetadata {
  const evidenceMatch = body.match(/^\*\*Evidence type:\*\*\s*(.+)\n?/m);
  const statusMatch = body.match(/^\*\*Status:\*\*\s*(.+)\n?/m);
  const createdMatch = body.match(/^\*\*Created:\*\*\s*(.+)\n?/m);
  const cleanedBody = body
    .replace(/^\*\*Evidence type:\*\*.+\n?/m, '')
    .replace(/^\*\*Status:\*\*.+\n?/m, '')
    .replace(/^\*\*Created:\*\*.+\n?/m, '')
    .replace(/\n{3,}/g, '\n\n');

  return {
    evidenceType: evidenceMatch?.[1]?.trim() ?? '',
    status: statusMatch?.[1]?.trim() ?? 'active',
    created: createdMatch?.[1]?.trim() ?? '',
    body: trimBody(cleanedBody),
  };
}

/** Normalize footgun status. */
function normalizeFootgunStatus(status: string): string {
  return status.toLowerCase().startsWith('resolved') ? 'resolved' : 'active';
}

/** Parse one legacy `## Footgun:` section into normalized entry data. */
function parseRawFootgunEntry(
  rawEntry: string,
  warnings: string[],
): FootgunEntry {
  const newline = rawEntry.indexOf('\n');
  const name = (newline >= 0 ? rawEntry.slice(0, newline) : rawEntry).trim();
  const rawBody = newline >= 0 ? rawEntry.slice(newline + 1) : '';
  const metadata = parseFootgunMetadata(rawBody);

  if (!metadata.created) warnings.push(`Footgun "${name}" has no Created date`);
  if (!metadata.body.trim())
    warnings.push(`Footgun "${name}" has empty body after metadata extraction`);

  return {
    name,
    evidenceType: metadata.evidenceType,
    status: normalizeFootgunStatus(metadata.status),
    created: metadata.created,
    body: metadata.body,
  };
}

/** Split a monolithic footguns document into its preamble and entry list. */
function parseFootgunEntries(
  content: string,
  warnings: string[],
): { preamble: string; entries: FootgunEntry[] } {
  const firstIndex = content.search(/^## Footgun:\s+/m);
  const preamble = firstIndex >= 0 ? content.slice(0, firstIndex) : content;
  if (firstIndex < 0) return { preamble, entries: [] };

  const rawEntries = content
    .slice(firstIndex)
    .split(/^## Footgun:\s+/m)
    .filter(Boolean);
  const entries = rawEntries.map((rawEntry) =>
    parseRawFootgunEntry(rawEntry, warnings),
  );
  return { preamble, entries };
}

/** Render one normalized footgun entry for a category bucket file. */
function buildBucketEntry(entry: FootgunEntry): string {
  const lines = [
    `## Footgun: ${entry.name}`,
    `**Status:** ${entry.status}`,
    `**Created:** ${entry.created}`,
  ];
  if (entry.evidenceType)
    lines.push(`**Evidence type:** ${entry.evidenceType}`);
  lines.push('');
  lines.push(entry.body.trimEnd());
  return lines.join('\n');
}

/** Render a category bucket file for one or more footgun entries. */
function renderFootgunBucket(
  entries: FootgunEntry[],
  category: string,
): string {
  const sections = entries.map(buildBucketEntry);
  return renderFrontmatter({ category }) + sections.join('\n\n') + '\n';
}

/** Convert a monolithic footguns file into the category-bucket directory layout. */
export function splitFootguns(
  inputPath: string,
  outputDir: string,
): MigrationResult {
  const content = readFileSync(inputPath, 'utf8');
  const warnings: string[] = [];
  const { preamble, entries } = parseFootgunEntries(content, warnings);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'README.md'), preamble.trimEnd() + '\n');

  const files = ['README.md'];
  if (entries.length > 0) {
    writeFileSync(
      join(outputDir, 'general.md'),
      renderFootgunBucket(entries, 'general'),
    );
    files.push('general.md');
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
function readFootgunPreamble(inputDir: string, files: string[]): string {
  return files.includes('README.md')
    ? readFileSync(join(inputDir, 'README.md'), 'utf8').trimEnd()
    : '# Footguns';
}

/** Split a bucket file body into per-footgun sections. */
function splitBucketSections(
  body: string,
): Array<{ name: string; body: string }> {
  const matches = Array.from(body.matchAll(/^## Footgun:\s+(.+)$/gm));
  const sections: Array<{ name: string; body: string }> = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (match === undefined || match.index === undefined) continue;
    const name = (match[1] ?? '').trim();
    const start = match.index + match[0].length;
    const end = matches[i + 1]?.index ?? body.length;
    sections.push({
      name,
      body: body.slice(start, end).replace(/^\n+/, '').trimEnd(),
    });
  }

  return sections;
}

/** Parse all footgun entries from a category bucket file. */
function parseBucketFootguns(
  body: string,
  warnings: string[],
): MergedFootgunEntry[] {
  return splitBucketSections(body).map((section) => {
    const metadata = parseFootgunMetadata(section.body);
    if (!metadata.created)
      warnings.push(`Footgun "${section.name}" has no created date`);
    return {
      name: section.name,
      created: metadata.created,
      evidenceType: metadata.evidenceType,
      status: metadata.status,
      body: metadata.body.trimEnd(),
    };
  });
}

/** Read normalized entries from either a bucket file or a legacy single-entry file. */
function readMergedFootgunEntries(
  inputDir: string,
  file: string,
  warnings: string[],
): MergedFootgunEntry[] {
  const { data, body } = parseFrontmatter(
    readFileSync(join(inputDir, file), 'utf8'),
  );
  if (typeof data.category === 'string' && /^## Footgun:\s+/m.test(body)) {
    return parseBucketFootguns(body, warnings);
  }

  return [
    {
      name: typeof data.name === 'string' ? data.name : basename(file, '.md'),
      created: typeof data.created === 'string' ? data.created : '',
      evidenceType:
        typeof data.evidence_type === 'string' ? data.evidence_type : '',
      status: typeof data.status === 'string' ? data.status : 'active',
      body: body.trimEnd(),
    },
  ];
}

/** Render one merged footgun back into the legacy monolithic document shape. */
function buildFootgunSection(
  entry: MergedFootgunEntry,
  warnings: string[],
): string {
  if (!entry.created)
    warnings.push(`Footgun "${entry.name}" has no created date`);

  const lines: string[] = [`## Footgun: ${entry.name}`, ''];
  if (entry.evidenceType) {
    lines.push(`**Evidence type:** ${entry.evidenceType}`);
    lines.push('');
  }
  if (entry.status && entry.status !== 'active') {
    lines.push(
      `**Status:** ${entry.status.toUpperCase() === 'RESOLVED' ? 'RESOLVED' : entry.status}`,
    );
    lines.push('');
  }
  lines.push(entry.body);
  if (entry.created) {
    lines.push('');
    lines.push(`**Created:** ${entry.created}`);
  }

  return lines.join('\n');
}

/** Merge bucketed footgun files back into the legacy monolithic document. */
export function mergeFootguns(
  inputDir: string,
  outputPath: string,
): MigrationResult {
  const files = listMarkdownFiles(inputDir);
  const preamble = readFootgunPreamble(inputDir, files);
  const entryFiles = files.filter((file) => file !== 'README.md');
  const sections: string[] = [preamble];
  const warnings: string[] = [];
  let entryCount = 0;

  for (const file of entryFiles) {
    const entries = readMergedFootgunEntries(inputDir, file, warnings);
    entryCount += entries.length;
    for (const entry of entries) {
      sections.push(buildFootgunSection(entry, warnings));
    }
  }

  const merged = sections.filter(Boolean).join('\n\n') + '\n';
  writeFileSync(outputPath, merged);
  return { fileCount: entryCount, files, warnings };
}
