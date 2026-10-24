# PROGRESS.md — Estado do projeto Integral Visualizer (IV)

> A IA atualiza este arquivo ao FINAL de toda sessão. É a memória de curto prazo do projeto.
> Regra: escreva o que aconteceu de verdade (com resultados reais de testes), não o que se pretendia.

## Resumo atual

- **Fase atual:** 2 — Integral dupla retangular
- **Tarefa atual:** F2-T5 concluída; Fase 2 aguarda o portão de revisão matemática do usuário.
- **Última sessão:** 2026-10-24 — convergência, sólido assinado, presets e cobertura do caso A4.
- **Estado dos testes:** `pnpm exec vitest run` — 131 testes passando (15 arquivos, 0 falhas).
- **Estado do build/tipos:** `pnpm tsc --noEmit`, TypeScript da aplicação com `--ignoreDeprecations 5.0`, TypeScript da configuração Node, lint e formatação passaram. `pnpm build` continua bloqueado por `TS5103` (`ignoreDeprecations: "6.0"` em `tsconfig.app.json`); `pnpm exec vite build` passou com aviso do chunk grande (1.531,98 kB; Worker 683,00 kB). A inspeção visual no navegador não foi possível porque o uso local de browser está desativado nas configurações de Work.
- **Último commit:** `feat: add Riemann convergence and volume view` (F2-T5).

## Painel de fases

| Fase | Nome                              | Status              | Portão de revisão matemática                          |
| ---- | --------------------------------- | ------------------- | ----------------------------------------------------- |
| 0    | Preparação                        | ✅ concluída        | ✅ aprovado pelo usuário ao solicitar a Fase 1        |
| 1    | Fundação e superfícies            | ✅ concluída        | ✅ aprovada explicitamente pelo usuário em 2026-10-23 |
| 2    | Integral dupla retangular         | 🟨 revisão pendente | 🟨 aguardando aprovação do relatório matemático       |
| 3    | Regiões gerais e polar (**MVP**)  | ⬜                  | ⬜                                                    |
| 4    | Cálculo diferencial multivariável | ⬜                  | ⬜                                                    |
| 5    | Integral tripla                   | ⬜                  | ⬜                                                    |
| 6    | Equações diferenciais             | ⬜                  | ⬜                                                    |
| 7    | Plataforma e polimento            | ⬜                  | ⬜                                                    |
| 8    | Desempenho e WASM                 | ⬜                  | ⬜                                                    |
| 9    | Extras                            | ⬜                  | —                                                     |

Legenda: ⬜ não iniciada · 🟨 em andamento · ✅ concluída · ❌ reprovada na revisão

## Tarefas da fase atual

| ID    | Tarefa                                                     | Status | Evidência (testes/capturas)                                                                                                                                                                            |
| ----- | ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F0-T1 | Scaffolding, lint, formatação, CI                          | ✅     | Verificações de lint, tipos e build reportadas pelo usuário; CI informado como verde.                                                                                                                  |
| F0-T2 | ADRs: stack, convenções matemáticas, formato do estado     | ✅     | ADR-001, ADR-002 e ADR-003 criados em `docs/adr/`.                                                                                                                                                     |
| F0-T3 | Protótipo "hello surface" (z = sin(x)·cos(y), Z para cima) | ✅     | Revisão aprovada pelo usuário ao solicitar explicitamente o avanço para a Fase 1; 8 testes matemáticos passam.                                                                                         |
| F1-T1 | Layout em três colunas, cena 3D, eixos e marcações         | ✅     | Painéis de controle, cena e análise; ticks em π/2 para x/y e escala numérica para z; verificação responsiva sem overflow horizontal.                                                                   |
| F1-T2 | Parser seguro de expressões                                | ✅     | Commit `3b63752`; lista branca, aliases, rejeição de nós perigosos e testes. A sessão atual corrige a notação escolar concatenada `senxtany`.                                                          |
| F1-T3 | Campo de fórmula e superfície                              | ✅     | Commit `68a0c7f` + adendo da sessão 8; parser tolera `senxtany`, domínio configurável, teclado científico, buracos e explicação de montagem da malha.                                                  |
| F1-T4 | Cálculo em Web Worker                                      | ✅     | Worker com Comlink avalia domínio/faixa e monta malha; buffers transferíveis, debounce, cancelamento por id e 3 testes dedicados.                                                                      |
| F1-T5 | Parâmetros livres e sliders                                | ✅     | Cada parâmetro livre tem slider e animação individual com velocidade; testes cobrem continuidade, faixa, ciclo, validação e passo do slider.                                                           |
| F1-T6 | Mapas de cores, normais analíticas e picking               | ✅     | Paletas Atlas/Viridis/Térmico; gradientes simbólicos para normais e inspeção persistente por clique em (x,y,f).                                                                                        |
| F2-T1 | Nós e pesos de Gauss–Legendre                              | ✅     | Regras simétricas crescentes em [−1,1], testes de momentos até grau 2n−1, ordem alta 256 e validação de entrada.                                                                                       |
| F2-T2 | Integral dupla iterada em retângulos                       | ✅     | Produto tensorial de Gauss–Legendre com limites e orientação configuráveis; A1–A3 verificados contra os valores exatos.                                                                                |
| F2-T3 | Regras de soma de Riemann retangulares                     | ✅     | Regras esquerda/direita/médio/inferior/superior/aleatória; refinamento n→2n com estimativa; convergência de ordem 1 e 2 testada.                                                                       |
| F2-T4 | Visualização de prismas e painel de resultados             | ✅     | `InstancedMesh`, controles de 2–200 em x/y, inspeção da amostra/contribuição por hover; resultados e referência numérica Gauss–Legendre 64×64. 118 testes passam; WebGL não inspecionado nesta sessão. |
| F2-T5 | Convergência, sólido e exemplos                            | ✅     | Gráfico log-log e inclinação estimada; sólido assinado da malha; quatro presets; A4 no disco unitário via coordenadas polares; documentação e roteiro em `docs/f2-t5-riemann.md`.                      |

## Casos de teste de referência (Seção 14.2 do plano)

