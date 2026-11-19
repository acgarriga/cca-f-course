# Dominio 5 · Gestión del contexto y fiabilidad (15 %)

> Síntesis didáctica de los conceptos del Dominio 5 de la guía oficial del examen **Claude Certified Architect – Foundations** (v1.0).
> Fuentes principales: los apuntes de la carpeta `Anthropic/` (enlazados como `[[...]]`), sobre todo la gestión de contexto de *Claude Code 101* y *Claude Code in action*, *Introducción a subagentes* y la evaluación de prompts de *Creación con la API de Claude*. Este dominio es el que menos cubren los cursos: escalado, propagación de errores, calibración de la confianza y procedencia de la información se completan con los artículos de ingeniería de Anthropic (*Effective context engineering*, *Multi-agent research system*, *Effective harnesses for long-running agents*) y la documentación de la plataforma. El índice de recursos por *task statement* está en [[00-index]].

## Cómo usar este documento

Cada sección corresponde a un *task statement* (5.1 a 5.6) y sigue el mismo esquema que los documentos anteriores ([[01-agentic-architecture]], [[03-claude]], [[04-prompt-structured-output]]):

1. **La idea en una frase**.
2. **Explicación**, con ejemplos.
3. **Qué busca el examen**: los razonamientos que la guía premia y las trampas habituales.
4. **Fuentes**.

Al final hay una chuleta de decisiones y preguntas de autoevaluación.

Este dominio es transversal: aparece como dominio principal en cuatro de los seis escenarios del examen, **«Customer Support Resolution Agent»** (escalado, hechos del caso), **«Multi-Agent Research System»** (errores entre agentes, procedencia), **«Code Generation with Claude Code»** (sesiones largas) y **«Structured Data Extraction»** (revisión humana). Las preguntas 3 y 8 de la guía son de este dominio.

### El hilo conductor: el contexto es un recurso finito

El artículo *Effective context engineering* lo formula así: el contexto es **un recurso finito con rendimientos decrecientes**. Cada token que añades consume parte del «presupuesto de atención» del modelo, y a medida que la ventana se llena la memoria se vuelve menos fiable. El curso *Claude Code 101* lo dice con otras palabras: el contexto es **la memoria de trabajo** de Claude, y cada archivo leído, cada comando y cada resultado de herramienta ocupa espacio en ella.

De ahí salen las dos mitades del dominio:

| Mitad | Pregunta | Secciones |
|---|---|---|
| **Gestión del contexto** | ¿Qué información entra, cuál se conserva y dónde se guarda lo que no cabe? | 5.1, 5.4 |
| **Fiabilidad** | ¿Cuándo debe el sistema pararse, avisar, pedir ayuda o reconocer lo que no sabe? | 5.2, 5.3, 5.5, 5.6 |

---

## 5.1 Conservar la información crítica en interacciones largas

### La idea en una frase

Los datos que no pueden perderse (importes, fechas, identificadores, lo que el cliente espera) se guardan **fuera del historial resumido**, en un bloque estructurado que acompaña a cada petición; y lo que entra al contexto se recorta y se ordena para que lo importante no quede enterrado.

### Explicación

**El punto de partida: la API no tiene memoria.** El curso de la API lo explica en las conversaciones de varios turnos: Claude no guarda el historial, cada petición es independiente. Para mantener la coherencia, **tu código** guarda la lista de mensajes y envía **el historial completo** en cada petición. Si omites turnos anteriores, Claude responde sin saber de qué se estaba hablando.

**El problema: el historial crece y hay que resumirlo.** En una conversación larga (o en un agente con muchas herramientas), tarde o temprano hay que compactar. *Claude Code 101* avisa de que la compactación automática «resume los detalles importantes» pero «**pueden perderse algunos detalles**». El riesgo concreto del **resumen progresivo** es que convierte datos precisos en frases vagas:

| Antes del resumen | Después de dos resúmenes |
|---|---|
| «Pedido 88213, cobrado 149,90 € el 3 de octubre; el cliente quiere el reembolso completo, no un vale» | «El cliente tiene un problema con un pedido reciente y quiere una compensación» |

Los números, porcentajes, fechas y **expectativas declaradas por el cliente** son justo lo que más sufre.

**La solución: un bloque de «hechos del caso».** Extrae los datos transaccionales a una estructura persistente que se incluye en **cada** prompt, **fuera** del historial que se resume:

