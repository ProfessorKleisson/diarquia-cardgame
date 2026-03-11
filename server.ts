import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";

const PORT = 3000;

// Game Types
type CardClass =
  | "Golpe Partidário"
  | "Golpe Militar"
  | "Golpe Sorrateiro"
  | "Monarquia"
  | "Diarquia"
  | "Revolução"
  | "Liberais Clássicos"
  | "Golpe Religioso"
  | "Especial";

interface Card {
  id: string;
  class: CardClass;
  name: string;
  description: string;
  type: "attack" | "defense" | "benefit" | "special";
  power?: string; // Literal power description for logic mapping
  image?: string; // Relative path to image
}

interface Player {
  id: string;
  name: string;
  hand: Card[];
  visibleCard: Card | null;
  coins: number;
  isReady: boolean;
  connected: boolean;
  protectionTurns?: number;
  isSlaverOf?: string;
  isSlaveOf?: string;
  slaveryTurnsRemaining?: number;
  skipNextTurn?: boolean;
  preventCoup?: boolean;
  protectionCard?: Card | null;
}

interface Room {
  id: string;
  host: string;
  players: Player[];
  status: "waiting" | "playing" | "finished";
  currentTurnIndex: number;
  deck: Card[];
  discardPile: Card[];
  winner: string | null;
  winReason: "coins" | "triad" | "diarchy_coins" | "diarchy_triad" | null;
  maxPlayers: number;
  turnPhase: "start" | "action" | "end" | "waiting_defense" | "waiting_card_selection" | "waiting_choice" | "waiting_rotate_selection";
  pendingAction: {
    actorId: string;
    targetId?: string;
    card: Card;
  } | null;
  pendingChoice: {
    actorId: string;
    card: Card;
    targetId?: string;
    options: { id: string, label: string }[];
  } | null;
  pendingCardSelection: {
    actorId: string;
    targetId: string;
    targetHand: Card[];
    actionType: "eliminate" | "swap" | "give";
    card?: Card;
    canSkip?: boolean;
  } | null;
  pendingRotateSelection: {
    // Maps playerId -> cardId they chose to pass left
    selections: Record<string, string>;
    totalPlayers: number;
    card: Card; // the card used to trigger this
  } | null;
  isPublic: boolean;
  diarchy?: { player1Id: string, player2Id: string } | null;
}

