# PROMPTS_FASES.md — Prompts prontos para conduzir o projeto com a IA

Como usar: copie o bloco do prompt da etapa e cole na conversa com a IA (Claude Code no VSCode).
Os prompts assumem que `CLAUDE.md`, `PROGRESS.md` e `docs/plano_integral_visualizer.pdf` estão no repositório.

---

## A. Prompt de abertura (usar UMA vez, no começo do projeto)

```
Você vai desenvolver o projeto Integral Visualizer (IV), seguindo a especificação em docs/plano_integral_visualizer.pdf.

Antes de qualquer código:
1. Leia CLAUDE.md, PROGRESS.md e o plano completo (PDF).
2. Me explique em até 15 linhas, com suas palavras: o que o projeto é, a stack, as convenções
   matemáticas e como será o fluxo de trabalho por fases e portões de revisão.
3. Aponte qualquer ambiguidade, contradição ou risco que você enxergou no plano. Seja franca:
   prefiro saber agora.

Meu papel: sou o REVISOR MATEMÁTICO. Tenho conhecimento razoável de cálculo integral e diferencial,
mas não vou revisar código. Por isso, todo resultado que você me entregar deve vir com valores
numéricos, fórmulas em notação matemática e instruções claras do que abrir na tela.

Não escreva código ainda. Aguarde minha confirmação.
```

## B. Prompt de início de sessão (usar em TODA sessão nova)

```
Retome o projeto Integral Visualizer (IV).
1. Leia CLAUDE.md e PROGRESS.md.
2. Rode pnpm tsc --noEmit e pnpm vitest run e me diga o estado REAL (números de testes passando/falhando).
3. Resuma em 3 linhas: onde paramos, qual é a próxima tarefa e o critério de pronto dela.
4. Aguarde meu "ok" antes de começar a codar.
```

## C. Prompt de início de tarefa (modelo)

```
Tarefa <ID> — <nome>.
Objetivo: <objetivo em uma frase>.
Siga o ritual do CLAUDE.md. Escreva primeiro os testes com os valores exatos (<IDs de teste>).
Só então implemente. Ao terminar: rode tudo, atualize PROGRESS.md, faça commit e me entregue
um resumo em linguagem de cálculo (o que foi calculado, valor obtido vs. exato, o que posso conferir na tela).
Não avance para outra tarefa.
```

## D. Prompt de fechamento de sessão

```
Feche a sessão: rode lint, tipos e testes e cole o resultado real; atualize PROGRESS.md
(feito, decisões, pendências [REVISAR-MATEMATICA], não verificado, próximo passo); faça o commit.
Diga o que você NÃO conseguiu verificar.
```

## E. Prompt de portão de revisão (fim de fase)

```
Fase <N> concluída pelo lado técnico. Abra o portão de revisão matemática usando o formato da
seção 8 do CLAUDE.md. Inclua: tabela valor exato vs. valor do app, conferência à mão de 2 ou 3 casos,
lista de cenas para eu abrir na tela (com a fórmula exata a digitar), escolhas de convenção que
precisam da minha aprovação e limitações conhecidas. Não comece a próxima fase até eu responder.
```

## F. Prompt após reprovação

```
Reprovo o item "<item>" porque <motivo matemático>.
1. Explique por que o erro ocorreu (qual passo da matemática ou da implementação).
2. Escreva primeiro um teste que reproduz o erro (deve falhar).
3. Corrija, mostre o teste passando e reabra o portão apenas para esse item.
4. Verifique se o mesmo erro pode existir em outros módulos e me diga.
```

---

## Fase 0 — Preparação

**Objetivo:** repositório, ferramentas e protótipo mínimo. Sem matemática pesada.

**Tarefas (uma por sessão):**

- F0-T1: scaffolding Vite + React + TS, ESLint, Prettier, Husky, Vitest, CI no GitHub Actions.
- F0-T2: escrever 3 ADRs curtos em `docs/adr/` (stack; convenções matemáticas; formato do estado).
- F0-T3: protótipo descartável com z = sin(x)·cos(y), câmera com Z para cima, OrbitControls.

**Critério de aceite:** `pnpm dev` mostra a superfície girando; CI verde; ADRs escritos.

**Revisor confere:** o eixo Z aponta para cima; os eixos têm orientação x→direita, y→fundo, z→cima de forma
destro (regra da mão direita); a superfície tem os máximos/mínimos esperados (sin·cos oscila entre −1 e 1).

