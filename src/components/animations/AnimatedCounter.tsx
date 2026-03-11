import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export function AnimatedCounter({ value }: { value: number }) {
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