Marque conforme forem implementados **e passando**.

| ID  | Descrição                                            | Implementado | Passando |
| --- | ---------------------------------------------------- | ------------ | -------- |
| A1  | ∬ xy dA em [0,1]² = 1/4                              | ✅           | ✅       |
| A2  | ∬ (x²+y²) dA em [0,1]² = 2/3                         | ✅           | ✅       |
| A3  | ∬ sen x sen y em [0,π]² = 4                          | ✅           | ✅       |
| A4  | ∬ (x²+y²) no disco unitário = π/2                    | ✅           | ✅       |
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

| #   | Data       | Dúvida / escolha                                                                                                                                                                                                                                                                                                        | Contexto (fórmula, arquivo)                         | Resposta do revisor                                             |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| 1   | 2026-10-15 | Mínimos e máximos observados em uma grade finita não certificam somas inferior/superior nem garantem que cerquem a integral exata. Até existir um método certificado, rotular como estimativas amostradas e explicar essa limitação; só afirmar `inferior ≤ exato ≤ superior` quando a implementação provar os limites. | Plano, seção 10.3; tarefas F2-T3 e guia de revisão. | Decisão segura registrada; aguarda revisão do usuário na Fase 2 |

## Ambiguidades e riscos encontrados na leitura inicial

- **Segurança do parser:** a divergência entre as seções 9 e 17 do plano foi resolvida no ADR-001 em favor de interpretar uma AST com lista branca, sem `eval`/`new Function`; F1-T2 cobre a validação de nós e propriedades herdadas.
- **Escopo da Fase 2:** A4 é validado no núcleo por `integral2DiskPolar` com Jacobiano `r`; editor de regiões, geometria polar e UI seguem na Fase 3.
- **Rótulos “inferior/superior”:** mantê-los como estimativas amostradas sem garantia até que intervalos certificados sejam implementados; atualizar o critério em `PROMPTS_FASES.md` e `REVISAO_MATEMATICA.md`.
- **Compatibilidade de ferramentas:** TypeScript 7.0.2 não atendia ao peer range do `typescript-eslint` 8.71.2. A base usa TypeScript 5.9.3, dentro do peer range publicado.
- **Arquivos do roteiro:** `CLAUDE.md` e `REVISAO_MATEMATICA.md` citam `docs/PROMPTS_FASES.md`, mas esse arquivo não existe no checkout atual; o plano oficial em PDF foi usado para definir F2-T1.
- **Alteração local preservada:** `tsconfig.app.json` já estava modificado antes desta sessão (`ignoreDeprecations: "6.0"`); foi mantido fora desta tarefa.

## Decisões tomadas (ADR resumido)

| Data       | Decisão                                                        | Motivo                                                                                 | Aprovada por     |
| ---------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------- |
| 2026-10-16 | Stack, convenções matemáticas e estado serializável versionado | Registradas nos ADRs; política do parser alinhada à lista branca sem execução dinâmica | Plano do projeto |

## Dependências adicionadas

| Pacote                                        | Versão              | Motivo                                         | Licença    |
| --------------------------------------------- | ------------------- | ---------------------------------------------- | ---------- |
| Three.js                                      | 0.186.1             | Malha e renderização 3D para o protótipo F0-T3 | MIT        |
| @types/three                                  | 0.185.4             | Tipos TypeScript para Three.js                 | MIT        |
| React / React DOM                             | 19.3.1              | Interface da aplicação                         | MIT        |
| Vite / plugin React                           | 8.3.4 / 6.1.2       | Servidor, build e integração React             | MIT        |
| TypeScript                                    | 5.9.3               | Tipagem estrita                                | Apache-2.0 |
| ESLint / @eslint/js                           | 10.12.0 / 10.0.1    | Análise estática                               | MIT        |
| typescript-eslint                             | 8.71.2              | Regras e parser TypeScript para ESLint         | MIT        |
| eslint-plugin-react-hooks / globals           | 7.1.1 / 16.5.0      | Regras React e globais do navegador            | MIT        |
| Prettier                                      | 3.9.10              | Formatação uniforme                            | MIT        |
| Vitest / jsdom                                | 5.0.4 / 27.4.0      | Base de testes unitários e DOM simulado        | MIT        |
| Husky / lint-staged                           | 9.1.7 / 16.4.0      | Verificações locais em arquivos staged         | MIT        |
| @types/react / @types/react-dom / @types/node | versões no lockfile | Tipos das dependências e configs               | MIT        |

## Problemas conhecidos / dívida técnica

- O build mais recente gera um chunk inicial de 1.511,40 kB minificado (412,78 kB gzip), além do Worker de 676,71 kB. Medir e dividir no trabalho de desempenho, sem antecipar otimizações à F1-T3.

## Ideias para o backlog (não implementar agora)

- Editor científico: ampliar o teclado virtual para a lista branca e permitir limites de domínio editáveis na F1; preservar entrada explícita e segurança do parser. O teclado atual cria somente expressões escalares `z=f(x,y)`; operadores de derivada e integral só devem aparecer como ferramentas funcionais quando os módulos correspondentes estiverem prontos.
- Resolução passo a passo para qualquer expressão: avançar por etapas verificáveis — derivadas e Hessiana na Fase 4; integrais duplas nas Fases 2–3; triplas na Fase 5; EDOs na Fase 6; integrais de linha/superfície e teoremas na Fase 9. Um tutor neural futuro pode explicar resultados, mas cada transformação e valor deve ser calculado/validado por algoritmos determinísticos ou CAS. Não usar texto gerado por rede como prova matemática.

## Log de sessões

> Formato: data · tarefa · o que foi feito · resultado real dos testes · o que falta · próximo passo.

### Sessão 0 (modelo)

- **Data:** 2026-10-15
- **Tarefa:** Início da Fase 0; preparação da F0-T1
- **Feito:** leitura integral do plano de 49 páginas e dos quatro documentos do ZIP; criação da estrutura inicial para Vite, React, TypeScript, VS Code, lint/formatação, Vitest e CI; cópia dos documentos de referência para o repositório; instalação de dependências e geração do lockfile.
- **Testes:** não executados (a suíte ainda não foi criada).
- **Não verificado:** lint, tipos, testes, build, CI e cena 3D. O peer check foi repetido após a resolução e não apontou incompatibilidades.
- **Próximo passo:** terminar as verificações da F0-T1; depois iniciar F0-T2.

