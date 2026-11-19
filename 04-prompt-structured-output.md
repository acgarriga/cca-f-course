# Dominio 4 · Ingeniería de prompts y salida estructurada (20 %)

> Síntesis didáctica de los conceptos del Dominio 4 de la guía oficial del examen **Claude Certified Architect – Foundations** (v1.0).
> Fuentes principales: los apuntes del curso *Creación con la API de Claude* de la carpeta `Anthropic/` (enlazados como `[[...]]`), sobre todo las partes de evaluación de prompts, técnicas de ingeniería de prompts y uso de herramientas, más *Introducción a subagentes* y *Claude Code 101* para la revisión independiente. Donde los apuntes no llegan (few-shot, `tool_choice`, structured outputs, Message Batches API), se completa con la documentación oficial de la plataforma. El índice de recursos por *task statement* está en [[00-index]].

## Cómo usar este documento

Cada sección corresponde a un *task statement* (4.1 a 4.6) y sigue el mismo esquema que [[01-agentic-architecture]] y [[03-claude]]:

1. **La idea en una frase**.
2. **Explicación**, con ejemplos.
3. **Qué busca el examen**: los razonamientos que la guía premia y las trampas habituales.
4. **Fuentes**.

Al final hay una chuleta de decisiones y preguntas de autoevaluación.

Este dominio aparece sobre todo en dos escenarios del examen: **«Structured Data Extraction»** (esquemas, `tool_choice`, validación y reintentos, lotes) y **«Claude Code for Continuous Integration»** (criterios de revisión, falsos positivos, revisión en varias pasadas). Las preguntas 11 y 12 de la guía son de este dominio.

### El hilo conductor: precisión, forma y fiabilidad

El dominio responde a tres preguntas que aparecen en cualquier sistema que usa Claude en producción:

| Pregunta | Herramienta principal | Sección |
|---|---|---|
| ¿Cómo consigo que Claude decida **lo que yo quiero** (qué reportar, qué ignorar)? | Criterios explícitos y ejemplos | 4.1, 4.2 |
| ¿Cómo consigo que la respuesta tenga **la forma** que mi código espera? | Tool use con JSON Schema, `tool_choice` | 4.3 |
| ¿Cómo detecto y corrijo **lo que sale mal**, a escala y a buen precio? | Validación con reintento, lotes, revisión independiente | 4.4, 4.5, 4.6 |

Una idea atraviesa todo el dominio y viene del curso: **la ingeniería de prompts se mide**. El curso separa la *ingeniería* de prompts (técnicas para escribirlos: claridad, especificidad, etiquetas XML, ejemplos) de la *evaluación* de prompts (pruebas automáticas que dan una nota). El proceso es iterativo: escribe un prompt, evalúalo, aplica **una** técnica, vuelve a evaluar. En el ejemplo del curso, la nota de un prompt de planes de comida pasa de 2,32 a 3,92 al hacerlo claro y directo, y a 7,86 al añadirle pautas específicas.

---

## 4.1 Diseñar prompts con criterios explícitos para ganar precisión y reducir falsos positivos

### La idea en una frase

Para que Claude reporte solo lo que importa, **define categorías concretas** de lo que hay que reportar y de lo que hay que ignorar; las instrucciones vagas como «sé conservador» no mejoran la precisión.

### Explicación

**Claro, directo y específico.** Es la base del curso. Ser **claro y directo** significa empezar con un verbo de acción que diga qué hacer («Genera», «Identifica»), no con una pregunta ni con un rodeo. Ser **específico** significa añadir pautas. El curso distingue dos tipos:

- **Pautas de calidad de la salida** (longitud, estructura, elementos obligatorios). Se usan «en casi todos los prompts».
- **Pasos del proceso** (qué analizar y en qué orden). Se usan en problemas complejos o cuando quieres que Claude considere varias perspectivas.

La documentación lo resume con una imagen: trata a Claude como a **un empleado brillante pero nuevo**, que no conoce tus normas. Y una prueba: si un compañero sin contexto se confundiría con tu prompt, Claude también. Añade además **el porqué** de cada instrucción: Claude generaliza a partir de la explicación.

**Criterios categóricos frente a filtros de confianza.** Este es el núcleo del examen. Compara dos instrucciones para un revisor de código:

| Vaga | Explícita |
|---|---|
| «Comprueba que los comentarios son correctos» | «Marca un comentario solo si el comportamiento que describe **contradice** lo que hace el código» |
| «Sé conservador» / «reporta solo hallazgos de alta confianza» | «Reporta: errores de lógica, vulnerabilidades, fugas de recursos. **No reportes**: estilo menor, nombres, patrones locales que el equipo usa a propósito» |

Las instrucciones de la izquierda dejan el criterio en manos del modelo, así que el resultado sigue siendo irregular. «Sé conservador» no dice **qué** es un falso positivo, y la confianza que el modelo se atribuye no está calibrada con lo que tu equipo considera ruido. Las de la derecha convierten el juicio en una decisión por categorías, que se puede comprobar y repetir.

