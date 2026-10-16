# Integral Visualizer (IV)

Aplicação web para explorar visualmente superfícies, integrais múltiplas, cálculo diferencial e equações diferenciais. A especificação inicial está em [docs/plano_integral_visualizer.pdf](docs/plano_integral_visualizer.pdf); o trabalho segue as fases e os portões de revisão matemática descritos em [CLAUDE.md](CLAUDE.md) e [PROMPTS_FASES.md](PROMPTS_FASES.md).

## Estado atual

Fase 0 — preparação. A estrutura inicial para Vite, React e TypeScript está preparada. A primeira tarefa é F0-T1 (scaffolding, qualidade de código e CI); a cena 3D e os ADRs são tarefas posteriores.

## Começar no VS Code

Requisitos: Node.js 24 ou superior e pnpm 11.25.0.

```powershell
pnpm install
pnpm dev
```

Comandos disponíveis:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Estrutura

- `src/core/`: núcleo matemático puro, sem dependências de interface ou renderização.
- `src/ui/`: interface React.
- `src/render/`: renderização 3D.
- `src/state/`: estado serializável do projeto.
- `src/workers/`: cálculo fora da thread principal.
- `src/i18n/`: textos em português e inglês.
- `docs/`: plano, guia de revisão e decisões arquiteturais.

As pastas dos módulos ainda estão vazias por intenção: esta etapa prepara o repositório sem antecipar o protótipo da F0-T3.
