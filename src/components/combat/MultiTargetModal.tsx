import { useState } from 'react';
import {
    X, Check, Skull, Heart, Info, Users, Zap
} from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';

interface MultiTargetModalProps {
    onClose: () => void;
}

export function MultiTargetModal({ onClose }: MultiTargetModalProps) {
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const applyGroupHealthChange = useCombatStore((state) => state.applyGroupHealthChange);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [amount, setAmount] = useState<number>(0);
    const [damageType, setDamageType] = useState<string>('');
    const [isMagical, setIsMagical] = useState(false);
    const [isDamage, setIsDamage] = useState(true);

    if (!activeEncounter) return null;

    const { combatants } = activeEncounter;

    const toggleSelected = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectAll = (type?: 'player' | 'npc') => {
        const filtered = type
            ? combatants.filter(c => c.type === type && !c.isDead)
            : combatants.filter(c => !c.isDead);
        setSelectedIds(filtered.map(c => c.id));
    };

    const handleApply = () => {
        if (selectedIds.length === 0 || amount <= 0) return;
        applyGroupHealthChange(selectedIds, amount, isDamage, damageType || undefined, isMagical);
        onClose();
    };

    const DAMAGE_TYPES = [
        'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
        'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-stone-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blood/10 border border-blood/30 rounded-lg">
                            <Users size={20} className="text-blood" />
                        </div>
                        <div>
                            <h2 className="text-xl font-cinzel font-bold text-parchment">Multi-Target Action</h2>
                            <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">AoE Damage & Mass Healing</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full transition-colors text-stone-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Target Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-parchment flex items-center gap-2">
                                    <Users size={16} className="text-stone-500" />
                                    Select Targets ({selectedIds.length})
                                </h3>
                                <div className="flex gap-2">
                                    <button onClick={() => selectAll('npc')} className="text-[10px] text-blood hover:underline uppercase font-bold tracking-tighter">Monsters</button>
                                    <button onClick={() => selectAll('player')} className="text-[10px] text-arcane hover:underline uppercase font-bold tracking-tighter">Players</button>
                                    <button onClick={() => setSelectedIds([])} className="text-[10px] text-stone-500 hover:underline uppercase font-bold tracking-tighter">Clear</button>
                                </div>
                            </div>

                            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {combatants.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => toggleSelected(c.id)}
                                        className={`
                                            flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer
                                            ${selectedIds.includes(c.id)
                                                ? 'bg-gold/10 border-gold/40 shadow-[0_0_10px_rgba(255,215,0,0.05)]'
                                                : 'bg-stone-950/40 border-stone-800 hover:border-stone-700 hover:bg-stone-900/50'}
                                            ${c.isDead ? 'opacity-50 grayscale' : ''}
                                        `}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`
                                                w-5 h-5 rounded border flex items-center justify-center transition-colors
                                                ${selectedIds.includes(c.id) ? 'bg-gold border-gold text-stone-950' : 'bg-transparent border-stone-700'}
                                            `}>
                                                {selectedIds.includes(c.id) && <Check size={12} strokeWidth={4} />}
                                            </div>
                                            <div className="truncate">
                                                <div className={`text-sm font-bold ${selectedIds.includes(c.id) ? 'text-parchment' : 'text-stone-400'}`}>
                                                    {c.name}
                                                </div>
                                                <div className="text-[10px] text-stone-500 flex gap-2">
                                                    <span>HP: {c.currentHp}/{c.maxHp}</span>
                                                    <span>AC: {c.ac}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${c.type === 'player' ? 'bg-arcane/10 border-arcane/30 text-arcane' : 'bg-blood/10 border-blood/30 text-blood'}`}>
                                            {c.type}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Details */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-parchment flex items-center gap-2">
                                    <Info size={16} className="text-stone-500" />
                                    Action Config
                                </h3>

                                {/* Mode Toggle */}
                                <div className="grid grid-cols-2 p-1 bg-stone-950 border border-stone-800 rounded-lg">
                                    <button
                                        onClick={() => setIsDamage(true)}
                                        className={`py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${isDamage ? 'bg-blood/20 text-blood shadow-inner' : 'text-stone-500 hover:text-stone-300'}`}
                                    >
                                        Damage
                                    </button>
                                    <button
                                        onClick={() => setIsDamage(false)}
                                        className={`py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${!isDamage ? 'bg-green-900/40 text-green-400 shadow-inner' : 'text-stone-500 hover:text-stone-300'}`}
                                    >
                                        Healing
                                    </button>
                                </div>

                                <div className="space-y-4 bg-stone-950/50 p-4 rounded-xl border border-stone-800">
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 block">Amount</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full bg-stone-950 border border-stone-800 rounded-lg py-3 px-4 text-parchment font-cinzel font-bold text-2xl focus:outline-none focus:border-gold transition-all"
                                                value={amount || ''}
                                                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                                                placeholder="0"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                {isDamage ? <Skull size={20} className="text-blood opacity-50" /> : <Heart size={20} className="text-green-500 opacity-50" />}
                                            </div>
                                        </div>
                                    </div>

                                    {isDamage && (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 block">Damage Type</label>
                                                <select
                                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg py-2 px-3 text-sm text-parchment focus:outline-none focus:border-gold transition-all"
                                                    value={damageType}
                                                    onChange={(e) => setDamageType(e.target.value)}
                                                >
                                                    <option value="">None / Multiple Types</option>
                                                    {DAMAGE_TYPES.map(t => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <label className="flex items-center gap-3 cursor-pointer group p-2 rounded hover:bg-stone-900/50 transition-all border border-transparent hover:border-stone-800">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={isMagical}
                                                    onChange={(e) => setIsMagical(e.target.checked)}
                                                />
                                                <div className="w-5 h-5 border border-stone-700 rounded bg-stone-950 peer-checked:bg-gold peer-checked:border-gold flex items-center justify-center text-stone-950 transition-all">
                                                    <Zap size={12} strokeWidth={4} />
                                                </div>
                                                <span className="text-xs text-stone-400 group-hover:text-parchment transition-colors font-medium">Bypass Non-Magical Resistance</span>
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-stone-800 bg-stone-950/30 flex items-center justify-between">
                    <p className="text-[10px] text-stone-500 max-w-[300px]">
                        Applying {isDamage ? 'damage' : 'healing'} will account for each target's resistances, immunities, and vulnerabilities automatically.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-lg border border-stone-700 text-stone-400 hover:text-white hover:bg-stone-800 transition-all font-bold text-sm uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={selectedIds.length === 0 || amount <= 0}
                            onClick={handleApply}
                            className={`
                                px-8 py-2.5 rounded-lg shadow-xl font-bold text-sm uppercase tracking-widest transition-all
                                ${selectedIds.length > 0 && amount > 0
                                    ? isDamage ? 'bg-blood text-white shadow-blood/20 hover:scale-105 active:scale-95' : 'bg-green-600 text-white shadow-green-600/20 hover:scale-105 active:scale-95'
                                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'}
                            `}
                        >
                            Apply to {selectedIds.length} {selectedIds.length === 1 ? 'Target' : 'Targets'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
