import { BookOpenText, HeartPulse, Shield, Sparkles, Swords, WandSparkles } from 'lucide-react';
import {
    createCharacterSheetViewModel,
    formatSignedNumber,
    getAbilityModifier,
} from '../../features/dnd2024/domain/sheet';
import type {
    Phase1CharacterSheet,
    RollableSheetRow,
    StructuredRollRequest,
    StructuredRollResult,
} from '../../features/dnd2024/domain/types';
import type { CharacterRepositorySnapshot } from '../owlbear/characterRepository';
import { CharacterEditorPanel } from './CharacterEditorPanel';

interface CharacterSheetPanelProps {
    characterState: CharacterRepositorySnapshot | null;
    canEdit: boolean;
    isSaving: boolean;
    lastRoll: StructuredRollResult | null;
    onRoll: (request: StructuredRollRequest) => void;
    onSelectCharacter: (characterId: string) => void;
    onSave: (sheet: Phase1CharacterSheet) => Promise<void>;
}

function SummaryCard({
    label,
    value,
    detail,
    icon: Icon,
}: {
    label: string;
    value: string;
    detail?: string;
    icon: typeof Shield;
}) {
    return (
        <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">{label}</div>
                    <div className="mt-2 text-xl font-semibold text-parchment">{value}</div>
                    {detail && <div className="mt-1 text-xs text-stone-500">{detail}</div>}
                </div>
                <Icon size={18} className="text-amber-300" />
            </div>
        </div>
    );
}

function RollButton({
    row,
    onRoll,
}: {
    row: RollableSheetRow;
    onRoll: (request: StructuredRollRequest) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onRoll(row.request)}
            className="flex w-full items-center justify-between rounded-2xl border border-stone-800 bg-stone-950/60 px-3 py-3 text-left transition hover:border-amber-400/40 hover:bg-stone-900/80"
        >
            <div>
                <div className="text-sm font-medium text-parchment">{row.label}</div>
                {row.subtitle && <div className="text-xs text-stone-500">{row.subtitle}</div>}
            </div>
            <div className="text-sm font-semibold text-amber-300">{formatSignedNumber(row.total)}</div>
        </button>
    );
}

function sourceLabel(source: CharacterRepositorySnapshot['source']): string {
    if (source === 'demo-seed') {
        return 'Demo seed';
    }
    if (source === 'room-metadata') {
        return 'Room metadata';
    }
    return 'No sheet';
}

