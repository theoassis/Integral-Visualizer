# REVISAO_MATEMATICA.md — Guia do revisor matemático

Este guia é para **você**, que confere a matemática enquanto a IA programa.
Você não precisa ler código. Precisa verificar se **números, formas e fórmulas** estão corretos.

## 1. Seu papel em uma frase

> A IA garante que o programa roda. Você garante que o programa **diz a verdade matemática**.

O maior risco de um projeto assim é um gráfico bonito com um número errado. Seu trabalho é achar isso.

## 2. Fluxo de uma revisão

1. A IA abre o portão e entrega o **relatório de revisão** (formato na seção 8 do `CLAUDE.md`).
2. Você faz as conferências abaixo (leva de 20 a 60 minutos por fase).
3. Você responde com **Aprova**, **Aprova com ressalvas** ou **Reprova**, usando o modelo da seção 7.
4. A IA só avança depois da sua resposta.

## 3. Ferramentas independentes para conferir (use pelo menos uma)

- **Papel e caneta** nos casos simples (marcados "à mão" abaixo).
- **Wolfram Alpha** ou calculadora de integrais online para integrais e derivadas.
- **GeoGebra** (2D/3D) para comparar o formato de superfícies e curvas de nível.
- **Seu livro-texto** (Stewart, Thomas) para conferir convenções (ângulos esféricos, Jacobianos).
- Peça à IA para gerar um **gabarito independente em Python (SymPy/SciPy)** quando o caso for novo.

## 4. Sinais de alerta (erros mais comuns em software de cálculo)

| Sinal                                                                      | Provável causa                                                        |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Integral em polar com valor "estranho"                                     | Faltou o fator **r** do Jacobiano                                     |
| Integral esférica errada por um fator                                      | Jacobiano diferente de **ρ² sen φ**; φ e θ trocados                   |
| Volume negativo onde deveria ser positivo                                  | Limites invertidos (g₁ > g₂) ou sinal de f                            |
| Resultado correto para retângulo e errado para outras regiões              | Limites de região mal montados; ordem dy dx trocada                   |
| Erro não diminui ao aumentar n                                             | Bug na regra de Riemann ou integrando descontínuo                     |
| Erro diminui "rápido demais"                                               | Teste ajustado para passar, ou comparação contra o próprio método     |
| Gradiente não perpendicular às curvas de nível                             | Derivada errada ou eixos x e y trocados                               |
| Gráfico espelhado ou girado                                                | Eixo Y/Z trocado (Three.js usa Y para cima por padrão)                |
| Senos/cossenos com valores absurdos                                        | Graus usados no lugar de radianos                                     |
| EDO "explode" ou fica fixa sem motivo                                      | Passo grande demais, sinal trocado na equação, parâmetro não aplicado |
| Equilíbrio classificado como sela/centro de forma incoerente com o gráfico | Jacobiana mal calculada                                               |

## 5. Checklists por fase (resumo; os detalhes estão em `PROMPTS_FASES.md`)

### Fase 1 — Superfícies

- [ ] `x^2+y^2` é paraboloide com mínimo em 0; `x^2-y^2` é sela.
- [ ] O eixo Z aponta para cima e o sistema é destro (x→, y→fundo, z↑).
- [ ] Clicando em um ponto, o valor de f mostrado confere com a sua conta.
- [ ] Descontinuidades (`1/x`, `tan(x)`) ficam como buracos, sem "paredes" falsas.

### Fase 2 — Integral dupla retangular

- [ ] `x*y` em [0,1]²: valor 1/4. `x^2+y^2` em [0,1]²: 2/3. `sin(x)*sin(y)` em [0,π]²: 4.
- [ ] Para funções crescentes, a soma esquerda subestima e a direita superestima quando as hipóteses se aplicam.
- [ ] Extremos encontrados por amostragem são apenas estimativas; não aceite a garantia inferior ≤ exato ≤ superior
      sem um método que certifique limites em toda a célula.
- [ ] Ao dobrar n: erro do ponto médio ÷4; da esquerda ÷2.
- [ ] Prismas: altura = f(ponto de amostra); soma dos volumes = S mostrado.

### Fase 3 — Regiões gerais e polar

- [ ] A integral iterada exibida tem os **limites corretos** (confira escrevendo você mesmo).
- [ ] Polar: aparece o fator r; disco com x²+y² dá π/2.
- [ ] Tipo I e tipo II da mesma região dão o mesmo valor.
- [ ] Massa com ρ=1 é igual à área; centro de massa em regiões simétricas está no eixo de simetria.

