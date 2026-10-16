# PROGRESS.md — Estado do projeto Integral Visualizer (IV)

> A IA atualiza este arquivo ao FINAL de toda sessão. É a memória de curto prazo do projeto.
> Regra: escreva o que aconteceu de verdade (com resultados reais de testes), não o que se pretendia.

## Resumo atual

- **Fase atual:** 0 — Preparação
- **Tarefa atual:** F0-T1 — scaffolding, lint, formatação e CI (em andamento)
- **Última sessão:** 2026-10-15
- **Estado dos testes:** não executados nesta sessão (a suíte ainda não foi criada)
- **Estado do build/tipos:** não executados; `pnpm peers check` confirmou que não há peer dependencies pendentes; lint, tipos, build e CI ainda não foram rodados
- **Último commit:** —

## Painel de fases

| Fase | Nome                              | Status          | Portão de revisão matemática |
| ---- | --------------------------------- | --------------- | ---------------------------- |
| 0    | Preparação                        | 🟨 em andamento | ⬜ pendente                  |
| 1    | Fundação e superfícies            | ⬜              | ⬜                           |
| 2    | Integral dupla retangular         | ⬜              | ⬜                           |
| 3    | Regiões gerais e polar (**MVP**)  | ⬜              | ⬜                           |
| 4    | Cálculo diferencial multivariável | ⬜              | ⬜                           |
| 5    | Integral tripla                   | ⬜              | ⬜                           |
| 6    | Equações diferenciais             | ⬜              | ⬜                           |
| 7    | Plataforma e polimento            | ⬜              | ⬜                           |
| 8    | Desempenho e WASM                 | ⬜              | ⬜                           |
| 9    | Extras                            | ⬜              | —                            |

Legenda: ⬜ não iniciada · 🟨 em andamento · ✅ concluída · ❌ reprovada na revisão

## Tarefas da fase atual

| ID    | Tarefa                                                     | Status | Evidência (testes/capturas)                                                                                                                      |
| ----- | ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| F0-T1 | Scaffolding, lint, formatação, CI                          | 🟨     | Base de Vite/React/TS, configurações do VS Code, ESLint, Prettier e CI adicionadas; dependências instaladas; falta confirmar lint/tipos/build/CI |
| F0-T2 | ADRs: stack, convenções matemáticas, formato do estado     | ⬜     |                                                                                                                                                  |
| F0-T3 | Protótipo "hello surface" (z = sin(x)·cos(y), Z para cima) | ⬜     |                                                                                                                                                  |

## Casos de teste de referência (Seção 14.2 do plano)

Marque conforme forem implementados **e passando**.

| ID  | Descrição                                            | Implementado | Passando |
| --- | ---------------------------------------------------- | ------------ | -------- |
| A1  | ∬ xy dA em [0,1]² = 1/4                              | ⬜           | ⬜       |
| A2  | ∬ (x²+y²) dA em [0,1]² = 2/3                         | ⬜           | ⬜       |
| A3  | ∬ sen x sen y em [0,π]² = 4                          | ⬜           | ⬜       |
| A4  | ∬ (x²+y²) no disco unitário = π/2                    | ⬜           | ⬜       |
| A5  | ∬ x dA no triângulo 0≤y≤x≤1 = 1/3                    | ⬜           | ⬜       |
| A6  | ∬ (x+y) entre y=x² e y=√x = 3/10                     | ⬜           | ⬜       |
| A7  | Volume sob z=1−x²−y² no disco unitário = π/2         | ⬜           | ⬜       |
| A8  | ∬ e^(−(x²+y²)) no disco de raio 2 = π(1−e⁻⁴)         | ⬜           | ⬜       |
| A9  | ∬ x dA no disco unitário = 0                         | ⬜           | ⬜       |
| T1  | ∭ xyz em [0,1]³ = 1/8                                | ⬜           | ⬜       |
| T2  | Volume da esfera unitária = 4π/3                     | ⬜           | ⬜       |
| T3  | Volume do cone (z de r a 1) = π/3                    | ⬜           | ⬜       |
| T4  | ∭ z no hemisfério superior = π/4                     | ⬜           | ⬜       |
| T5  | ∭ (x²+y²) na esfera unitária = 8π/15                 | ⬜           | ⬜       |
| T6  | Volume do toro (R=2, r=1) = 4π²                      | ⬜           | ⬜       |
| T7  | Volume de Steinmetz (raio 1) = 16/3                  | ⬜           | ⬜       |
| D1  | ∇(x²+y²) em (1,2) = (2,4)                            | ⬜           | ⬜       |
| D2  | D_u f com u=(3/5,4/5) = 4,4                          | ⬜           | ⬜       |
| D3  | Pontos críticos de x³−3x+y²: (1,0) mín., (−1,0) sela | ⬜           | ⬜       |
| D4  | Plano tangente de x²+y² em (1,1): z=2x+2y−2          | ⬜           | ⬜       |
| E1  | y'=y, y(0)=1 → y(1)=e                                | ⬜           | ⬜       |
| E2  | y''+y=0 → cos t                                      | ⬜           | ⬜       |
| E3  | Logístico y'=y(1−y), y(0)=0,1                        | ⬜           | ⬜       |
| E4  | x'=y, y'=−x → centro, autovalores ±i                 | ⬜           | ⬜       |
| E5  | Equilíbrios de Lorenz (0,0,0) e (±√72, ±√72, 27)     | ⬜           | ⬜       |
| E6  | Sensibilidade às condições iniciais (Lorenz)         | ⬜           | ⬜       |

