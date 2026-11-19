// Genera la web estática en site/ a partir de los .md de la raíz del repo.
// Uso: npm run build  →  abre site/index.html con doble clic (no hace falta servidor).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "site");
const webDir = path.join(root, "web");
const readJson = f => JSON.parse(fs.readFileSync(path.join(root, "questions", f), "utf8"));
const { domains } = readJson("domains.json");
const { scenarios } = readJson("scenarios.json");
const { questions } = readJson("bank.json");
const countByTask = questions.reduce((m, q) => m.set(q.task, (m.get(q.task) || 0) + 1), new Map());

// ---------------------------------------------------------------------------
// Páginas, en el orden de la navegación. `src` relativo a la raíz del repo.
// ---------------------------------------------------------------------------
const PAGES = [
  { src: "00-guide.md", out: "index.html", nav: "Inicio", code: "★" },
  { src: "00-index.md", out: "00-index.html", nav: "Índice de recursos", code: "≡", toc: true, wide: true },
  ...domains.map(d => ({ src: d.notes, out: d.notes.replace(/\.md$/, ".html"), nav: d.title_es, code: d.code, toc: true })),
];
const EXTRA_NAV = [
  { href: "simulacros.html", nav: "Simulacros de examen", code: "⏱", rootId: "exam", script: "exam.js", title: "Simulacros" },
  { href: "practica.html", nav: "Practicar por dominio o task", code: "✎", rootId: "practice", script: "practice.js", title: "Práctica" },
];