### Sessão 1

- **Data:** 2026-10-16
- **Tarefa:** F0-T2 — ADRs de stack, convenções matemáticas e formato do estado.
- **Feito:** criados os três ADRs; a política segura para interpretar expressões foi registrada; atualizadas a matriz de tarefas e as decisões.
- **Verificações:** não executei testes nesta sessão. Lint, tipos e build foram reportados pelo usuário como concluídos sem erros; CI foi indicado como verde pelo usuário.
- **Não verificado nesta sessão:** não reexecutei os comandos de qualidade nem abri a execução do CI.
- **Próximo passo:** F0-T3, protótipo descartável `z = sin(x)·cos(y)` com câmera Z-up; parar para revisão do usuário antes de avançar.

### Sessão 2

- **Data:** 2026-10-16
- **Tarefa:** F0-T3 — protótipo descartável da superfície `z = sin(x)·cos(y)`.
- **Feito:** adicionados Three.js e tipos; criada malha em `[-π, π]²`, câmera com `up = (0,0,1)`, `OrbitControls`, eixos coloridos, grade no plano `xy`, rotação automática pausável e indicação da faixa `[-1,1]`.
- **Verificações:** `pnpm lint` sem avisos; `pnpm typecheck` sem erros; `pnpm build` concluído (20 módulos transformados; chunk de 781,95 kB gerou aviso do Vite). Não executei testes.
- **Não verificado:** não fiz inspeção visual independente da prévia; o usuário deve conferir no navegador se a orientação e a forma da superfície correspondem ao esperado. CI deste commit ainda não foi executado.
- **Próximo passo:** revisão matemática da Fase 0 pelo usuário. Conferir picos/vales esperados de `sin(x)·cos(y)` e que o eixo Z permanece vertical ao orbitar; não iniciar a Fase 1 sem aprovação.

### Sessão 3

- **Data:** 2026-10-18
- **Tarefa:** ampliar a visualização matemática da superfície de exemplo.
- **Feito:** controles para mostrar/ocultar a análise, os pontos críticos e o campo do gradiente; máximos, mínimos e selas destacados por cor; painel com gradiente, teste da Hessiana e relação `Δf + 2f = 0`. As setas mostram a direção de subida sobre a superfície e têm comprimento proporcional a `|∇f|`.
- **Verificações:** `pnpm lint` passou; `pnpm build` passou (20 módulos transformados), com o aviso existente de chunk grande, agora 787,01 kB minificado. `pnpm typecheck` isolado foi bloqueado pela permissão de escrita no cache do TypeScript; o build executou `tsc -b` e passou. Testes não executados.
- **Não verificado:** inspeção visual manual no navegador e revisão matemática do usuário para os novos marcadores e vetores.
- **Próximo passo:** usuário conferir a exibição dos extremos/selas e do gradiente no navegador; manter a Fase 0 aberta até a revisão matemática.

### Sessão 4

- **Data:** 2026-10-20
- **Tarefa:** F0-T3 — Elevação visual e interativa, notação matemática de papel e preparação para funções futuras.
- **Feito:**
  1. **Desacoplamento de funções:** Criada camada de configuração matemática em `src/core/functions/` (`types.ts`, `sinCosFunction.ts`, `index.ts`), separando avaliação, domínio, gradiente, pontos críticos e etapas analíticas da cena 3D.
  2. **Notação matemática elegante ("como no papel"):** Criado `src/ui/MathView.tsx` e `src/ui/MathAnalysisPanel.tsx`, substituindo blocos de código/monospace por tipografia matemática clássica (frações verticais com barra horizontal, variáveis em itálico, operadores romanos, subscritos/sobrescritos reais, sistemas de equações com chave e matrizes Hessianas alinhadas).
  3. **Alinhamento e enquadramento das equações na UI:** Centralização com flexbox horizontal/vertical em `MathBlock`, chave matemática estilizada em `MathSystem`, alinhamento vertical das derivadas com `MathAlign`, componente `MSqrt` com traço horizontal para raízes quadradas e enquadramento equilibrado das fórmulas do vetor gradiente ($\nabla f$ e $\|\nabla f\|$), eliminando transbordamento lateral ou deslocamento na aba.
  4. **Refinamento dos pontos críticos:** Substituídas as esferas volumosas ("bolas grandes") por marcadores geométricos delicados e precisos (joia com halo tangente horizontal para máximos/mínimos e octaedro/diamante para selas indicando a curvatura hiperbólica), com raio de colisão invisível ampliado para seleção confortável por mouse/hover.
  5. **Gradiente e iluminação:** Setas de tamanho uniforme com cor indicando magnitude real (evitando distorções de perspectiva) e shader de formação suave com interpolação radial ao iniciar, respeitando `prefers-reduced-motion`.
  6. **Testes matemáticos:** Criada suíte `src/core/functions/sinCosFunction.test.ts` (8 testes cobrindo valores conhecidos, gradiente simbólico vs. diferenças finitas, teste da Hessiana para os 12 pontos e identidade de Helmholtz $\Delta f + 2f = 0$).
- **Verificações executadas:**
  - `pnpm vitest run`: 8 testes passaram (1 arquivo de teste, 0 falhas).
  - `npx tsc -b`: 0 erros de tipo (modo estrito).
  - `pnpm lint`: 0 erros e 0 warnings.
  - `pnpm format:check`: 100% formatado conforme Prettier.
  - `pnpm build`: concluído com sucesso (24 módulos transformados, aviso de chunk Three.js mantido conforme previsto).
- **Não verificado:** inspeção subjetiva de renderização WebGL em dispositivo móvel com GPU restrita.
- **Próximo passo:** Revisão matemática e visual da Fase 0 pelo usuário no navegador.

### Sessão 5