**Prompt da fase:**

```
Fase 0. Execute F0-T1, depois pare e me mostre o resultado antes de F0-T2. Uma tarefa por vez.
Para F0-T3, o objetivo é só provar que a cena 3D funciona com Z para cima; o código é descartável.
Use as convenções da seção 6 do CLAUDE.md nos ADRs sem alterá-las.
```

---

## Fase 1 — Fundação e superfícies

**Objetivo:** digitar `f(x,y)` e ver a superfície, com sliders de parâmetros.

**Tarefas:**

- F1-T1: layout em 3 colunas e cena 3D com eixos e ticks "bonitos" (Z para cima).
- F1-T2: `core/expr/codegen.ts` com lista branca + 20 testes (válidos e inválidos, mensagens de erro em pt-BR).
- F1-T3: campo de fórmula + superfície (no thread principal primeiro), tratamento de NaN/∞.
- F1-T4: mover o cálculo para Web Worker (Comlink, debounce, cancelamento por id).
- F1-T5: parâmetros livres → sliders automáticos; animação do parâmetro.
- F1-T6: mapas de cor, normais analíticas, picking (clicar mostra x, y, f).

**Adendo aprovado pelo revisor do projeto (2026-10-22):** o editor da superfície deve oferecer teclado
científico para a lista branca, limites editáveis de x e y e aceitar abreviações inequívocas como
`senxtany` = `sen(x)·tan(y)`. As teclas devem inserir sintaxe explícita e a prévia deve continuar mostrando
a expressão aplicada. Nesta fase, o teclado compõe funções escalares para superfícies; não apresentar
derivadas ou integrais como se já fossem calculadas. A resolução simbólica e as ferramentas de cálculo
seguem nas fases abaixo.

**Testes obrigatórios:** casos válidos/ inválidos do parser; fuzz simples garantindo que nada fora da lista branca executa;
avaliação de `sin(x)*cos(y)` em pontos conhecidos.

**Critério de aceite:** digitar `sin(a*x)*cos(y)`, ver o slider `a`, arrastar sem travar; digitar `sin(` mostra erro claro
e mantém a última superfície válida.

**Revisor confere (digite e compare com o que você espera):**

| Fórmula                                                                | O que deve aparecer                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `x^2 + y^2`                                                            | paraboloide aberto para cima, mínimo 0 na origem                          |
| `x^2 - y^2`                                                            | sela; sobe ao longo de x, desce ao longo de y                             |
| `sin(x)*cos(y)`                                                        | "caixa de ovos", valores entre −1 e 1                                     |
| `exp(-(x^2+y^2))`                                                      | sino com máximo 1 na origem                                               |
| `1/x`                                                                  | descontinuidade em x=0 tratada como buraco, sem "parede" ligando os lados |
| `sqrt(x)`                                                              | só existe para x ≥ 0 (resto vira buraco, com aviso)                       |
| Clique em pontos e confira o valor de f mostrado com uma conta rápida. |

**Prompt da fase:**

```
Fase 1. Execute F1-T1 a F1-T6, uma por vez, com parada e relatório curto ao fim de cada uma.
Em F1-T2, trate segurança como requisito principal: nada fora da lista branca pode ser executado.
Ao fim de F1-T6, abra o portão de revisão (seção 8 do CLAUDE.md) com a tabela de fórmulas acima.
```

---

## Fase 2 — Integral dupla retangular

**Objetivo:** prismas de Riemann, valor numérico preciso, erro e convergência.

**Tarefas:**

- F2-T1: `core/quad/gauss.ts` (Gauss–Legendre) + testes de exatidão polinomial.
- F2-T2: integral iterada em retângulo; testes A1, A2, A3.
- F2-T3: regras de Riemann (esquerda, direita, ponto médio, inferior, superior, aleatória) + testes de ordem
  de convergência (esquerda ≈ 1; ponto médio ≈ 2).
- F2-T4: prismas com `InstancedMesh`, sliders n e m, cor por altura.
- F2-T5: painel de resultados (soma S, valor preciso, erro absoluto e relativo, tempo).
- F2-T6: gráfico log-log de erro × n com ordem estimada; sólido translúcido do volume exato.

**Critério de aceite:** testes A1–A3 passam com as tolerâncias do plano; ordem de convergência medida confere.

**Revisor confere:**

