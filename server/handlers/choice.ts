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
            const cardName = room.pendingChoice.card.name;
            if (choiceId === "coins") {
                player.coins += 5;
                let text = `💰 Capitalismo Laissez-faire! ${player.name} escolheu 5 moedas via efeito liberal de ${cardName}.`;
                if (cardName === "Adam Smith") text = `💰 Mão Invisível! ${player.name} obteve 5 moedas via Adam Smith.`;
                if (cardName === "John Locke") text = `💰 Propriedade Privada! ${player.name} obteve 5 moedas via John Locke.`;

                io.to(roomId).emit("play_animation", { type: "gain_coins", attackerName: player.name, amount: 5, targetName: player.name });
                io.to(roomId).emit("chat_message", { sender: "Sistema", text });
            } else if (choiceId === "card" && room.deck.length > 0) {
                const drawnCard = room.deck.shift()!;
                player.hand.push(drawnCard);

                let text = `🎴 Liberalismo em Ação! ${player.name} buscou um novo aliado no deck via ${cardName}.`;
                if (cardName === "Adam Smith") text = `🎴 Divisão do Trabalho! ${player.name} sacou uma carta com Adam Smith.`;
                if (cardName === "John Locke") text = `🎴 Tábula Rasa! ${player.name} sacou uma carta com John Locke.`;

                // Private: only the drawer sees the card face
                io.to(socket.id).emit("play_animation", { type: "draw", attackerName: player.name, targetCard: drawnCard, targetName: player.name });
                // Public: others see a card is drawn without revealing its face
                io.to(roomId).except(socket.id).emit("play_animation", { type: "draw", attackerName: player.name, targetCard: null, targetName: player.name });
                io.to(roomId).emit("chat_message", { sender: "Sistema", text });
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
                io.to(roomId).emit("chat_message", { sender: "Sistema", text: `🗡️ Et tu, Brute? ${player.name} desferiu um golpe fatal eliminando uma carta de ${target.name}.` });
            } else if (choiceId === "swap") {
                io.to(roomId).emit("chat_message", { sender: "Sistema", text: `🔄 Conspiração de Bastidores! ${player.name} decidiu trocar influências com ${target.name}.` });
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
                io.to(roomId).emit("chat_message", { sender: "Sistema", text: `🗡️ Os Fins Justificam os Meios! ${player.name} eliminou uma carta de ${target.name} sob ordens de Maquiavel.` });
            } else if (choiceId === "skip") {
                target.skipNextTurn = true;
                io.to(roomId).emit("play_animation", { type: "skip", attackerName: player.name, attackerCard: room.pendingChoice.card, targetName: target.name });
                io.to(roomId).emit("chat_message", { sender: "Sistema", text: `⏳ Estratégia de Poder! ${player.name} paralisou o governo de ${target.name} via Maquiavel.` });
            }
        }

        room.pendingChoice = null;
        checkWinCondition(room);
        nextTurn(room.id);
    });
}
