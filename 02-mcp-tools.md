# Dominio 2 · Diseño de herramientas e integración con MCP (18 %)

> Síntesis didáctica de los conceptos del Dominio 2 de la guía oficial del examen **Claude Certified Architect – Foundations** (v1.0).
> Fuentes principales: los apuntes de la carpeta `Anthropic/` (enlazados como `[[...]]`), sobre todo *Introducción a MCP*, *Model Context Protocol* (temas avanzados), la parte de uso de herramientas y MCP de *Creación con la API de Claude*, la sección de MCP de *Claude Code 101* e *Introducción a subagentes*. Se completa con el artículo *Writing effective tools for agents*, la especificación de MCP y la documentación de Claude Code. El índice de recursos por *task statement* está en [[00-index]].

## Cómo usar este documento

Cada sección corresponde a un *task statement* (2.1 a 2.5) y sigue el mismo esquema que [[01-agentic-architecture]], [[03-claude]], [[04-prompt-structured-output]] y [[05-context]]:

1. **La idea en una frase**.
2. **Explicación**, con ejemplos.
3. **Qué busca el examen**: los razonamientos que la guía premia y las trampas habituales.
4. **Fuentes**.

Antes de las secciones hay un repaso de **qué es MCP** y, al final, un apartado sobre **lo que ha quedado obsoleto en la especificación 2026-07-28**, seguido de la chuleta de decisiones y las preguntas de autoevaluación.

Este dominio aparece como principal en cuatro escenarios: **«Customer Support Resolution Agent»** (herramientas MCP `get_customer`, `lookup_order`, `process_refund`, `escalate_to_human`), **«Multi-Agent Research System»** (reparto de herramientas entre agentes), **«Developer Productivity with Claude»** (herramientas integradas y servidores MCP) y, de forma secundaria, los de Claude Code. Las preguntas 1, 2 y 9 de la guía tocan este dominio.

---

## Repaso: qué es MCP y cómo encaja con el *tool use*

**Tool use** es el mecanismo de la API por el que Claude pide ejecutar una función: tú defines la herramienta (nombre, descripción, `input_schema`), Claude devuelve un bloque `tool_use`, tu código la ejecuta y le devuelves un `tool_result`. Es el bucle agéntico que vimos en el Dominio 1.

**MCP (Model Context Protocol)** es un protocolo estándar para **empaquetar herramientas, recursos y prompts en servidores reutilizables**. El curso lo explica con GitHub: sin MCP tendrías que escribir y mantener tú los esquemas y funciones de cientos de operaciones; con MCP, un servidor de GitHub ya las expone y tu aplicación solo se conecta a él. Y aclara un error común: **MCP no sustituye al *tool use***. MCP decide *quién implementa* las herramientas; el *tool use* es *cómo las llama* Claude.

**Las piezas:**

| Pieza | Qué es | Ejemplo del curso |
|---|---|---|
| **Servidor MCP** | Expone capacidades de un servicio externo | Servidor de documentos con `read_doc_contents` y `edit_document` |
| **Cliente MCP** | El puente entre tu aplicación y el servidor | `list_tools()` y `call_tool()` sobre una sesión del SDK |
| **Transporte** | El canal por el que viajan los mensajes JSON-RPC | `stdio` (proceso local) o Streamable HTTP (remoto) |

**Las tres primitivas de servidor**, y quién las controla:

| Primitiva | Controlada por | Para qué | En Claude Code |
|---|---|---|---|
| **Tools** | El **modelo** (Claude decide cuándo llamarlas) | Acciones y consultas | Herramientas `mcp__servidor__herramienta` |
| **Resources** | La **aplicación** (tu código decide qué inyectar) | Exponer datos de solo lectura, como un `GET` | Menciones `@servidor:recurso` |
| **Prompts** | El **usuario** (los elige explícitamente) | Plantillas de instrucciones probadas | Comandos `/mcp__servidor__prompt` |

**El flujo completo** (del curso): el usuario pregunta → tu aplicación pide al cliente MCP la lista de herramientas (`ListToolsRequest`) → envía la pregunta y las herramientas a Claude → Claude pide una herramienta → el cliente la ejecuta en el servidor (`CallToolRequest`) → el resultado vuelve a Claude → Claude responde.

**Definir herramientas con el SDK de Python.** El curso usa `FastMCP` y decoradores: el nombre y la descripción van en `@mcp.tool(...)` y cada parámetro se describe con `Field(description=...)`. El SDK genera el JSON Schema a partir de los *type hints*. Para probar sin una aplicación completa está el **MCP Inspector** (`mcp dev mcp_server.py`).

```python
@mcp.tool(
    name="read_doc_contents",
    description="Read the contents of a document and return it as a string."
)
def read_document(doc_id: str = Field(description="Id of the document to read")):
    if doc_id not in docs:
        raise ValueError(f"Doc with id {doc_id} not found")
    return docs[doc_id]
```

---

## 2.1 Diseñar interfaces de herramientas con descripciones y límites claros

### La idea en una frase