```text
<case_facts>
customer_id: C-10442 (verificado)
issues:
  - order_id: 88213 · importe: 149,90 € · fecha: 2026-10-03 · estado: entregado dañado
    expectativa del cliente: reembolso completo (rechaza vale)
  - order_id: 88420 · importe: 32,00 € · estado: en tránsito · sin acción pedida
</case_facts>
```

Si la sesión trata **varios problemas** a la vez, esta capa separada (un elemento por problema, con su identificador, importe y estado) evita que se mezclen al resumir.

**Recortar los resultados de herramientas.** Los resultados se acumulan en el contexto y consumen tokens **en proporción a su tamaño, no a su relevancia**. Una consulta de pedido que devuelve más de 40 campos cuando para una devolución solo importan 5 llena el contexto de ruido en pocas vueltas. Recorta **antes** de que entren: quédate con los campos relevantes para la tarea (en el Agent SDK, un hook `PostToolUse` puede hacerlo; ver [[01-agentic-architecture]], 1.5). El artículo de contexto añade una variante: **borrar resultados antiguos** que ya se usaron es la forma más ligera y segura de compactación.

**El efecto *lost in the middle*.** Los modelos procesan bien el principio y el final de una entrada larga, pero pueden pasar por alto lo que está en medio. Cuando juntas muchos resultados (por ejemplo, los informes de diez subagentes):

- pon un **resumen de los hallazgos clave al principio**;
- organiza el detalle con **cabeceras de sección explícitas** (o etiquetas XML), para que cada parte sea localizable.

La documentación da una regla complementaria para documentos largos: el material extenso arriba y **la pregunta al final** (mejora la calidad hasta un 30 % en sus pruebas), y cada documento en sus propias etiquetas con sus metadatos (`<document>`, `<source>`).

**Lo que devuelven los agentes de arriba.** Si el agente de abajo (por ejemplo, el sintetizador) tiene poco presupuesto de contexto, los agentes de arriba deben devolver **datos estructurados** (hechos clave, citas, puntuación de relevancia) y no su contenido íntegro ni su cadena de razonamiento. Y deben incluir **metadatos**: fechas, ubicación de la fuente, contexto metodológico. Sin ellos, la síntesis no puede interpretar bien los hallazgos (ver 5.6). El curso de subagentes lo aplica con el **formato de salida definido** en el *system prompt* del subagente.

### Qué busca el examen

- Datos transaccionales en un bloque persistente de **hechos del caso**, fuera del historial resumido.
- **Recortar** los resultados de herramientas a los campos relevantes antes de que se acumulen.
- **Resumen de hallazgos al principio** y cabeceras explícitas contra el efecto *lost in the middle*.
- Enviar el **historial completo** en cada petición a la API.
- Agentes de arriba que devuelven **datos estructurados con metadatos**, no texto largo ni razonamiento.
- Trampa: confiar en que el resumen automático conservará los importes y las fechas.

### Fuentes

