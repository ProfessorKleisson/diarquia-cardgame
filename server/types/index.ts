// ──────────────────────────────────────────────────
// Golpe — Shared Game Types (server-side)
// ──────────────────────────────────────────────────

export type CardClass =
    | "Golpe Partidário"
    | "Golpe Militar"
    | "Golpe Sorrateiro"
    | "Monarquia"
    | "Diarquia"
    | "Revolução"
    | "Liberais Clássicos"
    | "Golpe Religioso"
    | "Especial"
    | "República"
    | "Anarquismo";

export interface Card {
    id: string;
    class: CardClass;
    name: string;
    description: string;
    type: "attack" | "defense" | "benefit" | "special";
    power?: string;
    image?: string;
}

export interface Player {
    id: string;
    name: string;
    hand: Card[];
    visibleCard: Card | null;
    coins: number;
    isReady: boolean;
    connected: boolean;
    protectionTurns?: number;
    isSlaverOf?: string;
    isSlaveOf?: string;
    slaveryTurnsRemaining?: number;
    skipNextTurn?: boolean;
    preventCoup?: boolean;
    protectionCard?: Card | null;
}

export interface Room {
    id: string;
    host: string;
    players: Player[];
    status: "waiting" | "playing" | "finished";
    currentTurnIndex: number;
    deck: Card[];
    discardPile: Card[];
    winner: string | null;
    winReason: "coins" | "triad" | "diarchy_coins" | "diarchy_triad" | null;
    maxPlayers: number;
    turnPhase:
    | "start"
    | "action"
    | "end"
    | "waiting_defense"
    | "waiting_card_selection"
    | "waiting_choice"
    | "waiting_rotate_selection"
    | "waiting_targets_selection";
    pendingAction: {
        actorId: string;
        targetId?: string;
        card: Card;
    } | null;
    pendingChoice: {
        actorId: string;
        card: Card;
        targetId?: string;
        options: { id: string; label: string }[];
    } | null;
    pendingCardSelection: {
        actorId: string;
        targetId: string;
        targetHand: Card[];
        actionType: "eliminate" | "swap" | "give";
        card?: Card;
        canSkip?: boolean;
    } | null;
    pendingRotateSelection: {
        selections: Record<string, string>; // playerId -> cardId
        totalPlayers: number;
        card: Card;
    } | null;
    pendingTargetsSelection: {
        actorId: string;
        count: number;
        targets: string[];
        card: Card;
    } | null;
    isPublic: boolean;
    expansionEnabled: boolean;
    diarchy?: { player1Id: string; player2Id: string } | null;
}
