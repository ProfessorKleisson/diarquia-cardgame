import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "motion/react";
import { Socket } from "socket.io-client";
import { Crown, Coins, Shield, Swords, Home, RotateCcw, Eye, Plus } from "lucide-react";

import { cn } from "../utils/cn";
import type { Room, Card } from "../types";
import { AnimatedBackground } from "./AnimatedBackground";
import { AnimatedCounter } from "./animations/AnimatedCounter";
import { ActivityFeed } from "./ActivityFeed";

// Modals
import { TargetingOverlay } from "./modals/TargetingOverlay";
import { DefenseModal } from "./modals/DefenseModal";
import { CardSelectionModal } from "./modals/CardSelectionModal";
import { ChoiceModal } from "./modals/ChoiceModal";
import { RotateSelectionModal } from "./modals/RotateSelectionModal";
import { MultiTargetingOverlay } from "./modals/MultiTargetingOverlay";
import { RevealedCardsModal } from "./modals/RevealedCardsModal";
import { DiscardCardInspectionModal } from "./modals/DiscardCardInspectionModal";
import { OpponentViewModal } from "./modals/OpponentViewModal";

export function Game({ room, socket }: { room: Room; socket: Socket }) {
    const [defensePrompt, setDefensePrompt] = useState<{ attackerName: string; cardName: string } | null>(null);
    const [targetingAction, setTargetingAction] = useState<{ cardId: string; isAttack: boolean } | null>(null);
    const [multiTargetsSelection, setMultiTargetsSelection] = useState<string[]>([]);
    const [revealedCards, setRevealedCards] = useState<{ playerName: string; cardName: string }[] | null>(null);

    // Visible card selection state
    const [isSelectingVisible, setIsSelectingVisible] = useState(false);

    // Activity feed alerts
    const [alerts, setAlerts] = useState<{ id: number; text: string }[]>([]);
    const alertCounterRef = useRef(0);

    // Mobile layout states
    const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
    const [mobileStackIndex, setMobileStackIndex] = useState(0);
    const [discardModalOpen, setDiscardModalOpen] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [opponentViewModal, setOpponentViewModal] = useState<string | null>(null); // playerId

    // --- Inner Component for Individual Card Rendering ---
    const CardItem = (props: {
        card: Card;
        isVisibleCard: boolean;
        idx: number;
        isStacked?: boolean;
        isMobile?: boolean;
        key?: string | number;
    }) => {
        const { card, isVisibleCard, idx, isStacked = false, isMobile = false } = props;
        const needsTarget = card.type === "attack" ||
            ["prevent_coup", "peek_and_swap", "swap_card", "force_swap_visible", "marriage_diarchy", "diplomacy_diarchy"].includes(card.power || "");

        const handleClick = () => {
            if (!me) return; // Ensure 'me' is defined

            if (card.class === "Especial") {
                if (isSelectingVisible || !me?.visibleCard) {
                    alert("Cartas Especiais não podem ser escolhidas como Carta Visível.");
                    return;
                }
            }

            if (isSelectingVisible || !me?.visibleCard) {
                socket.emit("set_visible_card", { roomId: room.id, cardId: card.id });
                setIsSelectingVisible(false);
                return;
            }

            if (isMobile && idx !== mobileStackIndex) {
                setMobileStackIndex(idx);
                return;
            }

            if (isMyTurn && room.turnPhase === "action" && !isVisibleCard) {
                if (needsTarget) {
                    if (room.players.length <= 1) {
                        alert("Você precisa de pelo menos um oponente para usar esta carta!");
                        return;
                    }
                    setTargetingAction({ cardId: card.id, isAttack: true });
                } else {
                    socket.emit("play_card", { roomId: room.id, cardId: card.id });
                }
            }
        };

        return (
            <motion.div
                layout
                onClick={handleClick}
                whileHover={!isMobile ? { scale: 1.05, y: -20, zIndex: 50, transition: { duration: 0.2 } } : {}}
                className={cn(
                    "w-56 h-[20rem] md:w-64 md:h-[24rem] rounded-xl border-2 flex flex-col transition-all duration-300 cursor-pointer flex-shrink-0 relative group select-none shadow-black/50 shadow-lg bg-stone-900 overflow-hidden",
                    // Mobile-specific classes
                    isMobile && [
                        "absolute left-1/2 -ml-28",
                        idx === mobileStackIndex ? "z-30 scale-100 translate-x-0 opacity-100" :
                            idx < mobileStackIndex ? "z-20 scale-90 -translate-x-12 opacity-60" : "z-20 scale-90 translate-x-12 opacity-60",
                        Math.abs(idx - mobileStackIndex) > 1 ? "hidden" : "flex"
                    ],
                    // Desktop stacked classes
                    !isMobile && isStacked && (idx === 1 ? "md:ml-12" : "md:-ml-52 md:hover:ml-4"),

                    // Interaction/Type border colors
                    isSelectingVisible ? "border-amber-500/50 hover:border-amber-400" :
                        (isVisibleCard ? "border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.4)] md:z-40" : "border-stone-700/50 hover:border-stone-400"),
                    !isSelectingVisible && !isVisibleCard && card.class === "Especial" ? "border-purple-500/30 hover:border-purple-400" : "",
                    isMyTurn && room.turnPhase === "action" && !isVisibleCard && !isSelectingVisible ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-stone-950" : "",
                    isSelectingVisible && card.class === "Especial" ? "opacity-30 md:opacity-50 cursor-not-allowed hover:transform-none" : ""
                )}
            >
                {card.image && (
                    <div className="absolute inset-0 z-0">
                        <img
                            src={card.image}
                            alt={card.name}
                            className="w-full h-full object-cover opacity-100 transition-all duration-500 group-hover:scale-110"
                        />
                    </div>
                )}

                <div className="relative z-10 h-full w-full pointer-events-none">
                    {!card.image && (
                        <div className="flex-grow h-full flex items-center justify-center opacity-40">
                            {card.type === "attack" && <Swords className={cn("w-20 h-20", isVisibleCard ? "text-amber-400" : "text-red-400")} />}
                            {card.type === "defense" && <Shield className={cn("w-20 h-20", isVisibleCard ? "text-amber-400" : "text-blue-400")} />}
                            {card.type === "benefit" && <Coins className={cn("w-20 h-20", isVisibleCard ? "text-amber-400" : "text-amber-400")} />}
                            {card.type === "special" && <Crown className={cn("w-20 h-20", isVisibleCard ? "text-amber-400" : "text-purple-400")} />}
                        </div>
                    )}
                </div>

                {/* 'Visível' tag as requested */}
                {isVisibleCard && (
                    <div className="absolute top-3 right-3 bg-stone-950/80 backdrop-blur-md border border-amber-500/50 text-amber-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest z-40 shadow-lg">
                        Visível
                    </div>
                )}
            </motion.div>
        );
    };


    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStart) return;
        const currentTouch = e.targetTouches[0].clientX;
        const diff = touchStart - currentTouch;

        const myHandSize = me?.hand.length || 1;
        if (diff > 50) { // Swiped left
            setMobileStackIndex((prev) => Math.min(prev + 1, myHandSize - 1));
            setTouchStart(null);
        }
        if (diff < -50) { // Swiped right
            setMobileStackIndex((prev) => Math.max(prev - 1, 0));
            setTouchStart(null);
        }
    };

    const handleTouchEnd = () => {
        setTouchStart(null);
    };

    const me = room.players.find((p) => p.id === socket.id);
    const isMyTurn = room.players[room.currentTurnIndex]?.id === socket.id;
    const currentTurnPlayer = room.players[room.currentTurnIndex];

    const hasMonarch = me?.hand.some((c) => c.name === "Dom Pedro II" || c.name === "Rainha Elizabeth II");
    const partnershipCard = me?.hand.find((c) => c.power === "marriage_diarchy" || c.power === "diplomacy_diarchy");
    const canFormDiarchy = Boolean(
        isMyTurn &&
        room.turnPhase === "action" &&
        !room.diarchy &&
        hasMonarch &&
        partnershipCard &&
        room.players.some((p) => p.id !== me?.id && p.hand.some((c) => c.name === "Dom Pedro II" || c.name === "Rainha Elizabeth II"))
    );

    const groupedHand = useMemo(() => {
        if (!me) return { visibleCard: null, groups: [] };

        const hand = [...me.hand];
        const visibleCard = me.visibleCard;

        const handWithoutVisible = visibleCard
            ? hand.filter((c) => c.id !== visibleCard.id)
            : hand;

        const groupsMap: Record<string, Card[]> = {};
        handWithoutVisible.forEach((card) => {
            if (!groupsMap[card.class]) groupsMap[card.class] = [];
            groupsMap[card.class].push(card);
        });

        const groups = Object.entries(groupsMap).sort((a, b) => a[0].localeCompare(b[0]));

        return { visibleCard, groups };
    }, [me?.id, me?.hand, me?.visibleCard]);

    useEffect(() => {
        const onDefenseRequired = (data: { attackerName: string; cardName: string }) => {
            setDefensePrompt(data);
        };

        const onChatMessage = (data: { sender: string; text: string }) => {
            const id = ++alertCounterRef.current;
            setAlerts(prev => [{ id, text: data.text }, ...prev].slice(0, 6));
            setTimeout(() => {
                setAlerts(prev => prev.filter(a => a.id !== id));
            }, 20000);
        };

        const onTargetsRevealed = (data: { revealedData: { playerName: string; cardName: string }[] }) => {
            setRevealedCards(data.revealedData);
        };

        socket.on("defense_required", onDefenseRequired);
        socket.on("chat_message", onChatMessage);
        socket.on("targets_revealed", onTargetsRevealed);

        return () => {
            socket.off("defense_required", onDefenseRequired);
            socket.off("chat_message", onChatMessage);
            socket.off("targets_revealed", onTargetsRevealed);
        };
    }, [socket]);

    if (!me) return null;

    if (room.status === "finished") {
        const isDiarchyWin = room.winner === "DIARCHY";
        const winnerPlayers = isDiarchyWin
            ? room.players.filter(p => room.diarchy && (p.id === room.diarchy.player1Id || p.id === room.diarchy.player2Id))
            : room.players.filter(p => p.id === room.winner);

        if (winnerPlayers.length === 0) return null;
        const winnerNames = winnerPlayers.map(p => p.name).join(" e ");
        const winnerHands = winnerPlayers.flatMap(p => p.hand);

        return (
            <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-start md:justify-center p-4 pt-8 md:pt-4 relative overflow-y-auto overflow-x-hidden">
                <AnimatedBackground />

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="z-50 text-center mb-4"
                >
                    <motion.div
                        animate={{ rotate: [0, -10, 10, -10, 0], y: [0, -12, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                    >
                        <Crown className="w-16 h-16 md:w-24 md:h-24 text-amber-500 mx-auto mb-3 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                    </motion.div>

                    <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter uppercase italic">
                        VITÓRIA!
                    </h1>
                    <p className="text-base md:text-2xl text-stone-400">
                        <span className="text-amber-500 font-bold text-lg md:text-3xl">{winnerNames}</span>{" "}
                        {room.winReason === "coins" && "conquistou o poder comprando opositores políticos!"}
                        {room.winReason === "triad" && "formou uma Coalizão Política!"}
                        {room.winReason === "diarchy_coins" && "selaram um Pacto de Poder através da Diarquia!"}
                        {room.winReason === "diarchy_triad" && "uniram forças numa Aliança Dinástica!"}
                        {!room.winReason && (isDiarchyWin ? "venceram formando uma Diarquia!" : "consolidou seu Golpe!")}
                    </p>
                </motion.div>

                {/* Winner's Cards */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-6 relative z-40 max-w-sm md:max-w-5xl px-2">
                    {winnerHands.map((card, idx) => (
                        <motion.div
                            key={card.id + idx}
                            initial={{
                                opacity: 0,
                                y: 200,
                                rotate: (idx - (winnerHands.length / 2)) * 12,
                                x: (idx - (winnerHands.length / 2)) * 60
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                x: 0,
                                rotate: (idx - (winnerHands.length / 2)) * 6,
                                transition: {
                                    type: "spring",
                                    stiffness: 100,
                                    damping: 14,
                                    delay: 0.2 + (idx * 0.1)
                                }
                            }}
                            whileHover={{
                                scale: 1.15,
                                rotate: 0,
                                zIndex: 100,
                                transition: { duration: 0.2 }
                            }}
                            className="w-24 h-36 md:w-36 md:h-52 rounded-xl border-2 md:border-4 border-amber-500/50 bg-stone-900 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden relative group cursor-pointer flex-shrink-0"
                        >
                            {card.image && (
                                <img src={card.image} alt={card.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-80" />
                            <div className="absolute bottom-2 inset-x-0 p-1 md:p-3 text-center">
                                <div className="text-[8px] md:text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-0.5">{card.class}</div>
                                <div className="text-[10px] md:text-sm font-bold text-stone-100 leading-tight">{card.name}</div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="z-50 flex flex-col sm:flex-row gap-3 mt-2 w-full max-w-sm md:max-w-none px-2 md:px-0 md:w-auto"
                >
                    <button
                        onClick={() => {
                            socket.emit("leave_room", { roomId: room.id });
                            window.location.href = "/";
                        }}
                        className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-6 py-3 rounded-full font-bold text-sm md:text-lg transition-all shadow-xl border border-stone-700 active:scale-95 uppercase tracking-wide flex items-center justify-center gap-2"
                    >
                        <Home className="w-4 h-4 md:w-5 md:h-5" />
                        Voltar ao Início
                    </button>

                    {room.host === socket.id && (
                        <button
                            onClick={() => {
                                socket.emit("restart_game", { roomId: room.id });
                            }}
                            className="bg-amber-600 hover:bg-amber-500 text-stone-900 px-6 py-3 rounded-full font-black text-sm md:text-lg transition-all shadow-xl shadow-amber-600/20 active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                            Jogar Novamente
                        </button>
                    )}

                    {room.host !== socket.id && (
                        <div className="bg-stone-800/50 text-stone-500 px-6 py-3 rounded-full font-bold text-sm md:text-lg border border-stone-700/50 flex items-center justify-center gap-2 cursor-not-allowed uppercase tracking-wide">
                            <RotateCcw className="w-4 h-4 opacity-50" />
                            Aguardando o Host...
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-900/80 text-stone-100 flex flex-col font-sans overflow-y-auto overflow-x-hidden relative">
            <AnimatedBackground />

            {/* Top Bar: Opponents */}
            <div className={cn(
                "bg-stone-950 p-1 md:p-4 border-b border-stone-800 flex md:justify-center overflow-x-auto gap-2 md:gap-8 shadow-md transition-all scrollbar-hide",
                targetingAction ? "z-[60] relative" : "z-10"
            )}>
                {room.players.filter(p => p.id !== socket.id).map(player => (
                    <div key={player.id} className={cn(
                        "flex flex-col items-center bg-stone-900 p-1.5 md:p-4 rounded-xl border flex-shrink-0 w-[90px] md:min-w-[160px] md:w-auto transition-all relative",
                        player.id === currentTurnPlayer.id ? "border-amber-500 shadow-lg shadow-amber-500/20" : "border-stone-800",
                        targetingAction ? "ring-2 ring-red-500/50 cursor-pointer hover:scale-105" : "",
                        (room.turnPhase === "waiting_targets_selection" && room.pendingTargetsSelection?.actorId === socket.id) ? (
                            multiTargetsSelection.includes(player.id) ? "ring-4 ring-amber-500 shadow-xl scale-105 z-30" : "ring-2 ring-stone-700 cursor-pointer hover:border-amber-500/50"
                        ) : ""
                    )}
                        onClick={() => {
                            if (targetingAction) {
                                socket.emit("play_card", { roomId: room.id, cardId: targetingAction.cardId, targetPlayerId: player.id });
                                setTargetingAction(null);
                            } else if (room.turnPhase === "waiting_targets_selection" && room.pendingTargetsSelection?.actorId === socket.id) {
                                setMultiTargetsSelection(prev => {
                                    if (prev.includes(player.id)) return prev.filter(id => id !== player.id);
                                    if (prev.length >= (room.pendingTargetsSelection?.count || 0)) return prev;
                                    return [...prev, player.id];
                                });
                            } else {
                                const isPartner = room.diarchy && (
                                    (room.diarchy.player1Id === me?.id && room.diarchy.player2Id === player.id) ||
                                    (room.diarchy.player2Id === me?.id && room.diarchy.player1Id === player.id)
                                );
                                if (player.visibleCard || isPartner) {
                                    setOpponentViewModal(player.id);
                                }
                            }
                        }}
                    >
                        {targetingAction && (
                            <div className="absolute inset-0 bg-red-500/20 rounded-xl flex items-center justify-center z-20">
                                <Swords className="w-8 h-8 text-red-500" />
                            </div>
                        )}
                        <div className="font-bold text-xs md:text-lg mb-1 md:mb-2 flex items-center gap-1 md:gap-2 truncate max-w-full">
                            <span className="truncate">{player.name}</span>
                            {player.id === currentTurnPlayer.id && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />}
                        </div>

                        <div className="flex gap-2 md:gap-4 text-xs md:text-sm text-stone-400 mb-1">
                            <div className="flex items-center gap-0.5 md:gap-1">
                                <Coins className="w-3 h-3 md:w-4 md:h-4 text-amber-400" /> {player.coins}
                            </div>
                            <div className="flex items-center gap-0.5 md:gap-1">
                                <div className="w-2 h-3 md:w-3 md:h-4 bg-stone-700 rounded-sm border border-stone-600" /> {player.hand.length}
                            </div>
                            {player.protectionTurns !== undefined && player.protectionTurns > 0 && (
                                <div className="flex items-center gap-0.5 md:gap-1 text-blue-400">
                                    <Shield className="w-3 h-3 md:w-4 md:h-4" /> {player.protectionTurns}
                                </div>
                            )}
                            {player.preventCoup && (
                                <div className="flex items-center gap-0.5 md:gap-1 text-emerald-400" title="Protegido por José Bonifácio">
                                    <Shield className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="text-[9px] font-bold hidden md:inline">Imune</span>
                                </div>
                            )}
                        </div>

                        {/* Opponent Hand Render */}
                        <div className="relative h-14 md:h-24 w-full overflow-hidden mt-1 md:mt-4">
                            {player.hand.map((card, idx) => {
                                const isVisible = player.visibleCard?.id === card.id;
                                const isPartner = room.diarchy && (
                                    (room.diarchy.player1Id === me.id && room.diarchy.player2Id === player.id) ||
                                    (room.diarchy.player2Id === me.id && room.diarchy.player1Id === player.id)
                                );

                                return (
                                    <div
                                        key={card.id + idx}
                                        className={cn(
                                            "w-9 h-14 md:w-16 md:h-24 rounded-md border shadow-md absolute origin-bottom transition-all",
                                            isVisible ? "border-amber-500 z-20" : (isPartner ? "border-blue-500 shadow-blue-500/50" : "border-stone-700 z-10")
                                        )}
                                        style={{
                                            left: "50%",
                                            transform: `translateX(calc(-50% + ${(idx - (player.hand.length / 2)) * 8}px)) rotate(${(idx - (player.hand.length / 2)) * 4}deg)`,
                                            bottom: "4px",
                                        }}
                                    >
                                        {isVisible && player.visibleCard?.image ? (
                                            <div className="w-full h-full relative group cursor-help">
                                                <img src={player.visibleCard.image} className="w-full h-full object-cover rounded-md opacity-90 group-hover:opacity-100" title={player.visibleCard.name} />
                                                <div className="absolute -top-2 -right-2 bg-amber-500 w-4 h-4 rounded-full border border-yellow-900 shadow-sm" title="Visible Card"></div>
                                            </div>
                                        ) : isPartner && card.image ? (
                                            <div className="w-full h-full relative group cursor-help">
                                                <img src={card.image} className="w-full h-full object-cover rounded-md opacity-90 group-hover:opacity-100" title={card.name} />
                                            </div>
                                        ) : (
                                            <img src="/cards/verso.webp" className="w-full h-full object-cover rounded-md opacity-80" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {player.protectionCard && (
                            <div className="absolute -bottom-12 z-30 transform rotate-90 scale-50 origin-center">
                                <div className="w-32 h-48 rounded-lg overflow-hidden border-2 border-blue-500 shadow-lg shadow-blue-500/20 bg-stone-900">
                                    {player.protectionCard.image && (
                                        <img src={player.protectionCard.image} className="w-full h-full object-cover opacity-80" />
                                    )}
                                    <div className="absolute inset-x-0 bottom-4 text-center">
                                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md uppercase">Protected</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Center: Board */}
            <div className="md:flex-1 flex-none flex flex-col md:flex-row items-center md:justify-center justify-start p-0 md:p-8 relative mt-0 md:mt-0">
                <div className="absolute top-1 left-2 md:top-4 md:left-4 flex gap-2 z-20">
                    <div className="bg-stone-800/80 backdrop-blur px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-stone-700 flex items-center gap-2 md:gap-3 scale-75 md:scale-100 origin-top-left">
                        <span className="text-stone-400 text-xs md:text-sm font-medium uppercase tracking-wider">Turn</span>
                        <span className="font-bold text-amber-500 text-sm md:text-base">{currentTurnPlayer.name}</span>
                        <span className="text-stone-500 text-xs md:text-sm">({room.turnPhase})</span>
                    </div>
                    <div className="bg-stone-800/80 backdrop-blur px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-stone-700 flex items-center gap-2 md:hidden scale-75 origin-top-left">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span className="font-bold text-amber-500 text-sm">Bank</span>
                    </div>
                </div>

                {canFormDiarchy && partnershipCard && (
                    <div className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 animate-pulse z-40 scale-75 md:scale-100 origin-left">
                        <button
                            onClick={() => {
                                setTargetingAction({ cardId: partnershipCard.id, isAttack: false });
                            }}
                            className="bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-900 font-black px-4 md:px-6 py-6 md:py-8 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.6)] flex flex-col items-center gap-2 transform transition-all hover:scale-105"
                        >
                            <Crown className="w-8 h-8 md:w-12 md:h-12" />
                            <span className="uppercase tracking-widest text-xs md:text-sm text-center leading-tight">Formar<br />Diarquia</span>
                        </button>
                    </div>
                )}

                <div className="flex justify-center gap-4 md:gap-12 items-center mt-9 md:mt-0 scale-90 md:scale-100 mx-auto">
                    {/* Deck */}
                    <div
                        className="order-1 relative group cursor-pointer"
                        onClick={() => {
                            if (isMyTurn && room.turnPhase === "start") {
                                socket.emit("draw_card", { roomId: room.id });
                            }
                        }}
                    >
                        <div className="absolute top-[-3px] left-[-3px] w-24 h-36 md:w-32 md:h-48 bg-stone-800 rounded-xl border-2 border-stone-700 -z-10 overflow-hidden hidden md:block">
                            <img src="/cards/verso.webp" className="w-full h-full object-cover opacity-20" />
                        </div>
                        <div className="absolute top-[-6px] left-[-6px] w-24 h-36 md:w-32 md:h-48 bg-stone-800 rounded-xl border-2 border-stone-700 -z-20 overflow-hidden hidden md:block">
                            <img src="/cards/verso.webp" className="w-full h-full object-cover opacity-10" />
                        </div>
                        <div className="absolute top-[-2px] left-[-2px] w-full h-full bg-stone-800 rounded-xl border-2 border-stone-700 -z-10 overflow-hidden md:hidden">
                            <img src="/cards/verso.webp" className="w-full h-full object-cover opacity-20" />
                        </div>
                        <div className="absolute top-[-4px] left-[-4px] w-full h-full bg-stone-800 rounded-xl border-2 border-stone-700 -z-20 overflow-hidden md:hidden">
                            <img src="/cards/verso.webp" className="w-full h-full object-cover opacity-10" />
                        </div>

                        <div className={cn(
                            "relative w-20 h-28 md:w-32 md:h-48 rounded-xl border-2 shadow-xl flex items-center justify-center transition-all overflow-hidden bg-stone-800",
                            isMyTurn && room.turnPhase === "start" ? "border-amber-500 hover:-translate-y-2 hover:shadow-amber-500/20" : "border-stone-700"
                        )}>
                            <img src="/cards/verso.webp" alt="GOLPE" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>

                    <div className="order-2 w-auto hidden md:flex justify-center mx-12">
                        <div className="flex flex-col items-center justify-center bg-stone-800/50 w-48 h-48 rounded-full border-4 border-dashed border-stone-700 shadow-inner">
                            <Coins className="w-12 h-12 text-amber-500 mb-2 opacity-80" />
                            <div className="text-stone-400 font-medium tracking-widest uppercase text-sm">Bank</div>
                        </div>
                    </div>

                    <div
                        onClick={() => {
                            if (room.discardPile.length > 0) {
                                setDiscardModalOpen(true);
                            }
                        }}
                        className={cn(
                            "order-3 w-20 h-28 md:w-36 md:h-52 bg-stone-900 rounded-xl border-2 border-dashed flex items-center justify-center relative transition-all group",
                            isMyTurn && room.turnPhase === "start" && room.discardPile.length > 0
                                ? "border-orange-500 cursor-pointer hover:-translate-y-2 hover:shadow-xl shadow-orange-500/20"
                                : room.discardPile.length > 0 ? "border-stone-500 cursor-pointer hover:border-stone-400" : "border-stone-700"
                        )}
                    >
                        {room.discardPile.length > 0 ? (
                            <div className="absolute inset-0 bg-stone-800 rounded-xl border-2 border-stone-600 overflow-hidden">
                                {room.discardPile[room.discardPile.length - 1].image ? (
                                    <>
                                        <img
                                            src={room.discardPile[room.discardPile.length - 1].image}
                                            className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/40">
                                            <Eye className="w-8 h-8 md:w-12 md:h-12 text-white drop-shadow-md" />
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent" />
                                        <div className="absolute bottom-2 inset-x-0 text-center text-[10px] font-bold text-stone-300 pointer-events-none uppercase">
                                            {room.discardPile[room.discardPile.length - 1].name}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full p-2 text-center pointer-events-none relative">
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/40">
                                            <Eye className="w-8 h-8 md:w-12 md:h-12 text-white drop-shadow-md" />
                                        </div>
                                        <span className="text-[10px] text-stone-400 mb-1 uppercase tracking-tighter">Discard</span>
                                        <span className="font-bold text-xs truncate w-full relative z-0">{room.discardPile[room.discardPile.length - 1].class}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="text-stone-600 text-sm">Discard</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom: My Hand & Actions */}
            <div className="bg-stone-950 p-2 md:p-6 border-t border-stone-800 transition-colors w-full">
                <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row gap-2 md:gap-8 items-center md:items-end w-full px-2 lg:px-6">
                    <div className="hidden md:flex flex-col gap-4 min-w-[200px]">
                        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800">
                            <div className="text-sm text-stone-500 uppercase tracking-wider font-semibold mb-1">My Coins</div>
                            <div className="text-3xl font-bold text-amber-500 flex items-center gap-2">
                                <Coins className="w-6 h-6" /> <AnimatedCounter value={me.coins} /> <span className="text-sm text-stone-600 font-normal">/ 15</span>
                            </div>
                        </div>

                        {me.protectionCard && (
                            <div className="bg-blue-900/10 border border-blue-500/30 p-3 rounded-xl flex items-center gap-4 relative overflow-hidden group">
                                <div className="w-12 h-16 rounded border border-blue-500/50 overflow-hidden transform group-hover:rotate-12 transition-transform">
                                    {me.protectionCard.image && <img src={me.protectionCard.image} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Protected</span>
                                    <span className="text-sm font-bold text-white uppercase">{me.protectionCard.name}</span>
                                    <span className="text-xs text-blue-300/80 font-medium">{me.protectionTurns} rounds left</span>
                                </div>
                                <div className="absolute -right-2 -bottom-2 opacity-10">
                                    <Shield className="w-12 h-12 text-blue-500" />
                                </div>
                            </div>
                        )}

                        {isMyTurn && room.turnPhase === "start" && (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => socket.emit("draw_card", { roomId: room.id })}
                                    className="bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold py-3 px-4 rounded-lg transition-colors flex justify-center"
                                >
                                    Draw Card
                                </button>
                                {room.discardPile.length > 0 && (
                                    <button
                                        onClick={() => socket.emit("draw_from_discard", { roomId: room.id })}
                                        className="bg-orange-600 hover:bg-orange-500 text-stone-900 font-bold py-3 px-4 rounded-lg transition-colors flex justify-center truncate"
                                        title={`Take ${room.discardPile[room.discardPile.length - 1].class}`}
                                    >
                                        Take Discard
                                    </button>
                                )}
                                <button
                                    onClick={() => socket.emit("take_coins", { roomId: room.id })}
                                    className="bg-stone-700 hover:bg-stone-600 text-amber-400 font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
                                >
                                    <Coins className="w-4 h-4" /> Take 2 Coins
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="md:hidden fixed bottom-4 left-4 right-4 flex justify-between items-end z-[100] pointer-events-none">
                        <div className="bg-stone-900/95 backdrop-blur border border-stone-700 px-4 py-2 rounded-full flex items-center gap-3 shadow-2xl pointer-events-auto mr-auto">
                            <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                                <Coins className="w-4 h-4" /> <AnimatedCounter value={me.coins} /> <span className="text-xs text-stone-500 font-normal">/ 15</span>
                            </div>
                            {me.protectionCard && (
                                <div className="flex items-center gap-1 text-blue-400 border-l border-stone-700 pl-3">
                                    <Shield className="w-4 h-4" />
                                    <span className="text-[10px] font-bold leading-tight uppercase max-w-[80px] truncate" title={me.protectionCard.name}>{me.protectionCard.name} ({me.protectionTurns})</span>
                                </div>
                            )}
                        </div>

                        {!isMyTurn && <div className="w-12" />}

                        {isMyTurn && (
                            <div className="flex flex-col gap-2 pointer-events-auto items-end">
                                {isMobileActionsOpen && (
                                    <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-5 origin-bottom-right items-end">
                                        {!isSelectingVisible && me.visibleCard && (
                                            <button
                                                onClick={() => { setIsSelectingVisible(true); setIsMobileActionsOpen(false); }}
                                                className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold py-3 px-4 rounded-full shadow-lg flex items-center justify-end gap-2 text-sm border border-stone-600 w-max"
                                            >
                                                Trocar Carta Visível <RotateCcw className="w-4 h-4" />
                                            </button>
                                        )}
                                        {room.turnPhase === "start" && (
                                            <>
                                                <button
                                                    onClick={() => { socket.emit("draw_card", { roomId: room.id }); setIsMobileActionsOpen(false); }}
                                                    className="bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold py-3 px-4 rounded-full shadow-lg flex items-center justify-end gap-2 text-sm w-max"
                                                >
                                                    Draw Card <Plus className="w-4 h-4" />
                                                </button>
                                                {room.discardPile.length > 0 && (
                                                    <button
                                                        onClick={() => { socket.emit("draw_from_discard", { roomId: room.id }); setIsMobileActionsOpen(false); }}
                                                        className="bg-orange-600 hover:bg-orange-500 text-stone-900 font-bold py-3 px-4 rounded-full shadow-lg flex items-center justify-end gap-2 text-sm w-max"
                                                    >
                                                        Take Discard
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { socket.emit("take_coins", { roomId: room.id }); setIsMobileActionsOpen(false); }}
                                                    className="bg-stone-700 hover:bg-stone-600 text-amber-400 font-bold py-3 px-4 rounded-full shadow-lg flex items-center justify-end gap-2 text-sm w-max"
                                                >
                                                    Take 2 Coins <Coins className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={() => setIsMobileActionsOpen(!isMobileActionsOpen)}
                                    className={cn(
                                        "w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-transform",
                                        isMobileActionsOpen ? "bg-stone-700 text-stone-400 rotate-45" : "bg-amber-500 text-stone-900 hover:scale-105"
                                    )}
                                >
                                    <Plus className="w-6 h-6" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col items-center md:items-start w-full mb-4">
                        <div className="flex flex-col items-center md:items-start mb-0.5 w-full max-w-2xl px-4 text-center md:text-left z-40 relative md:mt-0 mt-1">
                            {!me.visibleCard ? (
                                <div className="text-amber-400 bg-amber-900/20 px-4 py-2 rounded-lg border border-amber-900/50 text-sm">
                                    Você precisa de uma carta visível. Clique em uma carta para defini-la.
                                </div>
                            ) : isSelectingVisible ? (
                                <div className="text-amber-400 bg-amber-900/90 backdrop-blur-sm px-4 py-2 rounded-full border border-amber-500 text-sm font-bold flex items-center gap-2 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                                    Selecione a nova carta visível!
                                    <button
                                        onClick={() => setIsSelectingVisible(false)}
                                        className="ml-2 text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-700/80 rounded-full w-6 h-6 flex items-center justify-center transition-colors border border-stone-500"
                                        title="Cancelar"
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <div className="text-stone-400 text-sm md:block hidden">
                                        Carta visível definida.
                                    </div>
                                    <button
                                        onClick={() => setIsSelectingVisible(true)}
                                        className="hidden md:flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-1.5 rounded-full text-xs font-medium border border-stone-700 transition-colors"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        Trocar Carta Visível
                                    </button>
                                </div>
                            )}
                        </div>

                        <div
                            className="flex flex-row md:overflow-x-visible overflow-visible pb-16 pt-0 md:pt-12 px-4 scrollbar-hide w-full max-w-[100vw] md:max-w-full min-h-[22rem] md:min-h-0 relative items-start justify-center md:justify-center mt-0 md:mt-1 scroll-smooth gap-4 md:gap-12"
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            {/* Desktop: Unified Unified Stacked View */}
                            <div className="hidden md:flex items-start justify-center w-full overflow-x-auto pb-12 pt-10 scrollbar-hide">
                                <div className="flex">
                                    {[...me.hand]
                                        .sort((a, b) => {
                                            if (me.visibleCard?.id === a.id) return -1;
                                            if (me.visibleCard?.id === b.id) return 1;
                                            return a.class.localeCompare(b.class);
                                        })
                                        .map((card, idx) => {
                                            const isVisible = me.visibleCard?.id === card.id;
                                            return (
                                                <CardItem
                                                    key={card.id + idx}
                                                    card={card}
                                                    isVisibleCard={isVisible}
                                                    idx={idx}
                                                    // Only stack if it's not the first card and not the visible card 
                                                    // but wait, the visible IS the first card.
                                                    // Let's add an 'isFirstOfStack' prop to handle the gap.
                                                    isStacked={idx > 0}
                                                />
                                            );
                                        })
                                    }
                                </div>
                            </div>

                            {/* Mobile: Swiper View (Current logic) */}
                            <div className="md:hidden flex items-start justify-center w-full relative min-h-[20rem]">
                                {[...me.hand]
                                    .sort((a, b) => {
                                        if (me.visibleCard?.id === a.id) return -1;
                                        if (me.visibleCard?.id === b.id) return 1;
                                        return 0;
                                    })
                                    .map((card, idx) => (
                                        <div
                                            key={card.id + idx}
                                            className="mobile-card-wrapper"
                                        >
                                            <CardItem
                                                card={card}
                                                isVisibleCard={!isSelectingVisible && me.visibleCard?.id === card.id}
                                                idx={idx}
                                                isMobile
                                            />
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals from extracted components */}

            {targetingAction && (
                <TargetingOverlay onCancel={() => setTargetingAction(null)} />
            )}

            {defensePrompt && (
                <DefenseModal
                    attackerName={defensePrompt.attackerName}
                    cardName={defensePrompt.cardName}
                    hand={me.hand}
                    onDefend={(defenseCardId) => {
                        socket.emit("respond_defense", { roomId: room.id, action: "defend", defenseCardId });
                        setDefensePrompt(null);
                    }}
                    onAccept={() => {
                        socket.emit("respond_defense", { roomId: room.id, action: "accept" });
                        setDefensePrompt(null);
                    }}
                />
            )}

            {room.turnPhase === "waiting_card_selection" && room.pendingCardSelection && room.pendingCardSelection.actorId === socket.id && (
                <CardSelectionModal
                    actionType={room.pendingCardSelection.actionType}
                    targetHand={room.pendingCardSelection.targetHand}
                    canSkip={room.pendingCardSelection.canSkip}
                    onSelect={(selectedCardId) => {
                        socket.emit("submit_card_selection", {
                            roomId: room.id,
                            selectedCardId,
                            action: selectedCardId === "skip" ? "skip" : room.pendingCardSelection?.actionType
                        });
                    }}
                />
            )}

            {room.turnPhase === "waiting_choice" && room.pendingChoice && room.pendingChoice.actorId === socket.id && (
                <ChoiceModal
                    card={room.pendingChoice.card}
                    options={room.pendingChoice.options}
                    onSelect={(choiceId) => {
                        socket.emit("submit_choice", { roomId: room.id, choiceId });
                    }}
                />
            )}

            {room.turnPhase === "waiting_rotate_selection" && (
                <RotateSelectionModal
                    hand={me.hand}
                    totalPlayers={room.pendingRotateSelection?.totalPlayers || 0}
                    selectionsCount={Object.keys(room.pendingRotateSelection?.selections || {}).length}
                    hasSubmitted={Boolean(room.pendingRotateSelection && room.pendingRotateSelection.selections[socket.id])}
                    onSelect={(selectedCardId) => {
                        socket.emit("submit_rotate_selection", { roomId: room.id, selectedCardId });
                    }}
                />
            )}

            {discardModalOpen && room.discardPile.length > 0 && (
                <DiscardCardInspectionModal
                    discardPile={room.discardPile}
                    isMyTurn={isMyTurn}
                    turnPhase={room.turnPhase}
                    onClose={() => setDiscardModalOpen(false)}
                    onTake={() => {
                        socket.emit("draw_from_discard", { roomId: room.id });
                        setDiscardModalOpen(false);
                        setIsMobileActionsOpen(false);
                    }}
                />
            )}

            {opponentViewModal && (
                <OpponentViewModal
                    viewedPlayer={room.players.find(p => p.id === opponentViewModal)}
                    isPartner={room.diarchy && ((room.diarchy.player1Id === me.id && room.diarchy.player2Id === opponentViewModal) || (room.diarchy.player2Id === me.id && room.diarchy.player1Id === opponentViewModal))}
                    onClose={() => setOpponentViewModal(null)}
                />
            )}

            <ActivityFeed alerts={alerts} />

            {room.turnPhase === "waiting_targets_selection" && room.pendingTargetsSelection?.actorId === socket.id && (
                <MultiTargetingOverlay
                    requiredCount={room.pendingTargetsSelection.count}
                    selectedCount={multiTargetsSelection.length}
                    onCancel={() => {
                        setMultiTargetsSelection([]);
                        socket.emit("respond_defense", { roomId: room.id, action: "accept" }); // Or a proper cancel? The server doesn't have a cancel for this yet, so it ends turn as accept
                    }}
                    onConfirm={() => {
                        socket.emit("submit_targets_selection", { roomId: room.id, targetIds: multiTargetsSelection });
                        setMultiTargetsSelection([]);
                    }}
                />
            )}

            {revealedCards && (
                <RevealedCardsModal
                    revealedData={revealedCards}
                    onClose={() => setRevealedCards(null)}
                />
            )}

        </div>
    );
}
