import React from 'react';
import type { Card } from '../../types';

interface DiscardCardInspectionModalProps {
    discardPile: Card[];
    isMyTurn: boolean;
    turnPhase: string;
    onClose: () => void;
    onTake: () => void;
}

export function DiscardCardInspectionModal({
    discardPile,
    isMyTurn,
    turnPhase,
    onClose,
    onTake,
}: DiscardCardInspectionModalProps) {
    if (discardPile.length === 0) return null;
    const topCard = discardPile[discardPile.length - 1];

    return (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[110] flex flex-col items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-stone-700 p-6 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col items-center relative max-h-[90vh] overflow-y-auto">
                {topCard.image ? (
                    <img
                        src={topCard.image}
                        className="w-full h-auto aspect-[2/3] object-cover rounded-xl border-2 border-stone-700 shadow-lg mb-6"
                        alt={topCard.name}
                    />
                ) : (
                    <div className="w-full h-auto aspect-[2/3] bg-stone-800 rounded-xl border-2 border-stone-700 shadow-lg flex items-center justify-center mb-6">
                        <span className="text-xl font-bold text-stone-500 text-center uppercase px-4">{topCard.class}</span>
                    </div>
                )}

                <div className="flex w-full gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-stone-800 hover:bg-stone-700 text-white font-bold py-3 rounded-xl transition-colors border border-stone-600 text-sm uppercase tracking-wider"
                    >
                        Recusar
                    </button>

                    {isMyTurn && turnPhase === "start" && (
                        <button
                            onClick={onTake}
                            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-orange-500/20 text-sm uppercase tracking-wider"
                        >
                            Pegar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
