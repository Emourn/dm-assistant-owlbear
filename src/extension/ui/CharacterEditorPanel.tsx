import { useEffect, useState } from 'react';
import type { Phase1CharacterSheet } from '../../features/dnd2024/domain/types';

interface CharacterEditorPanelProps {
    sheet: Phase1CharacterSheet;
    canEdit: boolean;
    isSaving: boolean;
    onSave: (sheet: Phase1CharacterSheet) => Promise<void>;
}

interface EditorState {
    name: string;
    playerName: string;
    ancestry: string;
    classSummary: string;
    level: string;
    ac: string;
    hpCurrent: string;
    hpMax: string;
    hpTemp: string;
    notes: string;
    abilities: Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', string>;
}

function clampNumber(value: string, fallback: number, min: number, max: number): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
}

function createEditorState(sheet: Phase1CharacterSheet): EditorState {
    return {
        name: sheet.name,
        playerName: sheet.playerName,
        ancestry: sheet.ancestry,
        classSummary: sheet.classSummary,
        level: String(sheet.level),
        ac: String(sheet.armorClass.value),
        hpCurrent: String(sheet.hitPoints.current),
        hpMax: String(sheet.hitPoints.max),
        hpTemp: String(sheet.hitPoints.temp),
        notes: sheet.notes.join('\n'),
        abilities: {
            str: String(sheet.abilities.str),
            dex: String(sheet.abilities.dex),
            con: String(sheet.abilities.con),
            int: String(sheet.abilities.int),
            wis: String(sheet.abilities.wis),
            cha: String(sheet.abilities.cha),
        },
    };
}

function Field({
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

export function CharacterEditorPanel({
    sheet,
    canEdit,
    isSaving,
    onSave,
}: CharacterEditorPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState<EditorState>(() => createEditorState(sheet));

    useEffect(() => {
        setForm(createEditorState(sheet));
    }, [sheet]);

    if (!canEdit) {
        return null;
    }

    const reset = () => {
        setForm(createEditorState(sheet));
        setIsOpen(false);
    };

    const handleSave = async () => {
        const nextSheet: Phase1CharacterSheet = {
            ...sheet,
            name: form.name.trim() || sheet.name,
            playerName: form.playerName.trim(),
            ancestry: form.ancestry.trim() || sheet.ancestry,
            classSummary: form.classSummary.trim() || sheet.classSummary,
            level: clampNumber(form.level, sheet.level, 1, 20),
            abilities: {
                str: clampNumber(form.abilities.str, sheet.abilities.str, 1, 30),
                dex: clampNumber(form.abilities.dex, sheet.abilities.dex, 1, 30),
                con: clampNumber(form.abilities.con, sheet.abilities.con, 1, 30),
                int: clampNumber(form.abilities.int, sheet.abilities.int, 1, 30),
                wis: clampNumber(form.abilities.wis, sheet.abilities.wis, 1, 30),
                cha: clampNumber(form.abilities.cha, sheet.abilities.cha, 1, 30),
            },
            armorClass: {
                ...sheet.armorClass,
                value: clampNumber(form.ac, sheet.armorClass.value, 1, 40),
                source: 'Manual entry',
                audit: ['Edited from the Phase 1 sheet editor.'],
            },
            hitPoints: {
                current: clampNumber(form.hpCurrent, sheet.hitPoints.current, 0, 999),
                max: clampNumber(form.hpMax, sheet.hitPoints.max, 1, 999),
                temp: clampNumber(form.hpTemp, sheet.hitPoints.temp, 0, 999),
            },
            notes: form.notes
                .split('\n')
                .map((note) => note.trim())
                .filter(Boolean),
        };

        await onSave(nextSheet);
        setIsOpen(false);
    };

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">GM editor</div>
                    <div className="mt-2 text-lg font-semibold text-parchment">Core sheet editing</div>
                    <div className="mt-1 text-sm text-stone-400">
                        Update the stored metadata record and let the derived sheet recompute from it.
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
                        className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? 'Saving...' : isOpen ? 'Save changes' : 'Edit sheet'}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <div className="space-y-3">
                        <Field label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
                        <Field label="Player" value={form.playerName} onChange={(value) => setForm((current) => ({ ...current, playerName: value }))} />
                        <Field label="Ancestry" value={form.ancestry} onChange={(value) => setForm((current) => ({ ...current, ancestry: value }))} />
                        <Field label="Class Summary" value={form.classSummary} onChange={(value) => setForm((current) => ({ ...current, classSummary: value }))} />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Level" type="number" value={form.level} onChange={(value) => setForm((current) => ({ ...current, level: value }))} />
                            <Field label="Armor Class" type="number" value={form.ac} onChange={(value) => setForm((current) => ({ ...current, ac: value }))} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Field label="HP Current" type="number" value={form.hpCurrent} onChange={(value) => setForm((current) => ({ ...current, hpCurrent: value }))} />
                            <Field label="HP Max" type="number" value={form.hpMax} onChange={(value) => setForm((current) => ({ ...current, hpMax: value }))} />
                            <Field label="Temp HP" type="number" value={form.hpTemp} onChange={(value) => setForm((current) => ({ ...current, hpTemp: value }))} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">Ability scores</div>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {(
                                    Object.entries(form.abilities) as Array<
                                        [keyof EditorState['abilities'], string]
                                    >
                                ).map(([ability, value]) => (
                                    <Field
                                        key={ability}
                                        label={ability.toUpperCase()}
                                        type="number"
                                        value={value}
                                        onChange={(nextValue) =>
                                            setForm((current) => ({
                                                ...current,
                                                abilities: {
                                                    ...current.abilities,
                                                    [ability]: nextValue,
                                                },
                                            }))
                                        }
                                    />
                                ))}
                            </div>
                        </div>

                        <label className="block">
                            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">Notes</div>
                            <textarea
                                value={form.notes}
                                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                                rows={6}
                                className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-400/50"
                            />
                        </label>
                    </div>
                </div>
            )}
        </section>
    );
}
