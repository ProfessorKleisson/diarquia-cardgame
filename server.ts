// Entry point — delegates entirely to the modular server.
// For editing game logic, see: server/game/effects.ts
// For editing handlers, see: server/handlers/
// For types, see: server/types/index.ts

import { startServer } from "./server/index";

startServer();
