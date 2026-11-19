// Extrae las 77 preguntas de exams/examen 1.html a questions/bank.json.
// Uso puntual: a partir de ahí, bank.json es la fuente única y se edita a mano.
// Uso: node web/extract-exam1.mjs [--force]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "exams", "examen 1.html");
const outPath = path.join(root, "questions", "bank.json");

if (fs.existsSync(outPath) && !process.argv.includes("--force")) {
  console.error(`${outPath} ya existe. Usa --force para sobrescribirlo (perderás los cambios hechos a mano).`);
  process.exit(1);
}

// El HTML guarda los datos en un <script> como `const DOMAINS = [...]; const QUESTIONS = [...];`.
const html = fs.readFileSync(htmlPath, "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const start = script.indexOf("const DOMAINS");
const end = script.indexOf("function escapeHtml");
if (start < 0 || end < 0) throw new Error("No encuentro DOMAINS/QUESTIONS en el HTML");
const ctx = {};
vm.runInNewContext(script.slice(start, end) + ";this.QUESTIONS = QUESTIONS;", ctx);
const QUESTIONS = ctx.QUESTIONS;

// Escenario de cada pregunta (por su número original). Las 1-12 siguen a la guía oficial;
// el resto se etiquetaron a mano según su enunciado.
const SCENARIO_BY_NUM = {
  "customer-support":       [1, 2, 3, 13, 21, 22, 23, 24, 30, 31, 32, 34, 36, 69, 71],
  "code-generation":        [4, 5, 6, 28, 29, 37, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 52, 54, 66, 68],
  "multi-agent-research":   [7, 8, 9, 15, 16, 17, 18, 19, 20, 33, 35, 70, 72, 77],
  "developer-productivity": [14, 25, 27, 38, 39, 40, 73, 74],
  "ci-cd":                  [10, 11, 12, 26, 50, 53, 55, 56, 57, 58, 64],
  "data-extraction":        [59, 60, 61, 62, 63, 65, 67, 75, 76],
};
const scenarioOf = {};
for (const [sc, nums] of Object.entries(SCENARIO_BY_NUM)) nums.forEach(n => { scenarioOf[n] = sc; });

const bank = QUESTIONS
  .slice()
  .sort((a, b) => a.num - b.num)
  .map(q => {
    const task = q.task.split(" · ")[0];
    if (!scenarioOf[q.num]) throw new Error(`Pregunta ${q.num} sin escenario`);
    return {
      id: `ex1-${String(q.num).padStart(2, "0")}`,
      domain: q.domain,
      task,
      scenario: scenarioOf[q.num],
      type: "single",
      select: 1,
      stem: q.q,
      options: q.options,
      correct: [q.correct],
      explanation: q.exp,
      source: q.num <= 12 ? "guia-oficial" : "examen-1",
      reviewed: true,
    };
  });

fs.writeFileSync(outPath, JSON.stringify({
  _note: "Banco de preguntas CCAR-F. Fuente única: el build genera site/questions.js a partir de aquí. Valida con `npm run validate`.",
  questions: bank,
}, null, 2) + "\n");
console.log(`${bank.length} preguntas escritas en ${path.relative(root, outPath)}`);
