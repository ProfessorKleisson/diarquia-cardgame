import React from 'react';
import { Crown } from 'lucide-react';
import type { Card } from '../../types';

interface ChoiceModalProps {
    card: Card;
    options: { id: string; label: string }[];
    onSelect: (choiceId: string) => void;
}

export function ChoiceModal({ card, options, onSelect }: ChoiceModalProps) {
    return (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[110] flex flex-col items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-amber-500/30 p-8 rounded-3xl max-w-md w-full shadow-2xl shadow-amber-500/10 text-center">
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                    <Crown className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Decisão Liberal</h2>
                <p className="text-stone-400 mb-8 font-medium">
                    Escolha o benefício que deseja receber da carta <span className="text-amber-500 font-bold">{card.name}</span>.
                </p>

                <div className="flex flex-col gap-4">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => onSelect(option.id)}
                            className="w-full bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-amber-500 font-black py-4 rounded-2xl transition-all border border-stone-700 hover:border-amber-400 shadow-lg active:scale-95 uppercase tracking-widest text-lg"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
