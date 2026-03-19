import { useEffect, useState } from 'react';
import { Plus, Trash2, WandSparkles } from 'lucide-react';
import { ABILITY_DEFINITIONS } from '../../features/dnd2024/domain/constants';
import type {
    AbilityId,
    Phase1CharacterSheet,
    Phase1ResourceCounter,
} from '../../features/dnd2024/domain/types';
import {
    updateSheetActions,
    updateSheetSpellcasting,
    type EditableActionInput,
    type EditableSpellSlotInput,
} from '../domain/sheetAuthoring';

interface ActionSpellEditorPanelProps {
    sheet: Phase1CharacterSheet;
    canEdit: boolean;
    isSaving: boolean;
    onSave: (sheet: Phase1CharacterSheet) => Promise<void>;
}

interface ActionSpellEditorState {
    actions: EditableActionInput[];
    spellcastingEnabled: boolean;
    spellAbility: AbilityId;
    spellAttackBonus: string;
    spellSaveDc: string;
    slots: Array<EditableSpellSlotInput & { resetOn: Phase1ResourceCounter['resetOn'] }>;
}

function clampNumber(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function createState(sheet: Phase1CharacterSheet): ActionSpellEditorState {
    return {
        actions: sheet.actions.map((action) => ({
            id: action.id,
            name: action.name,
            kind: action.kind,
            source: action.source ?? '',
            description: action.description ?? '',
        })),
        spellcastingEnabled: Boolean(sheet.spellcasting),
        spellAbility: sheet.spellcasting?.ability ?? 'wis',
        spellAttackBonus: String(sheet.spellcasting?.attackBonus ?? 0),
        spellSaveDc: String(sheet.spellcasting?.saveDc ?? 8),
        slots: (sheet.spellcasting?.slots ?? []).map((slot) => ({
            id: slot.id,
            name: slot.name,
            current: slot.current,
            max: slot.max,
            resetOn: slot.resetOn,
            level: slot.level,
            detail: slot.detail ?? '',
        })),
    };
}

function TextField({
    label,
    value,
    onChange,
    type = 'text',
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'number';
}) {
    return (
        <label className="block">
            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">{label}</div>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-400/50"
            />
        </label>
    );
}

export function ActionSpellEditorPanel({
    sheet,
    canEdit,
    isSaving,
    onSave,
}: ActionSpellEditorPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState<ActionSpellEditorState>(() => createState(sheet));

    useEffect(() => {
        setForm(createState(sheet));
    }, [sheet]);

    if (!canEdit) {
        return null;
    }

    const reset = () => {
        setForm(createState(sheet));
        setIsOpen(false);
    };

    const handleSave = async () => {
        const withActions = updateSheetActions(sheet, form.actions);
        const nextSheet = updateSheetSpellcasting(
            withActions,
            form.spellcastingEnabled
                ? {
                    ability: form.spellAbility,
                    attackBonus: clampNumber(form.spellAttackBonus, sheet.spellcasting?.attackBonus ?? 0),
                    saveDc: clampNumber(form.spellSaveDc, sheet.spellcasting?.saveDc ?? 8),
                    slots: form.slots.map((slot) => ({
                        id: slot.id,
                        name: slot.name,
                        current: slot.current,
                        max: slot.max,
                        resetOn: slot.resetOn,
                        level: slot.level,
                        detail: slot.detail,
                    })),
                }
                : null,
        );

        await onSave(nextSheet);
        setIsOpen(false);
    };

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-indigo-300">
                        <WandSparkles size={16} />
                        <span className="text-[11px] font-black uppercase tracking-[0.22em]">GM authoring</span>
                    </div>
                    <div className="mt-2 text-lg font-semibold text-parchment">Actions and spellcasting</div>
                    <div className="mt-1 text-sm text-stone-400">
                        Author the runtime-facing action list and spell block without leaving Owlbear.
                    </div>
                </div>
                <div className="flex gap-2">
                    {isOpen && (
                        <button
                            type="button"
                            onClick={reset}
                            className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-300 transition hover:border-stone-500"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            if (isOpen) {
                                void handleSave();
                                return;
                            }
                            setIsOpen(true);
                        }}
                        disabled={isSaving}
                        className="rounded-full border border-indigo-400/35 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition hover:border-indigo-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? 'Saving...' : isOpen ? 'Save actions and spells' : 'Edit actions and spells'}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="mt-5 space-y-5">
                    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">Actions</div>
                                <div className="mt-1 text-sm text-stone-400">Keep the list compact and runtime-focused.</div>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setForm((current) => ({
                                        ...current,
                                        actions: [
                                            ...current.actions,
                                            {
                                                id: '',
                                                name: '',
                                                kind: 'action',
                                                source: '',
                                                description: '',
                                            },
                                        ],
                                    }))
                                }
                                className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300/60"
                            >
                                <Plus size={14} />
                                Add action
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            {form.actions.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-stone-700 p-4 text-sm text-stone-500">
                                    No actions authored yet.
                                </div>
                            )}
                            {form.actions.map((action, index) => (
                                <div key={action.id || `action-${index}`} className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-xs uppercase tracking-[0.22em] text-stone-500">Action {index + 1}</div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setForm((current) => ({
                                                    ...current,
                                                    actions: current.actions.filter((_, actionIndex) => actionIndex !== index),
                                                }))
                                            }
                                            className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-200 transition hover:border-red-400/45"
                                        >
                                            <Trash2 size={12} />
                                            Remove
                                        </button>
                                    </div>
                                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                        <TextField
                                            label="Name"
                                            value={action.name}
                                            onChange={(value) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    actions: current.actions.map((entry, actionIndex) =>
                                                        actionIndex === index ? { ...entry, name: value } : entry),
                                                }))
                                            }
                                        />
                                        <TextField
                                            label="Kind"
                                            value={action.kind}
                                            onChange={(value) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    actions: current.actions.map((entry, actionIndex) =>
                                                        actionIndex === index ? { ...entry, kind: value } : entry),
                                                }))
                                            }
                                        />
                                        <TextField
                                            label="Source"
                                            value={action.source ?? ''}
                                            onChange={(value) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    actions: current.actions.map((entry, actionIndex) =>
                                                        actionIndex === index ? { ...entry, source: value } : entry),
                                                }))
                                            }
                                        />
                                        <label className="block lg:col-span-2">
                                            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">Description</div>
                                            <textarea
                                                value={action.description ?? ''}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        actions: current.actions.map((entry, actionIndex) =>
                                                            actionIndex === index ? { ...entry, description: event.target.value } : entry),
                                                    }))
                                                }
                                                rows={3}
                                                className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-400/50"
                                            />
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">Spellcasting</div>
                                <div className="mt-1 text-sm text-stone-400">Keep manual control where rules automation is still staged for later slices.</div>
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm text-stone-300">
                                <input
                                    type="checkbox"
                                    checked={form.spellcastingEnabled}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            spellcastingEnabled: event.target.checked,
                                        }))
                                    }
                                    className="h-4 w-4 rounded border-stone-600 bg-stone-950 text-amber-400"
                                />
                                Spellcasting enabled
                            </label>
                        </div>

                        {form.spellcastingEnabled ? (
                            <div className="mt-4 space-y-4">
                                <div className="grid gap-3 lg:grid-cols-3">
                                    <label className="block">
                                        <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">Ability</div>
                                        <select
                                            value={form.spellAbility}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    spellAbility: event.target.value as AbilityId,
                                                }))
                                            }
                                            className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-400/50"
                                        >
                                            {ABILITY_DEFINITIONS.map((ability) => (
                                                <option key={ability.id} value={ability.id}>
                                                    {ability.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <TextField
                                        label="Attack Bonus"
                                        type="number"
                                        value={form.spellAttackBonus}
                                        onChange={(value) => setForm((current) => ({ ...current, spellAttackBonus: value }))}
                                    />
                                    <TextField
                                        label="Save DC"
                                        type="number"
                                        value={form.spellSaveDc}
                                        onChange={(value) => setForm((current) => ({ ...current, spellSaveDc: value }))}
                                    />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">Spell slots</div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setForm((current) => ({
                                                ...current,
                                                slots: [
                                                    ...current.slots,
                                                    {
                                                        id: '',
                                                        name: '',
                                                        current: 0,
                                                        max: 1,
                                                        resetOn: 'long',
                                                        level: 1,
                                                        detail: '',
                                                    },
                                                ],
                                            }))
                                        }
                                        className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300/60"
                                    >
                                        <Plus size={14} />
                                        Add slot row
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {form.slots.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-stone-700 p-4 text-sm text-stone-500">
                                            No spell slot rows yet. Add only the slot levels this character uses.
                                        </div>
                                    )}
                                    {form.slots.map((slot, index) => (
                                        <div key={slot.id || `slot-${index}`} className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-xs uppercase tracking-[0.22em] text-stone-500">Slot row {index + 1}</div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setForm((current) => ({
                                                            ...current,
                                                            slots: current.slots.filter((_, slotIndex) => slotIndex !== index),
                                                        }))
                                                    }
                                                    className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-200 transition hover:border-red-400/45"
                                                >
                                                    <Trash2 size={12} />
                                                    Remove
                                                </button>
                                            </div>
                                            <div className="mt-3 grid gap-3 lg:grid-cols-3">
                                                <TextField
                                                    label="Name"
                                                    value={slot.name}
                                                    onChange={(value) =>
                                                        setForm((current) => ({
                                                            ...current,
                                                            slots: current.slots.map((entry, slotIndex) =>
                                                                slotIndex === index ? { ...entry, name: value } : entry),
                                                        }))
                                                    }
                                                />
                                                <TextField
                                                    label="Current"
                                                    type="number"
                                                    value={String(slot.current)}
                                                    onChange={(value) =>
                                                        setForm((current) => ({
                                                            ...current,
                                                            slots: current.slots.map((entry, slotIndex) =>
                                                                slotIndex === index ? { ...entry, current: clampNumber(value, entry.current) } : entry),
                                                        }))
                                                    }
                                                />
                                                <TextField
                                                    label="Max"
                                                    type="number"
                                                    value={String(slot.max)}
                                                    onChange={(value) =>
                                                        setForm((current) => ({
                                                            ...current,
                                                            slots: current.slots.map((entry, slotIndex) =>
                                                                slotIndex === index ? { ...entry, max: clampNumber(value, entry.max) } : entry),
                                                        }))
                                                    }
                                                />
                                                <TextField
                                                    label="Level"
                                                    type="number"
                                                    value={String(slot.level ?? 1)}
                                                    onChange={(value) =>
                                                        setForm((current) => ({
                                                            ...current,
                                                            slots: current.slots.map((entry, slotIndex) =>
                                                                slotIndex === index ? { ...entry, level: clampNumber(value, entry.level ?? 1) } : entry),
                                                        }))
                                                    }
                                                />
                                                <label className="block">
                                                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">Reset</div>
                                                    <select
                                                        value={slot.resetOn}
                                                        onChange={(event) =>
                                                            setForm((current) => ({
                                                                ...current,
                                                                slots: current.slots.map((entry, slotIndex) =>
                                                                    slotIndex === index
                                                                        ? { ...entry, resetOn: event.target.value as Phase1ResourceCounter['resetOn'] }
                                                                        : entry),
                                                            }))
                                                        }
                                                        className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-400/50"
                                                    >
                                                        <option value="short">Short rest</option>
                                                        <option value="long">Long rest</option>
                                                        <option value="never">Never</option>
                                                    </select>
                                                </label>
                                                <TextField
                                                    label="Detail"
                                                    value={slot.detail ?? ''}
                                                    onChange={(value) =>
                                                        setForm((current) => ({
                                                            ...current,
                                                            slots: current.slots.map((entry, slotIndex) =>
                                                                slotIndex === index ? { ...entry, detail: value } : entry),
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-2xl border border-dashed border-stone-700 p-4 text-sm text-stone-500">
                                Spellcasting is disabled for this sheet. Enable it when the character should expose spell save DC, spell attack bonus, and slot rows.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
