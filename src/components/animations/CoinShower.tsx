import React from "react";
import { motion } from "motion/react";
import { Coins } from "lucide-react";

export function CoinShower({ amount, isMe }: { amount: number, isMe: boolean }) {
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
