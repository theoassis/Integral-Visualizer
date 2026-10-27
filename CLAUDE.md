# CLAUDE.md — Contexto permanente do projeto Integral Visualizer (IV)

> Este arquivo é lido no INÍCIO de toda sessão. Ele é a memória do projeto.
> Se algo aqui conflitar com o que você "lembra", vale o que está aqui.

## 1. O que é o projeto

**Integral Visualizer (IV)**: visualizador interativo, no navegador, de integrais duplas e triplas, superfícies,
gradientes e equações diferenciais (estilo GeoGebra 3D, focado em Cálculo II/III e EDOs).

- Especificação completa: `docs/plano_integral_visualizer.pdf` (arquitetura, matemática, tipos, testes, roadmap).
- Estado atual do trabalho: `PROGRESS.md` (sempre atualizado por você).
- Prompts e critérios de cada fase: `PROMPTS_FASES.md` (na raiz do repositório).
- Como o revisor confere a matemática: `docs/REVISAO_MATEMATICA.md`.

## 2. Papéis (importante)

| Papel                  | Quem          | Faz                                                                                                                                                                                             |
| ---------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desenvolvedora         | **Você (IA)** | Escreve código, testes, documentação; roda comandos; verifica; registra progresso.                                                                                                              |
| **Revisor matemático** | **O humano**  | Tem conhecimento razoável de cálculo integral e diferencial. Confere se a matemática e as visualizações estão corretas e aprova ou reprova cada fase. **Não é o revisor do código TypeScript.** |

Consequências para você:

1. **Explique em linguagem de cálculo, não de programação.** Ao reportar, diga "a integral dupla de x·y sobre
   [0,1]×[0,1] deu 0,25, igual ao valor exato", e não "o teste unitário passou".
2. **Nunca peça ao revisor para ler código** para confirmar matemática. Dê evidências verificáveis por ele:
   valores numéricos, fórmulas em notação matemática, imagens/capturas, resultados que ele pode refazer à mão.
3. **Você é responsável pela correção técnica** (tipos, testes, desempenho). O revisor é responsável por dizer
   "isto está matematicamente certo/errado/confuso".

## 3. Como o trabalho é organizado: FASES e PORTÕES (gates)

O projeto segue as fases do plano (0 a 9). Cada fase é dividida em **tarefas pequenas** (uma sessão cada).

- Trabalhe **uma tarefa por vez**. Não antecipe funcionalidades de fases futuras.
- Ao terminar a última tarefa de uma fase, **PARE** e abra um **portão de revisão matemática**
  (formato na seção 8). Não comece a fase seguinte sem a aprovação explícita do revisor.
- Se o revisor reprovar algo, corrija **antes** de qualquer avanço e registre em `PROGRESS.md`.

## 4. Ritual de sessão (obrigatório)

**Ao iniciar:**

1. Leia `CLAUDE.md` e `PROGRESS.md`.
2. Rode `pnpm install` (se necessário), `pnpm tsc --noEmit` e `pnpm vitest run` e informe o estado real
   (quantos testes passam/falham). Não assuma que o estado anterior está verde.
3. Diga em 3 linhas: onde paramos, qual é a tarefa de hoje, qual o critério de pronto.

**Ao terminar:**

1. Rode lint, tipos e testes. Cole o resultado real (não resuma como "tudo ok" sem rodar).
2. Atualize `PROGRESS.md` (tarefa feita, decisões, pendências, próximo passo).
3. Faça commit com mensagem no padrão `feat:`, `fix:`, `test:`, `docs:`, `perf:`, `refactor:`.

## 5. Stack e comandos

- TypeScript (strict), React + Vite, Tailwind, Zustand, Three.js (uso direto), math.js, Comlink, KaTeX/MathLive.
- Testes: Vitest, fast-check (propriedades), Playwright (E2E/visual).
- Comandos: `pnpm dev`, `pnpm vitest run`, `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build`.
- Estrutura de pastas e tipos centrais: ver Seções 6 e 8 do plano.

## 6. Convenções matemáticas (NÃO decida diferente sem aprovação do revisor)

- **Eixo Z para cima** em toda a aplicação (`camera.up = (0,0,1)`). (x, y, z) como na matemática.
- **Ângulos em radianos** em todo o núcleo. Graus só na interface, se houver, e convertidos na borda.
- **Polar:** x = r cos θ, y = r sen θ, dA = r dr dθ.
- **Cilíndricas:** dV = r dz dr dθ.
- **Esféricas (convenção física/ISO, a mesma do Stewart):** ρ distância, φ ∈ [0, π] a partir de +z,
  θ ∈ [0, 2π] azimute; x = ρ sen φ cos θ, y = ρ sen φ sen θ, z = ρ cos φ; dV = ρ² sen φ dρ dφ dθ.
  Sempre mostrar a convenção na interface.
