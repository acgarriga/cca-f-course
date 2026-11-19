// Utilidades compartidas por la práctica y los simulacros.
window.CCARFUtil = (function () {
  // Crea un elemento: $("div", { class: "x", onclick: fn, html: "<b>…</b>" }, hijo1, "texto", …)
  function $(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach(k => k != null && k !== false && el.append(k.nodeType ? k : document.createTextNode(k)));
    return el;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Markdown mínimo de las preguntas: `código`, **negrita**, *cursiva*.
  const mdInline = s => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, "$1<em>$2</em>");

  // Generador pseudoaleatorio con semilla (mulberry32): mismo seed → misma secuencia.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rand = Math.random) {
    const r = arr.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  }

  // Almacenamiento local con valor por defecto.
  const store = {
    get(key, def) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? def; } catch (e) { return def; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} },
    del(key) { try { localStorage.removeItem(key); } catch (e) {} },
  };

  // Idioma de las preguntas (compartido entre práctica y simulacros).
  const LANG_KEY = "ccarf-lang";
  const hasEs = q => !!(q.stem_es && q.options_es && q.explanation_es);
  const lang = { get: () => store.get(LANG_KEY, "en"), set: v => store.set(LANG_KEY, v) };
  function qText(q, field, letter) {
    const es = lang.get() === "es" && hasEs(q);
    if (field === "options") return (es && q.options_es?.[letter]) || q.options[letter];
    if (field === "rationale") return (es && q.rationale_es?.[letter]) || q.rationale?.[letter];
    return (es && q[field + "_es"]) || q[field];
  }

  // Cuando se barajan las opciones, reescribe «Option B» / «Opciones A y C» con las letras nuevas.
  function remapLetters(text, map) {
    return text.replace(/\b([Oo]ptions?|[Oo]pci(?:ón|ones))(\s+)([A-F](?:(?:,\s*|\s+(?:and|or|y|o|e)\s+|,\s+(?:and|or|y|o)\s+)[A-F])*)\b/g,
      (m, word, sp, list) => word + sp + list.replace(/\b[A-F]\b/g, l => map[l] || l));
  }


  // Exportar / importar el progreso (práctica, simulacros y preferencias) como archivo JSON.
  const PROGRESS_KEYS = k => k.startsWith("ccarf-") || k === "examccarf-theme";
  function exportProgress() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (PROGRESS_KEYS(k)) data[k] = store.get(k, null);
    }
    const blob = new Blob([JSON.stringify({ app: "ccarf-web", version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    const a = $("a", { href: URL.createObjectURL(blob), download: `ccarf-progreso-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importProgress(file, done) {
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(reader.result); } catch (e) { return done("El archivo no es un JSON válido."); }
      if (!parsed || parsed.app !== "ccarf-web" || typeof parsed.data !== "object") return done("El archivo no es una exportación de esta web.");
      const keys = Object.keys(parsed.data).filter(PROGRESS_KEYS);
      if (!confirm(`Se sustituirá tu progreso actual en este navegador por el del archivo (${keys.length} elementos, exportado el ${(parsed.exportedAt || "").slice(0, 10)}). ¿Continuar?`)) return done(null);
      for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (PROGRESS_KEYS(k)) store.del(k); }
      keys.forEach(k => store.set(k, parsed.data[k]));
      done(null, true);
    };
    reader.readAsText(file);
  }
  function progressBox() {
    const msg = $("span", { class: "muted" });
    const fileInput = $("input", { type: "file", accept: "application/json,.json", hidden: true });
    fileInput.addEventListener("change", () => {
      if (!fileInput.files[0]) return;
      importProgress(fileInput.files[0], (err, ok) => {
        if (err) msg.textContent = err;
        if (ok) location.reload();
        fileInput.value = "";
      });
    });
    return $("details", { class: "options-box progress-box" },
      $("summary", {}, "Guardar o recuperar tu progreso"),
      $("p", { class: "muted" }, "El progreso se guarda solo en este navegador. Expórtalo a un archivo para tener una copia o para pasarlo a otro navegador u ordenador."),
      $("div", { class: "practice-actions tight" },
        $("button", { class: "btn", onclick: exportProgress }, "⬇ Exportar progreso"),
        $("button", { class: "btn", onclick: () => fileInput.click() }, "⬆ Importar progreso"),
        fileInput, msg));
  }

  const SOURCE_LABEL = { "guia-oficial": "Guía oficial", "examen-1": "Examen 1", "generada": "Generada" };

  return { $, esc, mdInline, rng, shuffle, store, lang, hasEs, qText, remapLetters, SOURCE_LABEL, progressBox };
})();