- **Data:** 2026-10-20
- **Tarefa:** F1-T1 — layout profissional de três colunas e marcações dos eixos.
- **Feito:**
  1. O portão da Fase 0 foi considerado aprovado pelo pedido explícito do usuário para avançar à Fase 1. A superfície mantida é `z = sin(x)·cos(y)` no domínio `[-π, π]²`, com imagem `[-1, 1]`.
  2. Reorganizada a interface em três regiões: controles e definição da função, cena 3D central e leitura matemática passo a passo. Em larguras menores, as regiões se reorganizam em duas colunas e depois em uma coluna.
  3. Reduzido o uso de brilho, cores saturadas e fundos decorativos. A superfície usa uma escala contínua de azul ardósia a areia; os eixos mantêm cores distintas e discretas.
  4. Os eixos x e y agora marcam `−π`, `−π/2`, `0`, `π/2` e `π` para o domínio atual; o eixo z usa marcações numéricas compatíveis com a imagem da função. As marcações acompanham domínio e intervalo configurados.
  5. As etapas da análise podem ser acessadas por botões com rótulos e indicação da etapa atual, inclusive por teclado. O inspetor de coordenadas permanece ancorado dentro da cena.
- **Verificações executadas:**
  - `pnpm lint`: passou.
  - `pnpm typecheck`: passou.
  - `pnpm test`: 8 testes passaram (1 arquivo; 0 falhas).
  - `pnpm format:check`: passou.
  - `pnpm build`: passou; o bundle JavaScript minificado ficou em 830,62 kB, acima do limite de aviso de 500 kB do Vite.
  - Prévia WebGL no navegador: a cena e os passos matemáticos foram visualmente conferidos; os modos de viewport 1440, 1160, 800 e 480 px não apresentaram overflow horizontal. O controle do gradiente e a navegação entre passos responderam como esperado.
- **Não verificado:** desempenho em aparelho móvel físico ou GPU restrita; CI remoto.
- **Próximo passo:** F1-T2 — parser seguro de expressões, seguindo a lista branca e os testes exigidos no plano.

### Sessão 6

- **Data:** 2026-10-20
- **Tarefa:** F1-T2 — parser seguro de expressões.
- **Feito:**
  1. Adicionado math.js 15.2.0 para analisar a entrada e produzir a árvore sintática (AST). A aplicação não usa o avaliador nem o compilador dinâmico do math.js: percorre a AST e interpreta somente números, variáveis, `pi`, `e`, parênteses, operações `+`, `−`, `×`, `÷`, potência e funções autorizadas.
  2. Implementada a lista branca de funções e aliases (`sen` → `sin`, `tg` → `tan`), validação de aridade, multiplicação implícita de variáveis de uma letra (`xy` = `x·y`) e descoberta ordenada dos parâmetros livres.
  3. Adicionados limites de tamanho e complexidade, rejeição de atribuições, acessos a propriedades e nós não permitidos, leitura de variáveis somente por propriedade própria e erros de sintaxe/avaliação claros em pt-BR.
  4. Criados testes para valores de referência, precedência, funções, parâmetros, entradas inválidas e uma bateria determinística de tentativas de acesso/execução fora da lista branca.
- **Verificações executadas:**
  - `pnpm lint`: passou sem erros ou avisos.
  - `pnpm typecheck`: passou.
  - `pnpm test`: 45 testes passaram em 2 arquivos (8 anteriores + 37 novos; 0 falhas).
  - `pnpm format:check`: passou.
  - `pnpm build`: passou; permaneceu o aviso conhecido de bundle JavaScript acima de 500 kB (830,62 kB minificado).
- **Não verificado:** análise formal de segurança do math.js; a bateria de entradas hostis é determinística, não uma prova de segurança. A integração do parser ao campo de fórmula e à superfície pertence à F1-T3.
- **Próximo passo:** F1-T3 — campo de fórmula e superfície no thread principal, com tratamento de NaN/∞.

### Sessão 7

- **Data:** 2026-10-22
- **Tarefa:** F1-T3 — integrar fórmulas do parser com a superfície e tratar amostras não finitas.
- **Feito:**
  1. Criado adaptador de expressão para `VisualizableFunction`, com domínio cartesiano padrão `[-π, π]²` e faixa visual estimada por amostragem.
  2. Integrado campo de fórmula controlado à cena; a troca só ocorre após uma expressão válida. Em erro, a mensagem é localizada e a última superfície continua ativa.
  3. Malha usa amostras finitas e representáveis em Float32; triângulos ligados a amostras inválidas são omitidos para desenhar buracos, em vez de paredes artificiais. Normais aproximadas são usadas apenas na renderização para funções sem gradiente analítico.
  4. Controles de camadas e análise específica de `sin(x)·cos(y)` são ocultados ao aplicar função sem análise correspondente.
  5. Atendido o critério de aceite da F1-T3 para `sin(a*x)*cos(y)` com um slider básico de `a` (inicial 1, faixa −3 a 3, passo 0,05). A animação e o refinamento dos parâmetros permanecem na F1-T5, conforme a lista de tarefas.
- **Evidências matemáticas e visuais:**
  - Para `x²+y²`, a avaliação em `(1,2)` é 5, exatamente `1²+2²`; o gráfico observado é o paraboloide.
  - Para `sin(a·x)·cos(y)`, com `a=1`, o valor em `(π/2,0)` é 1; com `a=2`, o valor em `(π/4,0)` é 1. A prévia confirmou que o slider altera de 1,00 para 1,05 e atualiza a cena.
  - `1/x` preserva o infinito em `x=0`; na malha 97×97 a coluna central (97 amostras) é indicada como buracos. `sqrt(x)` também deixa sem triângulos a região de `x<0`.
  - `sin(` mostra erro do parser e mantém a superfície válida anterior.
- **Verificações executadas:**
  - `pnpm lint`: passou sem erros ou avisos.
  - `pnpm typecheck`: passou.
  - `pnpm test`: 56 testes passaram em 4 arquivos (0 falhas).
  - `pnpm format:check`: passou.
  - `pnpm build`: passou; aviso conhecido do Vite para bundle inicial minificado acima de 500 kB (1.492,15 kB nesta build).
  - Prévia local conferida por interação real com fórmula, erro, buracos e slider; console sem erros.
