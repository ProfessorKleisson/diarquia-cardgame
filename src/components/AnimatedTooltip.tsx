"use client";
import React, { useState } from "react";
import {
    motion,
    useTransform,
    AnimatePresence,
    useMotionValue,
    useSpring,
} from "motion/react";

export const AnimatedTooltip = ({
    children,
    content,
}: {
    children: React.ReactNode;
    content: {
        name: string;
        class: string;
        description: string;
    };
    key?: string | number;
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const springConfig = { stiffness: 100, damping: 5 };
    const x = useMotionValue(0);

    // Rotate the tooltip slightly based on mouse position
    const rotate = useSpring(
        useTransform(x, [-100, 100], [-45, 45]),
        springConfig
    );

    // Translate the tooltip slightly based on mouse position
    const translateX = useSpring(
        useTransform(x, [-100, 100], [-50, 50]),
        springConfig
    );

    const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
        const halfWidth = event.currentTarget.offsetWidth / 2;
        x.set(event.nativeEvent.offsetX - halfWidth);
    };

    return (
        <div
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseMove={handleMouseMove}
        >
            <AnimatePresence mode="popLayout">
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.6 }}
                        animate={{
                            opacity: 1,
                            y: -10,
                            scale: 1,
                            transition: {
                                type: "spring",
                                stiffness: 260,
                                damping: 10,
                            },
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.6 }}
                        style={{
                            translateX: translateX,
                            rotate: rotate,
                        }}
                        className="absolute -top-32 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center rounded-xl bg-stone-900/95 backdrop-blur-md z-[100] shadow-2xl border border-stone-700 p-4 min-w-[200px]"
                    >
                        {/* Top decorative gradient line */}
                        <div className="absolute inset-x-10 z-30 w-[20%] -bottom-px bg-gradient-to-r from-transparent via-amber-500 to-transparent h-px " />

                        <div className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1 underline decoration-amber-500/30 underline-offset-4">
                            {content.class}
                        </div>
                        <div className="font-extrabold text-white text-lg mb-1 drop-shadow-sm">
                            {content.name}
                        </div>
                        <div className="text-stone-300 text-[10px] text-center leading-tight max-w-[180px] italic">
                            {content.description}
                        </div>

                        {/* Tooltip Arrow */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-stone-900 border-r border-b border-stone-700 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>
            {children}
        </div>
    );
};