const CARD_DEFINITIONS: Omit<Card, "id">[] = [
  // Diarquia
  { class: "Diarquia", name: "Dom Pedro II", description: "Saca 7 moedas ou Não pode ser bloqueada.", type: "benefit", power: "draw_7_coins", image: "/cards/Diarquia/Imperador Dom Pedro II.webp" },
  { class: "Diarquia", name: "Joaquim Nabuco", description: "Saca 3 moedas do monte. Não pode ser bloqueada.", type: "benefit", power: "draw_3_coins_unblockable", image: "/cards/Diarquia/Joaquim Nabuco.webp" },
  { class: "Diarquia", name: "José Bonifácio", description: "Escolha um oponente para impedi-lo de dar Golpe por 1 rodada. Não pode ser bloqueada.", type: "special", power: "prevent_coup", image: "/cards/Diarquia/José Bonifácio.webp" },
  { class: "Diarquia", name: "Princesa Isabel", description: "Forma uma diarquia por meio do casamento e pode trocar cartas com o outro rei durante todo o jogo. Não pode ser bloqueada.", type: "special", power: "marriage_diarchy", image: "/cards/Diarquia/Princesa Isabel.webp" },

  // Especial
  { class: "Especial", name: "Albert Camus", description: "Pega as cartas dos oponentes (menos de quem tem o rei), junta ao baralho, embaralha e redistribui. Não pode ser bloqueada.", type: "special", power: "redistribute_cards", image: "/cards/Especiais/Albert Camus.webp" },
  { class: "Especial", name: "Ayn Rand", description: "Protege o jogador de qualquer ataque por 3 turnos. Não pode ser bloqueado.", type: "defense", power: "protection_3_turns", image: "/cards/Especiais/Ayn Rand.webp" },
  { class: "Especial", name: "Bobo da Corte", description: "Age como um coringa, pode ser usado para completar a tríade. Não pode ser bloqueado.", type: "special", power: "joker", image: "/cards/Especiais/Bobo da corte.webp" },
  { class: "Especial", name: "René Descartes", description: "Revela uma carta da mão de um oponente de forma privada e pode escolher se troca ou não no monte. Pode ser bloqueado por Diógenes e Protágoras.", type: "special", power: "peek_and_swap", image: "/cards/Especiais/Descartes.webp" },
  { class: "Especial", name: "Diógenes, o cão", description: "Saca 2 novas cartas ou ignora ação de qualquer carta inimiga.", type: "special", power: "draw_2_or_block", image: "/cards/Especiais/Diógenes.webp" },
  { class: "Especial", name: "Escravidão", description: "Escraviza algum jogador por 2 rodadas, ele pode ver suas cartas e pode fazer o que quiser. Bloqueada por Liberais Clássicos e Diarquia.", type: "attack", power: "slavery", image: "/cards/Especiais/escravidão.webp" },
  { class: "Especial", name: "Hannah Arendt", description: "Bloqueia qualquer carta de Golpe Partidário ou Militar e o bloqueado perde suas cartas (fundo do baralho), tem que sacar novas.", type: "defense", power: "block_coups", image: "/cards/Especiais/Hannah Arendt.webp" },
  { class: "Especial", name: "Protágoras", description: "Troca uma carta com outro jogador de sua escolha. Não pode ser bloqueado.", type: "special", power: "swap_card", image: "/cards/Especiais/Protagoras.webp" },

  // Golpe Militar
  { class: "Golpe Militar", name: "Ato Institucional Nº5", description: "Passa a vez de um jogador. Bloqueado por Hannah Arendt ou Liberal.", type: "attack", power: "skip_turn", image: "/cards/Golpe Militar/Ato institucional n5.webp" },
  { class: "Golpe Militar", name: "Emílio Garrastazu Médici", description: "Passa a vez de um jogador. Bloqueado por Hannah Arendt ou Liberal.", type: "attack", power: "skip_turn", image: "/cards/Golpe Militar/Emílio Garrastazu Médici.webp" },
  { class: "Golpe Militar", name: "Deodoro da Fonseca", description: "Passa a vez de um jogador. Bloqueado por Hannah Arendt ou Liberal.", type: "attack", power: "skip_turn", image: "/cards/Golpe Militar/Marechal Deodoro.webp" },
  { class: "Golpe Militar", name: "Floriano Peixoto", description: "Passa a vez de um jogador. Bloqueado por Hannah Arendt ou Liberal.", type: "attack", power: "skip_turn", image: "/cards/Golpe Militar/Marechal Floriano Peixoto.webp" },

  // Golpe Partidário
  { class: "Golpe Partidário", name: "Adolf Hitler", description: "Elimina uma carta sua e uma das cartas do oponente. Bloqueado por Hannah Arendt ou Winston Churchill.", type: "attack", power: "double_elimination", image: "/cards/Golpe partidário/Adolf Hitler.webp" },
  { class: "Golpe Partidário", name: "Benito Mussolini", description: "Elimina uma das cartas do oponente. Bloqueado por Hannah Arendt ou Winston Churchill.", type: "attack", power: "eliminate_card", image: "/cards/Golpe partidário/Benito Mussolini.webp" },
  { class: "Golpe Partidário", name: "Joseph Goebbels", description: "Elimina uma das cartas do oponente. Bloqueado por Hannah Arendt ou Winston Churchill.", type: "attack", power: "eliminate_card", image: "/cards/Golpe partidário/Joseph Goebbels.webp" },
  { class: "Golpe Partidário", name: "Joseph Stalin", description: "Elimina uma das cartas do oponente. Bloqueado por Hannah Arendt.", type: "attack", power: "eliminate_card", image: "/cards/Golpe partidário/Joseph Stalin.webp" },

  // Liberais Clássicos
  { class: "Liberais Clássicos", name: "Adam Smith", description: "Saca 5 moedas do monte ou saca nova carta do baralho. Não pode ser bloqueado.", type: "benefit", power: "draw_5_or_card", image: "/cards/Liberais clássicos/Adam Smith.webp" },
  { class: "Liberais Clássicos", name: "John Locke", description: "Saca 5 moedas do monte ou saca nova carta do baralho. Não pode ser bloqueado.", type: "benefit", power: "draw_5_or_card", image: "/cards/Liberais clássicos/John Locke.webp" },
  { class: "Liberais Clássicos", name: "Voltaire", description: "Bloqueia qualquer Golpe Militar e qualquer carta de Golpe Religioso.", type: "defense", power: "block_military_religious", image: "/cards/Liberais clássicos/Voltaire.webp" },
  { class: "Liberais Clássicos", name: "Montesquieu", description: "Equilíbrio dos poderes. Proteção contra tirania.", type: "defense", power: "block_coups", image: "/cards/Liberais clássicos/Montesquieu.webp" },

  // Golpe Sorrateiro
  { class: "Golpe Sorrateiro", name: "Friedrich Nietzsche", description: "Saca 2 novas cartas ou ignora a ação de qualquer carta inimiga. Não pode ser bloqueado.", type: "special", power: "draw_2_or_block_unblockable", image: "/cards/Golpe sorrateiro/Friedrich Nietzsche.webp" },
  { class: "Golpe Sorrateiro", name: "Lourenço de Médici", description: "Toma 5 moedas de algum oponente. Não pode ser bloqueado.", type: "attack", power: "steal_5_coins", image: "/cards/Golpe sorrateiro/Lourenço de Médici.webp" },
  { class: "Golpe Sorrateiro", name: "Marco Júnio Bruto", description: "Elimina a carta do oponente ou troca uma carta sua com oponente. Bloqueado por Mão do Rei e José Bonifácio.", type: "attack", power: "eliminate_or_swap", image: "/cards/Golpe sorrateiro/Marco Júnio Bruto.webp" },
  { class: "Golpe Sorrateiro", name: "Nicolau Maquiavel", description: "Elimina uma carta ou obriga algum oponente a passar a vez. Não pode ser bloqueado.", type: "attack", power: "eliminate_or_skip", image: "/cards/Golpe sorrateiro/Nicolau Maquiavel.webp" },

  // Monarquia
  { class: "Monarquia", name: "Mão do Rei", description: "Forma uma diarquia por meio da diplomacia e pode trocar cartas with o outro rei durante todo o jogo. Não pode ser bloqueado.", type: "special", power: "diplomacy_diarchy", image: "/cards/Monarquia/Mão do rei.webp" },
  { class: "Monarquia", name: "Rainha Elizabeth II", description: "Saca uma moeda por rodada. Só pode ser eliminado por Golpe. Imuniza o jogador a embaralhamento.", type: "benefit", power: "passive_coin_and_immune", image: "/cards/Monarquia/Rainha Elizabeth II.webp" },
  { class: "Monarquia", name: "Thomas Hobbes", description: "Embaralha as cartas de um oponente e elimina aleatoriamente uma. Não pode ser bloqueado.", type: "attack", power: "shuffle_and_eliminate", image: "/cards/Monarquia/Thomas Hobbes.webp" },
  { class: "Monarquia", name: "Winston Churchill", description: "Determina algum jogador a trocar de carta virada para cima. Bloqueado por Revolução.", type: "special", power: "force_swap_visible", image: "/cards/Monarquia/Winston Churchill.webp" },

  // Golpe Religioso
  { class: "Golpe Religioso", name: "Cesar Borgia", description: "Elimina uma das cartas do oponente pagando 2 moedas. Não pode ser bloqueada.", type: "attack", power: "eliminate_card_cost_2", image: "/cards/Religiosa/Cesar Borgia.webp" },
  { class: "Golpe Religioso", name: "Inquisição", description: "Revela uma das cartas do oponente e escolhe uma para eliminar. Bloqueado por Liberal.", type: "attack", power: "peek_and_eliminate", image: "/cards/Religiosa/Inquisição do santo oficio.webp" },
  { class: "Golpe Religioso", name: "Templários", description: "Protege suas cartas de serem roubadas ou afetadas por 2 turnos. Bloqueado por César Borgia.", type: "defense", power: "protection_2_turns", image: "/cards/Religiosa/Templarios.webp" },
  { class: "Golpe Religioso", name: "Santo Agostinho", description: "Revela duas das cartas do oponente e escolhe uma para eliminar. Não pode ser bloqueado.", type: "attack", power: "peek_two_and_eliminate", image: "/cards/Religiosa/Santo Agostinho.webp" },

  // Revolução
  { class: "Revolução", name: "Jean-Jacques Rousseau", description: "Força todos os jogadores a passarem uma carta para a esquerda. Não pode ser bloqueado.", type: "special", power: "rotate_cards", image: "/cards/Revolução/Jean-Jacques Rousseau.webp" },
  { class: "Revolução", name: "Karl Marx", description: "Redistribui as moedas de forma igualitária. Se faltar moedas, pega no monte. Bloqueado por Liberais Clássicos.", type: "special", power: "redistribute_coins", image: "/cards/Revolução/Karl Marx.webp" },
  { class: "Revolução", name: "Maximilien Robespierre", description: "Força todos os jogadores a passarem uma carta para a esquerda. Não pode ser bloqueado.", type: "special", power: "rotate_cards", image: "/cards/Revolução/Maximilien Robespierre.webp" },
  { class: "Revolução", name: "Guilhotina", description: "Elimina uma carta do oponente, mas deve pagar 3 moedas. Não pode ser bloqueado.", type: "attack", power: "eliminate_card_cost_3", image: "/cards/Revolução/Revolução Francesa.webp" },
];

// Helper to check if a card is unblockable based on its description
function isCardUnblockable(card: Card | null | undefined): boolean {
  if (!card) return false;
  const desc = card.description.toLowerCase();
  return desc.includes("não pode ser bloqueada") || desc.includes("não pode ser bloqueado");
}

const rooms = new Map<string, Room>();

// Generate a standard deck
function generateDeck(): Card[] {
  const deck: Card[] = [];

  // Add each card from definition exactly once
  CARD_DEFINITIONS.forEach((def) => {
    deck.push({
      id: uuidv4(),
      ...def
    });
  });

  // Shuffle
  return deck.sort(() => Math.random() - 0.5);
}