// Nombre de fichero sin extensión → página generada (para wikilinks y enlaces .md).
const pageByName = new Map(PAGES.map(p => [p.src.replace(/\.md$/, ""), p]));
const taskIds = new Set(domains.flatMap(d => d.tasks.map(t => t.id)));

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Slug estable para anclas: sin acentos, minúsculas, solo [a-z0-9-].
function slugify(text) {
  return text
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[*_`~]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "seccion";
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------
function createMarkdown(state) {
  const md = new MarkdownIt({
    html: true, // para los <details> de soluciones
    linkify: false,
    typographer: false,
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return `<pre><code class="hljs language-${lang}">${hljs.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      }
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    },
  });

  // Wikilinks de Obsidian: [[fichero]], [[fichero#encabezado]], [[fichero|alias]].
  md.inline.ruler.before("link", "wikilink", (s, silent) => {
    if (s.src.charCodeAt(s.pos) !== 0x5b || s.src.charCodeAt(s.pos + 1) !== 0x5b) return false;
    const end = s.src.indexOf("]]", s.pos + 2);
    if (end < 0) return false;
    const raw = s.src.slice(s.pos + 2, end);
    if (!raw || raw.includes("\n")) return false;
    if (!silent) {
      const [target, alias] = raw.split("|");
      const [file, heading] = target.split("#").map(x => x?.replace(/\s+/g, " ").trim());
      const tok = s.push("wikilink", "", 0);
      tok.meta = { file, heading, alias: alias?.trim() };
    }
    s.pos = end + 2;
    return true;
  });
  md.renderer.rules.wikilink = (tokens, i) => {
    const { file, heading, alias } = tokens[i].meta;
    const page = pageByName.get(file);
    if (page) {
      const href = page.out + (heading ? "#" + slugify(heading) : "");
      state.links.push(href);
      const label = alias || (heading ? `${page.nav} › ${heading}` : page.nav);
      return `<a href="${href}">${escapeHtml(label)}</a>`;
    }
    if (file === "...") return "[[...]]";
    // Apuntes del vault de Obsidian que no se publican en la web.
    const label = alias || (heading ? heading : file);
    const title = `Apunte de Obsidian: ${file}${heading ? " › " + heading : ""} (no incluido en la web)`;
    state.noteRefs++;
    return `<span class="note-ref" title="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
  };

  // Ids de encabezados + índice de la página.
  md.core.ruler.push("heading_ids", s => {
    const used = new Map();
    s.tokens.forEach((tok, i) => {
      if (tok.type !== "heading_open") return;
      const inline = s.tokens[i + 1];
      const text = inline.children.filter(c => c.type === "text" || c.type === "code_inline").map(c => c.content).join("");
      let id = slugify(text);
      const n = used.get(id) || 0;
      used.set(id, n + 1);
      if (n) id += "-" + n;
      tok.attrSet("id", id);
      state.ids.add(id);
      const level = +tok.tag.slice(1);
      if (level === 1 && !state.title) state.title = text.trim();
      if (level === 2) state.toc.push({ id, text: text.trim() });
      const task = level === 2 && state.page.toc && text.match(/^([1-5]\.[1-7])\s/)?.[1];
      if (task && taskIds.has(task)) s.tokens[i + 2].meta = { task };
    });
  });

  // Botón «Practicar N.M» bajo el título de cada task statement.
  md.renderer.rules.heading_close = (tokens, i, opts, env, self) => {
    const close = self.renderToken(tokens, i, opts);
    const task = tokens[i].meta?.task;
    if (!task) return close;
    const n = countByTask.get(task) || 0;
    return n
      ? `${close}<a class="practice-chip" href="practica.html?task=${task}">✎ Practicar ${task} · ${n} pregunta${n === 1 ? "" : "s"}</a>\n`
      : `${close}<span class="practice-chip empty">Aún no hay preguntas de ${task}</span>\n`;
  };

  // Enlaces: .md → .html, externos en pestaña nueva.
  const defaultLink = md.renderer.rules.link_open || ((t, i, o, e, self) => self.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, i, opts, env, self) => {
    const tok = tokens[i];
    let href = tok.attrGet("href") || "";
    const m = href.match(/^([^/:#?]+)\.md(#.*)?$/);
    if (m && pageByName.has(m[1])) {
      href = pageByName.get(m[1]).out + (m[2] || "");
      tok.attrSet("href", href);
    }
    if (/^https?:/.test(href)) {
      tok.attrSet("target", "_blank");
      tok.attrSet("rel", "noopener");
    } else if (href && !href.startsWith("#")) {
      state.links.push(href);
    } else if (href.startsWith("#")) {
      state.links.push(state.page.out + href);
    }
    return defaultLink(tokens, i, opts, env, self);
  };

  // Mermaid: se pinta en el navegador.
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, i, opts, env, self) => {
    if (tokens[i].info.trim() === "mermaid") {
      state.mermaid = true;
      return `<pre class="mermaid">${escapeHtml(tokens[i].content)}</pre>\n`;
    }
    return defaultFence(tokens, i, opts, env, self);
  };

  // Tablas con scroll horizontal; las de 5+ columnas se marcan como anchas.
  md.renderer.rules.table_open = (tokens, i) => {
    let cols = 0;
    for (let j = i; j < tokens.length && tokens[j].type !== "tr_close"; j++) if (tokens[j].type === "th_open") cols++;
    return `<div class="table-wrap${cols >= 5 ? " wide" : ""}"><table>\n`;
  };
  md.renderer.rules.table_close = () => "</table></div>\n";

  return md;
}

// ---------------------------------------------------------------------------
// Plantilla
// ---------------------------------------------------------------------------
const template = fs.readFileSync(path.join(webDir, "templates", "page.html"), "utf8");
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");

function renderNav(current, toc, activeHref) {
  const item = (href, code, label, active) =>
    `      <a class="lesson-btn nav-item${active ? " active" : ""}" href="${href}"><span class="code">${code}</span><span class="txt">${escapeHtml(label)}</span></a>`;
  const lines = ['    <div class="nav-label">Apuntes</div>', "    <nav>"];
  for (const p of PAGES) {
    const active = p === current;
    lines.push(item(p.out, p.code, p.nav, active));
    if (active && toc.length && p.toc) {
      lines.push('      <div class="toc">');
      for (const t of toc) {
        const m = t.text.match(/^(\d\.\d)\s+(.*)$/);
        const label = m ? `<span class="num">${m[1]}</span>${escapeHtml(m[2])}` : escapeHtml(t.text);
        lines.push(`        <a href="#${t.id}">${label}</a>`);
      }
      lines.push("      </div>");
    }
  }
  lines.push("    </nav>", '    <div class="nav-label">Práctica</div>', "    <nav>");
  for (const x of EXTRA_NAV) lines.push(item(x.href, x.code, x.nav, x.href === activeHref));
  lines.push("    </nav>");
  return lines.join("\n");
}

function renderPager(i) {
  const prev = PAGES[i - 1], next = PAGES[i + 1];
  if (!prev && !next) return "";
  const a = (p, cls, label) => (p ? `<a class="${cls}" href="${p.out}"><small>${label}</small>${escapeHtml(p.nav)}</a>` : "<span></span>");
  return `<nav class="pager">${a(prev, "prev", "← Anterior")}${a(next, "next", "Siguiente →")}</nav>`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "assets"), { recursive: true });

const date = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
const results = [];
let anyMermaid = false;

PAGES.forEach((page, i) => {
  const state = { page, ids: new Set(), toc: [], links: [], title: "", mermaid: false, noteRefs: 0 };
  const md = createMarkdown(state);
  const src = fs.readFileSync(path.join(root, page.src), "utf8");
  const content = md.render(src);
  anyMermaid ||= state.mermaid;
  const html = fill(template, {
    title: escapeHtml(state.title || page.nav),
    nav: renderNav(page, state.toc),
    content,
    pager: renderPager(i),
    contentClass: page.wide ? " wide-page" : "",
    date,
    scripts: state.mermaid ? '<script src="assets/mermaid.min.js"></script>' : "",
  });
  fs.writeFileSync(path.join(out, page.out), html);
  results.push({ page, state });
});

// ---------------------------------------------------------------------------
// Banco de preguntas → assets/questions.js (con <script>, porque fetch() no funciona en file://)
// ---------------------------------------------------------------------------
const taskLinks = {};
for (const { page, state } of results) {
  if (!page.toc || page.wide) continue;
  for (const t of state.toc) {
    const task = t.text.match(/^([1-5]\.[1-7])\s/)?.[1];
    if (task) taskLinks[task] = `${page.out}#${t.id}`;
  }
}
const missingLinks = [...taskIds].filter(t => !taskLinks[t]);
const data = { domains, scenarios, questions, taskLinks, generated: new Date().toISOString() };
fs.writeFileSync(path.join(out, "assets", "questions.js"), `// Generado por web/build.mjs desde questions/*.json. No editar.\nwindow.CCARF = ${JSON.stringify(data)};\n`);

