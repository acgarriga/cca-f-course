# Índice de recursos por dominio – CCAR-F

Este índice relaciona cada *task statement* de la guía oficial del examen **Claude Certified Architect – Foundations** (v1.0, julio 2026) con el material de Anthropic donde se explica: lecciones de los cursos gratuitos de **Anthropic Academy** (Skilljar), la **documentación oficial** (Claude Code, Agent SDK, Claude API), los artículos de **ingeniería de Anthropic**, la **especificación MCP** y los repositorios oficiales de **cursos** y **cookbooks** en GitHub.

> Complementa a [00-guide.md](00-guide.md). Enlaces comprobados el 4 de noviembre de 2026.

## Cómo leer este índice

- **Cursos (Skilljar).** Skilljar no expone URLs públicas por lección (requieren iniciar sesión), así que cada referencia enlaza al **curso** y nombra la lección como `Curso › Sección › Lección`, con los títulos tal como aparecen en el temario actual.
- **Documentación.** Siempre que ha sido posible el enlace apunta directamente a la **sección** (ancla) relevante de la página.
- **Columnas.** *Curso*: lecciones de Anthropic Academy. *Artículos de Anthropic*: blog de ingeniería y anuncios. *Prácticas*: cuadernos y ejemplos ejecutables (cursos de GitHub y Claude Cookbooks). *Otros*: documentación oficial (Claude Code, Agent SDK, Claude API), especificación MCP y guías de casos de uso.
- **Prioridad.** Dentro de cada celda, el primer recurso es el más directo.
- **Aviso de nomenclatura.** La guía habla de la herramienta **`Task`** para lanzar subagentes. En Claude Code 2.1.63 se renombró a **`Agent`**; `Task(...)` sigue funcionando como alias y en el mensaje `system:init` del SDK todavía aparece como `"Task"` ([fuente](https://code.claude.com/docs/en/agent-sdk/subagents#detect-subagent-invocation)). En el examen, `Task` = `Agent`.

### Cursos gratuitos de Anthropic Academy usados

| Abreviatura | Curso | Para qué dominios |
|---|---|---|
| **API** | [Building with the Claude API][api] | 1, 2, 4, 5 (el más completo: tool use, prompting, evals, MCP, agentes y workflows) |
| **P101** | [Claude Platform 101][p101] | 1, 2, 5 (bucle agéntico, tool use, contexto, managed agents) |
| **CC101** | [Claude Code 101][cc101] | 3, 5 |
| **CCiA** | [Claude Code in Action][ccia] | 1, 3 (CLAUDE.md, hooks, permisos, headless, GitHub Actions) |
| **SUB** | [Introduction to subagents][sub] | 1, 3, 5 |
| **SKL** | [Introduction to agent skills][skl] | 3 |
| **MCP** | [Introduction to Model Context Protocol][mcp] | 2 |
| **MCP+** | [Model Context Protocol: Advanced Topics][mcpadv] | 2 |

### Otros recursos oficiales

- **Cursos en GitHub** ([anthropics/courses](https://github.com/anthropics/courses)): *Tool use*, *Prompt engineering interactive tutorial*, *Real world prompting*, *Prompt evaluations* (cuadernos Jupyter ejecutables).
- **Claude Cookbooks** ([anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks)): ejemplos de agentes, Agent SDK, tool use, extracción y batches.
- **Artículos de ingeniería** clave: [Building effective agents][eng-agents], [How we built our multi-agent research system][eng-multi], [Writing effective tools for agents][eng-tools], [Effective context engineering for AI agents][eng-context].
- **E-book** [Building Effective AI Agents: Architecture Patterns and Implementation Frameworks][ebook] (Anthropic, dic. 2025; copia en PDF en este repo): patrones de un agente, multiagente jerárquico y colaborativo, flujos secuenciales, paralelos y *evaluator-optimizer*, y un marco para elegir arquitectura. Se cita por página.

---

## Dominio 1 · Agentic Architecture & Orchestration (27 %)

### 1.1 Diseñar e implementar bucles agénticos

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Ciclo de vida del bucle: petición → inspeccionar `stop_reason` (`tool_use` / `end_turn`) → ejecutar herramientas → devolver resultados | P101 › Teaching your Agent › [*The agent loop explained*](https://academy.claude.com/courses/claude-platform-101/the-agent-loop-explained) · API › Tool use with Claude › [*Multi-turn conversations with tools*](https://academy.claude.com/courses/building-with-the-claude-api/multi-turn-conversations-with-tools), [*Implementing multiple turns*](https://academy.claude.com/courses/building-with-the-claude-api/implementing-multiple-turns) | — | — | [How tool use works › The agentic loop (client tools)](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works#the-agentic-loop-client-tools) · [Stop reasons › `tool_use`](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons#tool-use) y [`end_turn`](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons#end-turn) · [Agent SDK › How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop#the-loop-at-a-glance) |
| Añadir los resultados de herramientas al historial entre iteraciones | API › Tool use with Claude › [*Handling message blocks*](https://academy.claude.com/courses/building-with-the-claude-api/handling-message-blocks), [*Sending tool results*](https://academy.claude.com/courses/building-with-the-claude-api/sending-tool-results) | — | [Curso GitHub *Tool use* › 04 Complete workflow](https://github.com/anthropics/courses/blob/master/tool_use/04_complete_workflow.ipynb) | [Handle tool calls › Handling results from client tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls#handling-results-from-client-tools) |
| Decisión dirigida por el modelo frente a árboles de decisión / secuencias prefijadas | API › Agents and workflows › [*Agents and workflows*](https://academy.claude.com/courses/building-with-the-claude-api/agents-and-workflows), [*Workflows vs agents*](https://academy.claude.com/courses/building-with-the-claude-api/workflows-vs-agents) | [Building effective agents][eng-agents] (workflows vs agentes) | [Cookbook › patterns/agents](https://github.com/anthropics/claude-cookbooks/tree/main/patterns/agents) | — |
| Antipatrones: parsear lenguaje natural para terminar, topes de iteraciones como mecanismo principal, usar la presencia de texto como señal de fin | P101 › [*The agent loop explained*](https://academy.claude.com/courses/claude-platform-101/the-agent-loop-explained) | — | — | [Stop reasons › Always check `stop_reason`](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons#always-check-stop-reason) · [Agent SDK › Turns and budget](https://code.claude.com/docs/en/agent-sdk/agent-loop#turns-and-budget) (los límites como red de seguridad, no como criterio de parada) · [Tool runner (SDK)](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-runner) |

### 1.2 Orquestar sistemas multiagente mediante patrones de coordinator-subagent

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Arquitectura *hub-and-spoke*: el coordinador gestiona comunicación, errores y enrutado | SUB › [*What are subagents?*](https://academy.claude.com/courses/introduction-to-subagents/what-are-subagents) | [How we built our multi-agent research system][eng-multi] · [Building effective agents › Workflow: Orchestrator-workers](https://www.anthropic.com/research/building-effective-agents#workflow-orchestrator-workers) | [Cookbook › orchestrator_workers](https://github.com/anthropics/claude-cookbooks/blob/main/patterns/agents/orchestrator_workers.ipynb) | [Agent SDK › Subagents › Benefits of using subagents](https://code.claude.com/docs/en/agent-sdk/subagents#benefits-of-using-subagents)  |
| Los subagentes tienen contexto aislado y no heredan el historial del coordinador | SUB › [*What are subagents?*](https://academy.claude.com/courses/introduction-to-subagents/what-are-subagents) · CC101 › Customizing Claude Code › [*Subagents*](https://academy.claude.com/courses/claude-code-101/subagents) | [How we built our multi-agent research system][eng-multi] | — | [Agent SDK › What subagents inherit](https://code.claude.com/docs/en/agent-sdk/subagents#what-subagents-inherit) · [Claude Code › Manage subagent context](https://code.claude.com/docs/en/sub-agents#manage-subagent-context) |
| El papel del coordinador en la descomposición de tareas, la delegación, la agregación de resultados y la toma de decisiones sobre qué subagentes activar en función de la complejidad de la consulta | API › Agents and workflows › [*Routing workflows*](https://academy.claude.com/courses/building-with-the-claude-api/routing-workflows), [*Parallelization workflows*](https://academy.claude.com/courses/building-with-the-claude-api/parallelization-workflows) | [Multi-agent research system][eng-multi] (escalar el esfuerzo a la complejidad de la consulta) | — | [Prompting best practices › Subagent orchestration](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#subagent-orchestration) |
| Riesgos de una descomposición de tareas excesivamente limitada por parte del coordinador, lo que conlleva una cobertura incompleta de temas de investigación amplios | — | [Multi-agent research system][eng-multi] (lecciones sobre delegación vaga y trabajo duplicado) | — | — |
| Bucles de refinamiento iterativo (evaluar la síntesis, re-delegar, re-sintetizar) | API › Agents and workflows › [*Chaining workflows*](https://academy.claude.com/courses/building-with-the-claude-api/chaining-workflows) | [Building effective agents][eng-agents] (evaluator-optimizer) | [Cookbook › evaluator_optimizer](https://github.com/anthropics/claude-cookbooks/blob/main/patterns/agents/evaluator_optimizer.ipynb) | — |
| Toda comunicación pasa por el coordinador (observabilidad, errores coherentes) | — | [Multi-agent research system][eng-multi] | [Cookbook Agent SDK › 01 Chief of staff agent](https://github.com/anthropics/claude-cookbooks/blob/main/claude_agent_sdk/01_The_chief_of_staff_agent.ipynb) | — |

### 1.3 Invocación de subagentes, paso de contexto y *spawning*

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| La herramienta `Task` (hoy `Agent`) lanza subagentes; `allowedTools` debe incluirla | — | — | — | [Agent SDK › Subagents (overview y ejemplos con `allowedTools`)](https://code.claude.com/docs/en/agent-sdk/subagents#programmatic-definition-recommended) · [Detect subagent invocation](https://code.claude.com/docs/en/agent-sdk/subagents#detect-subagent-invocation) |
| El contexto se pasa explícitamente en el prompt; no hay memoria compartida | SUB › [*What are subagents?*](https://academy.claude.com/courses/introduction-to-subagents/what-are-subagents) · SUB › [*Designing effective subagents*](https://academy.claude.com/courses/introduction-to-subagents/designing-effective-subagents) | — | — | [Agent SDK › What subagents inherit](https://code.claude.com/docs/en/agent-sdk/subagents#what-subagents-inherit) |
| `AgentDefinition`: descripción, system prompt, restricción de herramientas | SUB › [*Creating a subagent*](https://academy.claude.com/courses/introduction-to-subagents/creating-a-subagent) | — | — | [Agent SDK › AgentDefinition configuration](https://code.claude.com/docs/en/agent-sdk/subagents#agentdefinition-configuration) · [Tool restrictions](https://code.claude.com/docs/en/agent-sdk/subagents#tool-restrictions) · [Claude Code › Supported frontmatter fields](https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields) |
| Sesiones *fork* para explorar enfoques divergentes | — | — | — | [Agent SDK › Forked subagents](https://code.claude.com/docs/en/agent-sdk/subagents#forked-subagents) · [Sessions › Fork to explore alternatives](https://code.claude.com/docs/en/agent-sdk/sessions#fork-to-explore-alternatives) |
| Pasar hallazgos completos y datos estructurados (contenido separado de metadatos: URL, documento, página) | SUB › [*Designing effective subagents*](https://academy.claude.com/courses/introduction-to-subagents/designing-effective-subagents) | [Multi-agent research system][eng-multi] | — | [Prompting best practices › Structure prompts with XML tags](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#structure-prompts-with-xml-tags) |
| Subagentes en paralelo: varias llamadas `Task` en **una sola** respuesta | API › Tool use with Claude › [*Using multiple tools*](https://academy.claude.com/courses/building-with-the-claude-api/using-multiple-tools) | — | [Cookbook › parallel_tools](https://github.com/anthropics/claude-cookbooks/blob/main/tool_use/parallel_tools.ipynb) | [Prompting best practices › Optimize parallel tool calling](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#optimize-parallel-tool-calling) · [Agent SDK › Parallel tool execution](https://code.claude.com/docs/en/agent-sdk/agent-loop#parallel-tool-execution) |
| Prompts del coordinador con objetivos y criterios de calidad, no pasos procedimentales | SUB › [*Designing effective subagents*](https://academy.claude.com/courses/introduction-to-subagents/designing-effective-subagents) | [Multi-agent research system][eng-multi] (sección sobre prompting del orquestador) | — | — |

### 1.4 Flujos multipaso con *enforcement* y *handoff*

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Enforcement programático (hooks, *gates*) frente a guía por prompt; los prompts tienen tasa de fallo no nula | CCiA › Configure Claude › [*Hooks*](https://academy.claude.com/courses/claude-code-in-action/hooks) · CC101 › [*Hooks*](https://academy.claude.com/courses/claude-code-101/hooks) | — | — | [Claude Code best practices › Deterministic and non-deterministic instructions](https://code.claude.com/docs/en/best-practices#deterministic-and-non-deterministic-instructions) · [Enforce steps with hooks](https://code.claude.com/docs/en/best-practices#enforce-steps-with-hooks) |
| Bloquear herramientas hasta cumplir prerrequisitos (p. ej. `process_refund` tras `get_customer` verificado) | CCiA › Configure Claude › [*Hooks*](https://academy.claude.com/courses/claude-code-in-action/hooks) | — | — | [Agent SDK › Hooks › Add context and block a tool](https://code.claude.com/docs/en/agent-sdk/hooks#add-context-and-block-a-tool) · [Agent SDK › Permissions](https://code.claude.com/docs/en/agent-sdk/permissions) |
| Descomponer peticiones con varios asuntos e investigarlos en paralelo | API › Agents and workflows › [*Parallelization workflows*](https://academy.claude.com/courses/building-with-the-claude-api/parallelization-workflows) | [Building effective agents][eng-agents] (parallelization) | — | [Customer support agent (guía de caso de uso)](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat) |
| Resúmenes de *handoff* estructurados al escalar a humanos | — | — | [Cookbook › customer_service_agent](https://github.com/anthropics/claude-cookbooks/blob/main/tool_use/customer_service_agent.ipynb) | [Customer support agent](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat) |

### 1.5 Hooks del Agent SDK para interceptar llamadas y normalizar datos

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| `PostToolUse` para transformar resultados antes de que el modelo los procese | CCiA › Configure Claude › [*Hooks*](https://academy.claude.com/courses/claude-code-in-action/hooks) | — | — | [Hooks reference › PostToolUse](https://code.claude.com/docs/en/hooks#posttooluse) · [Agent SDK › Hooks › Available hooks](https://code.claude.com/docs/en/agent-sdk/hooks#available-hooks) |
| `PreToolUse` para bloquear acciones que violan políticas (reembolsos > 500 $) y redirigir a escalado | CCiA › Configure Claude › [*Hooks*](https://academy.claude.com/courses/claude-code-in-action/hooks) · CC101 › *Hooks* | — | — | [Hooks reference › PreToolUse](https://code.claude.com/docs/en/hooks#pretooluse) · [Agent SDK › Modify tool input](https://code.claude.com/docs/en/agent-sdk/hooks#modify-tool-input) · [Add context and block a tool](https://code.claude.com/docs/en/agent-sdk/hooks#add-context-and-block-a-tool) |
| Hooks = garantía determinista; prompt = cumplimiento probabilístico | CCiA › *Hooks* | — | — | [Hooks guide](https://code.claude.com/docs/en/hooks-guide) · [Best practices › Enforce the rules that can't have exceptions](https://code.claude.com/docs/en/best-practices#enforce-the-rules-that-cant-have-exceptions) |

### 1.6 Estrategias de descomposición de tareas

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Pipelines secuenciales (*prompt chaining*) frente a descomposición dinámica | API › Agents and workflows › *Chaining workflows*, *Workflows vs agents* · SUB › *Using subagents effectively* (*Pipelines secuenciales*: funcionan con tareas independientes y fallan cuando cada paso depende del anterior) | [Building effective agents][eng-agents] | [Cookbook › basic_workflows](https://github.com/anthropics/claude-cookbooks/blob/main/patterns/agents/basic_workflows.ipynb) | [Prompting best practices › Chain complex prompts](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#chain-complex-prompts) |
| Revisiones por archivo + pasada de integración entre archivos | CC101 › Daily workflows › *Code review* | — | [Curso GitHub › Appendix: Chaining prompts](https://github.com/anthropics/courses/blob/master/prompt_engineering_interactive_tutorial/Anthropic%201P/10.1_Appendix_Chaining%20Prompts.ipynb) | [Chain complex prompts](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#chain-complex-prompts) |
| Planes de investigación adaptativos (mapear estructura → priorizar → adaptar) | CC101 › *The explore → plan → code → commit workflow* | [Effective harnesses for long-running agents][eng-harness] | — | [Common workflows › Understand new codebases](https://code.claude.com/docs/en/common-workflows#understand-new-codebases) |

### 1.7 Estado de sesión, reanudación y *forking*

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| `--resume <nombre>` para continuar una conversación concreta | CCiA › Steer the Work › *Steering Long Sessions* | — | — | [Common workflows › Resume previous conversations](https://code.claude.com/docs/en/common-workflows#resume-previous-conversations) · [CLI reference › CLI flags](https://code.claude.com/docs/en/cli-reference#cli-flags) |
| `fork_session` / `--fork-session` para ramas paralelas desde una base común | — | — | — | [Agent SDK › Sessions › Fork to explore alternatives](https://code.claude.com/docs/en/agent-sdk/sessions#fork-to-explore-alternatives) · [Continue, resume, and fork](https://code.claude.com/docs/en/agent-sdk/sessions#continue-resume-and-fork) |
| Informar a la sesión reanudada de los archivos que cambiaron; empezar de cero con resumen estructurado cuando los resultados están obsoletos | CCiA › *Steering Long Sessions* · CC101 › *Context management* | [Effective context engineering][eng-context] · [Effective harnesses for long-running agents][eng-harness] (archivos de progreso y resúmenes entre sesiones) | — | [Prompting best practices › Workflows across multiple context windows](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#workflows-across-multiple-context-windows) |

---

## Dominio 2 · Tool Design & MCP Integration (18 %)

### 2.1 Interfaces de herramientas con descripciones y límites claros

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| La descripción es el mecanismo principal de selección; incluir formato de entrada, ejemplos, casos límite y cuándo **no** usarla | API › Tool use with Claude › *Tool schemas* · P101 › *What is tool use?* | [Writing effective tools for agents][eng-tools] | — | [Define tools › Best practices for tool definitions](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#best-practices-for-tool-definitions) · [Providing tool use examples](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#providing-tool-use-examples) |
| Descripciones ambiguas o solapadas causan *misrouting*; renombrar y separar herramientas genéricas en herramientas con propósito único | API › *Using multiple tools* | [Writing effective tools for agents][eng-tools] (elegir las herramientas adecuadas, *namespacing*) · [Advanced tool use][eng-advtools] | — | — |
| El wording del system prompt puede crear asociaciones no deseadas con herramientas | — | — | — | [Define tools › Tool use system prompt](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#tool-use-system-prompt) · [Prompting best practices › Tool usage](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#tool-usage) |

### 2.2 Respuestas de error estructuradas en herramientas MCP

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Flag `isError` de MCP | MCP › Hands-on with MCP servers › *Defining tools with MCP* | — | — | [Especificación MCP › Tools › Error Handling](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#error-handling) · [Handle tool calls › Handling errors with `is_error`](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls#handling-errors-with-is-error) |
| Errores transitorios / de validación / de negocio / de permisos; metadatos `errorCategory`, `isRetryable` | — | [Writing effective tools for agents][eng-tools] (respuestas de error útiles y accionables) | — | [Agent SDK › Custom tools › Handle errors](https://code.claude.com/docs/en/agent-sdk/custom-tools#handle-errors) · [Claude API errors](https://platform.claude.com/docs/en/api/errors) (referencia de clases de error HTTP) |
| Recuperación local en subagentes y propagación al coordinador con resultados parciales; distinguir fallo de acceso de resultado vacío válido | — | [Multi-agent research system][eng-multi] | — | ver también **5.3** |

### 2.3 Distribuir herramientas entre agentes y configurar `tool_choice`

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Demasiadas herramientas degradan la selección; acceso acotado por rol | SUB › *Designing effective subagents* (*Limitar el acceso a las herramientas*: solo lectura para investigación, `Bash` para revisores, `Edit`/`Write` solo para quien modifica código) · SUB › *Creating a subagent* (*Personalizar las herramientas*) | [Writing effective tools for agents][eng-tools] | — | [Agent SDK › Subagents › Tool restrictions / Common tool combinations](https://code.claude.com/docs/en/agent-sdk/subagents#common-tool-combinations) · [Claude Code › Control subagent capabilities](https://code.claude.com/docs/en/sub-agents#control-subagent-capabilities) |
| Sustituir herramientas genéricas por alternativas restringidas (`fetch_url` → `load_document`) | — | [Writing effective tools for agents][eng-tools] | — | — |
| `tool_choice`: `auto`, `any`, forzado `{"type":"tool","name":...}` | API › Tool use with Claude › *Structured data* (lección previa) y *Tool schemas* | — | [Curso GitHub *Tool use* › 05 Tool choice](https://github.com/anthropics/courses/blob/master/tool_use/05_tool_choice.ipynb) · [Cookbook › tool_choice](https://github.com/anthropics/claude-cookbooks/blob/main/tool_use/tool_choice.ipynb) | [Define tools › Forcing tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#forcing-tool-use) |

### 2.4 Integrar servidores MCP en Claude Code y en agentes

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Ámbitos: proyecto (`.mcp.json`) frente a usuario (`~/.claude.json`) | CC101 › Customizing Claude Code › *MCP* · API › Anthropic apps › *Enhancements with MCP servers* | — | — | [Claude Code › MCP installation scopes](https://code.claude.com/docs/en/mcp#mcp-installation-scopes) · [Project scope](https://code.claude.com/docs/en/mcp#project-scope) · [User scope](https://code.claude.com/docs/en/mcp#user-scope) |
| Expansión de variables de entorno en `.mcp.json` (`${GITHUB_TOKEN}`) | — | — | — | [Environment variable expansion in `.mcp.json`](https://code.claude.com/docs/en/mcp#environment-variable-expansion-in-mcp-json) · [Agent SDK › MCP › Pass credentials via environment variables](https://code.claude.com/docs/en/agent-sdk/mcp#pass-credentials-via-environment-variables) |
| Las herramientas de todos los servidores se descubren al conectar y están disponibles a la vez | MCP › Introducing MCP › *MCP clients* | — | — | [Agent SDK › MCP › Discover available tools](https://code.claude.com/docs/en/agent-sdk/mcp#discover-available-tools) · [Tool availability](https://code.claude.com/docs/en/mcp#tool-availability) |
| Recursos MCP como catálogos de contenido (esquemas, jerarquías de docs) | MCP › Connecting with MCP clients › *Defining resources*, *Accessing resources* · API › Model Context Protocol › mismas lecciones | — | — | [Especificación MCP › Resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources) · [Claude Code › Use MCP resources](https://code.claude.com/docs/en/mcp#use-mcp-resources) |
| Mejorar descripciones MCP para que el agente no prefiera `Grep` u otras herramientas integradas | — | [Writing effective tools for agents][eng-tools] | — | [Agent SDK › MCP › Tools not being called](https://code.claude.com/docs/en/agent-sdk/mcp#tools-not-being-called) |
| Usar servidores MCP de la comunidad para integraciones estándar | API › *Enhancements with MCP servers* | [Anuncio de MCP][mcp-news] | — | [Claude Code › Find and build MCP servers](https://code.claude.com/docs/en/mcp#find-and-build-mcp-servers) |
| Transporte y conceptos avanzados (stdio, Streamable HTTP, sampling, roots) | MCP+ (curso completo) | — | — | [Remote MCP servers](https://platform.claude.com/docs/en/agents-and-tools/remote-mcp-servers) · [MCP connector (API)](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) |

### 2.5 Uso de herramientas integradas (Read, Write, Edit, Bash, Grep, Glob)

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Grep = buscar contenido; Glob = buscar rutas por patrón; Read/Write = archivo completo; Edit = cambio dirigido con texto único | CC101 › What is Claude Code? › *How Claude Code works* · CCiA › (lecciones de contexto y cambios) | — | — | [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) · [Agent SDK › Built-in tools](https://code.claude.com/docs/en/agent-sdk/agent-loop#built-in-tools) · [Text editor tool (API; `str_replace` exige coincidencia única)](https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool) |
| Fallback Read + Write cuando Edit no encuentra un ancla única | API › Tool use with Claude › *The text edit tool* | — | — | [Text editor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool) |
| Entender un código de forma incremental (Grep para puntos de entrada → Read para seguir imports) | CC101 › *The explore → plan → code → commit workflow* | [Effective context engineering][eng-context] (recuperación *just-in-time*) | — | [Common workflows › Understand new codebases](https://code.claude.com/docs/en/common-workflows#understand-new-codebases) |

---

## Dominio 3 · Claude Code Configuration & Workflows (20 %)

### 3.1 CLAUDE.md: jerarquía, alcance y organización modular

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Jerarquía usuario / proyecto / subdirectorio; lo de usuario no se comparte con el equipo | CC101 › Customizing Claude Code › *The CLAUDE.md file* · CCiA › Configure Claude › *A CLAUDE.md That Follows* | — | — | [Memory › Choose where to put CLAUDE.md files](https://code.claude.com/docs/en/memory#choose-where-to-put-claude-md-files) · [How CLAUDE.md files load](https://code.claude.com/docs/en/memory#how-claude-md-files-load) |
| `@import` para modularizar | CCiA › *A CLAUDE.md That Follows* | — | — | [Memory › Import additional files](https://code.claude.com/docs/en/memory#import-additional-files) |
| Directorio `.claude/rules/` como alternativa a un CLAUDE.md monolítico | CCiA › *A CLAUDE.md That Follows* | — | — | [Memory › Set up rules](https://code.claude.com/docs/en/memory#set-up-rules) · [Best practices › Keep CLAUDE.md short](https://code.claude.com/docs/en/best-practices#keep-claude-md-short) |
| `/memory` para ver qué archivos están cargados y diagnosticar | CC101 › *The CLAUDE.md file* | — | — | [Commands › `/memory`](https://code.claude.com/docs/en/commands) · [Memory › Troubleshoot memory issues](https://code.claude.com/docs/en/memory#troubleshoot-memory-issues) |

### 3.2 Slash commands y skills personalizados

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Comandos de proyecto (`.claude/commands/`) frente a personales (`~/.claude/commands/`) | CC101 › *Skills* | — | — | [Skills (los comandos personalizados se han unificado con skills)](https://code.claude.com/docs/en/skills) · [Where skills live](https://code.claude.com/docs/en/skills#where-skills-live) |
| Skills en `.claude/skills/` con `SKILL.md` y frontmatter (`context: fork`, `allowed-tools`, `argument-hint`) | SKL › *Creating your first skill*, *Configuration and multi-file skills* | — | — | [Skills › Frontmatter reference](https://code.claude.com/docs/en/skills#frontmatter-reference) · [Agent Skills (plataforma)](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) · [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) |
| `context: fork` para aislar salidas verbosas en un subagente | SKL › *Configuration and multi-file skills* | — | — | [Skills › Run skills in a subagent](https://code.claude.com/docs/en/skills#run-skills-in-a-subagent) |
| `allowed-tools` para restringir herramientas; `argument-hint` para pedir parámetros | SKL › *Configuration and multi-file skills* | — | — | [Skills › Pre-approve tools for a skill](https://code.claude.com/docs/en/skills#pre-approve-tools-for-a-skill) · [Pass arguments to skills](https://code.claude.com/docs/en/skills#pass-arguments-to-skills) |
| Variantes personales en `~/.claude/skills/` con otro nombre | SKL › *Sharing skills* | — | — | [Skills › Resolve skills that share a name](https://code.claude.com/docs/en/skills#resolve-skills-that-share-a-name) |
| Skills (bajo demanda) frente a CLAUDE.md (siempre cargado) | SKL › *Skills vs. other Claude Code features* | [Equipping agents for the real world with Agent Skills][eng-skills] | — | [Best practices › Put team procedures in skills](https://code.claude.com/docs/en/best-practices#put-team-procedures-in-skills) |

### 3.3 Reglas por ruta para cargar convenciones de forma condicional

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Archivos en `.claude/rules/` con frontmatter `paths:` y globs | CCiA › *A CLAUDE.md That Follows* | — | — | [Memory › Path-specific rules](https://code.claude.com/docs/en/memory#path-specific-rules) · [Rules frontmatter reference](https://code.claude.com/docs/en/memory#rules-frontmatter-reference) |
| Se cargan solo al tocar archivos coincidentes (menos tokens); mejor que CLAUDE.md por directorio para convenciones repartidas (p. ej. `**/*.test.tsx`) | — | — | — | [Best practices › Scope rules to one part of the codebase](https://code.claude.com/docs/en/best-practices#scope-rules-to-one-part-of-the-codebase) |

### 3.4 Plan mode frente a ejecución directa

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Plan mode para cambios grandes, multiarchivo o con decisiones de arquitectura; ejecución directa para cambios simples y acotados | CC101 › Daily workflows › *The explore → plan → code → commit workflow* · CCiA › Configure Claude › *Permission Modes* | — | — | [Permission modes › Analyze before you edit with plan mode](https://code.claude.com/docs/en/permission-modes#analyze-before-you-edit-with-plan-mode) · [Common workflows › Plan before editing](https://code.claude.com/docs/en/common-workflows#plan-before-editing) |
| Combinar planificación (investigación) con ejecución directa (implementación) | CC101 › *The explore → plan → code → commit workflow* | — | — | [Permission modes › Review and approve a plan](https://code.claude.com/docs/en/permission-modes#review-and-approve-a-plan) |
| Subagente **Explore** para aislar el descubrimiento verboso | SUB › *What are subagents?* (*Un ejemplo práctico* y *Subagentes integrados*: Explore, Plan y propósito general) · CC101 › *Subagents* | — | — | [Sub-agents › Built-in subagents](https://code.claude.com/docs/en/sub-agents#built-in-subagents) · [Common workflows › Delegate research to subagents](https://code.claude.com/docs/en/common-workflows#delegate-research-to-subagents) |

### 3.5 Refinamiento iterativo

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| 2–3 ejemplos concretos de entrada/salida cuando la prosa se interpreta de forma inconsistente | API › Prompt engineering techniques › *Providing examples* | — | — | [Prompting best practices › Use examples effectively](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#use-examples-effectively) |
| Iteración guiada por tests (escribir tests primero y compartir fallos) | CCiA › Configure Claude › *Verification Skills* | — | — | [Best practices › Give Claude a check to run](https://code.claude.com/docs/en/best-practices#give-claude-a-check-to-run) · [Common workflows › Work with tests](https://code.claude.com/docs/en/common-workflows#work-with-tests) |
| Patrón *interview*: que Claude pregunte antes de implementar | — | — | — | [Best practices › Brainstorm with Claude first](https://code.claude.com/docs/en/best-practices#brainstorm-with-claude-first) |
| Problemas que interactúan en un solo mensaje frente a problemas independientes en secuencia | CCiA › *Steering Long Sessions* | — | — | [Best practices › Write a specific prompt](https://code.claude.com/docs/en/best-practices#write-a-specific-prompt) · [Steer the session](https://code.claude.com/docs/en/best-practices#steer-the-session) |

### 3.6 Claude Code en CI/CD

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| `-p` / `--print` para modo no interactivo | CCiA › Automate Repeat Work › *Routines and Headless* | — | — | [Run Claude Code programmatically (headless)](https://code.claude.com/docs/en/headless) · [CLI reference › CLI flags](https://code.claude.com/docs/en/cli-reference#cli-flags) |
| `--output-format json` + `--json-schema` para hallazgos parseables | CCiA › *Routines and Headless* | — | — | [Headless › Get structured output](https://code.claude.com/docs/en/headless#get-structured-output) · [Agent SDK › Structured outputs](https://code.claude.com/docs/en/agent-sdk/structured-outputs) |
| CLAUDE.md como contexto del proyecto para CI (estándares de test, fixtures, criterios de revisión) | CCiA › Automate Repeat Work › *GitHub Actions and Code Review* | — | — | [GitHub Actions › Define project standards in CLAUDE.md](https://code.claude.com/docs/en/github-actions#define-project-standards-in-claude-md) · [GitLab CI/CD](https://code.claude.com/docs/en/gitlab-ci-cd) |
| Instancia de revisión independiente frente a la que generó el código; volver a revisar solo hallazgos nuevos | CCiA › *GitHub Actions and Code Review*, Verify and Share › *Trust It: Verifying Unsupervised Runs* · CC101 › *Code review* | — | — | [GitHub Actions › Example use cases](https://code.claude.com/docs/en/github-actions#example-use-cases) · [Best practices › Review against your spec](https://code.claude.com/docs/en/best-practices#review-against-your-spec) · ver también **4.6** |

---

## Dominio 4 · Prompt Engineering & Structured Output (20 %)

### 4.1 Criterios explícitos para mejorar precisión y reducir falsos positivos

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Criterios explícitos y categóricos frente a instrucciones vagas («sé conservador») | API › Prompt engineering techniques › *Being clear and direct*, *Being specific* | — | [Curso GitHub › Ch. 2 Being clear and direct](https://github.com/anthropics/courses/blob/master/prompt_engineering_interactive_tutorial/Anthropic%201P/02_Being_Clear_and_Direct.ipynb) | [Prompting best practices › Be clear and direct](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#be-clear-and-direct) · [Add context to improve performance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#add-context-to-improve-performance) |
| Impacto de los falsos positivos en la confianza; criterios de severidad con ejemplos de código | API › Prompt evaluation (sección completa) | — | [Real world prompting (curso GitHub)](https://github.com/anthropics/courses/tree/master/real_world_prompting) | [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) |

### 4.2 Few-shot prompting para consistencia y calidad

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Few-shot como técnica más eficaz para formato consistente y casos ambiguos | API › Prompt engineering techniques › *Providing examples* | — | [Curso GitHub › Ch. 7 Using examples (few-shot)](https://github.com/anthropics/courses/blob/master/prompt_engineering_interactive_tutorial/Anthropic%201P/07_Using_Examples_Few-Shot_Prompting.ipynb) | [Prompting best practices › Use examples effectively](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#use-examples-effectively) |
| Ejemplos que muestran el razonamiento de por qué se elige una acción; generalización a patrones nuevos | API › *Providing examples* | — | — | [Increase output consistency › Constrain with examples](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency#constrain-with-examples) · [Define tools › Providing tool use examples](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#providing-tool-use-examples) |
| Few-shot para reducir alucinaciones y campos vacíos en extracción de documentos variados | — | — | [Curso GitHub › Ch. 8 Avoiding hallucinations](https://github.com/anthropics/courses/blob/master/prompt_engineering_interactive_tutorial/Anthropic%201P/08_Avoiding_Hallucinations.ipynb) | [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations) |

### 4.3 Salida estructurada con tool use y JSON Schema

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Tool use con JSON Schema como vía más fiable de salida estructurada; extraer el resultado del bloque `tool_use` | API › Accessing Claude with the API › *Structured data* · API › Tool use with Claude › *Tool schemas* | — | [Curso GitHub *Tool use* › 03 Structured outputs](https://github.com/anthropics/courses/blob/master/tool_use/03_structured_outputs.ipynb) · [Cookbook › extracting_structured_json](https://github.com/anthropics/claude-cookbooks/blob/main/tool_use/extracting_structured_json.ipynb) | [Structured outputs › Strict tool use](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#strict-tool-use) |
| `tool_choice` `auto` / `any` / forzado | — | — | [Curso GitHub *Tool use* › 05 Tool choice](https://github.com/anthropics/courses/blob/master/tool_use/05_tool_choice.ipynb) | [Define tools › Forcing tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#forcing-tool-use) |
| El esquema elimina errores de sintaxis pero no errores semánticos | — | — | — | [Structured outputs › Important considerations](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#important-considerations) · [Invalid outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#invalid-outputs) |
| Diseño del esquema: campos opcionales/nullables, `enum` con `"other"` + detalle, `"unclear"` | — | — | [Cookbook › tool_use_with_pydantic](https://github.com/anthropics/claude-cookbooks/blob/main/tool_use/tool_use_with_pydantic.ipynb) | [Structured outputs › JSON Schema limitations](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#json-schema-limitations) |
| Reglas de normalización de formato en el prompt junto con el esquema | — | — | — | [Increase output consistency › Specify the desired output format](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency#specify-the-desired-output-format) |

### 4.4 Validación, reintentos y bucles de feedback en extracción

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Reintento con feedback de error (documento + extracción fallida + errores concretos) | API › Prompt evaluation › *Code based grading* | — | [Cookbook › evaluator_optimizer](https://github.com/anthropics/claude-cookbooks/blob/main/patterns/agents/evaluator_optimizer.ipynb) | [Handle tool calls › Handling errors with `is_error`](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls#handling-errors-with-is-error) |
| Límites del reintento: no sirve si la información no está en el documento | — | — | — | [Reduce hallucinations › Basic strategies](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations#basic-hallucination-minimization-strategies) (permitir «no lo sé») |
| Campos `detected_pattern`, `calculated_total` vs `stated_total`, `conflict_detected` | API › Prompt evaluation › *Running the eval*, *Model based grading* | — | [Curso GitHub › Prompt evaluations](https://github.com/anthropics/courses/tree/master/prompt_evaluations) · [Cookbook › building_evals](https://github.com/anthropics/claude-cookbooks/blob/main/misc/building_evals.ipynb) | — |

### 4.5 Procesamiento por lotes (Message Batches API)

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| 50 % de ahorro, ventana de hasta 24 h, sin SLA de latencia; solo para cargas no bloqueantes | — | — | — | [Batch processing › How the Message Batches API works](https://platform.claude.com/docs/en/build-with-claude/batch-processing#how-the-message-batches-api-works) · [Pricing](https://platform.claude.com/docs/en/build-with-claude/batch-processing#pricing) |
| Sin tool calling multiturno dentro de una petición | — | — | — | [Batch processing › Server tools and the agentic loop](https://platform.claude.com/docs/en/build-with-claude/batch-processing#server-tools-and-the-agentic-loop) · [Batch limitations](https://platform.claude.com/docs/en/build-with-claude/batch-processing#batch-limitations) |
| `custom_id` para correlacionar; reenviar solo los fallidos | — | — | [Cookbook › batch_processing](https://github.com/anthropics/claude-cookbooks/blob/main/misc/batch_processing.ipynb) | [Retrieving batch results](https://platform.claude.com/docs/en/build-with-claude/batch-processing#retrieving-batch-results) · [Best practices for effective batching](https://platform.claude.com/docs/en/build-with-claude/batch-processing#best-practices-for-effective-batching) |
| Refinar el prompt sobre una muestra antes del lote | API › Prompt evaluation › *A typical eval workflow* | — | — | [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) |

### 4.6 Arquitecturas de revisión multiinstancia y multipasada

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Limitaciones de la autorrevisión; instancia independiente sin el contexto del generador | CCiA › Verify and Share › *Trust It: Verifying Unsupervised Runs* · SUB › *Using subagents effectively* (*Revisiones de código*: el subagente revisor no conoce la historia de cómo se escribió el código) | — | — | [Sub-agents › Example subagents › Code reviewer](https://code.claude.com/docs/en/sub-agents#code-reviewer) · [Best practices › Review against your spec](https://code.claude.com/docs/en/best-practices#review-against-your-spec) |
| Pasadas por archivo + pasada de integración | CC101 › *Code review* | — | — | [Chain complex prompts](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#chain-complex-prompts) |
| Pasadas de verificación con confianza autodeclarada por hallazgo para enrutar la revisión | API › Prompt evaluation › *Model based grading* | [Demystifying evals for AI agents][eng-evals] | — | — |

---

## Dominio 5 · Context Management & Reliability (15 %)

### 5.1 Preservar información crítica en interacciones largas

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Riesgos del resumen progresivo; bloque persistente de «hechos del caso» | CC101 › Daily workflows › *Context management* · P101 › Extending your Agent › *Context management* | [Effective context engineering][eng-context] | — | [Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) · [Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction) |
| Efecto *lost in the middle*; poner los hallazgos clave al principio con cabeceras | — | — | — | [Prompting best practices › Long context prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#long-context-prompting) |
| Los resultados de herramientas se acumulan; recortar a los campos relevantes | API › Tool use with Claude › *Sending tool results* | [Writing effective tools for agents][eng-tools] (eficiencia de tokens en respuestas) | — | [Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing) · [Agent SDK › What consumes context](https://code.claude.com/docs/en/agent-sdk/agent-loop#what-consumes-context) |
| Enviar el historial completo en cada petición | API › Accessing Claude with the API › *Multi-Turn conversations* | — | — | [Using the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages) |
| Subagentes que devuelven datos estructurados (hechos, citas, relevancia) en lugar de razonamiento verboso | SUB › *Designing effective subagents* (*Definir un formato de salida*) | [Multi-agent research system][eng-multi] | — | — |

### 5.2 Escalado y resolución de ambigüedad

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Disparadores de escalado: petición explícita de humano, huecos/excepciones de política, imposibilidad de avanzar | — | — | [Cookbook › customer_service_agent](https://github.com/anthropics/claude-cookbooks/blob/main/tool_use/customer_service_agent.ipynb) | [Customer support agent (guía de caso de uso)](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat) |
| Sentimiento y confianza autodeclarada no son buenos indicadores de complejidad | — | — | — | [Ticket routing (guía de caso de uso)](https://platform.claude.com/docs/en/about-claude/use-case-guides/ticket-routing) |
| Criterios explícitos de escalado con ejemplos few-shot en el system prompt | API › Prompt engineering techniques › *Providing examples* · API › Accessing Claude with the API › *System prompts* | — | [Real world prompting › 05 Customer support AI](https://github.com/anthropics/courses/blob/master/real_world_prompting/05_customer_support_ai.ipynb) | [Prompting best practices › Use examples effectively](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#use-examples-effectively) |
| Coincidencias múltiples: pedir identificadores adicionales en lugar de elegir por heurística | — | — | — | [Prompting best practices › Balancing autonomy and safety](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#balancing-autonomy-and-safety) |

### 5.3 Propagación de errores en sistemas multiagente

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Contexto de error estructurado (tipo de fallo, qué se intentó, resultados parciales, alternativas) | SUB › *Designing effective subagents* (parcial, *Informar de los obstáculos*: una sección «Obstáculos encontrados» en el formato de salida) | [Multi-agent research system][eng-multi] · [Writing effective tools for agents][eng-tools] | — | — |
| Fallo de acceso frente a resultado vacío válido; ni suprimir errores ni abortar todo el flujo | — | — | — | [Especificación MCP › Tools › Error Handling](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#error-handling) · [Agent SDK › MCP › Error handling](https://code.claude.com/docs/en/agent-sdk/mcp#error-handling) |
| Recuperación local de errores transitorios; anotaciones de cobertura en la síntesis | — | [Multi-agent research system][eng-multi] | — | [Claude Code › API errors in subagents](https://code.claude.com/docs/en/sub-agents#api-errors-in-subagents) |

### 5.4 Contexto en la exploración de bases de código grandes

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Degradación del contexto en sesiones largas | CC101 › *Context management* · CCiA › *Steering Long Sessions* | [Effective context engineering][eng-context] | — | [Context window (Claude Code)](https://code.claude.com/docs/en/context-window) |
| Archivos *scratchpad* para persistir hallazgos | — | [Effective harnesses for long-running agents][eng-harness] | — | [Memory tool (API)](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool) · [Prompting best practices › State management best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#state-management-best-practices) |
| Delegar en subagentes para aislar la exploración verbosa | SUB › *Using subagents effectively* (*Tareas de investigación* y la regla «¿importa el trabajo intermedio?») · SUB › *What are subagents?* | — | — | [Common workflows › Delegate research to subagents](https://code.claude.com/docs/en/common-workflows#delegate-research-to-subagents) · [Choose between subagents and main conversation](https://code.claude.com/docs/en/sub-agents#choose-between-subagents-and-main-conversation) |
| Persistencia de estado para recuperación ante caídas (manifiestos) | — | [Effective harnesses for long-running agents][eng-harness] | — | [Agent SDK › File checkpointing](https://code.claude.com/docs/en/agent-sdk/file-checkpointing) |
| `/compact` para reducir el uso de contexto | CC101 › *Context management* | — | — | [Commands › `/compact`](https://code.claude.com/docs/en/commands) · [Context window › What survives compaction](https://code.claude.com/docs/en/context-window#what-survives-compaction) · [Agent SDK › Automatic compaction](https://code.claude.com/docs/en/agent-sdk/agent-loop#automatic-compaction) |

### 5.5 Flujos de revisión humana y calibración de confianza

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Métricas agregadas que ocultan fallos por tipo de documento o campo; analizar por segmento | API › Prompt evaluation (sección completa) | [Demystifying evals for AI agents][eng-evals] | — | [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) |
| Muestreo aleatorio estratificado; confianza por campo calibrada con conjuntos etiquetados | API › Prompt evaluation › *Generating test datasets*, *Running the eval* | — | [Curso GitHub › Prompt evaluations](https://github.com/anthropics/courses/tree/master/prompt_evaluations) · [Cookbook › building_evals](https://github.com/anthropics/claude-cookbooks/blob/main/misc/building_evals.ipynb) | — |
| Enrutar a revisión humana lo de baja confianza o fuentes contradictorias | — | — | — | [Ticket routing](https://platform.claude.com/docs/en/about-claude/use-case-guides/ticket-routing) · [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations) |

> Nota: el muestreo estratificado y la calibración de umbrales son prácticas generales de evaluación; Anthropic las cubre de forma indirecta en sus guías de evals, sin una página dedicada.

### 5.6 Procedencia de la información e incertidumbre en síntesis multifuente

| Punto de la guía | Curso | Artículos de Anthropic | Prácticas | Otros |
|---|---|---|---|---|
| Mapeos afirmación–fuente estructurados que se preservan en la síntesis | API › Features of Claude › *Citations* | [Multi-agent research system][eng-multi] (agente de citas) | — | [Citations](https://platform.claude.com/docs/en/build-with-claude/citations) |
| Anotar conflictos entre fuentes con su atribución en vez de escoger uno | — | — | — | [Reduce hallucinations › Advanced techniques](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations#advanced-techniques) · [Prompting best practices › Research and information gathering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#research-and-information-gathering) |
| Exigir fechas de publicación o recogida para interpretar diferencias temporales | — | — | — | [Legal summarization (guía de caso de uso)](https://platform.claude.com/docs/en/about-claude/use-case-guides/legal-summarization) |
| Presentar cada tipo de contenido en su formato (tablas, prosa, listas) | — | — | — | [Prompting best practices › Control the format of responses](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#control-the-format-of-responses) |

---

## Ruta mínima recomendada

1. **API** completo (sobre todo *Tool use with Claude*, *Prompt engineering techniques*, *Prompt evaluation* y *Agents and workflows*) → dominios 1, 2 y 4.
2. **P101** → bucle agéntico y gestión de contexto (dominios 1 y 5).
3. **CC101** y **CCiA** → dominio 3 y la parte de CI/CD.
4. **SUB** y **SKL** → subagentes, `context: fork`, frontmatter de skills.
5. **MCP** (y **MCP+** si queda tiempo) → dominio 2.
6. Leer los cuatro artículos de ingeniería: [Building effective agents][eng-agents], [Multi-agent research system][eng-multi], [Writing effective tools for agents][eng-tools] y [Effective context engineering][eng-context].
7. Practicar con los [notebooks de Agent SDK del cookbook](https://github.com/anthropics/claude-cookbooks/tree/main/claude_agent_sdk) y la [referencia del Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview).

<!-- Enlaces de referencia -->
[api]: https://anthropic.skilljar.com/claude-with-the-anthropic-api
[p101]: https://anthropic.skilljar.com/claude-platform-101
[cc101]: https://anthropic.skilljar.com/claude-code-101
[ccia]: https://anthropic.skilljar.com/claude-code-in-action
[sub]: https://anthropic.skilljar.com/introduction-to-subagents
[skl]: https://anthropic.skilljar.com/introduction-to-agent-skills
[mcp]: https://anthropic.skilljar.com/introduction-to-model-context-protocol
[mcpadv]: https://anthropic.skilljar.com/model-context-protocol-advanced-topics
[eng-agents]: https://www.anthropic.com/research/building-effective-agents
[eng-multi]: https://www.anthropic.com/research/multi-agent-research-system
[eng-tools]: https://www.anthropic.com/research/writing-tools-for-agents
[eng-context]: https://www.anthropic.com/research/effective-context-engineering-for-ai-agents
[eng-harness]: https://www.anthropic.com/research/effective-harnesses-for-long-running-agents
[eng-skills]: https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills
[eng-advtools]: https://www.anthropic.com/research/advanced-tool-use
[eng-evals]: https://www.anthropic.com/research/demystifying-evals-for-ai-agents
[mcp-news]: https://www.anthropic.com/news/model-context-protocol
[ebook]: https://claude.com/resources/guides/building-effective-ai-agents
