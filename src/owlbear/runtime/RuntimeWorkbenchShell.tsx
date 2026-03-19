import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import OBR, { type Item, type Player } from '@owlbear-rodeo/sdk';
import { Check, Copy, Crosshair, FileUp, Link2, PencilLine, RadioTower, Shield, Sparkles, Swords, Users, X } from 'lucide-react';
import { useCampaignStore } from '../../store/campaignStore';
import { useCharacterStore } from '../../store/characterStore';
import { useCombatStore } from '../../store/combatStore';
import type { Character } from '../../types/character';
import {
    importCurrentSelectionIntoCombat,
    linkCharacterToCurrentSelection,
    publishRoomStateFromStores,
    setPlayerAssignment,
} from '../bridge';
import { deriveSmokeVisionProfile, getEmbersSpellId, triggerEmbersSpellFromCharacter } from '../integrations';
import {
    getItemDisplayName,
    getItemPortraitUrl,
    getLinkedCharacterData,
    getRoomStateFromMetadata,
    type OwlbearRoomState,
} from '../shared';
import {
    CompactStat,
    FirstRunPanel,
    HeaderAction,
    QuickActionRail,
    RoomSnapshotCard,
    RuntimeLine,
    WorkspaceDrawer,
} from './RuntimePanels';
import { type EditorState, type SelectedTokenContext, type WorkspacePanel } from './runtimeTypes';

const CharacterForm = lazy(async () => {
    const mod = await import('../../components/character/CharacterForm');
    return { default: mod.CharacterForm };
});

const PdfImportModal = lazy(async () => {
    const mod = await import('../../components/character/PdfImportModal');
    return { default: mod.PdfImportModal };
});

function describeCharacter(character: Character | null | undefined): string {
    if (!character) {
        return 'No sheet selected';
    }

    const parts = [`Lv.${character.level}`];
    if (character.className) {
        parts.push(character.className);
    }
    if (character.race) {
        parts.push(character.race);
    }
    return parts.join(' - ');
}

function describeSelection(selectionCount: number, primarySelection: SelectedTokenContext | null): string {
    if (selectionCount === 0) {
        return 'No token selected';
    }

    if (selectionCount === 1 && primarySelection) {
        return primarySelection.linkedCharacter
            ? `${getItemDisplayName(primarySelection.item)} linked`
            : `${getItemDisplayName(primarySelection.item)} unlinked`;
    }

    return `${selectionCount} tokens selected`;
}

function formatSmokeProfileText(character: Character, range: number, greyscale: boolean, falloff: number, notes: string[]): string {
    const noteSuffix = notes.length ? ` | Notes: ${notes.join('; ')}` : '';
    return `${character.name || 'Unnamed'}: range ${range} ft | greyscale ${greyscale ? 'yes' : 'no'} | falloff ${falloff}${noteSuffix}`;
}

