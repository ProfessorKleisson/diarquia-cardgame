import React from "react";
import { motion, AnimatePresence } from "motion/react";

export function ToastOverlay({ message }: { message: string | null }) {
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
