// Safe-ish markdown renderer used across blog editor + public post page.
// Supports: #-###### headings (with anchor ids), **bold**, *italic*, `code`,
// > blockquotes, - / * / 1. lists (with nesting via indentation), GFM pipe
// tables, [text](url), ![alt](url), ``` fenced code blocks (optional lang),
// --- horizontal rule, and paragraphs.
// Admin-authored content is trusted; raw HTML is allowed to pass through so
// authors can drop in <div>, <iframe>, <table>, custom classes, etc.
export function renderMarkdown(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80);

  const rawBlocks: string[] = [];
  const stashRaw = (html: string) => {
    rawBlocks.push(html);
    return `\u0000HTML${rawBlocks.length - 1}\u0000`;
  };

  // Extract fenced code blocks first (protect them from inline transforms).
  const codeBlocks: string[] = [];
  let source = md.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_m, _lang, code) => {
    codeBlocks.push(code as string);
    return `\u0000CODE${codeBlocks.length - 1}\u0000`;
  });

  // Multi-line HTML blocks: <tag ...>...</tag> starting at column 0.
  source = source.replace(
    /^<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?>[\s\S]*?^<\/\1>[ \t]*$/gm,
    (m) => stashRaw(m)
  );
  // Self-closing / void block tags on their own line: <hr/>, <iframe .../>, <img ... />
  source = source.replace(/^<[a-zA-Z][^\n<>]*\/?>[ \t]*$/gm, (m) => stashRaw(m));

  // Preserve inline HTML tags: stash them before escaping, restore after.
  const escKeepHtml = (s: string) => {
    const stash: string[] = [];
    const withPh = s.replace(
      /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^<>]*?)?\/?>/g,
      (m) => {
        stash.push(m);
        return `\u0000TAG${stash.length - 1}\u0000`;
      }
    );
    return esc(withPh).replace(/\u0000TAG(\d+)\u0000/g, (_m, i) => stash[Number(i)]);
  };

  const inline = (s: string) =>
    escKeepHtml(s)
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-sm">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        '<img alt="$1" src="$2" class="rounded-lg my-4 max-w-full" />'
      )
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => {
        const isHash = href.startsWith("#");
        const attrs = isHash
          ? ""
          : ' target="_blank" rel="noopener noreferrer"';
        return `<a href="${href}" class="text-primary underline"${attrs}>${text}</a>`;
      });

  const lines = source.split(/\r?\n/);
  const out: string[] = [];

  // Stack of open list contexts: {type: 'ul'|'ol', indent: number}
  const listStack: { type: "ul" | "ol"; indent: number }[] = [];
  let inQuote = false;

  const closeLists = (toIndent = -1) => {
    while (listStack.length && listStack[listStack.length - 1].indent > toIndent) {
      const l = listStack.pop()!;
      out.push(l.type === "ol" ? "</ol>" : "</ul>");
    }
  };
  const closeAllLists = () => closeLists(-1);
  const closeQuote = () => {
    if (inQuote) {
      out.push("</blockquote>");
      inQuote = false;
    }
  };

  const flushTable = (rows: string[]) => {
    // rows[0] = header, rows[1] = separator, rest = body
    const splitRow = (r: string) =>
      r
        .replace(/^\s*\|/, "")
        .replace(/\|\s*$/, "")
        .split("|")
        .map((c) => c.trim());
    const header = splitRow(rows[0]);
    const body = rows.slice(2).map(splitRow);
    let html =
      '<div class="overflow-x-auto my-4"><table class="w-full text-sm border-collapse border border-border">';
    html +=
      "<thead><tr>" +
      header
        .map(
          (h) =>
            `<th class="border border-border bg-muted px-3 py-2 text-left font-semibold">${inline(
              h
            )}</th>`
        )
        .join("") +
      "</tr></thead>";
    html += "<tbody>";
    for (const row of body) {
      html +=
        "<tr>" +
        row
          .map(
            (c) =>
              `<td class="border border-border px-3 py-2 align-top">${inline(c)}</td>`
          )
          .join("") +
        "</tr>";
    }
    html += "</tbody></table></div>";
    out.push(html);
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/\s+$/, "");

    // Raw HTML block placeholder
    const htmlMatch = line.trim().match(/^\u0000HTML(\d+)\u0000$/);
    if (htmlMatch) {
      closeAllLists();
      closeQuote();
      out.push(rawBlocks[Number(htmlMatch[1])] || "");
      continue;
    }

    // Fenced code placeholder
    const codeMatch = line.trim().match(/^\u0000CODE(\d+)\u0000$/);
    if (codeMatch) {
      closeAllLists();
      closeQuote();
      const code = esc(codeBlocks[Number(codeMatch[1])] || "");
      out.push(
        `<pre class="bg-muted rounded-lg p-4 overflow-x-auto text-sm my-4"><code>${code}</code></pre>`
      );
      continue;
    }

    // Table detection: current line contains |, next line is separator
    if (
      /\|/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(lines[i + 1])
    ) {
      closeAllLists();
      closeQuote();
      const tableRows = [line, lines[i + 1]];
      let j = i + 2;
      while (j < lines.length && /\|/.test(lines[j]) && lines[j].trim() !== "") {
        tableRows.push(lines[j]);
        j++;
      }
      flushTable(tableRows);
      i = j - 1;
      continue;
    }

    if (!line.trim()) {
      // Blank line ends quotes; keep list stack (allow paragraph gaps between items).
      closeQuote();
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      closeAllLists();
      closeQuote();
      out.push('<hr class="my-6 border-border" />');
      continue;
    }

    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,6})\s+(.*)/))) {
      closeAllLists();
      closeQuote();
      const level = m[1].length;
      const text = m[2].replace(/\s*\{#([^}]+)\}\s*$/, "");
      const explicitId = m[2].match(/\{#([^}]+)\}\s*$/);
      const id = explicitId ? explicitId[1] : slugify(text);
      const sizes = [
        "text-4xl font-bold mt-8 mb-3 scroll-mt-24",
        "text-3xl font-bold mt-8 mb-3 scroll-mt-24",
        "text-2xl font-semibold mt-6 mb-2 scroll-mt-24",
        "text-xl font-semibold mt-5 mb-2 scroll-mt-24",
        "text-lg font-semibold mt-4 mb-1 scroll-mt-24",
        "text-base font-semibold mt-4 mb-1 scroll-mt-24",
      ];
      const tag = `h${Math.max(2, level)}`;
      out.push(`<${tag} id="${id}" class="${sizes[level - 1]}">${inline(text)}</${tag}>`);
      continue;
    }

    if ((m = line.match(/^>\s?(.*)/))) {
      closeAllLists();
      if (!inQuote) {
        out.push(
          '<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">'
        );
        inQuote = true;
      }
      out.push(`<p>${inline(m[1])}</p>`);
      continue;
    }

    // Ordered / unordered list item (with indentation for nesting)
    const ol = line.match(/^(\s*)(\d+)\.\s+(.*)/);
    const ul = line.match(/^(\s*)[-*+]\s+(.*)/);
    if (ol || ul) {
      closeQuote();
      const indent = (ol ? ol[1] : ul![1]).length;
      const type: "ul" | "ol" = ol ? "ol" : "ul";
      const content = ol ? ol[3] : ul![2];

      // Close deeper lists
      closeLists(indent);
      const top = listStack[listStack.length - 1];
      if (!top || top.indent < indent || top.type !== type) {
        // Open new list at this indent (or replace same-indent list of other type)
        if (top && top.indent === indent && top.type !== type) {
          out.push(top.type === "ol" ? "</ol>" : "</ul>");
          listStack.pop();
        }
        const cls =
          type === "ol"
            ? 'list-decimal pl-6 space-y-1 my-3'
            : 'list-disc pl-6 space-y-1 my-3';
        out.push(`<${type} class="${cls}">`);
        listStack.push({ type, indent });
      }
      out.push(`<li>${inline(content)}</li>`);
      continue;
    }

    // Plain paragraph
    closeAllLists();
    closeQuote();
    out.push(`<p class="leading-7 my-3">${inline(line)}</p>`);
  }
  closeAllLists();
  closeQuote();
  return out.join("\n");
}
