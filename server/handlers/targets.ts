// ──────────────────────────────────────────────────
// Golpe — Targets Selection Handler
// submit_targets_selection (Platão)
// ──────────────────────────────────────────────────

import type { Socket } from "socket.io";
import { io, rooms } from "../context";
import { checkWinCondition, nextTurn } from "../game/turn";

export function registerTargetsHandlers(socket: Socket) {
    socket.on("submit_targets_selection", ({ roomId, targetIds }) => {
        const room = rooms.get(roomId);
        if (!room || !room.pendingTargetsSelection) return;
        if (room.pendingTargetsSelection.actorId !== socket.id) return;
        if (room.turnPhase !== "waiting_targets_selection") return;

        const actor = room.players.find((p) => p.id === socket.id);
        if (!actor) return;

        const { count, card } = room.pendingTargetsSelection;
        if (targetIds.length !== count) return;

        const revealedData: { playerName: string; cardName: string }[] = [];

        targetIds.forEach((tid: string) => {
            const target = room.players.find((p) => p.id === tid);
            if (target && target.hand.length > 0) {
                const randomCard = target.hand[Math.floor(Math.random() * target.hand.length)];
                revealedData.push({ playerName: target.name, cardName: randomCard.name });

                // Notify victim
                io.to(tid).emit("chat_message", {
                    sender: "Sistema",
                    text: `⚠️ VIGILÂNCIA! ${actor.name} usou Platão e viu que você possui a carta: ${randomCard.name}.`
                });
                io.to(tid).emit("play_animation", {
                    type: "peek",
                    attackerName: actor.name,
                    attackerCard: card,
                    targetName: target.name
                });
            }
        });

        // Send results back to actor
        io.to(actor.id).emit("targets_revealed", { revealedData });

        let reportText = `🔍 Platão revelou a verdade sobre: ${revealedData.map(d => d.playerName).join(", ")}.`;
        io.to(roomId).emit("chat_message", { sender: "Sistema", text: reportText });

        room.pendingTargetsSelection = null;
        checkWinCondition(room);
        nextTurn(room.id);
    });
}
