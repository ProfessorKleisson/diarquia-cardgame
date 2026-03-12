// ──────────────────────────────────────────────────
// Golpe — Turn Management
// nextTurn() and checkWinCondition()
// ──────────────────────────────────────────────────

import { io, rooms } from "../context";
import type { Room } from "../types";

/** Check if any player (or diarchy pair) has met a win condition and mark the room as finished. */
export function checkWinCondition(room: Room) {
    // Diarchy win conditions
    if (room.diarchy) {
        const p1 = room.players.find((p) => p.id === room.diarchy!.player1Id);
        const p2 = room.players.find((p) => p.id === room.diarchy!.player2Id);

        if (p1 && p2) {
            const diarchyBlocked = p1.preventCoup || p2.preventCoup;
            const coinsWin = p1.coins + p2.coins >= 15;

            // Check triad
            const combinedHand = [...p1.hand, ...p2.hand];
            const jokers = combinedHand.filter((c) => c.power === "joker").length;
            const withoutJokers = combinedHand.filter((c) => c.power !== "joker");
            const classCounts: Record<string, number> = {};
            for (const card of withoutJokers) {
                if (card.class !== "Especial") {
                    classCounts[card.class] = (classCounts[card.class] || 0) + 1;
                }
            }
            let triadWin = jokers >= 3;
            let triadClass = "";
            for (const cls in classCounts) {
                if (classCounts[cls] + jokers >= 3) {
                    triadWin = true;
                    triadClass = cls;
                    break;
                }
            }

            if (coinsWin || triadWin) {
                if (diarchyBlocked) {
                    io.to(room.id).emit("chat_message", {
                        sender: "Sistema",
                        text: `🛑 GOLPE DE DIARQUIA BLOQUEADO! ${p1.name} e ${p2.name} teriam assumido o controle total ${coinsWin ? "pelo capital" : `pela Coalizão de ${triadClass}`}, mas José Bonifácio interviu!`
                    });
                } else {
                    room.winner = "DIARCHY";
                    room.winReason = coinsWin ? "diarchy_coins" : "diarchy_triad";
                    room.status = "finished";
                    return;
                }
            }
        }
    }

    // Individual win conditions
    for (const player of room.players) {
        let potentialWin = false;
        let reason = "";

        if (player.coins >= 15) {
            potentialWin = true;
            reason = "acumular monumental poder financeiro";
        }

        if (!potentialWin) {
            const jokers = player.hand.filter((c) => c.power === "joker").length;
            const withoutJokers = player.hand.filter((c) => c.power !== "joker");
            const classCounts: Record<string, number> = {};
            for (const card of withoutJokers) {
                if (card.class !== "Especial") {
                    classCounts[card.class] = (classCounts[card.class] || 0) + 1;
                }
            }
            for (const cls in classCounts) {
                if (classCounts[cls] + jokers >= 3) {
                    potentialWin = true;
                    reason = `formar uma poderosa Coalizão de ${cls}`;
                    break;
                }
            }
            if (!potentialWin && jokers >= 3) {
                potentialWin = true;
                reason = "reunir figuras políticas coringas sob seu comando";
            }
        }

        if (potentialWin) {
            if (player.preventCoup) {
                io.to(room.id).emit("chat_message", {
                    sender: "Sistema",
                    text: `🛑 GOLPE FRUSTRADO! ${player.name} teria vencido ao ${reason}, mas foi impedido pelo Patriarca da Independência, José Bonifácio!`
                });
                continue;
            }
            room.winner = player.id;
            room.winReason = player.coins >= 15 ? "coins" : "triad";
            room.status = "finished";
            return;
        }
    }
}

/** Advance to the next player's turn, handling per-turn effects and skip states. */
export function nextTurn(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    // Per-turn coin bonus (Rainha Elizabeth II passive)
    room.players.forEach((p) => {
        if (p.visibleCard?.power === "passive_coin_and_immune") {
            p.coins += 1;
            io.to(room.id).emit("play_animation", { type: "gain_coins", attackerName: p.name, amount: 1, targetName: p.name });
        }
    });

    const currentPlayer = room.players[room.currentTurnIndex];
    if (currentPlayer.protectionTurns && currentPlayer.protectionTurns > 0) {
        currentPlayer.protectionTurns--;
        if (currentPlayer.protectionTurns === 0) currentPlayer.protectionCard = null;
    }

    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    const nextPlayer = room.players[room.currentTurnIndex];

    // Reset preventCoup
    if (nextPlayer.preventCoup) nextPlayer.preventCoup = false;

    // Slavery turn management
    if (nextPlayer.isSlaveOf) {
        if ((nextPlayer.slaveryTurnsRemaining ?? 0) <= 1) {
            const enslaver = room.players.find((p) => p.id === nextPlayer.isSlaveOf);
            if (enslaver) enslaver.isSlaverOf = undefined;
            nextPlayer.isSlaveOf = undefined;
            nextPlayer.slaveryTurnsRemaining = undefined;
            io.to(room.id).emit("chat_message", { sender: "Sistema", text: `🔓 ${nextPlayer.name} foi libertado da escravidão!` });
        } else {
            nextPlayer.slaveryTurnsRemaining = (nextPlayer.slaveryTurnsRemaining ?? 1) - 1;
            io.to(nextPlayer.id).emit("chat_message", {
                sender: "Sistema",
                text: `⛓️ Você ainda está escravizado (${nextPlayer.slaveryTurnsRemaining} rodada(s) restante(s)). Saque 2 moedas ou jogue carta de benefício — seus ganhos irão ao escravizador.`,
            });
        }
    }

    // Skip effects
    if (nextPlayer.skipNextTurn) {
        nextPlayer.skipNextTurn = false;
        io.to(room.id).emit("chat_message", { sender: "Sistema", text: `⏳ ${nextPlayer.name} perdeu a vez.` });
        setTimeout(() => nextTurn(roomId), 1000);
        return;
    }

    room.turnPhase = "start";
    io.to(roomId).emit("room_update", room);
}
