# ADR-003: Formato do estado do projeto

- **Status:** aceita para a primeira versão; evolução do schema exige migração explícita.
- **Data:** 2026-10-16
- **Contexto:** o estado de interação precisa ser editável com Zustand, processável por Workers e futuramente salvo em arquivo/link, sem depender de objetos internos do navegador ou da cena 3D.

## Decisão

- A sessão terá um **documento de projeto serializável em JSON**, separado do estado efêmero da interface. O estado ativo em Zustand pode conter ambos, mas o documento persistido deve ser extraível como dado simples.
- O documento terá `schemaVersion` obrigatório desde o primeiro formato persistido. Alterações incompatíveis aumentam a versão e recebem uma migração explícita antes de abrir documentos antigos.
- O documento armazena apenas dados declarativos: identificadores estáveis, expressões como texto, valores e parâmetros, limites/domínio, sistema de coordenadas e opções de visualização necessárias para reconstruir o projeto.
- O documento **não** armazena funções JavaScript, ASTs executáveis, `THREE.Object3D`, geometrias/materiais, referências DOM, instâncias de Worker, callbacks, caches ou buffers derivados. Esses valores são reconstruídos ou mantidos como estado transitório.
- Dados importados de arquivo ou link são entrada não confiável: validar versão, estrutura, limites numéricos e expressões antes de incorporá-los ao estado ativo. Rejeitar dados inválidos com mensagem compreensível; nunca executar conteúdo serializado.
- Mensagens para Workers são snapshots serializáveis dos dados necessários, identificados por `jobId`. Resultados só atualizam a interface se pertencerem ao trabalho ainda vigente.
- A implementação futura deve definir tipos e validação de runtime juntos; este ADR não escolhe uma biblioteca de schema antes da tarefa de importação/salvamento.

## Consequências

- Salvar/abrir e compartilhar poderão reconstruir a cena sem persistir estado interno do Three.js.
- Estado transitório de seleção, foco, painel aberto e progresso de cálculo não precisa contaminar o documento salvo.
- Uma versão de schema permite evoluir o formato sem presumir que todo arquivo venha da versão atual.

## Referências

`CLAUDE.md` (seções 5 e 7), `docs/plano_integral_visualizer.pdf` (modelo de estado) e `PROMPTS_FASES.md` (F0-T2 e F7-T1).
