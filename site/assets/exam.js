// Simulacros de examen: 60 preguntas de 4 escenarios en 120 minutos (o 20 en 40 minutos),
// corrección al entregar, informe por dominio y task, e historial de intentos.
// Datos: window.CCARF. Estado: localStorage "ccarf-exam-current" e "ccarf-exam-history".
(function () {
  const { domains, scenarios, questions, taskLinks } = window.CCARF;
  const U = window.CCARFUtil;
  const { $, mdInline, store, lang, hasEs, qText } = U;
  const root = document.getElementById("exam");
  const CUR = "ccarf-exam-current", HIST = "ccarf-exam-history", PREFS = "ccarf-exam-prefs";
  const MODES = {
    full: { label: "Simulacro completo", n: 60, minutes: 120, scenarios: 4 },
    short: { label: "Simulacro corto", n: 20, minutes: 40, scenarios: 4 },
  };
  const PASS = 720;
  const qById = new Map(questions.map(q => [q.id, q]));
  const scById = new Map(scenarios.map(s => [s.id, s]));
  const domById = new Map(domains.map(d => [d.id, d]));
  const taskById = new Map(domains.flatMap(d => d.tasks.map(t => [t.id, t])));
  let timerHandle = null;
  const add = (...kids) => root.append(...kids.flat().filter(k => k != null && k !== false));

  // Nota orientativa: Anthropic no publica cómo escala la nota, así que es lineal 100–1000.
  const scaled = pct => Math.round(100 + 900 * pct);
  const fmtDate = ts => new Date(ts).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  route();
  window.addEventListener("hashchange", route);

  function route() {
    clearInterval(timerHandle);
    root.replaceChildren();
    window.scrollTo(0, 0);
    const hash = location.hash.slice(1);
    const cur = store.get(CUR, null);
    if (hash === "examen" && cur) return renderExam(cur);
    if (hash.startsWith("informe/")) {
      const att = store.get(HIST, []).find(a => a.id === hash.slice(8));
      if (att) return renderReport(att);
    }
    renderHome();
  }
  const go = h => { if (location.hash === "#" + h) route(); else location.hash = h; };

  // ======================================================================
  // Generación de un simulacro
  // ======================================================================
  function quotas(n) {
    // Reparto por peso con el método del mayor resto: 60 → 16/11/12/12/9.
    const total = domains.reduce((s, d) => s + d.weight, 0);
    const raw = domains.map(d => ({ id: d.id, x: n * d.weight / total }));
    raw.forEach(r => { r.q = Math.floor(r.x); r.rem = r.x - r.q; });
    let left = n - raw.reduce((s, r) => s + r.q, 0);
    [...raw].sort((a, b) => b.rem - a.rem).forEach(r => { if (left > 0) { r.q++; left--; } });
    return Object.fromEntries(raw.map(r => [r.id, r.q]));
  }

  function canShuffle(q) {
    const wrong = Object.keys(q.options).filter(l => !q.correct.includes(l));
    return q.rationale && wrong.every(l => q.rationale[l]);
  }

  function generate(modeId, seed, prefs) {
    const mode = MODES[modeId];
    const rand = U.rng(seed);
    const seen = new Set(store.get(HIST, []).flatMap(a => a.ids));
    const chosen = U.shuffle(scenarios.map(s => s.id), rand).slice(0, mode.scenarios);
    const eligible = questions.filter(q => q.reviewed || prefs.unreviewed);
    // Prioridad: escenario elegido > no vista (si se pide) > azar con semilla.
    const key = q => [chosen.includes(q.scenario) ? 0 : 1, prefs.unseen && seen.has(q.id) ? 1 : 0, rand()];
    const keyed = eligible.map(q => ({ q, k: key(q) }));
    const cmp = (a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.k[2] - b.k[2];
    const picked = [];
    const want = quotas(Math.min(mode.n, eligible.length));
    for (const d of domains) {
      keyed.filter(x => x.q.domain === d.id).sort(cmp).slice(0, want[d.id]).forEach(x => picked.push(x.q));
    }
    // Si a algún dominio le faltan preguntas, se completa con las mejores de los demás.
    if (picked.length < Math.min(mode.n, eligible.length)) {
      const ids = new Set(picked.map(q => q.id));
      keyed.filter(x => !ids.has(x.q.id)).sort(cmp).slice(0, mode.n - picked.length).forEach(x => picked.push(x.q));
    }
    // Orden del examen: agrupadas por escenario (como el real), barajadas dentro de cada uno.
    const scOrder = [...chosen, ...scenarios.map(s => s.id).filter(s => !chosen.includes(s))];
    const ordered = scOrder.flatMap(sc => U.shuffle(picked.filter(q => q.scenario === sc), rand));
    const optionOrders = {};
    ordered.forEach(q => {
      const letters = Object.keys(q.options);
      optionOrders[q.id] = canShuffle(q) ? U.shuffle(letters, rand) : letters;
    });
    return {
      id: `${Date.now().toString(36)}-${seed}`, seed, mode: modeId, scenarios: chosen,
      ids: ordered.map(q => q.id), optionOrders, answers: {}, marked: {}, current: 0,
      startedAt: Date.now(), endsAt: Date.now() + mode.minutes * 60000,
    };
  }

  function startExam(modeId, seed, prefs, fixed) {
    const cur = fixed
      ? { ...fixed, id: `${Date.now().toString(36)}-${fixed.seed}`, answers: {}, marked: {}, current: 0, startedAt: Date.now(), endsAt: Date.now() + MODES[fixed.mode].minutes * 60000 }
      : generate(modeId, seed, prefs);
    store.set(CUR, cur);
    go("examen");
  }

  // ======================================================================
  // Portada: empezar, continuar e historial
  // ======================================================================
  function renderHome() {
    document.title = "Simulacros · CCAR-F";
    const cur = store.get(CUR, null);
    const hist = store.get(HIST, []);
    const prefs = store.get(PREFS, { unseen: true, unreviewed: false });
    const reviewed = questions.filter(q => q.reviewed).length;
    const seedInput = $("input", { type: "number", min: 1, placeholder: "aleatoria", class: "seed-input" });

    add(
      $("h1", {}, "Simulacros de examen"),
      $("p", { class: "lead" }, "Como el examen real: preguntas agrupadas por escenario (4 de los 6 de la guía), repartidas según el peso de cada dominio, con tiempo límite y sin corrección hasta entregar. Aprobado: 720 sobre 1.000."),
      cur ? $("div", { class: "notice" },
        $("div", {}, $("strong", {}, `Tienes un ${MODES[cur.mode].label.toLowerCase()} a medias`), ` · ${Object.keys(cur.answers).length}/${cur.ids.length} respondidas · ${cur.endsAt > Date.now() ? "quedan " + fmtTime((cur.endsAt - Date.now()) / 1000) : "tiempo agotado"}`),
        $("div", { class: "practice-actions tight" },
          $("a", { class: "btn primary", href: "#examen" }, "Continuar"),
          $("button", { class: "btn", onclick: () => confirmBox("¿Abandonar el simulacro en curso? No se guardará en el historial.", () => { store.del(CUR); route(); }) }, "Abandonar"))) : null,
      $("div", { class: "mode-cards" }, Object.entries(MODES).map(([id, m]) =>
        $("div", { class: "mode-card" },
          $("h2", {}, m.label),
          $("p", { class: "muted" }, `${m.n} preguntas · ${m.minutes} minutos · ${m.scenarios} escenarios`),
          $("button", {
            class: "btn primary", disabled: !!cur,
            title: cur ? "Termina o abandona el simulacro en curso" : null,
            onclick: () => {
              const p = { unseen: unseen.checked, unreviewed: unrev.checked };
              store.set(PREFS, p);
              startExam(id, +seedInput.value || Math.floor(Math.random() * 99999) + 1, p);
            },
          }, "Empezar")))),
    );
    const unseen = $("input", { type: "checkbox", checked: prefs.unseen });
    const unrev = $("input", { type: "checkbox", checked: prefs.unreviewed });
    add($("details", { class: "options-box" },
      $("summary", {}, "Opciones"),
      $("label", {}, unseen, " Dar prioridad a preguntas que no han salido en simulacros anteriores"),
      $("label", {}, unrev, ` Incluir preguntas sin revisar (${questions.length - reviewed} de ${questions.length})`),
      $("label", {}, "Semilla: ", seedInput, $("span", { class: "muted" }, " · la misma semilla y el mismo banco dan el mismo examen"))));

    add($("h2", {}, "Historial"));
    if (!hist.length) {
      add($("p", { class: "muted" }, "Aún no has hecho ningún simulacro."));
    } else {
      const table = $("table", {},
        $("thead", {}, $("tr", {}, ["Fecha", "Tipo", "Nota", "Aciertos", ...domains.map(d => d.code), ""].map(h => $("th", {}, h)))),
        $("tbody", {}, hist.slice().reverse().map(a => $("tr", {},
          $("td", {}, fmtDate(a.finishedAt)),
          $("td", {}, `${MODES[a.mode].label.replace("Simulacro ", "")} · #${a.seed}`),
          $("td", {}, $("span", { class: "grade " + (a.scaled >= PASS ? "pass" : "fail") }, String(a.scaled))),
          $("td", {}, `${a.correct}/${a.ids.length}`),
          ...domains.map(d => $("td", { class: "num" }, a.byDomain[d.id] ? `${Math.round(a.byDomain[d.id].pct * 100)} %` : "—")),
          $("td", {}, $("a", { href: `#informe/${a.id}` }, "Informe"))))));
      add($("div", { class: "table-wrap" }, table), trendChart(hist));
    }
    add(window.CCARFUtil.progressBox());
  }

  // Evolución de la nota (SVG sencillo, sin dependencias).
  function trendChart(hist) {
    if (hist.length < 2) return null;
    const W = 640, H = 160, P = 28;
    const xs = i => P + i * (W - 2 * P) / (hist.length - 1);
    const ys = v => H - P - (v - 100) / 900 * (H - 2 * P);
    const pts = hist.map((a, i) => `${xs(i)},${ys(a.scaled)}`).join(" ");
    const svg = `<svg viewBox="0 0 ${W} ${H}" class="trend" role="img" aria-label="Evolución de la nota">
      <line x1="${P}" x2="${W - P}" y1="${ys(PASS)}" y2="${ys(PASS)}" class="pass-line"/>
      <text x="${W - P}" y="${ys(PASS) - 5}" text-anchor="end" class="pass-label">720</text>
      <polyline points="${pts}" class="trend-line"/>
      ${hist.map((a, i) => `<circle cx="${xs(i)}" cy="${ys(a.scaled)}" r="4" class="${a.scaled >= PASS ? "pass" : "fail"}"><title>${fmtDate(a.finishedAt)}: ${a.scaled}</title></circle>`).join("")}
    </svg>`;
    return $("figure", { class: "trend-fig" }, $("div", { html: svg }), $("figcaption", { class: "muted" }, "Evolución de la nota (línea: aprobado)"));
  }

  // ======================================================================
  // Examen en curso
  // ======================================================================
  function renderExam(cur) {
    const mode = MODES[cur.mode];
    document.title = `${mode.label} · CCAR-F`;
    const save = () => store.set(CUR, cur);
    const qs = cur.ids.map(id => qById.get(id)).filter(Boolean);
    if (qs.length !== cur.ids.length) cur.ids = qs.map(q => q.id);

    const timer = $("span", { class: "timer" });
    const progress = $("span");
    const grid = $("div", { class: "qgrid" });
    const panel = $("div", { class: "exam-panel" });
    const langBtn = $("button", { class: "btn", disabled: !qs.some(hasEs), onclick: () => { lang.set(lang.get() === "es" ? "en" : "es"); draw(); } });

    add(
      $("div", { class: "exam-bar" },
        $("strong", {}, mode.label), $("span", { class: "muted" }, ` #${cur.seed}`),
        $("span", { class: "spacer" }), progress, timer,
        $("button", { class: "btn primary", onclick: () => submitAsk() }, "Entregar")),
      $("div", { class: "exam-layout" }, panel, $("aside", { class: "exam-side" }, $("p", { class: "muted" }, "Preguntas"), grid, $("div", { class: "legend muted" }, $("span", { class: "dot answered" }), " respondida ", $("span", { class: "dot marked" }), " marcada"), langBtn)));

    function tick() {
      const left = (cur.endsAt - Date.now()) / 1000;
      timer.textContent = "⏱ " + fmtTime(Math.max(0, left));
      timer.classList.toggle("low", left < 600);
      if (left <= 0) { clearInterval(timerHandle); finish(cur, true); }
    }
    tick();
    timerHandle = setInterval(tick, 1000);

    function draw() {
      langBtn.textContent = lang.get() === "es" ? "🇬🇧 Ver en inglés" : "🇪🇸 Ver en español";
      const i = cur.current, q = qs[i];
      const sc = scById.get(q.scenario);
      const firstOfScenario = i === 0 || qs[i - 1].scenario !== q.scenario;
      const order = cur.optionOrders[q.id] || Object.keys(q.options);
      const display = Object.keys(q.options); // letras mostradas: A, B, C…
      const sel = new Set(cur.answers[q.id] || []);
      const multiple = q.type === "multiple";

      panel.replaceChildren(
        $("details", { class: "scenario-box", open: firstOfScenario },
          $("summary", {}, `Escenario: ${lang.get() === "es" ? sc.title_es : sc.title}`),
          $("p", {}, lang.get() === "es" && sc.description_es ? sc.description_es : sc.description)),
        $("div", { class: "q-meta" }, $("span", { class: "qnum" }, `Pregunta ${i + 1} de ${qs.length}`),
          multiple ? $("span", { class: "chip" }, `Selecciona ${q.select}`) : null),
        $("div", { class: "stem", html: mdInline(qText(q, "stem")) }),
        $("div", { class: "options" }, order.map((orig, k) => {
          const shown = display[k];
          return $("button", {
            type: "button", class: "option" + (sel.has(orig) ? " picked" : ""),
            html: `<b>${shown}.</b> ${mdInline(qText(q, "options", orig))}`,
            onclick: () => {
              if (multiple) { sel.has(orig) ? sel.delete(orig) : sel.size < q.select && sel.add(orig); }
              else { sel.clear(); sel.add(orig); }
              if (sel.size) cur.answers[q.id] = [...sel]; else delete cur.answers[q.id];
              save(); draw();
            },
          });
        })),
        $("div", { class: "exam-nav" },
          $("button", { class: "btn", disabled: i === 0, onclick: () => { cur.current--; save(); draw(); } }, "← Anterior"),
          $("label", { class: "mark" }, $("input", { type: "checkbox", checked: !!cur.marked[q.id], onchange: e => { e.target.checked ? cur.marked[q.id] = true : delete cur.marked[q.id]; save(); drawGrid(); } }), " Marcar para revisar"),
          i < qs.length - 1
            ? $("button", { class: "btn primary", onclick: () => { cur.current++; save(); draw(); } }, "Siguiente →")
            : $("button", { class: "btn primary", onclick: () => submitAsk() }, "Entregar")));
      drawGrid();
      window.scrollTo(0, 0);
    }

    function drawGrid() {
      grid.replaceChildren(...qs.map((q, k) => $("button", {
        class: ["qcell", cur.answers[q.id] && "answered", cur.marked[q.id] && "marked", k === cur.current && "current"].filter(Boolean).join(" "),
        title: scById.get(q.scenario).title,
        onclick: () => { cur.current = k; save(); draw(); },
      }, String(k + 1))));
      progress.textContent = `${Object.keys(cur.answers).length}/${qs.length} respondidas`;
    }

    function submitAsk() {
      const pending = qs.length - Object.keys(cur.answers).length;
      const marked = Object.keys(cur.marked).length;
      const msg = [pending && `${pending} sin responder`, marked && `${marked} marcadas para revisar`].filter(Boolean).join(" y ");
      confirmBox(msg ? `Te quedan ${msg}. ¿Entregar de todas formas?` : "¿Entregar el simulacro?", () => finish(cur, false));
    }

    draw();
  }

  function finish(cur, timeout) {
    clearInterval(timerHandle);
    const qs = cur.ids.map(id => qById.get(id)).filter(Boolean);
    const isRight = q => { const a = cur.answers[q.id] || []; return a.length === q.correct.length && a.every(l => q.correct.includes(l)); };
    const byDomain = {}, byTask = {};
    qs.forEach(q => {
      const ok = isRight(q);
      for (const [m, k] of [[byDomain, q.domain], [byTask, q.task]]) {
        m[k] = m[k] || { n: 0, ok: 0 };
        m[k].n++; if (ok) m[k].ok++;
      }
    });
    Object.values(byDomain).concat(Object.values(byTask)).forEach(x => { x.pct = x.ok / x.n; });
    const correct = qs.filter(isRight).length;
    const att = {
      id: cur.id, seed: cur.seed, mode: cur.mode, scenarios: cur.scenarios, ids: cur.ids, optionOrders: cur.optionOrders,
      answers: cur.answers, startedAt: cur.startedAt, finishedAt: Date.now(), timeout,
      correct, pct: correct / qs.length, scaled: scaled(correct / qs.length), byDomain, byTask,
    };
    store.set(HIST, [...store.get(HIST, []), att]);
    store.del(CUR);
    go(`informe/${att.id}`);
  }

  // ======================================================================
  // Informe
  // ======================================================================
  function renderReport(a) {
    document.title = "Informe · Simulacro · CCAR-F";
    const qs = a.ids.map(id => qById.get(id)).filter(Boolean);
    const pass = a.scaled >= PASS;
    const mins = Math.round((a.finishedAt - a.startedAt) / 60000);
    const filter = { value: "all" };
    const list = $("div", { class: "quiz" });

    add(
      $("p", { class: "crumbs" }, $("a", { href: "#" }, "← Simulacros")),
      $("h1", {}, `Informe · ${MODES[a.mode].label} #${a.seed}`),
      $("p", { class: "muted" }, `${fmtDate(a.finishedAt)} · ${mins} min${a.timeout ? " (tiempo agotado)" : ""} · Escenarios: ${a.scenarios.map(s => scById.get(s)?.title_es).join(", ")}`),
      $("div", { class: "result-hero " + (pass ? "pass" : "fail") },
        $("div", { class: "big" }, String(a.scaled)),
        $("div", {},
          $("strong", {}, pass ? "Aprobado" : "No aprobado"),
          $("div", {}, `${a.correct} de ${a.ids.length} correctas (${Math.round(a.pct * 100)} %)`),
          $("div", { class: "muted small" }, "Nota orientativa: escala lineal 100–1.000; Anthropic no publica cómo escala la real."))),
      $("h2", {}, "Por dominio"),
      $("div", { class: "domain-bars" }, domains.map(d => {
        const x = a.byDomain[d.id];
        if (!x) return null;
        return $("div", { class: "dbar" },
          $("div", { class: "dbar-label" }, $("span", { class: "num" }, d.code), ` ${d.title_es}`),
          $("div", { class: "dbar-track" }, $("div", { class: "dbar-fill " + (x.pct >= .72 ? "pass" : "fail"), style: `width:${x.pct * 100}%` })),
          $("div", { class: "dbar-val" }, `${x.ok}/${x.n} · ${Math.round(x.pct * 100)} %`));
      })),
      $("h2", {}, "Por task statement"),
      $("p", { class: "muted" }, "Ordenadas de peor a mejor. Repasa primero las de arriba."),
      $("div", { class: "table-wrap" }, $("table", {},
        $("thead", {}, $("tr", {}, ["Task", "", "Aciertos", ""].map(h => $("th", {}, h)))),
        $("tbody", {}, Object.entries(a.byTask).sort((x, y) => x[1].pct - y[1].pct || x[0].localeCompare(y[0])).map(([t, x]) => $("tr", {},
          $("td", { class: "num" }, t),
          $("td", {}, taskById.get(t)?.title_es || ""),
          $("td", { class: "num " + (x.pct >= .72 ? "ok" : "ko") }, `${x.ok}/${x.n}`),
          $("td", {}, taskLinks[t] ? $("a", { href: taskLinks[t] }, "Estudiar") : null, " · ", $("a", { href: `practica.html?task=${t}` }, "Practicar"))))))),
      $("h2", {}, "Revisión de preguntas"),
      $("div", { class: "practice-actions" },
        ...[["all", "Todas"], ["wrong", "Falladas"], ["right", "Acertadas"]].map(([v, l]) =>
          $("button", { class: "btn" + (v === "all" ? " active" : ""), "data-f": v, onclick: e => { filter.value = v; root.querySelectorAll("[data-f]").forEach(b => b.classList.toggle("active", b === e.currentTarget)); drawList(); } }, l)),
        $("button", { class: "btn", onclick: () => startExam(null, null, null, { seed: a.seed, mode: a.mode, scenarios: a.scenarios, ids: a.ids, optionOrders: a.optionOrders }) }, "↻ Repetir este simulacro"),
        $("button", { class: "btn", disabled: !qs.some(hasEs), onclick: () => { lang.set(lang.get() === "es" ? "en" : "es"); drawList(); } }, "🇪🇸/🇬🇧 Idioma")),
      list);

    function drawList() {
      list.replaceChildren();
      qs.forEach((q, i) => {
        const ans = a.answers[q.id] || [];
        const ok = ans.length === q.correct.length && ans.every(l => q.correct.includes(l));
        if (filter.value === "wrong" && ok || filter.value === "right" && !ok) return;
        const order = a.optionOrders[q.id] || Object.keys(q.options);
        const display = Object.keys(q.options);
        const shownOf = Object.fromEntries(order.map((orig, k) => [orig, display[k]]));
        const remap = s => U.remapLetters(s, shownOf);
        list.append($("fieldset", { class: "question" },
          $("legend", {},
            $("div", { class: "q-meta" },
              $("span", { class: "qnum" }, `#${i + 1}`),
              $("span", { class: "chip " + (ok ? "okc" : "koc") }, ok ? "✓ Correcta" : ans.length ? "✗ Incorrecta" : "Sin responder"),
              $("span", { class: "chip" }, `Task ${q.task}`),
              $("span", { class: "chip" }, lang.get() === "es" ? scById.get(q.scenario).title_es : scById.get(q.scenario).title)),
            $("div", { class: "stem", html: mdInline(qText(q, "stem")) })),
          $("div", { class: "options" }, order.map((orig, k) => {
            const why = !q.correct.includes(orig) && qText(q, "rationale", orig);
            return $("div", { class: "option static" + (q.correct.includes(orig) ? " correct" : ans.includes(orig) ? " incorrect" : "") },
              $("span", { html: `<b>${display[k]}.</b> ${mdInline(qText(q, "options", orig))}` }),
              ans.includes(orig) ? $("span", { class: "yours" }, "tu respuesta") : null,
              why ? $("span", { class: "why", html: mdInline(why) }) : null);
          })),
          $("div", { class: "feedback " + (ok ? "ok" : "ko") },
            $("span", { class: "expl", html: mdInline(remap(qText(q, "explanation"))) }),
            taskLinks[q.task] ? $("a", { class: "study-link", href: taskLinks[q.task] }, `📖 Estudiar ${q.task}`) : null)));
      });
      if (!list.children.length) list.append($("p", { class: "muted" }, "Nada que mostrar con este filtro."));
    }
    drawList();
  }

  // Diálogo propio (sin confirm(), que bloquea la página).
  function confirmBox(message, onYes) {
    const box = $("div", { class: "modal-back" },
      $("div", { class: "modal", role: "dialog" },
        $("p", {}, message),
        $("div", { class: "practice-actions tight" },
          $("button", { class: "btn", onclick: () => box.remove() }, "Cancelar"),
          $("button", { class: "btn primary", onclick: () => { box.remove(); onYes(); } }, "Sí"))));
    document.body.append(box);
  }
})();
