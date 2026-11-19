# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este repositorio

Material de estudio personal (en español) para la certificación **Claude Certified Architect – Foundations (CCAR-F)** de Anthropic. El contenido es Markdown y PDFs de referencia. Además hay una pequeña web estática generada desde los `.md` con un banco de preguntas y simulacros de examen (ver «Web de estudio y simulacros»). El trabajo habitual es investigar documentación de Anthropic, editar los apuntes y mantener el banco de preguntas.

## Archivos

- `Claude+Certified+Architect+–+Foundations+Exam+Guide.pdf` — guía oficial del examen (v1.0, julio 2026). **Es la fuente de verdad** para dominios, pesos y *task statements*. Cualquier fila nueva de `01-index.md` debe corresponder a un punto de esta guía.
- `00-guide.md` — visión general: recursos oficiales, repos comunitarios, plan de estudio y aviso de la actualización de exámenes (guías nuevas el 17 nov 2026, examen nuevo el 7 dic 2026). Usa citas numéricas `[n]`.
- `01-index.md` — el documento principal: mapea cada *task statement* de los 5 dominios a lecciones de cursos, artículos, prácticas y documentación.
- `Building Effective AI Agents- Architecture Patterns and Implementation Frameworks.pdf` — e-book de Anthropic (dic. 2025) sobre patrones de agentes (un agente, multiagente jerárquico/colaborativo, flujos secuenciales, paralelos y *evaluator-optimizer*). En `01-index.md` se cita en la columna de artículos como `[Building Effective AI Agents (e-book)][ebook] (p. N …)`; la referencia `[ebook]` apunta a su página pública en claude.com.

## Convenciones de `01-index.md`

- Estructura: `## Dominio N · <nombre en inglés> (peso %)` → `### N.M <task statement en español>` → una tabla por task statement. Títulos de sección en infinitivo ("Diseñar…", "Orquestar…").
- Cada tabla tiene exactamente 5 columnas: `| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |`. Las celdas vacías llevan `—`. Comprueba que cada fila tiene el mismo número de `|` que la cabecera.
- Dentro de una celda, el recurso más directo va primero; varios recursos se separan con ` · `.
- **Curso**: `ABREV › Sección › [*Lección*](https://academy.claude.com/courses/<curso>/<lección>)`, con abreviaturas de la tabla "Cursos gratuitos de Anthropic Academy usados" (API, P101, CC101, CCiA, SUB, SKL, MCP, MCP+). Los títulos de lección se copian tal cual del temario actual.
- **Otros**: enlaza siempre a la sección concreta con ancla (`…/page#anchor`) y nómbrala como `Página › Sección`. Dominios habituales: `platform.claude.com/docs`, `code.claude.com/docs`, `modelcontextprotocol.io`.
- Los cursos y artículos de ingeniería recurrentes usan enlaces de referencia (`[eng-multi]`, `[api]`, …) definidos al final del archivo bajo `<!-- Enlaces de referencia -->`; añade ahí cualquier referencia nueva reutilizable.
- Tras verificar enlaces, actualiza la fecha de "Enlaces comprobados el …" en la cabecera.
- Nomenclatura: la guía del examen llama `Task` a la herramienta de subagentes; en Claude Code actual es `Agent` (ya explicado en "Cómo leer este índice"). Mantén esa equivalencia.

## Regla importante: apuntes y web siempre iguales

El contenido de cada `.md` debe ser el mismo que el de su página equivalente en la web (`00-guide.md` → `index.html`, `00-index.md` → `00-index.html`, `01`–`05-*.md` → `01`–`05-*.html`). Si se cambia uno, hay que cambiar también el otro:

- Los cambios de contenido se hacen **en el `.md`** y después se ejecuta `npm run build` para regenerar `site/`. Nunca se edita a mano el HTML de `site/`, porque el siguiente build lo sobrescribe y el `.md` quedaría desfasado.
- Si un cambio no se puede expresar en el `.md` (por ejemplo, cómo se muestra un elemento), se cambia `web/build.mjs`, la plantilla o el CSS, nunca el texto en un solo lado.
- Si cambia la estructura de un `.md` (archivo nuevo o renombrado, encabezados `## N.M`, wikilinks), actualiza `PAGES` en `web/build.mjs` o `questions/domains.json` y comprueba que el build termina con «Enlaces internos: todos correctos».
- Tras cualquier cambio en los `.md`, `web/` o `questions/`, ejecuta `npm run build` y revisa la página afectada antes de dar el trabajo por terminado.

## Web de estudio y simulacros

- Requisitos: Node 20 o superior. `npm install` una vez; `npm run build` genera `site/` (en `.gitignore`, no se sube). Abrir `site/index.html` directamente en el navegador; funciona con `file://`, sin servidor.
- `npm run validate` comprueba el banco de preguntas: los errores hacen fallar el comando; los avisos (preguntas sin revisar, traducciones o explicaciones por opción que faltan, tasks con menos de 8 preguntas) no.
- `questions/bank.json` es la **fuente única** de las preguntas. Cada pregunta tiene `id` estable, `domain`, `task`, `scenario`, `type` (`single`/`multiple`), `select`, `stem`, `options`, `correct`, `explanation`, `rationale` (por qué falla cada opción incorrecta) y los mismos campos con sufijo `_es` en español. Las preguntas se redactan en inglés, como en el examen real.
- `source`: `guia-oficial` (las 12 de la guía), `examen-1` (las de `exams/examen 1.html`) o `generada`. Las generadas llevan `reviewed: false` hasta que Mario las revise; cambiarlo a `true` cuando lo haga. Los simulacros solo usan preguntas revisadas salvo que se marque la opción «Incluir preguntas sin revisar».
- Ids nuevos: `gen-<task>-NN` (por ejemplo `gen-4.3-07`). No cambiar ids existentes: el progreso guardado en el navegador se asocia por id.
- `questions/domains.json` (dominios, pesos, tasks y archivo de apuntes de cada dominio) y `questions/scenarios.json` (los 6 escenarios de la guía) alimentan la web y el reparto de los simulacros.
- Código de la web en `web/`: `build.mjs` (markdown-it + highlight.js + Mermaid), `templates/page.html` y `assets/` (`app.js` común, `util.js`, `practice.js` para la práctica, `exam.js` para los simulacros, `style.css`).
- Las páginas de apuntes se generan desde los `.md`: los encabezados `## N.M` reciben un enlace «Practicar N.M». Los wikilinks `[[...]]` a otros `.md` del repositorio se convierten en enlaces; los que apuntan a la carpeta `Anthropic/` (que no está en el repo) se muestran como referencia sin enlace.
- El progreso (práctica, historial de simulacros, idioma y tema) vive en `localStorage` del navegador, con claves `ccarf-*` y `examccarf-theme`; la web permite exportarlo e importarlo como JSON.

## Forma de trabajar

- No hacer `git commit` salvo que Mario lo pida explícitamente.
- Verifica cada URL y ancla antes de añadirla; no inventes títulos de lecciones ni secciones de documentación.
