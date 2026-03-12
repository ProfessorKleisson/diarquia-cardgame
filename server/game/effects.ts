// ──────────────────────────────────────────────────
// Golpe — Card Effects
// checkCanBlock() and applyCardEffect()
// ──────────────────────────────────────────────────

import { io, rooms } from "../context";
import { ensureVisibleCard } from "./deck";
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

    // 2. STANDARD DEFENSES — fail against unblockable attacks
    if (isAtkUnblockable) return false;

    // José Martí / Nietzsche - block anything if not unblockable (or even if unblockable if specifically coded)
    if (defenseCard.power === "block_unblockable") return true;

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
            let draw7Text = `💸 Financiamento de Império! ${player.name} recebeu 7 moedas através da autoridade de ${card.name}.`;
            if (card.name === "Dom Pedro II") draw7Text = `💸 Estabilidade Imperial! Dom Pedro II garantiu 7 moedas para a manutenção do poder.`;

            io.to(room.id).emit("play_animation", { type: "gain_coins", attackerName: player.name, amount: 7, targetName: player.name });
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: draw7Text });
            break;

        case "draw_3_coins_unblockable":
            player.coins += 3;
            io.to(room.id).emit("play_animation", { type: "gain_coins", attackerName: player.name, amount: 3, targetName: player.name });
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `💰 Propina de Colarinho Branco! ${player.name} garantiu 3 moedas de forma imbloqueável através de ${card.name}.` });
            break;

        case "prevent_coup":
            if (target) {
                target.preventCoup = true;
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🛡️ O Patriarca da Independência age! José Bonifácio impediu que ${target.name} desse um Golpe nesta rodada.` });
            }
            break;

        case "marriage_diarchy":
        case "diplomacy_diarchy": {
            if (target) {
                // ── Card swap (main power of Mão do Rei / Princesa Isabel) ──
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

                    let swapText = `🔄 Diplomacia de Corte! ${player.name} trocou uma carta com ${target.name} via ${card.name}.`;
                    if (card.name === "Princesa Isabel") swapText = `📜 Lei Áurea da Diplomacia! Princesa Isabel libertou uma carta em troca de outra com ${target.name}.`;

                    io.to(room.id).emit("chat_message", { sender: "Sistema", text: swapText });
                }

                // ── Diarchy condition ──
                const combo = [...player.hand, ...target.hand];
                if (combo.some((c) => c.name === "Dom Pedro II") && combo.some((c) => c.name === "Rainha Elizabeth II")) {
                    room.diarchy = { player1Id: player.id, player2Id: target.id };
                    io.to(room.id).emit("chat_message", { sender: "Sistema", text: `👑 Diarquia firmada entre ${player.name} e ${target.name}!` });
                }
            }
            break;
        }

        case "redistribute_cards": {
            // Albert Camus: exempt royalty holders
            const cardsToRedistribute: Card[] = [];
            room.players.forEach((p) => {
                if (p.id === player.id) return;
                const hasRoyalty = p.hand.some((c) => c.name === "Dom Pedro II" || c.name === "Rainha Elizabeth II");
                if (!hasRoyalty) {
                    cardsToRedistribute.push(...p.hand);
                    p.hand = [];
                }
            });
            room.deck.push(...cardsToRedistribute);
            room.deck.sort(() => Math.random() - 0.5);
            room.players.forEach((p) => {
                if (p.id === player.id) return;
                if (!p.hand.length) p.hand = room.deck.splice(0, 4);
            });
            room.players.forEach((p) => ensureVisibleCard(p));
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🖋️ O Estrangeiro de Camus! ${player.name} forçou a redistribuição de cartas, exceto para a Realeza.` });
            break;
        }

        case "protection_3_turns":
            player.protectionTurns = 3;
            player.protectionCard = card;
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🛡️ Doutrina de Isolacionismo! George Washington declarou neutralidade total para ${player.name} por 3 rodadas.` });
            break;

        case "protection_2_turns":
            player.protectionTurns = 2;
            player.protectionCard = card;
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🛡️ Imunidade Parlamentar! ${player.name} está protegido por 2 rodadas.` });
            break;

        case "draw_2_or_block":
        case "draw_2_or_block_unblockable":
            player.hand.push(...room.deck.splice(0, 2));
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `📜 Pacto de Defesa! ${player.name} reforçou sua mão com 2 novas cartas.` });
            break;

        case "slavery":
            if (target) {
                target.isSlaveOf = player.id;
                target.slaveryTurnsRemaining = 2;
                player.isSlaverOf = target.id;
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `⛓️ ${player.name} escravizou ${target.name} por 2 rodadas! Seus ganhos vão para o escravizador.` });
                io.to(target.id).emit("chat_message", { sender: "Sistema", text: `⛓️ Você está escravizado! Deve sacar 2 moedas ou usar carta de benefício. Tudo o que ganhar vai para ${player.name}.` });
            }
            break;

        case "block_coups":
            // Reactive power — handled in respond_defense
            break;

        case "swap_card":
            // Protágoras: actor picks from THEIR OWN hand to give
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
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `⏳ Censura Prévia! ${player.name} silenciou ${target.name} por uma rodada.` });
            }
            break;

        case "double_elimination":
            if (target && target.hand.length > 0) {
                const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
                ensureVisibleCard(target);
                io.to(room.id).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: removed });
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `💥 Atentado de Dupla Face! ${player.name} eliminou uma carta de ${target.name} e sacrificou uma própria.` });
                if (player.hand.length > 0) {
                    const myRemoved = player.hand.splice(Math.floor(Math.random() * player.hand.length), 1)[0];
                    ensureVisibleCard(player);
                    io.to(room.id).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: card, targetName: player.name, targetCard: myRemoved });
                }
            }
            break;

        case "eliminate_card":
            if (target && target.hand.length > 0) {
                const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
                ensureVisibleCard(target);
                io.to(room.id).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: removed });
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🗡️ Golpe de Estado! ${player.name} eliminou uma carta de ${target.name}.` });
            }
            break;

        case "shuffle_and_eliminate":
            if (target && target.hand.length > 0) {
                const oldHandSize = target.hand.length;
                room.deck.push(...target.hand);
                target.hand = [];
                room.deck.sort(() => Math.random() - 0.5);
                if (oldHandSize > 1) target.hand = room.deck.splice(0, oldHandSize - 1);
                ensureVisibleCard(target);
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🌪️ Purga Política! ${player.name} forçou ${target.name} a perder uma carta e reembaralhar sua mão.` });
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
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `💸 Corrupção Ativa! ${player.name} desviou ${amount} moedas do caixa de ${target.name}.` });
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
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🛡️ Status Passivo! ${player.name} ganhou 1 moeda e permanece sob proteção de Diógenes.` });
            break;

        case "force_swap_visible":
            if (target) {
                target.visibleCard = null;
                ensureVisibleCard(target);
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🎭 Mudança de Fachada! ${player.name} forçou ${target.name} a alterar sua carta visível.` });
            }
            break;

        case "eliminate_card_cost_2":
            if (target && target.hand.length > 0) {
                player.coins -= 2;
                const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
                room.discardPile.push(removed);
                ensureVisibleCard(target);
                io.to(room.id).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: removed });
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🏹 Assassinato Seletivo! ${player.name} pagou 2 moedas para eliminar uma carta de ${target.name}.` });
            }
            break;

        case "eliminate_card_cost_3":
            if (target && target.hand.length > 0) {
                player.coins -= 3;
                const removed = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
                room.discardPile.push(removed);
                ensureVisibleCard(target);
                io.to(room.id).emit("play_animation", { type: "eliminate", attackerName: player.name, attackerCard: card, targetName: target.name, targetCard: removed });
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🪓 Terror Revolucionário! ${player.name} pagou 3 moedas para guilhotinar uma carta de ${target.name}.` });
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
            io.to(player.id).emit("chat_message", { sender: "Sistema", text: `🧘 Saindo da Caverna: ${player.name} está buscando a verdade! Selecione ${room.pendingTargetsSelection.count} oponentes para revelar suas sombras.` });
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
                text: `🏴 Insurreição Bakuninista! ${player.name} desferiu um golpe coletivo, eliminando cartas de ${targets.map(t => t.name).join(" e ")}.`
            });
            break;
        }

        case "shuffle_and_redistribute":
            if (target && target.hand.length > 0) {
                const count = target.hand.length;
                room.deck.push(...target.hand);
                target.hand = [];
                room.deck.sort(() => Math.random() - 0.5);
                target.hand = room.deck.splice(0, count);
                ensureVisibleCard(target);
                io.to(room.id).emit("chat_message", { sender: "Sistema", text: `⚔️ A Sorte está Lançada! Júlio César cruzou o Rubicão e forçou ${target.name} a recomeçar com ${count} novas cartas!` });
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
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🔄 ${card.name} agiu! Cada jogador deve escolher uma carta para passar ao jogador da esquerda!` });
            return;

        case "redistribute_coins": {
            const totalPool = room.players.reduce((sum, p) => sum + p.coins, 0);
            const equalAmount = Math.ceil(totalPool / room.players.length);
            room.players.forEach((p) => { p.coins = equalAmount; });

            let text = `🛠️ Karl Marx redistribuiu o capital! Todos agora possuem ${equalAmount} moedas.`;
            if (card.name === "Movimento Coletivista") text = `🏴 Ação Direta Coletiva! O Movimento Coletivista redistribuiu a riqueza: todos agora têm ${equalAmount} moedas.`;

            io.to(room.id).emit("chat_message", { sender: "Sistema", text });
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
