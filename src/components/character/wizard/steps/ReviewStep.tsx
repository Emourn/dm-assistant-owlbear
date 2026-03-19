import { Character } from '../../../../types/character';
import { DerivedStats } from '../../../../types/rules';
import { Save, User as UserIcon, Shield, Zap, Sword } from 'lucide-react';

interface Props {
    draft: Character;
    derived: DerivedStats;
    onSave: () => void;
}

export function ReviewStep({ draft, derived, onSave }: Props) {
    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-stone-900/30 border border-stone-800 p-8 rounded-xl text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-stone-800 border-2 border-stone-700 rounded-full flex items-center justify-center overflow-hidden">
                    {draft.portraitUrl ? (
                        <img src={draft.portraitUrl} alt="Portrait" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon size={48} className="text-stone-700" />
                    )}
                </div>
                <div className="space-y-1">
                    <h3 className="text-3xl font-cinzel font-bold text-parchment">{draft.name || 'Unnamed Hero'}</h3>
                    <p className="text-gold font-bold tracking-widest uppercase">
                        Level 1 {draft.race} {draft.className}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Core Stats Summary */}
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6 space-y-4">
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest border-b border-stone-800 pb-2 flex items-center gap-2">
                        <Shield size={14} />
                        Combat Vitality
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[10px] text-stone-600 font-bold uppercase">Armor Class</div>
                            <div className="text-xl font-cinzel font-bold text-white">{derived.armorClass}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-stone-600 font-bold uppercase">Hit Points</div>
                            <div className="text-xl font-cinzel font-bold text-white">{draft.maxHp}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-stone-600 font-bold uppercase">Initiative</div>
                            <div className="text-xl font-cinzel font-bold text-white">
                                {derived.initiativeBonus >= 0 ? `+${derived.initiativeBonus}` : derived.initiativeBonus}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-stone-600 font-bold uppercase">Proficiency</div>
                            <div className="text-xl font-cinzel font-bold text-white">+{derived.proficiencyBonus}</div>
                        </div>
                    </div>
                </div>

                {/* Abilities Summary */}
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6 space-y-4">
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest border-b border-stone-800 pb-2 flex items-center gap-2">
                        <Zap size={14} />
                        Ability Scores
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.entries(draft.abilityScores).map(([stat, val]) => {
                            const mod = Math.floor((val - 10) / 2);
                            return (
                                <div key={stat} className="bg-stone-950/40 p-2 rounded border border-stone-800/50 flex flex-col items-center">
                                    <span className="text-[10px] uppercase font-bold text-stone-600">{stat}</span>
                                    <span className="text-sm font-bold text-parchment">{val}</span>
                                    <span className="text-[10px] text-gold font-bold">{mod >= 0 ? `+${mod}` : mod}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Choices Summary */}
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-6 space-y-4 md:col-span-2">
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest border-b border-stone-800 pb-2 flex items-center gap-2">
                        <Sword size={14} />
                        Character Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <span className="text-[10px] text-stone-600 font-bold uppercase">Background</span>
                            <div className="text-sm font-bold text-parchment">{draft.background || 'None'}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] text-stone-600 font-bold uppercase">Proficient Skills</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {draft.skills.filter(s => s.proficient).map(s => (
                                    <span key={s.name} className="bg-blood/10 border border-blood/20 text-blood-light text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                                        {s.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] text-stone-600 font-bold uppercase">Equipped Items</span>
                            <div className="text-[11px] text-stone-400">
                                {draft.inventory.length} items in inventory
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-6">
                <button
                    onClick={onSave}
                    className="w-full py-4 bg-gold text-stone-950 rounded-xl font-cinzel font-bold text-xl tracking-widest hover:bg-gold-light hover:scale-[1.01] transition-all shadow-xl shadow-gold/10 flex items-center justify-center gap-3"
                >
                    <Save size={24} />
                    FINISH & SAVE CHARACTER
                </button>
            </div>
        </div>
    );
}
