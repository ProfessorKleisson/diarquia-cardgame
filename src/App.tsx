import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { Copy, Plus, LogIn, Users, Play, Crown, Coins, Shield, Swords, Home, RotateCcw, Eye } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { AnimatedBackground } from "@/src/components/AnimatedBackground";


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
type CardClass =
  | "Golpe partidário"
  | "Golpe militar"
  | "Golpe sorrateiro"
  | "Monarquia"
  | "Diarquia"
  | "Revolução"
  | "Liberais Clássicos"
  | "Especial";

interface Card {
  id: string;
  class: CardClass;
  name: string;
  description: string;
  type: "attack" | "defense" | "benefit" | "special";
  power?: string;
  image?: string;
}

interface CardAnimation {
  type: "eliminate" | "swap" | "skip" | "draw" | string;
  attackerName: string;
  attackerCard?: Card | null;
  targetName: string;
  targetCard?: Card | null;
  amount?: number;
}

interface Player {
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

interface Room {
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
  turnPhase: "start" | "action" | "end" | "waiting_defense" | "waiting_card_selection" | "waiting_choice" | "waiting_rotate_selection";
  pendingCardSelection?: {
    actorId: string;
    targetId: string;
    targetHand: Card[];
    actionType: "eliminate" | "swap" | "give";
    canSkip?: boolean;
  } | null;
  pendingRotateSelection?: {
    selections: Record<string, string>; // playerId -> cardId
    totalPlayers: number;
    card: Card;
  } | null;
  pendingChoice?: {
    actorId: string;
    card: Card;
    options: { id: string, label: string }[];
  } | null;
  diarchy?: { player1Id: string; player2Id: string } | null;
}

const socket: Socket = io({ autoConnect: false });

export default function App() {
  const [room, setRoom] = useState<Room | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isPublicRoom, setIsPublicRoom] = useState(false);
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [animationMsg, setAnimationMsg] = useState<CardAnimation | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check URL for room code
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("room");
    if (codeFromUrl) {
      setJoinCode(codeFromUrl.toUpperCase());
    }

    socket.connect();

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("room_update", (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setError("");
    });

    socket.on("play_animation", (data: CardAnimation) => {
      setAnimationMsg(data);
      setTimeout(() => setAnimationMsg(null), 3500);
    });

