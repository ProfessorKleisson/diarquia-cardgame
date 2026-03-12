import type { Room, Player, Card } from "../types";

/** Ensure that visibleCard is still in the player's hand; clear it if not. */
export function ensureVisibleCard(player: Player) {
    if (player.visibleCard) {
        const stillInHand = player.hand.some((c) => c.id === player.visibleCard!.id);
        if (!stillInHand) {
            player.visibleCard = null;
        }
    }
}

/** 
 * Draws one or more cards from the deck. 
 * If the deck is empty, reshuffles the discard pile back into the deck.
 */
export function drawFromDeck(room: Room, count: number = 1): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
        if (room.deck.length === 0 && room.discardPile.length > 0) {
            // Reshuffle discard pile into deck
            room.deck = [...room.discardPile];
            room.discardPile = [];
            room.deck.sort(() => Math.random() - 0.5);
            console.log(`Deck was empty, reshuffled ${room.deck.length} cards from discard pile.`);
        }

        if (room.deck.length > 0) {
            drawn.push(room.deck.shift()!);
        }
    }
    return drawn;
}
