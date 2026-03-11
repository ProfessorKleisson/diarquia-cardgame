import React from 'react';
import type { Player } from '../../types';

interface OpponentViewModalProps {
    viewedPlayer: Player | undefined;
    isPartner: boolean | null | undefined;
    onClose: () => void;
}

export function OpponentViewModal({ viewedPlayer, isPartner, onClose }: OpponentViewModalProps) {
    if (!viewedPlayer) return null;

    // For diarchy partners show all cards; for enemies show only the visible card
    const cardsToShow = isPartner
        ? viewedPlayer.hand
        : (viewedPlayer.visibleCard ? [viewedPlayer.visibleCard] : []);

    return (
        <div
            className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[120] flex flex-col items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-stone-900 border border-stone-700 p-5 rounded-3xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-black text-amber-500 uppercase tracking-wider">{viewedPlayer.name}</h2>
                        <p className="text-xs text-stone-500 mt-0.5">
                            {isPartner ? "Seu parceiro de Diarquia — todas as cartas visíveis" : "Carta visível do adversário"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors border border-stone-700 text-lg font-bold"
                    >×</button>
                </div>

                {/* Cards */}
                {cardsToShow.length === 0 ? (
                    <div className="text-center text-stone-500 py-8 text-sm">Nenhuma carta visível para exibir.</div>
                ) : (
                    <div className="flex flex-wrap gap-3 justify-center">
                        {cardsToShow.map(card => (
                            <div key={card.id} className="w-32 flex-shrink-0">
                                <div className="w-full aspect-[2/3] rounded-xl overflow-hidden border-2 border-stone-700 shadow-lg bg-stone-800 relative">
                                    {card.image ? (
                                        <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center p-2">
                                            <span className="text-stone-500 text-xs text-center uppercase font-bold">{card.class}</span>
                                        </div>
                                    )}
                                    {viewedPlayer.visibleCard?.id === card.id && (
                                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow">
                                            Visível
                                        </div>
                                    )}
                                </div>
                                <div className="mt-1.5 text-center">
                                    <p className="text-xs font-bold text-stone-200 leading-tight truncate">{card.name}</p>
                                    <p className="text-[10px] text-amber-500/80 uppercase tracking-wider truncate">{card.class}</p>
                                    {card.description && (
                                        <p className="text-[9px] text-stone-500 mt-0.5 leading-snug line-clamp-2">{card.description}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
