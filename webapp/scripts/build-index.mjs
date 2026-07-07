#!/usr/bin/env node
// Scans recipes/ and anjas-cooking/, builds webapp/data/recipes-index.json,
// and mirrors the source .md files into webapp/content/ so the app has a
// self-contained set of files to publish to GitHub Pages.
//
// Run from anywhere: `node webapp/scripts/build-index.mjs`

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const WEBAPP_ROOT = join(__dirname, '..');
const CONTENT_DIR = join(WEBAPP_ROOT, 'content');
const DATA_DIR = join(WEBAPP_ROOT, 'data');

const SOURCES = [
  { dir: 'recipes/grains', category: 'Grains' },
  { dir: 'recipes/oven-mains', category: 'Oven Mains' },
  { dir: 'recipes/salads', category: 'Salads' },
  { dir: 'recipes/soups', category: 'Soups' },
  { dir: 'recipes/stovetop-mains', category: 'Stovetop Mains' },
  { dir: 'anjas-cooking', category: "Anja's Cooking" },
];

function listMarkdownFiles(absDir) {
  return readdirSync(absDir)
    .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .sort();
}

function extractTitle(content) {
  const m = content.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

function extractSubtitle(content, title) {
  if (!title) return null;
  const lines = content.split('\n');
  const titleIdx = lines.findIndex((l) => l.trim() === `# ${title}`);
  if (titleIdx === -1) return null;
  for (let i = titleIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;
    if (line === '---') return null;
    const m = line.match(/^\*(.+)\*$/);
    return m ? m[1].trim() : null;
  }
  return null;
}

function extractDateStamp(title) {
  if (!title) return { dateStamp: null, isClaudeMade: false };
  const m = title.match(/\[(\d{2}-\d{2}-\d{2})\]/);
  const isClaudeMade = title.includes('✴️') || title.includes('✴');
  return { dateStamp: m ? m[1] : null, isClaudeMade };
}

function extractNutrient(content, label) {
  const re = new RegExp(`\\|\\s*${label}\\s*\\|\\s*([\\d.,]+)\\s*([a-zA-Zµ]+)\\s*\\|`, 'i');
  const m = content.match(re);
  if (!m) return null;
  return { value: parseFloat(m[1].replace(/,/g, '')), unit: m[2] };
}

function extractFoodNomsUrl(content) {
  const m = content.match(/\((https:\/\/www\.wolframcloud\.com\/obj\/[^)\s]*BuildFoodNomsRecipe\?[^)\s]+)\)/);
  return m ? m[1] : null;
}

function gitLastModified(relPath) {
  try {
    const out = execSync(`git log -1 --format=%cI -- "${relPath}"`, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return out || null;
  } catch {
    return null;
  }
}

function slugify(relPath) {
  return relPath.replace(/\//g, '--').replace(/\.md$/, '');
}

const REF_DEF_RE = /^\[([^\]]+)\]:\s*(\S+)\s*$/;

function extractRefDefs(content) {
  const refs = {};
  for (const line of content.split('\n')) {
    const m = line.match(REF_DEF_RE);
    if (m) refs[m[1]] = m[2];
  }
  return refs;
}

function cleanHeading(heading) {
  return heading
    .replace(/^Profile:\s*/, '')
    .replace(/\[([^\]]+)\]\[[^\]]+\]/g, '$1')
    .trim();
}

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractFirstParagraph(bodyLines) {
  const para = [];
  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      if (para.length) break;
      continue;
    }
    const isNonParagraphStarter =
      /^#{1,6}\s/.test(trimmed) || trimmed.startsWith('|') || trimmed.startsWith('>') || trimmed === '---';
    if (isNonParagraphStarter) {
      if (para.length) break;
      continue; // skip leading non-paragraph lines (e.g. a table right after the heading)
    }
    para.push(trimmed);
  }
  return para.length ? para.join(' ') : null;
}

