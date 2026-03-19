import { useCombatStore } from '../../store/combatStore';
import { Combatant } from '../../types/combat';
import { Sparkles } from 'lucide-react';

interface SpellSlotTrackerProps {
    combatant: Combatant;
}

export function SpellSlotTracker({ combatant }: SpellSlotTrackerProps) {
    const consumeSpellSlot = useCombatStore(s => s.useSpellSlot);

    if (!combatant.spellSlots || combatant.spellSlots.every(s => s.max === 0)) {
        return null;
    }

    return (
        <div className="bg-stone-900/50 border border-stone-800 rounded-lg p-3 mb-4 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 mb-3 border-b border-stone-800 pb-2">
                <Sparkles size={14} className="text-arcane" />
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Spell Slots</h4>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {combatant.spellSlots.map((slot, level) => {
                    if (level === 0 || slot.max === 0) return null;

                    return (
                        <div key={level} className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-tighter w-12 shrink-0">
                                Lvl {level}
                            </span>

                            <div className="flex flex-wrap gap-1.5 flex-1 justify-end">
                                {Array.from({ length: slot.max }).map((_, i) => {
                                    const isUsed = i >= slot.current;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => !isUsed && consumeSpellSlot(combatant.id, level)}
                                            disabled={isUsed}
                                            className={`
                                                w-3.5 h-3.5 rounded-sm border transition-all duration-300 relative
                                                ${isUsed
                                                    ? 'bg-stone-950 border-stone-800 cursor-not-allowed'
                                                    : 'bg-arcane/30 border-arcane hover:bg-arcane/60 cursor-pointer shadow-[0_0_8px_rgba(102,204,255,0.2)] hover:shadow-[0_0_12px_rgba(102,204,255,0.4)] hover:scale-110'
                                                }
                                            `}
                                            title={isUsed ? 'Used' : `Level ${level} Slot - Click to consume`}
                                        >
                                            {!isUsed && (
                                                <div className="absolute inset-0 bg-arcane opacity-20 animate-pulse rounded-sm"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
