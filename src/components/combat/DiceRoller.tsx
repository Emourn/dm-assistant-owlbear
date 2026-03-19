import { useState } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { rollDice } from '../../engine/diceEngine';
import { Dice5, Send } from 'lucide-react';

export function DiceRoller() {
    const addLog = useCombatStore(state => state.addLog);
    const activeEncounter = useCombatStore(state => state.activeEncounter);

    const [notation, setNotation] = useState('');
    const [advantageMode, setAdvantageMode] = useState<'normal' | 'advantage' | 'disadvantage'>('normal');
    const [lastRoll, setLastRoll] = useState<any>(null);

    const handleRoll = () => {
        if (!notation) return;

        try {
            const result = rollDice(notation, advantageMode);
            setLastRoll(result);
        } catch (e) {
            console.error(e);
        }
    };

    const broadcastRoll = () => {
        if (!lastRoll || !activeEncounter) return;

        const modeText = lastRoll.advantageMode !== 'normal' ? ` (w/ ${lastRoll.advantageMode})` : '';
        addLog({
            message: `DM rolled ${lastRoll.notation}${modeText}: **${lastRoll.total}**`,
            type: 'roll',
            details: lastRoll
        });
    };

    const handleQuickRoll = (flat: string) => {
        try {
            const result = rollDice(flat, 'normal');
            setLastRoll(result);
            setNotation(flat);
        } catch {
            return;
        }
    };

    return (
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2 border-b border-stone-800 pb-2">
                <Dice5 size={16} className="text-arcane" /> DM Dice Roller
            </h3>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={notation}
                    onChange={(e) => setNotation(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRoll()}
                    placeholder="e.g. 2d6+3"
                    className="flex-1 bg-stone-950 border border-stone-800 rounded px-3 py-2 text-parchment font-mono focus:outline-none focus:border-arcane"
                />
                <button
                    onClick={handleRoll}
                    className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold px-4 rounded transition-colors"
                >
                    Roll
                </button>
            </div>

            <div className="flex gap-1">
                {['normal', 'advantage', 'disadvantage'].map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setAdvantageMode(mode as any)}
                        className={`flex-1 py-1 text-[10px] uppercase font-bold tracking-wider rounded border transition-colors ${advantageMode === mode
                                ? 'bg-arcane/20 border-arcane text-arcane-light'
                                : 'bg-stone-950 border-stone-800 text-stone-500 hover:bg-stone-900'
                            }`}
                    >
                        {mode === 'normal' ? 'Norm' : mode === 'advantage' ? 'Adv' : 'Disadv'}
                    </button>
                ))}
            </div>

            <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                {['d20', 'd12', 'd10', 'd8', 'd6', 'd4', 'd100'].map(die => (
                    <button
                        key={die}
                        onClick={() => handleQuickRoll(`1${die}`)}
                        className="bg-stone-950 border border-stone-800 hover:border-gold text-stone-400 hover:text-gold px-2 py-1 rounded text-xs font-mono transition-colors"
                    >
                        {die}
                    </button>
                ))}
            </div>

            {lastRoll && (
                <div className="mt-4 pt-3 border-t border-stone-800 bg-stone-950/50 p-3 rounded flex flex-col items-center animate-in slide-in-from-bottom-2">
                    <div className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Result</div>
                    <div className={`text-3xl font-bold font-cinzel leading-none mb-2 ${lastRoll.isCrit ? 'text-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]' :
                            lastRoll.isFumble ? 'text-blood' : 'text-parchment'
                        }`}>
                        {lastRoll.total}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-1 mb-3">
                        {lastRoll.rolls.map((r: number, i: number) => (
                            <span key={i} className="text-xs bg-stone-900 border border-stone-700 font-mono text-stone-300 px-1.5 py-0.5 rounded">
                                {r}
                            </span>
                        ))}
                        {lastRoll.droppedRolls && lastRoll.droppedRolls.map((r: number, i: number) => (
                            <span key={`drop-${i}`} className="text-xs bg-stone-900/50 border border-stone-800/50 font-mono text-stone-600 px-1.5 py-0.5 rounded line-through">
                                {r}
                            </span>
                        ))}
                        {lastRoll.modifier !== 0 && (
                            <span className="text-xs text-stone-400 font-mono px-1">
                                {lastRoll.modifier > 0 ? '+' : ''}{lastRoll.modifier}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={broadcastRoll}
                        disabled={!activeEncounter}
                        className="w-full bg-arcane/20 hover:bg-arcane/30 text-arcane-light text-xs font-bold py-1.5 rounded flex items-center justify-center gap-2 border border-arcane/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Broadcast to Combat Log"
                    >
                        <Send size={12} /> Send to Log
                    </button>
                </div>
            )}
        </div>
    );
}
