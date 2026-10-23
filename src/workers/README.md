# Web Workers

`surface.worker.ts` expõe `SurfaceCalculationService` por Comlink. A interface envia
fórmula, parâmetros, domínio e id do job; o Worker valida a expressão, estima sua
faixa amostrada e monta a malha da superfície.

A amostragem cede execução a cada oito linhas para receber cancelamentos. Cada novo
pedido cancela o job anterior, e o cliente confere o id antes de aplicar o resultado.
Posições, alturas e máscara de validade são transferidas como `ArrayBuffer`; a cena
Three.js continua responsável apenas por geometria, materiais e renderização.