- `x*y` em [0,1]×[0,1], ponto médio: S(n) → 0,25. Com n=1 já dá exatamente 0,25 (conta: f(0,5; 0,5)·1 = 0,25, pois x·y é bilinear).
- `x^2+y^2` em [0,1]²: valor exato 2/3 ≈ 0,6667.
- Soma **esquerda** de função crescente: **subestima**; soma **direita**: **superestima**. Conferir no app.
- Mínimo/máximo entre amostras não certifica limites da função em toda a célula. Enquanto não houver
  limites certificados, identificar esses resultados como **estimativas inferior/superior amostradas**,
  informar que podem não cercar o valor exato e nunca afirmar `inferior ≤ exato ≤ superior` sem prova.
- Ao dobrar n, o erro do ponto médio cai ≈ 4× e o da esquerda ≈ 2×.
- Altura dos prismas = f no ponto de amostra; área da base = Δx·Δy; soma de todos os volumes = S exibido.
- Função negativa: prismas para baixo, contribuição negativa.

**Prompt da fase:**

```
Fase 2. Siga F2-T1 a F2-T6. Em cada tarefa matemática, escreva primeiro o teste com o valor exato do CLAUDE.md/plano
(A1, A2, A3) e a verificação de ordem de convergência. Não relaxe tolerâncias. No portão, mostre as somas
esquerda/direita e os extremos amostrados para x*y e x^2+y^2, identificando claramente quais resultados são
estimativas sem certificação. Nunca exiba a desigualdade inferior ≤ exato ≤ superior como garantia até implementar
um método de limites rigorosos. Inclua a tabela de erro por n.
```

---

## Fase 3 — Regiões gerais e polar (MVP)

**Objetivo:** tipo I, tipo II, polar, desigualdades, mudar a ordem e aplicações físicas.

**Tarefas:**

- F3-T1: `core/regions` com tipos I e II (`contains`, `bounds`) e integral iterada; testes A5, A6.
- F3-T2: construtor de integrais com entrada de f(x,y), limites retangulares/tipo I/tipo II, prévia 2D e prismas restritos à região (modos "centro dentro" e "preciso", com a fração de área explicitamente estimada).
- F3-T3: região polar e Jacobiano r; testes A4, A7, A8, A9; animação dos setores.
- F3-T4: região por desigualdades (varredura + bissecção; fallback Monte Carlo com erro estatístico).
- F3-T5: mudar a ordem de integração (I ↔ II) com validação cruzada dos dois valores.
- F3-T6: massa, centro de massa, momentos de inércia, valor médio, área de superfície.
- F3-T7: painel com a integral iterada montada em LaTeX (limites substituídos).

**Critério de aceite:** A4–A9 passam; conversão I↔II dá o mesmo valor; painel mostra a integral certa.

**Adendo solicitado pelo usuário (2026-10-26):** as integrais duplas devem ser montadas em uma aba própria da calculadora, sem enviar o símbolo `∬` ao parser de superfícies `z=f(x,y)`. O editor deve mostrar limites e notação da integral, aceitar constantes (`π`, `e`) nos limites, pré-visualizar a região e permitir preparar a função/domínio para os prismas. Para fronteiras curvas, validar dependência/ordem dos limites e explicar o método de amostragem; não alegar área exata quando a fração é estimada por subamostragem.

**Adendo F3-T4 (2026-10-27):** regiões implícitas são definidas como `g(x,y) ≤ 0` dentro de uma janela retangular finita. A referência principal deve varrer fatias, detectar mudanças de sinal e localizar fronteiras por bissecção; comparar refinamentos e informar que a diferença é estimativa. Se a fronteira exceder o limite de cruzamentos ou o refinamento divergir, usar Monte Carlo e apresentar erro padrão estatístico, sem chamá-lo de garantia/intervalo de confiança. A prévia e os prismas são aproximações por malha, não contornos exatos. Testar fronteiras múltiplas, oscilatórias e alinhadas à malha para expor aliasing.

**Revisor confere:**

- Triângulo 0 ≤ y ≤ x ≤ 1 com f = x: a integral iterada exibida deve ser ∫₀¹∫₀ˣ x dy dx = 1/3.
- Entre y = x² e y = √x: limites de x de 0 a 1, y de x² a √x; valor 3/10 para f = x+y.
- Disco com f = x²+y²: em polar ∫₀^{2π}∫₀¹ r²·r dr dθ = π/2. **O app não pode esquecer o fator r.**
- Região conectando I e II: tipo II da região entre as parábolas tem x de y² a √y, y de 0 a 1.
- Simetria: ∬ x dA no disco = 0.
- Massa com densidade ρ = 1 = área da região (disco unitário → π).
- Centro de massa de região simétrica fica no eixo de simetria.