- Building with the Claude API › Multi-Turn conversations › [Multi-turn conversations with tools](https://academy.claude.com/courses/building-with-the-claude-api/multi-turn-conversations) (historial completo en cada petición)
- Claude Code 101 › Daily workflows › [Context management](https://academy.claude.com/courses/claude-code-101/context-management) (la compactación puede perder detalles)
- Introduction to subagents › [Designing effective subagents](https://academy.claude.com/courses/introduction-to-subagents/designing-effective-subagents) (Defining an Output Format)
- Building with the Claude API › Prompt engineering techniques › [Structure with XML tags](https://academy.claude.com/courses/building-with-the-claude-api/structure-with-xml-tags)
- Artículo: [Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)
- Docs: [Prompting best practices › Long context prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#long-context-prompting) · [Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing)

---

## 5.2 Escalado y resolución de la ambigüedad

### La idea en una frase

Escala cuando el cliente **pide un humano**, cuando la política **no cubre** el caso o cuando **no puedes avanzar**; no escales por el tono del cliente ni por una confianza autodeclarada, y ante varias coincidencias **pregunta**, no adivines.

### Explicación

*Tus apuntes no cubren esta sección; sale de la guía y de las guías de casos de uso de la documentación.*

**Los disparadores correctos:**

| Disparador | Ejemplo | Qué hacer |
|---|---|---|
| El cliente **pide explícitamente** un humano | «Quiero hablar con una persona» | Escalar **de inmediato**, sin intentar investigar antes |
| **Excepción o hueco** en la política | Pide igualar el precio de un competidor y la política solo habla de ajustes de precio en la propia web | Escalar: la política no cubre el caso |
| **No hay progreso** posible | Tras varios intentos, el sistema no permite resolverlo | Escalar con un resumen del caso |

Fíjate en el segundo: el disparador no es «caso complejo», sino «caso que la política **no contempla**». Un caso largo pero cubierto por la política (devolución estándar con foto del daño) se resuelve sin escalar.

**Frustración no es lo mismo que petición de humano.** Si el cliente está molesto pero el problema es sencillo y está a tu alcance, **reconoce la frustración y ofrece la solución**. Solo escalas si el cliente **reitera** que prefiere a una persona. En cambio, si lo pide claramente desde el principio, se respeta sin más.

**Malos indicadores de complejidad.** La pregunta 3 de la guía lo resume: un agente con un 55 % de resolución en el primer contacto escala los casos sencillos y se atreve con los que requieren excepciones. Las opciones incorrectas son tentadoras:

- **Confianza autodeclarada** (1–10) con un umbral: la confianza del modelo está mal calibrada; el agente ya está **seguro y equivocado** en los casos difíciles.
- **Análisis de sentimiento**: el enfado del cliente **no se correlaciona** con la complejidad del caso.
- **Un clasificador entrenado aparte**: excesivo antes de haber probado a mejorar el prompt.

La respuesta correcta es la proporcionada: **criterios de escalado explícitos con ejemplos few-shot** en el *system prompt* que muestren cuándo escalar y cuándo resolver. Es lo mismo que vimos en 4.1 y 4.2 ([[04-prompt-structured-output]]): criterios categóricos + ejemplos que enseñan el juicio en los casos frontera.

**Varias coincidencias: pedir más datos.** Si `get_customer` devuelve tres clientes llamados «Laura Martín», el agente no debe elegir el más reciente ni el que «parece» encajar. Debe pedir **otro identificador** (correo, número de pedido, últimos dígitos del teléfono). Una suposición errónea aquí tiene consecuencias reales: reembolsar al cliente equivocado o revelar datos de otra persona.

**Cómo se escala.** Recuerda lo que vimos en el Dominio 1 (1.4): la persona que recibe el caso **no ve la transcripción**, así que el agente entrega un resumen estructurado y autosuficiente (cliente, problema, qué se ha hecho, qué se recomienda).

### Qué busca el examen

- Petición explícita de humano → escalar **inmediatamente**.
- Política ambigua o que no cubre el caso → escalar; caso complejo pero cubierto → resolver.
- Frustración con problema sencillo → reconocerla y ofrecer la solución; escalar si el cliente insiste.
- Sentimiento y confianza autodeclarada **no** sirven para decidir el escalado.
- Mejorar la calibración con **criterios explícitos + few-shot** antes que con infraestructura.
- Varias coincidencias → **pedir un identificador adicional**, nunca elegir por heurística.

### Fuentes

- Building with the Claude API › Accessing Claude with the API › [System prompts](https://academy.claude.com/courses/building-with-the-claude-api/system-prompts)  (dónde van los criterios de comportamiento)
- [[04-prompt-structured-output]] (4.1 criterios explícitos y 4.2 few-shot)
- Docs: [Customer support agent (guía de caso de uso)](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat) · [Ticket routing](https://platform.claude.com/docs/en/about-claude/use-case-guides/ticket-routing)
- Práctica: [Cookbook › customer_service_agent](https://github.com/anthropics/claude-cookbooks/blob/main/tool_use/customer_service_agent.ipynb)

---

## 5.3 Propagación de errores en sistemas multiagente

### La idea en una frase

Cuando un subagente falla, debe devolver al coordinador un **error estructurado** (qué falló, qué intentó, qué consiguió y qué alternativas hay), distinguiendo un **fallo de acceso** de un **resultado vacío válido**; ni ocultar el error ni tumbar todo el flujo.

### Explicación

**Por qué importa.** El coordinador es quien tiene la visión de conjunto: puede reintentar con otra consulta, probar otra fuente o seguir con resultados parciales. Pero solo puede decidir bien si le llega **información** sobre el fallo.

**Las cuatro respuestas a un *timeout*** (pregunta 8 de la guía):

| Respuesta del subagente | Problema |
|---|---|
| Lanzar la excepción hasta arriba y **abortar** todo el flujo | Un fallo local tira el trabajo de todos los demás subagentes |
| Devolver **un resultado vacío marcado como éxito** | **Suprime** el error: el coordinador cree que «no hay nada» y el informe sale incompleto sin aviso |
| Reintentar internamente y devolver un genérico **«búsqueda no disponible»** | Oculta el contexto: el coordinador no sabe qué se buscó ni qué se obtuvo |
| **Error estructurado** con tipo, consulta intentada, resultados parciales y alternativas | ✓ El coordinador puede decidir |

```json
{
  "status": "error",
  "failure_type": "timeout",
  "attempted": "query: 'impacto de la IA en la industria musical 2025' (3 intentos)",
  "partial_results": [{"source": "...", "summary": "..."}],
  "alternatives": ["acotar la consulta a 'streaming'", "usar la fuente de informes sectoriales"]
}
```

**Fallo de acceso frente a resultado vacío.** Son cosas opuestas y el coordinador tiene que distinguirlas:

- **Fallo de acceso** (*timeout*, permiso denegado, servicio caído): la consulta **no se pudo hacer**. Tiene sentido decidir si reintentar.
- **Resultado vacío válido**: la consulta **se hizo bien** y no hay coincidencias. Reintentar no sirve; es información en sí misma.

Si ambos llegan como «0 resultados», el coordinador reintentará lo que no tiene arreglo o dará por concluido lo que nunca se buscó.

**Recuperación local primero.** Los fallos transitorios (un *timeout* puntual) los resuelve el propio subagente con un reintento. Solo **propaga** lo que no puede resolver, y cuando lo hace incluye lo que intentó y los resultados parciales. El curso de subagentes apunta en la misma dirección con su sección **«Obstáculos encontrados»** en el formato de salida: los problemas, soluciones alternativas y particularidades descubiertas deben volver al hilo principal, o este tendrá que redescubrirlos. Y en la API, el curso enseña a devolver los fallos de herramientas como `tool_result` con `"is_error": true` y el mensaje del error, en vez de romper el bucle.

El artículo *Multi-agent research system* confirma la idea desde la práctica: «hacer saber al agente que una herramienta está fallando y dejar que se adapte funciona sorprendentemente bien», combinado con salvaguardas deterministas (reintentos, *checkpoints*) y la capacidad de **reanudar desde donde se produjo el error** en lugar de empezar de cero.

**Anotaciones de cobertura en la síntesis.** Si una fuente no estuvo disponible, el informe final debe decirlo: qué hallazgos están **bien respaldados** y qué áreas tienen **huecos** por fuentes inaccesibles. Un informe que parece completo pero no lo es resulta peor que uno que declara sus límites.

### Qué busca el examen

- Error estructurado con **tipo de fallo, intento, resultados parciales y alternativas**.
- Distinguir **fallo de acceso** de **resultado vacío válido**.
- Antipatrones: **suprimir** el error (vacío como éxito) y **abortar** todo el flujo por un fallo.
- Estado genérico («no disponible») = contexto perdido.
- Recuperación **local** de fallos transitorios; propagar solo lo irresoluble.
- Síntesis con **anotaciones de cobertura**.

### Fuentes

- Introduction to subagents › [Designing effective subagents](https://academy.claude.com/courses/introduction-to-subagents/designing-effective-subagents) (Reporting Obstacles)
- Building with the Claude API › Tool use with Claudes › [Implementing multiple turns](https://academy.claude.com/courses/building-with-the-claude-api/implementing-multiple-turns) (Error Handling: `is_error`)
- [[01-agentic-architecture]] (1.2, coordinador y subagentes)
- Artículo: [How we built our multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system)
- Docs: [Claude Code › API errors in subagents](https://code.claude.com/docs/en/sub-agents#api-errors-in-subagents)

---

## 5.4 Gestionar el contexto al explorar bases de código grandes

### La idea en una frase

En sesiones largas de exploración, el contexto se degrada: **delega** la exploración verbosa en subagentes, **guarda** los hallazgos en archivos fuera del contexto, **resume** entre fases y usa `/compact` con instrucciones.

### Explicación

**El síntoma: degradación del contexto.** Tras una sesión larga explorando un código desconocido, el modelo empieza a dar respuestas inconsistentes y a hablar de «patrones típicos» en lugar de las clases concretas que encontró antes. El curso de subagentes lo explica: el espacio es finito y, cuando se llena, **Claude empieza a perder el hilo** de las partes anteriores de la conversación.

**Herramienta 1: subagentes para aislar la exploración.** Es el uso estrella del curso. Un subagente recibe una pregunta concreta («encuentra todos los archivos de test», «traza las dependencias del flujo de reembolsos»), lee lo que haga falta en **su propio contexto** y devuelve un resumen («La validación del JWT se hace en `middleware/auth.js`, línea 42»). El agente principal conserva la **coordinación de alto nivel** sin el ruido. La regla del curso para decidir: **¿importa el trabajo intermedio?** Si solo necesitas el resultado, delega; si cada paso depende del anterior, mantenlo en el hilo principal. La contrapartida: pierdes visibilidad sobre cómo llegó el subagente a su conclusión.

**Herramienta 2: archivos *scratchpad*.** El agente escribe los hallazgos clave en un archivo (por ejemplo, `NOTES.md` o `findings.md`) y lo **consulta** para las preguntas siguientes en lugar de fiarse de lo que recuerda del historial. El artículo de *context engineering* lo llama **toma de notas estructurada**: notas que persisten fuera de la ventana de contexto y se recargan cuando hacen falta. La documentación recomienda JSON para el estado estructurado (resultados de tests, estado de tareas), texto libre para las notas de progreso y **git** como registro y punto de control.

**Herramienta 3: resumir entre fases.** Antes de lanzar los subagentes de la siguiente fase, **resume** los hallazgos de la anterior e **inyecta ese resumen** en su contexto inicial. Así cada fase empieza sabiendo lo que se descubrió, sin heredar todo el ruido. El artículo *Multi-agent research system* describe lo mismo: los agentes resumen las fases completadas y guardan lo esencial en memoria externa; el agente principal guarda incluso **su plan** en memoria por si la ventana se trunca.

**Herramienta 4: `/compact` con instrucciones.** El curso *Claude Code 101* distingue: `/compact` cuando sigues con la **misma** tarea y el contexto se llena; `/clear` cuando empiezas otra cosa. *Claude Code in action* añade el matiz importante: **no ejecutes `/compact` sin más**; escribe después qué debe conservar (`/compact Céntrate en el flujo de reembolsos y las clases que lo implementan`), porque el resumen puede perder justo lo que necesitas. `/context` te muestra cuánto ocupa cada cosa.

**Herramienta 5: recuperación tras una caída (manifiestos).** En un sistema multiagente largo, si el proceso se cae no quieres empezar de cero. Diseño:

1. Cada agente **exporta su estado** (qué ha hecho, qué ha encontrado, qué falta) a una **ubicación conocida**.
2. El coordinador mantiene un **manifiesto** que apunta a esos estados.
3. Al reanudar, el coordinador **carga el manifiesto** e inyecta el estado de cada agente en su prompt.

El artículo *Effective harnesses for long-running agents* aplica la misma idea entre sesiones: un archivo de progreso (`claude-progress.txt`), una lista de funcionalidades en JSON y los commits de git permiten que una sesión nueva «se oriente» leyendo el estado en lugar de adivinarlo.

### Qué busca el examen

- Respuestas inconsistentes y «patrones típicos» = **degradación del contexto**.
- Subagentes para preguntas concretas; el principal **coordina**.
- **Scratchpad** con hallazgos clave, consultado en preguntas posteriores.
- **Resumir** una fase antes de lanzar la siguiente e inyectar ese resumen.
- **Manifiestos** de estado para reanudar tras una caída.
- `/compact` (con instrucciones) cuando el contexto se llena de salida de exploración.
- Trampa: seguir en la misma sesión acumulando lecturas, o empezar de cero tras una caída.

### Fuentes

- Claude Code 101 › Daily workflows › [Context management](https://academy.claude.com/courses/claude-code-101/context-management) (Tips for Saving Context Space)
- Claude Code 101 › Customizing Claude Code › [Subagents](https://academy.claude.com/courses/claude-code-101/subagents)
- Claude Code in action › Steer the work › [Steering long sessions](https://academy.claude.com/courses/claude-code-in-action/steering-long-sessions) (Steer while Claude works: `/compact` con instrucciones, *Rewind* y *Summarize*)
- Introduction to subagents › [What are subagents?](https://academy.claude.com/courses/introduction-to-subagents/what-are-subagents) (Why Subagents Matter)
- Introduction to subagents › [Using subagents effectively](https://academy.claude.com/courses/introduction-to-subagents/using-subagents-effectively) (Research tasks; The Decision Rule)
- Artículos: [Effective context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) · [Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents) · [Multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system)
- Docs: [Prompting best practices › State management best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#state-management-best-practices)

---

## 5.5 Flujos de revisión humana y calibración de la confianza

### La idea en una frase

Antes de reducir la revisión humana, **mide la precisión por tipo de documento y por campo** (no solo la global), calibra los umbrales de confianza con **datos etiquetados** y sigue **muestreando** lo que se automatiza.

### Explicación

**El curso: medir en lugar de suponer.** La parte de evaluación del curso de la API es la base de esta sección: un conjunto de casos de prueba, una ejecución sobre todos ellos y una nota objetiva. El curso distingue tres tipos de evaluadores (de código, de modelo y humanos) y advierte que los humanos son los más flexibles pero los más lentos, por eso hay que **usarlos donde más aportan**.

**La trampa de la métrica agregada.** Un sistema de extracción con un **97 % de precisión global** puede tener un 99 % en facturas, que son la mayoría, y un 60 % en contratos, o fallar casi siempre en un campo concreto (la fecha de vencimiento). La media lo esconde. Antes de automatizar, analiza la precisión **por segmento**: tipo de documento y campo. Solo automatizas los segmentos que cumplen.

**Confianza por campo, calibrada.** El modelo puede devolver una confianza **por campo** (no una global). Pero, como vimos en 5.2, la confianza autodeclarada no está calibrada de entrada. Se calibra con un **conjunto de validación etiquetado**: compruebas a qué precisión real corresponde cada nivel de confianza y fijas el umbral a partir de eso («por encima de 0,9, la precisión real es del 99 % → no revisar; por debajo, revisar»).

**Qué va a revisión humana.** La capacidad de revisión es limitada; prioriza:

- campos con **confianza baja**;
- documentos **ambiguos o contradictorios** (el `conflict_detected` de 4.4);
- segmentos (tipos de documento, campos) que aún no han demostrado buena precisión.

**Muestreo aleatorio estratificado.** Aunque automatices lo de confianza alta, revisa una **muestra aleatoria** de ello, estratificada por tipo de documento y campo. Sirve para dos cosas: medir la tasa de error real de lo que nadie mira y detectar **patrones de error nuevos** (un proveedor cambió el formato de sus facturas) antes de que se acumulen.

### Qué busca el examen

- Una precisión global alta **no basta**: validar por **tipo de documento y campo** antes de reducir la revisión.
- Confianza **por campo**, calibrada con un **conjunto de validación etiquetado**.
- Enrutar a humanos lo de **baja confianza** y las fuentes **ambiguas o contradictorias**.
- **Muestreo aleatorio estratificado** de lo de confianza alta para medir errores y detectar patrones nuevos.
- Trampa: usar la confianza autodeclarada sin calibrar como umbral.

### Fuentes

- Building with the Claude API › Prompt evaluation › [Prompt evaluation](https://academy.claude.com/courses/building-with-the-claude-api/prompt-evaluation) (Prompt Engineering vs Prompt Evaluation)
- Building with the Claude API › Prompt evaluation › [Generating test datasets](https://academy.claude.com/courses/building-with-the-claude-api/generating-test-datasets)
- Building with the Claude API › Prompt evaluation › [Model based grading](https://academy.claude.com/courses/building-with-the-claude-api/model-based-grading) (evaluadores de código, de modelo y humanos)
- Docs: [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- Artículo: [Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents)

> Nota: el muestreo estratificado y la calibración de umbrales son prácticas generales de evaluación; Anthropic las trata de forma indirecta en sus guías de evals, sin una página dedicada.

---

## 5.6 Conservar la procedencia y gestionar la incertidumbre en síntesis multifuente

### La idea en una frase

Cada afirmación debe viajar **con su fuente** (URL, documento, extracto, fecha) a través de todos los pasos; los conflictos entre fuentes se **anotan**, no se resuelven eligiendo un valor al azar.

### Explicación

*Tus apuntes no cubren esta sección (falta la lección de* Citations *del curso de la API); sale de la guía, del artículo* Multi-agent research system *y de la documentación.*

**Cómo se pierde la procedencia.** El subagente A encuentra «el mercado creció un 12 % (informe X, 2024)». El coordinador lo resume como «el mercado crece con fuerza». El sintetizador ya no puede citar nada. Cada paso de **resumen** que comprime hallazgos sin conservar el **vínculo afirmación–fuente** destruye la atribución. El artículo de Anthropic lo llama el «juego del teléfono» y propone que los subagentes guarden su trabajo en sistemas externos y pasen **referencias ligeras** al coordinador; al final, un **agente de citas** asocia cada afirmación con su fuente.

**El vínculo afirmación–fuente estructurado.** Exige a los subagentes una salida como esta, y exige al sintetizador que la **preserve y fusione**:

```json
{
  "claim": "El 38 % de los estudios de animación usa IA generativa en preproducción",
  "source_url": "https://...",
  "document": "Encuesta sectorial 2025",
  "excerpt": "...38% of studios reported...",
  "published": "2025-03",
  "methodology": "encuesta a 412 estudios"
}
```

**Conflictos entre fuentes fiables.** Dos fuentes creíbles dan cifras distintas (38 % y 22 %). El error es **elegir una** sin decirlo. Lo correcto:

- terminar el análisis **con ambos valores** incluidos y anotados con su fuente;
- dejar que el **coordinador** decida cómo reconciliarlos antes de la síntesis;
- en el informe, separar los hallazgos **consolidados** de los **discutidos**, conservando cómo los caracteriza cada fuente y su contexto metodológico (quizá una encuesta mide estudios grandes y la otra, todos).

**Fechas: no confundir cambio con contradicción.** «22 % en 2023» y «38 % en 2025» no se contradicen; describen una evolución. Sin **fechas de publicación o de recogida** en la salida estructurada, el sintetizador puede tomarlas por un conflicto o, peor, mezclarlas. Por eso la guía pide que los subagentes **siempre** incluyan esas fechas.

**Cada tipo de contenido en su formato.** No conviertas todo al mismo molde: los **datos financieros en tablas**, las **noticias en prosa**, los **hallazgos técnicos en listas estructuradas**. Forzar un único formato hace perder información (una tabla de cifras convertida en párrafos es ilegible; una noticia convertida en viñetas pierde el contexto).

**Relación con 5.3.** Las **anotaciones de cobertura** (qué está bien respaldado y dónde hay huecos por fuentes no disponibles) son la otra cara de la procedencia: el informe dice de dónde sale cada cosa **y** qué no se pudo comprobar.

### Qué busca el examen

- Vínculos **afirmación–fuente** estructurados (URL, documento, extracto) que se preservan hasta el informe final.
- Conflictos entre fuentes fiables: **anotarlos con su atribución**, no elegir uno; el coordinador decide la reconciliación.
- Informe con secciones de hallazgos **consolidados** frente a **discutidos**.
- **Fechas** de publicación o recogida para no confundir diferencias temporales con contradicciones.
- Formato **adecuado a cada tipo de contenido**.
- Trampa: un resumen intermedio que comprime sin conservar las fuentes.

### Fuentes

- Introduction to subagents › [Designing effective subagents](https://academy.claude.com/courses/introduction-to-subagents/designing-effective-subagents) (Defining an Output Format: salida estructurada del subagente)
- Artículo: [How we built our multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system) (juego del teléfono, CitationAgent)
- Docs: [Citations](https://platform.claude.com/docs/en/build-with-claude/citations) · [Prompting best practices › Research and information gathering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#research-and-information-gathering) · [Reduce hallucinations › Advanced techniques](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations#advanced-techniques)

---

## Chuleta de decisiones

| Si el enunciado dice... | Piensa en... |
|---|---|
| El agente olvida importes, fechas o lo que pidió el cliente | Bloque persistente de **hechos del caso** fuera del historial resumido |
| Sesión con varios problemas a la vez | Capa estructurada separada, un elemento por problema |
| Resultados de herramientas con decenas de campos | Recortar a los campos relevantes antes de que entren al contexto |
| Hallazgos del medio de una entrada larga ignorados | Resumen clave al principio + cabeceras de sección |
| Claude no recuerda lo anterior en la API | Enviar el historial completo en cada petición |
| El sintetizador tiene poco presupuesto de contexto | Agentes de arriba que devuelven datos estructurados con metadatos |
| El cliente pide un humano | Escalar de inmediato |
| La política no cubre el caso | Escalar |
| Cliente frustrado, problema sencillo | Reconocer y ofrecer solución; escalar si insiste |
| Escalado mal calibrado | Criterios explícitos + few-shot en el *system prompt* |
| Propuestas de sentimiento o confianza autodeclarada | Malos indicadores de complejidad |
| Varias coincidencias de cliente | Pedir un identificador adicional |
| *Timeout* de un subagente | Error estructurado: tipo, intento, parciales, alternativas |
| «0 resultados» ambiguo | Distinguir fallo de acceso de resultado vacío válido |
| Error devuelto como éxito vacío / flujo abortado | Antipatrones |
| Fallo transitorio | Recuperación local; propagar solo lo irresoluble |
| Fuentes inaccesibles en el informe | Anotaciones de cobertura |
| Respuestas inconsistentes tras una sesión larga | Degradación del contexto: subagentes, scratchpad, `/compact` |
| Exploración que llena el contexto | Subagente con pregunta concreta |
| Fase siguiente de la exploración | Resumir la anterior e inyectar el resumen |
| Caída a mitad de un proceso multiagente | Manifiesto de estados que el coordinador carga al reanudar |
| Precisión global del 97 % | Analizar por tipo de documento y campo antes de automatizar |
| Fijar umbrales de confianza | Confianza por campo calibrada con datos etiquetados |
| Vigilar lo automatizado | Muestreo aleatorio estratificado |
| Se pierden las fuentes al resumir | Vínculos afirmación–fuente que se preservan |
| Dos fuentes fiables discrepan | Anotar ambos valores con su fuente; decide el coordinador |
| Cifras de años distintos parecen contradecirse | Exigir fechas de publicación o recogida |
| Informe con datos financieros, noticias y hallazgos técnicos | Tablas, prosa y listas, respectivamente |

## Preguntas de autoevaluación

1. Tras una conversación de 40 turnos, tu agente de soporte ofrece un vale al cliente que, al principio, dijo que solo aceptaría un reembolso del importe completo (149,90 €). ¿Qué ha pasado y cómo lo evitas?
2. Un cliente escribe: «Es la tercera vez que contacto, esto es una vergüenza». Su problema es un cambio de dirección que el agente puede hacer. ¿Escala?
3. El cliente pide que le igualen el precio de otra tienda. Vuestra política solo menciona ajustes de precio en la propia web. ¿Qué hace el agente?
4. Tu subagente de búsqueda captura los *timeouts* y devuelve `{"results": []}`. ¿Qué problema causa y qué debería devolver?
5. Después de dos horas explorando un monorepo, Claude empieza a decir que «normalmente estos servicios usan un patrón repositorio» en vez de nombrar las clases que leyó. ¿Qué haces?
6. Tu extractor tiene un 97 % de precisión global y el equipo quiere eliminar la revisión humana. ¿Qué compruebas antes?
7. Dos subagentes devuelven cifras distintas sobre el mismo indicador: una de un informe de 2023 y otra de una encuesta de 2025. El sintetizador elige la más reciente sin decir nada. ¿Qué cambias?

<details>
<summary>Soluciones</summary>

1. El resumen progresivo convirtió la expectativa concreta del cliente en algo vago. Extrae los hechos del caso (pedido, importe, fecha, expectativa) a un bloque persistente que se incluya en cada prompt, fuera del historial que se resume.
2. No por defecto. Reconoce la frustración y ofrece resolverlo, porque está a su alcance. Escala solo si el cliente reitera que quiere hablar con una persona.
3. Escala. La política no cubre ese caso, y es una excepción que no le corresponde decidir al agente.
4. Suprime el error: el coordinador cree que no había nada que encontrar. Debe devolver un error estructurado (tipo `timeout`, consulta intentada, resultados parciales, alternativas) distinguible de un resultado vacío válido.
5. Es degradación del contexto. Guarda los hallazgos clave en un scratchpad y consúltalo, delega las preguntas concretas en subagentes y usa `/compact` con instrucciones sobre qué conservar (o empieza una fase nueva inyectando un resumen).
6. La precisión por tipo de documento y por campo, la calibración de la confianza por campo con un conjunto etiquetado y un plan de muestreo aleatorio estratificado de lo que se automatice.
7. Exige fechas de publicación o recogida y vínculos afirmación–fuente en la salida de los subagentes. En el informe, presenta ambos valores con su fuente y su fecha (probablemente es una evolución, no una contradicción). Si discrepan de verdad, se anotan como hallazgo discutido.

</details>
