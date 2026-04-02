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
  filename: string;
  evidenceType: string;
  status: string;
  created: string;
  body: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function uniqueFilename(baseName: string, used: Set<string>): string {
  if (!used.has(baseName)) {
    used.add(baseName);
    return baseName;
  }

  const stem = baseName.replace(/\.md$/, '');
  let counter = 2;
  while (used.has(`${stem}-${counter}.md`)) counter++;
  const next = `${stem}-${counter}.md`;
  used.add(next);
  return next;
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

function parseFootgunEntries(content: string, warnings: string[]): { preamble: string; entries: FootgunEntry[] } {
  const firstIndex = content.search(/^## Footgun:\s+/m);
  const preamble = firstIndex >= 0 ? content.slice(0, firstIndex) : content;
  if (firstIndex < 0) return { preamble, entries: [] };

  const rawEntries = content.slice(firstIndex).split(/^## Footgun:\s+/m).filter(Boolean);
  const used = new Set<string>();
  const entries: FootgunEntry[] = rawEntries.map(rawEntry => {
    const newline = rawEntry.indexOf('\n');
    const name = (newline >= 0 ? rawEntry.slice(0, newline) : rawEntry).trim();
    let body = newline >= 0 ? rawEntry.slice(newline + 1) : '';

    const evidenceMatch = body.match(/^\*\*Evidence type:\*\*\s*(.+)\n?/m);
    const statusMatch = body.match(/^\*\*Status:\*\*\s*(.+)\n?/m);
    const createdMatch = body.match(/^\*\*Created:\*\*\s*(.+)\n?/m);

    const evidenceType = evidenceMatch?.[1]?.trim() ?? '';
    const statusValue = statusMatch?.[1]?.trim() ?? 'active';
    const created = createdMatch?.[1]?.trim() ?? '';

    body = body
      .replace(/^\*\*Evidence type:\*\*.+\n?/m, '')
      .replace(/^\*\*Status:\*\*.+\n?/m, '')
      .replace(/^\*\*Created:\*\*.+\n?/m, '')
      .replace(/\n{3,}/g, '\n\n');

    if (!created) warnings.push(`Footgun "${name}" has no Created date`);
    if (!trimBody(body).trim()) warnings.push(`Footgun "${name}" has empty body after metadata extraction`);

    return {
      name,
      filename: uniqueFilename(`${slugify(name)}.md`, used),
      evidenceType,
      status: statusValue.toLowerCase().startsWith('resolved') ? 'resolved' : 'active',
      created,
      body: trimBody(body),
    };
  });

  return { preamble, entries };
}

export function splitFootguns(inputPath: string, outputDir: string): MigrationResult {
  const content = readFileSync(inputPath, 'utf8');
  const warnings: string[] = [];
  const { preamble, entries } = parseFootgunEntries(content, warnings);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'README.md'), preamble.trimEnd() + '\n');

  const files = ['README.md'];
  for (const entry of entries) {
    const frontmatter = renderFrontmatter({
      name: entry.name,
      status: entry.status,
      created: entry.created,
      evidence_type: entry.evidenceType,
    });
    writeFileSync(join(outputDir, entry.filename), frontmatter + entry.body);
    files.push(entry.filename);
  }

  return { fileCount: entries.length, files, warnings };
}

export function mergeFootguns(inputDir: string, outputPath: string): MigrationResult {
  const files = readdirSync(inputDir)
    .filter(file => file.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));
  const preamble = files.includes('README.md')
    ? readFileSync(join(inputDir, 'README.md'), 'utf8').trimEnd()
    : '# Footguns';
  const entryFiles = files.filter(file => file !== 'README.md');
  const sections: string[] = [preamble];
  const warnings: string[] = [];

  for (const file of entryFiles) {
    const { data, body } = parseFrontmatter(readFileSync(join(inputDir, file), 'utf8'));
    const name = typeof data.name === 'string' ? data.name : basename(file, '.md');
    const created = typeof data.created === 'string' ? data.created : '';
    const evidenceType = typeof data.evidence_type === 'string' ? data.evidence_type : '';
    const status = typeof data.status === 'string' ? data.status : 'active';
    if (!created) warnings.push(`Footgun file "${file}" has no created date`);

    const lines: string[] = [`## Footgun: ${name}`, ''];
    if (evidenceType) {
      lines.push(`**Evidence type:** ${evidenceType}`);
      lines.push('');
    }
    if (status && status !== 'active') {
      lines.push(`**Status:** ${status.toUpperCase() === 'RESOLVED' ? 'RESOLVED' : status}`);
      lines.push('');
    }
    lines.push(body.trimEnd());
    if (created) {
      lines.push('');
      lines.push(`**Created:** ${created}`);
    }
    sections.push(lines.join('\n'));
  }

  const merged = sections.filter(Boolean).join('\n\n') + '\n';
  writeFileSync(outputPath, merged);
  return { fileCount: entryFiles.length, files, warnings };
}
