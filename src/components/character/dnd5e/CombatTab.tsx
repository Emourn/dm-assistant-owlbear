import { Character, Condition } from '../../../types/character';
import { Shield, Heart, Zap, Search, Plus, Trash2, Skull } from 'lucide-react';
import { useState } from 'react';
import { FiveEToolsModal } from '../../common/FiveEToolsModal';
import { InfoTooltip } from '../../common/InfoTooltip';
import { RulesTooltip } from '../../common/RulesTooltip';
import { InlineModifierToggle } from '../../common/InlineModifierToggle';
import { getArmorClassBreakdown, getInitiative } from '../../../engine/statCalculations';

interface Props {
    data: Character;
    onChange: (field: keyof Character, value: any) => void;
}

export function CombatTab({ data, onChange }: Props) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // DM Override helper
    const getOverride = (field: string) => {
        return data.customOverrides?.overrides?.find(o => o.field === field && o.isActive);
    };
    const getVal = (field: keyof Character, fallback: any) => {
        const ov = getOverride(field as string);
        return ov ? ov.value : (data as any)[field] ?? fallback;
    };

    const addCondition = () => {
        onChange('conditions', [...data.conditions, { id: crypto.randomUUID(), name: 'New Condition', description: '' }]);
    };

    const updateCondition = (id: string, updates: Partial<Condition>) => {
        onChange('conditions', data.conditions.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const removeCondition = (id: string) => {
        onChange('conditions', data.conditions.filter(c => c.id !== id));
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Armor Class */}
                <div className={`bg-stone-900/60 shadow-[0_4px_15px_rgba(0,0,0,0.4)] border-t-2 border-x-2 border-b-4 rounded-t-xl rounded-b-[2rem] p-4 flex flex-col items-center justify-center space-y-1 relative group hover:bg-stone-800/60 transition-colors ${getOverride('ac') ? 'border-gold/80 bg-gold/5' : 'border-stone-700 hover:border-stone-500'}`}>
                    <Shield size={20} className="text-stone-500 mb-1 absolute top-3" />
                    <div className="flex items-center gap-1.5 mt-4 z-10 w-full justify-center">
                        <RulesTooltip term="Armor Class">
                            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest relative cursor-help">Armor Class</span>
                        </RulesTooltip>
                    </div>

                    {/* Breakdown Tooltip */}
                    <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-52 bg-stone-900 border border-stone-700/80 rounded-lg p-3 text-xs shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        <div className="font-bold text-parchment mb-2 border-b border-stone-800 pb-1 flex items-center gap-2"><Shield size={12} className="text-gold" /> AC Breakdown</div>
                        {!getArmorClassBreakdown(data).isOverridden ? (
                            <div className="space-y-1.5 text-stone-400 font-mono">
                                <div className="flex justify-between"><span>Base <span className="text-stone-600 text-[10px]">({getArmorClassBreakdown(data).source})</span></span><span className="text-stone-300">{getArmorClassBreakdown(data).base}</span></div>
                                <div className="flex justify-between"><span>DEX Mod <span className="text-stone-600 text-[10px]">{getArmorClassBreakdown(data).dexCap !== null && `(Max ${getArmorClassBreakdown(data).dexCap})`}</span></span><span className="text-stone-300">+{getArmorClassBreakdown(data).dexBonus}</span></div>
                                <div className="flex justify-between"><span>Shield Bonus</span><span className="text-stone-300">+{(getArmorClassBreakdown(data).shieldBonus)}</span></div>
                                {getArmorClassBreakdown(data).modifierBonus !== 0 && (
                                    <div className="flex justify-between text-gold font-bold"><span>Modifiers</span><span>{getArmorClassBreakdown(data).modifierBonus > 0 ? '+' : ''}{getArmorClassBreakdown(data).modifierBonus}</span></div>
                                )}
                                <div className="border-t border-stone-700/50 pt-1.5 mt-1.5 flex justify-between font-bold text-parchment text-sm"><span>Total</span><span className="text-gold">{getArmorClassBreakdown(data).total}</span></div>
                            </div>
                        ) : (
                            <div className="text-gold italic flex items-center justify-center p-2">DM Override Active</div>
                        )}
                    </div>

                    {getOverride('ac') ? (
                        <div className="flex flex-col items-center mt-1 z-10">
                            <span className="text-4xl font-cinzel font-bold text-gold cursor-help drop-shadow-md" title={getOverride('ac')!.reason}>{getOverride('ac')!.value}</span>
                            <span className="text-[9px] text-gold/80 uppercase font-bold tracking-widest bg-stone-900 px-2 py-0.5 rounded-full border border-gold/30 mt-1">Overridden</span>
                        </div>
                    ) : (
                        <div className="flex flex-col relative items-center justify-center mt-1 z-10 w-full group/mod">
                            <span className="text-4xl font-cinzel font-bold text-parchment cursor-help drop-shadow-md pb-1">{getArmorClassBreakdown(data).total}</span>
                            <div className="h-4 flex items-center justify-center absolute -bottom-3 opacity-0 group-hover/mod:opacity-100 transition-opacity">
                                <InlineModifierToggle field="ac" modifiers={data.customOverrides?.modifiers} onChange={(m) => onChange('customOverrides', { ...data.customOverrides, modifiers: m })} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Initiative */}
                <div className={`bg-stone-800/50 border rounded-lg p-4 flex flex-col items-center justify-center space-y-2 ${getOverride('initiativeMod') ? 'border-gold/50' : 'border-stone-700/50'}`}>
                    <Zap size={24} className="text-gold-light" />
                    <div className="flex items-center gap-1.5">
                        <RulesTooltip term="Initiative">
                            <span className="text-xs text-stone-400 uppercase font-bold tracking-wider cursor-help">Initiative</span>
                        </RulesTooltip>
                        <InfoTooltip query="Initiative" />
                    </div>
                    {getOverride('initiativeMod') ? (
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-cinzel font-bold text-gold" title={getOverride('initiativeMod')!.reason}>
                                {(getOverride('initiativeMod')!.value as number) >= 0 ? '+' : ''}{getOverride('initiativeMod')!.value}
                            </span>
                            <span className="text-[8px] text-gold/70 uppercase">Overridden</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <span className="text-3xl font-cinzel font-bold text-parchment pl-4">
                                {getInitiative(data) >= 0 ? '+' : ''}{getInitiative(data)}
                            </span>
                            <InlineModifierToggle field="initiativeMod" modifiers={data.customOverrides?.modifiers} onChange={(m) => onChange('customOverrides', { ...data.customOverrides, modifiers: m })} />
                        </div>
                    )}
                </div>

                {/* Speed */}
                <div className={`bg-stone-800/50 border rounded-lg p-4 flex flex-col items-center justify-center space-y-2 md:col-span-2 ${getOverride('speed') ? 'border-gold/50' : 'border-stone-700/50'}`}>
                    <div className="flex items-center gap-1.5">
                        <RulesTooltip term="Action">
                            <span className="text-xs text-stone-400 uppercase font-bold tracking-wider cursor-help">Walking Speed</span>
                        </RulesTooltip>
                        {getOverride('speed') && <span className="text-gold text-[10px]" title={getOverride('speed')!.reason}>⚙️</span>}
                    </div>
                    <input
                        type="text" value={getVal('speed', '30 ft')}
                        onChange={e => onChange('speed', e.target.value)}
                        className={`w-full max-w-[120px] bg-transparent text-center text-2xl font-bold focus:outline-none border-b border-transparent focus:border-gold ${getOverride('speed') ? 'text-gold' : 'text-parchment focus:text-gold'}`}
                        placeholder="30 ft"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Health */}
                <div className="bg-stone-900/40 border-t-2 border-blood/20 shadow-[0_0_20px_rgba(153,27,27,0.05)] rounded-xl p-6 space-y-6 relative overflow-hidden group hover:border-blood/40 transition-colors col-span-1 md:col-span-2">
                    <Heart size={160} className="text-blood opacity-5 absolute -right-6 -bottom-6 group-hover:scale-[1.15] transition-transform duration-700 pointer-events-none" />

                    <h3 className="font-cinzel text-blood-light text-xl border-b border-blood/20 pb-2 drop-shadow-sm flex items-center gap-2 relative z-10 w-48">
                        <Heart size={18} className="text-blood" fill="currentColor" fillOpacity={0.2} />
                        Hit Points
                    </h3>

                    <div className="grid grid-cols-2 gap-8 relative z-10 mt-10">
                        <div className="space-y-1 relative">
                            <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest absolute -top-5 left-0">Current HP</label>
                            <input
                                type="number" value={data.currentHp}
                                onChange={e => onChange('currentHp', parseInt(e.target.value) || 0)}
                                className="w-full bg-transparent border-b border-stone-700/80 hover:border-blood text-center text-blood font-bold text-5xl focus:border-blood outline-none transition-colors py-2 focus:bg-stone-950/30 rounded-t"
                            />
                        </div>
                        <div className="space-y-1 relative h-full flex items-end">
                            <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest absolute -top-5 left-0">Max HP</label>
                            <input
                                type="number" value={data.maxHp}
                                onChange={e => onChange('maxHp', parseInt(e.target.value) || 0)}
                                className="w-full bg-transparent border-b border-stone-700/50 hover:border-stone-400 text-center text-stone-300 font-bold text-2xl focus:border-gold outline-none transition-colors py-2 focus:bg-stone-950/30 rounded-t"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-6 border-t border-stone-800/60 relative z-10">
                        <div className="space-y-1 relative">
                            <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest absolute -top-5 left-0">Temp HP</label>
                            <input
                                type="number" value={data.tempHp || ''}
                                onChange={e => onChange('tempHp', parseInt(e.target.value) || 0)}
                                className="w-full bg-transparent border-b border-stone-700/50 hover:border-blue-500/50 text-center text-blue-400 font-bold focus:border-blue-500 outline-none transition-colors py-1.5 focus:bg-stone-950/30 rounded-t"
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-1 relative">
                            <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest absolute -top-5 left-0">Hit Dice</label>
                            <input
                                type="text" value={data.hitDice}
                                onChange={e => onChange('hitDice', e.target.value)}
                                className="w-full bg-transparent border-b border-stone-700/50 hover:border-stone-400 text-center text-parchment font-bold focus:border-gold outline-none transition-colors py-1.5 focus:bg-stone-950/30 rounded-t"
                                placeholder="e.g. 1d10"
                            />
                        </div>
                    </div>
                </div>

                {/* Status / Death Saves */}
                <div className="bg-stone-900/40 border border-stone-800/60 rounded-xl p-6 space-y-6 shadow-inner col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between border-b border-stone-700/50 pb-2 mb-4">
                        <h3 className="font-cinzel text-gold text-xl flex items-center gap-2 drop-shadow-sm">
                            <Skull size={18} className="text-stone-500" />
                            Status & Conditions
                        </h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsSearchOpen(true)} className="flex items-center justify-center w-7 h-7 bg-stone-800/80 text-arcane-light rounded-md border border-stone-700 hover:border-arcane/50 hover:bg-stone-800 transition-colors shadow-sm" title="Search 5e.tools">
                                <Search size={14} />
                            </button>
                            <button onClick={addCondition} className="flex items-center justify-center w-7 h-7 bg-stone-800/80 text-parchment rounded-md border border-stone-700 hover:border-gold/50 hover:bg-stone-800 transition-colors shadow-sm" title="Add Custom Condition">
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Conditions */}
                    {data.conditions.length > 0 && (
                        <div className="space-y-1.5 mb-6 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                            {data.conditions.map(c => (
                                <div key={c.id} className="flex items-center justify-between bg-stone-950/50 border border-stone-800/80 rounded-md px-3 py-2 group focus-within:border-gold/50 transition-colors hover:bg-stone-900/80">
                                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                        <RulesTooltip term={c.name}>
                                            <Skull size={14} className="text-blood shrink-0" />
                                        </RulesTooltip>
                                        <input
                                            type="text" value={c.name}
                                            onChange={e => updateCondition(c.id, { name: e.target.value })}
                                            className="w-full bg-transparent text-sm text-stone-300 font-bold outline-none focus:text-parchment"
                                            placeholder="Condition Name"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <InfoTooltip query={c.name} />
                                        <button onClick={() => removeCondition(c.id)} className="text-stone-600 hover:text-blood/80 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-stone-800 transition-all" title="Remove Condition">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                        <div className="space-y-3 relative">
                            <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest absolute -top-5 left-0">Death Saves</label>
                            <div className="flex justify-between items-center bg-stone-950/40 p-2.5 rounded-lg border border-stone-800/50 h-10 shadow-inner">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider w-12 pt-0.5">Success</span>
                                    <div className="flex items-center gap-1.5">
                                        {[1, 2, 3].map(num => (
                                            <button
                                                key={`succ-${num}`}
                                                onClick={() => onChange('deathSaves', { ...data.deathSaves, successes: data.deathSaves.successes === num ? num - 1 : num })}
                                                className={`w-3.5 h-3.5 rounded-full border transition-all ${data.deathSaves.successes >= num ? 'bg-green-500 border-green-400 shadow-[0_0_8px_rgba(34,197,94,0.4)] scale-110' : 'bg-stone-900 border-stone-700 hover:border-green-500/50 hover:bg-stone-800'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="w-px h-6 bg-stone-800/80 mx-2"></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider w-12 text-right pt-0.5">Failure</span>
                                    <div className="flex items-center gap-1.5">
                                        {[1, 2, 3].map(num => (
                                            <button
                                                key={`fail-${num}`}
                                                onClick={() => onChange('deathSaves', { ...data.deathSaves, failures: data.deathSaves.failures === num ? num - 1 : num })}
                                                className={`w-3.5 h-3.5 rounded-full border transition-all ${data.deathSaves.failures >= num ? 'bg-blood border-red-400 shadow-[0_0_8px_rgba(153,27,27,0.4)] scale-110' : 'bg-stone-900 border-stone-700 hover:border-red-900/50 hover:bg-stone-800'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 relative">
                            <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest absolute -top-5 left-0">Exhaustion Level</label>
                            <div className="flex gap-1 justify-between bg-stone-950/40 p-1.5 rounded-lg border border-stone-800/50 h-10 shadow-inner">
                                {[0, 1, 2, 3, 4, 5, 6].map(level => (
                                    <button
                                        key={`exh-${level}`}
                                        onClick={() => onChange('exhaustion', level)}
                                        className={`flex-1 rounded-md border font-bold text-xs transition-all flex items-center justify-center ${data.exhaustion === level
                                            ? level === 6 ? 'bg-blood border-red-400 text-white shadow-[0_0_10px_rgba(153,27,27,0.5)]' : 'bg-stone-700 border-stone-500 text-parchment shadow-sm'
                                            : 'bg-transparent border-transparent text-stone-600 hover:bg-stone-800/80 hover:text-stone-400'
                                            }`}
                                        title={level === 6 ? 'Death' : `Level ${level}`}
                                    >
                                        {level === 0 ? '-' : level}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <FiveEToolsModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                initialCategory="Conditions"
                fixedCategory={true}
                onImport={(item, cat) => {
                    if (cat === 'Conditions') {
                        onChange('conditions', [...data.conditions, { id: crypto.randomUUID(), name: item.name, description: item.description }]);
                    }
                }}
            />
        </div>
    );
}
