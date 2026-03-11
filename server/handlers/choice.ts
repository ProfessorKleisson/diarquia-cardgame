// ──────────────────────────────────────────────────
// Golpe — Choice Handler
// submit_choice (Adam Smith/Locke, Marco Bruto, Maquiavel)
// ──────────────────────────────────────────────────

import type { Socket } from "socket.io";
import { io, rooms } from "../context";
import { ensureVisibleCard } from "../game/deck";
import { checkWinCondition, nextTurn } from "../game/turn";

export function registerChoiceHandlers(socket: Socket) {
    socket.on("submit_choice", ({ roomId, choiceId }) => {
        const room = rooms.get(roomId);
        if (!room || !room.pendingChoice) return;
        if (room.pendingChoice.actorId !== socket.id) return;

        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;

        const cardPower = room.pendingChoice.card.power;

        // ── Adam Smith / John Locke ──────────────────────
        if (cardPower === "draw_5_or_card") {
            if (choiceId === "coins") {
                player.coins += 5;
                io.to(roomId).emit("play_animation", { type: "gain_coins", attackerName: player.name, amount: 5, targetName: player.name });
                io.to(roomId).emit("chat_message", { sender: "Sistema", text: `💰 ${player.name} escolheu 5 moedas via efeito liberal.` });
            } else if (choiceId === "card" && room.deck.length > 0) {
                const drawnCard = room.deck.shift()!;
                player.hand.push(drawnCard);
                io.to(roomId).emit("play_animation", { type: "draw", attackerName: player.name, targetCard: drawnCard, targetName: player.name });
                io.to(roomId).emit("chat_message", { sender: "Sistema", text: `🎴 ${player.name} escolheu sacar uma carta via efeito liberal.` });
            }
        }

        // ── Marco Júnio Bruto ────────────────────────────
        else if (cardPower === "eliminate_or_swap") {
            const target = room.players.find((p) => p.id === room.pendingChoice!.targetId);
            if (!target) return;

            if (choiceId === "eliminate" && target.hand.length > 0) {
                const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
                room.discardPile.push(removed);
                ensureVisibleCard(target);
                io.to(roomId).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: room.pendingChoice.card, targetName: target.name, targetCard: removed });
                io.to(roomId).emit("chat_message", { sender: "Sistema", text: `🗡️ ${player.name} eliminou uma carta de ${target.name} via Bruto.` });
            } else if (choiceId === "swap") {
                room.pendingChoice = null;
                room.turnPhase = "waiting_card_selection";
                room.pendingCardSelection = { actorId: player.id, targetId: target.id, targetHand: [...player.hand], actionType: "give" };
                io.to(roomId).emit("room_update", room);
                return;
            }
        }

        // ── Nicolau Maquiavel ────────────────────────────
        else if (cardPower === "eliminate_or_skip") {
            const target = room.players.find((p) => p.id === room.pendingChoice!.targetId);
            if (!target) return;

            if (choiceId === "eliminate" && target.hand.length > 0) {
                const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
                room.discardPile.push(removed);
                ensureVisibleCard(target);
                io.to(roomId).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: room.pendingChoice.card, targetName: target.name, targetCard: removed });
                io.to(roomId).emit("chat_message", { sender: "Sistema", text: `🗡️ ${player.name} eliminou uma carta de ${target.name} via Maquiavel.` });
            } else if (choiceId === "skip") {
                target.skipNextTurn = true;
                io.to(roomId).emit("play_animation", { type: "skip", attackerName: player.name, attackerCard: room.pendingChoice.card, targetName: target.name });
                io.to(roomId).emit("chat_message", { sender: "Sistema", text: `⏳ ${player.name} forçou ${target.name} a passar a vez via Maquiavel.` });
            }
        }

        room.pendingChoice = null;
        checkWinCondition(room);
        nextTurn(room.id);
    });
}
