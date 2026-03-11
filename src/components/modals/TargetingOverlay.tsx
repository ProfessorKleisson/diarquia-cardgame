import React from 'react';
import { Swords } from 'lucide-react';

export function TargetingOverlay({ onCancel }: { onCancel: () => void }) {
    return (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-stone-900 border-2 border-red-500/30 p-6 md:p-8 rounded-3xl max-w-md w-[95vw] md:w-full text-center shadow-2xl shadow-red-500/10">
                <Swords className="w-16 h-16 text-red-500 mx-auto mb-6 animate-pulse" />
                <h2 className="text-3xl font-bold text-white mb-2">Select a Target</h2>
                <p className="text-stone-400 mb-8 font-medium">Click on an opponent's avatar at the top of the screen to apply the effect.</p>
                <button
                    onClick={onCancel}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-3 rounded-xl font-bold transition-all border border-stone-700 active:scale-95"
                >
                    Cancel Action
                </button>
            </div>
        </div>
    );
}
