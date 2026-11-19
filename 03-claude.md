# Dominio 3 · Configuración y flujos de trabajo de Claude Code (20 %)

> Síntesis didáctica de los conceptos del Dominio 3 de la guía oficial del examen **Claude Certified Architect – Foundations** (v1.0).
> Fuentes principales: los cursos de Anthropic Academy de la carpeta `Anthropic/` (enlazados como `[[...]]`), sobre todo *Claude Code 101*, *Claude Code in action* e *Introducción a agent skills*. Donde los cursos no llegan (reglas por ruta, comandos personalizados, `context: fork`, refinamiento iterativo), se completa con la documentación oficial de Claude Code. El índice de recursos por *task statement* está en [[00-index]].

## Cómo usar este documento

Cada sección corresponde a un *task statement* (3.1 a 3.6) y sigue el mismo esquema que [[01-agentic-architecture]]:

1. **La idea en una frase**.
2. **Explicación**, con ejemplos.
3. **Qué busca el examen**: los razonamientos que la guía premia y las trampas habituales.
4. **Fuentes**.

Al final hay una chuleta de decisiones y preguntas de autoevaluación.

Este dominio aparece sobre todo en dos escenarios del examen: **«Code Generation with Claude Code»** (CLAUDE.md, comandos, plan mode) y **«Claude Code for Continuous Integration»** (CI/CD, revisiones automáticas, generación de tests).

### El mapa del dominio: dónde va cada instrucción

La pregunta que recorre todo el dominio es **dónde poner cada cosa**. Claude Code tiene varios mecanismos de personalización y cada uno resuelve un problema distinto:

| Mecanismo | Cuándo se carga | Para qué | Naturaleza |
|---|---|---|---|
| `CLAUDE.md` | **Siempre**, al inicio de cada sesión | Estándares universales del proyecto | Instrucción (probabilística) |
| `.claude/rules/` sin `paths` | Siempre, igual que `CLAUDE.md` | Lo mismo, pero dividido por temas | Instrucción |
| `.claude/rules/` con `paths` | Solo al trabajar con archivos que coinciden | Convenciones de un tipo de archivo | Instrucción |
| Skills (`.claude/skills/`) | **Bajo demanda**: solo el nombre y la descripción hasta que hacen falta | Procedimientos y conocimiento de una tarea concreta | Instrucción |
| Comandos (`.claude/commands/`) | Cuando los invocas con `/nombre` | Flujos que lanzas explícitamente | Instrucción |
| Subagentes (`.claude/agents/`) | Cuando se delega en ellos | Trabajo en un contexto aislado | Delegación |
| Hooks (`settings.json`) | En eventos del ciclo de vida | Reglas que **no** pueden fallar | Código (determinista) |
| MCP | Al conectar el servidor | Herramientas y datos externos | Integración |

El curso *Claude Code in action* lo resume en una regla de tres partes: las convenciones que se aplican siempre van en `CLAUDE.md`; los procedimientos de un tipo de tarea, en una skill; y una regla que Claude **no debe poder omitir**, en un hook, «porque tanto `CLAUDE.md` como las skills son instrucciones que Claude sigue, mientras que un hook es código que realmente se ejecuta».

---

## 3.1 Configurar `CLAUDE.md`: jerarquía, alcance y organización modular

### La idea en una frase

`CLAUDE.md` es el «guion de incorporación» que Claude lee en cada sesión. Existe en varios niveles (organización, usuario, proyecto, local, subdirectorio) que **se suman**, y solo el de proyecto se comparte con el equipo a través de git.

### Explicación

**El problema que resuelve.** Sin `CLAUDE.md`, Claude empieza de cero en cada sesión: tiene que volver a explorar el código, averiguar los comandos y adivinar las convenciones. Con él, ya sabe, por ejemplo, que el proyecto usa `pnpm`, dónde van las rutas de la API o que se prefieren los *exports* con nombre. El curso lo describe como un archivo cuyo contenido «se añade automáticamente a cada prompt».

**La jerarquía.** Claude carga **todos** los niveles que encuentra y los concatena; ninguno sustituye a otro:

| Nivel | Ubicación | Quién lo ve |
|---|---|---|
| **Política gestionada** (organización) | Ruta del sistema, controlada por IT (p. ej. `/etc/claude-code/CLAUDE.md`) | Toda la organización; no se puede excluir |
| **Usuario** | `~/.claude/CLAUDE.md` | **Solo tú**, en todos tus proyectos |
| **Proyecto** | `./CLAUDE.md` o `./.claude/CLAUDE.md` | **Todo el equipo**, vía control de versiones |
| **Local** | `./CLAUDE.local.md` (en `.gitignore`) | Solo tú, en ese proyecto |
| **Subdirectorio** | `<subdir>/CLAUDE.md` | Se carga **bajo demanda**, cuando Claude lee o edita archivos de ese subdirectorio |

Se cargan de lo más general a lo más específico. Los archivos de los directorios por encima del directorio de trabajo se cargan al arrancar; los de subdirectorios, cuando Claude toca archivos dentro de ellos.

**El error de diagnóstico clásico.** Un compañero nuevo clona el repositorio y Claude no sigue las convenciones del equipo. Causa típica: las instrucciones están en el `~/.claude/CLAUDE.md` de quien las escribió (nivel de usuario), que **no se comparte por git**. Solución: moverlas al `CLAUDE.md` del proyecto.

