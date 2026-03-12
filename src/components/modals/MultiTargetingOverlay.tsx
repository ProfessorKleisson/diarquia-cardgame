import React from 'react';
import { Swords } from 'lucide-react';

export function MultiTargetingOverlay({
    onCancel,
    onConfirm,
    selectedCount,
    requiredCount
}: {
    onCancel: () => void;
    onConfirm: () => void;
    selectedCount: number;
    requiredCount: number;
}) {
    return (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-red-500/30 p-6 md:p-8 rounded-3xl max-w-md w-[95vw] md:w-full text-center shadow-2xl shadow-red-500/10">
                <Swords className="w-16 h-16 text-red-500 mx-auto mb-6 animate-pulse" />
                <h2 className="text-3xl font-bold text-white mb-2">Visão Platônica</h2>
                <p className="text-stone-400 mb-2 font-medium">
                    Selecione {requiredCount} oponentes para revelar suas sombras.
                </p>
                <p className="text-amber-500 mb-8 font-bold text-lg">
                    {selectedCount} / {requiredCount} selecionados
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={selectedCount !== requiredCount}
                        className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-600 text-stone-900 py-3 rounded-xl font-black transition-all border border-amber-500 shadow-lg active:scale-95 uppercase tracking-widest"
                    >
                        Revelar Verdade
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full bg-stone-800 hover:bg-stone-700 text-stone-400 py-3 rounded-xl font-bold transition-all border border-stone-700 active:scale-95"
                    >
                        Cancelar Platão
                    </button>
                </div>
            </div>
        </div>
    );
}
