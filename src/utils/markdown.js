import { DOC_PATTERN, docUrl } from "./constants";

/* ---------- Inline ---------- */
// grup: 1 code | 2,3 gambar | 4,5 link | 6 bold | 7 italic | 8 nomor dokumen
const inlineRegex = () =>
  new RegExp(
    [
      "`([^`]+)`",
      "!\\[([^\\]]*)\\]\\((\\/aqr-img\\/[^)\\s]+)\\)",
      "\\[([^\\]]+)\\]\\((https?:\\/\\/[^)\\s]+)\\)",
      "\\*\\*([^*]+)\\*\\*",
      "\\*([^*\\s][^*]*)\\*",
      `(${DOC_PATTERN})`,
    ].join("|"),
    "g"
  );

// Menghasilkan AST inline (bukan HTML string) sehingga aman dirender oleh React.
export const parseInline = (s, { linkDoc = true } = {}) => {
  const nodes = [];
  const re = inlineRegex();
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    if (m[8] && !linkDoc) continue; // nomor dokumen di dalam link: biarkan sebagai teks
    if (m.index > last) nodes.push({ t: "text", v: s.slice(last, m.index) });
    if (m[1] !== undefined) nodes.push({ t: "code", v: m[1] });
    else if (m[3] !== undefined) nodes.push({ t: "img", alt: m[2], src: m[3] });
    else if (m[5] !== undefined) nodes.push({ t: "a", href: m[5], c: parseInline(m[4], { linkDoc: false }) });
    else if (m[6] !== undefined) nodes.push({ t: "strong", c: parseInline(m[6], { linkDoc }) });
    else if (m[7] !== undefined) nodes.push({ t: "em", c: parseInline(m[7], { linkDoc }) });
    else nodes.push({ t: "doc", v: m[8], href: docUrl(m[8]) });
    last = m.index + m[0].length;
  }
  if (last < s.length) nodes.push({ t: "text", v: s.slice(last) });
  return nodes;
};

/* ---------- Block ---------- */
const isRow = (s) => /^\s*\|.*\|\s*$/.test(s || "");
const isSep = (s) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(s || "");
const cells = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export const parseMarkdown = (src) => {
  const out = [];
  const lines = src.split("\n");
  let i = 0;
  let list = null;
  let para = [];

  const flushP = () => {
    if (para.length) {
      out.push({ t: "p", lines: para });
      para = [];
    }
  };
  const flushL = () => {
    if (list) {
      out.push({ t: "list", ordered: list.t === "ol", items: list.items });
      list = null;
    }
  };

  while (i < lines.length) {
    const l = lines[i];
    const f = l.match(/^```(\w*)/);
    if (f) {
      flushP();
      flushL();
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++;
      out.push({ t: "code", lang: f[1] || "code", code: code.join("\n") });
      continue;
    }

    if (isRow(l) && isSep(lines[i + 1])) {
      flushP();
      flushL();
      const head = cells(l);
      i += 2;
      const rows = [];
      while (i < lines.length && isRow(lines[i])) {
        rows.push(cells(lines[i]));
        i++;
      }
      out.push({ t: "table", head, rows });
      continue;
    }

    let m;
    if (!l.trim()) {
      flushP();
      flushL();
    } else if ((m = l.match(/^(#{1,4})\s+(.*)/))) {
      flushP();
      flushL();
      out.push({ t: "h", level: m[1].length < 3 ? 3 : 4, text: m[2] });
    } else if ((m = l.match(/^\s*[-*]\s+(.*)/))) {
      flushP();
      if (!list || list.t !== "ul") {
        flushL();
        list = { t: "ul", items: [] };
      }
      list.items.push(m[1]);
    } else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) {
      flushP();
      if (!list || list.t !== "ol") {
        flushL();
        list = { t: "ol", items: [] };
      }
      list.items.push(m[1]);
    } else {
      flushL();
      para.push(l);
    }
    i++;
  }
  flushP();
  flushL();
  return out;
};

/* Qwen3 mengirim <think>...</think> sebelum jawaban */
export const parseThink = (raw) => {
  const m = raw.match(/^\s*<think>([\s\S]*?)(<\/think>|$)/);
  if (!m) return { think: "", ans: raw.trim(), open: false };
  return { think: m[1].trim(), ans: raw.slice(m[0].length).trim(), open: !m[2] };
};