### Fase 4 — Diferencial multivariável

- [ ] ∇f perpendicular às curvas de nível e apontando para onde f cresce.
- [ ] Em (1,2) com f = x²+y²: ∇f = (2,4); D_u f (u = (3/5, 4/5)) = 4,4.
- [ ] Maior D_u f na direção do gradiente (valor |∇f|); zero na perpendicular.
- [ ] Plano tangente encosta na superfície e se afasta quadraticamente.
- [ ] Classificação de pontos críticos coerente com o formato da superfície.

### Fase 5 — Integral tripla

- [ ] Esfera: 4π/3 em cartesianas, cilíndricas e esféricas (os três coincidem).
- [ ] Jacobiano esférico é ρ² sen φ; φ ∈ [0, π] a partir de +z (confira com seu livro).
- [ ] Cone: π/3. Hemisfério, ∭ z dV = π/4. Esfera, ∭ (x²+y²) dV = 8π/15.
- [ ] Fatias: a área da seção da esfera em z é π(1−z²).
- [ ] Monte Carlo mostra erro estatístico e valor próximo ao exato.

### Fase 6 — EDOs

- [ ] `y'=y`: y(1) = e. RK4 ÷16 ao dividir h por 2; Euler ÷2.
- [ ] `x'=y, y'=−x`: círculos. Oscilador amortecido: espiral (c pequeno) e sem oscilar (c grande).
- [ ] Lorenz: equilíbrios (0,0,0) e (±√72, ±√72, 27); sensibilidade às condições iniciais.
- [ ] Classificação pelo traço e determinante da Jacobiana coerente com o retrato de fase.

### Fases 7 e 8

- [ ] Todos os exemplos da biblioteca dão o resultado esperado; termos em português corretos.
- [ ] Depois das otimizações, **nenhum valor de referência mudou**.

## 6. Como conferir "à mão" (cinco contas rápidas)

1. **∬ x·y dA em [0,1]²** = (∫₀¹ x dx)(∫₀¹ y dy) = (1/2)(1/2) = **1/4**.
2. **∬ (x²+y²) dA no disco unitário** = ∫₀^{2π}∫₀¹ r²·r dr dθ = 2π·(1/4) = **π/2**.
3. **Volume da esfera** = ∫₀^{2π}∫₀^{π}∫₀¹ ρ² sen φ dρ dφ dθ = 2π · 2 · (1/3) = **4π/3**.
4. **Gradiente de x²+y² em (1,2)** = (2x, 2y) = **(2, 4)**; D_u f = 2·(3/5) + 4·(4/5) = **4,4**.
5. **y' = y, y(0)=1** → y = eᵗ → y(1) = **2,71828…**

## 7. Modelos de resposta ao relatório da IA

**Aprovar:**

```
Fase N: APROVADA. Conferi <casos>. Pode avançar para a Fase N+1.
```

**Aprovar com ressalvas:**

```
Fase N: APROVADA COM RESSALVAS. Pode avançar, mas antes/durante a próxima fase corrija: <itens>.
Registre em PROGRESS.md.
```

**Reprovar:**

```
Fase N: REPROVADA no item "<item>".
Esperado: <valor/forma, com a conta>. Obtido: <o que o app mostrou>.
Como reproduzi: <fórmula digitada, região, n>.
Corrija conforme o prompt de reprovação (teste que reproduz o erro primeiro) e reabra o portão só para esse item.
```

**Dúvida de convenção** (por exemplo, ângulos esféricos):

```
Meu livro usa <convenção>. O app usa <convenção>. Qual é a decisão? Mostre o diagrama na interface e registre em ADR.
```

## 8. O que a IA NÃO deve fazer (e você pode cobrar)

- Mudar valor esperado ou tolerância de um teste para fazê-lo passar.
- Dizer "está correto" sem mostrar número exato × número do app.
- Pular a conferência visual sem avisar.
- Avançar de fase sem a sua resposta.

## 9. Anotações do revisor (preencha ao longo do projeto)

| Fase | Data | Resultado | Observações |
| ---- | ---- | --------- | ----------- |
| 0    |      |           |             |
| 1    |      |           |             |
| 2    |      |           |             |
| 3    |      |           |             |
| 4    |      |           |             |
| 5    |      |           |             |
| 6    |      |           |             |
| 7    |      |           |             |
| 8    |      |           |             |
