// Valida questions/bank.json contra domains.json y scenarios.json.
// Errores (salida con código 1): datos que romperían la web.
// Avisos: trabajo pendiente (traducción, rationale, revisión, cobertura).
// Uso: npm run validate  (o node web/validate.mjs --quiet para ver solo el resumen)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => JSON.parse(fs.readFileSync(path.join(root, "questions", f), "utf8"));
const { domains } = read("domains.json");
const { scenarios } = read("scenarios.json");
const { questions } = read("bank.json");
const quiet = process.argv.includes("--quiet");

const TARGET_PER_TASK = 8;
const ES_FIELDS = ["stem_es", "options_es", "explanation_es"];
const SOURCES = ["guia-oficial", "examen-1", "generada"];

const taskIds = new Map();
domains.forEach(d => d.tasks.forEach(t => taskIds.set(t.id, d.id)));
const scenarioIds = new Set(scenarios.map(s => s.id));

const errors = [];
const warnings = { traduccion: [], rationale: [], revision: [] };
const seen = new Set();

for (const [i, q] of questions.entries()) {
  const where = q.id || `#${i}`;
  const err = msg => errors.push(`${where}: ${msg}`);

  if (!q.id) err("falta id");
  else if (seen.has(q.id)) err("id repetido");
  seen.add(q.id);

  if (!taskIds.has(q.task)) err(`task desconocida "${q.task}"`);
  else if (taskIds.get(q.task) !== q.domain) err(`task ${q.task} no pertenece a ${q.domain}`);
  if (!scenarioIds.has(q.scenario)) err(`escenario desconocido "${q.scenario}"`);
  if (!SOURCES.includes(q.source)) err(`source debe ser uno de ${SOURCES.join(", ")}`);
  if (typeof q.reviewed !== "boolean") err("reviewed debe ser true o false");
  if (!q.stem?.trim()) err("stem vacío");
  if (!q.explanation?.trim()) err("explanation vacía");

  const letters = Object.keys(q.options || {});
  if (letters.length < 2) err("menos de 2 opciones");
  letters.forEach(l => { if (!q.options[l]?.trim()) err(`opción ${l} vacía`); });

  if (!["single", "multiple"].includes(q.type)) err(`type debe ser single o multiple`);
  if (!Array.isArray(q.correct) || !q.correct.length) err("correct debe ser una lista no vacía");
  else {
    q.correct.forEach(c => { if (!letters.includes(c)) err(`correct "${c}" no es una opción`); });
    if (new Set(q.correct).size !== q.correct.length) err("correct tiene letras repetidas");
    if (q.correct.length !== q.select) err(`select=${q.select} pero hay ${q.correct.length} respuestas correctas`);
    if (q.type === "single" && q.select !== 1) err("type single exige select 1");
    if (q.type === "multiple" && q.select < 2) err("type multiple exige select >= 2");
  }

  if (q.options_es && Object.keys(q.options_es).join() !== letters.join()) err("options_es no tiene las mismas letras que options");
  if (q.rationale) {
    Object.keys(q.rationale).forEach(l => { if (!letters.includes(l)) err(`rationale para opción inexistente ${l}`); });
  }

  if (ES_FIELDS.some(f => !q[f])) warnings.traduccion.push(q.id);
  const wrong = letters.filter(l => !q.correct?.includes(l));
  if (!q.rationale || wrong.some(l => !q.rationale[l])) warnings.rationale.push(q.id);
  if (!q.reviewed) warnings.revision.push(q.id);
}

// Cobertura
const byTask = new Map([...taskIds.keys()].map(t => [t, 0]));
const byScenario = new Map([...scenarioIds].map(s => [s, 0]));
questions.forEach(q => {
  if (byTask.has(q.task)) byTask.set(q.task, byTask.get(q.task) + 1);
  if (byScenario.has(q.scenario)) byScenario.set(q.scenario, byScenario.get(q.scenario) + 1);
});
const short = [...byTask].filter(([, n]) => n < TARGET_PER_TASK);

// Informe
console.log(`Banco: ${questions.length} preguntas (${questions.filter(q => q.reviewed).length} revisadas)\n`);
console.log("Por dominio:");
for (const d of domains) {
  const n = questions.filter(q => q.domain === d.id).length;
  const tasks = d.tasks.map(t => `${t.id}:${byTask.get(t.id)}`).join("  ");
  console.log(`  ${d.code} (${d.weight} %)  ${String(n).padStart(3)}   ${tasks}`);
}
console.log("\nPor escenario:");
for (const s of scenarios) console.log(`  ${s.id.padEnd(24)} ${byScenario.get(s.id)}`);

const list = ids => (quiet || !ids.length || ids.length > 12 ? `${ids.length}` : `${ids.length}: ${ids.join(", ")}`);
console.log("\nAvisos:");
console.log(`  Sin traducción completa: ${list(warnings.traduccion)}`);
console.log(`  Sin rationale por opción: ${list(warnings.rationale)}`);
console.log(`  Pendientes de revisar:   ${list(warnings.revision)}`);
console.log(`  Tasks con menos de ${TARGET_PER_TASK}: ${short.length ? short.map(([t, n]) => `${t} (${n})`).join(", ") : "ninguna"}`);

if (errors.length) {
  console.error(`\n${errors.length} errores:`);
  errors.forEach(e => console.error("  " + e));
  process.exit(1);
}
console.log("\nSin errores.");
