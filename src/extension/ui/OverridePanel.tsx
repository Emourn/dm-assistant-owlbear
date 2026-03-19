import { useEffect, useState } from 'react';
import type { Phase1CharacterSheet } from '../../features/dnd2024/domain/types';

interface OverridePanelProps {
    sheet: Phase1CharacterSheet;
    canEdit: boolean;
    isSaving: boolean;
    onSave: (next: { proficiencyBonusOverride: number | null; initiativeAdjustment: number }) => Promise<void>;
}

export function OverridePanel({
    sheet,
    canEdit,
    isSaving,
    onSave,
}: OverridePanelProps) {
    const [proficiencyOverride, setProficiencyOverride] = useState(sheet.proficiencyBonusOverride?.toString() ?? '');
    const [initiativeAdjustment, setInitiativeAdjustment] = useState(sheet.rollAdjustments.initiative.toString());

    useEffect(() => {
        setProficiencyOverride(sheet.proficiencyBonusOverride?.toString() ?? '');
        setInitiativeAdjustment(sheet.rollAdjustments.initiative.toString());
    }, [sheet]);

    if (!canEdit) {
        return null;
    }

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-300">Manual overrides</div>
            <div className="mt-2 text-lg font-semibold text-parchment">Compact runtime corrections</div>
            <div className="mt-1 text-sm text-stone-400">
                Use this when the automation is incomplete and you need a transparent override without rewriting the full sheet.
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">Proficiency override</div>
                    <input
                        type="number"
                        value={proficiencyOverride}
                        onChange={(event) => setProficiencyOverride(event.target.value)}
                        placeholder="blank = auto"
                        className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-400/50"
                    />
                </label>
                <label className="block">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">Initiative adjustment</div>
                    <input
                        type="number"
                        value={initiativeAdjustment}
                        onChange={(event) => setInitiativeAdjustment(event.target.value)}
                        className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-400/50"
                    />
                </label>
            </div>

            <div className="mt-4 flex gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setProficiencyOverride('');
                        setInitiativeAdjustment('0');
                    }}
                    className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-300 transition hover:border-stone-500"
                >
                    Reset fields
                </button>
                <button
                    type="button"
                    onClick={() =>
                        void onSave({
                            proficiencyBonusOverride: proficiencyOverride.trim() === '' ? null : Number.parseInt(proficiencyOverride, 10),
                            initiativeAdjustment: Number.parseInt(initiativeAdjustment || '0', 10) || 0,
                        })
                    }
                    disabled={isSaving}
                    className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSaving ? 'Saving...' : 'Save overrides'}
                </button>
            </div>
        </section>
    );
}