## Pendências de revisão matemática `[REVISAR-MATEMATICA]`

| #   | Data       | Dúvida / escolha                                                                                                                                                                                                      | Contexto (fórmula, arquivo)                                                       | Resposta do revisor |
| --- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------- |
| 1   | 2026-10-15 | O método de estimar mínimo/máximo de cada célula amostrando 5×5 pontos não garante somas inferior/superior verdadeiras. Definir no app se serão chamadas de estimativas amostradas ou se haverá limites certificados. | Plano, seção 10.3; guia de revisão, seção 4 afirma `inferior ≤ exato ≤ superior`. | Pendente            |

## Ambiguidades e riscos encontrados na leitura inicial

- **Segurança do parser:** a seção 9 do plano propõe compilar com `new Function` após validar a AST; a seção 17 manda nunca usar `eval`/`new Function`, e `CLAUDE.md` proíbe texto não validado. Resolver a política no ADR de stack/segurança antes do parser (F1-T2). A amostra de codegen também consulta mapas comuns com `in`, que pode aceitar nomes herdados; usar mapas sem protótipo ou checagem de propriedade própria.
- **Escopo da Fase 2:** a tarefa F2-T2 pede A1–A3 e descreve integral retangular; a tabela de roadmap inclui A1–A4, mas A4 é integral polar e aparece de novo na Fase 3. Confirmar a fase de A4 ao detalhar tarefas.
- **Rótulos “inferior/superior”:** a amostragem proposta não certifica o ínfimo/supremo da função em cada célula, portanto o critério de revisão atual é mais forte que o método descrito.
- **Compatibilidade de ferramentas:** TypeScript 7.0.2 não atendia ao peer range do `typescript-eslint` 8.71.2. A base usa TypeScript 5.9.3, dentro do peer range publicado.

## Decisões tomadas (ADR resumido)

| Data | Decisão | Motivo | Aprovada por |
| ---- | ------- | ------ | ------------ |
|      |         |        |              |

## Dependências adicionadas

| Pacote                                        | Versão                    | Motivo                                                        | Licença    |
| --------------------------------------------- | ------------------------- | ------------------------------------------------------------- | ---------- |
| React / React DOM                             | 19.3.1                    | Interface da aplicação                                        | MIT        |
| Vite / plugin React                           | 8.3.4 / 6.1.2             | Servidor, build e integração React                            | MIT        |
| TypeScript                                    | 5.9.3                     | Tipagem estrita; compatibilidade com typescript-eslint 8.71.2 | Apache-2.0 |
| ESLint / @eslint/js                           | 10.12.0 / 10.0.1          | Análise estática                                              | MIT        |
| typescript-eslint                             | 8.71.2                    | Regras e parser TypeScript para ESLint                        | MIT        |
| eslint-plugin-react-hooks / globals           | 7.1.1 / 16.5.0            | Regras React e globais do navegador no lint                   | MIT        |
| Prettier                                      | 3.9.10                    | Formatação uniforme                                           | MIT        |
| Vitest / jsdom                                | 5.0.4 / 27.4.0            | Base de testes unitários e DOM simulado                       | MIT        |
| Husky / lint-staged                           | 9.1.7 / 16.4.0            | Verificações locais em arquivos staged                        | MIT        |
| @types/react / @types/react-dom / @types/node | 19.3.0 / 19.3.0 / 24.19.2 | Tipos das dependências e configs                              | MIT        |

## Problemas conhecidos / dívida técnica

- (nenhum ainda)

## Ideias para o backlog (não implementar agora)

- (nenhuma ainda)

## Log de sessões

> Formato: data · tarefa · o que foi feito · resultado real dos testes · o que falta · próximo passo.

### Sessão 0 (modelo)

- **Data:** 2026-10-15
- **Tarefa:** Início da Fase 0; preparação da F0-T1
- **Feito:** leitura integral do plano de 49 páginas e dos quatro documentos do ZIP; criação da estrutura inicial para Vite, React, TypeScript, VS Code, lint/formatação, Vitest e CI; cópia dos documentos de referência para o repositório; instalação de dependências e geração do lockfile.
- **Testes:** não executados (a suíte ainda não foi criada).
- **Não verificado:** lint, tipos, testes, build, CI e cena 3D. O peer check foi repetido após a resolução e não apontou incompatibilidades.
- **Próximo passo:** fazer as verificações da F0-T1 quando solicitadas; depois iniciar F0-T2, um ADR por decisão, conforme o plano.