**Prompt da fase:**

```
Fase 3 (inclui o MVP). Siga F3-T1 a F3-T7. Duas regras críticas: (1) o Jacobiano r em polar nunca pode faltar;
(2) a conversão tipo I ↔ tipo II deve ser validada comparando os dois valores numéricos e, quando não for possível
converter automaticamente, avisar o usuário em vez de errar em silêncio.
No portão, mostre as integrais iteradas montadas (limites explícitos) para A5, A6 e A4.
```

---

## Fase 4 — Cálculo diferencial multivariável

**Tarefas:**

- F4-T1: gradiente (simbólico + autodiferenciação + diferenças finitas de verificação) e Hessiana; testes D1, D2.
- F4-T2: ponto arrastável, vetor gradiente 3D e campo de gradientes (setas instanciadas).
- F4-T3: derivada direcional (círculo unitário, reta tangente, valor D_u f).
- F4-T4: plano tangente e linearização com slider de vizinhança; teste D4.
- F4-T5: pontos críticos (Newton com sementes) e classificação pela Hessiana; teste D3.
- F4-T6: descida do gradiente animada.

**Revisor confere:**

- O gradiente é **perpendicular** às curvas de nível e aponta para onde a função **cresce**.
- Em `x^2+y^2` no ponto (1,2): ∇f = (2,4); D_u f com u = (3/5, 4/5) = 4,4.
- A direção de u que dá o maior D_u f é a do gradiente, e o valor máximo é |∇f|; na direção perpendicular dá 0.
- Plano tangente de `x^2+y^2` em (1,1): z = 2x + 2y − 2; perto do ponto o plano "cola" na superfície.
- `x^3 - 3x + y^2`: (1,0) mínimo local; (−1,0) sela. `x^2 - y^2`: sela na origem.
- Descida do gradiente nunca sobe (para passo pequeno) e converge ao mínimo local, não ao máximo.

**Prompt da fase:**

```
Fase 4. Siga F4-T1 a F4-T6. O gradiente simbólico deve ser comparado automaticamente com diferenças finitas
em pontos aleatórios (|erro| < 1e-6) nos testes. Para a classificação de pontos críticos use o critério
D = fxx*fyy - fxy^2, e trate D = 0 como "inconclusivo" (não classifique à força).
```

---

## Fase 5 — Integral tripla

**Tarefas:**

- F5-T1: regiões 3D tipo 1 e integral tripla iterada; testes T1, T4.
- F5-T2: cilíndricas com Jacobiano r; teste T3.
- F5-T3: esféricas (convenção do CLAUDE.md) com ρ² sen φ; testes T2, T5; diagrama da convenção na interface.
- F5-T4: malhas do sólido (superfície inferior/superior/paredes) e visualização.
- F5-T5: fatias, corte por plano e animação de Cavalieri.
- F5-T6: Monte Carlo/QMC em lotes com progresso, cancelamento e erro estimado; teste T7 (tolerância 1e-3).
- F5-T7: marching cubes para regiões implícitas; presets; massa e centro de massa 3D; teste T6.

**Revisor confere:**

- Esfera unitária: volume 4π/3 ≈ 4,18879 em esféricas e em cilíndricas (os dois dão o mesmo).
- **Jacobiano esférico = ρ² sen φ** (não ρ², não ρ sen φ). Se φ ∈ [0, π], sen φ ≥ 0: nunca negativo.
- Hemisfério superior: φ ∈ [0, π/2]; ∭ z dV = π/4.
- Cone z de r a 1: volume π/3 (um terço do cilindro de mesmo raio e altura: π·1²·1/3).
- Fatias: a área da seção transversal da esfera em z é π(1−z²); integrar de −1 a 1 dá 4π/3.
- Conferir que o diagrama de convenção (φ a partir de +z) está igual ao do seu livro.

**Prompt da fase:**

```
Fase 5. Siga F5-T1 a F5-T7. Antes de qualquer visual, os testes T1–T5 precisam passar no núcleo.
Calcule o volume da esfera em cartesianas (tipo 1), cilíndricas e esféricas e mostre que os três coincidem.
Monte Carlo deve sempre mostrar a estimativa de erro estatístico e nunca ser apresentado como valor exato.
```

---

