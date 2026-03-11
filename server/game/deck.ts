// ──────────────────────────────────────────────────
// Golpe — Deck helpers
// ──────────────────────────────────────────────────

import type { Player } from "../types";

/** Ensure that visibleCard is still in the player's hand; clear it if not. */
export function ensureVisibleCard(player: Player) {
    if (player.visibleCard) {
        const stillInHand = player.hand.some((c) => c.id === player.visibleCard!.id);
        if (!stillInHand) {
            player.visibleCard = null;
        }
    }
}
