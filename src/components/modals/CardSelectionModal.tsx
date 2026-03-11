import React from 'react';
import { Shield } from 'lucide-react';
import type { Card } from '../../types';

interface CardSelectionModalProps {
    actionType: "eliminate" | "swap" | "give" | string;
    targetHand: Card[];
    canSkip?: boolean;
    onSelect: (cardId: string) => void;
}

export function CardSelectionModal({ actionType, targetHand, canSkip, onSelect }: CardSelectionModalProps) {
    return (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-purple-500/30 p-6 md:p-8 rounded-3xl max-w-4xl w-[95vw] md:w-full shadow-2xl shadow-purple-500/20 text-center relative max-h-[90vh] overflow-y-auto">
                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                    {actionType === "eliminate" ? "Eliminar Carta" : "Trocar Carta"}
                </h2>
                <p className="text-stone-400 mb-8 font-medium">
                    {actionType === "eliminate"
                        ? "Você está inspecionando a mão do oponente. Escolha a carta que deseja eliminar."
                        : "Você revelou uma carta do oponente. Deseja trocá-la com o topo do baralho?"}
                </p>

                <div className="flex flex-wrap justify-center gap-6 mb-8">
                    {targetHand.map((card) => (
                        <button
                            key={card.id}
                            onClick={() => onSelect(card.id)}
                            className="w-48 h-72 rounded-xl overflow-hidden relative group border-2 border-stone-700 hover:border-purple-500 hover:-translate-y-2 transition-all shadow-lg text-left bg-stone-800"
                        >
                            {card.image && (
                                <img src={card.image} alt={card.name} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 to-transparent pt-12 pb-4 px-4 transform translate-y-4 group-hover:translate-y-0 transition-transform z-10">
                                <p className="text-sm font-bold text-amber-500 mb-1 leading-tight">{card.name}</p>
                                <p className="text-xs text-stone-300 font-medium tracking-wide">
                                    {actionType === "eliminate" ? "Eliminar ×" : "Trocar ⇄"}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>

                {canSkip && (
                    <button
                        onClick={() => onSelect("skip")}
                        className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 font-bold py-3 px-6 rounded-xl transition-all border border-stone-700 mt-2"
                    >
                        Não Trocar
                    </button>
                )}

                <div className="absolute top-4 right-6 flex items-center gap-2 text-stone-500 bg-stone-950 px-3 py-1 rounded-full border border-stone-800">
                    <Shield className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Ação Privada</span>
                </div>
            </div>
        </div>
    );
}