**Severidad con ejemplos de código.** Si pides «clasifica por severidad» sin más, cada ejecución usa un umbral distinto. Define cada nivel con un criterio y un fragmento de código de ejemplo:

```text
<severity_levels>
CRITICAL: permite ejecutar código, filtrar datos o corromperlos.
  Ejemplo: query = f"SELECT * FROM users WHERE id = {user_id}"
HIGH: error de lógica que produce un resultado incorrecto en un caso normal.
  Ejemplo: if (items.length > 0) return items[1];  // debería ser items[0]
LOW: no cambia el comportamiento, pero dificulta el mantenimiento.
  Ejemplo: función de 120 líneas sin dividir.
</severity_levels>
```

Las etiquetas XML del ejemplo no son decorativas. El curso las recomienda para **separar instrucciones, datos y definiciones** cuando el prompt incluye mucho contenido, con nombres descriptivos (`<severity_levels>` mejor que `<data>`).

**Los falsos positivos destruyen la confianza.** Un revisor automático que acierta en seguridad pero inunda los PR de avisos de estilo erróneos acaba ignorado **entero**: los desarrolladores dejan de leer también los hallazgos buenos. Por eso la guía propone una medida práctica: **desactivar temporalmente las categorías con muchos falsos positivos** para recuperar la confianza, y mientras tanto mejorar su prompt (con criterios y ejemplos) antes de volver a activarlas.

**Lenguaje agresivo.** Un matiz de la documentación actual: los modelos recientes siguen el *system prompt* con mucha fidelidad, y frases como «CRÍTICO: DEBES…» o «ante la duda, usa X» provocan que se active de más. Mejor una instrucción normal con su motivo.

### Qué busca el examen

- Ante falsos positivos, la respuesta correcta es **criterios explícitos de qué reportar y qué no**, no «pide más confianza» ni «sé conservador».
- Criterios de severidad **con ejemplos de código concretos** para que la clasificación sea consistente.
- Si una categoría genera mucho ruido: **desactivarla temporalmente** y mejorar su prompt, en lugar de mantenerla y perder la confianza en todo el sistema.
- Trampa: filtrar por una puntuación de confianza que el modelo se atribuye a sí mismo como solución principal de la precisión.

### Fuentes