// Páginas de práctica y simulacros
for (const x of EXTRA_NAV) {
  fs.writeFileSync(path.join(out, x.href), fill(template, {
    title: x.title,
    nav: renderNav(null, [], x.href),
    content: `<div id="${x.rootId}"><noscript>Esta página necesita JavaScript.</noscript></div>`,
    pager: "",
    date,
    contentClass: "",
    scripts: `<script src="assets/questions.js"></script>\n<script src="assets/util.js"></script>\n<script src="assets/${x.script}"></script>`,
  }));
}

for (const f of fs.readdirSync(path.join(webDir, "assets"))) fs.copyFileSync(path.join(webDir, "assets", f), path.join(out, "assets", f));
if (anyMermaid) fs.copyFileSync(path.join(root, "node_modules", "mermaid", "dist", "mermaid.min.js"), path.join(out, "assets", "mermaid.min.js"));

// ---------------------------------------------------------------------------
// Comprobación de enlaces internos (páginas y anclas)
// ---------------------------------------------------------------------------
const idsByFile = new Map(results.map(r => [r.page.out, r.state.ids]));
const extra = new Set(EXTRA_NAV.map(x => x.href.split("?")[0]));
const broken = [];
for (const { page, state } of results) {
  for (const link of state.links) {
    const [file, hash] = link.split("#");
    if (extra.has(file)) continue;
    if (!idsByFile.has(file)) { broken.push(`${page.src}: página inexistente ${link}`); continue; }
    if (hash && !idsByFile.get(file).has(decodeURIComponent(hash))) broken.push(`${page.src}: ancla inexistente ${link}`);
  }
}

console.log(`Web generada en site/ (${results.length} páginas):`);
for (const { page, state } of results) {
  const extras = [state.toc.length && `${state.toc.length} secciones`, state.noteRefs && `${state.noteRefs} refs. a apuntes de Obsidian`, state.mermaid && "Mermaid"].filter(Boolean).join(", ");
  console.log(`  ${page.out.padEnd(34)} ${extras}`);
}
if (broken.length) {
  console.warn(`\n${broken.length} enlaces internos rotos:`);
  broken.forEach(b => console.warn("  " + b));
} else {
  console.log("\nEnlaces internos: todos correctos.");
}
console.log(`Preguntas: ${questions.length} en assets/questions.js`);
if (missingLinks.length) console.warn(`Tasks sin sección en los apuntes: ${missingLinks.join(", ")}`);
console.log("\nAbre site/index.html en el navegador.");
