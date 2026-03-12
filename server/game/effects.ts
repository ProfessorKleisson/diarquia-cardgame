// ──────────────────────────────────────────────────
// Golpe — Card Effects
// checkCanBlock() and applyCardEffect()
// ──────────────────────────────────────────────────

import { io, rooms } from "../context";
import { ensureVisibleCard, drawFromDeck } from "./deck";
import type { Room, Player, Card } from "../types";

/** Returns true if a card is unblockable based on its description text. */
export function isCardUnblockable(card: Card | null | undefined): boolean {
    if (!card) return false;
    const desc = card.description.toLowerCase();
    return desc.includes("não pode ser bloqueada") || desc.includes("não pode ser bloqueado");
}

/**
 * Determine if a defense card can block a given attack card.
 * Called during the waiting_defense phase.
 */
export function checkCanBlock(defenseCard: Card, attackCard: Card): boolean {
    const desc = defenseCard.description.toLowerCase();
    const atkClass = attackCard.class.toLowerCase();
    const isAtkUnblockable = isCardUnblockable(attackCard);

    // 1. IMMUNITY CARDS — block ANY attack, even unblockable
    if (defenseCard.power?.startsWith("protection_")) return true;
    if (defenseCard.power === "draw_2_or_block" || defenseCard.power === "draw_2_or_block_unblockable") return true;
    if (defenseCard.power === "block_unblockable") return true; // Moves here to block even unblockable attacks

    // 2. STANDARD DEFENSES — fail against unblockable attacks
    if (isAtkUnblockable) return false;

    // Protágoras: blocks René Descartes specifically
    if (defenseCard.power === "swap_card" && attackCard.power === "peek_and_swap") return true;

    if (defenseCard.power === "block_coups" && (atkClass.includes("militar") || atkClass.includes("partidário"))) return true;
    if (defenseCard.power === "block_military_religious" && (atkClass.includes("militar") || atkClass.includes("religioso"))) return true;

    // Júlio César blocked by Golpe Sorrateiro
    if (attackCard.power === "shuffle_and_redistribute" && defenseCard.class === "Golpe Sorrateiro") return true;

    if (desc.includes("bloqueia") && desc.includes(atkClass)) return true;

    // Escravidão: blocked by Liberais Clássicos and Diarquia
    if (attackCard.power === "slavery" && (defenseCard.class === "Liberais Clássicos" || defenseCard.class === "Diarquia")) return true;

    // ANY Liberais Clássicos blocks Golpe Militar
    if (defenseCard.class === "Liberais Clássicos" && atkClass.includes("militar")) return true;

    // Winston Churchill blocks Golpe Partidário (except Stalin)
    if (defenseCard.name === "Winston Churchill" && atkClass.includes("partidário") && attackCard.name !== "Joseph Stalin") return true;

    // Winston Churchill blocked by any Revolução card
    if (attackCard.name === "Winston Churchill" && defenseCard.class === "Revolução") return true;

    // Marco Júnio Bruto blocked by Mão do Rei or José Bonifácio
    if (attackCard.name === "Marco Júnio Bruto" && (defenseCard.name === "Mão do Rei" || defenseCard.name === "José Bonifácio")) return true;

    // Inquisição blocked by any Liberal card
    if (attackCard.name === "Inquisição" && defenseCard.class === "Liberais Clássicos") return true;

    // Karl Marx / Movimento Coletivista blocked by Liberais Clássicos
    if (attackCard.power === "redistribute_coins" && defenseCard.class === "Liberais Clássicos") return true;

    return false;
}

/**
 * Apply the effect of a played card.
 * This may mutate `room` state (turnPhase, pendingX fields) and emit socket events.
 * If it sets a waiting phase, it returns without advancing the turn.
 */
