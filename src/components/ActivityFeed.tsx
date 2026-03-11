import React from "react";
import { motion, AnimatePresence } from "motion/react";

export function ActivityFeed({ alerts }: { alerts: { id: number; text: string }[] }) {
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