function SelectionCommandButton({
    icon: Icon,
    label,
    onClick,
    accent = false,
    disabled,
}: {
    icon: typeof Sparkles;
    label: string;
    onClick: () => void;
    accent?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                accent
                    ? 'border-gold/40 bg-gold text-stone-950 hover:bg-yellow-400'
                    : 'border-stone-700 bg-stone-950/90 text-stone-100 hover:border-sky-400/20 hover:text-sky-100'
            }`}
        >
            <Icon size={13} />
            {label}
        </button>
    );
}

function SelectionInspector({
    selection,
    selectedItems,
    characters,
    selectedCharacter,
    selectedCharacterId,
    playerRows,
    roomState,
    isBusy,
    onSelectCharacter,
    onLinkSelection,
    onOpenSheet,
    onOpenImport,
    onOpenCreate,
    onAssignPlayer,
    onOpenRoster,
    onOpenCombat,
    onImportCombat,
    onOpenSync,
    onCopySmokeProfile,
    onCastEmbersSpell,
}: {
    selection: SelectedTokenContext | null;
    selectedItems: Item[];
    characters: Character[];
    selectedCharacter: Character | null;
    selectedCharacterId: string;
    playerRows: Player[];
    roomState: OwlbearRoomState | null;
    isBusy: boolean;
    onSelectCharacter: (characterId: string) => void;
    onLinkSelection: () => void;
    onOpenSheet: (characterId: string) => void;
    onOpenImport: () => void;
    onOpenCreate: () => void;
    onAssignPlayer: (playerId: string, characterId: string | null) => void;
    onOpenRoster: () => void;
    onOpenCombat: () => void;
    onImportCombat: () => void;
    onOpenSync: () => void;
    onCopySmokeProfile: (character: Character) => void;
    onCastEmbersSpell: (character: Character, spellName: string) => void;
}) {
    const linkedCharacter = selection?.linkedCharacter?.snapshot ?? null;
    const linkedCharacterId = selection?.linkedCharacter?.characterId ?? null;
    const smokeProfile = linkedCharacter ? deriveSmokeVisionProfile(linkedCharacter) : null;
    const embersReadySpells = linkedCharacter
        ? linkedCharacter.spells.filter((spell) => Boolean(getEmbersSpellId(spell.name))).slice(0, 4)
        : [];
    const portraitUrl = selection ? getItemPortraitUrl(selection.item) || linkedCharacter?.portraitUrl : undefined;

    if (!selection) {
        return (
            <section className="overflow-hidden rounded-[1.35rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(28,25,23,0.94))] p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.95)]">
                <div className="flex items-center gap-2 text-emerald-300">
                    <Crosshair size={16} />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.26em]">Selection inspector</span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-parchment">Stay on the map</h2>
                <p className="mt-2 max-w-2xl text-sm text-stone-400">Select a token to link, assign, or import. Until then, use one of these entry points.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <button
                        type="button"
                        onClick={onOpenImport}
                        className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-4 text-left transition-colors hover:border-gold/50 hover:bg-gold/15"
                    >
                        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Import</div>
                        <div className="mt-2 text-base font-semibold text-parchment">Import a PDF sheet</div>
                        <div className="mt-2 text-sm text-stone-400">Start from a D&D Beyond or fillable PDF and save it to the roster.</div>
                    </button>
                    <button
                        type="button"
                        onClick={onOpenCreate}
                        className="rounded-xl border border-stone-800 bg-stone-900/70 px-4 py-4 text-left transition-colors hover:border-stone-700 hover:bg-stone-900"
                    >
                        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">Create</div>
                        <div className="mt-2 text-base font-semibold text-parchment">Create a new sheet</div>
                        <div className="mt-2 text-sm text-stone-400">Open the full editor only when you need to author or revise a character.</div>
                    </button>
                    <button
                        type="button"
                        onClick={onOpenRoster}
                        className="rounded-xl border border-stone-800 bg-stone-900/70 px-4 py-4 text-left transition-colors hover:border-stone-700 hover:bg-stone-900"
                    >
                        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Roster</div>
                        <div className="mt-2 text-base font-semibold text-parchment">Open saved characters</div>
                        <div className="mt-2 text-sm text-stone-400">Review your roster, edit imported sheets, and prepare characters before linking tokens.</div>
                    </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    <SelectionCommandButton icon={Swords} label="Open Combat" onClick={onOpenCombat} />
                    <SelectionCommandButton icon={Link2} label="Open Sync" onClick={onOpenSync} />
                </div>
            </section>
        );
    }

    return (
        <section className="overflow-hidden rounded-[1.35rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(28,25,23,0.94))] p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.95)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4">
                    <div className="relative h-20 w-20 overflow-hidden rounded-[1.4rem] border border-stone-800 bg-stone-900">
                        {portraitUrl ? (
                            <img src={portraitUrl} alt={getItemDisplayName(selection.item)} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%),linear-gradient(180deg,rgba(41,37,36,1),rgba(17,24,39,0.96))] text-2xl font-cinzel font-bold text-parchment">
                                {getItemDisplayName(selection.item).slice(0, 1).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-emerald-300">Selection inspector</span>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${linkedCharacter ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-400/30 bg-amber-500/10 text-amber-200'}`}>
                                {linkedCharacter ? 'Linked token' : 'Needs sheet link'}
                            </span>
                        </div>
                        <h2 className="mt-2 truncate text-2xl font-semibold tracking-tight text-parchment">{getItemDisplayName(selection.item)}</h2>
                        <p className="mt-2 max-w-2xl text-sm text-stone-400">
                            {linkedCharacter
                                ? `Linked to ${linkedCharacter.name || 'an unnamed character'}. Use the command strip below for sheet, sync, and combat actions.`
                                : 'Choose a saved sheet, then link it to this token.'}
                        </p>
                    </div>
                </div>
                <div className="grid min-w-[180px] gap-2 sm:grid-cols-3 lg:grid-cols-1">
                    <CompactStat label="Selection" value={selectedItems.length === 1 ? 'Single token' : `${selectedItems.length} tokens`} />
                    <CompactStat label="Link state" value={linkedCharacter ? 'Connected' : 'Waiting'} />
                    <CompactStat label="Owners" value={linkedCharacterId ? String(Object.values(roomState?.playerAssignments ?? {}).filter((value) => value === linkedCharacterId).length) : '0'} />
                </div>
            </div>
            {linkedCharacter ? (
                <>
                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                        <CompactStat label="Sheet" value={linkedCharacter.name || 'Unnamed'} />
                        <CompactStat label="HP" value={`${linkedCharacter.currentHp}/${linkedCharacter.maxHp}`} />
                        <CompactStat label="AC" value={String(linkedCharacter.ac)} />
                        <CompactStat label="Vision" value={`${smokeProfile?.range ?? 0} ft`} />
                    </div>
                    <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/60 p-3">
                        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">Token commands</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <SelectionCommandButton icon={Sparkles} label="Open Sheet" onClick={() => onOpenSheet(linkedCharacterId!)} accent />
                            <SelectionCommandButton icon={Swords} label="Import Combat" onClick={onImportCombat} />
                            <SelectionCommandButton icon={Link2} label="Sync" onClick={onOpenSync} />
                            <SelectionCommandButton icon={Copy} label="Copy Smoke" onClick={() => onCopySmokeProfile(linkedCharacter)} />
                            <SelectionCommandButton icon={Users} label="Roster" onClick={onOpenRoster} />
                        </div>
                    </div>
                    {playerRows.length > 0 && (
                        <div className="mt-5 rounded-xl border border-stone-800 bg-stone-950/55 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">Player assignments</div>
                                <div className="text-[11px] text-stone-500">{playerRows.length} player{playerRows.length === 1 ? '' : 's'}</div>
                            </div>
                            <div className="mt-3 space-y-2">
                            {playerRows.map((player) => (
                                <div key={player.id} className="grid gap-2 rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-2 md:grid-cols-[minmax(0,160px)_1fr] md:items-center">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: player.color }} />
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-stone-100">{player.name}</div>
                                            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">Player link</div>
                                        </div>
                                    </div>
                                    <select
                                        value={roomState?.playerAssignments[player.id] ?? ''}
                                        onChange={(event) => onAssignPlayer(player.id, event.target.value || null)}
                                        disabled={isBusy}
                                        className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition-colors focus:border-gold disabled:opacity-50"
                                    >
                                        <option value="">No assigned sheet</option>
                                        {characters.map((character) => (
                                            <option key={character.id} value={character.id}>
                                                {character.name || 'Unnamed'} - {describeCharacter(character)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                            </div>
                        </div>
                    )}
                    {smokeProfile && (
                        <div className="mt-5 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-sky-300">Smoke profile</div>
                                    <div className="mt-2 text-sm font-semibold text-stone-100">Stored with the token link for Smoke and Spectre!</div>
                                </div>
                                <div className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-100">
                                    Vision intent
                                </div>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                <RuntimeLine label="Range" value={`${smokeProfile.range} ft`} />
                                <RuntimeLine label="Greyscale" value={smokeProfile.greyscale ? 'Yes' : 'No'} />
                                <RuntimeLine label="Falloff" value={String(smokeProfile.falloff)} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <SelectionCommandButton icon={Shield} label="Copy Smoke Profile" onClick={() => onCopySmokeProfile(linkedCharacter)} />
                            </div>
                            {smokeProfile.notes.length > 0 && (
                                <div className="mt-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-3 text-sm text-stone-400">
                                    {smokeProfile.notes.join(' ')}
                                </div>
                            )}
                        </div>
                    )}
                    {embersReadySpells.length > 0 && (
                        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Embers handoff</div>
                                    <div className="mt-2 text-sm font-semibold text-stone-100">Mapped spells can be sent straight to Embers from the linked token flow.</div>
                                </div>
                                <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                                    {embersReadySpells.length} ready
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {embersReadySpells.map((spell) => (
                                    <SelectionCommandButton
                                        key={spell.id}
                                        icon={Sparkles}
                                        label={spell.name}
                                        onClick={() => onCastEmbersSpell(linkedCharacter, spell.name)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <select
                            value={selectedCharacterId}
                            onChange={(event) => onSelectCharacter(event.target.value)}
                            className="rounded-2xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                        >
                            <option value="">Choose a saved sheet</option>
                            {characters.map((character) => (
                                <option key={character.id} value={character.id}>
                                    {character.name || 'Unnamed'} - {describeCharacter(character)}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={onLinkSelection}
                            disabled={!selectedCharacterId || isBusy}
                            className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Link token to sheet
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <SelectionCommandButton icon={FileUp} label="Import Sheet" onClick={onOpenImport} />
                        <SelectionCommandButton icon={PencilLine} label="Create Sheet" onClick={onOpenCreate} />
                        <SelectionCommandButton icon={Users} label="Open Roster" onClick={onOpenRoster} />
                    </div>
                    {selectedCharacter ? (
                        <div className="mt-4 rounded-xl border border-stone-800 bg-stone-900/70 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-gold">Ready to link</div>
                                    <div className="mt-2 text-xl font-semibold tracking-tight text-parchment">{selectedCharacter.name || 'Unnamed'}</div>
                                    <div className="mt-1 text-sm text-stone-400">{describeCharacter(selectedCharacter)}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onOpenSheet(selectedCharacter.id)}
                                    className="rounded-xl border border-stone-700 bg-stone-950/90 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-stone-200 transition-colors hover:border-sky-400/20 hover:text-sky-100"
                                >
                                    Review Sheet
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={onOpenImport}
                                className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-4 text-left transition-colors hover:border-gold/50 hover:bg-gold/15"
                            >
                                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Fastest path</div>
                                <div className="mt-2 text-base font-semibold text-parchment">Import a sheet now</div>
                            </button>
                            <button
                                type="button"
                                onClick={onOpenCreate}
                                className="rounded-xl border border-stone-800 bg-stone-900/70 px-4 py-4 text-left transition-colors hover:border-stone-700 hover:bg-stone-900"
                            >
                                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">Manual authoring</div>
                                <div className="mt-2 text-base font-semibold text-parchment">Create a new sheet</div>
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

function EncounterStrip({
    roomState,
    onOpenCombat,
}: {
    roomState: OwlbearRoomState | null;
    onOpenCombat: () => void;
}) {
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const encounter = activeEncounter
        ? {
            title: activeEncounter.title,
            round: activeEncounter.round,
            combatants: activeEncounter.combatants,
            isActive: activeEncounter.isActive,
        }
        : roomState?.activeEncounter;

    return (
        <section className="rounded-[1.25rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(12,10,9,0.96),rgba(28,25,23,0.92))] p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-gold">Encounter strip</div>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-parchment">
                        {encounter ? encounter.title : 'No active encounter'}
                    </h2>
                </div>
                <HeaderAction icon={Swords} label="Combat" onClick={onOpenCombat} accent={Boolean(encounter)} />
            </div>
            {encounter ? (
                <>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <CompactStat label="Round" value={String(encounter.round)} />
                        <CompactStat label="Combatants" value={String(encounter.combatants.length)} />
                        <CompactStat label="Status" value={encounter.isActive ? 'Active' : 'Preparing'} />
                    </div>
                    <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/50 p-2">
                        <div className="mb-2 px-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">Visible order</div>
                        <div className="space-y-1.5">
                        {encounter.combatants.slice(0, 4).map((combatant) => (
                            <div key={combatant.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm">
                                <div className="min-w-0">
                                    <div className="truncate font-semibold text-stone-100">{combatant.name}</div>
                                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">{combatant.type}</div>
                                </div>
                                <span className="text-stone-400">
                                    HP {combatant.currentHp}/{combatant.maxHp}
                                </span>
                            </div>
                        ))}
                        </div>
                    </div>
                </>
            ) : (
                <p className="mt-4 text-sm leading-relaxed text-stone-400">
                    Pull selected Owlbear tokens into combat from here when initiative starts. The map, fog, and effect extensions stay inside Owlbear where they belong.
                </p>
            )}
        </section>
    );
}

function OverlayLoadingCard({ label }: { label: string }) {
    return (
        <div className="flex min-h-[320px] items-center justify-center rounded-[1.35rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(28,25,23,0.94))] px-6 py-10 text-center shadow-[0_24px_60px_-36px_rgba(15,23,42,0.95)]">
            <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-stone-500">Loading</div>
                <div className="mt-3 text-xl font-semibold tracking-tight text-parchment">{label}</div>
                <div className="mt-2 text-sm text-stone-400">Preparing the heavy editor surface only when it is actually needed.</div>
            </div>
        </div>
    );
}

function WorkflowStep({
    label,
    active,
    complete,
}: {
    label: string;
    active?: boolean;
    complete?: boolean;
}) {
    return (
        <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${active ? 'border-gold/30 bg-gold/10' : 'border-stone-800 bg-stone-950/60'}`}>
            <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${complete ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : active ? 'border-gold/30 bg-gold/15 text-gold' : 'border-stone-700 bg-stone-900 text-stone-500'}`}>
                {complete ? <Check size={12} /> : <span className="font-mono text-[10px] font-bold">{active ? '>' : '•'}</span>}
            </div>
            <div className={`font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${active ? 'text-parchment' : 'text-stone-500'}`}>{label}</div>
        </div>
    );
}

function SheetWorkflowOverlay({
    mode,
    selectionLabel,
    linkedSheetLabel,
    onClose,
    children,
}: {
    mode: 'import' | 'create' | 'edit' | 'complete';
    selectionLabel: string;
    linkedSheetLabel: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const title =
        mode === 'import'
            ? 'Sheet import flow'
            : mode === 'create'
                ? 'New sheet flow'
                : mode === 'edit'
                    ? 'Sheet review flow'
                    : 'Sheet saved';
    const subtitle =
        mode === 'import'
            ? 'Import first, then save and link the sheet back to the tabletop.'
            : mode === 'create'
                ? 'Author the sheet, save it, then return to token linking and player assignment.'
                : mode === 'edit'
                    ? 'Adjust the existing sheet, save changes, then return to sync or combat.'
                    : 'Use the completion actions below to finish linking the saved sheet into the current Owlbear session.';

    const activeStep = mode === 'import' ? 0 : mode === 'create' ? 1 : mode === 'edit' ? 1 : 3;
    const steps =
        mode === 'import'
            ? ['Import PDF', 'Review automation', 'Save sheet', 'Link token']
            : mode === 'create'
                ? ['Create shell', 'Author sheet', 'Save sheet', 'Link token']
                : mode === 'edit'
                    ? ['Open sheet', 'Edit details', 'Save changes', 'Return to map']
                    : ['Import or create', 'Review sheet', 'Save sheet', 'Complete sync'];

    return (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-stone-950/84 px-3 py-6 backdrop-blur-sm">
            <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="h-fit overflow-hidden rounded-[1.35rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(28,25,23,0.94))] p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.95)]">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">Sheet workflow</div>
                            <h2 className="mt-2 text-xl font-semibold tracking-tight text-parchment">{title}</h2>
                            <p className="mt-2 text-sm text-stone-400">{subtitle}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-stone-700 bg-stone-950/90 p-2 text-stone-400 transition-colors hover:border-stone-600 hover:text-stone-100"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="mt-4 space-y-2">
                        {steps.map((step, index) => (
                            <WorkflowStep key={step} label={step} active={index === activeStep} complete={index < activeStep} />
                        ))}
                    </div>
                    <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/60 p-3">
                        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">Table state</div>
                        <div className="mt-3 space-y-2">
                            <RuntimeLine label="Selection" value={selectionLabel} />
                            <RuntimeLine label="Linked sheet" value={linkedSheetLabel} />
                        </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-gold/20 bg-gold/10 p-3 text-sm text-stone-300">
                        Save closes this workflow and returns you to the runtime panel for linking, sync, and combat actions.
                    </div>
                </aside>
                <div className="min-w-0">{children}</div>
            </div>
        </div>
    );
}

function SheetWorkflowCompletionCard({
    character,
    playerRows,
    isBusy,
    selectionLabel,
    hasSelection,
    onLink,
    onImportCombat,
    onAssignPlayer,
    onOpenSync,
    onCopySmokeProfile,
    onCastEmbersSpell,
    onDone,
}: {
    character: Character;
    playerRows: Player[];
    isBusy: boolean;
    selectionLabel: string;
    hasSelection: boolean;
    onLink: () => void;
    onImportCombat: () => void;
    onAssignPlayer: (playerId: string) => void;
    onOpenSync: () => void;
    onCopySmokeProfile: () => void;
    onCastEmbersSpell: (spellName: string) => void;
    onDone: () => void;
}) {
    const smokeProfile = deriveSmokeVisionProfile(character);
    const embersReadySpells = character.spells.filter((spell) => Boolean(getEmbersSpellId(spell.name))).slice(0, 4);

    return (
        <div className="mx-auto max-w-4xl rounded-[1.35rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(28,25,23,0.94))] p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.95)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">Saved sheet</div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-parchment">{character.name || 'Unnamed'}</h2>
                    <p className="mt-2 text-sm text-stone-400">The sheet is now in your roster. Finish the tabletop handoff while the current token selection is still active.</p>
                </div>
                <div className="grid min-w-[180px] gap-2 sm:grid-cols-3 lg:grid-cols-1">
                    <CompactStat label="Selection" value={selectionLabel} />
                    <CompactStat label="Sheet" value={`Lv.${character.level}`} />
                    <CompactStat label="Players" value={String(playerRows.length)} />
                </div>
            </div>

            <div className="mt-5 rounded-xl border border-stone-800 bg-stone-950/60 p-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">Completion actions</div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <SelectionCommandButton icon={Link2} label="Link To Selection" onClick={onLink} accent disabled={!hasSelection || isBusy} />
                    <SelectionCommandButton icon={Swords} label="Import Combat" onClick={onImportCombat} disabled={!hasSelection || isBusy} />
                    <SelectionCommandButton icon={Users} label="Open Sync" onClick={onOpenSync} disabled={isBusy} />
                    <SelectionCommandButton icon={Check} label="Done" onClick={onDone} disabled={isBusy} />
                </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-sky-300">Smoke profile</div>
                            <div className="mt-2 text-sm font-semibold text-stone-100">Copy the vision setup derived from this saved sheet.</div>
                        </div>
                        <SelectionCommandButton icon={Copy} label="Copy" onClick={onCopySmokeProfile} disabled={isBusy} />
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <RuntimeLine label="Range" value={`${smokeProfile.range} ft`} />
                        <RuntimeLine label="Greyscale" value={smokeProfile.greyscale ? 'Yes' : 'No'} />
                        <RuntimeLine label="Falloff" value={String(smokeProfile.falloff)} />
                    </div>
                    {smokeProfile.notes.length > 0 && (
                        <div className="mt-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-3 text-sm text-stone-400">
                            {smokeProfile.notes.join(' ')}
                        </div>
                    )}
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Embers-ready spells</div>
                            <div className="mt-2 text-sm font-semibold text-stone-100">Use the current selection or linked token to hand mapped spells off to Embers immediately.</div>
                        </div>
                        <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                            {embersReadySpells.length} ready
                        </div>
                    </div>
                    {embersReadySpells.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {embersReadySpells.map((spell) => (
                                <SelectionCommandButton
                                    key={spell.id}
                                    icon={Sparkles}
                                    label={spell.name}
                                    onClick={() => onCastEmbersSpell(spell.name)}
                                    disabled={isBusy}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-3 text-sm text-stone-400">
                            No mapped Embers spells were found on this sheet yet.
                        </div>
                    )}
                </div>
            </div>

            {playerRows.length > 0 && (
                <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/55 p-3">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">Assign player now</div>
                    <div className="mt-3 space-y-2">
                        {playerRows.map((player) => (
                            <div key={player.id} className="grid gap-2 rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-2 md:grid-cols-[minmax(0,160px)_auto] md:items-center">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: player.color }} />
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold text-stone-100">{player.name}</div>
                                        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">Assign saved sheet</div>
                                    </div>
                                </div>
                                <SelectionCommandButton icon={Users} label="Assign" onClick={() => onAssignPlayer(player.id)} disabled={isBusy} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function RuntimeWorkbenchShell() {
    const characters = useCharacterStore((state) => state.characters);
    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
    const activeEncounter = useCombatStore((state) => state.activeEncounter);

    const [players, setPlayers] = useState<Player[]>([]);
    const [roomState, setRoomState] = useState<OwlbearRoomState | null>(null);
    const [selectedItems, setSelectedItems] = useState<Item[]>([]);
    const [selectedCharacterId, setSelectedCharacterId] = useState('');
    const [activePanel, setActivePanel] = useState<WorkspacePanel>('none');
    const [editorState, setEditorState] = useState<EditorState>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [workflowCompletionCharacterId, setWorkflowCompletionCharacterId] = useState<string | null>(null);

    const playerRows = useMemo(() => players.filter((player) => player.role === 'PLAYER'), [players]);
    const selectedTokenContexts = useMemo<SelectedTokenContext[]>(
        () => selectedItems.map((item) => ({ item, linkedCharacter: getLinkedCharacterData(item) })),
        [selectedItems],
    );
    const primarySelection = selectedTokenContexts[0] ?? null;
    const activeCampaign = useMemo(
        () => campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null,
        [campaigns, activeCampaignId],
    );
    const selectedRosterCharacter = useMemo(
        () => characters.find((character) => character.id === selectedCharacterId) ?? null,
        [characters, selectedCharacterId],
    );
    const workflowCompletionCharacter = useMemo(
        () => characters.find((character) => character.id === workflowCompletionCharacterId) ?? null,
        [characters, workflowCompletionCharacterId],
    );
    const workflowMode: 'import' | 'create' | 'edit' | 'complete' | null =
        workflowCompletionCharacterId
            ? 'complete'
            : isImporting
                ? 'import'
                : editorState
                    ? (editorState.characterId ? 'edit' : 'create')
                    : null;
    const workflowSelectionLabel = describeSelection(selectedItems.length, primarySelection);
    const workflowLinkedSheetLabel =
        primarySelection?.linkedCharacter?.snapshot?.name ||
        selectedRosterCharacter?.name ||
        'None';

    const refresh = useCallback(async () => {
        if (!OBR.isAvailable) {
            return;
        }

        const [partyPlayers, metadata, selectionIds] = await Promise.all([
            OBR.party.getPlayers(),
            OBR.room.getMetadata(),
            OBR.player.getSelection(),
        ]);

        const nextItems = selectionIds?.length ? await OBR.scene.items.getItems(selectionIds) : [];
        setPlayers(partyPlayers);
        setRoomState(getRoomStateFromMetadata(metadata));
        setSelectedItems(nextItems);
    }, []);

    useEffect(() => {
        if (!OBR.isAvailable) {
            return;
        }

        let cleanups: Array<() => void> = [];
        const setup = async () => {
            await refresh();
            cleanups = [
                OBR.party.onChange((partyPlayers) => setPlayers(partyPlayers)),
                OBR.room.onMetadataChange((metadata) => setRoomState(getRoomStateFromMetadata(metadata))),
                OBR.player.onChange(() => {
                    void refresh();
                }),
            ];
        };

        void setup();
        return () => {
            cleanups.forEach((cleanup) => cleanup());
        };
    }, [refresh]);

    useEffect(() => {
        if (primarySelection?.linkedCharacter?.characterId) {
            setSelectedCharacterId(primarySelection.linkedCharacter.characterId);
            return;
        }

        if (!selectedCharacterId && characters[0]) {
            setSelectedCharacterId(characters[0].id);
        }
    }, [characters, primarySelection?.linkedCharacter?.characterId, selectedCharacterId]);

    const handleOpenImport = () => {
        setWorkflowCompletionCharacterId(null);
        setIsImporting(true);
    };

    const handleOpenCreate = () => {
        setWorkflowCompletionCharacterId(null);
        setEditorState({});
    };

    const handleOpenSheet = (characterId: string) => {
        setWorkflowCompletionCharacterId(null);
        setEditorState({ characterId });
    };

    const handleOpenPanel = (panel: WorkspacePanel) => {
        setActivePanel(panel);
    };

    const handleLinkSelection = async () => {
        const character = characters.find((entry) => entry.id === selectedCharacterId);
        if (!character) {
            await OBR.notification.show('Choose a character sheet first.', 'WARNING');
            return;
        }

        setIsBusy(true);
        try {
            const linkedCount = await linkCharacterToCurrentSelection(character);
            if (linkedCount === 0) {
                await OBR.notification.show('Select one or more Owlbear tokens first.', 'WARNING');
                return;
            }

            await refresh();
            await OBR.notification.show(`Linked ${linkedCount} token${linkedCount === 1 ? '' : 's'} to ${character.name}.`, 'SUCCESS');
        } finally {
            setIsBusy(false);
        }
    };

    const handleImportSelection = async () => {
        setIsBusy(true);
        try {
            const count = await importCurrentSelectionIntoCombat('workbench');
            if (count === 0) {
                await OBR.notification.show('Select one or more Owlbear tokens first.', 'WARNING');
                return;
            }

            setActivePanel('combat');
            await refresh();
            await OBR.notification.show(`Imported ${count} token${count === 1 ? '' : 's'} into combat.`, 'SUCCESS');
        } finally {
            setIsBusy(false);
        }
    };

    const handlePublish = async () => {
        setIsBusy(true);
        try {
            const next = await publishRoomStateFromStores();
            setRoomState(next);
            await OBR.notification.show('Published DM Assistant room state to Owlbear.', 'SUCCESS');
        } finally {
            setIsBusy(false);
        }
    };

    const handleAssignPlayer = async (playerId: string, characterId: string | null) => {
        setIsBusy(true);
        try {
            const next = await setPlayerAssignment(playerId, characterId);
            setRoomState(next);
            await OBR.notification.show(characterId ? 'Updated player assignment.' : 'Cleared player assignment.', 'SUCCESS');
        } finally {
            setIsBusy(false);
        }
    };

    const handleLinkCharacterById = async (characterId: string) => {
        const character = characters.find((entry) => entry.id === characterId);
        if (!character) {
            await OBR.notification.show('That saved sheet could not be found.', 'WARNING');
            return;
        }

        setSelectedCharacterId(characterId);
        setIsBusy(true);
        try {
            const linkedCount = await linkCharacterToCurrentSelection(character);
            if (linkedCount === 0) {
                await OBR.notification.show('Select one or more Owlbear tokens first.', 'WARNING');
                return;
            }
            await refresh();
            await OBR.notification.show(`Linked ${linkedCount} token${linkedCount === 1 ? '' : 's'} to ${character.name}.`, 'SUCCESS');
        } finally {
            setIsBusy(false);
        }
    };

    const handleCopySmokeProfile = async (character: Character) => {
        const smokeProfile = deriveSmokeVisionProfile(character);
        await navigator.clipboard.writeText(
            formatSmokeProfileText(
                character,
                smokeProfile.range,
                smokeProfile.greyscale,
                smokeProfile.falloff,
                smokeProfile.notes,
            ),
        );
        await OBR.notification.show('Copied the Smoke vision profile.', 'SUCCESS');
    };

    const handleCastEmbersSpell = async (character: Character, spellName: string) => {
        setIsBusy(true);
        try {
            await triggerEmbersSpellFromCharacter(character, spellName);
        } finally {
            setIsBusy(false);
        }
    };

    const handleWorkflowDone = () => {
        setWorkflowCompletionCharacterId(null);
        setIsImporting(false);
        setEditorState(null);
    };

    if (!OBR.isAvailable) {
        return (
            <div className="min-h-screen bg-stone-950 p-6 text-stone-200">
                Owlbear Rodeo is not available in this view.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.08),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.08),_transparent_24%),linear-gradient(180deg,rgba(12,10,9,0.99),rgba(17,24,39,0.94))] p-4 text-stone-100 sm:p-5">
            <div className="mx-auto flex max-w-6xl flex-col gap-4">
                <section className="overflow-hidden rounded-[1.35rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(28,25,23,0.94))] p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.95)]">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-emerald-300">
                                <RadioTower size={16} />
                                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.28em]">DM Assistant for Owlbear</span>
                            </div>
                            <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <h1 className="text-2xl font-semibold tracking-tight text-parchment">Runtime command panel</h1>
                                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-400">
                                        Use the panel as a lightweight console beside the map. Token linking, sheet automation, rests, notes, and combat all stay close to Owlbear instead of taking over the tabletop.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <HeaderAction icon={FileUp} label="Import PDF" onClick={handleOpenImport} accent />
                            <HeaderAction icon={PencilLine} label="New Sheet" onClick={handleOpenCreate} />
                            <HeaderAction icon={Swords} label="Import Combat" onClick={handleImportSelection} disabled={isBusy} />
                            <HeaderAction icon={Sparkles} label="Publish Sync" onClick={handlePublish} disabled={isBusy} />
                        </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <CompactStat label="Campaign" value={activeCampaign?.title || 'No active campaign'} />
                        <CompactStat label="Selection" value={describeSelection(selectedItems.length, primarySelection)} />
                        <CompactStat label="Sheets" value={String(characters.length)} />
                        <CompactStat label="Encounter" value={activeEncounter?.title || roomState?.activeEncounter?.title || 'Idle'} />
                    </div>
                </section>

                {characters.length === 0 && (
                    <FirstRunPanel
                        onImport={handleOpenImport}
                        onCreate={handleOpenCreate}
                        onOpenCampaigns={() => setActivePanel('campaigns')}
                    />
                )}

                <SelectionInspector
                    selection={primarySelection}
                    selectedItems={selectedItems}
                    characters={characters}
                    selectedCharacter={selectedRosterCharacter}
                    selectedCharacterId={selectedCharacterId}
                    playerRows={playerRows}
                    roomState={roomState}
                    isBusy={isBusy}
                    onSelectCharacter={setSelectedCharacterId}
                    onLinkSelection={handleLinkSelection}
                    onOpenSheet={handleOpenSheet}
                    onOpenImport={handleOpenImport}
                    onOpenCreate={handleOpenCreate}
                    onAssignPlayer={(playerId, characterId) => {
                        void handleAssignPlayer(playerId, characterId);
                    }}
                    onOpenRoster={() => setActivePanel('roster')}
                    onOpenCombat={() => setActivePanel('combat')}
                    onImportCombat={() => {
                        void handleImportSelection();
                    }}
                    onOpenSync={() => setActivePanel('sync')}
                    onCopySmokeProfile={(character) => {
                        void handleCopySmokeProfile(character);
                    }}
                    onCastEmbersSpell={(character, spellName) => {
                        void handleCastEmbersSpell(character, spellName);
                    }}
                />

                <QuickActionRail activePanel={activePanel} onOpenPanel={handleOpenPanel} />

                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
                    <EncounterStrip roomState={roomState} onOpenCombat={() => setActivePanel('combat')} />
                    <RoomSnapshotCard
                        roomState={roomState}
                        playerRows={playerRows}
                        characters={characters}
                        onOpenSync={() => setActivePanel('sync')}
                        onOpenRoster={() => setActivePanel('roster')}
                    />
                </div>

                {activePanel !== 'none' && (
                    <WorkspaceDrawer
                        activePanel={activePanel}
                        onClose={() => setActivePanel('none')}
                        onImportPdf={handleOpenImport}
                        onCreateCharacter={handleOpenCreate}
                        onEditCharacter={handleOpenSheet}
                    />
                )}
            </div>

            {workflowMode && (
                <SheetWorkflowOverlay
                    mode={workflowMode}
                    selectionLabel={workflowSelectionLabel}
                    linkedSheetLabel={workflowLinkedSheetLabel}
                    onClose={() => {
                        handleWorkflowDone();
                    }}
                >
                    {workflowMode === 'complete' && workflowCompletionCharacter ? (
                        <SheetWorkflowCompletionCard
                            character={workflowCompletionCharacter}
                            playerRows={playerRows}
                            isBusy={isBusy}
                            selectionLabel={workflowSelectionLabel}
                            hasSelection={selectedItems.length > 0}
                            onLink={() => {
                                void handleLinkCharacterById(workflowCompletionCharacter.id);
                            }}
                            onImportCombat={() => {
                                void handleImportSelection();
                            }}
                            onAssignPlayer={(playerId) => {
                                void handleAssignPlayer(playerId, workflowCompletionCharacter.id);
                            }}
                            onOpenSync={() => setActivePanel('sync')}
                            onCopySmokeProfile={() => {
                                void handleCopySmokeProfile(workflowCompletionCharacter);
                            }}
                            onCastEmbersSpell={(spellName) => {
                                void handleCastEmbersSpell(workflowCompletionCharacter, spellName);
                            }}
                            onDone={handleWorkflowDone}
                        />
                    ) : editorState ? (
                        <Suspense fallback={<OverlayLoadingCard label="Character editor" />}>
                            <CharacterForm
                                characterId={editorState.characterId}
                                initialData={editorState.initialData}
                                onSaveComplete={(savedCharacterId) => {
                                    setSelectedCharacterId(savedCharacterId);
                                    setWorkflowCompletionCharacterId(savedCharacterId);
                                    void refresh();
                                }}
                                surface="owlbear"
                                entryMode={editorState.characterId ? 'edit' : editorState.initialData ? 'import' : 'create'}
                                onClose={() => {
                                    setEditorState(null);
                                    void refresh();
                                }}
                            />
                        </Suspense>
                    ) : (
                        <div className="mx-auto max-w-3xl">
                            <Suspense fallback={<OverlayLoadingCard label="PDF importer" />}>
                                <PdfImportModal
                                    embedded
                                    onClose={() => setIsImporting(false)}
                                    onImportSuccess={(data) => {
                                        setIsImporting(false);
                                        setEditorState({ initialData: data });
                                    }}
                                />
                            </Suspense>
                        </div>
                    )}
                </SheetWorkflowOverlay>
            )}
        </div>
    );
}
