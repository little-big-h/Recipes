// Small hand-rolled Markdown -> HTML renderer, tailored to this repo's
// recipe format (docs/RECIPE_FORMAT.md): headings, blockquotes, GFM tables,
// images, links, bold/italic, ordered/unordered lists, hr, paragraphs.
// Not a general-purpose CommonMark implementation.

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderInline(raw, opts = {}) {
  let s = escapeHtml(raw);

  // inline code
  s = s.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);

  // images ![alt](url) — before links, since link regex would otherwise match the [alt](url) part
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, url) => {
    return `<img loading="lazy" src="${url}" alt="${alt}">`;
  });

  // links [text](url)
  s = s.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, text, url) => {
    const external = /^https?:\/\//.test(url);
    if (external) return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
    if (opts.resolveLink) {
      const resolved = opts.resolveLink(url);
      // Relative links point at repo paths that only make sense checked out
      // locally (e.g. docs/ isn't published) — if it doesn't resolve to a
      // known in-app route, drop the link rather than leave a dead one.
      return resolved ? `<a href="${resolved}">${text}</a>` : text;
    }
    return `<a href="${url}">${text}</a>`;
  });

  // reference-style links [text][ref], resolved against link reference
  // definitions ("[ref]: url") collected from the document by renderMarkdown
  if (opts.refs) {
    s = s.replace(/\[([^\]]+)\]\[([^\]]+)\]/g, (whole, text, ref) => {
      const url = opts.refs[ref];
      if (!url) return text;
      const external = /^https?:\/\//.test(url);
      return external
        ? `<a href="${url}" target="_blank" rel="noopener">${text}</a>`
        : `<a href="${url}">${text}</a>`;
    });
  }

  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic (single asterisk, after bold is consumed)
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return s;
}

function isBlank(line) {
  return line.trim() === '';
}

function parseTableRow(line) {
  let cells = line.trim();
  if (cells.startsWith('|')) cells = cells.slice(1);
  if (cells.endsWith('|')) cells = cells.slice(0, -1);
  return cells.split('|').map((c) => c.trim());
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function alignFromSeparator(cell) {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return '';
}

const REF_DEF_RE = /^\[([^\]]+)\]:\s*(\S+)\s*$/;

