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

export function renderMarkdown(md, opts = {}) {
  const inline = (raw) => renderInline(raw, opts);
  const lines = md.replace(/\r\n/g, '\n').split('\n');
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

  return out.join('\n');
}
