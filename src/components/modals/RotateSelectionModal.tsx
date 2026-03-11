import React from 'react';
import type { Card } from '../../types';

interface RotateSelectionModalProps {
    hand: Card[];
    totalPlayers: number;
    selectionsCount: number;
    hasSubmitted: boolean;
    onSelect: (cardId: string) => void;
}

export function RotateSelectionModal({
    hand,
    totalPlayers,
    selectionsCount,
    hasSubmitted,
    onSelect,
}: RotateSelectionModalProps) {
    return (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[110] flex flex-col items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-green-500/30 p-6 md:p-8 rounded-3xl max-w-4xl w-[95vw] md:w-full shadow-2xl shadow-green-500/20 text-center relative max-h-[90vh] overflow-y-auto">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                    <span className="text-3xl">🔄</span>
                </div>
                <h2 className="text-3xl font-black text-white mb-1 tracking-tight">Revolução!</h2>
                <p className="text-stone-400 mb-2 font-medium">
                    Escolha <span className="text-green-400 font-bold">1 carta</span> para passar ao jogador à sua esquerda.
                </p>

                <p className="text-stone-500 text-sm mb-6">
                    {selectionsCount} de {totalPlayers} jogadores escolheram
                    {hasSubmitted ? " — aguardando os demais..." : ""}
                </p>

                {hasSubmitted ? (
                    <div className="flex flex-col items-center gap-4 py-6">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50">
                            <span className="text-3xl">✅</span>
                        </div>
                        <p className="text-green-400 font-bold text-lg">Carta escolhida!</p>
                        <p className="text-stone-500 text-sm">Aguardando os outros jogadores...</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-center gap-6 mt-4">
                        {hand.map((card) => (
                            <button
                                key={card.id}
                                onClick={() => onSelect(card.id)}
                                className="w-40 h-60 rounded-xl overflow-hidden relative group border-2 border-stone-700 hover:border-green-500 hover:-translate-y-2 transition-all shadow-lg text-left bg-stone-800"
                            >
                                {card.image && (
                                    <img src={card.image} alt={card.name} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 to-transparent pt-10 pb-3 px-3 transform translate-y-4 group-hover:translate-y-0 transition-transform z-10">
                                    <p className="text-xs font-bold text-amber-500 mb-0.5 leading-tight">{card.name}</p>
                                    <p className="text-[10px] text-green-400 font-medium tracking-wide">Passar →</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