export function applyCardEffect(room: Room, player: Player, card: Card, targetPlayerId?: string) {
    const target = targetPlayerId ? room.players.find((p) => p.id === targetPlayerId) : null;

    // Protection check: attack-type cards fail if target is protected
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
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `💸 ${player.name} recebeu 7 moedas com ${card.name}.` });
            break;

        case "draw_3_coins_unblockable":
            player.coins += 3;
            io.to(room.id).emit("play_animation", { type: "gain_coins", attackerName: player.name, amount: 3, targetName: player.name });
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `💰 ${player.name} sacou 3 moedas (imbloqueável).` });
            break;

        case "prevent_coup":
            if (target) {
                target.preventCoup = true;
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🛡️ ${player.name} impediu o Golpe de ${target.name}.` });
            }
            break;

        case "marriage_diarchy":
        case "diplomacy_diarchy": {
            if (target) {
                if (target.hand.length > 0 && player.hand.length > 0) {
                    const actorIdx = Math.floor(Math.random() * player.hand.length);
                    const targetIdx = Math.floor(Math.random() * target.hand.length);
                    const actorCard = player.hand[actorIdx];
                    const targetCard = target.hand[targetIdx];

                    player.hand[actorIdx] = targetCard;
                    target.hand[targetIdx] = actorCard;

                    ensureVisibleCard(player);
                    ensureVisibleCard(target);

                    io.to(player.id).emit("play_animation", { type: "swap", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard });
                    io.to(target.id).emit("play_animation", { type: "swap", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: actorCard });
                    io.to(room.id).except(player.id).except(target.id).emit("play_animation", { type: "swap", attackerName: player.name, attackerCard: card, targetName: target.name });

                    io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🔄 ${player.name} trocou cartas com ${target.name}.` });
                }

                const combo = [...player.hand, ...target.hand];
                if (combo.some((c) => c.name === "Dom Pedro II") && combo.some((c) => c.name === "Rainha Elizabeth II")) {
                    room.diarchy = { player1Id: player.id, player2Id: target.id };
                    io.to(room.id).emit("chat_message", { sender: "Sistema", text: `👑 Diarquia firmada: ${player.name} e ${target.name}!` });
                }
            }
            break;
        }

        case "redistribute_cards": {
            const cardsToRedistribute: Card[] = [];
            room.players.forEach((p) => {
                if (p.id === player.id) return;
                const hasRoyalty = p.hand.some((c) => c.name === "Dom Pedro II" || c.name === "Rainha Elizabeth II");
                if (!hasRoyalty) {
                    cardsToRedistribute.push(...p.hand);
                    p.hand = [];
                }
            });
            room.discardPile.push(...cardsToRedistribute);
            room.players.forEach((p) => {
                if (p.id === player.id) return;
                if (!p.hand.length) p.hand = drawFromDeck(room, 4);
            });
            room.players.forEach((p) => ensureVisibleCard(p));
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🖋️ ${player.name} forçou a redistribuição de cartas.` });
            break;
        }

        case "protection_3_turns":
            player.protectionTurns = 3;
            player.protectionCard = card;
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🛡️ ${player.name} está protegido por 3 rodadas.` });
            break;

        case "protection_2_turns":
            player.protectionTurns = 2;
            player.protectionCard = card;
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🛡️ ${player.name} está protegido por 2 rodadas.` });
            break;

        case "draw_2_or_block":
        case "draw_2_or_block_unblockable": {
            const drawn = drawFromDeck(room, 2);
            player.hand.push(...drawn);

            drawn.forEach(card => {
                io.to(player.id).emit("play_animation", { type: "draw", attackerName: player.name, targetCard: card, targetName: player.name });
                io.to(room.id).except(player.id).emit("play_animation", { type: "draw", attackerName: player.name, targetCard: null, targetName: player.name });
            });

            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `📜 ${player.name} usou ${card.name} e renovou sua mão.` });
            break;
        }

        case "slavery":
            if (target) {
                target.isSlaveOf = player.id;
                target.slaveryTurnsRemaining = 2;
                player.isSlaverOf = target.id;
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `⛓️ ${player.name} escravizou ${target.name} por 2 rodadas.` });
            }
            break;

        case "block_coups": break;

        case "swap_card":
            if (target && target.hand.length > 0 && player.hand.length > 0) {
                room.turnPhase = "waiting_card_selection";
                room.pendingCardSelection = {
                    actorId: player.id,
                    targetId: target.id,
                    targetHand: [...player.hand],
                    actionType: "give",
                    card,
                };
                return;
            }
            break;

        case "skip_turn":
            if (target) {
                target.skipNextTurn = true;
                io.to(room.id).emit("play_animation", { type: "skip", attackerName: player.name, attackerCard: card, targetName: target.name });
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `⏳ ${player.name} silenciou ${target.name} por uma rodada.` });
            }
            break;

        case "double_elimination":
            if (target && target.hand.length > 0) {
                const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
                room.discardPile.push(removed);
                ensureVisibleCard(target);
                io.to(room.id).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: removed });

                if (player.hand.length > 0) {
                    const myRemoved = player.hand.splice(Math.floor(Math.random() * player.hand.length), 1)[0];
                    room.discardPile.push(myRemoved);
                    ensureVisibleCard(player);
                    io.to(room.id).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: card, targetName: player.name, targetCard: myRemoved });
                }
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `💥 Atentado! ${player.name} e ${target.name} perderam uma carta.` });
            }
            break;

        case "eliminate_card":
            if (target && target.hand.length > 0) {
                const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
                room.discardPile.push(removed);
                ensureVisibleCard(target);
                io.to(room.id).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: removed });
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🗡️ Golpe! ${player.name} eliminou uma carta de ${target.name}.` });
            }
            break;

        case "shuffle_and_eliminate":
            if (target && target.hand.length > 0) {
                const oldHandSize = target.hand.length;
                room.discardPile.push(...target.hand);
                target.hand = drawFromDeck(room, Math.max(0, oldHandSize - 1));
                ensureVisibleCard(target);
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🌪️ Purga! ${player.name} forçou ${target.name} a perder uma carta e renovar a mão.` });
            }
            break;

        case "draw_5_or_card":
            room.turnPhase = "waiting_choice";
            room.pendingChoice = {
                actorId: player.id,
                card,
                options: [
                    { id: "coins", label: "Saca 5 Moedas" },
                    { id: "card", label: "Saca 1 Carta" },
                ],
            };
            return;

        case "steal_5_coins":
            if (target) {
                const amount = Math.min(target.coins, 5);
                target.coins -= amount;
                player.coins += amount;
                io.to(room.id).emit("play_animation", { type: "gain_coins", attackerName: player.name, amount, targetName: player.name });
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `💸 ${player.name} desviou ${amount} moedas de ${target.name}.` });
            }
            break;

        case "eliminate_or_swap":
            if (target) {
                room.turnPhase = "waiting_choice";
                room.pendingChoice = {
                    actorId: player.id,
                    targetId: target.id,
                    card,
                    options: [
                        { id: "eliminate", label: "Eliminar Carta" },
                        { id: "swap", label: "Trocar C/ Oponente" },
                    ],
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
                    card,
                    options: [
                        { id: "eliminate", label: "Eliminar Carta" },
                        { id: "skip", label: "Obrigar Passar Vez" },
                    ],
                };
                return;
            }
            break;

        case "passive_coin_and_immune":
            player.coins += 1;
            io.to(room.id).emit("play_animation", { type: "gain_coins", attackerName: player.name, amount: 1, targetName: player.name });
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🛡️ ${player.name} ganhou 1 moeda (Passivo).` });
            break;

        case "force_swap_visible":
            if (target) {
                target.visibleCard = null;
                ensureVisibleCard(target);
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🎭 ${player.name} forçou ${target.name} a alterar sua carta visível.` });
            }
            break;

        case "eliminate_card_cost_2":
            if (target && target.hand.length > 0) {
                player.coins -= 2;
                const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
                room.discardPile.push(removed);
                ensureVisibleCard(target);
                io.to(room.id).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: removed });
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🏹 ${player.name} eliminou uma carta de ${target.name} (custo 2).` });
            }
            break;

        case "eliminate_card_cost_3":
            if (target && target.hand.length > 0) {
                player.coins -= 3;
                const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
                room.discardPile.push(removed);
                ensureVisibleCard(target);
                io.to(room.id).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: removed });
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🪓 ${player.name} guilhotinou uma carta de ${target.name} (custo 3).` });
            }
            break;

        case "peek_and_eliminate":
            if (target && target.hand.length > 0) {
                const randomIdx = Math.floor(Math.random() * target.hand.length);
                const revealedCard = target.hand[randomIdx];
                room.turnPhase = "waiting_card_selection";
                room.pendingCardSelection = {
                    actorId: player.id,
                    targetId: target.id,
                    targetHand: [revealedCard],
                    actionType: "eliminate",
                    card,
                };
                return;
            }
            break;

        case "peek_and_swap":
            if (target && target.hand.length > 0) {
                const randomIdx = Math.floor(Math.random() * target.hand.length);
                const revealedCard = target.hand[randomIdx];
                room.turnPhase = "waiting_card_selection";
                room.pendingCardSelection = {
                    actorId: player.id,
                    targetId: target.id,
                    targetHand: [revealedCard],
                    actionType: "swap",
                    card,
                    canSkip: true,
                };
                return;
            }
            break;

        case "peek_two_and_eliminate":
            if (target && target.hand.length > 0) {
                const shuffled = [...target.hand].sort(() => Math.random() - 0.5);
                const revealedCards = shuffled.slice(0, Math.min(2, shuffled.length));
                room.turnPhase = "waiting_card_selection";
                room.pendingCardSelection = {
                    actorId: player.id,
                    targetId: target.id,
                    targetHand: revealedCards,
                    actionType: "eliminate",
                    card,
                };
                return;
            }
            break;

        case "peek_two_opponents": {
            const opponents = room.players.filter(p => p.id !== player.id);
            if (opponents.length === 0) {
                io.to(player.id).emit("chat_message", { sender: "Sistema", text: "🔍 Não há oponentes para revelar cartas." });
                break;
            }

            room.turnPhase = "waiting_targets_selection";
            room.pendingTargetsSelection = {
                actorId: player.id,
                count: Math.min(2, opponents.length),
                targets: [],
                card,
            };
            io.to(player.id).emit("chat_message", { sender: "Sistema", text: `🔍 Selecione ${room.pendingTargetsSelection.count} oponentes para revelar cartas.` });
            return;
        }

        case "eliminate_two_opponents": {
            const opponentsWithCards = room.players.filter(p => p.id !== player.id && p.hand.length > 0);
            if (opponentsWithCards.length === 0) {
                io.to(player.id).emit("chat_message", { sender: "Sistema", text: "🔍 Não há oponentes com cartas para eliminar." });
                break;
            }

            const targets = opponentsWithCards.sort(() => Math.random() - 0.5).slice(0, 2);
            targets.forEach(t => {
                const removed = t.hand.splice(Math.floor(Math.random() * t.hand.length), 1)[0];
                room.discardPile.push(removed);
                ensureVisibleCard(t);
                io.to(room.id).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: card, targetName: t.name, targetCard: removed });
            });

            io.to(room.id).emit("chat_message", {
                sender: "Sistema",
                text: `🏴 ${player.name} eliminou cartas de ${targets.map(t => t.name).join(" e ")}.`
            });
            break;
        }

        case "shuffle_and_redistribute":
            if (target && target.hand.length > 0) {
                const count = target.hand.length;
                room.discardPile.push(...target.hand);
                target.hand = drawFromDeck(room, count);
                ensureVisibleCard(target);
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `⚔️ ${player.name} forçou ${target.name} a renovar sua mão (${count} cartas).` });
            }
            break;

        case "block_unblockable":
            // Purely defensive
            break;

        case "rotate_cards":
            room.turnPhase = "waiting_rotate_selection";
            room.pendingRotateSelection = {
                selections: {},
                totalPlayers: room.players.length,
                card,
            };
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🔄 ${card.name}: Cada jogador deve passar uma carta para a esquerda!` });
            return;

        case "redistribute_coins": {
            const totalPool = room.players.reduce((sum, p) => sum + p.coins, 0);
            const equalAmount = Math.ceil(totalPool / room.players.length);
            room.players.forEach((p) => { p.coins = equalAmount; });

            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🛠️ Capital redistribuído! Todos agora têm ${equalAmount} moedas.` });
            break;
        }

        default:
            if (card.type === "benefit") player.coins += 1;
            break;
    }

    // Escravidão: transfer any coin gains from the action to the enslaver
    if (player.isSlaveOf && player.coins > preActionCoins && card.power !== "redistribute_coins") {
        const gained = player.coins - preActionCoins;
        const enslaver = room.players.find((p) => p.id === player.isSlaveOf);
        if (enslaver) {
            player.coins = preActionCoins;
            enslaver.coins += gained;
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `⛓️ As ${gained} moedas obtidas por ${player.name} foram para ${enslaver.name} (Escravidão).` });
        }
    }
}
