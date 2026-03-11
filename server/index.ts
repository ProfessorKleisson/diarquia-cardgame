// ──────────────────────────────────────────────────
// Golpe — Server Bootstrap
// Creates express + http + socket.io, initializes
// context, and registers all socket handlers.
// ──────────────────────────────────────────────────

import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";

import { initializeContext } from "./context";
import { registerRoomHandlers } from "./handlers/room";
import { registerTurnHandlers } from "./handlers/turn";
import { registerCardHandlers } from "./handlers/cards";
import { registerRotateHandlers } from "./handlers/rotate";
import { registerChoiceHandlers } from "./handlers/choice";

const PORT = 3000;

export async function startServer() {
    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, { cors: { origin: "*" } });

    // Initialize the shared context singleton
    initializeContext(io);

    app.get("/api/health", (_req, res) => {
        res.json({ status: "ok" });
    });

    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        registerRoomHandlers(socket);
        registerTurnHandlers(socket);
        registerCardHandlers(socket);
        registerRotateHandlers(socket);
        registerChoiceHandlers(socket);
    });

    // Vite dev middleware or static dist in production
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        app.use(express.static("dist"));
    }

    httpServer.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
