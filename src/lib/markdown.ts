// Minimal, safe markdown renderer used across blog editor + public post page.
// Supports: #-###### headings, **bold**, *italic*, `code`, > quote, - lists,
// [text](url), ![alt](url), ``` fenced code blocks, --- rule, and paragraphs.
export function renderMarkdown(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Extract fenced code blocks first (protect them from inline transforms)
  const codeBlocks: string[] = [];
  const source = md.replace(/```([\s\S]*?)```/g, (_m, code) => {
    codeBlocks.push(code as string);
    return `\u0000CODE${codeBlocks.length - 1}\u0000`;
  });

  const inline = (s: string) =>
    esc(s)
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-sm">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        '<img alt="$1" src="$2" class="rounded-lg my-4 max-w-full" />'
      )
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>'
      );

  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let inQuote = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      out.push("</blockquote>");
      inQuote = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Fenced code placeholder
    const codeMatch = line.match(/^\u0000CODE(\d+)\u0000$/);
    if (codeMatch) {
      closeList();
      closeQuote();
      const code = esc(codeBlocks[Number(codeMatch[1])] || "");
      out.push(
        `<pre class="bg-muted rounded-lg p-4 overflow-x-auto text-sm my-4"><code>${code}</code></pre>`
      );
      continue;
    }

    if (!line.trim()) {
      closeList();
      closeQuote();
      continue;
    }
    if (/^---+$/.test(line)) {
      closeList();
      closeQuote();
      out.push('<hr class="my-6 border-border" />');
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)/))) {
      closeList();
      closeQuote();
      const level = m[1].length;
      const sizes = [
        "text-4xl font-bold mt-8 mb-3",
        "text-3xl font-bold mt-8 mb-3",
        "text-2xl font-semibold mt-6 mb-2",
        "text-xl font-semibold mt-5 mb-2",
        "text-lg font-semibold mt-4 mb-1",
        "text-base font-semibold mt-4 mb-1",
      ];
      const tag = `h${Math.max(2, level)}`;
      out.push(`<${tag} class="${sizes[level - 1]}">${inline(m[2])}</${tag}>`);
    } else if ((m = line.match(/^>\s?(.*)/))) {
      closeList();
      if (!inQuote) {
        out.push('<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">');
        inQuote = true;
      }
      out.push(`<p>${inline(m[1])}</p>`);
    } else if ((m = line.match(/^[-*]\s+(.*)/))) {
      closeQuote();
      if (!inList) {
        out.push('<ul class="list-disc pl-6 space-y-1 my-3">');
        inList = true;
      }
      out.push(`<li>${inline(m[1])}</li>`);
    } else {
      closeList();
      closeQuote();
      out.push(`<p class="leading-7 my-3">${inline(line)}</p>`);
    }
  }
  closeList();
  closeQuote();
  return out.join("\n");
}
