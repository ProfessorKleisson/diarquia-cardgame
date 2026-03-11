---
description: Guia Mestre de Manutenção e Arquitetura do Projeto Golpe
---

# Guia de Manutenção — Golpe (Card Game)
Este projeto é um jogo de cartas multiplayer em tempo real construído com React, Socket.io, Node.js e Tailwind CSS. **Como Agente, sempre leia este arquivo para entender a estrutura global antes de implementar qualquer nova funcionalidade ou corrigir bugs.**

## 1. Arquitetura do Backend (`/server`)
O backend foi modularizado para não ficar acoplado em um único `server.ts`. 
- `server/index.ts`: Ponto de entrada do backend. Inicializa o Express, HTTP Server e o Socket.IO.
- `server/context.ts`: Guarda as instâncias globais (como `io` e a variável `rooms` que contém o estado de todas as salas em memória).
- `server/types/index.ts`: Define as interfaces (`Card`, `Player`, `Room`, etc.) do Backend. **Importante:** Mantenha a sincronia com os tipos do frontend na pasta `src/types`.
- `server/cards/definitions.ts`: Contém os dados estáticos de todas as cartas. **Se precisar mudar poder, texto ou classe de alguma carta, é aqui.**
- `server/game/deck.ts` e `server/game/turn.ts`: Comportamentos básicos de jogo (sacar cartas, mudar rodadas, checar vitórias).
- `server/game/effects.ts`: O **coração do jogo**. Possui a função `applyCardEffect` (que define o que cada poder faz) e `checkCanBlock` (que define as regras de bloqueio entre cartas).
- `server/handlers/`:
  - `room.ts`: Funções de criar/entrar em sala, e trocar nome.
  - `cards.ts`: Lógica de jogar carta (`play_card`), responder a defesas e enviar seleções de alvo.
  - `choice.ts` e `rotate.ts`: Modais de decisões complexas ou giro de cartas na mesa (Rousseau/Robespierre).

### Como criar uma nova carta no Backend:
1. Adicione-a ao array `CARD_DEFINITIONS` em `server/cards/definitions.ts`. Dê a ela um `power` único (ex: `steal_10_coins`).
2. Vá em `server/game/effects.ts` e adicione um `case "steal_10_coins":` dentro de `applyCardEffect` para dar vida à habilidade.
3. Se a carta for de defesa, mapeie a lógica de bloqueio dentro de `checkCanBlock` no mesmo arquivo.

## 2. Arquitetura do Frontend (`/src`)
O frontend antes era um único gigante `App.tsx` (cerca de 2000 linhas), e foi refatorado em vários módulos. O `App.tsx` global serve só para conectar o Socket e prover roteamento na tela primária.

**Principais diretórios e arquivos:**
- `src/components/Game.tsx`: A principal e verdadeira "Mesa" onde o jogo acontece (comprimento de Mão, Tabuleiro Central, Deck). O `Game.tsx` orquestra a chamada de outros sub-componentes.
- `src/components/Lobby.tsx`: A tela de espera para configurar o host, código da sala e quantidade de jogadores.
- `src/components/modals/`: Se a carta exige uma ação específica do jogador (escolher, selecionar um alvo, ser atacado), um modal pop-up irá se abrir. Todos eles estão aqui. Exemplos: `TargetingOverlay`, `DefenseModal`, `CardSelectionModal`.
- `src/components/animations/`: Componentes visuais que não afetam estado (ex: `CoinShower.tsx`, `AnimatedCounter.tsx`, `AnimatedBackground.tsx`).
- `src/components/AnimationOverlay.tsx`: Um gerenciador global para desenhar e interpolar frames de "ataque e defesa" no meio da tela (animações do framer-motion de facas, escudos caindo, e cartas voando).

### Como criar uma nova funcionalidade no Frontend:
1. Evite inchar `Game.tsx` e `App.tsx`.
2. Se for um *step* que interrompe a UI normal aguardando reposta da pessoa, crie um **novo Modal** na pasta `modals/` que receba *props* simples e devolva `onSelect`/`onCancel` sem complexidade de socket lá dentro. Envie pelo `Game.tsx`.
3. Animações puramente visuais e complexas devem ir pro `AnimationOverlay` recebendo os nomes do agressor e alvo para processar as divs de UI.
4. Mantenha as classes do Tailwind e sempre confira por responsividade nos tamanhos usando `md:` e `lg:`.

## 3. Workflow Comum
Se você for solicitado a **"Consertar que o Jogador 1 não passa a carta para o Jogador 2"**:
- **PASSO 1**: Analise as requisições emitidas pelo modal Rotate/CardSelection do Frontend (`submit_card_selection`).
- **PASSO 2**: Olhe em qual handler backend (ex: `server/handlers/cards.ts` ou `rotate.ts`) essa ação é recebida por um `socket.on(...)`.
- **PASSO 3**: Faça a depuração e envie os novos dados consolidados usando `io.to(roomId).emit("room_update", room)`.
- **PASSO 4**: Reinicie a dev server ou construa a branch com `npm run build` para garantir pureza de código.

*Lembre-se da identidade visual rica e robusta: Dark theme base, contrastes em âmbar/dourado (`amber-500`), tipografia arrojada e uso intensivo de Tailwind com Framer-Motion. Sempre pense visualmente premium!*
