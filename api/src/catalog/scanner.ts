import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, basename, dirname } from 'path';
import matter from 'gray-matter';
import type { AgentEntry } from '../types.js';

const SKIP_DIRS = new Set([
  'api',
  'node_modules',
  '.git',
  '.github',
  'scripts',
  'integrations',
  'examples',
]);

export async function scanPrompts(baseDir: string): Promise<AgentEntry[]> {
  const entries: AgentEntry[] = [];
  await walkDir(baseDir, baseDir, entries);
  return entries.sort((a, b) => a.slug.localeCompare(b.slug));
}

async function walkDir(
  dir: string,
  baseDir: string,
  entries: AgentEntry[],
): Promise<void> {
  let items: string[];
  try {
    items = await readdir(dir);
  } catch {
    return;
  }

  for (const item of items) {
    const fullPath = join(dir, item);
    let fileStat;
    try {
      fileStat = await stat(fullPath);
    } catch {
      continue;
    }

    if (fileStat.isDirectory()) {
      if (!SKIP_DIRS.has(item)) {
        await walkDir(fullPath, baseDir, entries);
      }
      continue;
    }

    if (!item.endsWith('.md') || item.toUpperCase() === 'README.MD') {
      continue;
    }

    const raw = await readFile(fullPath, 'utf-8');

    let frontmatter: Record<string, unknown> = {};
    let content = raw;
    try {
      const parsed = matter(raw);
      frontmatter = parsed.data;
      content = parsed.content;
    } catch {
      // Skip files with invalid YAML frontmatter
    }

    const relPath = relative(baseDir, fullPath);
    const division = dirname(relPath).split('/')[0];
    const stem = basename(item, '.md');
    const slug = stem;

    entries.push({
      slug,
      name: (frontmatter.name as string) ?? stem,
      division: division === '.' ? 'uncategorized' : division,
      specialty: (frontmatter.description as string) ?? '',
      whenToUse: extractSection(content, 'When to Use'),
      emoji: (frontmatter.emoji as string) ?? '',
      promptPath: relPath,
      promptContent: raw,
    });
  }
}

function extractSection(content: string, heading: string): string {
  const pattern = new RegExp(`^##\\s+(?:\\S+\\s+)?${heading}\\s*$`, 'im');
  const match = pattern.exec(content);
  if (!match) return '';

  const start = match.index + match[0].length;
  const nextHeading = content.indexOf('\n## ', start);
  const section =
    nextHeading === -1
      ? content.slice(start)
      : content.slice(start, nextHeading);

  return section.trim();
}
