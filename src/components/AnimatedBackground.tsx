import React from "react";
import { motion } from "motion/react";

/**
 * AnimatedBackground
 * Full-screen fixed background with:
 * - Dark stone base
 * - Dot grid pattern (Aceternity style)
 * - Floating amber particle orbs
 */
export function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* Base color */}
            <div className="absolute inset-0 bg-stone-950" />

            {/* Dot pattern grid — Aceternity style */}
            <div
                className="absolute inset-0 opacity-[0.25]"
                style={{
                    backgroundImage: `radial-gradient(circle, #78716c 1px, transparent 1px)`,
                    backgroundSize: "28px 28px",
                }}
            />

            {/* Radial vignette to darken edges */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(12,10,9,0.85) 100%)",
                }}
            />

            {/* Floating amber glow orbs */}
            {[
                { cx: "15%", cy: "20%", size: 300, delay: 0, dur: 12 },
                { cx: "80%", cy: "70%", size: 250, delay: 3, dur: 15 },
                { cx: "50%", cy: "85%", size: 200, delay: 1.5, dur: 10 },
                { cx: "85%", cy: "15%", size: 180, delay: 5, dur: 18 },
                { cx: "30%", cy: "60%", size: 150, delay: 2, dur: 14 },
            ].map((orb, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        left: orb.cx,
                        top: orb.cy,
                        width: orb.size,
                        height: orb.size,
                        marginLeft: -orb.size / 2,
                        marginTop: -orb.size / 2,
                        background:
                            "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)",
                    }}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.4, 0.8, 0.4],
                        x: [0, 20, -10, 0],
                        y: [0, -15, 8, 0],
                    }}
                    transition={{
                        duration: orb.dur,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: orb.delay,
                    }}
                />
            ))}

            {/* Rising particle dots */}
            {[...Array(18)].map((_, i) => (
                <motion.div
                    key={`p-${i}`}
                    className="absolute rounded-full bg-amber-500/20"
                    style={{
                        width: Math.random() * 4 + 2,
                        height: Math.random() * 4 + 2,
                        left: `${Math.random() * 100}%`,
                    }}
                    initial={{ y: "110vh", opacity: 0, scale: Math.random() + 0.5 }}
                    animate={{ y: "-10vh", opacity: [0, 0.6, 0] }}
                    transition={{
                        duration: Math.random() * 8 + 6,
                        repeat: Infinity,
                        ease: "linear",
                        delay: Math.random() * 8,
                    }}
                />
            ))}
        </div>
    );
}
