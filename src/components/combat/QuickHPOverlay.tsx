import { Heart, Users, X, Swords } from 'lucide-react';
import { Combatant } from '../../types/combat';

interface QuickHPOverlayProps {
    target: Combatant;
    activeCombatantId: string;
    damageCombatant: (id: string, amount: number, type?: string, isMagical?: boolean) => void;
    healCombatant: (id: string, amount: number) => void;
    setShowMultiTarget: (show: boolean) => void;
    clearTarget: () => void;
    className?: string;
}

export function QuickHPOverlay({
    target,
    activeCombatantId,
    damageCombatant,
    healCombatant,
    setShowMultiTarget,
    clearTarget,
    className = ""
}: QuickHPOverlayProps) {
    const isTargetingActive = target.id !== activeCombatantId;

    const handleApplyDamage = () => {
        const amtInput = document.getElementById('floating-hp-amt') as HTMLInputElement;
        const typeInput = document.getElementById('floating-hp-type') as HTMLSelectElement;
        const magicInput = document.getElementById('floating-hp-magical') as HTMLInputElement;
        const amt = parseInt(amtInput.value);
        if (amt) {
            damageCombatant(target.id, amt, typeInput.value || undefined, magicInput?.checked);
            amtInput.value = '';
        }
    };

    const handleApplyHeal = () => {
        const amtInput = document.getElementById('floating-hp-amt') as HTMLInputElement;
        const amt = parseInt(amtInput.value);
        if (amt) {
            healCombatant(target.id, amt);
            amtInput.value = '';
        }
    };

    return (
        <div className={`p-4 bg-stone-900/80 backdrop-blur-md border border-stone-800 rounded-2xl shadow-2xl flex flex-col gap-3 min-w-[280px] animate-in slide-in-from-right-4 fade-in duration-500 ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Heart size={14} className="text-blood" />
                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Health Actions</span>
                </div>
                {isTargetingActive ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                        <span className="text-[8px] font-black text-cyan-400 uppercase tracking-tighter">Target: {target.name}</span>
                        <button onClick={clearTarget} className="text-cyan-400 hover:text-white"><X size={10} /></button>
                    </div>
                ) : (
                    <span className="text-[8px] font-black text-stone-600 uppercase tracking-tighter">Target: Self ({target.name})</span>
                )}
            </div>

            <div className="flex gap-2">
                <input
                    type="number"
                    id="floating-hp-amt"
                    placeholder="Amt"
                    className="w-16 bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-parchment focus:outline-none focus:border-blood text-center font-bold"
                />
                <select
                    id="floating-hp-type"
                    className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 text-[10px] text-stone-400 focus:outline-none"
                >
                    <option value="">Type</option>
                    {['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'].map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>

            <div className="flex gap-1.5">
                <button
                    onClick={handleApplyDamage}
                    className="flex-1 bg-blood/10 hover:bg-blood/20 text-blood border border-blood/30 hover:border-blood text-[10px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1"
                >
                    <Swords size={12} /> Damage
                </button>
                <button
                    onClick={handleApplyHeal}
                    className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 hover:border-green-500 text-[10px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1"
                >
                    <Heart size={12} /> Heal
                </button>
                <button
                    onClick={() => setShowMultiTarget(true)}
                    className="bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 p-2 rounded-lg transition-all"
                    title="Multi-Target (AoE)"
                >
                    <Users size={14} />
                </button>
            </div>

            <div className="flex items-center gap-2 px-1">
                <label className="flex items-center gap-1 cursor-pointer group">
                    <input type="checkbox" id="floating-hp-magical" className="sr-only peer" />
                    <div className="w-3 h-3 border border-stone-700 rounded bg-stone-950 peer-checked:bg-arcane peer-checked:border-arcane transition-all"></div>
                    <span className="text-[9px] text-stone-500 group-hover:text-stone-300 transition-colors uppercase tracking-widest font-bold">✨ Magical</span>
                </label>
            </div>
        </div>
    );
}