- **Não verificado:** revisão matemática/visual independente do usuário; desempenho em dispositivo móvel físico ou GPU restrita. Avaliações continuam na thread principal nesta tarefa; a F1-T4 moverá o cálculo para Worker.
- **Próximo passo:** F1-T4 — Worker via Comlink, debounce e cancelamento por id de job. Não avançar para a Fase 2 até terminar a Fase 1 e passar pelo portão de revisão matemática.

### Sessão 8

- **Data:** 2026-10-22
- **Tarefa:** Adendo à F1-T3 após revisão do usuário: limites configuráveis, teclado científico e correção da notação `senxtany`.
- **Feito:**
  1. Reproduzido o defeito: o parser interpretava `senxtany` como produto das letras/parâmetros `s·e·n·x·t·a·n·y`, em vez de `sen(x)·tan(y)`.
  2. Adicionada normalização segura de abreviações trigonométricas escolares sem parênteses; a expressão passa a usar somente as variáveis `x` e `y`.
  3. Os polos de tangente em `π/2 + kπ` agora são indefinidos (`NaN`), corrigindo o valor finito espúrio que `Math.tan` retorna por arredondamento de ponto flutuante. Alturas acima de `10⁶` também são omitidas da faixa e da malha para preservar a escala visual; a função analítica não é alterada.
  4. Adicionados limites editáveis para x e y (reais, finitos, ordenados e limitados a `|limite| ≤ 10⁴`), teclado científico para a lista branca e atualização da faixa amostrada/enquadramento.
  5. A análise de função customizada mostra a avaliação no centro do domínio e explica como a malha é construída, sem alegar derivação simbólica. As operações diferenciais e integrais foram organizadas nas fases do plano.
  6. `senxtany` no domínio `[-π,π]²` agora mostra dois polos de y como duas colunas de buracos (194 amostras em malha 97×97), com escala da cena `[-10.97, 10.97]` e sem erro no console.
  7. Corrigidos status antigos na tabela de tarefas e o guia matemático: extremos de grade serão rotulados como estimativas amostradas, sem garantia de cercar o exato.
- **Verificações executadas:**
  - Inicial: `pnpm typecheck` passou; `pnpm test` passou com 56 testes.
  - Direcionados: 54 testes passaram em 3 arquivos.
  - Final: `pnpm lint`, `pnpm typecheck`, `pnpm test` (62 testes, 4 arquivos), `pnpm format:check` e `pnpm build` passaram; Vite emitiu aviso para chunk minificado de 1.497,57 kB.
  - Prévia local: inserção pelo teclado gerou `sen(x)*tan(y)`; limites `[0,1]×[0,1]` foram aplicados a `x²+y²`, com `z=0,5` no centro e faixa visual `[-0,08, 2,08]`; `senxtany` não gerou sliders espúrios, mostrou 194 buracos e não teve erro no console.
- **Não verificado:** inspeção em GPU móvel; derivação simbólica algébrica genérica. O painel atual explica a avaliação e geração da malha, não fornece uma sequência de identidades algébricas. O portão de revisão matemática da Fase 1 continua pendente até F1-T6.
- **Próximo passo:** F1-T4 — mover as avaliações para Web Worker com Comlink, debounce e cancelamento por id; manter expresso o limite visual `10⁶` e documentar os buracos em resultados fora da faixa.

### Sessão 9

- **Data:** 2026-10-22
- **Tarefa:** F1-T4 — transferir o cálculo da faixa e da malha para Web Worker via Comlink.
- **Feito:**
  1. Adicionado Comlink 4.4.2 como dependência direta e criado Worker de módulo com protocolo tipado para calcular expressões e gerar a malha 97×97.
  2. A amostragem da malha cede execução entre blocos de linhas para receber cancelamentos sem bloquear a interface; buffers de posições, alturas e validade são transferidos ao thread principal sem cópia.
  3. Fórmulas aplicadas e alterações de parâmetros passam por debounce; cada nova solicitação cancela o id anterior. Resultados atrasados são descartados, e uma falha mantém a superfície válida anterior.
  4. A renderização Three.js recebe a malha pronta e não amostra mais a função na thread principal. O exemplo inicial também aguarda o Worker antes de montar a cena.
  5. Adicionados testes para faixa e dimensões da malha, validação de expressão e cancelamento por id.
- **Verificações executadas:**
  - `tsc -b`: passou.
  - Vitest: 65 testes passaram em 5 arquivos (0 falhas).
  - ESLint: passou; Prettier: passou.
  - Build Vite: passou; chunk inicial de 1.502,55 kB continua acima do aviso de 500 kB e o Worker foi emitido separadamente em 675,69 kB.
  - Prévia local: exemplo inicial renderizou após a inicialização do Worker; `x²+y²` foi aplicado e o painel confirmou a avaliação no centro, faixa estimada e superfície; `danger(1)` exibiu erro e preservou a superfície anterior.
- **Não verificado:** carga em GPU/dispositivo móvel; medição comparativa de responsividade em hardware lento. A faixa permanece uma estimativa por amostragem, conforme a revisão matemática anterior.
- **Próximo passo:** F1-T5 — completar controles de parâmetros e animação; F1-T6 permanece pendente antes do portão matemático da Fase 1.

### Sessão 10

- **Data:** 2026-10-23
- **Tarefa:** F1-T5 — completar parâmetros livres e animação controlada.
- **Feito:**
  1. Cada parâmetro livre descoberto na expressão agora recebe seu próprio slider e controles de animar/pausar; alterar manualmente um parâmetro interrompe sua animação.
  2. A animação percorre suavemente o intervalo do slider com período de 8 segundos em 1×; a velocidade pode ser ajustada de 0,25× a 2×. Os valores animados permanecem alinhados ao passo do slider (0,05).
  3. O cálculo continua no Web Worker, e a malha é atualizada sem recriar o renderer, controles de câmera ou enquadramento em cada quadro. O enquadramento é revisado quando a função ou o domínio mudam.
  4. Erros do Worker interrompem a animação e preservam a última malha válida.