- Building with the Claude API › Prompt engineering techniques › [Prompt engineering](https://academy.claude.com/courses/building-with-the-claude-api/prompt-engineering) (proceso iterativo medido con evaluaciones)
- Building with the Claude API › Prompt engineering techniques › [Being clear and direct](https://academy.claude.com/courses/building-with-the-claude-api/being-clear-and-direct)
- Building with the Claude API › Prompt engineering techniques › [Being specific](https://academy.claude.com/courses/building-with-the-claude-api/being-specific)
- Building with the Claude API › Prompt engineering techniques › [Structure with XML tags](https://academy.claude.com/courses/building-with-the-claude-api/structure-with-xml-tags)
- Docs: [Prompting best practices › Be clear and direct](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#be-clear-and-direct) · [Add context to improve performance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#add-context-to-improve-performance)

---

## 4.2 Few-shot prompting para mejorar la consistencia y la calidad

### La idea en una frase

Cuando las instrucciones detalladas no bastan para obtener una salida consistente, **unos pocos ejemplos bien elegidos** (2–4, centrados en los casos ambiguos) son la técnica más eficaz.

### Explicación

**Qué es.** *Few-shot* (o *multishot*) es incluir en el prompt ejemplos de entrada con su salida correcta. El curso lo cita como una de las técnicas de ingeniería de prompts, junto a la claridad, la especificidad y las etiquetas XML. La documentación lo describe como «una de las formas más fiables de dirigir el formato, el tono y la estructura» de la salida.

**Por qué funciona mejor que más instrucciones.** Una regla en prosa admite varias lecturas; un ejemplo, no. Y, sobre todo, un buen ejemplo enseña **el criterio**, no solo el caso: si el ejemplo explica por qué se eligió una opción frente a otra plausible, Claude **generaliza** ese juicio a situaciones nuevas en lugar de limitarse a copiar los casos del prompt.

**Para qué lo usa la guía:**

| Uso | Ejemplo |
|---|---|
| **Formato consistente** | Cada hallazgo con ubicación, problema, severidad y arreglo sugerido, siempre en el mismo orden |
| **Casos ambiguos** | Qué herramienta usar ante una petición que encaja en dos; si un hueco de cobertura en una rama cuenta como hallazgo |
| **Reducir falsos positivos** | Un ejemplo de patrón **aceptable** (no se reporta) junto a uno parecido que **sí** es un error |
| **Extracción de documentos variados** | Citas en línea frente a bibliografía final; método en una sección propia frente a detalles repartidos por el texto; medidas informales («un par de kilos») |
| **Campos vacíos o inventados** | Ejemplos que muestran dónde encontrar el dato en formatos distintos, y cuándo devolver `null` porque no está |

**Cómo escribirlos:**

- **Pocos y dirigidos**: la guía habla de **2 a 4** ejemplos centrados en los escenarios ambiguos. (La documentación general recomienda 3 a 5; para el examen, quédate con 2–4 dirigidos a la ambigüedad.)
- **Relevantes**: parecidos a los casos reales.
- **Diversos**: si todos se parecen, Claude aprende un patrón que no querías (por ejemplo, que siempre hay exactamente tres hallazgos).
- **Delimitados**: dentro de `<example>` (varios en `<examples>`), para que no se confundan con las instrucciones.
- **Con razonamiento**: en los casos ambiguos, una línea que diga por qué se eligió esa salida y no la alternativa.

```text
<examples>
<example>
<input>«Quiero cambiar la dirección de envío de mi pedido 4411»</input>
<output>Herramienta: lookup_order (no get_customer)
Motivo: la petición se refiere a un pedido concreto con su número;
get_customer solo hace falta si el cliente no da el número.</output>
</example>
...
</examples>
```

**Relación con otros dominios.** En el Dominio 3 vimos la misma idea aplicada a Claude Code (2–3 ejemplos de entrada y salida cuando la prosa se interpreta de forma distinta cada vez; ver [[03-claude]], 3.5). Y en el Dominio 1, la pregunta 3 de la guía premia «criterios de escalado explícitos **con ejemplos few-shot**». Cuidado con no generalizar: en la pregunta 2, ante una mala elección de herramienta, la respuesta correcta es **mejorar las descripciones de las herramientas** (la causa raíz), no añadir few-shot.

### Qué busca el examen

- Instrucciones detalladas que siguen dando resultados inconsistentes → **few-shot**.
- Ejemplos dirigidos a los **casos ambiguos**, que muestran **por qué** se elige una opción frente a otra.
- En extracción: ejemplos con **formatos de documento distintos** para reducir campos vacíos y alucinaciones.
- Trampa: usar few-shot para tapar un problema cuya causa es otra (descripciones de herramientas pobres, secuencias que deben ser deterministas y requieren código).

### Fuentes

- Building with the Claude API › Prompt evaluation › [Prompt evaluation](https://academy.claude.com/courses/building-with-the-claude-api/prompt-evaluation) (Prompt Engineering vs Prompt Evaluation)
- Building with the Claude API › Prompt engineering techniques › [Providing examples](https://academy.claude.com/courses/building-with-the-claude-api/providing-examples)
- Introduction to subagents > [Creating a subagent](https://academy.claude.com/courses/introduction-to-subagents/creating-a-subagent) (Making Claude use your subagent automatically: ejemplos concretos en la descripción para que Claude decida mejor)
- Docs: [Prompting best practices › Use examples effectively](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#use-examples-effectively) · [Increase output consistency › Constrain with examples](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency#constrain-with-examples) · [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)

---

## 4.3 Forzar salida estructurada con tool use y JSON Schema

### La idea en una frase

Para obtener datos que tu código pueda procesar sin fallos de sintaxis, define una **herramienta cuyo `input_schema` es el esquema que quieres**, controla con `tool_choice` que Claude la llame, y lee el resultado del bloque `tool_use`; el esquema garantiza la forma, **no** que los valores sean correctos.

### Explicación

**De dónde venimos: prefill y secuencias de parada.** El curso enseña primero una técnica sencilla para obtener JSON limpio: precargar el mensaje del asistente con `` ```json `` y usar `` ``` `` como `stop_sequence`. Claude escribe solo el contenido y se detiene al intentar cerrar el bloque. Funciona, pero **no garantiza nada**: el JSON puede estar mal formado o no ajustarse a la estructura que esperas.

> **Matiz de actualidad.** Desde los modelos Claude 4.6, el *prefill* del último turno del asistente **ya no se admite** (la API devuelve un error 400), y además es incompatible con el pensamiento extendido (tus apuntes lo avisan en 8.6.1) y con las *structured outputs*. Para el examen basta con saber que es una técnica débil frente a tool use.

**Tool use como extractor.** El truco es usar una herramienta que **no ejecutas**: solo te interesa su entrada. Claude «llama» a `extract_invoice` y los argumentos de esa llamada son tus datos, ya estructurados según el `input_schema`:

```python
tools = [{
    "name": "extract_invoice",
    "description": "Registra los datos extraídos de una factura. Úsala siempre para devolver el resultado.",
    "input_schema": {
        "type": "object",
        "properties": {
            "invoice_number": {"type": "string"},
            "issue_date": {"type": "string", "description": "Formato ISO 8601 (AAAA-MM-DD)"},
            "vendor_vat_id": {"type": ["string", "null"],
                              "description": "null si no aparece en el documento"},
            "category": {"type": "string",
                         "enum": ["servicios", "material", "viajes", "other", "unclear"]},
            "category_detail": {"type": ["string", "null"],
                                "description": "Obligatorio si category es other"},
            "line_items": {"type": "array", "items": {
                "type": "object",
                "properties": {"description": {"type": "string"},
                               "amount": {"type": "number"}},
                "required": ["description", "amount"]}},
            "stated_total": {"type": "number"},
        },
        "required": ["invoice_number", "issue_date", "vendor_vat_id",
                     "category", "line_items", "stated_total"],
    },
}]

response = client.messages.create(
    model=MODEL, max_tokens=2048, tools=tools,
    tool_choice={"type": "tool", "name": "extract_invoice"},
    messages=[{"role": "user", "content": f"<invoice>{doc}</invoice>"}],
)
data = next(b.input for b in response.content if b.type == "tool_use")
```

Los apuntes del curso explican las tres partes de un esquema de herramienta (`name`, `description`, `input_schema`) y la importancia de una descripción de 3–4 frases por herramienta y por parámetro.

**`tool_choice`: quién decide si se llama a la herramienta.**

| Valor | Comportamiento | Cuándo usarlo |
|---|---|---|
| `{"type": "auto"}` (por defecto) | Claude decide: puede llamar a una herramienta **o responder con texto** | Agentes conversacionales; **no garantiza** salida estructurada |
| `{"type": "any"}` | Claude **debe** llamar a una herramienta, pero elige cuál | Hay varios esquemas de extracción (factura, contrato, recibo) y no sabes qué tipo de documento llega |
| `{"type": "tool", "name": "extract_metadata"}` | Claude **debe** llamar a **esa** herramienta | Un paso concreto tiene que ejecutarse sí o sí (por ejemplo, extraer metadatos antes de enriquecerlos) |
| `{"type": "none"}` | Claude no puede usar herramientas | Forzar una respuesta solo de texto |

Con `any` o `tool`, la API precarga la respuesta para forzar la llamada, así que Claude **no escribe texto antes** del bloque `tool_use`, aunque se lo pidas.

> **Matiz de actualidad.** La documentación actual indica que `any` y `tool` **no son compatibles con el pensamiento extendido manual** (dan error) y que en los modelos más recientes (Opus 5.5, Sonnet 5.5, Fable 5.1) devuelven un 400; allí se recomienda `auto` con *strict tool use* o las *structured outputs*. **Para el examen vale lo que dice la guía v1.0**: `auto`/`any`/forzado, con los usos de la tabla.

**Sintaxis frente a semántica.** Tool use con esquema **elimina los errores de sintaxis JSON** (llaves sin cerrar, comas, tipos). Pero **no** impide errores de significado:

- las líneas de la factura no suman el total;
- la fecha de vencimiento está en el campo de emisión;
- un valor plausible pero falso.

Eso se detecta con validación propia (sección 4.4). Las *structured outputs* actuales (`strict: true` en la herramienta, o `output_config.format` para la respuesta) refuerzan la garantía de forma mediante decodificación restringida, pero tampoco validan el contenido.

**Diseño del esquema: no obligues a inventar.** La decisión más importante:

- **Campos opcionales o nullables** (`["string", "null"]`) para información que **puede no estar** en el documento. Si el campo es obligatorio y no admite `null`, el modelo tiene que rellenarlo con algo, y lo inventará. Indica en la descripción que debe devolver `null` cuando no aparezca.
- **`enum` con `"other"` + campo de detalle** para categorías que pueden crecer: no pierdes los casos que no previste y luego puedes analizarlos.
- **`"unclear"`** en el `enum` para los casos genuinamente ambiguos, en vez de forzar una clasificación al azar.

**Reglas de normalización en el prompt.** El esquema dice *qué* tipo tiene cada campo, no *cómo* normalizar un origen desordenado. Acompáñalo de reglas: «fechas en ISO 8601», «importes en euros sin símbolo», «convierte "1,5 k" a 1500». Esquema estricto + reglas de formato = salida consistente.

### Qué busca el examen

- Salida estructurada fiable → **tool use con JSON Schema**, no «pide JSON en el prompt».
- `auto` puede devolver texto; `any` garantiza una llamada cuando hay **varios esquemas** y el tipo de documento es desconocido; forzado (`{"type": "tool", "name": ...}`) para **asegurar un paso concreto** antes de otros.
- El esquema elimina errores de **sintaxis**, no **semánticos**.
- Campos **nullables** para evitar valores inventados; `enum` con `"other"` + detalle y `"unclear"`.
- Trampa: hacer obligatorio un campo que a veces no está en el documento.

### Fuentes

- Building with the Claude API › Accessing Claude with the API › [Structured data](https://academy.claude.com/courses/building-with-the-claude-api/structured-data) (prefill + *stop sequences*)
- Building with the Claude API › Tool use with Claude › [Tool schemas](https://academy.claude.com/courses/building-with-the-claude-api/tool-schemas) (`name`, `description`, `input_schema`)
- Building with the Claude API › Tool use with Claude › [Fine grained tool calling](https://academy.claude.com/courses/building-with-the-claude-api/fine-grained-tool-calling) (la API valida el JSON de las herramientas; con *fine-grained* esa validación se desactiva)
- Building with the Claude API › Features of Claude › [Extended thinking](https://academy.claude.com/courses/building-with-the-claude-api/extended-thinking) (incompatible con prefill)
- Docs: [Define tools › Forcing tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#forcing-tool-use) · [Structured outputs › Strict tool use](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#strict-tool-use) · [Structured outputs › Invalid outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#invalid-outputs)
- Práctica: [Curso GitHub *Tool use* › 03 Structured outputs](https://github.com/anthropics/courses/blob/master/tool_use/03_structured_outputs.ipynb) · [05 Tool choice](https://github.com/anthropics/courses/blob/master/tool_use/05_tool_choice.ipynb)

---

## 4.4 Validación, reintentos y bucles de feedback en la extracción

### La idea en una frase

Valida la extracción con código y, si falla, **reintenta enviando el documento, la extracción fallida y los errores concretos**; pero reconoce cuándo reintentar es inútil porque **el dato no está en el documento**.

### Explicación

**El patrón evaluador-optimizador.** El curso lo presenta en la parte de workflows: un **productor** genera una salida, un **evaluador** la comprueba con unos criterios y, si no la acepta, le devuelve feedback al productor, que lo intenta de nuevo. La validación de extracciones es exactamente eso, con un evaluador de **código** (el curso los distingue de los evaluadores con modelo y humanos: el código valida sintaxis y formato; el modelo, criterios difíciles de programar).

**Reintento con feedback de error.** Un reintento «a ciegas» (repetir la misma petición) suele dar el mismo error. El reintento eficaz incluye:

1. el **documento original**;
2. la **extracción fallida**;
3. los **errores de validación concretos**.

```python
def extract_with_retry(doc, max_retries=2):
    data = extract(doc)
    for _ in range(max_retries):
        errors = validate(data)          # Pydantic, JSON Schema o reglas propias
        if not errors:
            return data
        data = extract(doc, feedback=f"""
<previous_extraction>{json.dumps(data)}</previous_extraction>
<validation_errors>
{chr(10).join(errors)}
</validation_errors>
Corrige solo los campos con error, usando el documento.""")
    return route_to_human(doc, data, errors)
```

El curso usa la misma idea al gestionar errores de herramientas: el `tool_result` con `"is_error": True` y el mensaje del error permite que Claude corrija su siguiente llamada.

**Cuándo reintentar sirve y cuándo no:**

| El reintento **funciona** | El reintento **no funciona** |
|---|---|
| Formato incorrecto (fecha `12/03/24` en lugar de ISO) | El dato **no existe** en el documento |
| Error estructural (un importe en el campo equivocado) | El dato está en **otro documento** que no se ha proporcionado (un anexo, un contrato marco) |
| Un total mal sumado que el documento sí permite calcular | El documento es ilegible o está cortado |

Si la información no está, reintentar solo consume tokens o, peor, empuja al modelo a inventarla. La respuesta correcta es devolver `null`, marcarlo y, si hace falta, enviarlo a revisión humana.

**Diseñar el esquema para que se autocorrija.** Algunos campos existen solo para validar:

- **`calculated_total` junto a `stated_total`**: Claude suma las líneas y copia el total impreso; si no coinciden, lo sabes sin adivinar cuál de los dos está mal.
- **`conflict_detected`** (booleano): el documento se contradice (dos fechas de vencimiento distintas); se señala en vez de elegir una en silencio.

**Bucle de feedback en revisiones de código: `detected_pattern`.** Cuando un desarrollador descarta un hallazgo, ¿qué lo provocó? Si cada hallazgo incluye un campo `detected_pattern` (por ejemplo, `"unchecked_null_return"`), puedes agregar los descartes por patrón y ver qué construcciones generan más falsos positivos. Así sabes qué criterios mejorar o qué categoría desactivar (4.1) con datos, no por intuición.

### Qué busca el examen

- Reintento = **documento + extracción fallida + errores concretos**, no repetir la petición.
- Saber distinguir errores **resolubles** (formato, estructura) de **irresolubles** (información ausente o en un documento externo).
- `calculated_total` frente a `stated_total` y `conflict_detected` como validación incorporada al esquema.
- `detected_pattern` para analizar sistemáticamente los falsos positivos.
- Errores de **sintaxis** los elimina el esquema; los **semánticos** necesitan esta validación.

### Fuentes

- Building with the Claude API › Agents and workflows › [Agents and workflows](https://academy.claude.com/courses/building-with-the-claude-api/agents-and-workflows) (patrón *Evaluator-Optimizer*)
- Building with the Claude API › Prompt evaluation › [Model based grading](https://academy.claude.com/courses/building-with-the-claude-api/model-based-grading)
- Building with the Claude API › Prompt evaluation › [Code based grading](https://academy.claude.com/courses/building-with-the-claude-api/code-based-grading)
- Building with the Claude API › Tool use with Claude › [Implementing multiple turns](https://academy.claude.com/courses/building-with-the-claude-api/implementing-multiple-turns) (`is_error`)
- Building with the Claude API › Agents and workflows › [Chaining workflows](https://academy.claude.com/courses/building-with-the-claude-api/chaining-workflows) (paso de revisión con instrucciones concretas)
- Docs: [Handle tool calls › Handling errors with `is_error`](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls#handling-errors-with-is-error) · [Reduce hallucinations › Basic strategies](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations#basic-hallucination-minimization-strategies)
- Práctica: [Cookbook › evaluator_optimizer](https://github.com/anthropics/claude-cookbooks/blob/main/patterns/agents/evaluator_optimizer.ipynb)

---

## 4.5 Estrategias eficientes de procesamiento por lotes

### La idea en una frase

La **Message Batches API** cuesta la mitad pero puede tardar hasta 24 horas sin garantía de latencia: úsala para trabajo **que nadie espera** (informes nocturnos, auditorías semanales) y nunca para flujos **bloqueantes** (comprobaciones antes del *merge*).

### Explicación

*Tus apuntes no cubren esta API; esta sección sale de la documentación oficial.*

**Qué ofrece:**

| Característica | Valor |
|---|---|
| Coste | **50 %** del precio estándar |
| Tiempo de proceso | La mayoría termina en menos de 1 hora, pero el límite es **24 horas**; lo que no termine, caduca |
| Garantía de latencia | **Ninguna** |
| Tamaño | Hasta 100.000 peticiones o 256 MB por lote |
| Resultados | Disponibles 29 días; pueden llegar **en cualquier orden** |
| Correlación | Campo **`custom_id`** en cada petición |
| Tipos de resultado | `succeeded`, `errored`, `canceled`, `expired` (solo se cobra el primero) |

**Cuándo sí y cuándo no.** La pregunta 11 de la guía es el ejemplo de manual. Hay dos flujos: una comprobación **pre-merge** que bloquea a los desarrolladores y un **informe nocturno** de deuda técnica. La respuesta correcta es lotes solo para el informe. Que los lotes «suelan» terminar en una hora no sirve para un flujo bloqueante, porque no está garantizado.

**Sin herramientas propias a mitad de petición.** Cada petición del lote se procesa de principio a fin sin ti. Si Claude pide una herramienta tuya (`tool_use`), la petición termina ahí: no puedes ejecutar la herramienta y devolver el resultado dentro del mismo lote. Para un flujo agéntico con varias vueltas de herramientas, tendrías que enviar otra petición con el historial. (Las herramientas de servidor, como la búsqueda web, sí se ejecutan dentro, porque las ejecuta Anthropic.) Para el examen: **el lote no sirve para tool calling multiturno dentro de una petición**.

**`custom_id`: correlacionar y reenviar.** Como los resultados no llegan en orden, cada petición lleva un identificador propio (`"invoice-2026-0412"`). Con él:

- unes cada resultado con su documento;
- identificas las que fallaron y **reenvías solo esas**, con la modificación adecuada (por ejemplo, **dividir en fragmentos** un documento que superó el límite de contexto).

**Calcular la frecuencia de envío según el SLA.** Si prometes resultados en 30 horas y un lote puede tardar 24, el tiempo máximo es la espera hasta el siguiente envío más el procesamiento. Con envíos **cada 4 horas**, el peor caso es 4 + 24 = 28 horas, dentro del SLA. Con envíos cada 6 horas, ya serían 30, sin margen.

**Refinar antes de lanzar.** Un error en el prompt multiplicado por 10.000 documentos sale caro, aunque sea a mitad de precio. Prueba y ajusta el prompt sobre una **muestra** (el ciclo de evaluación del curso) antes de lanzar el lote grande, para que la primera pasada acierte el máximo posible y reenvíes poco. La documentación añade: prueba primero la forma de una petición con la API normal, porque los errores de validación de un lote solo aparecen al terminar.

```python
batch = client.messages.batches.create(requests=[
    {"custom_id": f"doc-{d.id}",
     "params": {"model": MODEL, "max_tokens": 2048, "tools": tools,
                "tool_choice": {"type": "tool", "name": "extract_invoice"},
                "messages": [{"role": "user", "content": d.text}]}}
    for d in docs
])
# ... cuando termine:
for r in client.messages.batches.results(batch.id):
    if r.result.type != "succeeded":
        retry_ids.add(r.custom_id)
```

### Qué busca el examen

- **Bloqueante → API síncrona; tolerante a la latencia → lotes.** Nunca lotes para pre-merge.
- 50 % de ahorro, hasta 24 h, **sin SLA**.
- Sin tool calling multiturno dentro de una petición.
- `custom_id` para correlacionar y para **reenviar solo los fallidos**, con cambios (fragmentar documentos demasiado grandes).
- Cálculo de la frecuencia de envío a partir del SLA.
- Refinar el prompt con una muestra antes del volumen grande.
- Trampas: «los resultados no se pueden correlacionar» (falso, `custom_id`); «lotes con *fallback* a tiempo real» (complejidad innecesaria).

### Fuentes

- Building with the Claude API › Prompt evaluation › [A typical eval workflow](https://academy.claude.com/courses/building-with-the-claude-api/a-typical-eval-workflow) (refinar el prompt sobre un conjunto de prueba)
- Docs: [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) ([How it works](https://platform.claude.com/docs/en/build-with-claude/batch-processing#how-the-message-batches-api-works) · [Retrieving batch results](https://platform.claude.com/docs/en/build-with-claude/batch-processing#retrieving-batch-results) · [Best practices](https://platform.claude.com/docs/en/build-with-claude/batch-processing#best-practices-for-effective-batching))
- Práctica: [Cookbook › batch_processing](https://github.com/anthropics/claude-cookbooks/blob/main/misc/batch_processing.ipynb)

---

## 4.6 Arquitecturas de revisión con varias instancias y varias pasadas

### La idea en una frase

Un modelo revisa mal lo que acaba de generar en la misma sesión; usa una **instancia independiente** sin ese contexto y, en revisiones grandes, **divide** en pasadas por archivo más una pasada de integración.

### Explicación

**Por qué la autorrevisión falla.** La sesión que generó el código conserva el razonamiento que lo justificó, así que tiende a confirmarlo. El curso *Claude Code 101* lo dice así: «la misma sesión que escribió los cambios y los explicó **no es el mejor juez** para evaluar su calidad». Su recomendación: revisar tú el diff y luego pedir a Claude que lo revise **desde un contexto limpio**. Ni pedirle «revisa con ojo crítico» en la misma sesión ni el pensamiento extendido sustituyen a una instancia que no ha visto ese razonamiento.

**La instancia independiente.** Puede ser una sesión nueva, una llamada a la API sin el historial o un **subagente revisor**. El curso de subagentes lo explica: el revisor «aplica sus criterios de revisión especializados **sin conocer la historia** de cómo se ha escrito el código», y su *system prompt* puede llevar los estándares del equipo para que las revisiones sean coherentes. El mismo curso propone un formato de salida estructurado (resumen, problemas críticos, importantes, menores, recomendaciones, estado de aprobación), que además le da al revisor un punto claro de finalización.

**Varias pasadas contra la dilución de la atención.** La pregunta 12 de la guía describe el síntoma: un PR de 14 archivos revisado de una vez da comentarios profundos en unos archivos y superficiales en otros, se le escapan errores obvios y se contradice (marca un patrón en un archivo y lo aprueba en otro). La solución:

1. **Pasadas locales**, una por archivo: profundidad uniforme para los problemas locales.
2. **Pasada de integración**: solo flujos de datos y contratos **entre** archivos (una función cuyo tipo de retorno cambió y sus llamadas en otros módulos).

Es el encadenamiento de prompts del curso aplicado a la revisión: cada paso con un foco, en vez de un prompt gigante que intenta todo a la vez.

Las alternativas incorrectas de esa pregunta enseñan tanto como la correcta:

- «Un modelo con más contexto» no arregla la calidad de la atención.
- «Obligar a los desarrolladores a partir los PR» traslada el problema en lugar de arreglar el sistema.
- «Tres pasadas y solo reportar lo que salga en dos» **suprime** errores reales que solo se detectan a veces.

**Confianza por hallazgo para enrutar.** En una pasada de verificación, el modelo puede **declarar su confianza** junto a cada hallazgo. No sirve como filtro de precisión (ver 4.1), pero sí para **enrutar**: los de baja confianza van a revisión humana y los de alta se publican directamente. El curso usa una idea parecida en la evaluación con modelos: pedir puntos fuertes, débiles y razonamiento junto a la nota, porque sin ese contexto el evaluador tiende a notas intermedias.

### Qué busca el examen

- Revisión del código generado → **instancia independiente** sin el contexto del generador, no autorrevisión ni pensamiento extendido.
- Revisión grande e inconsistente → **pasadas por archivo + pasada de integración**.
- Confianza autodeclarada por hallazgo para **enrutar** la revisión (humano o automático).
- Trampas: más contexto, PR más pequeños como única solución, consenso entre varias ejecuciones.

### Fuentes

- Claude Code 101 › Daily workflows › [Code Review](https://academy.claude.com/courses/claude-code-101/code-review) (la sesión que escribió el cambio no es buen juez; revisar desde un contexto limpio)
- Introduction to subagents › [Using subagents effectively](https://academy.claude.com/courses/introduction-to-subagents/using-subagents-effectively) (Revisiones de código)
- Introduction to subagents › [Designing effective subagents](https://academy.claude.com/courses/introduction-to-subagents/designing-effective-subagents) (Defining an Output Format)
- Claude Code in action › Verify and share › [Trust it: Verifying unsupervised runs](https://academy.claude.com/courses/claude-code-in-action/trust-it-verifying-unsupervised-runs) (`/code-review` y empezar por el diff)
- Building with the Claude API › Agents and workflows › [Chaining workflows](https://academy.claude.com/courses/building-with-the-claude-api/chaining-workflows)
- Building with the Claude API › Prompt evaluation › [Model based grading](https://academy.claude.com/courses/building-with-the-claude-api/model-based-grading)
- Docs: [Sub-agents › Code reviewer](https://code.claude.com/docs/en/sub-agents#code-reviewer) · [Prompting best practices › Chain complex prompts](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#chain-complex-prompts)

---

## Chuleta de decisiones

| Si el enunciado dice... | Piensa en... |
|---|---|
| Demasiados falsos positivos | Criterios explícitos de qué reportar y qué no, no «sé conservador» |
| Severidad clasificada de forma inconsistente | Criterios por nivel con ejemplos de código |
| Una categoría hace que se ignore todo el revisor | Desactivarla temporalmente y mejorar su prompt |
| Instrucciones detalladas, salida aún inconsistente | Few-shot (2–4 ejemplos) |
| Casos ambiguos | Ejemplos con el razonamiento de por qué esa opción |
| Extracción con campos vacíos en documentos variados | Few-shot con formatos de documento distintos |
| Mala elección de herramienta | Mejorar descripciones de herramientas (antes que few-shot) |
| JSON con errores de sintaxis | Tool use con JSON Schema |
| Claude a veces responde texto en vez de llamar a la herramienta | `tool_choice: "any"` (o forzado) |
| Varios esquemas, tipo de documento desconocido | `tool_choice: "any"` |
| Un paso concreto debe ejecutarse primero | `tool_choice: {"type": "tool", "name": ...}` |
| Valores inventados en campos que no aparecen | Campos nullables / opcionales |
| Categorías que pueden crecer | `enum` con `"other"` + detalle; `"unclear"` para ambiguos |
| Formatos de origen inconsistentes | Reglas de normalización en el prompt + esquema |
| Las líneas no suman el total | Error semántico: `calculated_total` vs `stated_total` |
| Reintento que no mejora | Reenviar documento + extracción fallida + errores concretos |
| El dato está en un anexo no proporcionado | El reintento no sirve: `null` y revisión humana |
| Analizar por qué se descartan hallazgos | Campo `detected_pattern` |
| Pre-merge bloqueante | API síncrona |
| Informe nocturno o auditoría semanal | Message Batches API (−50 %) |
| Resultados de un lote desordenados | `custom_id` |
| Documento de un lote que superó el contexto | Reenviar solo ese, fragmentado |
| SLA de 30 h con lotes de hasta 24 h | Envíos cada ≤ 6 h; la guía usa 4 h para tener margen |
| Revisión complaciente del propio código | Instancia independiente |
| PR grande con revisión irregular y contradictoria | Pasadas por archivo + pasada de integración |
| Decidir qué hallazgos ve un humano | Confianza autodeclarada por hallazgo para enrutar |

## Preguntas de autoevaluación

1. Tu revisor automático marca muchos comentarios «inexactos» que en realidad están bien, y el equipo empieza a ignorar también los avisos de seguridad. Has añadido «reporta solo hallazgos de alta confianza» y no ha cambiado nada. ¿Qué haces?
2. Extraes datos de contratos, facturas y recibos que llegan mezclados, cada tipo con su herramienta de extracción. A veces Claude responde con un resumen en texto. ¿Qué `tool_choice` usas?
3. Tu esquema tiene `vendor_vat_id` como `string` obligatorio. En los recibos sin NIF aparece un NIF verosímil pero falso. ¿Qué cambias?
4. La validación detecta que la suma de las líneas no coincide con el total. ¿Qué incluyes en el reintento? ¿Y si el total correcto solo está en un anexo que no tienes?
5. Tienes que procesar 50.000 documentos con un SLA de 30 horas. ¿Qué API usas y cada cuánto envías lotes?
6. En un lote de 1.000 documentos fallan 12 porque superan la ventana de contexto. ¿Qué haces?
7. Generas un módulo con Claude y en la misma conversación le pides que lo revise. No encuentra nada, pero en producción aparecen dos errores. ¿Por qué y cómo lo cambias?

<details>
<summary>Soluciones</summary>

1. Sustituir la instrucción vaga por criterios explícitos («marca un comentario solo si lo que describe contradice lo que hace el código») con ejemplos de lo que sí y lo que no se reporta. Mientras lo mejoras, desactiva temporalmente esa categoría para recuperar la confianza en las demás.
2. `tool_choice: {"type": "any"}`: obliga a llamar a una herramienta, pero deja que Claude elija la que corresponde al tipo de documento.
3. Hacerlo nullable (`["string", "null"]`), indicar en la descripción que debe ser `null` si no aparece y, si hace falta, añadir ejemplos few-shot de recibos sin NIF.
4. El documento original, la extracción fallida y el error concreto («la suma de line_items es 1.240 y stated_total es 1.420»). Si el dato correcto solo está en un anexo no proporcionado, el reintento no sirve: marca el conflicto y envíalo a revisión humana.
5. Message Batches API, porque no es bloqueante y cuesta la mitad. Envía lotes como mucho cada 6 horas; la guía usa 4 horas (4 + 24 = 28 h) para tener margen. Antes, ajusta el prompt con una muestra.
6. Identificar los 12 por su `custom_id` y reenviar solo esos, divididos en fragmentos.
7. La sesión conserva el razonamiento con el que generó el código y tiende a confirmarlo. Revisa con una instancia independiente (sesión nueva, llamada sin historial o subagente revisor) y, si el cambio es grande, por archivos más una pasada de integración.

</details>