**Modularidad con `@import`.** Un `CLAUDE.md` puede importar otros archivos con `@ruta`:

```markdown
# Proyecto
Consulta @README.md para la visión general y @package.json para los scripts disponibles.

# Estándares
- Estilo de código @.claude/conventions/code-style.md
- Tests @.claude/conventions/testing.md
```

Las rutas relativas se resuelven respecto al archivo que importa, y los imports pueden anidarse (hasta cuatro niveles). En un monorepo, cada paquete puede importar solo los estándares que le corresponden (por ejemplo, el `CLAUDE.md` del paquete de pagos importa `@../../standards/pci.md`), según el criterio de quien lo mantiene.

**Matiz importante del curso:** los imports sirven para **organizar**, no para ahorrar contexto. Claude expande los archivos importados en línea al arrancar, así que todo se carga igualmente.

**`.claude/rules/`: dividir por temas.** La alternativa a un `CLAUDE.md` monolítico es una carpeta de reglas, un archivo por tema:

```text
.claude/
├── CLAUDE.md
└── rules/
    ├── testing.md
    ├── api-conventions.md
    └── deployment.md
```

Las reglas **sin** `paths` se cargan siempre, con la misma prioridad que `.claude/CLAUDE.md`. Las reglas **con** `paths` se cargan solo cuando hace falta (lo vemos en 3.3).

**Verificar qué se ha cargado: `/memory`.** La guía pide usar `/memory` para comprobar qué archivos de memoria hay y diagnosticar comportamientos inconsistentes entre sesiones. `/memory` lista los `CLAUDE.md`, `CLAUDE.local.md` y demás archivos de memoria de los ámbitos de usuario y proyecto, y permite abrirlos y editarlos. En la versión actual, para ver exactamente qué se cargó al arrancar se usa además `/context` (lista **Memory files**). Para depurar reglas por ruta o archivos de subdirectorio está el hook `InstructionsLoaded`.

**Cómo escribir un `CLAUDE.md` que se cumpla.** El curso *Claude Code in action* insiste en que el archivo **no es una configuración obligatoria, sino una guía**: cada línea compite con las demás por la atención de Claude. Sus consejos:

1. **Mantenlo corto.** La documentación recomienda menos de 200 líneas por archivo. Cuanto más largo, menos fiable es que se siga una regla concreta.
2. **Reglas específicas y verificables.** No «sigue las buenas prácticas para las rutas de API», sino «coloca las nuevas rutas de API en `src/api/handlers`, una por archivo».
3. **Indica la alternativa.** No «no uses *exports* por defecto», sino «usa *exports* con nombre, no por defecto».
4. **El énfasis es un presupuesto.** Si todas las reglas dicen «IMPORTANTE», ninguna destaca.
5. **Las reglas estrictas van a hooks.** «Nunca hagas push a `main`» no debe depender de que Claude lo recuerde.
6. **Revísalo continuamente.** Cada error de Claude es un informe de error sobre tu `CLAUDE.md`; puedes decirle «añade eso al `CLAUDE.md`».

Y del curso *Claude Code 101*: puedes empezar sin `CLAUDE.md` para ver dónde corriges a Claude, y luego generar uno con `/init`.

### Qué busca el examen

- Un compañero no recibe las instrucciones → están a nivel de **usuario** en lugar de **proyecto**.
- Las preferencias personales van en `~/.claude/CLAUDE.md` (o `CLAUDE.local.md`), nunca en el de proyecto.
- `CLAUDE.md` demasiado grande → dividir en `.claude/rules/` por temas o usar `@import` para organizar.
- Comportamiento inconsistente entre sesiones → `/memory` (y `/context`) para ver qué archivos de memoria están en juego.

### Fuentes