// design/SHAKSHUKA.md is a single hand-curated file covering many breakfast
// profiles in one doc (deliberately not split into per-recipe files — see
// the file itself). Each "## " section becomes its own browsable card under
// a "Shakshuka" category, without altering the source file. Profile headings
// use markdown reference-style links ("[Indian / Tikka][s-indian]") whose
// targets are FoodNoms download URLs defined at the bottom of the file —
// every generated section file gets the full set of those definitions
// appended so those links (and the FoodNoms nav button) resolve regardless
// of which section is being viewed.
function buildShakshukaEntries() {
  const absPath = join(REPO_ROOT, 'design/SHAKSHUKA.md');
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch {
    return [];
  }

  const refs = extractRefDefs(content);
  const refDefBlock = Object.entries(refs)
    .map(([key, url]) => `[${key}]: ${url}`)
    .join('\n');

  const sections = [];
  let current = null;
  for (const line of content.split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[1], lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  const lastModified = gitLastModified('design/SHAKSHUKA.md');
  const destDir = join(CONTENT_DIR, 'design', 'shakshuka');
  mkdirSync(destDir, { recursive: true });

  // Not useful as its own app card — a 12-column comparison table reads
  // fine in the source file but is unreadable once squeezed onto a phone
  // screen. The source file itself is untouched; this only skips the card.
  const EXCLUDED_SECTIONS = new Set(['Profile reference matrix']);

  return sections
    .filter((section) => !EXCLUDED_SECTIONS.has(cleanHeading(section.heading)))
    .map((section) => {
      const title = cleanHeading(section.heading);
      const fileName = `${slug(title)}.md`;
      const bodyText = section.lines.join('\n').trim();
      writeFileSync(join(destDir, fileName), `${bodyText}\n\n${refDefBlock}\n`, 'utf8');

      const refMatch = section.heading.match(/\[[^\]]+\]\[([^\]]+)\]/);
      const foodNomsUrl = refMatch ? refs[refMatch[1]] || null : null;

      return {
        id: `shakshuka--${slug(title)}`,
        title,
        subtitle: extractFirstParagraph(section.lines.slice(1)),
        category: 'Shakshuka',
        path: `content/design/shakshuka/${fileName}`,
        hasTimeline: bodyText.includes('RenderTimeline'),
        foodNomsUrl,
        kcal: null,
        proteinG: null,
        dateStamp: null,
        isClaudeMade: false,
        lastModified,
      };
    });
}

function build() {
  rmSync(CONTENT_DIR, { recursive: true, force: true });
  mkdirSync(CONTENT_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });

  const entries = [];

  for (const source of SOURCES) {
    const absDir = join(REPO_ROOT, source.dir);
    let files;
    try {
      files = listMarkdownFiles(absDir);
    } catch {
      continue;
    }

    for (const file of files) {
      const relPath = join(source.dir, file).split('\\').join('/');
      const absPath = join(absDir, file);
      const content = readFileSync(absPath, 'utf8');

      const title = extractTitle(content) || basename(file, '.md');
      const subtitle = extractSubtitle(content, extractTitle(content));
      const { dateStamp, isClaudeMade } = extractDateStamp(title);
      const energy = extractNutrient(content, 'Energy');
      const protein = extractNutrient(content, 'Protein');
      const foodNomsUrl = extractFoodNomsUrl(content);

      const contentRelPath = relPath;
      const destPath = join(CONTENT_DIR, contentRelPath);
      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, content, 'utf8');

      entries.push({
        id: slugify(relPath),
        title,
        subtitle,
        category: source.category,
        path: `content/${contentRelPath}`,
        hasTimeline: content.includes('RenderTimeline'),
        foodNomsUrl,
        kcal: energy ? Math.round(energy.value) : null,
        proteinG: protein ? protein.value : null,
        dateStamp,
        isClaudeMade,
        lastModified: gitLastModified(relPath),
      });
    }
  }

  const categories = [...new Set(SOURCES.map((s) => s.category))];

  const shakshukaEntries = buildShakshukaEntries();
  if (shakshukaEntries.length) {
    entries.push(...shakshukaEntries);
    categories.push('Shakshuka');
  }

  entries.sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || ''));

  const index = {
    generatedAt: new Date().toISOString(),
    count: entries.length,
    categories,
    recipes: entries,
  };

  writeFileSync(join(DATA_DIR, 'recipes-index.json'), JSON.stringify(index, null, 2), 'utf8');

  console.log(
    `Indexed ${entries.length} recipes across ${index.categories.length} categories (incl. ${shakshukaEntries.length} Shakshuka sections).`
  );
}

build();
