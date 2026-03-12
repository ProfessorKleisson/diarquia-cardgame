// ──────────────────────────────────────────────────
// Golpe — Card Play Handlers
// play_card, respond_defense, submit_card_selection
// ──────────────────────────────────────────────────

import type { Socket } from "socket.io";
import { io, rooms } from "../context";
import { ensureVisibleCard, drawFromDeck } from "../game/deck";
import { applyCardEffect, checkCanBlock } from "../game/effects";
import { checkWinCondition, nextTurn } from "../game/turn";

export function registerCardHandlers(socket: Socket) {
    socket.on("play_card", ({ roomId, cardId, targetPlayerId }) => {
        const room = rooms.get(roomId);
        if (!room) return;
        if (room.players[room.currentTurnIndex].id !== socket.id) return;
        if (room.turnPhase !== "action") return;

        const player = room.players[room.currentTurnIndex];
        const cardIndex = player.hand.findIndex((c) => c.id === cardId);
        if (cardIndex === -1) return;

        const card = player.hand[cardIndex];
        const target = targetPlayerId ? room.players.find((p) => p.id === targetPlayerId) : null;

        io.to(roomId).emit("chat_message", { sender: "Sistema", text: `🃏 ${player.name} usou ${card.name}${target ? ` contra ${target.name}` : ""}!` });

        // Slavery restriction: slave must play benefit card if they have one
        if (player.isSlaveOf && card.type !== "benefit") {
            if (player.hand.some((c) => c.type === "benefit")) {
                io.to(socket.id).emit("chat_message", { sender: "Sistema", text: "⛓️ Você é escravo! Você TEM uma carta de benefício na mão e é OBRIGADO a jogá-la." });
                return;
            }
        }

        // Coin checks
        if (card.power === "eliminate_card_cost_2" && player.coins < 2) {
            io.to(socket.id).emit("action_error", { message: "❌ Você não tem as 2 moedas necessárias para usar esta carta." });
            return;
        }
        if (card.power === "eliminate_card_cost_3" && player.coins < 3) {
            io.to(socket.id).emit("action_error", { message: "❌ Você não tem as 3 moedas necessárias para usar esta carta." });
            return;
        }

        const needsDefensePhase =
            target &&
            (card.type === "attack" || card.power === "peek_and_swap" || card.power === "slavery" ||
                card.power === "peek_and_eliminate" || card.power?.startsWith("eliminate") ||
                card.power === "skip_turn" || card.power === "force_swap_visible" ||
                card.power === "shuffle_and_eliminate" || card.power === "shuffle_and_redistribute") &&
            card.power !== "peek_two_and_eliminate" && card.power !== "peek_two_opponents";

        if (needsDefensePhase) {
            // Protection check
            if (target!.protectionTurns && target!.protectionTurns > 0) {
                io.to(roomId).emit("chat_message", { sender: "Sistema", text: `🛡️ Imune! ${target!.name} está protegido.` });
                player.hand.splice(cardIndex, 1);
                room.discardPile.push(card);
                ensureVisibleCard(player);
                checkWinCondition(room);
                nextTurn(room.id);
                return;
            }

            player.hand.splice(cardIndex, 1);
            room.discardPile.push(card);
            ensureVisibleCard(player);
            room.pendingAction = { actorId: player.id, targetId: target!.id, card };
            room.turnPhase = "waiting_defense";
            io.to(roomId).emit("room_update", room);
            io.to(target!.id).emit("defense_required", { attackerName: player.name, cardName: card.name });
        } else {
            // Execute immediately
            player.hand.splice(cardIndex, 1);
            room.discardPile.push(card);
            ensureVisibleCard(player);
            applyCardEffect(room, player, card, targetPlayerId);

            const phase = room.turnPhase as string;
            if (phase !== "waiting_choice" && phase !== "waiting_card_selection" && phase !== "waiting_rotate_selection") {
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

        const target = room.players.find((p) => p.id === socket.id)!;
        const actor = room.players.find((p) => p.id === room.pendingAction!.actorId)!;
        const { card: attackCard } = room.pendingAction;
        let defenseSuccessful = false;

        if (action === "defend" && defenseCardId) {
            const defenseCardIndex = target.hand.findIndex((c) => c.id === defenseCardId);
            if (defenseCardIndex !== -1) {
                const defenseCard = target.hand[defenseCardIndex];
                if (checkCanBlock(defenseCard, attackCard)) {
                    defenseSuccessful = true;
                    target.hand.splice(defenseCardIndex, 1);
                    room.discardPile.push(defenseCard);

                    const newCards = drawFromDeck(room, 1);
                    if (newCards.length > 0) {
                        const newCard = newCards[0];
                        target.hand.push(newCard);
                        // Emit private draw animation for target
                        io.to(target.id).emit("play_animation", { type: "draw", attackerName: target.name, targetCard: newCard, targetName: target.name });
                        // Emit public draw animation (hidden card) for others
                        io.to(roomId).except(target.id).emit("play_animation", { type: "draw", attackerName: target.name, targetCard: null, targetName: target.name });
                    }

                    ensureVisibleCard(target);

                    io.to(roomId).emit("play_animation", { type: "block_draw", attackerName: target.name, attackerCard: defenseCard, targetName: actor.name });
                    io.to(roomId).emit("chat_message", { sender: "Sistema", text: `🛡️ ${target.name} bloqueou com ${defenseCard.name} e renovou sua carta!` });

                    if (defenseCard.power?.startsWith("protection_")) {
                        applyCardEffect(room, target, defenseCard);
                        io.to(roomId).emit("room_update", room);
                    }

                    if (defenseCard.power === "block_coups") {
                        const oldHandSize = actor.hand.length;
                        room.discardPile.push(...actor.hand);
                        actor.hand = drawFromDeck(room, oldHandSize);
                        ensureVisibleCard(actor);
                        io.to(room.id).emit("chat_message", { sender: "Sistema", text: `⚖️ Julgamento! Hannah Arendt forçou ${actor.name} a renovar toda sua mão.` });
                    }
                } else {
                    io.to(roomId).emit("chat_message", { sender: "Sistema", text: `❌ ${defenseCard.name} não bloqueia ${attackCard.name}.` });
                }
            }
        }

        if (!defenseSuccessful) {
            applyCardEffect(room, actor, attackCard, target.id);
        }

        room.pendingAction = null;
        checkWinCondition(room);

        const afterPhase = room.turnPhase as string;
        if (afterPhase !== "waiting_card_selection" && afterPhase !== "waiting_choice" && afterPhase !== "waiting_rotate_selection") {
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
        const target = room.players.find((p) => p.id === selection.targetId);
        const actor = room.players.find((p) => p.id === socket.id);
        if (!target || !actor) return;

        // Skip
        if (selectedCardId === "skip") {
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🔍 ${actor.name} preferiu não trocar.` });
            room.pendingCardSelection = null;
            checkWinCondition(room);
            nextTurn(room.id);
            return;
        }

        // Give (Protágoras)
        if (action === "give") {
            const givenIndex = actor.hand.findIndex((c) => c.id === selectedCardId);
            if (givenIndex !== -1) {
                const givenCard = actor.hand.splice(givenIndex, 1)[0];
                if (target.hand.length > 0) {
                    const rndIdx = Math.floor(Math.random() * target.hand.length);
                    actor.hand.push(target.hand.splice(rndIdx, 1)[0]);
                }
                target.hand.push(givenCard);
                ensureVisibleCard(actor);
                ensureVisibleCard(target);
                io.to(roomId).emit("play_animation", { type: "swap", attackerName: actor.name, attackerCard: selection.card || null, targetName: target.name });
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🔄 ${actor.name} trocou uma carta com ${target.name}.` });
            }
            room.pendingCardSelection = null;
            checkWinCondition(room);
            nextTurn(room.id);
            return;
        }

        const targetCardIndex = target.hand.findIndex((c) => c.id === selectedCardId);
        if (targetCardIndex !== -1) {
            const removedCard = target.hand.splice(targetCardIndex, 1)[0];

            if (action === "eliminate") {
                room.discardPile.push(removedCard);
                ensureVisibleCard(target);
                io.to(roomId).emit("play_animation", { type: "eliminate", attackerName: actor.name, attackerCard: selection.card || null, targetName: target.name, targetCard: removedCard });
            } else if (action === "swap") {
                if (room.deck.length > 0) {
                    target.hand.push(room.deck.shift()!);
                    room.deck.push(removedCard);
                } else {
                    target.hand.push(removedCard);
                }
                ensureVisibleCard(target);
                io.to(roomId).emit("play_animation", { type: "swap", attackerName: actor.name, attackerCard: selection.card || null, targetName: target.name });
            }
        }

        room.pendingCardSelection = null;
        checkWinCondition(room);
        nextTurn(room.id);
    });
}