- Claude Code 101 › Customizing Claude Code › [The CLAUDE.md file](https://academy.claude.com/courses/claude-code-101/the-claude-md-file)
- Claude Code in action › Configure Claude › [A CLAUDE.md that follows](https://academy.claude.com/courses/claude-code-in-action/a-claude-md-that-follows) (las cuatro ubicaciones, imports, redacción)
- Docs: [How Claude remembers your project](https://code.claude.com/docs/en/memory) (secciones *Choose where to put CLAUDE.md files*, *Import additional files*, *Organize rules with .claude/rules/* y *View and edit with /memory*)

---

## 3.2 Comandos *slash* y skills personalizados

### La idea en una frase

Un **comando** es un flujo que lanzas tú con `/nombre`; una **skill** es conocimiento de una tarea que Claude carga **bajo demanda** cuando la petición encaja con su descripción. Los de proyecto (`.claude/`) se comparten por git; los personales (`~/.claude/`) solo te afectan a ti.

### Explicación

**Comandos personalizados.** Un archivo Markdown en `.claude/commands/` crea un comando: `.claude/commands/review.md` → `/review`.

| Ámbito | Ubicación | Quién lo tiene |
|---|---|---|
| Proyecto | `.claude/commands/` | Todo el equipo al clonar o hacer *pull* |
| Usuario | `~/.claude/commands/` | Solo tú |

En la versión actual de Claude Code, **los comandos se han fusionado con las skills**: `.claude/commands/deploy.md` y `.claude/skills/deploy/SKILL.md` crean el mismo `/deploy`, y los comandos existentes siguen funcionando. La documentación recomienda skills para el trabajo nuevo, pero la guía del examen sigue tratando `.claude/commands/` como el sitio de los comandos de proyecto.

**Skills.** Una skill es una **carpeta** con un `SKILL.md`:

```markdown
---
name: pr-description
description: Escribe descripciones de pull requests. Úsala al crear una PR o cuando el usuario pida resumir los cambios de una rama.
---
Al escribir una descripción de PR:
1. Ejecuta `git diff main...HEAD` para ver los cambios.
2. Escribe la descripción con las secciones: Qué, Por qué, Cambios.
```

Cómo funcionan, según el curso *Introducción a agent skills*:

- Al arrancar, Claude solo carga el **nombre y la descripción** de cada skill. Por eso tener muchas no cuesta contexto.
- Cuando tu petición coincide con una descripción, Claude carga el `SKILL.md` completo y sigue sus instrucciones.
- La **descripción** es lo que decide la activación. Debe responder a dos preguntas: qué hace y cuándo usarla. Si una skill no se activa, casi siempre hay que mejorar la descripción con las palabras que usas de verdad.
- **Divulgación progresiva**: mantén `SKILL.md` por debajo de 500 líneas y mueve el material extenso a archivos de apoyo (`references/`, `scripts/`, `assets/`) que Claude solo lee cuando los necesita. Los scripts se **ejecutan** sin cargarse en el contexto: solo su salida consume tokens.

| Ámbito | Ubicación |
|---|---|
| Personal | `~/.claude/skills/<nombre>/SKILL.md` |
| Proyecto | `.claude/skills/<nombre>/SKILL.md` |
| Empresa | Configuración gestionada (máxima prioridad) |
| Plugin | `<plugin>/skills/<nombre>/SKILL.md` |

Si dos skills se llaman igual, gana la de mayor prioridad: **empresa → personal → proyecto** (las de plugin van con espacio de nombres propio).

**Los tres campos de *frontmatter* que pide la guía:**

| Campo | Qué hace | Ejemplo de uso |
|---|---|---|
| `context: fork` | Ejecuta la skill en un **subagente aislado**: la salida y el trabajo intermedio no ensucian la conversación principal | Análisis del código que genera mucha salida; *brainstorming* de alternativas |
| `allowed-tools` | Lista de herramientas que la skill puede usar sin pedir permiso mientras está activa | Limitar una skill a lectura (`Read, Grep, Glob`) o a escritura de archivos, sin acciones destructivas |
| `argument-hint` | Pista que muestra el autocompletado con los argumentos esperados (p. ej. `[issue-number]`); no valida ni obliga | Recordar al desarrollador qué parámetro tiene que escribir al invocar la skill |

Un ejemplo que combina los tres:

```markdown
---
name: analyze-module
description: Analiza en profundidad un módulo y resume su arquitectura y dependencias.
argument-hint: [ruta-del-módulo]
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob
---
Analiza el módulo $ARGUMENTS:
1. Localiza sus archivos con Glob y Grep.
2. Lee y analiza el código.
3. Resume la arquitectura y las dependencias con referencias concretas a archivos.
```

**`argument-hint` y cómo llegan los argumentos.** Una skill se puede invocar con texto detrás del nombre: `/fix-issue 123`. Ese texto son los **argumentos**, y hay dos piezas distintas que conviene no confundir:

- **`argument-hint`** solo es una **pista visual**. Cuando escribes `/fix-issue` en Claude Code, el autocompletado muestra al lado lo que espera la skill, por ejemplo `/fix-issue [issue-number]`. No valida nada ni obliga a escribir el argumento: solo le recuerda al desarrollador qué tiene que poner.
- **`$ARGUMENTS`** es el **hueco** del `SKILL.md` donde se inserta lo que escribiste. Antes de que Claude lea la skill, Claude Code sustituye `$ARGUMENTS` por el texto de la invocación.

Ejemplo completo:

```markdown
---
name: fix-issue
description: Corrige una issue de GitHub siguiendo nuestros estándares.
argument-hint: [issue-number]
---
Corrige la issue $ARGUMENTS de GitHub:
1. Lee la descripción de la issue.
2. Implementa la corrección.
3. Escribe tests y haz un commit.
```

| Lo que escribes | Lo que ves en el autocompletado | Lo que recibe Claude |
|---|---|---|
| `/fix-issue` | `/fix-issue [issue-number]` | — (aún no has invocado la skill) |
| `/fix-issue 123` | — | «Corrige la issue 123 de GitHub: 1. Lee la descripción…» |

Si la skill necesita **varios argumentos**, se usan por posición, empezando en 0: `$0` es el primero, `$1` el segundo, etc. (forma corta de `$ARGUMENTS[0]`, `$ARGUMENTS[1]`…). Los valores con espacios van entre comillas.

```markdown
---
name: migrate-component
description: Migra un componente de un lenguaje a otro.
argument-hint: [componente] [desde] [hasta]
---
Migra el componente $0 de $1 a $2 conservando el comportamiento y los tests.
```

`/migrate-component SearchBar JavaScript TypeScript` llega como «Migra el componente SearchBar de JavaScript a TypeScript…». Si invocas una skill con argumentos y su contenido no tiene ningún hueco, Claude Code añade al final `ARGUMENTS: <lo que escribiste>` para que Claude lo vea igualmente.

**Qué hace exactamente `context: fork`.** Sin este campo, la skill se carga **en tu conversación**: Claude la lee y sigue sus instrucciones con todo lo que ya habéis hablado. Con `context: fork`, Claude Code lanza un **subagente nuevo** y le pasa como única tarea el contenido del `SKILL.md`, ya con los argumentos sustituidos. Tres consecuencias:

1. **El subagente no ve la conversación.** Solo conoce el texto de la skill (y el `CLAUDE.md` del proyecto). Si escribes «revisa lo que hemos hablado» en una skill con `context: fork`, no sabrá a qué te refieres. Las instrucciones tienen que bastarse solas, y lo que dependa de la conversación tiene que llegar como argumento.
2. **El campo `agent` decide qué subagente lo hace**, y con él qué herramientas y permisos tiene: `Explore` (exploración de solo lectura), `Plan`, `general-purpose` (el que se usa si no pones `agent`) o uno propio de `.claude/agents/`.
3. **A tu conversación solo vuelve el resumen final.** Toda la lectura de archivos y la salida intermedia se quedan en el contexto del subagente. Por eso encaja con análisis que generan mucha salida.

Por la misma razón, `context: fork` **solo sirve para skills que piden una tarea autocontenida**. Compara:

| Skill | ¿Sirve con `context: fork`? | Por qué |
|---|---|---|
| `analyze-module` (arriba): «Analiza el módulo $ARGUMENTS y resume su arquitectura» | Sí | Es una tarea completa: el subagente la hace y devuelve el resumen |
| `api-conventions`: «Usa nombres en camelCase y devuelve siempre errores con este formato» | No | Son pautas para el trabajo que haces **tú** en la conversación. El subagente las recibe, pero no tiene ninguna tarea que hacer con ellas y vuelve sin resultado útil |

Ojo con el nombre: `context: fork` **no** copia la conversación actual en el subagente (eso es otra función distinta de Claude Code, «bifurcar la conversación»). Si la tarea necesita lo que ya habéis hablado, no uses `context: fork`.

**Variantes personales sin pisar al equipo.** Si quieres tu propia versión de una skill del proyecto, créala en `~/.claude/skills/` **con otro nombre** (por ejemplo, `review-mario` en lugar de `review`). Así no alteras lo que usan tus compañeros ni entras en conflictos de prioridad.

**Skill o `CLAUDE.md`.** La decisión central de esta sección:

| `CLAUDE.md` | Skill |
|---|---|
| Se carga **siempre** | Se carga **bajo demanda** |
| Estándares universales del proyecto («usa TypeScript estricto») | Procedimientos de una tarea («checklist de revisión de PR») |
| Restricciones y preferencias generales | Conocimiento que solo importa a veces y llenaría el contexto |

La regla práctica de los cursos: **si has escrito la misma instrucción de varios pasos dos veces, eso es una skill**. Y la primera que el curso recomienda crear es una de **verificación** (ejecutar tests, leer el *diff*, comprobar que no se han debilitado tests y dar evidencias).

Otras diferencias que menciona el curso: las skills añaden conocimiento a la conversación **actual**, mientras que los subagentes trabajan en un contexto **aparte**; y los subagentes **no heredan** las skills automáticamente (hay que listarlas en su campo `skills`).

### Qué busca el examen

- **Pregunta 4 de la guía**: un comando `/review` disponible para todo el equipo al clonar → **`.claude/commands/`** del repositorio. `~/.claude/commands/` es personal; `CLAUDE.md` no define comandos; `.claude/config.json` con un array de comandos no existe.
- Skill que genera mucha salida o explora alternativas → `context: fork`.
- Restringir lo que puede hacer una skill → `allowed-tools`.
- Parámetro que el usuario olvida al invocar la skill → `argument-hint` (la pista del autocompletado; el valor llega a la skill con `$ARGUMENTS`).
- Siempre aplicable → `CLAUDE.md`; específico de una tarea → skill.

### Fuentes

- Introduction to agent skills › [What are skills?](https://academy.claude.com/courses/introduction-to-agent-skills/what-are-skills)
- Introduction to agent skills › [Configuration and multi-file skills](https://academy.claude.com/courses/introduction-to-agent-skills/configuration-and-multi-file-skills)
- Introduction to agent skills › [Skills vs. other Claude Code features](https://academy.claude.com/courses/introduction-to-agent-skills/skills-vs-other-claude-code-features)
- Claude Code 101 › Organizing your work and knowledge › [Working with skills](https://academy.claude.com/courses/claude-101/working-with-skills)
- Claude Code in action › Configure Claude › [Verification skills](https://academy.claude.com/courses/claude-code-in-action/verification-skills)
- Docs: [Extend Claude with skills](https://code.claude.com/docs/en/skills) (*frontmatter* completo, [Pass arguments to skills](https://code.claude.com/docs/en/skills#pass-arguments-to-skills) y [Run skills in a subagent](https://code.claude.com/docs/en/skills#run-skills-in-a-subagent))

---

## 3.3 Reglas por ruta para cargar convenciones de forma condicional

### La idea en una frase

Un archivo de `.claude/rules/` con `paths:` en su *frontmatter* solo se carga cuando Claude trabaja con archivos que coinciden con esos patrones *glob*. Es la mejor opción para convenciones que dependen del **tipo** de archivo y no de la carpeta.

### Explicación

**La sintaxis:**

```markdown
---
paths:
  - "terraform/**/*"
---

# Convenciones de Terraform
- Cada módulo tiene su propio `variables.tf` y `outputs.tf`.
- Etiqueta todos los recursos con `owner` y `cost-center`.
```

La regla se carga cuando Claude lee, escribe o edita un archivo que coincide con algún patrón. Las reglas **sin** `paths` se cargan siempre.

**Patrones habituales:**

| Patrón | Coincide con |
|---|---|
| `**/*.ts` | Todos los archivos TypeScript, en cualquier carpeta |
| `src/**/*` | Todo lo que hay bajo `src/` |
| `**/*.test.tsx` | Todos los tests de React, estén donde estén |
| `src/**/*.{ts,tsx}` | Varias extensiones a la vez |

**Por qué existen: contexto y relevancia.** Cargar las convenciones de Terraform mientras editas un componente de React es ruido y gasta tokens. Con reglas por ruta, cada convención aparece solo cuando es relevante.

**Reglas por ruta frente a `CLAUDE.md` de subdirectorio.** Un `CLAUDE.md` de subdirectorio está **atado a una carpeta**. Si los archivos a los que aplica una convención están repartidos por todo el código (por ejemplo, `Button.test.tsx` junto a `Button.tsx` en cada carpeta), tendrías que duplicar el `CLAUDE.md` en decenas de sitios. Una sola regla con `paths: ["**/*.test.tsx"]` lo cubre todo.

| Usa... | Cuando... |
|---|---|
| `CLAUDE.md` de subdirectorio | La convención aplica a **una carpeta** concreta (p. ej. `packages/billing/`) |
| Regla con `paths` | La convención aplica a un **tipo de archivo** repartido por el código |

### Qué busca el examen

- **Pregunta 6 de la guía**: convenciones distintas por área y tests repartidos por todo el código → **`.claude/rules/` con *globs*** (`**/*.test.tsx`). Los distractores: todo en el `CLAUDE.md` raíz (Claude tiene que inferir qué sección aplica), skills (dependen de invocación o de que Claude decida cargarlas, no de la ruta) o un `CLAUDE.md` por subdirectorio (no cubre archivos dispersos).
- «Que se aplique automáticamente según el archivo» → regla con `paths`, no skill.

### Fuentes

- Los cursos no cubren esta funcionalidad; la fuente es la documentación oficial.
- Docs: [How Claude remembers your project › Path-specific rules](https://code.claude.com/docs/en/memory#path-specific-rules)

---

## 3.4 Plan mode frente a ejecución directa

### La idea en una frase

Usa **plan mode** cuando la tarea tiene implicaciones de arquitectura, varios enfoques válidos o cambios en muchos archivos: Claude explora en solo lectura y propone un plan antes de tocar nada. Usa **ejecución directa** para cambios pequeños con alcance claro.

### Explicación

**El flujo base del curso *Claude Code 101*:** explorar → planificar → programar → confirmar (*commit*). «Si solo te quedas con una idea de este curso, que sea este flujo». Sin él, la mayoría de la gente pide código directamente y acaba corrigiendo el rumbo más tarde.

**Qué es plan mode.** Un modo de permisos en el que Claude **solo puede leer**: investiga el código, puede buscar en la web y presenta un plan de acción. Se activa con `Shift + Tab`. Es el mejor momento para corregir el rumbo, «porque todavía no se ha escrito ningún código». El curso *Claude Code in action* añade: **lee el plan de verdad**; iterar sobre un plan es mucho más rápido que arreglar una implementación equivocada.

**Cuándo usar cada uno:**

| Plan mode | Ejecución directa |
|---|---|
| Reestructurar un monolito en microservicios | Arreglar un bug en un archivo con un *stack trace* claro |
| Migrar una librería que afecta a más de 45 archivos | Añadir una validación de fecha a una función |
| Elegir entre enfoques de integración con requisitos de infraestructura distintos | Cambios bien entendidos y de alcance acotado |
| Decisiones de arquitectura, varios enfoques válidos | Una sola forma razonable de hacerlo |

**Combinarlos.** No es una elección exclusiva: lo habitual es **planificar en plan mode y luego ejecutar** el plan aprobado. Al aprobar el plan, Claude pasa a implementarlo con el modo de permisos que elijas. Una ventaja que señala el curso: después de ejecutar, Claude conserva el contexto de cómo se llegó al plan.

**El subagente Explore.** Las fases de descubrimiento generan mucha salida (decenas de archivos leídos, búsquedas). El subagente integrado **Explore** hace esa exploración en su propio contexto y devuelve solo un resumen, de modo que la conversación principal no se llena. Es útil en tareas de varias fases para que el contexto no se agote antes de llegar a la implementación. (El subagente **Plan** es el que usa internamente el plan mode.)

**Consejos del curso para la fase de programación:** define criterios de éxito explícitos en el plan, dale a Claude herramientas para comprobar su trabajo y una suite de tests contra la que validar.

### Qué busca el examen

- **Pregunta 5 de la guía**: reestructurar un monolito en microservicios → **plan mode desde el principio**. Los distractores: empezar ejecutando y «dejar que la implementación revele los límites» (retrabajo caro), instrucciones exhaustivas sin explorar (asume que ya conoces la estructura) o cambiar a plan mode solo si surge complejidad (la complejidad ya está en el enunciado).
- Cambio de un solo archivo con causa clara → ejecución directa; plan mode sería sobreingeniería.
- Exploración que llena el contexto → subagente Explore.

### Fuentes


- Claude Code 101 › Daily workflows › [The explore → plan → code → commit workflow](https://academy.claude.com/courses/claude-code-101/the-explore-plan-code-commit-workflow)
- Claude Code in action › Steer the work › [Steering long sessions](https://academy.claude.com/courses/claude-code-in-action/steering-long-sessions) (Scope the work first with plan mode)
- Introduction to subagents › [What are subagents?](https://academy.claude.com/courses/introduction-to-subagents/what-are-subagents) (Built-in Subagents)
- Docs: [Permission modes › Plan mode](https://code.claude.com/docs/en/permission-modes) · [Best practices](https://code.claude.com/docs/en/best-practices)

---

## 3.5 Técnicas de refinamiento iterativo

### La idea en una frase

Cuando la descripción en prosa no basta, **muestra** lo que quieres: ejemplos concretos de entrada y salida, tests que fallan o una entrevista previa. Y agrupa en un solo mensaje los problemas que interactúan; corrige uno a uno los que son independientes.

### Explicación

Los cursos tocan estas ideas de pasada (sé específico, define criterios de éxito, usa una suite de tests); la mayor parte de esta sección viene de la guía de buenas prácticas de Claude Code y de la propia guía del examen.

**1. Ejemplos concretos de entrada y salida.** Si describes una transformación en prosa y Claude la interpreta de forma distinta cada vez, la forma más eficaz de comunicarla es dar **2 o 3 ejemplos** concretos:

```text
Convierte los nombres de las columnas así:
- "fecha_alta_cliente"  → "clientSignupDate"
- "ID_PEDIDO"           → "orderId"
- "importe total (€)"   → "totalAmountEur"
```

Los ejemplos eliminan la ambigüedad que la prosa deja abierta. Para casos límite, lo mismo: si un script de migración falla con valores nulos, dale el caso exacto («entrada: `{"email": null}` → salida esperada: la fila se omite y se registra un aviso»).

**2. Iteración guiada por tests (TDD).** Escribe primero una suite que cubra el comportamiento esperado, los casos límite y los requisitos de rendimiento; después pide la implementación e itera **compartiendo los fallos de los tests**. La guía de buenas prácticas lo explica así: Claude se detiene cuando el trabajo *parece* terminado; si tiene algo que devuelve «pasa / no pasa», puede cerrar el ciclo por sí mismo (cambiar, ejecutar, leer el fallo, corregir). Un ejemplo de prompt de esa guía: «escribe un test que falle y reproduzca el problema, y luego arréglalo».

**3. El patrón entrevista.** Antes de implementar algo en un dominio que no conoces bien, pide a Claude que **te entreviste** para sacar a la luz consideraciones que quizá no habías previsto (estrategias de invalidación de caché, modos de fallo, qué queda fuera del alcance):

```text
Quiero añadir rate limiting a la API pública, pero no lo he pensado a fondo.
Entrevístame hasta que puedas escribir la especificación y guárdala en SPEC.md.
```

Claude responde con preguntas sobre lo que no has decidido y sigue hasta tener una especificación completa. Después, se recomienda empezar una sesión nueva para implementar a partir de `SPEC.md`.

**4. ¿Todo en un mensaje o paso a paso?**

| Situación | Estrategia | Por qué |
|---|---|---|
| Los problemas **interactúan** (arreglar uno afecta a otro) | Un solo mensaje detallado con todos | Claude necesita verlos juntos para diseñar una solución coherente |
| Los problemas son **independientes** | Iterar de uno en uno | Cada corrección es más enfocada y fácil de verificar |

**5. Corregir el rumbo pronto.** De la guía de buenas prácticas: vigila el primer minuto, pulsa `Esc` en cuanto Claude se desvíe y, si después de dos correcciones sigue mal, usa `/clear` y escribe un prompt mejor en lugar de una tercera corrección. El curso *Claude Code in action* añade `/rewind` (`Esc` dos veces) para volver a un punto de control, y `/compact <instrucciones>` para dirigir qué se conserva al resumir.

### Qué busca el examen

- Descripciones en prosa interpretadas de forma inconsistente → **2–3 ejemplos concretos de entrada/salida**.
- Mejorar progresivamente una implementación → **tests primero** y compartir los fallos.
- Dominio desconocido con decisiones de diseño → **patrón entrevista** antes de implementar.
- Problemas que interactúan → **un único mensaje**; independientes → **secuencial**.

### Fuentes

- Claude Code 101 › Daily workflows › [The explore → plan → code → commit workflow](https://academy.claude.com/courses/claude-code-101/the-explore-plan-code-commit-workflow) (Code: criterios de éxito, suite de pruebas)
- Claude Code in action › Steer the work › [Steering long sessions](https://academy.claude.com/courses/claude-code-in-action/steering-long-sessions) (Steer while Claude works: `/compact`, `/rewind`)
- Building with the Claude API › Prompt engineering techniques › [Being specific](https://academy.claude.com/courses/building-with-the-claude-api/being-specific)
- Docs: [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) (secciones *Write a specific prompt*, *Brainstorm with Claude first*, *Give Claude a check to run* y *Steer the session*)

---

## 3.6 Integrar Claude Code en pipelines de CI/CD

### La idea en una frase

En CI, Claude Code se ejecuta con **`-p`** (no interactivo), devuelve resultados estructurados con **`--output-format json` + `--json-schema`**, toma el contexto del proyecto del **`CLAUDE.md`** y revisa el código desde una **instancia independiente** de la que lo generó.

### Explicación

**`-p` (`--print`): modo no interactivo.** Ejecuta Claude Code como un comando de una sola vez: lee de la entrada estándar, escribe en la salida estándar y termina. Sin `-p`, Claude Code abre la interfaz interactiva y el *job* de CI **se queda colgado** esperando una entrada que nunca llegará.

```bash
gh pr diff "$PR" | claude -p "Revisa este diff en busca de problemas de seguridad"
```

**Salida estructurada para máquinas.** `--output-format json` devuelve un JSON con el resultado, el `session_id`, el uso y el coste. Si además pasas `--json-schema`, Claude ajusta la respuesta al esquema y el objeto aparece en el campo `structured_output`:

```bash
claude -p "Revisa los cambios y lista los problemas encontrados" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"findings":{"type":"array","items":{
      "type":"object","properties":{"file":{"type":"string"},"line":{"type":"integer"},
      "severity":{"type":"string"},"message":{"type":"string"}},
      "required":["file","line","severity","message"]}}},"required":["findings"]}' \
  | jq '.structured_output.findings'
```

Con eso, un script puede publicar cada hallazgo como **comentario en línea** del PR. Conviene comprobar que `structured_output` existe antes de usarlo (falta si la ejecución no produjo una salida válida).

**`CLAUDE.md` como contexto del proyecto en CI.** Lo que Claude necesita saber para revisar o generar tests (estándares de testing, qué se considera un test valioso, *fixtures* disponibles, criterios de revisión) va en el `CLAUDE.md` del proyecto, que `claude -p` carga igual que una sesión interactiva. Documentarlo ahí mejora la calidad de los tests generados y reduce los de poco valor.

> **Ojo con un matiz de los apuntes del curso.** El modo que **omite** el descubrimiento automático de `CLAUDE.md`, hooks, skills, plugins y servidores MCP es `--bare`, no `-p`. Según la documentación, `--bare` existe para arrancar más rápido y obtener el mismo resultado en cualquier máquina (no carga la configuración local de nadie); en ese modo, el contexto se pasa explícitamente con flags como `--append-system-prompt` o `--settings`. Un `claude -p` normal sí carga el `CLAUDE.md` del proyecto.

**Aislamiento del contexto: quien genera no debe revisar.** El curso *Claude Code 101* lo dice claramente: «la misma sesión que escribió los cambios y los explicó no es el mejor juez para evaluar la calidad de esos cambios». Arrastra el razonamiento que la llevó a esa solución y tiende a justificarla. Una instancia independiente (una sesión nueva o un subagente) revisa el código como si lo hubiera escrito otro. El curso *Claude Code in action* lo resume: «un segundo revisor con ojos nuevos encuentra aquello que el autor consiguió justificar para sí mismo».

**Evitar ruido en revisiones repetidas.** Cuando llegan nuevos *commits* y vuelves a ejecutar la revisión, incluye en el contexto **los hallazgos de la revisión anterior** y pide a Claude que informe **solo de los problemas nuevos o aún sin resolver**. Si no, el PR se llena de comentarios duplicados.

**Generación de tests sin duplicados.** Pasa los **archivos de tests existentes** en el contexto para que Claude no proponga escenarios que la suite ya cubre.

**Las piezas de CI que enseña el curso *Claude Code in action*:**

| Opción | Qué es | Cuándo |
|---|---|---|
| **Code Review** (gestionado) | Servicio de Anthropic que revisa PRs y publica hallazgos como comentarios en línea, deduplicados y priorizados. No aprueba ni bloquea | Revisiones de PR sin montar nada |
| **GitHub Action** `anthropics/claude-code-action@v1` | Ejecuta Claude Code en tu *workflow*, con `prompt`, `trigger_phrase` (`@claude`) y `claude_args` | Cuando Claude debe **hacer** algo en CI (implementar, informes programados) |
| **Headless** (`claude -p`) | Claude dentro de tus scripts y *pipes* | Pasos de tu propio pipeline |
| **Agent SDK** | Claude Code como biblioteca de Python o TypeScript | Integrarlo en tu producto |

En `claude_args` se ajusta la ejecución desatendida: `--max-turns` para acotar el bucle, el modo de permisos (que no se pare a pedir confirmación porque nadie va a responder) y las herramientas permitidas (solo lectura para un informe). Para ejecuciones desatendidas, el curso recomienda además convertir los tests en una **barrera**: un hook `Stop` que ejecuta los tests y no deja terminar el turno si fallan (código de salida 2).

### Qué busca el examen

- **Pregunta 10 de la guía (escenario CI)**: un *job* que ejecuta `claude "..."` se queda colgado → falta **`-p`**.
- Hallazgos que se publican como comentarios en línea → `--output-format json` + `--json-schema`.
- Tests de poco valor o que repiten casos → documentar estándares y *fixtures* en `CLAUDE.md` y pasar los tests existentes.
- Comentarios duplicados tras nuevos *commits* → incluir los hallazgos previos y pedir solo los nuevos o no resueltos.
- Revisión poco crítica → **instancia independiente**, no la sesión que generó el código.

### Fuentes

- Claude Code in action › Automate repeat work › [Scheduled tasks and headlesss](https://academy.claude.com/courses/claude-code-in-action/routines-and-headless) (`-p`, salida estructurada, sesiones)
- Claude Code in action › Automate repeat work › [GitHub Actions and Code Review](https://academy.claude.com/courses/claude-code-in-action/github-actions-and-code-review)
- Claude Code in action › Verify and share › [SteerTrust it: Verifying unsupervised runs](https://academy.claude.com/courses/claude-code-in-action/trust-it-verifying-unsupervised-runs)
- Claude Code 101 › Daily workflows › [Code Review](https://academy.claude.com/courses/claude-code-101/code-review)
- Docs: [Run Claude Code programmatically](https://code.claude.com/docs/en/headless) (`-p`, `--bare`, `--output-format`, `--json-schema`) · [GitHub Actions](https://code.claude.com/docs/en/github-actions)

---

## Chuleta de decisiones

| Si el enunciado dice... | Piensa en... |
|---|---|
| Un compañero no recibe las instrucciones | Están en `~/.claude/CLAUDE.md` (usuario); muévelas al de proyecto |
| Preferencias personales que no deben afectar al equipo | `~/.claude/CLAUDE.md` o `CLAUDE.local.md` |
| `CLAUDE.md` enorme y difícil de mantener | `.claude/rules/` por temas o `@import` (que organiza, no ahorra contexto) |
| Comportamiento inconsistente entre sesiones | `/memory` (y `/context`) para ver qué memoria se carga |
| Comando para todo el equipo | `.claude/commands/` (o `.claude/skills/`) en el repositorio |
| Skill con mucha salida o exploratoria | `context: fork` |
| Limitar lo que puede hacer una skill | `allowed-tools` |
| Parámetro obligatorio de una skill | `argument-hint` |
| Siempre aplicable / solo en una tarea | `CLAUDE.md` / skill |
| Convención para un tipo de archivo repartido por el código | Regla en `.claude/rules/` con `paths` *glob* |
| Convención de una carpeta concreta | `CLAUDE.md` de subdirectorio |
| Arquitectura, muchos archivos, varios enfoques | Plan mode (y luego ejecución) |
| Cambio pequeño con causa clara | Ejecución directa |
| Exploración que llena el contexto | Subagente Explore |
| Prosa interpretada de forma inconsistente | 2–3 ejemplos de entrada/salida |
| Dominio desconocido | Patrón entrevista |
| Problemas que interactúan / independientes | Un solo mensaje / de uno en uno |
| CI colgado | `-p` |
| Hallazgos parseables para comentarios en línea | `--output-format json` + `--json-schema` |
| Revisión del código recién generado | Instancia independiente |
| Comentarios duplicados al re-revisar | Pasar hallazgos previos; informar solo de nuevos |
| Regla que nunca debe saltarse | Hook, no `CLAUDE.md` |

## Preguntas de autoevaluación

1. Tu equipo quiere que todos los tests (`*.spec.ts`, repartidos por 30 carpetas) sigan las mismas convenciones. ¿Dónde las pones?
2. Has puesto «nunca hagas push a `main`» en el `CLAUDE.md` y un día Claude lo hace. ¿Qué cambias?
3. Una skill de análisis de dependencias vuelca cientos de líneas en la conversación y luego Claude pierde el hilo de la tarea. ¿Qué campo de *frontmatter* añades?
4. Tienes que migrar de una librería de fechas a otra en 60 archivos. ¿Cómo lo abordas?
5. Le has explicado dos veces a Claude cómo normalizar nombres de columnas y lo hace distinto cada vez. ¿Qué haces?
6. Tu pipeline de CI publica comentarios de revisión en cada *push* y el PR acumula los mismos comentarios repetidos. ¿Cómo lo arreglas?
7. Generas código con Claude en una sesión larga y le pides en esa misma sesión que lo revise. Las revisiones son complacientes. ¿Por qué y qué haces?

<details>
<summary>Soluciones</summary>

1. En un archivo de `.claude/rules/` con `paths: ["**/*.spec.ts"]`. Un `CLAUDE.md` por carpeta no escala y el `CLAUDE.md` raíz cargaría esas reglas siempre.
2. Lo conviertes en un hook `PreToolUse` que bloquee el comando. `CLAUDE.md` es una guía, no una garantía.
3. `context: fork`, para que la skill se ejecute en un subagente aislado y solo vuelva el resumen.
4. Plan mode para explorar y diseñar la migración (con Explore para las fases de descubrimiento) y, una vez aprobado el plan, ejecución directa.
5. Dar 2–3 ejemplos concretos de entrada y salida. Si es algo recurrente, guardarlo en `CLAUDE.md` o en una skill.
6. Incluir en el contexto los hallazgos de la revisión anterior y pedir que informe solo de los problemas nuevos o aún sin resolver.
7. La sesión que generó el código arrastra el razonamiento que lo justifica. Revisa desde una instancia independiente: una sesión nueva o un subagente revisor.

</details>