- **Verificações executadas:**
  - TypeScript: passou.
  - Vitest: 70 testes passaram em 6 arquivos (0 falhas), incluindo 5 testes da animação.
  - ESLint e Prettier: passaram.
  - Build Vite: passou; aviso de chunk inicial minificado de 1.506,91 kB e Worker de 675,71 kB.
  - Prévia local: `sin(a*x)*cos(y)` animou `a`, a velocidade mudou para 1,25× e a pausa preservou o valor; console sem erros.
- **Não verificado:** desempenho em dispositivo móvel/GPU restrita; chunk principal continua acima do limite de aviso do Vite.
- **Próximo passo:** F1-T6 — mapas de cores, normais analíticas e picking; manter a revisão matemática da Fase 1 pendente até a conclusão dessa tarefa.

### Sessão 11

- **Data:** 2026-10-23
- **Tarefa:** reorganizar editor de função/limites e concluir F1-T6.
- **Feito:**
  1. O editor agora fica recolhido e abre por ação explícita. O teclado contextual segue a navegação familiar do GeoGebra com categorias `123`, `f(x)` e `ABC`; constantes e funções autorizadas ficam agrupadas, com inserção no cursor.
  2. Limites aceitam expressões numéricas seguras com constantes (`-pi`, `pi/2`, `2*pi`, `e+1`), sem variáveis. Atalhos `−π`, `−π/2`, `0`, `π/2`, `π` inserem no campo selecionado.
  3. `compileExpression` agora deriva simbolicamente expressões suportadas. O Worker calcula os gradientes nos vértices e transfere os buffers da malha; o renderizador usa esses gradientes para as normais. Nós derivados passam por compilação restrita e `sec`/`sech` só são aceitos nas árvores internas geradas. Quando a biblioteca não fornece regra (por exemplo, `floor`), o renderizador mantém a estimativa de malha e a interface avisa.
  4. A cena oferece três mapas de altura (Atlas, Viridis e Térmico). Mudar o mapa substitui a malha colorida sem recriar renderer/câmera.
  5. A inspeção mudou de hover para clique. O ponto selecionado permanece aberto até fechar ou clicar fora da superfície; z é reavaliado pela fórmula em (x,y), e o painel mostra gradiente analítico quando definido.
- **Verificações matemáticas:**
  - `∇(x²+y²)(1,2)=(2,4)` e `∇(xy)(3,4)=(4,3)` conferidos em testes.
  - Para `sin(x)cos(y)`, o gradiente em `(π/4,π/3)` é `(√2/4,−√6/4)`; derivadas de expressão composta também foram comparadas a diferenças finitas centrais.
  - Para `sen(x)tan(y)` em `(π/6,π/4)`, gradiente `(√3/2,1)`.
- **Verificações executadas:**
  - TypeScript: passou.
  - Vitest: 81 testes passaram em 8 arquivos (0 falhas), incluindo constantes de domínio, paletas, gradientes transferidos pelo Worker e fallback quando a derivada não tem regra suportada.
  - ESLint e Prettier: passaram.
  - Build Vite: passou; bundle inicial 1.511,40 kB (412,78 kB gzip), Worker 676,71 kB; Vite emitiu aviso de chunk acima de 500 kB.
  - Prévia local: teclado oculto até abrir o editor; `x²+y²` com limites contendo `π/2`; Viridis selecionável; clique na superfície mostrou, por exemplo, `(x,y,z)≈(1,883,−2,886,11,874)` e `∇f≈(3,766,−5,772)` usando os dados do Worker.
- **Limitações:** derivação simbólica depende das regras disponíveis no math.js; funções sem regra de diferenciação continuam com normais estimadas pela malha. Desempenho em GPU móvel não medido.
- **Próximo passo:** portão de revisão matemática da Fase 1. Não iniciar Fase 2 até aprovação explícita.

### Sessão 12

- **Data:** 2026-10-23
- **Tarefa:** refinar a calculadora do editor de superfícies, inspirada no teclado científico do GeoGebra e adequada à lista de expressões aceita pelo projeto.
- **Feito:**
  1. O teclado ganhou teclas agrupadas e dimensionadas para números, variáveis, constantes (`π`, `e`), operações, parênteses, potência, raiz e valor absoluto; categorias `123`, `f(x)` e `ABC` continuam contextuais.
  2. Funções permitidas são inseridas como modelos fechados (`sin()`, `sqrt()`, `min(,)`, etc.), com o cursor posicionado no argumento. Setas navegam pelo texto, respeitam seleção, `⌫` apaga, `C` limpa e `Aplicar` submete a expressão.
  3. O visual foi retrabalhado com teclas de hierarquia visual clara, estados de hover/press/foco, transição curta entre grupos e responsividade compatível com a largura estreita do painel. A preferência por movimento reduzido já é respeitada pelas regras globais.
  4. A superfície ainda aceita apenas a sintaxe que o parser lista como suportada; operadores de derivação e integração não aparecem como teclas funcionais nesta ferramenta. Eles dependem dos módulos de cálculo previstos no plano.
  5. O build estrito revelou um retorno explícito `gradient: undefined`, incompatível com `exactOptionalPropertyTypes`; o objeto compilado agora omite a propriedade quando não há gradiente. Os testes de gradiente fazem o estreitamento explícito do tipo sem alterar valores, tolerâncias ou expectativas.
- **Verificações executadas:**
  - `pnpm exec tsc --noEmit`: passou.
  - `pnpm exec eslint .`: passou.
  - `pnpm exec vitest run`: 81 testes passaram em 8 arquivos (0 falhas).
  - `pnpm exec prettier --check ...`: passou para os arquivos alterados.
  - `pnpm build` (`tsc -b && vite build`): passou; bundle inicial 1.513,07 kB (413,16 kB gzip), Worker 676,73 kB; Vite ainda avisa sobre chunks acima de 500 kB.
  - Prévia local: inserção por teclado de `sqrt()` e `sin()` com argumentos no cursor; `sqrt(x^2sin(y))` foi aceita e gerou a superfície. A região em que o radicando é negativo permaneceu como buracos, conforme o domínio real da raiz quadrada.
