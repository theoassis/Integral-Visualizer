# F2-T5 — convergência e sólido de uma integral dupla

## O que a tela compara

Depois de calcular uma soma, o painel plota o erro absoluto
`|S(n,n) − I₆₄|` em escala log-log para `n = 4, 8, 16, 32, 64`. `I₆₄` é a
quadratura de Gauss–Legendre de ordem 64 em cada direção. A inclinação é ajustada
por mínimos quadrados em `(log n, log erro)` e apresentada como ordem observada
`p = −inclinação`.

Essa referência não é uma antiderivada simbólica nem um limite certificado para o
erro. Pontos com erro numericamente zero são omitidos do gráfico, pois `log(0)` não
está definido. A regra aleatória usa uma sequência determinística por expressão e
subdivisão para tornar o gráfico repetível, mas uma ordem isolada não caracteriza
estatisticamente o método de Monte Carlo.

## Camadas da cena

- **Superfície:** gráfico `z = f(x,y)`.
- **Prismas:** a soma retangular escolhida; alturas negativas ficam abaixo de `z=0`.
- **Sólido:** malha triangulada entre o gráfico amostrado e o plano `z=0`.
- **Ambos:** prismas e sólido juntos.

O sólido é uma aproximação geométrica baseada na malha refinada da superfície; para
funções que mudam de sinal, ele representa as regiões assinadas entre o gráfico e
`z=0`. Valores fora da faixa numérica ou buracos da função não viram paredes
artificiais. O valor numérico da integral continua sendo calculado separadamente.

## Exemplos de referência

| Integrando      | Domínio         | Valor exato | O que conferir                                                         |
| --------------- | --------------- | ----------: | ---------------------------------------------------------------------- |
| `x*y`           | `[0,1] × [0,1]` |       `1/4` | Ponto médio coincide com o valor; comparar as regras esquerda/direita. |
| `x^2+y^2`       | `[0,1]²`        |       `2/3` | Ponto médio observa ordem próxima de 2; esquerda, próxima de 1.        |
| `sin(x)*sin(y)` | `[0,π]²`        |         `4` | A soma melhora ao refinar a malha.                                     |
| `x-y`           | `[0,1]²`        |         `0` | Erro relativo fica indefinido quando o valor de referência é zero.     |

O caso A4 do plano também é coberto no núcleo: em coordenadas polares,
`x²+y² = r²` e `dA = r dr dθ`, logo
`∫₀²π∫₀¹ r³ dr dθ = 2π·(1/4) = π/2`. A função `integral2DiskPolar` aplica essa
substituição para integrar um disco centrado na origem; o editor de regiões e a
visualização polar seguem pertencendo à Fase 3.

## Roteiro manual

1. Selecione `x^2+y^2 em [0,1]²`, escolha ponto médio e calcule. A referência
   numérica deve ser `2/3`; a ordem observada deve ficar próxima de `2`.
2. Repita com a regra à esquerda. A ordem deve ficar próxima de `1`.
3. Alterne entre as quatro camadas da cena. O sólido ocupa o espaço entre o gráfico
   e `z=0`; a combinação deve manter a geometria dos prismas identificável.
4. Selecione `sin(x)*sin(y)` em `[0,π]²`. O valor exato listado no exemplo é `4`;
   compare-o com Gauss 64×64 e com as somas.
5. Selecione `x-y` em `[0,1]²`. Confirme que a simetria leva a zero e que a interface
   não apresenta erro relativo como número definido.
