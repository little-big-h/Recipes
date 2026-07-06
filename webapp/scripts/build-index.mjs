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
        hasFoodNoms: content.includes('BuildFoodNomsRecipe'),
        kcal: energy ? Math.round(energy.value) : null,
        proteinG: protein ? protein.value : null,
        dateStamp,
        isClaudeMade,
        lastModified: gitLastModified(relPath),
      });
    }
  }

  entries.sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || ''));

  const index = {
    generatedAt: new Date().toISOString(),
    count: entries.length,
    categories: [...new Set(SOURCES.map((s) => s.category))],
    recipes: entries,
  };

  writeFileSync(join(DATA_DIR, 'recipes-index.json'), JSON.stringify(index, null, 2), 'utf8');

  console.log(`Indexed ${entries.length} recipes across ${index.categories.length} categories.`);
}

build();