- **Próximo passo:** portão de revisão matemática da Fase 1. Não iniciar Fase 2 até aprovação explícita do revisor humano.

### Sessão 13

- **Data:** 2026-10-23
- **Tarefa:** F2-T1 — implementar a regra de quadratura de Gauss–Legendre, a primeira peça do núcleo numérico de integrais duplas.
- **Feito:**
  1. O núcleo calcula nós e pesos da regra em `[-1,1]` por recorrência de Legendre e iteração de Newton, espelha as raízes para impor simetria e armazena regras por ordem em cache.
  2. A API valida ordens inteiras de 1 a 256 e falha com erro explícito se a iteração não convergir. As funções permanecem puras de dependências de UI/render, retornam arrays de precisão dupla independentes do cache e não permitem que uma chamada corrompa outra.
  3. A revisão matemática da Fase 1 foi aprovada explicitamente pelo usuário; a Fase 2 foi marcada como iniciada. F2-T1 não implementa a integral iterada nem marca A1–A4 como cobertos.
- **Verificações matemáticas:**
  - Ordem 1: nó `0`, peso `2`.
  - Ordem 2: nós `±1/√3`, pesos `1,1`.
  - Ordem 3: nós `−√(3/5), 0, √(3/5)` e pesos `5/9, 8/9, 5/9`.
  - Para ordens de 1 a 8, testes verificam que `Σ wᵢ xᵢᵏ = ∫₋₁¹ xᵏ dx` para todos os graus `k ≤ 2n−1` (momento igual a `2/(k+1)` para k par e `0` para k ímpar).
  - Na ordem 256, os nós seguem crescentes e simétricos, os pesos permanecem positivos e somam `2` dentro do arredondamento numérico.
- **Verificações executadas:**
  - Teste direcionado: 11 casos passaram.
  - `pnpm exec vitest run`: 92 testes passaram em 9 arquivos (0 falhas).
  - `pnpm exec eslint .` e Prettier: passaram.
  - TypeScript da aplicação: `pnpm exec tsc -p tsconfig.app.json --ignoreDeprecations 5.0` passou, incluindo os testes tipados do código de expressão.
  - `pnpm build` não completou porque o `tsc -b` rejeita a opção `ignoreDeprecations: "6.0"` do `tsconfig.app.json` local. O arquivo já estava modificado antes desta tarefa e foi preservado; o Vite isolado passou. O aviso de chunk >500 kB continua.
- **Não verificado:** a regra ainda não está integrada a `integral2TypeI` nem à interface; não há resultado de A1–A4 nesta tarefa. O limite superior 256 é política de segurança/recursos, não uma exigência matemática do método.
- **Próximo passo:** F2-T2 — implementar e testar a integral dupla iterada em retângulos usando Gauss–Legendre; cobrir os casos retangulares A1–A3 com valores exatos antes de expor o cálculo na UI.

### Sessão 14

- **Data:** 2026-10-23
- **Tarefa:** F2-T2 — implementar a integral dupla iterada em retângulos pelo produto tensorial de Gauss–Legendre.
- **Feito:**
  1. Criada `integral2Rectangular(f, xBounds, yBounds, order)`, que mapeia uma regra de Gauss–Legendre de `[-1,1]` para cada intervalo e combina os pesos para aproximar a integral sobre o retângulo.
  2. A API mantém a orientação de limites invertidos, retorna zero para um retângulo degenerado sem amostrar a função, soma com compensação de Kahan e rejeita limites, amostras ou resultados não finitos. A ordem usa a validação existente (inteiro entre 1 e 256).
  3. A1–A3 da tabela de referência foram implementados e passaram: integral de `xy` em `[0,1]²` é `1/4`; integral de `x²+y²` é `2/3`; integral de `sen(x)sen(y)` em `[0,π]²` é `4`. Em A3, `x` e `y` estão em radianos, como definido para o núcleo.
- **Verificações matemáticas à mão:**
  - A1: `(∫₀¹ x dx)(∫₀¹ y dy) = (1/2)(1/2) = 1/4`.
  - A2: `∫₀¹∫₀¹(x²+y²) dy dx = 1/3 + 1/3 = 2/3`.
  - A3: `(∫₀^π sen x dx)² = (2)(2) = 4`.
  - Para A1 e A2 a regra de ordem 2 é exata em aritmética exata, pois cada polinômio em cada variável tem grau no máximo 2. A3 usa ordem 16 e a comparação do teste exige erro relativo menor que `10⁻¹⁰`.
- **Verificações executadas:**
  - Teste direcionado: 8 casos passaram.
  - `pnpm exec vitest run`: 100 testes passaram em 10 arquivos (0 falhas).
  - `pnpm exec eslint .`: passou.
  - TypeScript: aplicação (`tsconfig.app.json` com `--ignoreDeprecations 5.0`) e configuração Node passaram.
  - Prettier e `git diff --check`: passaram.
  - `pnpm exec vite build`: passou; bundle inicial 1.513,07 kB (413,16 kB gzip), Worker 676,73 kB; Vite emitiu aviso de chunk acima de 500 kB.
  - `pnpm build`: não completou porque `tsc -b` rejeita `ignoreDeprecations: "6.0"` no `tsconfig.app.json`, modificação local preexistente que foi preservada.
- **Limitações:** o cálculo aceita somente retângulos com limites constantes. Pontos singulares ou não finitos são rejeitados; integrais impróprias, regiões de tipo I/II e interface ainda não fazem parte desta tarefa. A aproximação não apresenta estimativa de erro adaptativa.
- **Próximo passo:** F2-T3 — regras de soma de Riemann retangulares e verificação de convergência conforme o plano.

### Sessão 15

