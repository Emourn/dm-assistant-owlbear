import { useState } from 'react';
import { Character } from '../../../types/character';
import { Plus, Trash2, ToggleLeft, ToggleRight, Crown, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
    data: Character;
    onChange: (field: keyof Character, value: any) => void;
}

const OVERRIDABLE_FIELDS = [
    { field: 'ac', label: 'Armor Class (AC)', type: 'number' },
    { field: 'maxHp', label: 'Max HP', type: 'number' },
    { field: 'speed', label: 'Speed', type: 'text' },
    { field: 'proficiencyBonus', label: 'Proficiency Bonus', type: 'number' },
    { field: 'initiativeMod', label: 'Initiative Modifier', type: 'number' },
    { field: 'spellSaveDc', label: 'Spell Save DC', type: 'number' },
    { field: 'spellAttackMod', label: 'Spell Attack Modifier', type: 'number' },
    { field: 'senses', label: 'Senses', type: 'text' },
    { field: 'languages', label: 'Languages', type: 'text' },
    { field: 'proficiencies', label: 'Proficiencies', type: 'text' },
    { field: 'hitDice', label: 'Hit Dice', type: 'text' },
    { field: 'currentHp', label: 'Current HP', type: 'number' },
    { field: 'tempHp', label: 'Temp HP', type: 'number' },
];

export function DMOverridePanel({ data, onChange }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [newField, setNewField] = useState('');
    const [newValue, setNewValue] = useState('');
    const [newReason, setNewReason] = useState('');

    const overrides = data.customOverrides?.overrides || [];

    const updateOverrides = (newOverrides: typeof overrides) => {
        onChange('customOverrides', {
            ...data.customOverrides,
            overrides: newOverrides
        });
    };

    const addOverride = () => {
        if (!newField) return;
        const fieldInfo = OVERRIDABLE_FIELDS.find(f => f.field === newField);
        const override = {
            id: crypto.randomUUID(),
            field: newField,
            label: fieldInfo?.label || newField,
            value: fieldInfo?.type === 'number' ? parseInt(newValue) || 0 : newValue,
            isActive: true,
            reason: newReason || 'DM Override'
        };
        updateOverrides([...overrides, override]);
        setNewField('');
        setNewValue('');
        setNewReason('');
    };

    const toggleOverride = (id: string) => {
        updateOverrides(overrides.map(o => o.id === id ? { ...o, isActive: !o.isActive } : o));
    };

    const removeOverride = (id: string) => {
        updateOverrides(overrides.filter(o => o.id !== id));
    };

    const activeCount = overrides.filter(o => o.isActive).length;

    return (
        <div className="border border-gold/30 rounded-lg bg-stone-900/50 overflow-hidden">
            {/* Toggle Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 hover:bg-stone-800/50 transition-colors group"
            >
                <div className="flex items-center gap-2">
                    <Crown size={16} className="text-gold" />
                    <span className="font-cinzel font-bold text-gold text-sm">DM Overrides</span>
                    {activeCount > 0 && (
                        <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded-full border border-gold/30">
                            {activeCount} active
                        </span>
                    )}
                </div>
                {isOpen ? <ChevronUp size={14} className="text-stone-500" /> : <ChevronDown size={14} className="text-stone-500" />}
            </button>

            {isOpen && (
                <div className="border-t border-gold/20 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Existing Overrides */}
                    {overrides.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1 px-1">
                                <span className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">Active Modifiers</span>
                                <button
                                    onClick={() => updateOverrides([])}
                                    className="text-[10px] text-blood hover:text-red-400 font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
                                >
                                    <Trash2 size={10} /> Clear All
                                </button>
                            </div>
                            {overrides.map(override => (
                                <div
                                    key={override.id}
                                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all
                                        ${override.isActive
                                            ? 'bg-gold/5 border-gold/30'
                                            : 'bg-stone-900/50 border-stone-800 opacity-60'
                                        }`}
                                >
                                    <button
                                        onClick={() => toggleOverride(override.id)}
                                        className="flex-shrink-0 text-gold hover:text-gold/80 transition-colors"
                                        title={override.isActive ? 'Disable override' : 'Enable override'}
                                    >
                                        {override.isActive
                                            ? <ToggleRight size={20} />
                                            : <ToggleLeft size={20} className="text-stone-600" />
                                        }
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-medium text-parchment">{override.label}</span>
                                            <span className="text-gold font-bold">→</span>
                                            <span className="font-mono text-gold">{override.value}</span>
                                        </div>
                                        <div className="text-[10px] text-stone-500 truncate">{override.reason}</div>
                                    </div>

                                    <button
                                        onClick={() => removeOverride(override.id)}
                                        className="flex-shrink-0 text-stone-600 hover:text-red-400 transition-colors p-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add New Override */}
                    <div className="border border-stone-800 rounded-lg p-3 bg-stone-950/50 space-y-2">
                        <div className="text-[10px] text-gold font-bold uppercase tracking-wider flex items-center gap-1">
                            <Plus size={10} /> Add Override
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={newField}
                                onChange={e => setNewField(e.target.value)}
                                className="bg-stone-900 border border-stone-700 text-parchment rounded px-2 py-1.5 text-xs focus:border-gold outline-none"
                            >
                                <option value="">Select field...</option>
                                {OVERRIDABLE_FIELDS.map(f => (
                                    <option key={f.field} value={f.field}>{f.label}</option>
                                ))}
                            </select>
                            <input
                                type={OVERRIDABLE_FIELDS.find(f => f.field === newField)?.type === 'number' ? 'number' : 'text'}
                                value={newValue}
                                onChange={e => setNewValue(e.target.value)}
                                placeholder="New value"
                                className="bg-stone-900 border border-stone-700 text-parchment rounded px-2 py-1.5 text-xs focus:border-gold outline-none"
                            />
                        </div>
                        <input
                            type="text"
                            value={newReason}
                            onChange={e => setNewReason(e.target.value)}
                            placeholder="Reason (e.g., Magic item bonus, DM ruling...)"
                            className="w-full bg-stone-900 border border-stone-700 text-parchment rounded px-2 py-1.5 text-xs focus:border-gold outline-none"
                        />
                        <button
                            onClick={addOverride}
                            disabled={!newField || !newValue}
                            className="w-full py-1.5 bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Apply Override
                        </button>
                    </div>

                    <p className="text-[9px] text-stone-600 text-center">
                        Overrides bypass calculated values. Use responsibly, DM!
                    </p>
                </div>
            )}
        </div>
    );
}