export function CharacterSheetPanel({
    characterState,
    canEdit,
    isSaving,
    lastRoll,
    onRoll,
    onSelectCharacter,
    onSave,
}: CharacterSheetPanelProps) {
    const active = characterState?.activeCharacter;
    if (!active) {
        return (
            <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
                <div className="flex items-center gap-2 text-sky-300">
                    <BookOpenText size={16} />
                    <span className="text-[11px] font-black uppercase tracking-[0.26em]">Character foundation</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-parchment">No shared character yet</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">
                    The GM will see a seeded demo sheet the first time they open this slice. Players see room metadata only, so the extension stays read-safe by default.
                </p>
            </section>
        );
    }

    const sheet = active.sheet;
    const model = createCharacterSheetViewModel(sheet);

    return (
        <div className="flex flex-col gap-4">
            <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-sky-300">
                            <BookOpenText size={16} />
                            <span className="text-[11px] font-black uppercase tracking-[0.26em]">Character foundation</span>
                        </div>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-parchment">{sheet.name}</h2>
                        <p className="mt-1 text-sm text-stone-400">
                            {sheet.classSummary} - Level {sheet.level} - {sheet.ancestry}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                            {sourceLabel(characterState.source)}
                        </span>
                        {characterState.collection.characters.map((record) => (
                            <button
                                key={record.sheet.id}
                                type="button"
                                onClick={() => onSelectCharacter(record.sheet.id)}
                                className={`rounded-full border px-3 py-1 text-xs transition ${
                                    record.sheet.id === sheet.id
                                        ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                                        : 'border-stone-700 bg-stone-950 text-stone-400 hover:border-stone-500 hover:text-stone-200'
                                }`}
                            >
                                {record.sheet.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <SummaryCard
                        label="Armor Class"
                        value={String(sheet.armorClass.value)}
                        detail={sheet.armorClass.source}
                        icon={Shield}
                    />
                    <SummaryCard
                        label="Hit Points"
                        value={`${sheet.hitPoints.current}/${sheet.hitPoints.max}`}
                        detail={sheet.hitPoints.temp > 0 ? `${sheet.hitPoints.temp} temp HP` : 'No temp HP'}
                        icon={HeartPulse}
                    />
                    <SummaryCard
                        label="Proficiency"
                        value={formatSignedNumber(model.proficiencyBonus)}
                        detail="2024 proficiency bonus"
                        icon={Sparkles}
                    />
                    <SummaryCard
                        label="Initiative"
                        value={formatSignedNumber(model.initiative.total)}
                        detail="Click below to roll"
                        icon={WandSparkles}
                    />
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="space-y-4">
                        <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Abilities</div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {model.abilities.map((ability) => (
                                    <button
                                        key={ability.id}
                                        type="button"
                                        onClick={() => onRoll(ability.request)}
                                        className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4 text-left transition hover:border-amber-400/40 hover:bg-stone-900/80"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">{ability.label}</div>
                                                <div className="mt-2 text-lg font-semibold text-parchment">{ability.score}</div>
                                            </div>
                                            <div className="text-sm font-semibold text-amber-300">{formatSignedNumber(ability.modifier)}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Saving Throws</div>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                {model.saves.map((row) => (
                                    <RollButton key={row.id} row={row} onRoll={onRoll} />
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Skills</div>
                            <div className="mt-3 grid max-h-[22rem] gap-3 overflow-auto pr-1 md:grid-cols-2">
                                {model.skills.map((row) => (
                                    <RollButton key={row.id} row={row} onRoll={onRoll} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Roll Preview</div>
                                    <div className="mt-2 text-lg font-semibold text-parchment">
                                        {lastRoll ? lastRoll.label : 'Click a stat to roll'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRoll(model.initiative.request)}
                                    className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300/60"
                                >
                                    Roll initiative
                                </button>
                            </div>

                            {lastRoll ? (
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-baseline justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.22em] text-stone-500">{lastRoll.formula}</div>
                                            <div className="mt-2 text-3xl font-bold text-parchment">{lastRoll.total}</div>
                                        </div>
                                        <div className="text-right text-sm text-stone-400">
                                            <div>Kept d20: {lastRoll.kept}</div>
                                            <div>{lastRoll.scope}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {lastRoll.breakdown.map((part) => (
                                            <div key={part.label} className="flex items-center justify-between text-sm text-stone-300">
                                                <span>{part.label}</span>
                                                <span className="text-amber-300">{formatSignedNumber(part.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-400">
                                        {lastRoll.audit.map((note) => (
                                            <div key={note}>{note}</div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-3 text-sm text-stone-400">
                                    This slice focuses on correct derived stats, auditable formulas, and fast sheet interactions inside Owlbear.
                                </p>
                            )}
                        </div>

                        <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                            <div className="flex items-center gap-2 text-amber-300">
                                <Swords size={16} />
                                <span className="text-[11px] font-black uppercase tracking-[0.22em]">Actions</span>
                            </div>
                            <div className="mt-3 space-y-3">
                                {sheet.actions.map((action) => (
                                    <div key={action.id} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="font-medium text-parchment">{action.name}</div>
                                            <div className="text-xs uppercase tracking-[0.2em] text-stone-500">{action.kind}</div>
                                        </div>
                                        {(action.source || action.description) && (
                                            <div className="mt-2 text-sm text-stone-400">
                                                {[action.source, action.description].filter(Boolean).join(' - ')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Resources</div>
                            <div className="mt-3 space-y-2">
                                {sheet.resources.map((resource) => (
                                    <div key={resource.id} className="flex items-center justify-between rounded-2xl border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm">
                                        <div>
                                            <div className="text-parchment">{resource.name}</div>
                                            <div className="text-xs text-stone-500">
                                                {resource.detail ? `${resource.detail} - ` : ''}
                                                Resets on {resource.resetOn} rest
                                            </div>
                                        </div>
                                        <div className="font-semibold text-amber-300">{resource.current}/{resource.max}</div>
                                    </div>
                                ))}
                                {sheet.spellcasting && (
                                    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-3 text-sm text-stone-300">
                                        <div className="font-medium text-parchment">Spellcasting</div>
                                        <div className="mt-1">Attack bonus {formatSignedNumber(sheet.spellcasting.attackBonus)}</div>
                                        <div>Save DC {sheet.spellcasting.saveDc}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Audit Notes</div>
                            <div className="mt-3 space-y-2 text-sm text-stone-400">
                                <div>AC: {sheet.armorClass.audit[0] ?? sheet.armorClass.source}</div>
                                <div>Dexterity modifier: {formatSignedNumber(getAbilityModifier(sheet.abilities.dex))}</div>
                                {sheet.notes.map((note) => (
                                    <div key={note}>{note}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <CharacterEditorPanel
                sheet={sheet}
                canEdit={canEdit}
                isSaving={isSaving}
                onSave={onSave}
            />
        </div>
    );
}
