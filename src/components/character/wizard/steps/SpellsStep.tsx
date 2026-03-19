import { useState } from 'react';
import { Character, Spell } from '../../../../types/character';
import { Sparkles, Book, Trash2, Plus, Zap } from 'lucide-react';
import { RulesSearchModal } from '../../../common/RulesSearchModal';

interface Props {
    draft: Character;
    onUpdate: (updates: Partial<Character>) => void;
}

export function SpellsStep({ draft, onUpdate }: Props) {
    const [isSearching, setIsSearching] = useState(false);

    const handleAddSpell = (spell: any) => {
        const newSpell: Spell = {
            id: crypto.randomUUID(),
            name: spell.name,
            level: spell.level || 0,
            school: spell.school || '',
            castingTime: spell.time?.[0]?.number + ' ' + spell.time?.[0]?.unit || '1 action',
            range: spell.range?.distance?.amount + ' ' + spell.range?.distance?.type || '60 ft',
            components: {
                v: !!spell.components?.v,
                s: !!spell.components?.s,
                m: !!spell.components?.m,
                mDesc: typeof spell.components?.m === 'string' ? spell.components.m : undefined
            },
            duration: spell.duration?.[0]?.type || 'Instantaneous',
            description: Array.isArray(spell.entries) ? spell.entries.join('\n') : '',
            prepared: true,
            concentration: !!spell.concentration,
            ritual: !!spell.ritual
        };

        onUpdate({
            spells: [...draft.spells, newSpell]
        });
        setIsSearching(false);
    };

    const handleRemoveSpell = (id: string) => {
        onUpdate({
            spells: draft.spells.filter(s => s.id !== id)
        });
    };

    const cantrips = draft.spells.filter(s => s.level === 0);
    const leveledSpells = draft.spells.filter(s => s.level > 0);

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-stone-900/30 border border-stone-800 p-6 rounded-xl flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-xl font-cinzel font-bold text-parchment uppercase tracking-wide">Spell Selection</h3>
                    <p className="text-sm text-stone-400">Choose your cantrips and starting spells.</p>
                </div>
                <button
                    onClick={() => setIsSearching(true)}
                    className="bg-blood text-white px-6 py-2 rounded-lg font-cinzel font-bold tracking-widest hover:bg-red-800 transition-all flex items-center gap-2"
                >
                    <Plus size={18} />
                    ADD SPELL
                </button>
            </div>

            <div className="space-y-8">
                {/* Cantrips Section */}
                <div className="space-y-3">
                    <h4 className="text-[10px] text-stone-500 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={12} className="text-gold" />
                        Cantrips (Level 0)
                    </h4>
                    {cantrips.length === 0 ? (
                        <p className="text-xs text-stone-700 italic px-4">No cantrips selected</p>
                    ) : (
                        cantrips.map(spell => (
                            <SpellRow key={spell.id} spell={spell} onRemove={handleRemoveSpell} />
                        ))
                    )}
                </div>

                {/* Level 1 Spells Section */}
                <div className="space-y-3">
                    <h4 className="text-[10px] text-stone-500 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Book size={12} className="text-blood" />
                        Level 1 Spells
                    </h4>
                    {leveledSpells.length === 0 ? (
                        <p className="text-xs text-stone-700 italic px-4">No leveled spells selected</p>
                    ) : (
                        leveledSpells.map(spell => (
                            <SpellRow key={spell.id} spell={spell} onRemove={handleRemoveSpell} />
                        ))
                    )}
                </div>

                {draft.spells.length === 0 && (
                    <div className="py-12 border-2 border-dashed border-stone-800 rounded-xl flex flex-col items-center justify-center text-stone-600">
                        <Zap size={48} className="mb-4 opacity-10" />
                        <p className="font-bold uppercase tracking-widest text-xs">Spellbook is empty</p>
                    </div>
                )}
            </div>

            <RulesSearchModal
                isOpen={isSearching}
                onClose={() => setIsSearching(false)}
                title="Spellbook"
                category="spells"
                onSelect={handleAddSpell}
            />
        </div>
    );
}

function SpellRow({ spell, onRemove }: { spell: Spell, onRemove: (id: string) => void }) {
    return (
        <div className="bg-stone-900/50 border border-stone-800 rounded-lg p-4 flex items-center justify-between group hover:border-stone-700 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded border flex items-center justify-center text-[10px] font-bold ${spell.level === 0 ? 'border-gold/30 text-gold' : 'border-blood/30 text-blood'}`}>
                    {spell.level === 0 ? 'C' : spell.level}
                </div>
                <div>
                    <div className="text-sm font-bold text-parchment">{spell.name}</div>
                    <div className="text-[10px] text-stone-500 uppercase font-bold tracking-tighter">
                        {spell.school} • {spell.castingTime}
                    </div>
                </div>
            </div>

            <button
                onClick={() => onRemove(spell.id)}
                className="text-stone-700 hover:text-red-500 transition-colors"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
}
