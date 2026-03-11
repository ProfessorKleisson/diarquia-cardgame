import React from 'react';
import { Shield } from 'lucide-react';
import type { Card } from '../../types';

interface DefenseModalProps {
    attackerName: string;
    cardName: string;
    hand: Card[];
    onDefend: (cardId: string) => void;
    onAccept: () => void;
}

export function DefenseModal({ attackerName, cardName, hand, onDefend, onAccept }: DefenseModalProps) {
    return (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-amber-500/30 p-6 md:p-8 rounded-3xl max-w-2xl w-[95vw] md:w-full shadow-2xl shadow-amber-500/10 max-h-[90vh] overflow-y-auto">
                <Shield className="w-16 h-16 text-amber-500 mx-auto mb-6 animate-pulse" />
                <h2 className="text-3xl font-bold text-center mb-2">Defense Required!</h2>
                <p className="text-stone-400 text-center mb-8">
                    <span className="text-stone-100 font-bold">{attackerName}</span> is attacking you with <span className="text-amber-500 font-bold">{cardName}</span>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {hand
                        .filter((c) => c.type === "defense" || c.power?.startsWith("block") || c.power?.startsWith("protection_"))
                        .map((card) => (
                            <button
                                key={card.id}
                                onClick={() => onDefend(card.id)}
                                className="bg-stone-800 hover:bg-stone-700 p-4 rounded-xl border border-stone-700 flex flex-col items-start transition-all hover:border-amber-500 group"
                            >
                                <span className="font-bold text-amber-500 mb-1 group-hover:scale-105 transition-transform">{card.name}</span>
                                <span className="text-[10px] text-stone-500 text-left leading-tight">{card.description}</span>
                            </button>
                        ))}
                </div>

                <button
                    onClick={onAccept}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-red-500/20"
                >
                    Accept Effect
                </button>
            </div>
        </div>
    );
}
