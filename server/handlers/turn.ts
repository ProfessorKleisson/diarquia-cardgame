// ──────────────────────────────────────────────────
// Golpe — Turn Action Handlers
// take_coins, draw_card, draw_from_discard, end_turn
// ──────────────────────────────────────────────────

import type { Socket } from "socket.io";
import { io, rooms } from "../context";
import { ensureVisibleCard } from "../game/deck";
import { checkWinCondition, nextTurn } from "../game/turn";

export function registerTurnHandlers(socket: Socket) {
    socket.on("take_coins", ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room) return;
        if (room.players[room.currentTurnIndex].id !== socket.id) return;
        if (room.turnPhase !== "start") return;

        const player = room.players[room.currentTurnIndex];

        if (player.isSlaveOf) {
            const enslaver = room.players.find((p) => p.id === player.isSlaveOf);
            if (enslaver) {
                enslaver.coins += 2;
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `⛓️ ${player.name} é escravo — as 2 moedas sacadas foram para ${enslaver.name}.` });
            }
        } else {
            player.coins += 2;
            io.to(roomId).emit("play_animation", { type: "gain_coins", attackerName: player.name, amount: 2, targetName: player.name });
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

            // Private: only the drawer sees the card face
            io.to(socket.id).emit("play_animation", { type: "draw", attackerName: player.name, targetCard: drawnCard, targetName: player.name });
            // Public: others see a card is drawn without revealing its face
            io.to(roomId).except(socket.id).emit("play_animation", { type: "draw", attackerName: player.name, targetCard: null, targetName: player.name });
        }
        ensureVisibleCard(player);
        room.turnPhase = "action";

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

        // Discard pile is public — everyone sees which card was taken
        io.to(roomId).emit("play_animation", { type: "draw", attackerName: player.name, targetCard: drawnCard, targetName: player.name });
        ensureVisibleCard(player);
        room.turnPhase = "action";

        checkWinCondition(room);
        io.to(roomId).emit("room_update", room);
    });

    socket.on("end_turn", ({ roomId }) => {
        // Legacy fallback — turns end automatically in normal flow
        const room = rooms.get(roomId);
        if (!room) return;
        if (room.players[room.currentTurnIndex].id !== socket.id) return;
        nextTurn(roomId);
    });
}
