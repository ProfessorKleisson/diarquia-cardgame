// ──────────────────────────────────────────────────
// Golpe — Room Handlers
// create_room, join_room, join_random_room,
// toggle_ready, leave_room, restart_game, start_game,
// set_visible_card, disconnect
// ──────────────────────────────────────────────────

import type { Socket, Server } from "socket.io";
import { io, rooms } from "../context";
import { generateDeck } from "../cards/definitions";
import { ensureVisibleCard, drawFromDeck } from "../game/deck";

export function registerRoomHandlers(socket: Socket) {
    socket.on("create_room", ({ playerName, maxPlayers, isPublic }, callback) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newRoom = {
            id: roomId,
            host: socket.id,
            players: [{ id: socket.id, name: playerName, hand: [], visibleCard: null, coins: 0, isReady: false, connected: true }],
            status: "waiting" as const,
            currentTurnIndex: 0,
            deck: generateDeck(),
            discardPile: [],
            winner: null,
            winReason: null,
            maxPlayers,
            turnPhase: "start" as const,
            isPublic: isPublic ?? false,
            pendingAction: null,
            pendingCardSelection: null,
            pendingChoice: null,
            pendingRotateSelection: null,
            pendingTargetsSelection: null,
            diarchy: null,
            expansionEnabled: true,
        };
        rooms.set(roomId, newRoom);
        socket.join(roomId);
        callback({ success: true, roomId });
        io.to(roomId).emit("room_update", newRoom);
    });

    socket.on("join_room", ({ roomId, playerName }, callback) => {
        const room = rooms.get(roomId);
        if (!room) return callback({ success: false, error: "Room not found" });
        if (room.status !== "waiting") return callback({ success: false, error: "Game already started" });
        if (room.players.length >= room.maxPlayers) return callback({ success: false, error: "Room is full" });

        const existing = room.players.find((p) => p.id === socket.id);
        if (!existing) {
            room.players.push({ id: socket.id, name: playerName, hand: [], visibleCard: null, coins: 0, isReady: false, connected: true });
        } else {
            existing.name = playerName;
            existing.connected = true;
        }
        socket.join(roomId);
        callback({ success: true, roomId });
        io.to(roomId).emit("room_update", room);
    });

    socket.on("join_random_room", ({ playerName }, callback) => {
        const available = Array.from(rooms.values()).filter(
            (r) => r.isPublic === true && r.status === "waiting" && r.players.length < r.maxPlayers
        );
        if (available.length === 0) return callback({ success: false, error: "Nenhuma sala pública disponível no momento." });

        const room = available[Math.floor(Math.random() * available.length)];
        if (!room.players.find((p) => p.id === socket.id)) {
            room.players.push({ id: socket.id, name: playerName, hand: [], visibleCard: null, coins: 0, isReady: false, connected: true });
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

    socket.on("toggle_expansion", ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room || room.host !== socket.id) return;
        room.expansionEnabled = !room.expansionEnabled;
        io.to(roomId).emit("room_update", room);
    });

    socket.on("leave_room", ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room) return;
        room.players = room.players.filter((p) => p.id !== socket.id);
        socket.leave(roomId);
        if (room.players.length === 0) {
            rooms.delete(roomId);
        } else {
            if (room.host === socket.id) room.host = room.players[0].id;
            io.to(roomId).emit("room_update", room);
        }
    });

    socket.on("restart_game", ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room || room.host !== socket.id) return;
        room.status = "waiting";
        room.winner = null;
        room.winReason = null;
        room.deck = generateDeck(room.expansionEnabled);
        room.discardPile = [];
        room.pendingAction = null;
        room.pendingCardSelection = null;
        room.pendingTargetsSelection = null;
        room.diarchy = null;
        room.players.forEach((p) => {
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
        if (!room || room.host !== socket.id) return;
        if (room.players.length < 2) return;
        if (!room.players.every((p) => p.isReady)) return;
        room.status = "playing";
        room.currentTurnIndex = 0;
        room.turnPhase = "start";
        room.deck = generateDeck(room.expansionEnabled);
        room.players.forEach((player) => {
            player.hand = drawFromDeck(room, 4);
            ensureVisibleCard(player);
        });
        io.to(roomId).emit("room_update", room);
    });

    socket.on("set_visible_card", ({ roomId, cardId }) => {
        const room = rooms.get(roomId);
        if (!room) return;
        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;
        const card = player.hand.find((c) => c.id === cardId);
        if (!card || card.class === "Especial") return;
        player.visibleCard = card;
        io.to(roomId).emit("room_update", room);
    });

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
}
