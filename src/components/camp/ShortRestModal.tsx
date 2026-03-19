import { useState, useEffect } from 'react';
import { Character } from '../../types/character';
import { X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    character: Character | null;
    onConfirm: (hitDiceToSpend: number) => void;
}

export function ShortRestModal({ isOpen, onClose, character, onConfirm }: Props) {
    const [spend, setSpend] = useState<number>(0);

    // hit dice parsing
    const match = character?.hitDice.match(/^(\d+)d(\d+)/i);
    const hdRemaining = match ? parseInt(match[1]) : character?.level || 1;
    const dieSize = match ? parseInt(match[2]) : 8;

    useEffect(() => {
        if (isOpen && hdRemaining > 0) {
            setSpend(1);
        } else {
            setSpend(0);
        }
    }, [isOpen, hdRemaining]);

    if (!isOpen || !character) return null;

    const handleConfirm = () => {
        onConfirm(spend);
        onClose();
        setSpend(0);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-stone-900 border border-stone-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-stone-800 bg-stone-900/50">
                    <h2 className="font-cinzel text-xl text-gold">Short Rest: {character.name}</h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-stone-300">
                        A short rest is a period of downtime, at least 1 hour long, during which a character does nothing more strenuous than eating, drinking, reading, and tending to wounds.
                    </p>

                    <div className="bg-stone-800 border border-stone-700 rounded-lg p-5 text-center shadow-inner">
                        <div className="text-xs text-stone-400 font-bold uppercase mb-4 tracking-wider">
                            Spend Hit Dice (Remaining: {hdRemaining})
                        </div>

                        <div className="flex items-center justify-center gap-6">
                            <button
                                disabled={spend <= 0}
                                onClick={() => setSpend(s => Math.max(0, s - 1))}
                                className="w-10 h-10 rounded-full bg-stone-900 border border-stone-600 flex justify-center items-center text-parchment hover:bg-stone-700 disabled:opacity-30 transition-all font-bold text-lg"
                            >-</button>
                            <div className="text-4xl font-cinzel text-gold-light w-16 text-center select-none">
                                {spend}
                            </div>
                            <button
                                disabled={spend >= hdRemaining}
                                onClick={() => setSpend(s => Math.min(hdRemaining, s + 1))}
                                className="w-10 h-10 rounded-full bg-stone-900 border border-stone-600 flex justify-center items-center text-parchment hover:bg-stone-700 disabled:opacity-30 transition-all font-bold text-lg"
                            >+</button>
                        </div>

                        {spend > 0 ? (
                            <div className="text-sm text-stone-400 mt-4 h-5 animate-in fade-in slide-in-from-bottom-1">
                                Will roll <span className="text-parchment font-bold">{spend}d{dieSize} + (CON mod × {spend})</span>
                            </div>
                        ) : (
                            <div className="text-sm text-stone-500 mt-4 h-5 italic">
                                {hdRemaining === 0 ? "No hit dice left!" : "Select hit dice to heal"}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-4 border-t border-stone-800 bg-stone-900/50">
                    <button onClick={onClose} className="px-5 py-2 rounded text-sm font-bold text-stone-300 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 rounded text-sm font-bold bg-gold text-stone-900 hover:bg-gold-light transition-colors shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                    >
                        Rest ({spend > 0 ? 'Heal' : 'Reset Features'})
                    </button>
                </div>
            </div>
        </div>
    );
}
