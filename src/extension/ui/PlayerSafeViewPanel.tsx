import type { Player } from '@owlbear-rodeo/sdk';
import { Eye, ShieldCheck, Users } from 'lucide-react';
import {
    buildCurrentViewerAccessSummary,
    buildPlayerAccessPreview,
    buildSelectedLinkVisibilityPreview,
} from '../domain/playerSafeView';
import type { CharacterRepositorySnapshot } from '../owlbear/characterRepository';

interface PlayerSafeViewPanelProps {
    role: 'GM' | 'PLAYER' | null;
    players: Player[];
    characterState: CharacterRepositorySnapshot | null;
}

function toneClasses(tone: 'sky' | 'amber' | 'rose'): string {
    if (tone === 'sky') {
        return 'border-sky-400/25 bg-sky-500/10 text-sky-100';
    }

    if (tone === 'amber') {
        return 'border-amber-400/25 bg-amber-500/10 text-amber-100';
    }

    return 'border-rose-400/25 bg-rose-500/10 text-rose-100';
}

function sourceLabel(source: CharacterRepositorySnapshot['resolution']['source']): string {
    if (source === 'selected-token') {
        return 'selected token';
    }
    if (source === 'assigned-character') {
        return 'assignment';
    }
    if (source === 'active-character') {
        return 'active room sheet';
    }
    return 'no sheet';
}

export function PlayerSafeViewPanel({
    role,
    players,
    characterState,
}: PlayerSafeViewPanelProps) {
    if (!characterState) {
        return null;
    }

    const characters = characterState.collection.characters.map((record) => ({
        id: record.sheet.id,
        name: record.sheet.name,
    }));
    const assignedCharacterName = characterState.assignedCharacterId
        ? characters.find((character) => character.id === characterState.assignedCharacterId)?.name ?? null
        : null;
    const currentViewer = buildCurrentViewerAccessSummary({
        role,
        resolution: characterState.resolution,
        activeCharacterName: characterState.activeCharacter?.sheet.name ?? null,
        assignedCharacterName,
        selectedLinks: characterState.selection.links,
    });
    const roomPlayers = players.map((player) => ({
        id: player.id,
        name: player.name || 'Unknown Player',
        role: player.role,
    }));
    const previewRows = role === 'GM'
        ? buildPlayerAccessPreview(
            roomPlayers,
            characters,
            characterState.playerAssignments.assignments,
            characterState.selection.links,
        )
        : [];
    const selectionRows = role === 'GM'
        ? buildSelectedLinkVisibilityPreview(
            roomPlayers,
            characterState.playerAssignments.assignments,
            characterState.selection.links,
        )
        : [];

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="flex items-center gap-2 text-sky-300">
                <Eye size={16} />
                <span className="text-[11px] font-black uppercase tracking-[0.26em]">Player-safe access</span>
            </div>

            <div className={`mt-4 rounded-2xl border p-4 ${toneClasses(currentViewer.tone)}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-lg font-semibold">{currentViewer.title}</div>
                    <div className="rounded-full border border-current/25 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]">
                        {sourceLabel(characterState.resolution.source)}
                    </div>
                </div>
                <div className="mt-2 text-sm opacity-90">{currentViewer.detail}</div>
                <div className="mt-3 space-y-1 text-xs opacity-80">
                    {currentViewer.notes.map((note) => (
                        <div key={note}>{note}</div>
                    ))}
                </div>
            </div>

            {role === 'GM' && (
                <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                        <div className="flex items-center gap-2 text-amber-300">
                            <Users size={16} />
                            <span className="text-[10px] font-black uppercase tracking-[0.22em]">Player preview</span>
                        </div>
                        <div className="mt-3 space-y-3">
                            {previewRows.length > 0 ? previewRows.map((row) => (
                                <div key={row.playerId} className="rounded-2xl border border-stone-800 bg-stone-950/70 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-medium text-parchment">{row.playerName}</div>
                                        <div className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-300">
                                            {sourceLabel(row.source)}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-sm text-stone-300">
                                        {row.visibleCharacterName ?? 'No visible sheet'}
                                    </div>
                                    <div className="mt-1 text-xs text-stone-500">
                                        Assigned: {row.assignedCharacterName ?? 'none'}
                                    </div>
                                    <div className="mt-2 text-xs text-stone-400">{row.detail}</div>
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-3 text-sm text-stone-400">
                                    No non-GM players are in the room.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                        <div className="flex items-center gap-2 text-emerald-300">
                            <ShieldCheck size={16} />
                            <span className="text-[10px] font-black uppercase tracking-[0.22em]">Selected token visibility</span>
                        </div>
                        <div className="mt-3 space-y-3">
                            {selectionRows.length > 0 ? selectionRows.map((row) => (
                                <div key={row.characterId} className="rounded-2xl border border-stone-800 bg-stone-950/70 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-medium text-parchment">{row.characterName}</div>
                                        <div className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-300">
                                            {row.visibility}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-sm text-stone-300">{row.audienceLabel}</div>
                                    <div className="mt-1 text-xs text-stone-500">
                                        {row.tokenCount} linked selected token{row.tokenCount === 1 ? '' : 's'}
                                    </div>
                                    {row.audienceNames.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {row.audienceNames.map((name) => (
                                                <span
                                                    key={`${row.characterId}:${name}`}
                                                    className="rounded-full border border-stone-700 bg-stone-950 px-2.5 py-1 text-[11px] text-stone-300"
                                                >
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-3 text-sm text-stone-400">
                                    Select linked tokens to preview exactly who can see them.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
