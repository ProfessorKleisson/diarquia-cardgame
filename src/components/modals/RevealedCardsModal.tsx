import React from 'react';
import { Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function RevealedCardsModal({
    revealedData,
    onClose
}: {
    revealedData: { playerName: string; cardName: string }[];
    onClose: () => void;
}) {
    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-stone-900 border-2 border-amber-500/30 p-8 rounded-3xl max-w-lg w-full shadow-2xl relative"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors p-2"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="text-center mb-8">
                        <div className="bg-amber-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                            <Eye className="w-10 h-10 text-amber-500" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Verdades Reveladas</h2>
                        <p className="text-stone-400 mt-2">Você viu além das sombras na caverna.</p>
                    </div>

                    <div className="space-y-4 mb-8">
                        {revealedData.map((data, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-stone-800/50 border border-stone-700 p-4 rounded-2xl flex items-center justify-between"
                            >
                                <div className="flex flex-col">
                                    <span className="text-xs text-stone-500 font-bold uppercase tracking-widest">{data.playerName}</span>
                                    <span className="text-xl font-black text-amber-500">{data.cardName}</span>
                                </div>
                                <div className="w-12 h-16 bg-stone-700 rounded-lg flex items-center justify-center border border-stone-600">
                                    <div className="w-6 h-8 bg-stone-600 rounded-sm opacity-50" />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full bg-stone-100 hover:bg-white text-stone-900 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95 uppercase tracking-widest"
                    >
                        Entendido
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
