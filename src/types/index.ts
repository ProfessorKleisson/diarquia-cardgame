// ──────────────────────────────────────────────────
// Golpe — Client-side Types
// ──────────────────────────────────────────────────

export type CardClass =
    | "Golpe partidário"
    | "Golpe militar"
    | "Golpe sorrateiro"
    | "Monarquia"
    | "Diarquia"
    | "Revolução"
    | "Liberais Clássicos"
    | "Especial"
    | "Golpe Religioso"
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

export interface CardAnimation {
    id?: string | number;
    type: "eliminate" | "swap" | "skip" | "draw" | "gain_coins" | "block_draw" | string;
    attackerName: string;
    attackerCard?: Card | null;
    targetName: string;
    targetCard?: Card | null;
    amount?: number;
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
    pendingCardSelection?: {
        actorId: string;
        targetId: string;
        targetHand: Card[];
        actionType: "eliminate" | "swap" | "give";
        canSkip?: boolean;
    } | null;
    pendingRotateSelection?: {
        selections: Record<string, string>;
        totalPlayers: number;
        card: Card;
    } | null;
    pendingChoice?: {
        actorId: string;
        card: Card;
        options: { id: string; label: string }[];
    } | null;
    pendingTargetsSelection?: {
        actorId: string;
        count: number;
        targets: string[];
        card: Card;
    } | null;
    expansionEnabled: boolean;
    diarchy?: { player1Id: string; player2Id: string } | null;
}
