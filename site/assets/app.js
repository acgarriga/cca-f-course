// Comportamiento común de las páginas de apuntes: tema, menú móvil,
// barra de lectura, índice activo y diagramas Mermaid.
(function () {
  const root = document.documentElement;
  const themeBtn = document.getElementById("themeBtn");
  const isDark = () => root.getAttribute("data-theme") === "dark";

  // ---- Tema ----
  function paintThemeBtn() { themeBtn.textContent = isDark() ? "☀️" : "🌙"; }
  themeBtn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("examccarf-theme", next); } catch (e) {}
    paintThemeBtn();
    renderMermaid();
  });
  paintThemeBtn();

  // ---- Menú móvil ----
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("backdrop");
  function toggleSidebar(force) {
    const open = force === undefined ? !sidebar.classList.contains("open") : force;
    sidebar.classList.toggle("open", open);
    backdrop.classList.toggle("show", open);
  }
  document.getElementById("menuBtn").addEventListener("click", () => toggleSidebar());
  backdrop.addEventListener("click", () => toggleSidebar(false));
  sidebar.addEventListener("click", e => { if (e.target.closest("a")) toggleSidebar(false); });

  // ---- Barra de lectura ----
  const progress = document.getElementById("progress");
  window.addEventListener("scroll", () => {
    const max = root.scrollHeight - root.clientHeight;
    progress.style.width = (max > 0 ? root.scrollTop / max * 100 : 0) + "%";
  }, { passive: true });

  // ---- Índice activo: la última sección cuyo título ya ha pasado el 30 % superior ----
  const tocLinks = [...document.querySelectorAll(".toc a")];
  const targets = tocLinks.map(a => [document.getElementById(decodeURIComponent(a.hash.slice(1))), a]).filter(([t]) => t);
  function updateToc() {
    const limit = window.innerHeight * 0.3;
    let current = null;
    for (const [t, a] of targets) { if (t.getBoundingClientRect().top <= limit) current = a; else break; }
    tocLinks.forEach(a => a.classList.toggle("active", a === current));
  }
  if (targets.length) { window.addEventListener("scroll", updateToc, { passive: true }); updateToc(); }

  // ---- Mermaid (solo en páginas que lo cargan) ----
  const diagrams = [...document.querySelectorAll("pre.mermaid")];
  diagrams.forEach(d => { d.dataset.src = d.textContent; });
  function renderMermaid() {
    if (!window.mermaid || !diagrams.length) return;
    diagrams.forEach(d => { d.removeAttribute("data-processed"); d.textContent = d.dataset.src; });
    window.mermaid.initialize({ startOnLoad: false, theme: isDark() ? "dark" : "neutral", securityLevel: "strict" });
    window.mermaid.run({ nodes: diagrams });
  }
  renderMermaid();
})();
