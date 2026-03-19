import type { Phase1CharacterSheet } from '../../features/dnd2024/domain/types';

interface ResourceRuntimePanelProps {
    sheet: Phase1CharacterSheet;
    canManage: boolean;
    isUpdating: boolean;
    onAdjustResource: (resourceId: string, delta: number) => Promise<void>;
    onAdjustDeathSave: (kind: 'successes' | 'failures', delta: number) => Promise<void>;
    onApplyRest: (kind: 'short' | 'long') => Promise<void>;
}

function CounterButton({
    label,
    onClick,
    disabled,
}: {
    label: string;
    onClick: () => void;
    disabled: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="rounded-full border border-stone-700 bg-stone-950 px-2.5 py-1 text-xs text-stone-300 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {label}
        </button>
    );
}

export function ResourceRuntimePanel({
    sheet,
    canManage,
    isUpdating,
    onAdjustResource,
    onAdjustDeathSave,
    onApplyRest,
}: ResourceRuntimePanelProps) {
    const runtimeResources = [...sheet.resources, ...(sheet.spellcasting?.slots ?? [])];

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">Runtime resources</div>
            <div className="mt-2 text-lg font-semibold text-parchment">Track counters during play</div>
            <div className="mt-1 text-sm text-stone-400">
                {canManage
                    ? 'These changes write back to the stored character record immediately.'
                    : 'This view is read-only for you in the current permission state.'}
            </div>

            <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2 rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                    <button
                        type="button"
                        onClick={() => void onApplyRest('short')}
                        disabled={!canManage || isUpdating}
                        className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Apply short rest recovery
                    </button>
                    <button
                        type="button"
                        onClick={() => void onApplyRest('long')}
                        disabled={!canManage || isUpdating}
                        className="rounded-full border border-sky-400/35 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:border-sky-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Apply long rest recovery
                    </button>
                    <div className="text-xs text-stone-500">
                        Recovers modeled `resource` counters and spell slots only. HP, temp HP, death saves, and hit dice stay manual in this slice.
                    </div>
                </div>
                {runtimeResources.map((resource) => (
                    <div
                        key={resource.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-900/60 p-4"
                    >
                        <div>
                            <div className="font-medium text-parchment">{resource.name}</div>
                            <div className="mt-1 text-sm text-stone-400">
                                {resource.detail ? `${resource.detail} - ` : ''}
                                {resource.kind} - resets on {resource.resetOn} rest
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <CounterButton
                                label="-"
                                onClick={() => void onAdjustResource(resource.id, -1)}
                                disabled={!canManage || isUpdating}
                            />
                            <div className="min-w-14 text-center text-sm font-semibold text-amber-300">
                                {resource.current}/{resource.max}
                            </div>
                            <CounterButton
                                label="+"
                                onClick={() => void onAdjustResource(resource.id, 1)}
                                disabled={!canManage || isUpdating}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-5 rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Death saves</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-2xl border border-stone-800 bg-stone-950/70 px-4 py-3">
                        <div>
                            <div className="font-medium text-parchment">Successes</div>
                            <div className="text-sm text-stone-400">{sheet.deathSaves.successes}/3</div>
                        </div>
                        <div className="flex gap-2">
                            <CounterButton
                                label="-"
                                onClick={() => void onAdjustDeathSave('successes', -1)}
                                disabled={!canManage || isUpdating}
                            />
                            <CounterButton
                                label="+"
                                onClick={() => void onAdjustDeathSave('successes', 1)}
                                disabled={!canManage || isUpdating}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-stone-800 bg-stone-950/70 px-4 py-3">
                        <div>
                            <div className="font-medium text-parchment">Failures</div>
                            <div className="text-sm text-stone-400">{sheet.deathSaves.failures}/3</div>
                        </div>
                        <div className="flex gap-2">
                            <CounterButton
                                label="-"
                                onClick={() => void onAdjustDeathSave('failures', -1)}
                                disabled={!canManage || isUpdating}
                            />
                            <CounterButton
                                label="+"
                                onClick={() => void onAdjustDeathSave('failures', 1)}
                                disabled={!canManage || isUpdating}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
