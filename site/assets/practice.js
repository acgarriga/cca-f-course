// Modo práctica: preguntas por dominio, task o fallos, con corrección inmediata.
// Datos: window.CCARF (assets/questions.js). Progreso: localStorage "ccarf-practice".
(function () {
  const { domains, scenarios, questions, taskLinks } = window.CCARF;
  const root = document.getElementById("practice");
  const STORE = "ccarf-practice";
  const add = (...kids) => root.append(...kids.flat().filter(k => k != null && k !== false));

  const { $, mdInline, store: ls, lang, hasEs, qText, SOURCE_LABEL } = window.CCARFUtil;

  // ---------- Estado persistente ----------
  const store = { answers: ls.get(STORE, {}).answers || {} };
  const save = () => ls.set(STORE, { answers: store.answers });

  const taskById = new Map(domains.flatMap(d => d.tasks.map(t => [t.id, { ...t, domain: d }])));
  const scenarioById = new Map(scenarios.map(s => [s.id, s]));
  const text = (q, field) => qText(q, field);
  const stats = qs => {
    const done = qs.filter(q => store.answers[q.id]);
    return { total: qs.length, answered: done.length, correct: done.filter(q => store.answers[q.id].correct).length };
  };
  const statText = st => st.answered ? `${st.answered}/${st.total} respondidas · ${Math.round(st.correct / st.answered * 100)} % aciertos` : `${st.total} preguntas`;

  // ---------- Selección desde la URL ----------
  const params = new URLSearchParams(location.search);
  const sel = { task: params.get("task"), domain: params.get("domain"), failed: params.has("fallos") };
  let pool = null, heading = "", studyLink = null;
  if (sel.task && taskById.has(sel.task)) {
    const t = taskById.get(sel.task);
    pool = questions.filter(q => q.task === sel.task);
    heading = `${t.id} · ${t.title_es}`;
    studyLink = taskLinks[t.id];
  } else if (sel.domain && domains.some(d => d.id === sel.domain)) {
    const d = domains.find(d => d.id === sel.domain);
    pool = questions.filter(q => q.domain === d.id);
    heading = `${d.code} · ${d.title_es}`;
    studyLink = d.notes.replace(/\.md$/, ".html");
  } else if (sel.failed) {
    pool = questions.filter(q => store.answers[q.id] && !store.answers[q.id].correct);
    heading = "Repaso de fallos";
  }

  const byTaskThenId = (a, b) => a.task.localeCompare(b.task, undefined, { numeric: true }) || a.id.localeCompare(b.id);
  if (!pool) renderOverview(); else renderSession(pool.sort(byTaskThenId));

  // ---------- Vista general ----------
  function renderOverview() {
    document.title = "Práctica · CCAR-F";
    const failed = questions.filter(q => store.answers[q.id] && !store.answers[q.id].correct).length;
    const all = stats(questions);
    add(
      $("h1", {}, "Práctica"),
      $("p", { class: "lead" }, `Elige un dominio o un task statement. Cada respuesta se corrige al momento y tu progreso se guarda en este navegador. Banco: ${questions.length} preguntas · ${statText(all)}.`),
      $("div", { class: "practice-actions" },
        failed ? $("a", { class: "btn primary", href: "practica.html?fallos" }, `Repasar mis ${failed} fallos`) : null,
        all.answered ? $("button", { class: "btn", onclick: () => { if (confirm("¿Borrar todo tu progreso de práctica?")) { store.answers = {}; save(); location.reload(); } } }, "Borrar mi progreso") : null),
    );
    for (const d of domains) {
      const dq = questions.filter(q => q.domain === d.id);
      const card = $("section", { class: "domain-card" },
        $("div", { class: "domain-head" },
          $("div", {},
            $("span", { class: "kicker" }, `${d.code} · Peso ${d.weight} %`),
            $("h2", {}, d.title_es),
            $("p", { class: "muted" }, statText(stats(dq)))),
          $("a", { class: "btn", href: `practica.html?domain=${d.id}` }, "Todo el dominio →")),
        $("ul", { class: "task-list" }, d.tasks.map(t => {
          const tq = dq.filter(q => q.task === t.id);
          const st = stats(tq);
          return $("li", {},
            tq.length
              ? $("a", { href: `practica.html?task=${t.id}` }, $("span", { class: "num" }, t.id), t.title_es)
              : $("span", { class: "disabled" }, $("span", { class: "num" }, t.id), t.title_es),
            $("span", { class: "task-stat" + (st.answered && st.correct === st.answered ? " ok" : "") }, statText(st)));
        })));
      add(card);
    }
    add(window.CCARFUtil.progressBox());
  }

  // ---------- Sesión de práctica ----------
  function renderSession(qs) {
    document.title = `${heading} · Práctica · CCAR-F`;
    let order = qs.slice();
    let shuffled = false;
    const anyEs = qs.some(hasEs);
    const score = $("span");
    const bar = $("div");
    const list = $("div", { class: "quiz" });

    add(
      $("p", { class: "crumbs" }, $("a", { href: "practica.html" }, "← Todas las tasks")),
      $("h1", {}, heading),
      studyLink ? $("p", {}, $("a", { class: "study-link", href: studyLink }, "📖 Estudiar en los apuntes")) : null,
      $("div", { class: "practice-actions" },
        $("button", { class: "btn", onclick: () => { order = window.CCARFUtil.shuffle(order); shuffled = true; draw(); } }, "🔀 Barajar"),
        $("button", {
          class: "btn", disabled: !anyEs, title: anyEs ? null : "Estas preguntas aún no están traducidas",
          onclick: () => { lang.set(lang.get() === "es" ? "en" : "es"); draw(); syncLangBtn(); },
        }, ""),
        $("button", { class: "btn", onclick: () => { qs.forEach(q => delete store.answers[q.id]); save(); draw(); } }, "↺ Reiniciar estas preguntas")),
      $("div", { class: "scoreboard" }, score, $("div", { class: "bar" }, bar)),
      list);
    const langBtn = root.querySelectorAll(".practice-actions .btn")[1];
    function syncLangBtn() { langBtn.textContent = lang.get() === "es" ? "🇬🇧 Ver en inglés" : "🇪🇸 Ver en español"; }
    syncLangBtn();

    if (!qs.length) {
      list.append($("p", { class: "muted" }, sel.failed ? "No tienes fallos pendientes. ¡Bien!" : "No hay preguntas todavía."));
    }

    function updateScore() {
      const st = stats(qs);
      score.innerHTML = `<strong>${st.answered}/${st.total}</strong> respondidas · <strong>${st.correct}</strong> correctas`;
      bar.style.width = (st.total ? st.answered / st.total * 100 : 0) + "%";
    }

    function draw() {
      list.replaceChildren();
      let lastTask = null;
      order.forEach((q, i) => {
        if (!sel.task && !shuffled && q.task !== lastTask) {
          list.append($("p", { class: "task-label" }, `Task ${q.task} · ${taskById.get(q.task).title_es}`));
        }
        lastTask = q.task;
        list.append(renderQuestion(q, i + 1));
      });
      updateScore();
    }

    function renderQuestion(q, n) {
      const sc = scenarioById.get(q.scenario);
      const fs = $("fieldset", { class: "question", id: q.id });
      fs.append($("legend", {},
        $("div", { class: "q-meta" },
          $("span", { class: "qnum" }, `#${n}`),
          $("span", { class: "chip" }, `Task ${q.task}`),
          sc ? $("span", { class: "chip", title: lang.get() === "es" && sc.description_es ? sc.description_es : sc.description }, lang.get() === "es" ? sc.title_es : sc.title) : null,
          SOURCE_LABEL[q.source] ? $("span", { class: "chip soft" }, SOURCE_LABEL[q.source]) : null,
          !q.reviewed ? $("span", { class: "chip warn" }, "Sin revisar") : null),
        $("div", { class: "stem", html: mdInline(text(q, "stem")) })));

      const multiple = q.type === "multiple";
      if (multiple) fs.append($("p", { class: "hint" }, `Selecciona ${q.select} respuestas.`));
      const opts = $("div", { class: "options" });
      const letters = Object.keys(q.options);
      const optText = l => qText(q, "options", l);
      const buttons = letters.map(l => $("button", { type: "button", class: "option", "data-option": l, html: `<b>${l}.</b> ${mdInline(optText(l))}` }));
      buttons.forEach(b => opts.append(b));
      fs.append(opts);
      const check = multiple ? $("button", { class: "btn primary check", disabled: true }, "Comprobar") : null;
      if (check) fs.append(check);
      const feedback = $("div", { class: "feedback" });
      fs.append(feedback);

      const picked = new Set();
      function finish(selected, persist) {
        const correct = selected.length === q.correct.length && selected.every(l => q.correct.includes(l));
        buttons.forEach(b => {
          const l = b.dataset.option;
          b.disabled = true;
          if (q.correct.includes(l)) b.classList.add("correct");
          else if (selected.includes(l)) b.classList.add("incorrect");
          const why = qText(q, "rationale", l);
          if (why && !q.correct.includes(l)) b.append($("span", { class: "why", html: mdInline(why) }));
        });
        if (check) check.remove();
        feedback.className = "feedback " + (correct ? "ok" : "ko");
        feedback.replaceChildren(...[
          correct ? "✓ Correcto" : `✗ Incorrecto. Respuesta correcta: ${q.correct.join(", ")}`,
          $("span", { class: "expl", html: mdInline(text(q, "explanation")) }),
          taskLinks[q.task] && !sel.task ? $("a", { class: "study-link", href: taskLinks[q.task] }, `📖 Estudiar ${q.task}`) : null].filter(Boolean));
        if (persist) {
          store.answers[q.id] = { selected, correct, at: Date.now() };
          save();
          updateScore();
        }
      }

      buttons.forEach(b => b.addEventListener("click", () => {
        const l = b.dataset.option;
        if (!multiple) return finish([l], true);
        picked.has(l) ? picked.delete(l) : picked.add(l);
        b.classList.toggle("picked", picked.has(l));
        check.disabled = picked.size !== q.select;
      }));
      if (check) check.addEventListener("click", () => finish([...picked].sort(), true));

      const prev = store.answers[q.id];
      if (prev) finish(prev.selected, false);
      return fs;
    }

    draw();
  }

})();
