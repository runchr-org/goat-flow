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
  filename: string;
  created: string;
  type: 'entry' | 'pattern';
  related: string[];
  body: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function trimBody(body: string): string {
  return body.replace(/^\n+/, '').replace(/\s+$/, '') + '\n';
}

function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  const frontmatter = match[1] ?? '';
  const parsed = load(frontmatter) as Record<string, unknown> | null;
  return { data: parsed ?? {}, body: match[2] ?? '' };
}

function renderFrontmatter(data: Record<string, unknown>): string {
  return `---\n${dump(data, { lineWidth: -1 }).trimEnd()}\n---\n\n`;
}

function entryFilename(created: string, name: string): string {
  const slug = slugify(name);
  return created ? `${created}-${slug}.md` : `unknown-${slug}.md`;
}

interface RawLessonBlock {
  heading: string;
  section: 'entries' | 'patterns';
  rawBody: string;
}

function collectLessonBlocks(body: string): RawLessonBlock[] {
  const blocks: RawLessonBlock[] = [];
  let section: 'entries' | 'patterns' = 'entries';
  let heading = '';
  let rawBody: string[] = [];

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

function parseLessons(content: string, warnings: string[]): { preamble: string; entries: LessonEntry[] } {
  const entriesIndex = content.search(/^## Entries\s*$/m);
  const preamble = entriesIndex >= 0 ? content.slice(0, entriesIndex) : content;
  if (entriesIndex < 0) return { preamble, entries: [] };

  const parsed: Array<{ name: string; created: string; type: 'entry' | 'pattern'; rawBody: string; relatedNames: string[] }> = [];
  const body = content.slice(entriesIndex);
  for (const block of collectLessonBlocks(body)) {
    const heading = block.heading.trim();
    if (!heading) continue;
    const isPattern = block.section === 'patterns' || heading.startsWith('Pattern:');
    const name = isPattern ? heading.replace(/^Pattern:\s*/, '').trim() : heading;
    let rawBody = block.rawBody;
    const createdMatch = rawBody.match(/^\*\*created_at:\*\*\s*(.+)\n?/im) ?? rawBody.match(/^created_at:\s*(.+)\n?/im);
    const created = createdMatch?.[1]?.trim() ?? '';
    const relatedMatch = rawBody.match(/^_Entries:\s*(.+)_\n?/m);
    const relatedNames = relatedMatch?.[1]
      ? Array.from(relatedMatch[1].matchAll(/"([^"]+)"/g)).map(match => match[1] ?? '').filter(Boolean)
      : [];

    rawBody = rawBody
      .replace(/^\*\*created_at:\*\*.+\n?/im, '')
      .replace(/^created_at:\s*.+\n?/im, '')
      .replace(/^_Entries:\s*.+_\n?/m, '')
      .replace(/\n{3,}/g, '\n\n');

    if (!created) warnings.push(`Lesson "${name}" has no created_at date`);
    if (!trimBody(rawBody).trim()) warnings.push(`Lesson "${name}" has empty body after metadata extraction`);

    parsed.push({
      name,
      created,
      type: isPattern ? 'pattern' : 'entry',
      rawBody: trimBody(rawBody),
      relatedNames,
    });
  }

  const byName = new Map(parsed.filter(entry => entry.type === 'entry').map(entry => [entry.name, entryFilename(entry.created, entry.name)]));
  const entries: LessonEntry[] = parsed.map(entry => {
    const related = entry.relatedNames.flatMap(name => {
      const mapped = byName.get(name);
      if (!mapped) {
        warnings.push(`Pattern "${entry.name}" could not match related lesson "${name}"`);
        return [];
      }
      return [mapped];
    });

    return {
      name: entry.name,
      filename: entry.type === 'pattern' ? `pattern-${slugify(entry.name)}.md` : entryFilename(entry.created, entry.name),
      created: entry.created,
      type: entry.type,
      related,
      body: entry.rawBody,
    };
  });

  return { preamble, entries };
}

export function splitLessons(inputPath: string, outputDir: string): MigrationResult {
  const content = readFileSync(inputPath, 'utf8');
  const warnings: string[] = [];
  const { preamble, entries } = parseLessons(content, warnings);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'README.md'), preamble.trimEnd() + '\n');

  const files = ['README.md'];
  for (const entry of entries) {
    const frontmatter: Record<string, unknown> = {
      name: entry.name,
      created: entry.created,
    };
    if (entry.type === 'pattern') frontmatter.type = 'pattern';
    if (entry.related.length > 0) frontmatter.related = entry.related;
    writeFileSync(join(outputDir, entry.filename), renderFrontmatter(frontmatter) + entry.body);
    files.push(entry.filename);
  }

  return { fileCount: entries.length, files, warnings };
}

export function mergeLessons(inputDir: string, outputPath: string): MigrationResult {
  const files = readdirSync(inputDir)
    .filter(file => file.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));
  const preamble = files.includes('README.md')
    ? readFileSync(join(inputDir, 'README.md'), 'utf8').trimEnd()
    : '# Lessons';
  const entryFiles = files.filter(file => file !== 'README.md');
  const entrySections: string[] = [];
  const patternSections: string[] = [];
  const warnings: string[] = [];

  const entryNameByFile = new Map<string, string>();
  for (const file of entryFiles) {
    const { data } = parseFrontmatter(readFileSync(join(inputDir, file), 'utf8'));
    if (typeof data.name === 'string') entryNameByFile.set(file, data.name);
  }

  for (const file of entryFiles) {
    const { data, body } = parseFrontmatter(readFileSync(join(inputDir, file), 'utf8'));
    const name = typeof data.name === 'string' ? data.name : basename(file, '.md');
    const created = typeof data.created === 'string' ? data.created : '';
    const type = data.type === 'pattern' ? 'pattern' : 'entry';
    const lines: string[] = [`### ${type === 'pattern' ? `Pattern: ${name}` : name}`];
    if (type === 'pattern' && Array.isArray(data.related) && data.related.length > 0) {
      const relatedNames = data.related
        .map(item => typeof item === 'string' ? entryNameByFile.get(item) ?? item : '')
        .filter(Boolean)
        .map(item => `"${item}"`);
      lines.push(`_Entries: ${relatedNames.join(', ')}_`);
      lines.push('');
    }
    lines.push(body.trimEnd());
    if (created) {
      lines.push('');
      lines.push(`**created_at:** ${created}`);
    } else {
      warnings.push(`Lesson file "${file}" has no created date`);
    }

    if (type === 'pattern') patternSections.push(lines.join('\n'));
    else entrySections.push(lines.join('\n'));
  }

  const parts = [preamble, '## Entries', ...entrySections];
  if (patternSections.length > 0) {
    parts.push('## Patterns', ...patternSections);
  }
  writeFileSync(outputPath, parts.filter(Boolean).join('\n\n') + '\n');
  return { fileCount: entryFiles.length, files, warnings };
}
