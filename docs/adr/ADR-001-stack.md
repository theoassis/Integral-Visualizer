# ADR-001: Stack da aplicação

- **Status:** aceita conforme o plano do projeto; detalhes de segurança registrados aqui.
- **Data:** 2026-10-16
- **Contexto:** o IV precisa de interface web, visualização 3D, avaliação de expressões matemáticas, cálculos fora da thread da interface e testes reprodutíveis.

## Decisão

- **Aplicação:** React com TypeScript strict, construída com Vite.
- **Visualização 3D:** Three.js usado diretamente; o eixo Z é definido como vertical. A interface 3D não será acoplada ao núcleo matemático.
- **Estado de interface:** Zustand para estado mutável de sessão; o documento persistente segue o formato serializável definido no ADR-003.
- **Expressões:** math.js será usado para tokenização/AST, com um interpretador próprio que aceita somente os nós, variáveis, constantes e funções explicitamente permitidos. Não executar texto de usuário com `eval`, `new Function` ou compilação dinâmica. Consultas à lista de funções não podem aceitar propriedades herdadas.
- **Cálculo em segundo plano:** Web Workers com Comlink para tarefas que possam bloquear a interface; cada tarefa recebe identificador para permitir descarte/cancelamento de resultados obsoletos.
- **Entrada matemática e notação:** MathLive para edição de fórmulas e KaTeX para exibição renderizada.
- **Qualidade:** Vitest para testes unitários, fast-check para propriedades e Playwright para fluxos de navegador. TypeScript strict, ESLint e Prettier fazem parte do fluxo de qualidade.
- **Estilo:** CSS/Tailwind conforme as necessidades da interface; a base atual pode permanecer em CSS simples até a tarefa de interface correspondente.

## Consequências

- A camada `src/core/` permanece pura e não importa React, Zustand, DOM ou Three.js.
- A AST é validada e interpretada com uma lista branca explícita; exemplos de codegen do plano não são autoridade para uso de `new Function`.
- A adoção efetiva de cada biblioteca ocorre na tarefa que precisar dela; este ADR não afirma que dependências futuras já estão instaladas.
- Tarefas de Worker recebem dados serializáveis, não objetos de cena ou estado global.

## Referências

`CLAUDE.md` (seções 5 e 7), `docs/plano_integral_visualizer.pdf` (arquitetura e segurança) e `PROMPTS_FASES.md` (F0-T2 e F1-T2).