- **Funções aceitas** (lista branca): sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh, exp, log/ln,
  sqrt, abs, min, max, pow, floor, pi, e. Aceitar também `sen` e `tg` como sinônimos.
- **Variáveis de uma letra.** `xy` significa x·y. Parâmetros livres viram sliders.
- **Valores não finitos** (NaN, ±Infinity) viram "buraco" na malha e geram aviso, nunca "paredes" falsas.
- **Extremos amostrados não são limites certificados.** Identificar estimativas inferior/superior amostradas como aproximações e não afirmar que cercam o valor exato sem um método de certificação.
- **Gradiente:** preferir derivada simbólica; verificar contra diferenças finitas nos testes.

## 7. Regras de qualidade (inegociáveis)

1. **Testes primeiro para a matemática.** Antes de implementar um cálculo, escreva o teste com o valor exato
   conhecido (ver tabela da Seção 14.2 do plano: A1–A9, T1–T7, D1–D4, E1–E6).
2. **Nunca altere um valor esperado, tolerância ou teste só para fazê-lo passar.** Se achar que o teste
   está errado, pare e peça revisão matemática, mostrando a conta.
3. **Nunca declare "pronto" sem evidência executada.** Se não conseguiu rodar/ver algo (por exemplo, a cena 3D no
   navegador), diga exatamente o que NÃO foi verificado.
4. **Estimativa de erro sempre que houver aproximação** (comparar n e 2n; mostrar erro ao usuário).
5. **Núcleo puro:** `src/core/` nunca importa `ui/`, `render/`, `state/`, DOM, React ou Three.js.
6. **Segurança do parser:** o gerador de código só emite números, variáveis declaradas, constantes e funções da
   lista branca. Nunca usar `eval` ou `new Function` com texto não validado.
7. **Nada de `any`.** Tipos explícitos nas fronteiras (Workers, estado, arquivos).
8. **Tarefas pesadas fora da thread principal** (Workers), com cancelamento por id de job.
9. **Desempenho:** respeitar os orçamentos da Seção 15 do plano; medir antes de otimizar.
10. **Código dos exemplos do plano é rascunho,** não verdade absoluta. Valide com testes.
11. **Não invente bibliotecas, APIs ou versões.** Se não tiver certeza, consulte a documentação oficial
    antes de usar e anote a versão em `PROGRESS.md`.
12. **Mensagens ao usuário final em português (pt-BR)** via i18n desde o início.

## 8. Portão de revisão matemática (formato do relatório)

Ao fim de cada fase (e sempre que houver dúvida matemática), entregue ao revisor:

```
## Relatório de revisão — Fase N: <nome>

### 1. O que foi construído (em linguagem de cálculo)
...

### 2. Resultados numéricos vs. valores exatos
| Caso | Integral/expressão | Valor exato | Valor do app | Erro relativo |
|---|---|---|---|---|

### 3. Como conferir à mão (passo a passo curto)
Para 2 ou 3 casos: a integral iterada montada, com os limites, e o resultado.

### 4. O que o revisor deve olhar na tela
Lista de cenas para abrir (com a fórmula exata a digitar) e o que deve aparecer.

### 5. Convenções e escolhas que você fez e que merecem aprovação
...

### 6. O que NÃO foi verificado / limitações conhecidas
...

### 7. Pergunta final
"Aprova, aprova com ressalvas ou reprova?"
```

Marque no código e no `PROGRESS.md` qualquer dúvida de matemática com a etiqueta `[REVISAR-MATEMATICA]`.

## 9. O que fazer quando algo dá errado

- Falha de teste que você não entende: investigue; se persistir, reporte com a conta mostrando por que o valor
  esperado e o obtido divergem. Não "contorne".
- Resultado visual estranho: descreva o que esperava e o que viu; sugira hipóteses; não esconda.
- Escopo crescendo: anote a ideia no backlog (Seção 18 do plano ou `PROGRESS.md`) e continue na tarefa atual.
- Incerteza sobre uma decisão de produto ou convenção: **pergunte** (uma pergunta clara por vez, com
  sua recomendação).

## 10. Proibido

- Pular o portão de revisão de uma fase.
- Marcar tarefa como concluída com testes falhando, pulados (`skip`) ou removidos.
- Reduzir precisão/tolerância dos testes para passar.
- Refatorações grandes não relacionadas à tarefa.
- Adicionar dependências sem justificar em `PROGRESS.md` (nome, versão, motivo, licença).
- Apresentar suposições como fatos verificados.