// Helper to ensure a player always has a visible card if they have non-special cards
function ensureVisibleCard(player: Player) {
  // Check if current visible card is still in hand
  if (player.visibleCard) {
    const stillInHand = player.hand.some(c => c.id === player.visibleCard!.id);
    if (!stillInHand) {
      player.visibleCard = null;
    }
  }
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create_room", ({ playerName, maxPlayers, isPublic }, callback) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newRoom: Room = {
        id: roomId,
        host: socket.id,
        players: [
          {
            id: socket.id,
            name: playerName,
            hand: [],
            visibleCard: null,
            coins: 0,
            isReady: false,
            connected: true,
          },
        ],
        status: "waiting",
        currentTurnIndex: 0,
        deck: generateDeck(),
        discardPile: [],
        winner: null,
        winReason: null,
        maxPlayers,
        turnPhase: "start",
        isPublic: isPublic ?? false,
        pendingAction: null,
        pendingCardSelection: null,
        pendingChoice: null,
        pendingRotateSelection: null,
        diarchy: null,
      };
      rooms.set(roomId, newRoom);
      socket.join(roomId);
      callback({ success: true, roomId });
      io.to(roomId).emit("room_update", newRoom);
    });

    socket.on("join_room", ({ roomId, playerName }, callback) => {
      const room = rooms.get(roomId);
      if (!room) {
        return callback({ success: false, error: "Room not found" });
      }
      if (room.status !== "waiting") {
        return callback({ success: false, error: "Game already started" });
      }
      if (room.players.length >= room.maxPlayers) {
        return callback({ success: false, error: "Room is full" });
      }

      const existingPlayer = room.players.find((p) => p.id === socket.id);
      if (!existingPlayer) {
        room.players.push({
          id: socket.id,
          name: playerName,
          hand: [],
          visibleCard: null,
          coins: 0,
          isReady: false,
          connected: true,
        });
      } else {
        existingPlayer.name = playerName;
        existingPlayer.connected = true;
      }

      socket.join(roomId);
      callback({ success: true, roomId });
      io.to(roomId).emit("room_update", room);
    });

    socket.on("join_random_room", ({ playerName }, callback) => {
      // Find a public room that is waiting and has space
      const availableRooms = Array.from(rooms.values()).filter(
        (r) => r.isPublic === true && r.status === "waiting" && r.players.length < r.maxPlayers
      );

      if (availableRooms.length === 0) {
        return callback({ success: false, error: "Nenhuma sala pública disponível no momento." });
      }

      // Pick a random available room
      const room = availableRooms[Math.floor(Math.random() * availableRooms.length)];

      const existingPlayer = room.players.find((p) => p.id === socket.id);
      if (!existingPlayer) {
        room.players.push({
          id: socket.id,
          name: playerName,
          hand: [],
          visibleCard: null,
          coins: 0,
          isReady: false,
          connected: true,
        });
      }

      socket.join(room.id);
      callback({ success: true, roomId: room.id });
      io.to(room.id).emit("room_update", room);
    });

    socket.on("toggle_ready", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (player) {
        player.isReady = !player.isReady;
        io.to(roomId).emit("room_update", room);
      }
    });

    socket.on("leave_room", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      room.players = room.players.filter(p => p.id !== socket.id);
      socket.leave(roomId);

      if (room.players.length === 0) {
        rooms.delete(roomId);
      } else {
        if (room.host === socket.id) {
          room.host = room.players[0].id; // Reassign host
        }
        io.to(roomId).emit("room_update", room);
      }
    });

    socket.on("restart_game", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.host !== socket.id) return; // Only host can restart

      room.status = "waiting";
      room.winner = null;
      room.winReason = null;
      room.deck = generateDeck();
      room.discardPile = [];
      room.pendingAction = null;
      room.pendingCardSelection = null;
      room.diarchy = null;

      room.players.forEach(p => {
        p.hand = [];
        p.visibleCard = null;
        p.coins = 0;
        p.isReady = false;
        p.protectionTurns = 0;
        p.skipNextTurn = false;
        p.protectionCard = null;
      });

      io.to(roomId).emit("room_update", room);
    });

    socket.on("start_game", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.host !== socket.id) return;
      if (room.players.length < 2) return;
      if (!room.players.every((p) => p.isReady)) return;

      room.status = "playing";
      room.currentTurnIndex = 0;
      room.turnPhase = "start";

      // Deal 4 cards to each player
      room.players.forEach((player) => {
        player.hand = room.deck.splice(0, 4);
        ensureVisibleCard(player);
      });

      io.to(roomId).emit("room_update", room);
    });

    socket.on("set_visible_card", ({ roomId, cardId }) => {
      console.log(`[set_visible_card] Received request from ${socket.id} in room ${roomId} for card ${cardId}`);
      const room = rooms.get(roomId);
      if (!room) { console.log("[set_visible_card] Room not found"); return; }
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) { console.log("[set_visible_card] Player not found"); return; }

      const cardIndex = player.hand.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) { console.log(`[set_visible_card] Card not found in hand. Hand IDs: ${player.hand.map(c => c.id).join(", ")}`); return; }

      const card = player.hand[cardIndex];
      if (card.class === "Especial") { console.log("[set_visible_card] Card is Special, rejecting"); return; }

      console.log(`[set_visible_card] Successfully setting visible card to ${card.name} (${card.id})`);
      // Do not remove the card from the hand, just set it as visible
      player.visibleCard = card;

      io.to(roomId).emit("room_update", room);
    });

    socket.on("take_coins", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.players[room.currentTurnIndex].id !== socket.id) return;
      if (room.turnPhase !== "start") return;

      const player = room.players[room.currentTurnIndex];

      // Escravidão: if slave takes coins, they go to the enslaver
      if (player.isSlaveOf) {
        const enslaver = room.players.find(p => p.id === player.isSlaveOf);
        if (enslaver) {
          enslaver.coins += 2;
          io.to(room.id).emit("chat_message", {
            sender: "Sistema",
            text: `⛓️ ${player.name} é escravo — as 2 moedas sacar foram para ${enslaver.name}.`
          });
        }
        // slave gains nothing
      } else {
        player.coins += 2;
        io.to(roomId).emit("play_animation", {
          type: "gain_coins", attackerName: player.name, amount: 2, targetName: player.name
        });
      }

      checkWinCondition(room);
      nextTurn(room.id);
    });

    socket.on("draw_card", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.players[room.currentTurnIndex].id !== socket.id) return;
      if (room.turnPhase !== "start") return;

      const player = room.players[room.currentTurnIndex];
      if (room.deck.length > 0) {
        const drawnCard = room.deck.shift()!;
        player.hand.push(drawnCard);

        // Private: only the drawer sees which card they got
        io.to(socket.id).emit("play_animation", {
          type: "draw",
          attackerName: player.name,
          targetCard: drawnCard,
          targetName: player.name
        });
        // Public: opponents see a card being drawn, but NOT its face
        io.to(roomId).except(socket.id).emit("play_animation", {
          type: "draw",
          attackerName: player.name,
          targetCard: null,
          targetName: player.name
        });
      }
      ensureVisibleCard(player);
      room.turnPhase = "action"; // Must play a card now

      checkWinCondition(room);
      io.to(roomId).emit("room_update", room);
    });

    socket.on("draw_from_discard", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.players[room.currentTurnIndex].id !== socket.id) return;
      if (room.turnPhase !== "start") return;
      if (room.discardPile.length === 0) return;

      const player = room.players[room.currentTurnIndex];
      const drawnCard = room.discardPile.pop()!;
      player.hand.push(drawnCard);

      // The discard pile IS public — everyone can see which card was taken from there
      io.to(roomId).emit("play_animation", {
        type: "draw",
        attackerName: player.name,
        targetCard: drawnCard,
        targetName: player.name
      });
      ensureVisibleCard(player);
      room.turnPhase = "action"; // Must play a card now

      checkWinCondition(room);
      io.to(roomId).emit("room_update", room);
    });

    socket.on("play_card", ({ roomId, cardId, targetPlayerId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.players[room.currentTurnIndex].id !== socket.id) return;
      if (room.turnPhase !== "action") return;

      const player = room.players[room.currentTurnIndex];
      const cardIndex = player.hand.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) return;

      const card = player.hand[cardIndex];
      const target = targetPlayerId ? room.players.find(p => p.id === targetPlayerId) : null;

      // Restrição de Escravidão: O escravizado OBRIGATORIAMENTE deve jogar carta de benefício se possuir alguma.
      if (player.isSlaveOf && card.type !== "benefit") {
        const hasBenefit = player.hand.some(c => c.type === "benefit");
        if (hasBenefit) {
          io.to(socket.id).emit("chat_message", {
            sender: "Sistema",
            text: "⛓️ Você é escravo! Você TEM uma carta de benefício na mão e é OBRIGADO a jogá-la."
          });
          return; // A ação não é computada, espera ele escolher a correta
        }
      }

      // Check if card is blockable
      const isUnblockable = card.description.toLowerCase().includes("não pode ser bloqueada") ||
        card.description.toLowerCase().includes("não pode ser bloqueado");

      // Coin check for cards that cost money
      if (card.power === "eliminate_card_cost_2" && player.coins < 2) {
        io.to(socket.id).emit("action_error", { message: "❌ Você não tem as 2 moedas necessárias para usar esta carta." });
        return;
      }
      if (card.power === "eliminate_card_cost_3" && player.coins < 3) {
        io.to(socket.id).emit("action_error", { message: "❌ Você não tem as 3 moedas necessárias para usar esta carta." });
        return;
      }


      if (target && (card.type === "attack" || card.power === "peek_and_swap" || card.power === "slavery" || card.power === "peek_and_eliminate" || card.power?.startsWith("eliminate") || card.power === "skip_turn" || card.power === "force_swap_visible" || card.power === "shuffle_and_eliminate") && card.power !== "peek_two_and_eliminate") {
        // 1. PROTECTION (IMMUNITY) CHECK - Passive state from Ayn Rand, Templários, etc.
        // Immunity stops EVERYTHING targeted, even unblockable attacks.
        if (target.protectionTurns && target.protectionTurns > 0) {
          io.to(roomId).emit("chat_message", {
            sender: "Sistema",
            text: `🛡️ IMUNIDADE! ${target.name} está sob a proteção de ${target.protectionCard?.name || "uma carta"} e o efeito de ${card.name} falhou.`
          });
          player.hand.splice(cardIndex, 1);
          room.discardPile.push(card);
          ensureVisibleCard(player);
          checkWinCondition(room);
          nextTurn(room.id);
          return;
        }

        // 2. DEFENSE (BLOCKING) PHASE
        // Targeted cards enter this phase so Diógenes/Nietzsche can "ignore" them (even if unblockable).
        player.hand.splice(cardIndex, 1);
        room.discardPile.push(card);
        ensureVisibleCard(player);

        room.pendingAction = {
          actorId: player.id,
          targetId: target.id,
          card: card
        };
        room.turnPhase = "waiting_defense";
        io.to(roomId).emit("room_update", room);
        io.to(target.id).emit("defense_required", { attackerName: player.name, cardName: card.name });
      } else {
        // Execute immediately (No target or special benefit/diarchy)
        player.hand.splice(cardIndex, 1);
        room.discardPile.push(card);
        ensureVisibleCard(player);

        applyCardEffect(room, player, card, targetPlayerId);
        const currentPhase = room.turnPhase as string;
        if (currentPhase !== "waiting_choice" && currentPhase !== "waiting_card_selection") {
          checkWinCondition(room);
          nextTurn(room.id);
        } else {
          checkWinCondition(room);
          io.to(roomId).emit("room_update", room);
        }
      }
    });

    socket.on("respond_defense", ({ roomId, action, defenseCardId }) => {
      const room = rooms.get(roomId);
      if (!room || !room.pendingAction) return;
      if (room.pendingAction.targetId !== socket.id) return;

      const target = room.players.find(p => p.id === socket.id)!;
      const actor = room.players.find(p => p.id === room.pendingAction!.actorId)!;
      const { card: attackCard } = room.pendingAction;

      let defenseSuccessful = false;

      if (action === "defend" && defenseCardId) {
        const defenseCardIndex = target.hand.findIndex(c => c.id === defenseCardId);
        if (defenseCardIndex !== -1) {
          const defenseCard = target.hand[defenseCardIndex];

          // Logic to check if defenseCard blocks attackCard
          // Simplified: check for keywords in description or specific power matches
          const canBlock = checkCanBlock(defenseCard, attackCard);

          if (canBlock) {
            defenseSuccessful = true;
            target.hand.splice(defenseCardIndex, 1);
            room.discardPile.push(defenseCard);

            // Draw a replacement card for the defense card used
            if (room.deck.length > 0) {
              target.hand.push(room.deck.pop()!);
            }
            ensureVisibleCard(target);

            // Notify everyone: blocker used defense card and drew a replacement
            io.to(roomId).emit("play_animation", {
              type: "block_draw",
              attackerName: target.name,   // the defender (they "acted")
              attackerCard: defenseCard,   // the card used to block
              targetName: actor.name       // the one who was blocked
            });
            io.to(roomId).emit("chat_message", {
              sender: "Sistema",
              text: `🛡️ ${target.name} bloqueou o ataque de ${actor.name} com ${defenseCard.name} e sacou uma nova carta do baralho!`
            });

            // Apply defense card effect if it's a protection power
            if (defenseCard.power?.startsWith("protection_")) {
              applyCardEffect(room, target, defenseCard);
              io.to(roomId).emit("room_update", room); // Send update early to show sideways card
            }

            // Handle specific counter-effects (like Hannah Arendt)
            if (defenseCard.power === "block_coups") {
              const oldHandSize = actor.hand.length;
              // Actor loses cards to bottom of deck and draws new ones
              room.deck.push(...actor.hand);
              actor.hand = room.deck.splice(0, 4); // Draw full hand of 4
              room.deck.sort(() => Math.random() - 0.5);
              ensureVisibleCard(actor);
              io.to(room.id).emit("chat_message", {
                sender: "Sistema",
                text: `⚖️ Hannah Arendt agiu! ${actor.name} perdeu sua mão e teve que sacar novas cartas.`
              });
            }
          }
        }
      }

      if (!defenseSuccessful) {
        // Apply the effect
        applyCardEffect(room, actor, attackCard, target.id);
      }

      room.pendingAction = null;
      checkWinCondition(room);

      // Don't advance turn if card effect requires player input (card selection or choice)
      const afterPhase = room.turnPhase as string;
      if (afterPhase !== "waiting_card_selection" && afterPhase !== "waiting_choice") {
        nextTurn(room.id);
      } else {
        io.to(roomId).emit("room_update", room);
      }
    });

    socket.on("submit_card_selection", ({ roomId, selectedCardId, action }) => {
      const room = rooms.get(roomId);
      if (!room || !room.pendingCardSelection) return;
      if (room.pendingCardSelection.actorId !== socket.id) return;

      const selection = room.pendingCardSelection;
      const target = room.players.find(p => p.id === selection.targetId);
      const actor = room.players.find(p => p.id === socket.id);

      if (!target || !actor) return;

      // --- SKIP action: player chose not to swap/do anything ---
      if (selectedCardId === "skip") {
        io.to(room.id).emit("chat_message", {
          sender: "Sistema",
          text: `🔍 ${actor.name} preferiu não trocar.`
        });
        room.pendingCardSelection = null;
        checkWinCondition(room);
        nextTurn(room.id);
        return;
      }

      // --- GIVE action (Protágoras): actor picks from their OWN hand ---
      if (action === "give") {
        const givenIndex = actor.hand.findIndex(c => c.id === selectedCardId);
        if (givenIndex !== -1) {
          const givenCard = actor.hand.splice(givenIndex, 1)[0];
          // Take random card from target in return
          if (target.hand.length > 0) {
            const rndIdx = Math.floor(Math.random() * target.hand.length);
            const takenCard = target.hand.splice(rndIdx, 1)[0];
            actor.hand.push(takenCard);
          }
          target.hand.push(givenCard);
          ensureVisibleCard(actor);
          ensureVisibleCard(target);
          io.to(roomId).emit("play_animation", {
            type: "swap", attackerName: actor.name, attackerCard: room.pendingCardSelection?.card || null, targetName: target.name
          });
          io.to(room.id).emit("chat_message", {
            sender: "Sistema",
            text: `🔄 ${actor.name} trocou uma carta com ${target.name}.`
          });
        }
        room.pendingCardSelection = null;
        checkWinCondition(room);
        nextTurn(room.id);
        return;
      }
      const targetCardIndex = target.hand.findIndex(c => c.id === selectedCardId);

      if (targetCardIndex !== -1) {
        const removedCard = target.hand.splice(targetCardIndex, 1)[0];

        if (action === "eliminate") {
          room.discardPile.push(removedCard);
          ensureVisibleCard(target);
          io.to(roomId).emit("play_animation", {
            type: "eliminate",
            attackerName: actor.name,
            attackerCard: room.pendingCardSelection?.card || null,
            targetName: target.name,
            targetCard: removedCard
          });
        } else if (action === "swap") {
          // Descartes: swap target's chosen card with TOP of deck
          if (room.deck.length > 0) {
            const deckCard = room.deck.shift()!;
            target.hand.push(deckCard);
            room.deck.push(removedCard); // Put chosen card at bottom of deck
          } else {
            // No cards in deck — just return chosen card to target
            target.hand.push(removedCard);
          }
          ensureVisibleCard(target);
          io.to(roomId).emit("play_animation", {
            type: "swap", attackerName: actor.name, attackerCard: room.pendingCardSelection?.card || null, targetName: target.name
          });
        }
      }

      room.pendingCardSelection = null;
      checkWinCondition(room);
      nextTurn(room.id);
    });

    socket.on("submit_choice", ({ roomId, choiceId }) => {
      const room = rooms.get(roomId);
      if (!room || !room.pendingChoice) return;
      if (room.pendingChoice.actorId !== socket.id) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      const choice = choiceId;
      const cardPower = room.pendingChoice.card.power;

      if (cardPower === "draw_5_or_card") {
        if (choice === "coins") {
          player.coins += 5;
          io.to(roomId).emit("play_animation", {
            type: "gain_coins", attackerName: player.name, amount: 5, targetName: player.name
          });
          io.to(roomId).emit("chat_message", {
            sender: "Sistema",
            text: `💰 ${player.name} escolheu 5 moedas via efeito liberal.`
          });
        } else if (choice === "card") {
          if (room.deck.length > 0) {
            const drawnCard = room.deck.shift()!;
            player.hand.push(drawnCard);
            io.to(roomId).emit("play_animation", {
              type: "draw",
              attackerName: player.name,
              targetCard: drawnCard,
              targetName: player.name
            });
            io.to(roomId).emit("chat_message", {
              sender: "Sistema",
              text: `🎴 ${player.name} escolheu sacar uma carta via efeito liberal.`
            });
          }
        }
      } else if (cardPower === "eliminate_or_swap") {
        const target = room.players.find(p => p.id === room.pendingChoice!.targetId);
        if (!target) return;

        if (choice === "eliminate") {
          if (target.hand.length > 0) {
            const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
            room.discardPile.push(removed);
            ensureVisibleCard(target);
            io.to(roomId).emit("play_animation", {
              type: "eliminate", attackerName: player.name, attackerCard: room.pendingChoice.card, targetName: target.name, targetCard: removed
            });
            io.to(roomId).emit("chat_message", { sender: "Sistema", text: `🗡️ ${player.name} eliminou uma carta de ${target.name} via Bruto.` });
          }
        } else if (choice === "swap") {
          // Trigger card selection to give a card
          room.pendingChoice = null;
          room.turnPhase = "waiting_card_selection";
          room.pendingCardSelection = {
            actorId: player.id,
            targetId: target.id,
            targetHand: [...player.hand],
            actionType: "give"
          };
          io.to(roomId).emit("room_update", room);
          return; // Don't end turn yet
        }
      } else if (cardPower === "eliminate_or_skip") {
        const target = room.players.find(p => p.id === room.pendingChoice!.targetId);
        if (!target) return;

        if (choice === "eliminate") {
          if (target.hand.length > 0) {
            const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
            room.discardPile.push(removed);
            ensureVisibleCard(target);
            io.to(roomId).emit("play_animation", {
              type: "eliminate", attackerName: player.name, attackerCard: room.pendingChoice.card, targetName: target.name, targetCard: removed
            });
            io.to(roomId).emit("chat_message", { sender: "Sistema", text: `🗡️ ${player.name} eliminou uma carta de ${target.name} via Maquiavel.` });
          }
        } else if (choice === "skip") {
          target.skipNextTurn = true;
          io.to(roomId).emit("play_animation", {
            type: "skip", attackerName: player.name, attackerCard: room.pendingChoice.card, targetName: target.name
          });
          io.to(roomId).emit("chat_message", { sender: "Sistema", text: `⏳ ${player.name} forçou ${target.name} a passar a vez via Maquiavel.` });
        }
      }

      room.pendingChoice = null;
      checkWinCondition(room);
      nextTurn(room.id);
    });

    // ─── Rousseau / Robespierre: collect each player's card choice ───────────
    socket.on("submit_rotate_selection", ({ roomId, selectedCardId }) => {
      const room = rooms.get(roomId);
      if (!room || !room.pendingRotateSelection) return;
      if (room.turnPhase !== "waiting_rotate_selection") return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      // Validate the chosen card is actually in player's hand
      const hasCard = player.hand.some(c => c.id === selectedCardId);
      if (!hasCard) return;

      // Record this player's selection
      room.pendingRotateSelection.selections[socket.id] = selectedCardId;

      const submittedCount = Object.keys(room.pendingRotateSelection.selections).length;
      const totalPlayers = room.pendingRotateSelection.totalPlayers;

      // Notify others that this player chose
      io.to(roomId).emit("chat_message", {
        sender: "Sistema",
        text: `✅ ${player.name} escolheu uma carta para passar.`
      });

      // Emit partial update so UI can reflect waiting status
      io.to(roomId).emit("room_update", room);

      if (submittedCount < totalPlayers) return; // Still waiting for others

      // --- All players have chosen: execute the rotation ---
      const n = room.players.length;
      const selections = room.pendingRotateSelection.selections;

      // Collect chosen cards (removing from each player's hand)
      const chosenCards: { fromIndex: number; card: Card }[] = [];
      for (let i = 0; i < n; i++) {
        const p = room.players[i];
        const chosenId = selections[p.id];
        const cardIdx = p.hand.findIndex(c => c.id === chosenId);
        if (cardIdx === -1) continue; // safety
        const [card] = p.hand.splice(cardIdx, 1);
        chosenCards.push({ fromIndex: i, card });
      }

      // Give each chosen card to the player on the LEFT (index - 1)
      for (const { fromIndex, card } of chosenCards) {
        const leftIndex = (fromIndex - 1 + n) % n;
        room.players[leftIndex].hand.push(card);
      }

      // Update visible cards for all
      room.players.forEach(p => ensureVisibleCard(p));

      // Clear state and advance turn
      room.pendingRotateSelection = null;

      io.to(roomId).emit("chat_message", {
        sender: "Sistema",
        text: `🔄 Revolução concluída! Cada jogador passou uma carta para o jogador à esquerda.`
      });
      io.to(roomId).emit("play_animation", {
        type: "swap",
        attackerName: "Todos",
        targetName: "Todos"
      });

      checkWinCondition(room);
      nextTurn(room.id);
    });

    function checkCanBlock(defenseCard: Card, attackCard: Card): boolean {
      const desc = defenseCard.description.toLowerCase();
      const atkClass = attackCard.class.toLowerCase();
      const isAtkUnblockable = isCardUnblockable(attackCard);

      // 1. IMMUNITY CARDS (Active protection powers)
      // These can block ANY attack, even unblockable ones.
      if (defenseCard.power?.startsWith("protection_")) return true;
      if (defenseCard.power === "draw_2_or_block" || defenseCard.power === "draw_2_or_block_unblockable") return true;

      // 2. STANDARD DEFENSES
      // If the attack is unblockable, standard defenses FAIL.
      if (isAtkUnblockable) return false;

      // Protágoras: blocks René Descartes specifically
      if (defenseCard.power === "swap_card" && attackCard.power === "peek_and_swap") return true;

      if (defenseCard.power === "block_coups" && (atkClass.includes("militar") || atkClass.includes("partidário"))) return true;
      if (defenseCard.power === "block_military_religious" && (atkClass.includes("militar") || atkClass.includes("religioso"))) return true;
      if (desc.includes("bloqueia") && desc.includes(atkClass)) return true;

      // Escravidão: blocked by Liberais Clássicos and Diarquia
      if (attackCard.power === "slavery" && (defenseCard.class === "Liberais Clássicos" || defenseCard.class === "Diarquia")) return true;

      // ANY card from Liberais Clássicos blocks Golpe Militar
      if (defenseCard.class === "Liberais Clássicos" && atkClass.includes("militar")) return true;

      // Winston Churchill blocks Golpe Partidário (except Stalin)
      if (defenseCard.name === "Winston Churchill" && atkClass.includes("partidário") && attackCard.name !== "Joseph Stalin") return true;

      // Winston Churchill blocked by any Revolução card
      if (attackCard.name === "Winston Churchill" && defenseCard.class === "Revolução") return true;

      // Marco Júnio Bruto blocked by Mão do Rei or José Bonifácio
      if (attackCard.name === "Marco Júnio Bruto" && (defenseCard.name === "Mão do Rei" || defenseCard.name === "José Bonifácio")) return true;

      // Inquisição blocked by any Liberal card
      if (attackCard.name === "Inquisição" && defenseCard.class === "Liberais Clássicos") return true;

      // Karl Marx blocked by Liberais Clássicos
      if (attackCard.name === "Karl Marx" && defenseCard.class === "Liberais Clássicos") return true;

      return false;
    }

    function applyCardEffect(room: Room, player: Player, card: Card, targetPlayerId?: string) {
      const target = targetPlayerId ? room.players.find(p => p.id === targetPlayerId) : null;

      // Protection check: Attack-type cards fail if target is protected
      if (target && target.protectionTurns && target.protectionTurns > 0) {
        if (card.type === "attack") {
          console.log(`Attack from ${player.name} blocked by ${target.name}'s protection`);
          return;
        }
      }

      const preActionCoins = player.coins;

      switch (card.power) {
        case "draw_7_coins":
          player.coins += 7;
          io.to(room.id).emit("play_animation", { type: "gain_coins", attackerName: player.name, amount: 7, targetName: player.name });
          break;
        case "draw_3_coins_unblockable":
          player.coins += 3;
          io.to(room.id).emit("play_animation", { type: "gain_coins", attackerName: player.name, amount: 3, targetName: player.name });
          break;
        case "prevent_coup":
          if (target) {
            target.preventCoup = true;
            io.to(room.id).emit("chat_message", {
              sender: "Sistema",
              text: `🛡️ José Bonifácio age! ${target.name} não pode vencer (dar Golpe) nesta rodada.`
            });
          }
          break;

        case "marriage_diarchy":
        case "diplomacy_diarchy": {
          if (target) {
            // ── Troca de carta (poder principal da Mão do Rei / Princesa Isabel) ──
            if (target.hand.length > 0 && player.hand.length > 0) {
              // Pick a random card from each side
              const actorIdx = Math.floor(Math.random() * player.hand.length);
              const targetIdx = Math.floor(Math.random() * target.hand.length);
              const actorCard = player.hand[actorIdx];
              const targetCard = target.hand[targetIdx];

              // Swap
              player.hand[actorIdx] = targetCard;
              target.hand[targetIdx] = actorCard;

              ensureVisibleCard(player);
              ensureVisibleCard(target);

              // Reveal the swapped card only to the respective owner
              io.to(player.id).emit("play_animation", {
                type: "swap",
                attackerName: player.name,
                attackerCard: card,
                targetName: target.name,
                targetCard: targetCard // actor receives this card
              });
              io.to(target.id).emit("play_animation", {
                type: "swap",
                attackerName: player.name,
                attackerCard: card,
                targetName: target.name,
                targetCard: actorCard // target receives this card
              });
              // Others just see that a swap happened
              io.to(room.id).except(player.id).except(target.id).emit("play_animation", {
                type: "swap",
                attackerName: player.name,
                attackerCard: card,
                targetName: target.name
              });

              io.to(room.id).emit("chat_message", {
                sender: "Sistema",
                text: `🔄 ${player.name} trocou uma carta com ${target.name} via ${card.name}.`
              });
            }

            // ── Diarquia (condição especial) ──
            const actorHasPedro = player.hand.some(c => c.name === "Dom Pedro II");
            const actorHasElizabeth = player.hand.some(c => c.name === "Rainha Elizabeth II");
            const targetHasPedro = target.hand.some(c => c.name === "Dom Pedro II");
            const targetHasElizabeth = target.hand.some(c => c.name === "Rainha Elizabeth II");

            const hasPedro = actorHasPedro || targetHasPedro;
            const hasElizabeth = actorHasElizabeth || targetHasElizabeth;

            if (hasPedro && hasElizabeth) {
              room.diarchy = { player1Id: player.id, player2Id: target.id };
              io.to(room.id).emit("chat_message", { sender: "Sistema", text: `👑 Diarquia firmada entre ${player.name} e ${target.name}!` });
            }
          }
          break;
        }
        case "redistribute_cards":
          // Albert Camus: exempt players who have 'Dom Pedro II' or 'Rainha Elizabeth II' by name
          const cardsToRedistribute: Card[] = [];
          room.players.forEach(p => {
            if (p.id === player.id) return;
            const hasRoyalty = p.hand.some(c =>
              c.name === "Dom Pedro II" || c.name === "Rainha Elizabeth II"
            );
            if (!hasRoyalty) {
              cardsToRedistribute.push(...p.hand);
              p.hand = [];
            }
          });
          room.deck.push(...cardsToRedistribute);
          room.deck.sort(() => Math.random() - 0.5);
          room.players.forEach(p => {
            if (p.id === player.id) return;
            if (!p.hand.length) { // Only deal to those whose cards were taken
              p.hand = room.deck.splice(0, 4);
            }
          });
          room.players.forEach(p => ensureVisibleCard(p));
          break;
        case "protection_3_turns":
          player.protectionTurns = 3;
          player.protectionCard = card;
          break;
        case "protection_2_turns":
          player.protectionTurns = 2;
          player.protectionCard = card;
          break;

        case "draw_2_or_block":
        case "draw_2_or_block_unblockable":
          player.hand.push(...room.deck.splice(0, 2));
          break;
        case "slavery":
          if (target) {
            target.isSlaveOf = player.id;
            target.slaveryTurnsRemaining = 2;
            player.isSlaverOf = target.id;
            io.to(room.id).emit("chat_message", {
              sender: "Sistema",
              text: `⛓️ ${player.name} escravizou ${target.name} por 2 rodadas! Seus ganhos vão para o escravizador.`
            });
            io.to(target.id).emit("chat_message", {
              sender: "Sistema",
              text: `⛓️ Você está escravizado! Deve sacar 2 moedas ou usar carta de benefício. Tudo o que ganhar vai para ${player.name}.`
            });
          }
          break;
        case "block_coups":
          // Reactive power, handle elsewhere or give a buff
          break;
        case "swap_card":
          // Protágoras: actor picks from THEIR OWN hand to give; target card is random
          if (target && target.hand.length > 0 && player.hand.length > 0) {
            room.turnPhase = "waiting_card_selection";
            room.pendingCardSelection = {
              actorId: player.id,
              targetId: target.id,
              targetHand: [...player.hand], // Actor picks from their OWN hand
              actionType: "give",
              card: card
            };
            return;
          }
          break;
        case "skip_turn":
          if (target) {
            target.skipNextTurn = true;
            io.to(room.id).emit("play_animation", {
              type: "skip", attackerName: player.name, attackerCard: card, targetName: target.name
            });
          }
          break;
        case "double_elimination":
          if (target && target.hand.length > 0) {
            const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
            ensureVisibleCard(target);
            io.to(room.id).emit("play_animation", {
              type: "eliminate", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: removed
            });
            if (player.hand.length > 0) {
              const myRemoved = player.hand.splice(Math.floor(Math.random() * player.hand.length), 1)[0];
              ensureVisibleCard(player);
              io.to(room.id).emit("play_animation", {
                type: "eliminate", attackerName: player.name, attackerCard: card, targetName: player.name, targetCard: myRemoved
              });
            }
          }
          break;
        case "eliminate_card":
          if (target && target.hand.length > 0) {
            const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
            ensureVisibleCard(target);
            io.to(room.id).emit("play_animation", {
              type: "eliminate", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: removed
            });
          }
          break;
        case "shuffle_and_eliminate":
          if (target && target.hand.length > 0) {
            const oldHandSize = target.hand.length;
            // Throw all their cards back in the deck
            room.deck.push(...target.hand);
            target.hand = [];
            room.deck.sort(() => Math.random() - 0.5);

            // Draw one less card than they had (the elimination)
            if (oldHandSize > 1) {
              target.hand = room.deck.splice(0, oldHandSize - 1);
            }
            ensureVisibleCard(target);
          }
          break;
        case "draw_5_or_card":
          room.turnPhase = "waiting_choice";
          room.pendingChoice = {
            actorId: player.id,
            card: card,
            options: [
              { id: "coins", label: "Saca 5 Moedas" },
              { id: "card", label: "Saca 1 Carta" }
            ]
          };
          return;
        case "steal_5_coins":
          if (target) {
            const amount = Math.min(target.coins, 5);
            target.coins -= amount;
            player.coins += amount;
            io.to(room.id).emit("play_animation", {
              type: "gain_coins", attackerName: player.name, amount: amount, targetName: player.name
            });
          }
          break;
        case "eliminate_or_swap":
          if (target) {
            room.turnPhase = "waiting_choice";
            room.pendingChoice = {
              actorId: player.id,
              targetId: target.id,
              card: card,
              options: [
                { id: "eliminate", label: "Eliminar Carta" },
                { id: "swap", label: "Trocar C/ Oponente" }
              ]
            };
            return;
          }
          break;
        case "eliminate_or_skip":
          if (target) {
            room.turnPhase = "waiting_choice";
            room.pendingChoice = {
              actorId: player.id,
              targetId: target.id,
              card: card,
              options: [
                { id: "eliminate", label: "Eliminar Carta" },
                { id: "skip", label: "Obrigar Passar Vez" }
              ]
            };
            return;
          }
          break;
        case "passive_coin_and_immune":
          player.coins += 1; // Immediate bonus, handles per turn elsewhere
          io.to(room.id).emit("play_animation", {
            type: "gain_coins", attackerName: player.name, amount: 1, targetName: player.name
          });
          break;
        case "force_swap_visible":
          if (target) {
            target.visibleCard = null; // Forces player to set again next time
            ensureVisibleCard(target);
          }
          break;
        case "eliminate_card_cost_2":
          if (target && target.hand.length > 0) {
            player.coins -= 2;
            const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
            room.discardPile.push(removed);
            ensureVisibleCard(target);
            io.to(room.id).emit("play_animation", {
              type: "eliminate", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: removed
            });
          }
          break;
        case "eliminate_card_cost_3":
          if (target && target.hand.length > 0) {
            player.coins -= 3;
            const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
            room.discardPile.push(removed);
            ensureVisibleCard(target);
            io.to(room.id).emit("play_animation", {
              type: "eliminate", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: removed
            });
          }
          break;
        case "peek_and_eliminate":
          if (target && target.hand.length > 0) {
            room.turnPhase = "waiting_card_selection";
            room.pendingCardSelection = {
              actorId: player.id,
              targetId: target.id,
              targetHand: [...target.hand], // snapshot of full hand
              actionType: "eliminate",
              card: card
            };
            return; // Halt regular execution
          }
          break;
        case "peek_and_swap":
          if (target && target.hand.length > 0) {
            // Reveal ONE random card from target's hand
            const randomIdx = Math.floor(Math.random() * target.hand.length);
            const revealedCard = target.hand[randomIdx];
            room.turnPhase = "waiting_card_selection";
            room.pendingCardSelection = {
              actorId: player.id,
              targetId: target.id,
              targetHand: [revealedCard], // Only the one revealed card
              actionType: "swap",
              card: card,
              canSkip: true // Player can choose not to swap
            };
            return; // Halt regular execution
          }
          break;
        case "peek_two_and_eliminate":
          // Santo Agostinho: reveal 2 random cards from target and choose one to eliminate
          if (target && target.hand.length > 0) {
            const shuffled = [...target.hand].sort(() => Math.random() - 0.5);
            const revealedCards = shuffled.slice(0, Math.min(2, shuffled.length));
            room.turnPhase = "waiting_card_selection";
            room.pendingCardSelection = {
              actorId: player.id,
              targetId: target.id,
              targetHand: revealedCards, // snapshot of 2 (or fewer) cards
              actionType: "eliminate",
              card: card
            };
            return; // Halt regular execution
          }
          break;
        case "rotate_cards":
          // Rousseau / Robespierre: each player chooses a card to pass LEFT
          // Left = previous index: player i passes to player (i-1+n)%n
          room.turnPhase = "waiting_rotate_selection";
          room.pendingRotateSelection = {
            selections: {},
            totalPlayers: room.players.length,
            card
          };
          io.to(room.id).emit("chat_message", {
            sender: "Sistema",
            text: `🔄 ${card.name} agiu! Cada jogador deve escolher uma carta para passar ao jogador da esquerda!`
          });
          return; // halt — do not advance turn
        case "redistribute_coins":
          // Karl Marx: equal redistribution, shortfall taken from the deck
          const totalPool = room.players.reduce((sum, p) => sum + p.coins, 0);
          const equalAmount = Math.ceil(totalPool / room.players.length);

          room.players.forEach(p => {
            p.coins = equalAmount;
          });

          io.to(room.id).emit("chat_message", {
            sender: "Sistema",
            text: `🛠️ Karl Marx redistribuiu o capital! Todos agora possuem ${equalAmount} moedas.`
          });
          break;
        default:
          if (card.type === "benefit") player.coins += 1;
          break;
      }

      // Escravidão: transfer any coin gains from the action directly to the enslaver
      if (player.isSlaveOf && player.coins > preActionCoins && card.power !== "redistribute_coins") {
        const gained = player.coins - preActionCoins;
        const enslaver = room.players.find(p => p.id === player.isSlaveOf);
        if (enslaver) {
          player.coins = preActionCoins;
          enslaver.coins += gained;
          io.to(room.id).emit("chat_message", {
            sender: "Sistema",
            text: `⛓️ As ${gained} moedas obtidas por ${player.name} foram para ${enslaver.name} (Escravidão).`
          });
        }
      }
    }

    socket.on("end_turn", ({ roomId }) => {
      // Legacy - no longer needed since turns end automatically, but kept for safety/fallback
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.players[room.currentTurnIndex].id !== socket.id) return;

      nextTurn(roomId);
    });

    function nextTurn(roomId: string) {
      const room = rooms.get(roomId);
      if (!room) return;

      // Per-turn effects run exactly once as turn transitions
      room.players.forEach(p => {
        if (p.visibleCard?.power === "passive_coin_and_immune") {
          p.coins += 1;
          io.to(room.id).emit("play_animation", { type: "gain_coins", attackerName: p.name, amount: 1, targetName: p.name });
        }
      });

      const currentPlayer = room.players[room.currentTurnIndex];

      // Update protection turns
      if (currentPlayer.protectionTurns && currentPlayer.protectionTurns > 0) {
        currentPlayer.protectionTurns--;
        if (currentPlayer.protectionTurns === 0) {
          currentPlayer.protectionCard = null;
        }
      }

      room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

      // Reset preventCoup for the player whose turn is starting
      const nextPlayer = room.players[room.currentTurnIndex];
      if (nextPlayer.preventCoup) {
        nextPlayer.preventCoup = false;
      }

      // Slavery turn management
      if (nextPlayer.isSlaveOf) {
        if ((nextPlayer.slaveryTurnsRemaining ?? 0) <= 1) {
          // Free the slave
          const enslaver = room.players.find(p => p.id === nextPlayer.isSlaveOf);
          if (enslaver) enslaver.isSlaverOf = undefined;
          nextPlayer.isSlaveOf = undefined;
          nextPlayer.slaveryTurnsRemaining = undefined;
          io.to(room.id).emit("chat_message", {
            sender: "Sistema",
            text: `🔓 ${nextPlayer.name} foi libertado da escravidão!`
          });
        } else {
          nextPlayer.slaveryTurnsRemaining = (nextPlayer.slaveryTurnsRemaining ?? 1) - 1;
          io.to(nextPlayer.id).emit("chat_message", {
            sender: "Sistema",
            text: `⛓️ Você ainda está escravizado (${nextPlayer.slaveryTurnsRemaining} rodada(s) restante(s)). Saque 2 moedas ou jogue carta de benefício — seus ganhos irão ao escravizador.`
          });
        }
      }

      // Check for skip effects
      if (nextPlayer.skipNextTurn) {
        nextPlayer.skipNextTurn = false;
        io.to(room.id).emit("chat_message", {
          sender: "Sistema",
          text: `⏳ ${nextPlayer.name} perdeu a vez.`
        });
        setTimeout(() => nextTurn(roomId), 1000); // Give users a second to realize it was skipped
        return;
      }

      room.turnPhase = "start";
      io.to(roomId).emit("room_update", room);
    }

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      rooms.forEach((room, roomId) => {
        const player = room.players.find((p) => p.id === socket.id);
        if (player) {
          player.connected = false;
          io.to(roomId).emit("room_update", room);
        }
      });
    });
  });

  function checkWinCondition(room: Room) {
    if (room.diarchy) {
      const p1 = room.players.find(p => p.id === room.diarchy!.player1Id);
      const p2 = room.players.find(p => p.id === room.diarchy!.player2Id);

      if (p1 && p2) {
        // José Bonifácio: if either partner is immune, block diarchy win this round
        const diarchyBlocked = p1.preventCoup || p2.preventCoup;

        if (!diarchyBlocked) {
          // Condition 1: Shared coins >= 15
          if (p1.coins + p2.coins >= 15) {
            room.winner = "DIARCHY";
            room.winReason = "diarchy_coins";
            room.status = "finished";
            return;
          }

          // Condition 2: Shared hand triad
          const combinedHand = [...p1.hand, ...p2.hand];
          const jokers = combinedHand.filter(c => c.power === "joker").length;
          const handWithoutJokers = combinedHand.filter(c => c.power !== "joker");

          const classCounts: Record<string, number> = {};
          for (const card of handWithoutJokers) {
            classCounts[card.class] = (classCounts[card.class] || 0) + 1;
          }

          for (const className in classCounts) {
            if (classCounts[className] + jokers >= 3) {
              room.winner = "DIARCHY";
              room.winReason = "diarchy_triad";
              room.status = "finished";
              return;
            }
          }

          if (jokers >= 3) {
            room.winner = "DIARCHY";
            room.winReason = "diarchy_triad";
            room.status = "finished";
            return;
          }
        }
      }
    }

    for (const player of room.players) {
      // José Bonifácio: if this player is immune to winning this round, skip
      if (player.preventCoup) continue;

      if (player.coins >= 15) {
        room.winner = player.id;
        room.winReason = "coins";
        room.status = "finished";
        return;
      }

      // Check for 3 cards of same class in hand (including Joker as wild)
      const jokers = player.hand.filter(c => c.power === "joker").length;
      const handWithoutJokers = player.hand.filter(c => c.power !== "joker");

      const classCounts: Record<string, number> = {};
      for (const card of handWithoutJokers) {
        classCounts[card.class] = (classCounts[card.class] || 0) + 1;
      }

      for (const className in classCounts) {
        if (classCounts[className] + jokers >= 3) {
          room.winner = player.id;
          room.winReason = "triad";
          room.status = "finished";
          return;
        }
      }

      if (jokers >= 3) {
        room.winner = player.id;
        room.winReason = "triad";
        room.status = "finished";
        return;
      }
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
