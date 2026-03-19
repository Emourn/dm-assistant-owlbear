import { Character, Spell, StatBlock } from '../../../types/character';
import { BookOpen, Plus, Trash2, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { FiveEToolsModal } from '../../common/FiveEToolsModal';
import { InlineModifierToggle } from '../../common/InlineModifierToggle';
import { getSpellSaveDc, getSpellAttackMod } from '../../../engine/statCalculations';

interface Props {
    data: Character;
    onChange: (field: keyof Character, value: any) => void;
}

const ABILITIES: { value: keyof StatBlock | 'none'; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'int', label: 'Intelligence (Wizard/Artificer)' },
    { value: 'wis', label: 'Wisdom (Cleric/Druid/Ranger)' },
    { value: 'cha', label: 'Charisma (Bard/Paladin/Sorcerer/Warlock)' }
];

export function MagicTab({ data, onChange }: Props) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const addSpell = () => {
        const newSpell: Spell = {
            id: crypto.randomUUID(),
            name: 'New Spell',
            level: 0,
            school: 'Evocation',
            castingTime: '1 Action',
            range: '60 feet',
            components: { v: true, s: true, m: false },
            duration: 'Instantaneous',
            concentration: false,
            ritual: false,
            description: '',
            prepared: true
        };
        onChange('spells', [...data.spells, newSpell]);
    };

    const updateSpell = (id: string, updates: Partial<Spell>) => {
        onChange('spells', data.spells.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const removeSpell = (id: string) => {
        onChange('spells', data.spells.filter(s => s.id !== id));
    };

    const handleSlotChange = (level: number, type: 'current' | 'max', val: number) => {
        const newSlots = [...data.spellSlots];
        newSlots[level] = { ...newSlots[level], [type]: Math.max(0, val) };
        onChange('spellSlots', newSlots);
    };

    const handleResetAllSlots = () => {
        const newSlots = data.spellSlots.map(slot => ({ ...slot, current: slot.max }));
        onChange('spellSlots', newSlots);
    };

    const spellsByLevel = Array.from({ length: 10 }, (_, i) => data.spells.filter(s => s.level === i));

    return (
        <div className="space-y-6 animate-in fade-in">

            {/* Spellcasting Header & DC */}
            <div className="bg-stone-900/40 border border-stone-800/80 rounded-xl p-5 shadow-inner">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3 relative">
                        <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest absolute -top-3 left-0 flex items-center gap-1">
                            <BookOpen size={12} className="text-arcane-light" /> Spellcasting Ability
                        </label>
                        <select
                            value={data.spellcastingAbility}
                            onChange={e => onChange('spellcastingAbility', e.target.value)}
                            className="w-full bg-stone-950/50 border border-stone-800/80 rounded px-3 py-2 text-sm text-parchment focus:border-arcane-light outline-none transition-colors appearance-none cursor-pointer mt-2"
                        >
                            {ABILITIES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1 flex flex-col items-center justify-center">
                        <label className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">Spell Save DC</label>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-3xl font-cinzel font-bold text-arcane-light drop-shadow-sm">{getSpellSaveDc(data)}</span>
                            <InlineModifierToggle field="spellSaveDc" modifiers={data.customOverrides?.modifiers} onChange={(m) => onChange('customOverrides', { ...data.customOverrides, modifiers: m })} />
                        </div>
                        <p className="text-[9px] text-stone-500 uppercase font-bold tracking-widest mt-1">8 + Prof + Mod</p>
                    </div>

                    <div className="space-y-1 flex flex-col items-center justify-center">
                        <label className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">Spell Attack Bonus</label>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-3xl font-bold text-parchment flex items-center drop-shadow-sm">
                                {getSpellAttackMod(data) >= 0 ? '+' : ''}{getSpellAttackMod(data)}
                            </span>
                            <InlineModifierToggle field="spellAttackMod" modifiers={data.customOverrides?.modifiers} onChange={(m) => onChange('customOverrides', { ...data.customOverrides, modifiers: m })} />
                        </div>
                        <p className="text-[9px] text-stone-500 uppercase font-bold tracking-widest mt-1">Prof + Mod</p>
                    </div>
                </div>
            </div>

            {/* Spell Slots */}
            <div className="bg-stone-900/40 border border-stone-800/80 rounded-xl p-5 space-y-5 shadow-inner">
                <div className="flex justify-between items-center border-b border-stone-700/50 pb-2">
                    <h3 className="font-cinzel text-arcane-light text-xl flex items-center gap-2 drop-shadow-sm">
                        <BookOpen size={18} className="text-stone-500" />
                        Spell Slots
                    </h3>
                    <button
                        onClick={handleResetAllSlots}
                        className="text-[10px] uppercase font-bold tracking-widest bg-stone-800 hover:bg-stone-700 border border-stone-600 text-parchment px-2 py-1 rounded transition-colors shadow-sm"
                    >
                        Reset All Slots
                    </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 xl:grid-cols-9 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => {
                        const current = data.spellSlots[level]?.current || 0;
                        const max = data.spellSlots[level]?.max || 0;

                        return (
                            <div key={`slot-${level}`} className="flex flex-col bg-stone-950/40 border border-stone-800/80 rounded-lg p-3 relative group transition-colors hover:border-gold/30 hover:bg-stone-900/40 shadow-inner">
                                <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-3 text-center">Level {level}</div>

                                {/* Slot Pips */}
                                <div className="flex gap-1.5 flex-wrap justify-center min-h-[16px] mb-4">
                                    {Array.from({ length: Math.max(max, current) }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSlotChange(level, 'current', i < current ? current - 1 : current + 1)}
                                            className={`w-3.5 h-3.5 rounded-full border transition-all ${i < current
                                                    ? 'bg-arcane-light border-arcane shadow-[0_0_8px_rgba(96,165,250,0.5)] scale-110 relative z-10'
                                                    : 'bg-stone-950 border-stone-700 hover:border-arcane-light/50 hover:bg-stone-900'
                                                }`}
                                            title={i < current ? "Spend Slot" : "Regain Slot"}
                                        />
                                    ))}
                                    {max === 0 && <span className="text-[10px] text-stone-600 italic">No slots</span>}
                                </div>

                                {/* Slot Inputs */}
                                <div className="flex items-center gap-1 w-full mt-auto bg-stone-900/50 p-1.5 rounded border border-stone-800/50">
                                    <input
                                        type="number" min="0" max="10"
                                        value={current}
                                        onChange={e => handleSlotChange(level, 'current', parseInt(e.target.value) || 0)}
                                        className="w-full bg-transparent text-center text-sm text-gold font-bold outline-none focus:bg-stone-800 rounded transition-colors"
                                        title="Current Slots"
                                    />
                                    <span className="text-stone-600 text-[10px]">/</span>
                                    <input
                                        type="number" min="0" max="10"
                                        value={max}
                                        onChange={e => handleSlotChange(level, 'max', parseInt(e.target.value) || 0)}
                                        className="w-full bg-transparent text-center text-xs text-stone-400 font-bold outline-none focus:text-parchment rounded hover:text-stone-300 transition-colors"
                                        title="Max Slots"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Spells List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-700/50 pb-2">
                    <h3 className="font-cinzel text-xl drop-shadow-sm flex items-center gap-2 text-gold">
                        <BookOpen size={18} className="text-stone-500" />
                        Spellbook
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="flex items-center justify-center w-7 h-7 bg-stone-800/80 text-arcane-light rounded-md border border-stone-700 hover:border-arcane/50 hover:bg-stone-800 transition-colors shadow-sm" title="Search 5e.tools"
                        >
                            <Search size={14} />
                        </button>
                        <button
                            onClick={addSpell}
                            className="flex items-center justify-center w-7 h-7 bg-stone-800/80 text-parchment rounded-md border border-stone-700 hover:border-gold/50 hover:bg-stone-800 transition-colors shadow-sm" title="Add Custom Spell"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-6 pt-2">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => {
                        const list = spellsByLevel[level];
                        if (list.length === 0 && level > 0) return null; // Always show cantrips section, hide empty higher levels

                        return (
                            <div key={`spell-section-${level}`} className="space-y-1">
                                <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest border-b border-stone-800/50 pb-1 flex items-center justify-between mb-2">
                                    <span className="text-stone-400">{level === 0 ? 'Cantrips' : `Level ${level}`}</span>
                                </h4>

                                <div className="space-y-0.5">
                                    {list.length === 0 ? (
                                        <p className="text-xs text-stone-600 italic px-2">No spells added.</p>
                                    ) : (
                                        list.map(spell => (
                                            <div key={spell.id} className="bg-transparent border-b border-stone-800/40 relative group focus-within:bg-stone-900/40 hover:bg-stone-900/40 transition-colors py-1.5 pl-1 pr-8 text-sm">

                                                <div className="flex gap-2 items-center">
                                                    {/* Prepared Toggle (Not for Cantrips) */}
                                                    {level > 0 ? (
                                                        <button
                                                            onClick={() => updateSpell(spell.id, { prepared: !spell.prepared })}
                                                            className={`w-3.5 h-3.5 flex-shrink-0 rounded-full border transition-all outline-none ${spell.prepared ? 'bg-arcane-light border-arcane shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'border-stone-600 bg-stone-900 hover:border-arcane-light/50'
                                                                }`}
                                                            title={spell.prepared ? "Prepared" : "Not Prepared"}
                                                        />
                                                    ) : (
                                                        <div className="w-3.5 h-3.5 flex-shrink-0" />
                                                    )}

                                                    <div className="flex w-full items-center gap-2">
                                                        <input
                                                            type="text" value={spell.name}
                                                            onChange={e => updateSpell(spell.id, { name: e.target.value })}
                                                            className="w-full bg-transparent text-parchment font-bold text-sm border-none focus:text-gold outline-none flex-1 truncate transition-colors"
                                                            placeholder="Spell Name"
                                                        />
                                                        {spell.is2024 && (
                                                            <span className="text-[8px] bg-gold/20 text-gold-light px-1 py-0.5 rounded border border-gold/40 flex items-center gap-0.5 flex-shrink-0">
                                                                <Sparkles size={8} /> 2024
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Compact details row */}
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-stone-500 mt-1 pl-7">
                                                    <span className="flex items-center gap-1 lowercase text-[10px]">
                                                        <span onClick={() => updateSpell(spell.id, { components: { ...spell.components, v: !spell.components.v } })} className={`cursor-pointer ${spell.components.v ? 'text-parchment font-bold' : 'text-stone-700 hover:text-stone-400'}`}>v</span>
                                                        <span onClick={() => updateSpell(spell.id, { components: { ...spell.components, s: !spell.components.s } })} className={`cursor-pointer ${spell.components.s ? 'text-parchment font-bold' : 'text-stone-700 hover:text-stone-400'}`}>s</span>
                                                        <span onClick={() => updateSpell(spell.id, { components: { ...spell.components, m: !spell.components.m } })} className={`cursor-pointer ${spell.components.m ? 'text-parchment font-bold' : 'text-stone-700 hover:text-stone-400'}`}>m</span>
                                                    </span>
                                                    {spell.concentration && <span className="text-yellow-500 font-bold" title="Concentration">C</span>}
                                                    {spell.ritual && <span className="text-blue-400 font-bold" title="Ritual">R</span>}

                                                    <div className="flex gap-1 items-center flex-1">
                                                        <input type="text" value={spell.castingTime} onChange={e => updateSpell(spell.id, { castingTime: e.target.value })} className="bg-transparent border-none outline-none w-14 hover:text-stone-300 transition-colors" placeholder="1 Action" />
                                                        <span className="text-stone-700">•</span>
                                                        <input type="text" value={spell.range} onChange={e => updateSpell(spell.id, { range: e.target.value })} className="bg-transparent border-none outline-none w-14 text-center hover:text-stone-300 transition-colors" placeholder="60ft" />
                                                        <span className="text-stone-700">•</span>
                                                        <input type="text" value={spell.duration} onChange={e => updateSpell(spell.id, { duration: e.target.value })} className="bg-transparent border-none outline-none w-14 text-right hover:text-stone-300 transition-colors" placeholder="1 min" />
                                                    </div>
                                                </div>

                                                <textarea
                                                    value={spell.description}
                                                    onChange={e => updateSpell(spell.id, { description: e.target.value })}
                                                    className="w-full h-12 bg-transparent text-[11px] text-stone-400 leading-tight resize-none outline-none mt-1 pl-7 focus:text-stone-300 py-1"
                                                    placeholder="Spell effects..."
                                                    title="Description"
                                                />

                                                <button
                                                    onClick={() => removeSpell(spell.id)}
                                                    className="absolute top-2 right-1 p-1 text-stone-600 hover:text-blood opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <FiveEToolsModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                initialCategory="Spells"
                fixedCategory={true}
                classNameFilter={data.className}
                onImport={(item, cat) => {
                    if (cat === 'Spells') {
                        onChange('spells', [...data.spells, item as Spell]);
                    }
                }}
            />
        </div>
    );
}