- **Data:** 2026-10-23
- **Tarefa:** F2-T3 — implementar regras de soma de Riemann retangulares e conferir suas ordens de convergência.
- **Feito:**
  1. Criada `riemann2Rectangular` com amostragem à esquerda, à direita, no ponto médio, inferior/superior por cantos amostrados e aleatória. Número de subdivisões em x e y pode variar independentemente; limites invertidos preservam o sinal da integral.
  2. A regra aleatória aceita gerador fornecido pelo chamador para reprodução dos resultados. A malha é limitada a um milhão de células, as somas usam compensação numérica e valores não finitos são rejeitados.
  3. Criada `compareRiemannRefinement`, que compara `n×m` com `2n×2m` e fornece estimativas de erro absoluto/relativo. Para ponto médio aplica extrapolação com ordem 2; para as demais regras usa ordem 1 como heurística. São estimativas de refinamento, não limites certificados; a regra aleatória ainda contém ruído de amostragem.
  4. “Inferior” e “superior” selecionam as menores/maiores contribuições entre os quatro cantos amostrados de cada célula. Não certificam o ínfimo/supremo da função dentro da célula.
- **Verificações matemáticas:**
  - Para `x²+y²` em `[0,1]²`, ponto médio tem erro exato `1/(6n²)`; ao duplicar `n`, o erro cai por fator `4`, correspondente a ordem `2`.
  - Para a regra esquerda na mesma função, o erro é `(3n−1)/(3n²)`; em `n=128` e `2n=256`, a razão dos erros é aproximadamente `1,997`, compatível com ordem `1`.
  - Para `xy` em `[0,1]²` com duas subdivisões em cada eixo: esquerda/inferior dão `1/16`, ponto médio `1/4`, direita/superior `9/16`; o valor exato é `1/4`. Um gerador aleatório constante `0,5` reproduz a amostragem pelos pontos médios.
- **Verificações executadas:**
  - Teste direcionado: 13 casos passaram.
  - `pnpm exec vitest run`: 113 testes passaram em 11 arquivos (0 falhas).
  - `pnpm exec eslint .`: passou.
  - TypeScript da aplicação (`--ignoreDeprecations 5.0`) e configuração Node: passaram.
  - Prettier e `git diff --check`: passaram.
  - `pnpm exec vite build`: passou; bundle inicial 1.513,07 kB (413,16 kB gzip), Worker 676,73 kB; permanece o aviso do Vite para chunks acima de 500 kB.
  - `pnpm build`: bloqueado pelo valor local preexistente `ignoreDeprecations: "6.0"` em `tsconfig.app.json`; arquivo preservado e fora do commit.
- **Roteiro para testes manuais na interface quando os controles de Riemann estiverem integrados:**
  1. `x*y`, limites x=`[0,1]`, y=`[0,1]`, duas subdivisões: conferir as somas por regra acima e a referência exata `1/4`.
  2. `x^2+y^2`, `[0,1]²`: referência `2/3`; ponto médio deve passar de `0,6640625` em `n=8` a `0,666015625` em `n=16`, aproximando-se com erro de ordem 2.
  3. `sin(x)*sin(y)`, `[0,pi]²` em radianos: referência `4`; refinar a malha e observar convergência.
  4. `1`, x=`[2,4]`, y=`[-3,1]`: referência `8`; inverter só os limites de x deve produzir `−8`.
  5. `x-y`, `[0,1]²`: referência `0`; a simetria pode revelar erro absoluto e a política para erro relativo quando o resultado é zero.
- **Limitações:** os cálculos deste passo são núcleo puro, ainda não aparecem na interface nem renderizam prismas. A4 (disco) continua fora da região retangular e depende das tarefas de regiões/polares.
- **Próximo passo:** F2-T4 — prismas instanciados, controles de subdivisões e painel com soma, valor de alta precisão, erros absoluto/relativo e tempo de cálculo, conforme o plano.

### Sessão 16

- **Data:** 2026-10-24
- **Tarefa:** F2-T4 verificada e F2-T5 — convergência, sólido e exemplos; fechamento técnico da Fase 2.
- **Feito:**
  1. A F2-T4 está no commit `0a2fac8`. A interface oferece prismas instanciados, subdivisões independentes, hover com amostra/área/contribuição e resultados contra Gauss 64×64.
  2. Adicionado gráfico log-log do erro em função de `n` e ajuste de ordem observada por mínimos quadrados nos logaritmos. Erros no piso de arredondamento são omitidos; a ordem não é apresentada como garantia teórica.
  3. Adicionado sólido translúcido fechado entre a malha da superfície e `z=0`, com orientação de faces verificada para alturas positivas e negativas. Buracos por amostras inválidas não ganham paredes falsas.
  4. Adicionado seletor de camadas (superfície, prismas, sólido, ambos), quatro presets de integrais com valores exatos e guia de uso em `docs/f2-t5-riemann.md`.
  5. Para concluir a cobertura A1–A4 do roteiro, `integral2DiskPolar` aplica a transformação polar e Jacobiano `r`. Para A4, `∬(x²+y²)dA = ∫₀²π∫₀¹r³drdθ = π/2`; testes também verificam o raio 2 e rejeições de raio inválido.
- **Verificações executadas:**
  - `pnpm exec vitest run`: 131 testes em 15 arquivos, 0 falhas.
  - `pnpm tsc --noEmit`: passou; `pnpm build`: bloqueado por `TS5103` em `tsconfig.app.json` (`ignoreDeprecations: "6.0"`).
  - TypeScript da aplicação com `--ignoreDeprecations 5.0`: passou.
  - `pnpm lint`: passou; `pnpm format:check`: passou; `git diff --check`: passou.
  - `pnpm exec vite build`: passou; bundle inicial 1.531,98 kB (418,77 kB gzip), Worker 683,00 kB; permanece o aviso do Vite para chunks acima de 500 kB.
- **Não verificado:** inspeção manual de WebGL no navegador bloqueada porque o uso local de browser está desativado nas configurações de Work; CI remoto também não foi consultado. O sólido é uma aproximação geométrica na resolução da malha, não uma construção exata para função arbitrária.
- **Próximo passo:** portão de revisão matemática da Fase 2. Não começar a Fase 3 sem aprovação explícita do revisor.
