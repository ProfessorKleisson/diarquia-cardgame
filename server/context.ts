// ──────────────────────────────────────────────────
// Golpe — Shared Runtime Context
// Holds the io server instance and rooms map as a
// singleton so all handler modules can import them.
// ──────────────────────────────────────────────────

import type { Server } from "socket.io";
import type { Room } from "./types";

export let io: Server;
export const rooms = new Map<string, Room>();

export function initializeContext(ioServer: Server) {
    io = ioServer;
}
