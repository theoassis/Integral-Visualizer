# ADR-002: Convenções matemáticas e geométricas

- **Status:** aceita conforme as convenções do projeto.
- **Data:** 2026-10-16
- **Contexto:** representações diferentes de ângulos, eixos e coordenadas podem tornar gráficos e integrais inconsistentes mesmo quando cada cálculo isolado parece plausível.

## Decisão

- A orientação cartesiana é `(x, y, z)` com **Z para cima** em toda a aplicação; a câmera 3D deve usar `up = (0, 0, 1)`.
- O núcleo usa **radianos**. Se a interface oferecer graus, converte na fronteira entre interface e núcleo e identifica a unidade mostrada.
- Em coordenadas polares: `x = r cos(θ)`, `y = r sen(θ)`, `r ≥ 0` e `dA = r dr dθ`.
- Em coordenadas cilíndricas: `x = r cos(θ)`, `y = r sen(θ)`, `z = z` e `dV = r dz dr dθ`.
- Em coordenadas esféricas, usa-se a convenção física: `ρ` é a distância à origem; `φ ∈ [0, π]` é medido a partir de `+z`; `θ ∈ [0, 2π]` é o azimute no plano `xy`; `x = ρ sen(φ) cos(θ)`, `y = ρ sen(φ) sen(θ)`, `z = ρ cos(φ)` e `dV = ρ² sen(φ) dρ dφ dθ`. A interface deve informar essa convenção.
- Variáveis implícitas são de uma letra; por exemplo, `xy` representa `x·y`. Funções aceitas e aliases são limitados à lista de `CLAUDE.md`.
- Valores não finitos (`NaN`, `+∞`, `−∞`) representam falhas/indefinições locais: a malha deve ter um buraco e exibir aviso, nunca inventar uma parede para fechar a superfície.
- A derivada simbólica é a preferência para gradientes; diferenças finitas servem como verificação independente nos testes.

## Consequências

- Fórmulas, limites e unidades devem ser apresentados explicitamente, sem alternar convenções esféricas silenciosamente.
- Testes matemáticos usam resultados exatos conhecidos antes da implementação do cálculo.
- Conversões de coordenadas e jacobianos pertencem ao núcleo matemático e devem ser testados separadamente da renderização.

## Referências

`CLAUDE.md` (seções 6 e 7), `docs/plano_integral_visualizer.pdf` (convenções e casos de referência) e `docs/REVISAO_MATEMATICA.md`.