## Fase 6 — Equações diferenciais

**Tarefas:**

- F6-T1: Euler, Heun, RK4, RK45 (passo adaptativo, saída densa, eventos); testes E1, E2 e ordem de convergência.
- F6-T2: campo de direções 1ª ordem; clique cria solução; testes E3.
- F6-T3: sistemas 2D: retrato de fase, nuclinas, equilíbrios, Jacobiana e classificação; teste E4.
- F6-T4: sistemas 3D com trilha animada e sliders de parâmetros; testes E5, E6.
- F6-T5: EDO de 2ª ordem → sistema; gráficos y(t), y'(t).
- F6-T6: comparação de métodos e erro contra solução exata/referência; presets.

**Revisor confere:**

- `y' = y`, y(0)=1: y(1) = e ≈ 2,71828; RK4 ao dividir h por 2 reduz o erro ≈ 16×; Euler ≈ 2×.
- Campo de direções de `y' = t − y`: soluções convergem para a reta y = t − 1.
- `x' = y, y' = −x`: círculos (centro), trajetórias fechadas.
- Oscilador amortecido: c pequeno → espiral; c grande → sem oscilação.
- Van der Pol (μ > 0): trajetórias convergem a um ciclo limite.
- Lorenz (σ=10, ρ=28, β=8/3): equilíbrios em (0,0,0) e (±√72, ±√72, 27); duas condições iniciais muito próximas divergem.
- Classificação: det J < 0 → sela; det > 0 e tr < 0 → estável; tr = 0 com det > 0 → centro linear.

**Prompt da fase:**

```
Fase 6. Siga F6-T1 a F6-T6. Verifique a ordem de convergência de cada método numericamente (razão do erro ao dividir h por 2)
e inclua no relatório. Trajetórias que explodem (|y| > 1e6) devem parar com aviso, não travar a interface.
Equilíbrios e classificação devem usar o critério tr/det do plano; mostre os autovalores ao usuário.
```

---

## Fase 7 — Plataforma e polimento

**Tarefas:** F7-T1 salvar/abrir JSON com validação e migrações · F7-T2 link compartilhável · F7-T3 exportar PNG/WebM/GLTF ·
F7-T4 biblioteca de exemplos (Apêndice B) + tutorial · F7-T5 i18n pt-BR/en e acessibilidade · F7-T6 testes E2E dos 6 fluxos principais.

**Critério de aceite:** abrir um link reproduz exatamente a cena (mesmas fórmulas, região, n, câmera);
todos os exemplos do Apêndice B abrem sem erro.

**Revisor confere:** cada exemplo da biblioteca mostra a matemática esperada (valor, forma, convenção); textos em português
corretos (termos matemáticos: "soma de Riemann", "Jacobiano", "campo de direções", "retrato de fase").

**Prompt da fase:**

```
Fase 7. Siga F7-T1 a F7-T6. Priorize validação do JSON ao abrir (nunca confiar no arquivo/link) e revise os termos
matemáticos em português. Rode os exemplos do Apêndice B um a um e me entregue a lista de "exemplo → resultado esperado → resultado obtido".
```

---

## Fase 8 — Desempenho e WebAssembly

**Tarefas:** F8-T1 perfil e baselines em `docs/perf.md` · F8-T2 benchmarks (vitest bench) · F8-T3 otimizações no JS
antes de WASM · F8-T4 Rust→WASM só nos gargalos medidos · F8-T5 transparência (OIT) e LOD.

**Regra de ouro:** **os resultados numéricos não podem mudar.** Todo teste A/T/D/E continua passando com as mesmas tolerâncias.

**Revisor confere:** relatório antes/depois (tempos); os valores das integrais de referência permanecem idênticos
(até o erro de arredondamento).

**Prompt da fase:**

```
Fase 8. Meça primeiro. Só otimize o que o perfil mostrar como gargalo. Depois de cada otimização, rode toda a suíte matemática
e mostre que os valores de A, T, D e E não mudaram. Se uma versão WASM divergir da versão TypeScript, a TypeScript é a referência.
```

---

## Fase 9 — Extras (contínua)

Escolha **um** item por vez e trate como uma mini-fase com portão: valores exatos via SymPy/Pyodide, EDPs (calor/onda),
integrais de linha e de superfície, teoremas de Green/Stokes/Gauss. Peça sempre: (1) testes com valores exatos primeiro;
(2) relatório de revisão no formato do CLAUDE.md.
