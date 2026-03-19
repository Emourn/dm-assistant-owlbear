import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Footprints, Heart, Shield, Sparkles, Star } from 'lucide-react';
import type { Character } from '../../types/character';
import { adaptLegacyCharacterToPhase1Sheet } from '../../features/dnd2024/adapters/fromLegacyCharacter';
import { rollStructuredD20 } from '../../features/dnd2024/domain/rolls';
import {
    createCharacterSheetViewModel,
    formatSignedNumber,
} from '../../features/dnd2024/domain/sheet';
import type { StructuredRollRequest, StructuredRollResult } from '../../features/dnd2024/domain/types';

interface PlayerCharacterSheetProps {
    character: Character | null;
    canEdit: boolean;
}

export function PlayerCharacterSheet({ character, canEdit }: PlayerCharacterSheetProps) {
    const sheet = useMemo(
        () => (character ? adaptLegacyCharacterToPhase1Sheet(character) : null),
        [character],
    );
    const viewModel = useMemo(
        () => (sheet ? createCharacterSheetViewModel(sheet) : null),
        [sheet],
    );
    const [lastRoll, setLastRoll] = useState<StructuredRollResult | null>(null);

    useEffect(() => {
        setLastRoll(null);
    }, [character?.id]);

    if (!character) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 p-6">
                <AlertTriangle className="w-10 h-10 mb-3 text-stone-600" />
                <p className="text-sm text-center">
                    No character assigned yet.
                    <br />
                    <span className="text-stone-600">Wait for the DM to assign your character.</span>
                </p>
            </div>
        );
    }

    if (!sheet || !viewModel) {
        return null;
    }

    const hpPercent = sheet.hitPoints.max > 0 ? (sheet.hitPoints.current / sheet.hitPoints.max) * 100 : 0;
    const hpColor = hpPercent > 60 ? 'bg-emerald-500' : hpPercent > 30 ? 'bg-amber-500' : 'bg-red-500';
    const usedSpellSlots = sheet.spellcasting
        ? sheet.spellcasting.slots.reduce((sum, slot) => sum + (slot.max - slot.current), 0)
        : 0;

    const handleRoll = (request: StructuredRollRequest) => {
        setLastRoll(rollStructuredD20(request));
    };

    return (
        <div className="h-full overflow-y-auto p-4 space-y-4">
            <div className="text-center">
                {character.portraitUrl && (
                    <img
                        src={character.portraitUrl}
                        alt={character.name}
                        className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-amber-500/50 object-cover"
                    />
                )}
                <h2 className="text-xl font-bold text-stone-100">{character.name}</h2>
                <p className="text-stone-400 text-sm">
                    Level {character.level} {character.race} {character.className}
                    {character.subclass ? ` (${character.subclass})` : ''}
                </p>
                {!canEdit && (
                    <p className="text-stone-600 text-[10px] mt-1 uppercase tracking-wider">
                        View Only
                    </p>
                )}
            </div>

            <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-400" />
                        <span className="text-stone-300 text-sm font-medium">Hit Points</span>
                    </div>
                    <span className="text-stone-200 font-mono text-sm">
                        {sheet.hitPoints.current}/{sheet.hitPoints.max}
                        {sheet.hitPoints.temp > 0 && (
                            <span className="text-blue-400 ml-1">(+{sheet.hitPoints.temp})</span>
                        )}
                    </span>
                </div>
                <div className="h-3 bg-stone-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${hpColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, hpPercent)}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
                <div className="bg-stone-800/50 rounded-lg p-3 text-center border border-stone-700/30">
                    <Shield className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-stone-100">{sheet.armorClass.value}</div>
                    <div className="text-[10px] text-stone-500 uppercase">AC</div>
                </div>
                <div className="bg-stone-800/50 rounded-lg p-3 text-center border border-stone-700/30">
                    <Footprints className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <div className="text-sm font-bold text-stone-100">{sheet.movement[0]?.label ?? character.speed}</div>
                    <div className="text-[10px] text-stone-500 uppercase">Speed</div>
                </div>
                <div className="bg-stone-800/50 rounded-lg p-3 text-center border border-stone-700/30">
                    <Sparkles className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <button
                        type="button"
                        onClick={() => handleRoll(viewModel.initiative.request)}
                        className="text-lg font-bold text-stone-100 transition-colors hover:text-gold"
                    >
                        {formatSignedNumber(viewModel.initiative.total)}
                    </button>
                    <div className="text-[10px] text-stone-500 uppercase">Initiative</div>
                </div>
                <div className="bg-stone-800/50 rounded-lg p-3 text-center border border-stone-700/30">
                    <Star className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-stone-100">{formatSignedNumber(viewModel.proficiencyBonus)}</div>
                    <div className="text-[10px] text-stone-500 uppercase">Prof</div>
                </div>
            </div>

            <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider">
                        Rollable Abilities
                    </h3>
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider">Click to roll</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {viewModel.abilities.map((ability) => (
                        <button
                            key={ability.id}
                            type="button"
                            onClick={() => handleRoll(ability.request)}
                            className="text-center bg-stone-900/50 rounded-lg py-2 transition-colors hover:bg-stone-900 hover:border-gold/30 border border-transparent"
                        >
                            <div className="text-[10px] text-stone-500 uppercase">{ability.label}</div>
                            <div className="text-lg font-bold text-stone-200">{ability.score}</div>
                            <div className="text-xs text-amber-400 font-mono">{formatSignedNumber(ability.modifier)}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                    <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">
                        Saving Throws
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {viewModel.saves.map((save) => (
                            <button
                                key={save.id}
                                type="button"
                                onClick={() => handleRoll(save.request)}
                                className="flex items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-900/50 px-3 py-2 text-left transition-colors hover:border-gold/30 hover:bg-stone-900"
                            >
                                <span>
                                    <span className="block text-sm text-stone-200">{save.label}</span>
                                    {save.subtitle && <span className="block text-[10px] uppercase tracking-wider text-gold">{save.subtitle}</span>}
                                </span>
                                <span className="font-mono text-sm text-stone-100">{formatSignedNumber(save.total)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                    <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">
                        Last Roll
                    </h3>
                    {lastRoll ? (
                        <div className="space-y-3">
                            <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-stone-100">{lastRoll.label}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-stone-500">{lastRoll.scope}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-parchment">{lastRoll.total}</div>
                                        <div className="text-[10px] text-stone-500">{lastRoll.formula}</div>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-xs text-stone-400">
                                    <span className="rounded-full border border-stone-700 bg-stone-950 px-2 py-1 font-mono">
                                        d20 {lastRoll.kept}
                                    </span>
                                    {lastRoll.dropped !== null && (
                                        <span className="rounded-full border border-stone-800 bg-stone-950/80 px-2 py-1 font-mono line-through">
                                            {lastRoll.dropped}
                                        </span>
                                    )}
                                    {lastRoll.metadata.critical && <span className="text-gold uppercase tracking-wider">Critical</span>}
                                    {lastRoll.metadata.fumble && <span className="text-red-400 uppercase tracking-wider">Fumble</span>}
                                </div>
                            </div>
                            <div className="rounded-lg border border-stone-800 bg-stone-950/70 p-3">
                                <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Breakdown</div>
                                <div className="space-y-1.5">
                                    {lastRoll.breakdown.map((part) => (
                                        <div key={part.label} className="flex items-center justify-between text-xs">
                                            <span className="text-stone-400">{part.label}</span>
                                            <span className="font-mono text-stone-100">{formatSignedNumber(part.value)}</span>
                                        </div>
                                    ))}
                                </div>
                                {lastRoll.audit.length > 0 && (
                                    <div className="mt-3 border-t border-stone-800 pt-3 space-y-1">
                                        {lastRoll.audit.map((entry) => (
                                            <div key={entry} className="text-[11px] leading-relaxed text-stone-500">{entry}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-stone-700 bg-stone-950/50 p-4 text-sm text-stone-500">
                            Roll an ability, save, skill, or initiative to see the full formula breakdown here.
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">
                    Skills
                </h3>
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                    {viewModel.skills.map((skill) => (
                        <button
                            key={skill.id}
                            type="button"
                            onClick={() => handleRoll(skill.request)}
                            className="w-full flex items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-900/45 px-3 py-2 text-left transition-colors hover:border-gold/30 hover:bg-stone-900"
                        >
                            <span>
                                <span className="block text-sm text-stone-200">{skill.label}</span>
                                {skill.subtitle && <span className="block text-[10px] uppercase tracking-wider text-gold">{skill.subtitle}</span>}
                            </span>
                            <span className="font-mono text-sm text-stone-100">{formatSignedNumber(skill.total)}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">
                    Vitality, Resources, and Senses
                </h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
                    <div className="space-y-3">
                        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-stone-300">Death Saves</span>
                                <span className="font-mono text-stone-100">
                                    {sheet.deathSaves.successes} / {sheet.deathSaves.failures}
                                </span>
                            </div>
                        </div>
                        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                            <div className="text-sm text-stone-300">Armor Class Audit</div>
                            <div className="mt-2 text-xs text-stone-500 space-y-1">
                                <div>{sheet.armorClass.source}</div>
                                {sheet.armorClass.audit.map((entry) => (
                                    <div key={entry}>{entry}</div>
                                ))}
                            </div>
                        </div>
                        {sheet.senses.length > 0 && (
                            <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                                <div className="text-sm text-stone-300">Senses</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {sheet.senses.map((sense) => (
                                        <span key={sense.label} className="rounded-full bg-stone-950 px-2 py-1 text-xs text-stone-300">
                                            {sense.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {sheet.spellcasting && (
                            <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm text-stone-300">Spellcasting</div>
                                    <div className="text-xs text-stone-500">
                                        {sheet.spellcasting.ability.toUpperCase()} | Attack {formatSignedNumber(sheet.spellcasting.attackBonus)} | DC {sheet.spellcasting.saveDc}
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-4 gap-2">
                                    {sheet.spellcasting.slots.map((slot) => (
                                        <div key={slot.id} className="rounded-lg bg-stone-950 px-2 py-2 text-center">
                                            <div className="text-[10px] uppercase tracking-wider text-stone-500">L{slot.level}</div>
                                            <div className="text-sm font-mono text-purple-300">{slot.current}/{slot.max}</div>
                                        </div>
                                    ))}
                                </div>
                                {usedSpellSlots > 0 && (
                                    <div className="mt-2 text-[11px] text-stone-500">{usedSpellSlots} spell slot uses recorded.</div>
                                )}
                            </div>
                        )}
                        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                            <div className="text-sm text-stone-300">Tracked Resources</div>
                            <div className="mt-3 space-y-2">
                                {sheet.resources.length === 0 && (
                                    <div className="text-sm text-stone-500">No extra resources tracked.</div>
                                )}
                                {sheet.resources.map((resource) => (
                                    <div key={resource.id} className="flex items-center justify-between text-sm">
                                        <span className="text-stone-300">
                                            {resource.name}
                                            {resource.detail ? ` (${resource.detail})` : ''}
                                        </span>
                                        <span className="font-mono text-stone-100">{resource.current}/{resource.max}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {sheet.actions.length > 0 && (
                <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                    <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">
                        Actions
                    </h3>
                    <div className="space-y-2">
                        {sheet.actions.map((action) => (
                            <div key={action.id} className="rounded-lg border border-stone-800 bg-stone-900/50 px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-medium text-stone-100">{action.name}</span>
                                    <span className="text-[10px] uppercase tracking-wider text-stone-500">{action.kind}</span>
                                </div>
                                {action.source && <div className="mt-1 text-[11px] text-gold">{action.source}</div>}
                                {action.description && <div className="mt-1 text-xs text-stone-400">{action.description}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {character.conditions && character.conditions.length > 0 && (
                <div className="bg-red-900/20 rounded-xl p-3 border border-red-700/30">
                    <h3 className="text-red-400 text-xs font-medium uppercase tracking-wider mb-2">
                        Active Conditions
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                        {character.conditions.map((cond: any, idx: number) => (
                            <span
                                key={idx}
                                className="bg-red-800/30 text-red-300 text-xs px-2 py-1 rounded-full"
                            >
                                {typeof cond === 'string' ? cond : cond.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {sheet.notes.length > 0 && (
                <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                    <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-2">Notes</div>
                    <div className="space-y-2 text-sm text-stone-400">
                        {sheet.notes.map((note) => (
                            <p key={note}>{note}</p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
