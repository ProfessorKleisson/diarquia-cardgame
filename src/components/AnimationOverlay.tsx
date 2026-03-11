import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield } from "lucide-react";
import type { CardAnimation } from "../types";
import { CoinShower } from "./animations/CoinShower";

export function AnimationOverlay({ animation, isMe }: { animation: CardAnimation | null; isMe?: boolean; key?: string }) {
    return (
        <AnimatePresence>
            {animation && ["eliminate", "swap", "skip"].includes(animation.type) && (
                <motion.div
                    key={animation.id || "action-overlay"}
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
                    key={animation.id || "draw-overlay"}
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
                <CoinShower key={animation.id || "coin-shower"} amount={animation.amount} isMe={isMe || false} />
            )}

            {animation && animation.type === "block_draw" && (
                <motion.div
                    key={animation.id || "block-overlay"}
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