export function renderMarkdown(md, opts = {}) {
  // Link reference definitions ("[ref]: url") can appear anywhere in the
  // document — collect them up front and drop those lines from the block
  // parse (they're plumbing, not visible content) so [text][ref] links
  // anywhere in the document can resolve, regardless of definition order.
  const refs = { ...(opts.refs || {}) };
  const lines = md
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      const m = line.match(REF_DEF_RE);
      if (!m) return line;
      refs[m[1]] = m[2];
      return ''; // blank it out rather than remove, so paragraph breaks stay intact
    });

  const mergedOpts = { ...opts, refs };
  const inline = (raw) => renderInline(raw, mergedOpts);
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      i++;
      continue;
    }

    // fenced code block
    if (line.trim().startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // heading
    let m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const level = m[1].length;
      out.push(`<h${level}>${inline(m[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // hr
    if (/^(---|\*\*\*)\s*$/.test(line.trim())) {
      out.push('<hr>');
      i++;
      continue;
    }

    // blockquote
    if (line.trim().startsWith('>')) {
      const quoted = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        const content = lines[i].trim().replace(/^>\s?/, '');
        quoted.push(content);
        i++;
      }
      const text = quoted.join(' ').trim();
      out.push(`<blockquote><p>${inline(text)}</p></blockquote>`);
      continue;
    }

    // table
    if (line.trim().startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2 && isSeparatorRow(parseTableRow(tableLines[1]))) {
        const header = parseTableRow(tableLines[0]);
        const aligns = parseTableRow(tableLines[1]).map(alignFromSeparator);
        const bodyRows = tableLines.slice(2).map(parseTableRow);
        // The ingredients table's "Type" column (docs/RECIPE_FORMAT.md) holds
        // only a single circle emoji — give it a narrow fixed width so the
        // rest of the columns share the space that would otherwise be
        // wasted on it, instead of every column getting an equal slice.
        const narrow = header.map((h) => h.trim().toLowerCase() === 'type');

        const cellAttrs = (idx) => {
          const styles = [];
          if (aligns[idx]) styles.push(`text-align:${aligns[idx]}`);
          // px, not em: em is relative to each cell's own font-size, which
          // differs between th and td, so the two would disagree on width.
          if (narrow[idx]) styles.push('width:40px; white-space:nowrap');
          return styles.length ? ` style="${styles.join(';')}"` : '';
        };

        const thead = `<thead><tr>${header
          .map((h, idx) => `<th${cellAttrs(idx)}>${inline(h)}</th>`)
          .join('')}</tr></thead>`;
        const tbody = `<tbody>${bodyRows
          .map(
            (row) =>
              `<tr>${row.map((c, idx) => `<td${cellAttrs(idx)}>${inline(c)}</td>`).join('')}</tr>`
          )
          .join('')}</tbody>`;
        out.push(`<div class="table-scroll"><table>${thead}${tbody}</table></div>`);
      }
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length) {
        const trimmed = lines[i].trim();
        const itemMatch = trimmed.match(/^\d+\.\s+(.*)$/);
        if (itemMatch) {
          items.push(itemMatch[1]);
          i++;
        } else if (isBlank(lines[i])) {
          const next = lines[i + 1] ? lines[i + 1].trim() : '';
          if (/^\d+\.\s+/.test(next)) {
            i++;
            continue;
          }
          break;
        } else {
          break;
        }
      }
      out.push(`<ol>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</ol>`);
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length) {
        const trimmed = lines[i].trim();
        const itemMatch = trimmed.match(/^[-*]\s+(.*)$/);
        if (itemMatch) {
          items.push(itemMatch[1]);
          i++;
        } else if (isBlank(lines[i])) {
          const next = lines[i + 1] ? lines[i + 1].trim() : '';
          if (/^[-*]\s+/.test(next)) {
            i++;
            continue;
          }
          break;
        } else {
          break;
        }
      }
      out.push(`<ul>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</ul>`);
      continue;
    }

    // paragraph: consume until a blank line or a new block starter
    const para = [];
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^(---|\*\*\*)\s*$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('|') &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) {
      out.push(`<p>${inline(para.join(' '))}</p>`);
    }
  }

  return assembleSections(out);
}

const HEADING_BLOCK_RE = /^<h([1-6])>([\s\S]*)<\/h\1>$/;

// Canonical display order (docs/RECIPE_FORMAT.md's section list), applied
// regardless of the order sections appear in the source file. "notes" is
// always the synthetic intro section; anything that doesn't match a known
// bucket falls into "other", in original relative order.
const BUCKET_ORDER = {
  notes: 0,
  ingredients: 1,
  timeline: 2,
  method: 3,
  nutrition: 4,
  'design-notes': 5,
  'cook-log': 6,
  other: 7,
};

function classifySectionTitle(titleHtml) {
  const t = titleHtml.replace(/<[^>]+>/g, '').toLowerCase();
  // Shakshuka profiles (design/SHAKSHUKA.md) use their own subsection names
  // ("Single-serving build", "Base (constant across profiles)") rather than
  // the recipe-file vocabulary — matched loosely so they still land in the
  // right bucket instead of always falling through to "other".
  if (
    /ingredient/.test(t) ||
    /single-serving build/.test(t) ||
    /^build\b/.test(t) ||
    /^base\b/.test(t) ||
    /^design\s*\(/.test(t) // e.g. "Design (10 portions)" over a batch/quantity table
  ) {
    return 'ingredients';
  }
  if (/timeline/.test(t)) return 'timeline';
  if (/^method\b/.test(t)) return 'method';
  if (/nutrition/.test(t)) return 'nutrition';
  // Narrower than a bare /design/ match: Shakshuka's bulk-paste-project card
  // has a "Design (10 portions)" heading over an actual ingredients table,
  // which a loose match would misclassify as design notes.
  if (/^design\s*notes?\b/.test(t)) return 'design-notes';
  if (/cook log/.test(t) || /^log\b/.test(t)) return 'cook-log';
  return 'other';
}

let sectionSeq = 0;

// Wraps one heading's worth of content (or, for title === null, the intro
// content before the first section-level heading) in a collapsible
// <section> with a show/hide toggle. Returns '' for an empty body so
// callers can skip it.
function wrapSection(title, bodyBlocks, collapsedByDefault) {
  const body = bodyBlocks.filter((b) => b !== '<hr>').join('\n');
  if (!body.trim()) return '';
  sectionSeq += 1;
  const bodyId = `md-section-body-${sectionSeq}`;
  return [
    `<section class="md-section${collapsedByDefault ? ' collapsed' : ''}">`,
    `<div class="md-section-header">`,
    `<h2 class="md-section-title">${title}</h2>`,
    `<button type="button" class="md-toggle" aria-expanded="${!collapsedByDefault}" aria-controls="${bodyId}">${
      collapsedByDefault ? 'Show' : 'Hide'
    }</button>`,
    `</div>`,
    `<div class="md-section-body" id="${bodyId}">`,
    body,
    `</div>`,
    `</section>`,
  ].join('\n');
}

// Groups the flat block list into collapsible sections, reordered into the
// canonical Notes/Ingredients/Timeline/Method/Nutrition/Design notes/Cook
// log/Other sequence. The document's own title heading — whatever level it
// happens to be (H1 for a normal recipe, H2 for a Shakshuka profile card
// whose body then uses H3 for its own subsections) — stays outside any
// section, exactly like the H1 in a normal recipe: it's the title, not a
// collapsible part of the content. The next heading level down is treated
// as the section boundary; anything deeper stays nested inside its section.
function assembleSections(blocks) {
  const out = [];
  let i = 0;

  const titleMatch = blocks.length ? blocks[0].match(HEADING_BLOCK_RE) : null;
  // The title is already shown in the app's nav bar — don't repeat it in
  // the body, just use it to work out the section-heading level.
  if (titleMatch) {
    i = 1;
  }

  const sectionLevel = titleMatch ? Number(titleMatch[1]) + 1 : null;
  const sectionRe = sectionLevel ? new RegExp(`^<h${sectionLevel}>([\\s\\S]*)<\\/h${sectionLevel}>$`) : null;

  const groups = [];
  let current = { title: null, blocks: [] };
  for (; i < blocks.length; i++) {
    const m = sectionRe ? blocks[i].match(sectionRe) : null;
    if (m) {
      groups.push(current);
      current = { title: m[1], blocks: [] };
    } else {
      current.blocks.push(blocks[i]);
    }
  }
  groups.push(current);

  // No section-level heading ever appeared — nothing to split or reorder,
  // so render the remaining content plainly rather than wrap it as if it
  // were a distinct, labelled part of the document.
  if (groups.length === 1 && groups[0].title === null) {
    return [...out, ...groups[0].blocks].join('\n');
  }

  // A few cards (e.g. Shakshuka's "Structure 1" base) put a bare ingredients
  // table directly under the title with no heading of its own. Pull any
  // such table out of the intro/Notes group into its own Ingredients
  // section instead of letting it get buried inside a collapsed "Notes".
  const introGroup = groups[0];
  if (introGroup && introGroup.title === null) {
    const tableBlocks = introGroup.blocks.filter((b) => b.startsWith('<div class="table-scroll">'));
    if (tableBlocks.length) {
      introGroup.blocks = introGroup.blocks.filter((b) => !b.startsWith('<div class="table-scroll">'));
      groups.push({ title: 'Ingredients', blocks: tableBlocks, forcedBucket: 'ingredients' });
    }
  }

  const bucketed = groups.map((group, idx) => ({
    ...group,
    idx,
    bucket: group.forcedBucket || (group.title === null ? 'notes' : classifySectionTitle(group.title)),
  }));
  bucketed.sort((a, b) => (BUCKET_ORDER[a.bucket] ?? BUCKET_ORDER.other) - (BUCKET_ORDER[b.bucket] ?? BUCKET_ORDER.other) || a.idx - b.idx);

  for (const group of bucketed) {
    const title = group.title === null ? 'Notes' : group.title;
    const html = wrapSection(title, group.blocks, group.bucket === 'notes');
    if (html) out.push(html);
  }

  return out.join('\n');
}