La **descripción** de una herramienta es lo que Claude usa para decidir si la llama; si dos herramientas se parecen o la descripción es mínima, Claude elegirá mal, y la solución es describir mejor, renombrar o dividir, no añadir capas alrededor.

### Explicación

**La descripción manda.** Claude no ve tu código: solo ve `name`, `description` y `input_schema`. El curso de la API recomienda **3–4 frases** por herramienta que expliquen qué hace, cuándo usarla y qué devuelve, y una descripción detallada por cada parámetro. La documentación lo llama «con diferencia el factor más importante» del rendimiento de una herramienta. Una buena descripción incluye:

- **qué hace** y **qué devuelve**;
- **formato de entrada** («número de pedido de 5 dígitos, con o sin `#`»);
- **ejemplos de consultas** que deben ir a ella;
- **casos límite**;
- **cuándo NO usarla** y cuál usar en su lugar.

**El caso de la pregunta 2.** `get_customer` («Retrieves customer information») y `lookup_order` («Retrieves order details»), con identificadores parecidos. Ante «revisa mi pedido #12345», Claude llama a `get_customer`. La **primera** medida correcta es ampliar las descripciones:

```text
lookup_order: Devuelve el estado, los artículos, el importe y el envío de UN pedido.
Úsala cuando el usuario mencione un pedido concreto o un número de pedido
(5 dígitos, p. ej. "#12345" o "pedido 12345"). No la uses para buscar
datos del cliente (nombre, correo, dirección): para eso está get_customer.
Si el usuario no da número de pedido, primero identifica al cliente con get_customer.
```

Las alternativas de esa pregunta enseñan tanto como la respuesta: los ejemplos few-shot en el *system prompt* añaden tokens sin arreglar la causa; una capa de enrutamiento por palabras clave es excesiva; fusionar ambas herramientas en `lookup_entity` es una decisión válida, pero no un «primer paso».

**Solapamiento: renombrar o dividir.**

- **Renombrar** cuando dos herramientas tienen nombres y descripciones casi idénticas: `analyze_content` frente a `analyze_document` es una invitación al error; renombrar la primera a `extract_web_results`, con una descripción específica de web, elimina el solapamiento.
- **Dividir** una herramienta genérica en varias de propósito único, cada una con su contrato de entrada y salida: `analyze_document` → `extract_data_points`, `summarize_content` y `verify_claim_against_source`.

El artículo *Writing effective tools for agents* añade principios complementarios:

- **No envuelvas cada endpoint de la API**: pocas herramientas bien pensadas para los flujos de alto impacto, consolidando pasos relacionados cuando tiene sentido.
- **Espacios de nombres** (prefijos comunes como `github_list_prs`, `slack_send_message`) para delimitar herramientas de servicios distintos.
- **Parámetros sin ambigüedad**: `user_id` mejor que `user`.
- **Respuestas con señal**: nombres legibles en vez de UUID crípticos, paginación y truncado con valores por defecto razonables.

Fíjate en la tensión aparente: el examen premia **dividir** una herramienta genérica cuando mezcla propósitos distintos (el modelo no sabe qué hará), y el artículo premia **consolidar** cuando varias herramientas son pasos de un mismo flujo. El criterio común es que **cada herramienta tenga un propósito claro y distinguible**.

**El *system prompt* también influye.** Una instrucción como «cuando el usuario hable de *análisis*, usa siempre la herramienta más completa» crea asociaciones por palabra clave que pueden **anular** descripciones bien escritas. Si una herramienta se elige mal pese a tener buena descripción, revisa el *system prompt*. Y evita el lenguaje agresivo («DEBES usar X»): los modelos recientes lo siguen tanto que la usan de más (ver [[04-prompt-structured-output]], 4.1).

### Qué busca el examen

- Mala selección de herramienta → **primero, mejorar las descripciones** (formato, ejemplos, límites, cuándo usar la alternativa).
- Herramientas solapadas → **renombrar** y reescribir la descripción; herramienta genérica → **dividir** en herramientas con contratos definidos.
- Revisar el *system prompt* por instrucciones sensibles a palabras clave.
- Trampas: few-shot o capas de enrutamiento como primera medida; fusionar herramientas cuando el problema es la descripción.

### Fuentes

