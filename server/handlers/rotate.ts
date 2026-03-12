// ──────────────────────────────────────────────────
// Golpe — Rotate Selection Handler
// submit_rotate_selection (Rousseau / Robespierre)
// ──────────────────────────────────────────────────

import type { Socket } from "socket.io";
import { io, rooms } from "../context";
import { ensureVisibleCard } from "../game/deck";
import { checkWinCondition, nextTurn } from "../game/turn";
import type { Card } from "../types";

export function registerRotateHandlers(socket: Socket) {
    socket.on("submit_rotate_selection", ({ roomId, selectedCardId }) => {
        const room = rooms.get(roomId);
        if (!room || !room.pendingRotateSelection) return;
        if (room.turnPhase !== "waiting_rotate_selection") return;

        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;

        if (!player.hand.some((c) => c.id === selectedCardId)) return;

        room.pendingRotateSelection.selections[socket.id] = selectedCardId;

        io.to(roomId).emit("chat_message", { sender: "Sistema", text: `✅ ${player.name} preparou sua carta.` });
        io.to(roomId).emit("room_update", room);

        const submitted = Object.keys(room.pendingRotateSelection.selections).length;
        if (submitted < room.pendingRotateSelection.totalPlayers) return;

        // All players chose — execute rotation
        const n = room.players.length;
        const selections = room.pendingRotateSelection.selections;

        const chosenCards: { fromIndex: number; card: Card }[] = [];
        for (let i = 0; i < n; i++) {
            const p = room.players[i];
            const cardIdx = p.hand.findIndex((c) => c.id === selections[p.id]);
            if (cardIdx === -1) continue;
            const [card] = p.hand.splice(cardIdx, 1);
            chosenCards.push({ fromIndex: i, card });
        }

        // Give each card to the player on the LEFT (index - 1)
        for (const { fromIndex, card } of chosenCards) {
            const leftIndex = (fromIndex - 1 + n) % n;
            room.players[leftIndex].hand.push(card);
        }

        room.players.forEach((p) => ensureVisibleCard(p));
        room.pendingRotateSelection = null;

        io.to(roomId).emit("chat_message", { sender: "Sistema", text: `🔄 Revolução concluída! Cada jogador passou uma carta para o jogador à esquerda.` });
        io.to(roomId).emit("play_animation", { type: "swap", attackerName: "Todos", targetName: "Todos" });

        checkWinCondition(room);
        nextTurn(room.id);
    });
}