    socket.on("action_error", (data: { message: string }) => {
      setToastMsg(data.message);
      setTimeout(() => setToastMsg(null), 3500);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_update");
      socket.off("play_animation");
      socket.off("action_error");
      socket.disconnect();
    };
  }, []);

  const handleCreateRoom = () => {
    if (!playerName) return setError("Please enter your name");
    socket.emit("create_room", { playerName, maxPlayers: 4, isPublic: isPublicRoom }, (res: any) => {
      if (!res.success) {
        setError(res.error);
      } else {
        window.history.pushState({}, "", `?room=${res.roomId}`);
      }
    });
  };

  const handleJoinRandomRoom = () => {
    if (!playerName) return setError("Please enter your name");
    socket.emit("join_random_room", { playerName }, (res: any) => {
      if (!res.success) {
        setError(res.error);
      } else {
        window.history.pushState({}, "", `?room=${res.roomId}`);
      }
    });
  };

  const handleJoinRoom = () => {
    if (!playerName) return setError("Please enter your name");
    if (!joinCode) return setError("Please enter a room code");
    socket.emit("join_room", { roomId: joinCode.toUpperCase(), playerName }, (res: any) => {
      if (!res.success) {
        setError(res.error);
      } else {
        window.history.pushState({}, "", `?room=${res.roomId}`);
      }
    });
  };

  if (!room) {
    return (
      <div className="min-h-screen text-stone-100 flex items-center justify-center p-4 font-sans relative">
        <AnimatedBackground />
        <div className="max-w-md w-full bg-stone-800 p-4 md:p-8 rounded-2xl shadow-2xl border border-stone-700">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-amber-500 mb-2">GOLPE</h1>
            <p className="text-stone-400">A game of philosophy, history, and betrayal.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                placeholder="Enter your name..."
              />
            </div>

            {error && <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50">{error}</div>}

            <div className="flex flex-col gap-3">
              {/* Create Room */}
              <button
                onClick={handleCreateRoom}
                className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold py-3 px-4 rounded-lg transition-colors w-full"
              >
                <Plus className="w-5 h-5 flex-shrink-0" />
                Criar Sala
              </button>

              {/* Join by Code */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all uppercase"
                  placeholder="CÓDIGO"
                  maxLength={6}
                />
                <button
                  onClick={handleJoinRoom}
                  className="flex items-center justify-center gap-2 bg-stone-700 hover:bg-stone-600 text-stone-100 font-bold py-3 px-4 rounded-lg transition-colors flex-shrink-0"
                  title="Entrar com Código"
                >
                  <LogIn className="w-5 h-5" />
                  <span className="hidden sm:inline">Entrar</span>
                </button>
              </div>

              {/* Random Public Room */}
              <button
                onClick={handleJoinRandomRoom}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-stone-100 font-bold py-3 px-4 rounded-lg transition-colors w-full"
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                Sala Aleatória Pública
              </button>

              {/* Public checkbox */}
              <div className="flex items-center gap-2 justify-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublicRoom}
                  onChange={(e) => setIsPublicRoom(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-600 text-amber-500 focus:ring-amber-500 bg-stone-900"
                />
                <label htmlFor="isPublic" className="text-sm text-stone-400 select-none">
                  Tornar minha sala pública
                </label>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  if (room.status === "waiting") {
    return (
      <>
        <ToastOverlay message={toastMsg} />
        <Lobby room={room} socket={socket} />
        <AnimationOverlay animation={animationMsg} isMe={animationMsg ? room.players.find((p) => p.id === socket.id)?.name === animationMsg.attackerName : false} />
      </>
    );
  }

  return (
    <>
      <ToastOverlay message={toastMsg} />
      <Game room={room} socket={socket} />
      <AnimationOverlay animation={animationMsg} isMe={animationMsg ? room.players.find((p) => p.id === socket.id)?.name === animationMsg.attackerName : false} />
    </>
  );
}

function ToastOverlay({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] bg-red-600/90 text-white font-bold px-6 py-3 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.4)] backdrop-blur-md border border-red-400 text-sm md:text-base whitespace-nowrap"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AnimationOverlay({ animation, isMe }: { animation: CardAnimation | null; isMe?: boolean; key?: string }) {
  return (
    <AnimatePresence>
      {animation && ["eliminate", "swap", "skip"].includes(animation.type) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none"
        >
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full max-w-5xl px-4">

            {/* Attacker Side */}
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <h2 className={`text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${animation.type === "eliminate" ? "from-red-500 to-orange-500" :
                animation.type === "swap" ? "from-blue-500 to-cyan-500" :
                  "from-amber-500 to-yellow-500"
                }`}>
                {animation.attackerName}
              </h2>
              {animation.attackerCard ? (
                <div className={`w-48 shadow-2xl rounded-xl overflow-hidden border-2 ${animation.type === "eliminate" ? "border-red-500 shadow-red-500/50" :
                  animation.type === "swap" ? "border-blue-500 shadow-blue-500/50" :
                    "border-amber-500 shadow-amber-500/50"
                  }`}>
                  <img src={animation.attackerCard.image} alt={animation.attackerCard.name} className="w-full h-auto" />
                </div>
              ) : (
                <div className={`w-48 aspect-[63/88] flex items-center justify-center bg-stone-800 rounded-xl border-2 shadow-2xl ${animation.type === "eliminate" ? "border-red-500 shadow-red-500/50" :
                  animation.type === "swap" ? "border-blue-500 shadow-blue-500/50" :
                    "border-amber-500 shadow-amber-500/50"
                  }`}>
                  <span className="text-white text-6xl text-center">
                    {animation.type === "eliminate" && "⚔️"}
                    {animation.type === "swap" && "🔄"}
                    {animation.type === "skip" && "⌛"}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Middle Sign */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className={`text-6xl font-black italic ${animation.type === "eliminate" ? "text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" :
                animation.type === "swap" ? "text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] not-italic" :
                  "text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] not-italic"
                }`}
            >
              {animation.type === "eliminate" && "VS"}
              {animation.type === "swap" && "✨"}
              {animation.type === "skip" && "⏳"}
            </motion.div>

            {/* Target Side (Torn effect) */}
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="flex flex-col items-center gap-4 hidden sm:flex"
            >
              <h2 className="text-3xl font-bold text-gray-300">
                {animation.targetName}
              </h2>

              {/* Torn effect wrapper / Swap / Skip */}
              {animation.targetCard ? (
                <div className="relative w-48 aspect-[63/88]">
                  {animation.type === "eliminate" ? (
                    <>
                      {/* Left half */}
                      <motion.div
                        initial={{ y: 0, rotate: 0, opacity: 1 }}
                        animate={{ y: 60, x: -40, rotate: -25, opacity: 0, scale: 0.8 }}
                        transition={{ delay: 1.2, duration: 1.5, ease: "easeInOut" }}
                        className="absolute inset-0"
                        style={{ clipPath: "polygon(0 0, 50% 0, 35% 100%, 0 100%)" }}
                      >
                        <img src={animation.targetCard.image} className="w-full h-full object-fill rounded-xl border border-gray-600 drop-shadow-lg" />
                      </motion.div>

                      {/* Right half */}
                      <motion.div
                        initial={{ y: 0, rotate: 0, opacity: 1 }}
                        animate={{ y: 50, x: 40, rotate: 20, opacity: 0, scale: 0.8 }}
                        transition={{ delay: 1.2, duration: 1.5, ease: "easeInOut" }}
                        className="absolute inset-0"
                        style={{ clipPath: "polygon(50% 0, 100% 0, 100% 100%, 35% 100%)" }}
                      >
                        <img src={animation.targetCard.image} className="w-full h-full object-fill rounded-xl border border-gray-600 drop-shadow-lg" />
                      </motion.div>

                      {/* Slash Effect overlay */}
                      <motion.div
                        initial={{ scaleX: 0, opacity: 1, rotate: 0 }}
                        animate={{ scaleX: 1, opacity: 0 }}
                        transition={{ delay: 1.0, duration: 0.3 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-2 bg-white rounded-full shadow-[0_0_20px_10px_white,0_0_40px_20px_white] z-10 origin-center"
                        style={{ transform: "translate(-50%, -50%) rotate(75deg)" }}
                      />
                    </>
                  ) : animation.type === "swap" ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                      transition={{ delay: 1.0, type: "spring", damping: 10 }}
                      className="absolute inset-0"
                    >
                      <img src={animation.targetCard.image} className="w-full h-full object-fill rounded-xl border-2 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]" />
                    </motion.div>
                  ) : (
                    // Default / Skip
                    <motion.div
                      initial={{ opacity: 1 }}
                      animate={animation.type === "skip" ? { rotate: [-5, 5, -5, 5, 0], scale: [1, 0.9, 1], filter: ["grayscale(0%)", "grayscale(100%)"] } : {}}
                      transition={{ delay: 1.0, duration: 0.5 }}
                      className="absolute inset-0"
                    >
                      <img src={animation.targetCard.image} className="w-full h-full object-fill rounded-xl border border-gray-600 drop-shadow-lg" />
                      {animation.type === "skip" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 2 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.2, type: "spring", bounce: 0.5 }}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl"
                        >
                          <span className="text-red-500 text-7xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">🚫</span>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className={`w-48 aspect-[63/88] flex items-center justify-center bg-stone-800 rounded-xl border ${animation.type === 'skip' ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'border-gray-600'}`}>
                  {animation.type === "skip" ? (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 1, type: "spring" }}
                      className="text-red-500 text-7xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                    >
                      🚫
                    </motion.span>
                  ) : (
                    <span className="text-stone-500 text-6xl">?</span>
                  )}
                </div>
              )}
            </motion.div>
            {/* Target mobile version (prevent scroll bugs from translates) */}
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="flex flex-col items-center gap-4 sm:hidden"
            >
              {/* Target wrapper mobile */}
              {animation.targetCard ? (
                <div className="relative w-48 aspect-[63/88]">
                  <motion.div
                    initial={{ y: 0, rotate: 0, opacity: 1 }}
                    animate={
                      animation.type === "eliminate" ? { y: 60, opacity: 0, scale: 0.8 } :
                        animation.type === "swap" ? { rotateY: [90, 0] } :
                          { filter: ["grayscale(0%)", "grayscale(100%)"] }
                    }
                    transition={{ delay: 1.2, duration: 1.5, ease: "easeInOut" }}
                    className="absolute inset-0"
                  >
                    <img src={animation.targetCard.image} className={`w-full h-full object-fill rounded-xl ${animation.type === 'eliminate' ? 'grayscale filter sepia-[0.5] contrast-[1.5]' : animation.type === 'swap' ? 'border-2 border-blue-500' : ''}`} />
                    {animation.type === "skip" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 2 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.2, type: "spring", bounce: 0.5 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl"
                      >
                        <span className="text-red-500 text-7xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">🚫</span>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              ) : (
                <div className={`w-48 aspect-[63/88] flex items-center justify-center bg-stone-800 rounded-xl border ${animation.type === 'skip' ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'border-gray-600'}`}>
                  {animation.type === "skip" ? (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 1, type: "spring" }}
                      className="text-red-500 text-7xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                    >
                      🚫
                    </motion.span>
                  ) : (
                    <span className="text-stone-500 text-6xl">?</span>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}

      {animation && animation.type === "draw" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.5, y: -200, rotateY: animation.targetCard ? 180 : 0, opacity: 0 }}
            animate={{
              scale: [0.5, 1.5, 1.5, 0.5],
              y: [-200, 0, 0, isMe ? 400 : -400],
              // Only flip to reveal if we have the card (i.e. we are the drawer)
              rotateY: animation.targetCard ? [180, 0, 0, 0] : [0, 0, 0, 0],
              opacity: [0, 1, 1, 0]
            }}
            transition={{ duration: 2.5, times: [0, 0.3, 0.7, 1], ease: "easeInOut" }}
            className="relative w-48 aspect-[63/88] shadow-[0_0_50px_rgba(245,158,11,0.6)] rounded-xl"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* BACK OF CARD — always visible during flip / always shown for opponents */}
            <div
              className="absolute inset-0 rounded-xl overflow-hidden border-2 border-stone-600 shadow-xl"
              style={{
                backfaceVisibility: animation.targetCard ? "hidden" : "visible",
                transform: animation.targetCard ? "rotateY(180deg)" : "rotateY(0deg)"
              }}
            >
              <img src="/cards/verso.webp" className="w-full h-full object-cover" />
            </div>

            {/* FRONT OF CARD — only rendered if we know which card it is */}
            {animation.targetCard && (
              <div
                className="absolute inset-0 rounded-xl overflow-hidden border-4 border-amber-500 shadow-xl"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(0deg)" }}
              >
                <img src={animation.targetCard.image} className="w-full h-full object-cover" />
              </div>
            )}

            <div
              className="absolute -bottom-16 left-1/2 flex flex-col items-center"
              style={{ transform: "translateX(-50%) translateZ(50px)" }}
            >
              <span className="text-sm md:text-xl font-bold text-amber-500 whitespace-nowrap drop-shadow-md bg-stone-900/80 px-4 py-1.5 rounded-full border border-amber-500/30 font-sans">
                {animation.attackerName} comprou
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}

      {animation && animation.type === "gain_coins" && animation.amount && (
        <CoinShower amount={animation.amount} isMe={isMe || false} />
      )}

      {animation && animation.type === "block_draw" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-none"
        >
          <div className="flex flex-col items-center gap-6 px-4">

            {/* Shield burst */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 1.4, 1], rotate: [-20, 10, 0] }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="relative w-28 h-28 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.6], opacity: [0.8, 0] }}
                transition={{ duration: 1, repeat: 2, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-blue-400"
              />
              <div className="w-28 h-28 rounded-full bg-blue-500/20 border-2 border-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.7)] flex items-center justify-center">
                <Shield className="w-16 h-16 text-blue-300 drop-shadow-[0_0_8px_rgba(147,197,253,0.9)]" />
              </div>
            </motion.div>

            {/* Bloqueado text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <h3 className="text-4xl font-black text-blue-300 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(147,197,253,0.8)] mb-1">
                Bloqueado!
              </h3>
              <p className="text-stone-300 text-base font-medium">
                <span className="text-white font-bold">{animation.attackerName}</span>
                {" usou "}
                <span className="text-blue-300 font-bold">{animation.attackerCard?.name ?? "carta de defesa"}</span>
                {" contra "}
                <span className="text-red-400 font-bold">{animation.targetName}</span>
              </p>
            </motion.div>

            {/* Defense card discarded → new card drawn */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-4"
            >
              {/* Defense card (used, discarded) */}
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  animate={{ rotate: [0, -8, 8, 0], y: [0, -6, 0] }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="w-20 h-28 rounded-lg overflow-hidden border-2 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                >
                  {animation.attackerCard?.image
                    ? <img src={animation.attackerCard.image} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-stone-800 flex items-center justify-center"><Shield className="w-8 h-8 text-blue-400" /></div>
                  }
                </motion.div>
                <span className="text-[9px] text-stone-500 uppercase tracking-widest">Descartada</span>
              </div>

              {/* Arrow */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.8 }}
                className="text-stone-500 text-2xl font-bold"
              >
                →
              </motion.div>

              {/* New card from deck (face down) */}
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  initial={{ y: -60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9, type: "spring", stiffness: 200, damping: 16 }}
                  className="w-20 h-28 rounded-lg overflow-hidden border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] relative"
                >
                  <img src="/cards/verso.webp" className="w-full h-full object-cover opacity-70" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-amber-400 text-3xl font-black drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]">+1</span>
                  </div>
                </motion.div>
                <span className="text-[9px] text-amber-500 uppercase tracking-widest">Nova carta</span>
              </div>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Lobby({ room, socket }: { room: Room; socket: Socket }) {
  const isHost = room.host === socket.id;
  const me = room.players.find((p) => p.id === socket.id);
  const allReady = room.players.every((p) => p.isReady);

  const copyCode = () => {
    navigator.clipboard.writeText(room.id);
  };

  const copyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", room.id);
    navigator.clipboard.writeText(url.toString());
  };

  return (
    <div className="min-h-screen text-stone-100 p-4 md:p-8 font-sans relative">
      <AnimatedBackground />
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="w-full md:w-auto text-center md:text-left">
            <h1 className="text-3xl font-bold text-amber-500">Waiting Room</h1>
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full">
                <span className="text-stone-400">Room Code:</span>
                <code className="bg-stone-800 px-3 py-1 rounded-md text-xl font-mono text-amber-400 tracking-wider">
                  {room.id}
                </code>
                <button
                  onClick={copyCode}
                  className="p-2 hover:bg-stone-800 rounded-md transition-colors text-stone-400 hover:text-stone-200"
                  title="Copy Room Code"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full">
                <span className="text-stone-400">Invite Link:</span>
                <code className="bg-stone-800 px-3 py-1 rounded-md text-sm font-mono text-amber-400/80 truncate max-w-[200px] sm:max-w-[300px]">
                  {`${window.location.origin}${window.location.pathname}?room=${room.id}`}
                </code>
                <button
                  onClick={copyLink}
                  className="p-2 hover:bg-stone-800 rounded-md transition-colors text-stone-400 hover:text-stone-200"
                  title="Copy Invite Link"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-stone-400 bg-stone-800 px-4 py-2 rounded-full">
            <Users className="w-5 h-5" />
            <span>{room.players.length} / {room.maxPlayers}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {room.players.map((player) => (
            <div
              key={player.id}
              className={cn(
                "bg-stone-800 p-6 rounded-xl border-2 flex items-center justify-between transition-all",
                player.isReady ? "border-emerald-500/50" : "border-stone-700",
                player.id === socket.id ? "ring-2 ring-amber-500/20" : ""
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold",
                  player.isReady ? "bg-emerald-500/20 text-emerald-400" : "bg-stone-700 text-stone-400"
                )}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-lg flex items-center gap-2">
                    {player.name}
                    {player.id === room.host && <Crown className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div className={cn(
                    "text-sm",
                    player.isReady ? "text-emerald-400" : "text-stone-500"
                  )}>
                    {player.isReady ? "Ready" : "Not Ready"}
                  </div>
                </div>
              </div>
              {player.id === socket.id && (
                <button
                  onClick={() => socket.emit("toggle_ready", { roomId: room.id })}
                  className={cn(
                    "px-6 py-2 rounded-full font-medium transition-colors",
                    player.isReady
                      ? "bg-stone-700 hover:bg-stone-600 text-stone-300"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  )}
                >
                  {player.isReady ? "Cancel" : "Ready Up"}
                </button>
              )}
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-stone-800/50 border-2 border-dashed border-stone-700 p-6 rounded-xl flex items-center justify-center text-stone-500">
              Waiting for player...
            </div>
          ))}
        </div>

        {isHost && (
          <div className="flex justify-center">
            <button
              onClick={() => socket.emit("start_game", { roomId: room.id })}
              disabled={room.players.length < 2 || !allReady}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-500 disabled:cursor-not-allowed text-stone-900 font-bold py-4 px-8 rounded-xl text-lg transition-all"
            >
              <Play className="w-6 h-6" />
              Start Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Game({ room, socket }: { room: Room; socket: Socket }) {
  const [defensePrompt, setDefensePrompt] = useState<{ attackerName: string; cardName: string } | null>(null);
  const [targetingAction, setTargetingAction] = useState<{ cardId: string; isAttack: boolean } | null>(null);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentTouch = e.targetTouches[0].clientX;
    const diff = touchStart - currentTouch;

    if (diff > 50) { // Swiped left
      setMobileStackIndex((prev) => Math.min(prev + 1, (me?.hand.length || 1) - 1));
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

  useEffect(() => {
    socket.on("defense_required", (data) => {
      setDefensePrompt(data);
    });

    socket.on("chat_message", (data: { sender: string; text: string }) => {
      const id = ++alertCounterRef.current;
      setAlerts(prev => [{ id, text: data.text }, ...prev].slice(0, 6));
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }, 8000);
    });

    return () => {
      socket.off("defense_required");
      socket.off("chat_message");
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
        {/* Particles removed — handled by AnimatedBackground */}

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
            {room.winReason === "diarchy_coins" && "sellaram um Pacto de Poder através da Diarquia!"}
            {room.winReason === "diarchy_triad" && "uniram forças numa Aliança Dinástica!"}
            {!room.winReason && (isDiarchyWin ? "venceram formando uma Diarquia!" : "consolidou seu Golpe!")}
          </p>

        </motion.div>

        {/* Winner's Cards */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-6 relative z-40 max-w-sm md:max-w-5xl px-2">
          {winnerHands.map((card, idx) => (
            <motion.div
              key={card.id}
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
            targetingAction ? "ring-2 ring-red-500/50 cursor-pointer hover:scale-105" : ""
          )}
            onClick={() => {
              if (targetingAction) {
                socket.emit("play_card", { roomId: room.id, cardId: targetingAction.cardId, targetPlayerId: player.id });
                setTargetingAction(null);
              } else {
                // Open view modal only if player has a visible card or is a diarchy partner
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
              {player.protectionTurns && player.protectionTurns > 0 && (
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
                    key={card.id}
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
          {/* Turn Indicator */}
          <div className="bg-stone-800/80 backdrop-blur px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-stone-700 flex items-center gap-2 md:gap-3 scale-75 md:scale-100 origin-top-left">
            <span className="text-stone-400 text-xs md:text-sm font-medium uppercase tracking-wider">Turn</span>
            <span className="font-bold text-amber-500 text-sm md:text-base">{currentTurnPlayer.name}</span>
            <span className="text-stone-500 text-xs md:text-sm">({room.turnPhase})</span>
          </div>

          {/* Bank Indicator */}
          <div className="bg-stone-800/80 backdrop-blur px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-stone-700 flex items-center gap-2 md:hidden scale-75 origin-top-left">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-amber-500 text-sm">Bank</span>
          </div>
        </div>

        {/* Diarchy Button */}
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

          {/* Bank for Desktop only */}
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
      </div >

      {/* Bottom: My Hand & Actions */}
      <div className="bg-stone-950 p-2 md:p-6 border-t border-stone-800 transition-colors w-full">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row gap-2 md:gap-8 items-center md:items-end w-full px-2 lg:px-6">
          {/* Desktop Stats & Action Buttons */}
          <div className="hidden md:flex flex-col gap-4 min-w-[200px]">
            <div className="bg-stone-900 p-4 rounded-xl border border-stone-800">
              <div className="text-sm text-stone-500 uppercase tracking-wider font-semibold mb-1">My Coins</div>
              <div className="text-3xl font-bold text-amber-500 flex items-center gap-2">
                <Coins className="w-6 h-6" /> <AnimatedCounter value={me.coins} /> <span className="text-sm text-stone-600 font-normal">/ 15</span>
              </div>
            </div>

            {/* My Protection */}
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

            {/* Action Buttons */}
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

          {/* Mobile Stats & FAB Layer */}
          <div className="md:hidden fixed bottom-4 left-4 right-4 flex justify-between items-end z-[100] pointer-events-none">
            {/* Mobile Minimal Stats */}
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

            {/* FAB for Actions */}
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

          {/* My Hand */}
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

            {/* Hand Area with enough top padding for tooltips */}
            {/* Hand Area with stacked/swipe custom carousel for Mobile, scroll for desktop */}
            <div
              className="flex md:gap-6 md:overflow-x-auto overflow-visible pb-16 pt-0 md:pt-32 px-4 scrollbar-hide w-full max-w-[100vw] md:max-w-full min-h-[12rem] md:min-h-0 relative items-start justify-center md:justify-center mt-0 md:mt-1 scroll-smooth"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {[...me.hand]
                .sort((a, b) => {
                  if (me.visibleCard?.id === a.id) return -1;
                  if (me.visibleCard?.id === b.id) return 1;
                  return 0;
                })
                .map((card, idx) => {
                  // If we are actively selecting, we temporarily ignore which one is currently visible for styling purposes
                  const isVisibleCard = !isSelectingVisible && me.visibleCard?.id === card.id;
                  const needsTarget =
                    card.type === "attack" ||
                    ["prevent_coup", "peek_and_swap", "swap_card", "force_swap_visible", "marriage_diarchy", "diplomacy_diarchy"].includes(card.power || "");

                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        if (card.class === "Especial") {
                          // Can't set specials as visible
                          if (isSelectingVisible || !me.visibleCard) {
                            alert("Cartas Especiais não podem ser escolhidas como Carta Visível.");
                            return;
                          }
                        }

                        // If we are actively picking a new visible card, or we lack one entirely
                        if (isSelectingVisible || !me.visibleCard) {
                          socket.emit("set_visible_card", { roomId: room.id, cardId: card.id });
                          setIsSelectingVisible(false);
                          return;
                        }

                        // If tapping a background card on mobile, bring it front, don't play it
                        if (window.innerWidth < 768 && idx !== mobileStackIndex) {
                          setMobileStackIndex(idx);
                          return;
                        }

                        // Normal play logic
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
                      }}
                      className={cn(
                        "w-56 h-[20rem] md:w-64 md:h-[24rem] rounded-xl border-2 flex flex-col transition-all duration-300 cursor-pointer flex-shrink-0 hover:-translate-y-2 md:hover:-translate-y-4 hover:shadow-xl relative group select-none shadow-black/50 shadow-lg",

                        // Mobile positioning (absolute) and Desktop positioning (static)
                        "absolute left-1/2 -ml-28 md:static md:ml-0 md:left-auto",
                        // On mobile, control z-index and translation to simulate a carousel stack
                        idx === mobileStackIndex ? "z-30 scale-100 translate-x-0 opacity-100" :
                          idx < mobileStackIndex ? "z-20 scale-90 -translate-x-12 md:-translate-x-0 opacity-60" : "z-20 scale-90 translate-x-12 md:translate-x-0 opacity-60",
                        // Make invisible if far from center on mobile
                        Math.abs(idx - mobileStackIndex) > 1 ? "hidden md:flex" : "flex",
                        "md:transform-none md:scale-100 md:opacity-100 md:z-auto md:translate-x-0", // Reset mobile transforms on desktop

                        isSelectingVisible ? "border-amber-500/50 hover:border-amber-400 hover:shadow-amber-500/20 bg-stone-900" :
                          (isVisibleCard ? "bg-stone-900 border-amber-500 shadow-lg shadow-amber-500/10" : "bg-stone-900"),
                        !isSelectingVisible && !isVisibleCard && card.class === "Especial" ? "border-purple-500/30 hover:border-purple-400" :
                          (!isSelectingVisible && !isVisibleCard ? "border-stone-700/50 hover:border-stone-400" : ""),
                        isMyTurn && room.turnPhase === "action" && !isVisibleCard && !isSelectingVisible ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-stone-950" : "",
                        isSelectingVisible && card.class === "Especial" ? "opacity-30 md:opacity-50 cursor-not-allowed hover:-translate-y-0" : ""
                      )}
                    >
                      {card.image && (
                        <div className="absolute inset-0 z-0 overflow-hidden rounded-lg">
                          <img
                            src={card.image}
                            alt={card.name}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110"
                          />

                        </div>
                      )}

                      <div className="relative z-10 p-4 h-full flex flex-col pointer-events-none">
                        {isVisibleCard && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-900 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider whitespace-nowrap shadow-lg">
                            Visible to All
                          </div>
                        )}

                        {/* Face Icons for fallback or decoration */}
                        {!card.image && (
                          <div className="flex-grow flex items-center justify-center opacity-40">
                            {card.type === "attack" && <Swords className={cn("w-20 h-20", isVisibleCard ? "text-amber-400" : "text-red-400")} />}
                            {card.type === "defense" && <Shield className={cn("w-20 h-20", isVisibleCard ? "text-amber-400" : "text-blue-400")} />}
                            {card.type === "benefit" && <Coins className={cn("w-20 h-20", isVisibleCard ? "text-amber-400" : "text-amber-400")} />}
                            {card.type === "special" && <Crown className={cn("w-20 h-20", isVisibleCard ? "text-amber-400" : "text-purple-400")} />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div >

      {/* Targeting Overlay */}
      {
        targetingAction && (
          <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-red-500/30 p-6 md:p-8 rounded-3xl max-w-md w-[95vw] md:w-full text-center shadow-2xl shadow-red-500/10">
              <Swords className="w-16 h-16 text-red-500 mx-auto mb-6 animate-pulse" />
              <h2 className="text-3xl font-bold text-white mb-2">Select a Target</h2>
              <p className="text-stone-400 mb-8 font-medium">Click on an opponent's avatar at the top of the screen to apply the effect.</p>
              <button
                onClick={() => setTargetingAction(null)}
                className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-3 rounded-xl font-bold transition-all border border-stone-700 active:scale-95"
              >
                Cancel Action
              </button>
            </div>
          </div>
        )
      }

      {/* Defense Modal */}
      {
        defensePrompt && (
          <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-amber-500/30 p-6 md:p-8 rounded-3xl max-w-2xl w-[95vw] md:w-full shadow-2xl shadow-amber-500/10 max-h-[90vh] overflow-y-auto">
              <Shield className="w-16 h-16 text-amber-500 mx-auto mb-6 animate-pulse" />
              <h2 className="text-3xl font-bold text-center mb-2">Defense Required!</h2>
              <p className="text-stone-400 text-center mb-8">
                <span className="text-stone-100 font-bold">{defensePrompt.attackerName}</span> is attacking you with <span className="text-amber-500 font-bold">{defensePrompt.cardName}</span>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {me.hand.filter(c =>
                  c.type === "defense" ||
                  c.power?.startsWith("block") ||
                  c.power?.startsWith("protection_")
                ).map(card => (
                  <button
                    key={card.id}
                    onClick={() => {
                      socket.emit("respond_defense", { roomId: room.id, action: "defend", defenseCardId: card.id });
                      setDefensePrompt(null);
                    }}
                    className="bg-stone-800 hover:bg-stone-700 p-4 rounded-xl border border-stone-700 flex flex-col items-start transition-all hover:border-amber-500 group"
                  >
                    <span className="font-bold text-amber-500 mb-1 group-hover:scale-105 transition-transform">{card.name}</span>
                    <span className="text-[10px] text-stone-500 text-left leading-tight">{card.description}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  socket.emit("respond_defense", { roomId: room.id, action: "accept" });
                  setDefensePrompt(null);
                }}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-red-500/20"
              >
                Accept Effect
              </button>
            </div>
          </div>
        )
      }

      {/* Card Selection Modal (Inquisição / Descartes / Santo Agostinho) */}
      {
        room.turnPhase === "waiting_card_selection" && room.pendingCardSelection && room.pendingCardSelection.actorId === socket.id && (
          <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-purple-500/30 p-6 md:p-8 rounded-3xl max-w-4xl w-[95vw] md:w-full shadow-2xl shadow-purple-500/20 text-center relative max-h-[90vh] overflow-y-auto">
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                {room.pendingCardSelection.actionType === "eliminate" ? "Eliminar Carta" : "Trocar Carta"}
              </h2>
              <p className="text-stone-400 mb-8 font-medium">
                {room.pendingCardSelection.actionType === "eliminate"
                  ? "Você está inspecionando a mão do oponente. Escolha a carta que deseja eliminar."
                  : "Você revelou uma carta do oponente. Deseja trocá-la com o topo do baralho?"}
              </p>

              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {room.pendingCardSelection.targetHand.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => {
                      socket.emit("submit_card_selection", {
                        roomId: room.id,
                        selectedCardId: card.id,
                        action: room.pendingCardSelection?.actionType
                      });
                    }}
                    className="w-48 h-72 rounded-xl overflow-hidden relative group border-2 border-stone-700 hover:border-purple-500 hover:-translate-y-2 transition-all shadow-lg text-left bg-stone-800"
                  >
                    {card.image && (
                      <img src={card.image} alt={card.name} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 to-transparent pt-12 pb-4 px-4 transform translate-y-4 group-hover:translate-y-0 transition-transform z-10">
                      <p className="text-sm font-bold text-amber-500 mb-1 leading-tight">{card.name}</p>
                      <p className="text-xs text-stone-300 font-medium tracking-wide">
                        {room.pendingCardSelection?.actionType === "eliminate" ? "Eliminar ×" : "Trocar ⇄"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Botão de recusar (apenas para ações opcionais como peek_and_swap) */}
              {room.pendingCardSelection.canSkip && (
                <button
                  onClick={() => {
                    socket.emit("submit_card_selection", {
                      roomId: room.id,
                      selectedCardId: "skip",
                      action: "skip"
                    });
                  }}
                  className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 font-bold py-3 px-6 rounded-xl transition-all border border-stone-700 mt-2"
                >
                  Não Trocar
                </button>
              )}

              <div className="absolute top-4 right-6 flex items-center gap-2 text-stone-500 bg-stone-950 px-3 py-1 rounded-full border border-stone-800">
                <Shield className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Ação Privada</span>
              </div>
            </div>
          </div>
        )
      }

      {/* Choice Modal (Adam Smith / John Locke) */}
      {
        room.turnPhase === "waiting_choice" && room.pendingChoice && room.pendingChoice.actorId === socket.id && (
          <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[110] flex flex-col items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-amber-500/30 p-8 rounded-3xl max-w-md w-full shadow-2xl shadow-amber-500/10 text-center">
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                <Crown className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Decisão Liberal</h2>
              <p className="text-stone-400 mb-8 font-medium">
                Escolha o benefício que deseja receber da carta <span className="text-amber-500 font-bold">{room.pendingChoice.card.name}</span>.
              </p>

              <div className="flex flex-col gap-4">
                {room.pendingChoice.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      socket.emit("submit_choice", {
                        roomId: room.id,
                        choiceId: option.id
                      });
                    }}
                    className="w-full bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-amber-500 font-black py-4 rounded-2xl transition-all border border-stone-700 hover:border-amber-400 shadow-lg active:scale-95 uppercase tracking-widest text-lg"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }

      {/* Rotate Selection Modal (Rousseau / Robespierre) */}
      {
        room.turnPhase === "waiting_rotate_selection" && (
          <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[110] flex flex-col items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-green-500/30 p-6 md:p-8 rounded-3xl max-w-4xl w-[95vw] md:w-full shadow-2xl shadow-green-500/20 text-center relative max-h-[90vh] overflow-y-auto">

              {/* Header */}
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                <span className="text-3xl">🔄</span>
              </div>
              <h2 className="text-3xl font-black text-white mb-1 tracking-tight">Revolução!</h2>
              <p className="text-stone-400 mb-2 font-medium">
                Escolha <span className="text-green-400 font-bold">1 carta</span> para passar ao jogador à sua esquerda.
              </p>

              {/* Waiting indicator */}
              {room.pendingRotateSelection && (
                <p className="text-stone-500 text-sm mb-6">
                  {Object.keys(room.pendingRotateSelection.selections).length} de {room.pendingRotateSelection.totalPlayers} jogadores escolheram
                  {room.pendingRotateSelection.selections[socket.id]
                    ? " — aguardando os demais..." : ""}
                </p>
              )}

              {/* Already submitted: lock UI */}
              {room.pendingRotateSelection?.selections[socket.id] ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50">
                    <span className="text-3xl">✅</span>
                  </div>
                  <p className="text-green-400 font-bold text-lg">Carta escolhida!</p>
                  <p className="text-stone-500 text-sm">Aguardando os outros jogadores...</p>
                </div>
              ) : (
                /* Card picker */
                <div className="flex flex-wrap justify-center gap-6 mt-4">
                  {me.hand.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => {
                        socket.emit("submit_rotate_selection", {
                          roomId: room.id,
                          selectedCardId: card.id
                        });
                      }}
                      className="w-40 h-60 rounded-xl overflow-hidden relative group border-2 border-stone-700 hover:border-green-500 hover:-translate-y-2 transition-all shadow-lg text-left bg-stone-800"
                    >
                      {card.image && (
                        <img src={card.image} alt={card.name} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 to-transparent pt-10 pb-3 px-3 transform translate-y-4 group-hover:translate-y-0 transition-transform z-10">
                        <p className="text-xs font-bold text-amber-500 mb-0.5 leading-tight">{card.name}</p>
                        <p className="text-[10px] text-green-400 font-medium tracking-wide">Passar →</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

            </div>
          </div>
        )
      }

      {/* Discard Card Inspection Modal */}
      {
        discardModalOpen && room.discardPile.length > 0 && (
          <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[110] flex flex-col items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-stone-700 p-6 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col items-center relative max-h-[90vh] overflow-y-auto">
              {room.discardPile[room.discardPile.length - 1].image ? (
                <img
                  src={room.discardPile[room.discardPile.length - 1].image}
                  className="w-full h-auto aspect-[2/3] object-cover rounded-xl border-2 border-stone-700 shadow-lg mb-6"
                  alt={room.discardPile[room.discardPile.length - 1].name}
                />
              ) : (
                <div className="w-full h-auto aspect-[2/3] bg-stone-800 rounded-xl border-2 border-stone-700 shadow-lg flex items-center justify-center mb-6">
                  <span className="text-xl font-bold text-stone-500 text-center uppercase px-4">{room.discardPile[room.discardPile.length - 1].class}</span>
                </div>
              )}

              <div className="flex w-full gap-4">
                <button
                  onClick={() => setDiscardModalOpen(false)}
                  className="flex-1 bg-stone-800 hover:bg-stone-700 text-white font-bold py-3 rounded-xl transition-colors border border-stone-600 text-sm uppercase tracking-wider"
                >
                  Recusar
                </button>

                {isMyTurn && room.turnPhase === "start" && (
                  <button
                    onClick={() => {
                      socket.emit("draw_from_discard", { roomId: room.id });
                      setDiscardModalOpen(false);
                      setIsMobileActionsOpen(false);
                    }}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-orange-500/20 text-sm uppercase tracking-wider"
                  >
                    Pegar
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Opponent Card View Modal */}
      {opponentViewModal && (() => {
        const viewedPlayer = room.players.find(p => p.id === opponentViewModal);
        if (!viewedPlayer) return null;
        const isPartner = room.diarchy && (
          (room.diarchy.player1Id === me.id && room.diarchy.player2Id === opponentViewModal) ||
          (room.diarchy.player2Id === me.id && room.diarchy.player1Id === opponentViewModal)
        );

        // For diarchy partners show all cards; for enemies show only the visible card
        const cardsToShow = isPartner
          ? viewedPlayer.hand
          : (viewedPlayer.visibleCard ? [viewedPlayer.visibleCard] : []);

        return (
          <div
            className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[120] flex flex-col items-center justify-center p-4"
            onClick={() => setOpponentViewModal(null)}
          >
            <div
              className="bg-stone-900 border border-stone-700 p-5 rounded-3xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-amber-500 uppercase tracking-wider">{viewedPlayer.name}</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {isPartner ? "Seu parceiro de Diarquia — todas as cartas visíveis" : "Carta visível do adversário"}
                  </p>
                </div>
                <button
                  onClick={() => setOpponentViewModal(null)}
                  className="text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors border border-stone-700 text-lg font-bold"
                >×</button>
              </div>

              {/* Cards */}
              {cardsToShow.length === 0 ? (
                <div className="text-center text-stone-500 py-8 text-sm">Nenhuma carta visível para exibir.</div>
              ) : (
                <div className="flex flex-wrap gap-3 justify-center">
                  {cardsToShow.map(card => (
                    <div key={card.id} className="w-32 flex-shrink-0">
                      <div className="w-full aspect-[2/3] rounded-xl overflow-hidden border-2 border-stone-700 shadow-lg bg-stone-800 relative">
                        {card.image ? (
                          <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-2">
                            <span className="text-stone-500 text-xs text-center uppercase font-bold">{card.class}</span>
                          </div>
                        )}
                        {viewedPlayer.visibleCard?.id === card.id && (
                          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow">
                            Visível
                          </div>
                        )}
                      </div>
                      <div className="mt-1.5 text-center">
                        <p className="text-xs font-bold text-stone-200 leading-tight truncate">{card.name}</p>
                        <p className="text-[10px] text-amber-500/80 uppercase tracking-wider truncate">{card.class}</p>
                        {card.description && (
                          <p className="text-[9px] text-stone-500 mt-0.5 leading-snug line-clamp-2">{card.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Activity Feed - Live alerts */}
      <ActivityFeed alerts={alerts} />

    </div >

  );
}

function ActivityFeed({ alerts }: { alerts: { id: number; text: string }[] }) {
  // Strip emojis for icon parsing, use raw text for display
  return (
    <div className="fixed bottom-20 left-3 z-[90] flex flex-col-reverse gap-2 max-w-[calc(100vw-80px)] md:max-w-sm pointer-events-none">
      <AnimatePresence initial={false}>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            layout
            initial={{ opacity: 0, x: -40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="
              flex items-start gap-2.5 px-3.5 py-2.5 rounded-2xl
              bg-stone-900/95 border border-stone-700/60
              shadow-[0_4px_20px_rgba(0,0,0,0.5)]
              backdrop-blur-sm
            "
          >
            <span className="text-base leading-none mt-0.5 shrink-0">
              {alert.text.startsWith("🛡") ? "🛡️"
                : alert.text.startsWith("⚔") ? "⚔️"
                  : alert.text.startsWith("🔍") ? "🔍"
                    : alert.text.startsWith("⸸") ? "⸸"
                      : alert.text.startsWith("🔄") ? "🔄"
                        : alert.text.startsWith("⚖") ? "⚖️"
                          : alert.text.startsWith("⛓") ? "⛓️"
                            : alert.text.startsWith("⏳") ? "⏳"
                              : alert.text.startsWith("👑") ? "👑"
                                : alert.text.startsWith("🔓") ? "🔓"
                                  : "📢"}
            </span>
            <p className="text-[11px] md:text-xs text-stone-300 leading-snug font-medium">
              {alert.text.replace(/^[^ \w]*\s*/, "")}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [sparkle, setSparkle] = useState(false);

  useEffect(() => {
    if (value > displayValue) {
      let current = displayValue;
      const timer = setInterval(() => {
        current++;
        setDisplayValue(current);
        if (current >= value) {
          clearInterval(timer);
          setSparkle(true);
          setTimeout(() => setSparkle(false), 800);
        }
      }, 200);
      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, displayValue]);

  return (
    <div className="relative inline-flex items-center justify-center min-w-[1ch]">
      <span>{displayValue}</span>
      <AnimatePresence>
        {sparkle && (
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-amber-400 rounded-full blur-md z-[-1]"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sparkle && [...Array(5)].map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              scale: Math.random() * 1.5 + 0.5,
              x: (Math.random() - 0.5) * 60,
              y: (Math.random() - 0.5) * 60
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_10px_yellow] pointer-events-none"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function CoinShower({ amount, isMe }: { amount: number, isMe: boolean }) {
  const count = Math.min(amount, 10);

  return (
    <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={`coin-${i}`}
          initial={{ opacity: 0, scale: 0, x: "50vw", y: "40vh" }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1.5, 1, 0.5],
            x: isMe ? ["50vw", `${50 + (Math.random() * 30 - 15)}vw`, "15vw"] : ["50vw", `${50 + (Math.random() * 30 - 15)}vw`, "50vw"],
            y: isMe ? ["40vh", `${20 + (Math.random() * 20 - 10)}vh`, "90vh"] : ["40vh", `${20 + (Math.random() * 20 - 10)}vh`, "5vh"],
            rotate: [0, 720 + Math.random() * 360]
          }}
          transition={{ duration: 1.5, delay: i * 0.15, times: [0, 0.2, 0.7, 1], ease: "easeInOut" }}
          className="absolute text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,1)] will-change-transform"
        >
          <Coins className="w-10 h-10 md:w-16 md:h-16" />
        </motion.div>
      ))}
    </div>
  );
}