- Building with the Claude API › Tool use with Claude › [Tool schemas](https://academy.claude.com/courses/building-with-the-claude-api/tool-schemas) (`name`, `description`, `input_schema`; 3–4 frases)
- Building with the Claude API › Tool use with Claude › [Using multiple tools](https://academy.claude.com/courses/building-with-the-claude-api/using-multiple-tools)
- Claude Platform 101 › Teaching your agent › [The agent loop explained](https://academy.claude.com/courses/claude-platform-101/the-agent-loop-explained) (el array `tools`)
- Building with the Claude API › Model Context Protocol › [Defining tools with MCP](https://academy.claude.com/courses/building-with-the-claude-api/defining-tools-with-mcp) (descripciones con `@mcp.tool` y `Field`)
- Artículo: [Writing effective tools for agents](https://www.anthropic.com/research/writing-tools-for-agents)
- Docs: [Define tools › Best practices for tool definitions](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#best-practices-for-tool-definitions)

---

## 2.2 Respuestas de error estructuradas en herramientas MCP

### La idea en una frase

Cuando una herramienta falla, devuelve un resultado con **`isError: true`** y **metadatos** que digan qué tipo de error es y si tiene sentido reintentar, para que el agente decida bien qué hacer a continuación.

### Explicación

**Dos tipos de error en MCP.** La especificación distingue:

| Tipo | Ejemplos | Cómo se devuelve | ¿Lo ve el modelo? |
|---|---|---|---|
| **Error de protocolo** | Herramienta desconocida, petición mal formada | Error JSON-RPC (`"error": {"code": -32602, ...}`) | Puede, pero rara vez le sirve |
| **Error de ejecución de la herramienta** | Fallo de una API, entrada no válida, regla de negocio | Resultado normal con **`isError: true`** | **Sí**: le permite corregirse y reintentar |

El curso de MCP lo practica de forma sencilla: si el documento no existe, la herramienta lanza un `ValueError` con un mensaje descriptivo, y el SDK lo convierte en un resultado con `isError`. En la API directa, el equivalente es el `tool_result` con `"is_error": true` que vimos en el curso de la API.

**Por qué un error genérico es un problema.** «Operation failed» no le dice al agente si debe reintentar, cambiar los parámetros, pedir datos al usuario o rendirse. La guía clasifica los errores en cuatro categorías, y cada una pide una reacción distinta:

| Categoría | Ejemplo | ¿Reintentar? | Qué hace el agente |
|---|---|---|---|
| **Transitorio** | *Timeout*, servicio no disponible | Sí | Reintentar (quizá con espera) |
| **Validación** | Fecha en formato incorrecto | Sí, **corrigiendo la entrada** | Ajustar los parámetros |
| **Negocio** | Reembolso fuera del plazo de 30 días | **No** | Explicárselo al cliente o escalar |
| **Permisos** | Sin acceso a la cuenta | No (sin cambiar algo) | Escalar o pedir autorización |

**Metadatos estructurados.** La guía propone devolver, dentro del resultado con `isError`, algo así:

```json
{
  "isError": true,
  "content": [{"type": "text", "text": "{\"errorCategory\": \"business\", \"isRetryable\": false, \"message\": \"El pedido 88213 se entregó hace 45 días; la política permite devoluciones en 30 días.\", \"customerMessage\": \"Lo siento, el plazo de devolución de este pedido terminó el 2 de noviembre.\"}"}]
}
```

Con `isRetryable: false` el agente no malgasta intentos; con una explicación apta para el cliente, puede comunicarlo bien. (`errorCategory` e `isRetryable` son una **convención de diseño** que propone la guía, no campos de la especificación de MCP; lo estándar es `isError` y el contenido del resultado.)

**Recuperación local y propagación.** En un sistema multiagente, un subagente resuelve él mismo los errores transitorios (reintentar) y solo **propaga** al coordinador lo que no puede resolver, con lo que intentó y los resultados parciales. Y debe distinguir un **fallo de acceso** (no se pudo consultar) de un **resultado vacío válido** (se consultó y no hay nada). Esto se desarrolla en [[05-context]], 5.3.

### Qué busca el examen

- `isError` para comunicar fallos de la herramienta al agente.
- Distinguir errores **transitorios, de validación, de negocio y de permisos**.
- Metadatos **`errorCategory`**, **`isRetryable`** y una descripción legible; `retriable: false` + explicación para el cliente en violaciones de reglas de negocio.
- Respuestas genéricas («Operation failed») = el agente no puede decidir.
- Recuperación local de lo transitorio; propagar solo lo irresoluble; fallo de acceso ≠ resultado vacío.

### Fuentes

- Building with the Claude API › Model Context Protocol › [Defining tools with MCP](https://academy.claude.com/courses/building-with-the-claude-api/defining-tools-with-mcp) (manejo de errores, `ValueError` con mensaje descriptivo)
- Building with the Claude API › Tool use with Claude › [Implementing multiple turns](https://academy.claude.com/courses/building-with-the-claude-api/implementing-multiple-turns) (`is_error` en la API)
- Introduction to subagents › [Designing effective subagents](https://academy.claude.com/courses/introduction-to-subagents/designing-effective-subagents) (Reporting obstacles)
- Especificación: [MCP 2026-07-28 › Tools › Error Handling](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)

---

## 2.3 Distribuir las herramientas entre agentes y configurar `tool_choice`

### La idea en una frase

Da a cada agente **solo las herramientas de su rol** (4–5 mejor que 18), con alguna herramienta transversal **acotada** para necesidades frecuentes, y usa `tool_choice` cuando necesites garantizar que se llama a una herramienta.

### Explicación

**Más herramientas, peor selección.** Cada herramienta añade una opción a la decisión. Un agente con 18 herramientas elige peor que uno con 4–5, y un agente con herramientas **fuera de su especialidad** tiende a usarlas mal (el agente de síntesis que se pone a buscar en la web en vez de sintetizar). *Claude Code 101* añade el coste de contexto: las definiciones de herramientas MCP ocupan contexto aunque no se usen.

**Acceso acotado por rol.** El curso de subagentes lo concreta:

| Tipo de subagente | Herramientas |
|---|---|
| Investigación (solo lectura) | `Glob`, `Grep`, `Read` |
| Revisor de código | `Bash` (para `git diff`), sin `Edit` ni `Write` |
| Agente que modifica código | `Edit` y `Write` |

Así evitas efectos secundarios y cada rol queda claro. En el Agent SDK se configura con `tools`/`allowedTools` de cada `AgentDefinition` (ver [[01-agentic-architecture]], 1.3).

**Restringir en vez de generalizar.** Una herramienta genérica como `fetch_url` permite al agente descargar cualquier cosa. Sustituirla por `load_document`, que **valida** que la URL es de un documento permitido, reduce el riesgo y el mal uso.

**Herramientas transversales acotadas.** La pregunta 9 de la guía: el agente de síntesis devuelve el control al coordinador cada vez que necesita verificar un dato, lo que añade 2–3 vueltas y un 40 % de latencia. El 85 % son comprobaciones simples (fechas, nombres, cifras). La solución es darle una herramienta **`verify_fact`** limitada para ese 85 % y mantener el paso por el coordinador para el 15 % complejo. Es el **principio de mínimo privilegio**: ni todas las herramientas de búsqueda (sobreaprovisionar), ni nada.

**`tool_choice`.** Ya lo vimos en detalle en [[04-prompt-structured-output]], 4.3:

| Valor | Uso en este dominio |
|---|---|
| `auto` | Por defecto; Claude puede responder con texto |
| `any` | Garantizar que se llama a **alguna** herramienta y no se responde con texto |
| `{"type": "tool", "name": "extract_metadata"}` | Forzar que **una herramienta concreta** se ejecute primero; los pasos siguientes (enriquecimiento) se procesan en turnos posteriores |

Recuerda el matiz de actualidad anotado en el 04: `any` y forzado no son compatibles con el pensamiento extendido manual y dan error en los modelos más recientes; para el examen vale lo que dice la guía.

**Ojo con la pregunta 1.** Si el problema es el **orden** de las herramientas (verificar al cliente antes de reembolsar), ni `tool_choice` ni quitar herramientas lo resuelve de forma fiable: hace falta un **prerrequisito programático** que bloquee `lookup_order` y `process_refund` hasta que `get_customer` devuelva un ID verificado (ver [[01-agentic-architecture]], 1.4).

### Qué busca el examen

- Demasiadas herramientas o herramientas fuera de rol → **restringir** el conjunto de cada agente.
- Herramienta genérica → alternativa **restringida** que valide sus entradas.
- Necesidad frecuente de otro rol → herramienta transversal **acotada** (`verify_fact`); lo complejo sigue pasando por el coordinador.
- `tool_choice: "any"` para garantizar una llamada; forzado para asegurar el primer paso.
- Trampas: dar todas las herramientas a un agente para ahorrar vueltas; usar `tool_choice` para imponer un orden de negocio.

### Fuentes

- Introduction to subagents › [Designing effective subagents](https://academy.claude.com/courses/introduction-to-subagents/designing-effective-subagents) (Limiting tool access)
- Introduction to subagents › [Creating a subagent](https://academy.claude.com/courses/introduction-to-subagents/creating-a-subagent) (Customizing tools)
- Claude Code 101 › Customizing Claude Code › [MCP](https://academy.claude.com/courses/claude-code-101/mcp) (Context costs)
- [[04-prompt-structured-output]] (4.3, `tool_choice`)
- Docs: [Define tools › Forcing tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#forcing-tool-use) · [Claude Code › Control subagent capabilities](https://code.claude.com/docs/en/sub-agents#control-subagent-capabilities)

---

## 2.4 Integrar servidores MCP en Claude Code y en flujos de agentes

### La idea en una frase

Los servidores **compartidos** del equipo van en `.mcp.json` del proyecto (con los secretos como variables de entorno), los **personales** en `~/.claude.json`; describe bien sus herramientas para que Claude las prefiera, usa servidores de la comunidad para integraciones estándar y expón catálogos como **recursos**.

### Explicación

**Ámbitos de configuración.** *Claude Code 101* los presenta así:

| Ámbito | Dónde se guarda | Compartido | Para qué |
|---|---|---|---|
| **Local** (por defecto) | `~/.claude.json`, bajo la ruta del proyecto | No | Algo personal solo en este proyecto |
| **Usuario** | `~/.claude.json` | No | Herramientas personales o experimentales en todos tus proyectos |
| **Proyecto** | `.mcp.json` en la raíz del repo | **Sí**, por git | Herramientas que necesita todo el equipo |

Se añaden con `claude mcp add` (opción `--scope local|project|user`) y se gestionan con `/mcp` (ver estado, herramientas, reconectar, desactivar). Por seguridad, Claude Code pide aprobación la primera vez que usa los servidores de un `.mcp.json`, porque viene del repositorio.

**Secretos sin commitearlos: expansión de variables.** El `.mcp.json` se versiona, así que los tokens no pueden ir en él. Se referencian como variables de entorno, que cada desarrollador define en su máquina:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer ${GITHUB_TOKEN}" }
    },
    "jira": {
      "command": "npx",
      "args": ["-y", "jira-mcp-server"],
      "env": { "JIRA_URL": "${JIRA_URL:-https://empresa.atlassian.net}", "JIRA_TOKEN": "${JIRA_TOKEN}" }
    }
  }
}
```

La sintaxis es `${VAR}` o `${VAR:-valor_por_defecto}`, y funciona en `command`, `args`, `env`, `url` y `headers`.

**Todas las herramientas a la vez.** Las herramientas de **todos** los servidores configurados se descubren al conectar (`tools/list`) y quedan disponibles simultáneamente para el agente. Eso tiene un coste: el curso avisa de que las definiciones ocupan contexto aunque no se usen, y de que, si superan el 10 % de la ventana, Claude Code pasa a un **modo de búsqueda de herramientas** que las carga bajo demanda (menos fiable que tenerlas a la vista). Desactiva los servidores que no uses y considera una CLI (`gh`, `aws`) o una skill cuando basten.

**Que Claude prefiera la herramienta MCP.** Si un servidor MCP ofrece una búsqueda semántica del código pero Claude sigue usando `Grep`, la causa suele ser una descripción pobre. Explica en la descripción **qué capacidades tiene y qué devuelve** que la herramienta integrada no ofrece («busca por significado en todo el monorepo e incluye el propietario de cada archivo»).

**Comunidad frente a desarrollo propio.** Para integraciones estándar (Jira, GitHub, Slack) usa los servidores existentes, a menudo oficiales del propio proveedor, como recuerda el curso. Reserva los servidores propios para flujos específicos del equipo.

**Recursos como catálogos.** Un recurso es un dato de solo lectura identificado por una URI, «como un manejador `GET`». El curso distingue:

- **Recursos directos**, con URI fija: `docs://documents` devuelve la lista de documentos.
- **Recursos con plantilla**, con parámetros: `docs://documents/{doc_id}` devuelve uno concreto.

```python
@mcp.resource("docs://documents", mime_type="application/json")
def list_docs() -> list[str]:
    return list(docs.keys())
```

Para el examen, la idea clave es que exponer un **catálogo** (resúmenes de incidencias, jerarquía de documentación, esquema de la base de datos) como recurso le da al agente **visibilidad de qué datos existen sin tener que hacer llamadas exploratorias**. En el curso, la aplicación inyecta el contenido del recurso en el prompt cuando el usuario escribe `@documento`, sin que Claude gaste una llamada a herramienta.

**Prompts de servidor.** El tercer tipo de primitiva: plantillas probadas que el usuario invoca como comandos (`/format doc_id`). Encapsulan la experiencia del autor del servidor para que el usuario no tenga que escribir el prompt.

### Qué busca el examen

- Servidor compartido → **`.mcp.json` del proyecto**; personal o experimental → **`~/.claude.json`** (usuario).
- Credenciales → **`${VARIABLE}`** en `.mcp.json`, nunca el secreto en el repo.
- Las herramientas de todos los servidores se descubren al conectar y están disponibles a la vez.
- Claude prefiere `Grep` a la herramienta MCP → **mejorar la descripción** de la herramienta MCP.
- Integración estándar → servidor **de la comunidad**; flujo propio → servidor a medida.
- Catálogo de contenido → **recurso MCP**, para evitar llamadas exploratorias.

### Fuentes

- Claude Code 101 › Customizing Claude Code › [MCP](https://academy.claude.com/courses/claude-code-101/mcp) (añadir, `/mcp`, ámbitos, coste de contexto, *tool search*)
- Introduction to Model Context Protocol › Introduction › [Introducing MCP](https://academy.claude.com/courses/introduction-to-model-context-protocol/introducing-mcp)
- Introduction to Model Context Protocol › Introduction › [MCP clients](https://academy.claude.com/courses/introduction-to-model-context-protocol/mcp-clients)
- Introduction to Model Context Protocol › Connecting with MCP clients › [Defining resources](https://academy.claude.com/courses/introduction-to-model-context-protocol/defining-resources)
- Introduction to Model Context Protocol › Connecting with MCP clients › [Accessing resources](https://academy.claude.com/courses/introduction-to-model-context-protocol/accessing-resources)
- Introduction to Model Context Protocol › Connecting with MCP clients › [Defining prompts](https://academy.claude.com/courses/introduction-to-model-context-protocol/defining-prompts)
- Building with the Claude API › [Model Context Protocol](https://academy.claude.com/courses/building-with-the-claude-api/introducing-mcp) (la misma materia en el curso de la API)
- Docs: [Claude Code › MCP](https://code.claude.com/docs/en/mcp) (ámbitos, expansión de variables, recursos, límites de salida)

---

## 2.5 Elegir y usar bien las herramientas integradas

### La idea en una frase

**Grep** busca **dentro** de los archivos, **Glob** busca **nombres** de archivo, **Read/Write** trabajan con el archivo entero y **Edit** cambia un fragmento que debe ser **único**; para entender un código, empieza con Grep y sigue con Read, no leas todo.

### Explicación

*Tus apuntes no tienen una lección específica; esta sección sale de la guía, de la documentación de Claude Code y de la lección de la herramienta de edición de texto del curso de la API.*

**Qué herramienta para qué:**

| Necesito... | Herramienta | Ejemplo |
|---|---|---|
| Encontrar **contenido** (una función, un mensaje de error, un `import`) | **Grep** | Todas las llamadas a `processRefund(` |
| Encontrar **archivos** por nombre o extensión | **Glob** | `**/*.test.tsx` |
| Ver un archivo entero | **Read** | Leer `refund.service.ts` |
| Crear un archivo o reescribirlo entero | **Write** | Generar `refund.service.test.ts` |
| Cambiar un fragmento concreto | **Edit** | Sustituir una condición |
| Ejecutar comandos (tests, git, build) | **Bash** | `npm test`, `git diff` |

**Edit necesita un ancla única.** Edit sustituye un texto exacto (`old_string`) por otro. Si ese texto aparece **varias veces** en el archivo, Edit falla porque no sabe cuál cambiar. Primero, amplía el texto con más contexto alrededor para hacerlo único. Si no es posible (por ejemplo, bloques repetidos idénticos), la guía propone el **fallback**: **Read** del archivo completo y **Write** con el contenido modificado. Es el mismo principio que la herramienta de edición de texto de la API, cuyo `str_replace` exige una coincidencia única. (En Claude Code actual, Edit también tiene la opción `replace_all` para cambiar todas las apariciones a propósito.)

**Entender un código de forma incremental.** El error es leer todos los archivos al principio: llena el contexto (ver [[05-context]], 5.4) y diluye la atención. El método:

1. **Grep** para encontrar los puntos de entrada (dónde se define o se llama algo).
2. **Read** de esos archivos para seguir los `import` y trazar el flujo.
3. Repetir solo por las ramas relevantes.

Es la recuperación «justo a tiempo» del artículo *Effective context engineering*: guardar referencias ligeras (rutas, consultas) y cargar el contenido cuando hace falta.

**Funciones envueltas en módulos.** Si un módulo reexporta funciones con otros nombres (`export { processRefund as refund }`), buscar solo el nombre original no encuentra todos los usos. Primero identifica **todos los nombres exportados** del módulo envoltorio y después busca **cada uno** en el código.

### Qué busca el examen

- Buscar contenido → **Grep**; buscar archivos por patrón → **Glob**.
- Edit falla por texto no único → **Read + Write** como alternativa fiable.
- Entender un código: **Grep** para los puntos de entrada, **Read** para seguir el flujo; no leer todo de golpe.
- Funciones reexportadas: listar los nombres exportados y buscar cada uno.
- Trampas: Glob para buscar contenido, Grep para buscar nombres de archivo, leer el repositorio entero «para tener contexto».

### Fuentes

- Building with the Claude API › Tool use with Claude › [The text edit tool](https://academy.claude.com/courses/building-with-the-claude-api/the-text-edit-tool)
- Claude Code 101› Daily workflows › [The explore → plan → code → commit workflow](https://academy.claude.com/courses/claude-code-101/the-explore-plan-code-commit-workflow)
- Introduction to subagents › [Designing effective subagents](https://academy.claude.com/courses/introduction-to-subagents/designing-effective-subagents) (Limiting tool access)
- Docs: [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) · [Common workflows › Understand new codebases](https://code.claude.com/docs/en/common-workflows#understand-new-codebases) · [Text editor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool)

---

## Qué ha quedado obsoleto: la especificación MCP 2026-07-28

Los cursos (y la guía del examen v1.0) describen MCP **tal como funcionaba antes** de la revisión del 28 de julio de 2026. Tus apuntes del curso avanzado ya llevan avisos en cada lección afectada. Este es el resumen, contrastado con el [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog) y el [registro de funciones obsoletas](https://modelcontextprotocol.io/specification/2026-07-28/deprecated).

**Cómo leer «obsoleto».** La especificación adopta ahora una política de ciclo de vida con tres estados: *Active*, *Deprecated* y *Removed*. Lo **obsoleto** (*deprecated*) sigue en la especificación y **funciona** durante una ventana mínima de 12 meses, pero las implementaciones nuevas no deberían adoptarlo. Lo **eliminado** ya no existe en esta versión del protocolo. El SDK de Python v1 que usan los cursos sigue funcionando con el comportamiento antiguo.

### Obsoleto (sigue funcionando, no adoptar)

| Función | Lección de tus apuntes | Alternativa recomendada | Eliminación más temprana |
|---|---|---|---|
| **Sampling** | [[10. Model Context Protocol#10.1.1. Sampling]] | Integrar directamente con la API del proveedor del modelo | Revisión publicada a partir del 28-07-2027 |
| **Roots** | [[10. Model Context Protocol#10.1.5. Roots]] | Pasar rutas por parámetros de herramienta, URIs de recursos o configuración del servidor | Ídem |
| **Logging** (`context.info()`, `notifications/message` como función) | [[10. Model Context Protocol#10.1.3. Registro y notificaciones de progreso]] | `stderr` en stdio; OpenTelemetry para observabilidad | Ídem |
| **Transporte HTTP+SSE** (el antiguo, no Streamable HTTP) | — (Claude Code: `--transport sse`) | Streamable HTTP | Ya obsoleto desde 2025-03-26 |
| **Dynamic Client Registration** (OAuth) | — | *Client ID Metadata Documents* | Revisión a partir del 28-07-2027 |
| `includeContext: "thisServer"` / `"allServers"` en sampling | — | Omitirlo o usar `"none"` | Junto con Sampling |

### Eliminado del protocolo

| Qué desaparece | Lección de tus apuntes | Qué hay ahora |
|---|---|---|
| **Handshake** `initialize` → `initialized` | [[10. Model Context Protocol#10.2.2.3. Secuencia de conexión MCP]], [[10. Model Context Protocol#10.2.4.2. Cómo funciona StreamableHTTP]] | MCP es **sin estado**: cada petición lleva en `_meta` la versión del protocolo y las capacidades del cliente; nuevo método `server/discover` para consultar versiones y capacidades |
| **Sesiones** y la cabecera `Mcp-Session-Id` | [[10. Model Context Protocol#10.2.4. StreamableHTTP en profundidad]], [[10. Model Context Protocol#10.2.5. El estado y el transporte StreamableHTTP]] | El estado entre llamadas se gestiona con **identificadores explícitos** que crea el servidor y se pasan como argumentos normales (p. ej., `basket_id`) |
| **Endpoint GET** de Streamable HTTP (la conexión SSE persistente) y `resources/subscribe` / `unsubscribe` | [[10. Model Context Protocol#10.2.4.2. Cómo funciona StreamableHTTP]] | `subscriptions/listen`: un único flujo POST de larga duración para notificaciones de cambios a las que el cliente se suscribe |
| **Peticiones del servidor al cliente** (`sampling/createMessage`, `roots/list`, `elicitation/create` como peticiones iniciadas por el servidor) | [[10. Model Context Protocol#10.2.3.3. Tipos de mensajes MCP afectados]] | Patrón **MRTR** (*Multi Round-Trip Requests*): el servidor responde con `resultType: "input_required"` y el cliente **reintenta** la petición original con las respuestas |
| `ping`, `logging/setLevel`, `notifications/roots/list_changed` | — | El nivel de log se indica por petición en `_meta` |
| Reanudación de flujos SSE (`Last-Event-ID`) | — | Si se corta el flujo, el cliente reenvía la petición |

Consecuencia práctica: las banderas `stateless_http` y `json_response` del SDK v1, que el curso presenta como un compromiso para escalar horizontalmente, describen un problema (coordinar sesiones entre instancias) que el protocolo nuevo elimina de raíz al no tener estado.

### Lo que sigue vigente (y es lo que importa para el examen)

- **Tools**, **resources** y **prompts** como primitivas de servidor.
- El flag **`isError`** y la distinción entre errores de protocolo y errores de ejecución de la herramienta.
- `inputSchema`, `outputSchema` y `structuredContent` (ahora admiten cualquier palabra clave de JSON Schema 2020-12).
- **Notificaciones de progreso** (viajan en el flujo de respuesta de la petición a la que pertenecen).
- **Elicitation** (pedir datos al usuario), ahora mediante el patrón MRTR.
- Transportes **stdio** y **Streamable HTTP**.

Otros cambios menores: los resultados llevan un campo obligatorio `resultType`; los listados (`tools/list`, `resources/list`...) llevan `ttlMs` y `cacheScope` para poder cachearlos; los servidores deberían devolver las herramientas en **orden determinista** (mejora la caché de prompts); y el código de error de «recurso no encontrado» pasa de `-32002` a `-32602`.

**Para el examen.** Las preguntas del Dominio 2 se centran en diseño de herramientas, errores, reparto de herramientas, configuración de Claude Code y recursos, y nada de eso ha cambiado. Si apareciera algo sobre sampling, roots o sesiones, responde según la guía v1.0, pero sabiendo que en un diseño nuevo no deberías adoptarlos. El índice ([[00-index]]) enlaza todavía la especificación 2025-06-18; las secciones de herramientas y recursos siguen siendo válidas en lo que pregunta el examen.

---

## Chuleta de decisiones

| Si el enunciado dice... | Piensa en... |
|---|---|
| Claude elige la herramienta equivocada entre dos parecidas | Ampliar descripciones: formato, ejemplos, límites, cuándo usar la otra |
| `analyze_content` y `analyze_document` casi idénticas | Renombrar y reescribir la descripción (`extract_web_results`) |
| Herramienta genérica que hace de todo | Dividir en herramientas de propósito único con contratos claros |
| Buena descripción, pero sigue eligiendo mal | Revisar el *system prompt* (palabras clave que anulan la descripción) |
| «Operation failed» y el agente no sabe qué hacer | Error estructurado con `isError`, `errorCategory`, `isRetryable` |
| Violación de una regla de negocio | `isRetryable: false` + explicación apta para el cliente |
| Reintentos inútiles | Distinguir errores reintentables de no reintentables |
| Subagente con un *timeout* puntual | Recuperación local; propagar solo lo irresoluble |
| «0 resultados» ambiguo | Fallo de acceso ≠ resultado vacío válido |
| Agente con 18 herramientas que elige mal | Reducir a las 4–5 de su rol |
| Agente de síntesis que busca en la web | Quitarle herramientas fuera de su especialidad |
| `fetch_url` demasiado abierta | Sustituir por `load_document` con validación |
| Muchas vueltas al coordinador para comprobaciones simples | Herramienta transversal acotada (`verify_fact`) |
| Claude responde texto en vez de llamar a una herramienta | `tool_choice: "any"` |
| Un paso concreto debe ir primero | `tool_choice` forzado; el resto en turnos siguientes |
| Un paso debe ir **siempre** antes que otro por negocio | Prerrequisito programático (hook o código), no prompt ni `tool_choice` |
| Servidor MCP para todo el equipo | `.mcp.json` en el proyecto |
| Servidor personal o experimental | `~/.claude.json` (ámbito usuario) |
| Token en la configuración compartida | `${GITHUB_TOKEN}` en `.mcp.json` |
| Claude usa `Grep` en vez de la herramienta MCP | Mejorar la descripción de la herramienta MCP |
| Integración con Jira | Servidor MCP de la comunidad, no uno propio |
| El agente hace muchas llamadas para saber qué datos hay | Exponer un catálogo como recurso MCP |
| Buscar dónde se llama una función | Grep |
| Buscar todos los tests | Glob (`**/*.test.tsx`) |
| Edit falla por texto repetido | Ampliar el ancla o Read + Write |
| Entender un código desconocido | Grep para entradas → Read para seguir el flujo |
| Función reexportada con otro nombre | Listar los nombres exportados y buscar cada uno |
| Sampling, roots, logging en un diseño nuevo | Obsoletos en MCP 2026-07-28: API directa, parámetros, `stderr`/OpenTelemetry |

## Preguntas de autoevaluación

1. Tu agente tiene `search_docs` («Busca en la documentación») y `search_kb` («Busca en la base de conocimiento») y alterna entre ellas sin criterio. ¿Qué haces primero?
2. Tu herramienta `process_refund` devuelve `{"error": "failed"}` tanto si el servicio de pagos no responde como si el pedido está fuera de plazo. ¿Qué cambias?
3. En tu sistema de investigación, el agente de síntesis tiene las mismas 15 herramientas que el coordinador y a veces lanza búsquedas web en lugar de sintetizar. ¿Cómo lo arreglas sin perder la capacidad de comprobar datos sencillos?
4. Tu equipo quiere compartir un servidor MCP de GitHub que necesita un token personal. ¿Dónde y cómo lo configuras?
5. Tienes un servidor MCP que expone el esquema de la base de datos, pero el agente hace diez llamadas a `describe_table` al empezar cada tarea. ¿Qué mejora propones?
6. Claude intenta cambiar `return null;` en un archivo donde aparece seis veces y la herramienta Edit falla. ¿Qué hace?
7. Estás diseñando un servidor MCP nuevo que necesita resumir textos con un LLM y acceder a carpetas del usuario. El curso te enseñó sampling y roots. ¿Los usas?

<details>
<summary>Soluciones</summary>

1. Ampliar las descripciones de ambas para que digan qué contiene cada fuente, qué formato de consulta aceptan, ejemplos y cuándo usar la otra. Si de verdad se solapan, renombrar o fusionar después.
2. Devolver errores estructurados con `isError: true`: el fallo del servicio como `transient` con `isRetryable: true`; el plazo vencido como error de negocio con `isRetryable: false` y un mensaje apto para el cliente.
3. Quitarle las herramientas fuera de su rol y darle una herramienta acotada `verify_fact` para las comprobaciones simples; las verificaciones complejas siguen pasando por el coordinador.
4. En `.mcp.json` del proyecto (versionado), con el token como `${GITHUB_TOKEN}` en `headers` o `env`; cada desarrollador define la variable en su entorno.
5. Exponer el esquema (o un catálogo de tablas) como recurso MCP, para que el agente vea qué hay sin llamadas exploratorias.
6. Ampliar el `old_string` con las líneas de alrededor para que sea único. Si no se puede, Read del archivo completo y Write con el cambio aplicado.
7. No en un diseño nuevo: la especificación 2026-07-28 los declara obsoletos. Para el LLM, integra directamente con la API del proveedor; para las carpetas, pásalas como parámetros de herramienta, URIs de recursos o configuración del servidor.

</details>
