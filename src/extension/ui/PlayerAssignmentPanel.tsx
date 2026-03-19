import type { Player } from '@owlbear-rodeo/sdk';
import type { Phase1CharacterSheet } from '../../features/dnd2024/domain/types';
import type { CharacterRepositorySnapshot } from '../owlbear/characterRepository';

interface PlayerAssignmentPanelProps {
    role: 'GM' | 'PLAYER' | null;
    players: Player[];
    sheet: Phase1CharacterSheet;
    characterState: CharacterRepositorySnapshot;
    assigningPlayerId: string | null;
    onAssign: (playerId: string, characterId: string | null) => Promise<void>;
}

export function PlayerAssignmentPanel({
    role,
    players,
    sheet,
    characterState,
    assigningPlayerId,
    onAssign,
}: PlayerAssignmentPanelProps) {
    if (role !== 'GM') {
        return null;
    }

    const roomPlayers = players.filter((player) => player.role === 'PLAYER');

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-300">Player assignment</div>
            <div className="mt-2 text-lg font-semibold text-parchment">Assign the active sheet to room players</div>
            <div className="mt-1 text-sm text-stone-400">
                Assigned players resolve this character by default even when no public linked token is selected.
            </div>

            {roomPlayers.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-sm text-stone-400">
                    No non-GM players are currently in the room.
                </div>
            ) : (
                <div className="mt-4 space-y-3">
                    {roomPlayers.map((player) => {
                        const assignedCharacterId = characterState.playerAssignments.assignments[player.id] ?? null;
                        const isAssignedToActive = assignedCharacterId === sheet.id;
                        const isBusy = assigningPlayerId === player.id;

                        return (
                            <div
                                key={player.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-900/60 p-4"
                            >
                                <div>
                                    <div className="font-medium text-parchment">{player.name || 'Unknown Player'}</div>
                                    <div className="mt-1 text-sm text-stone-400">
                                        {isAssignedToActive
                                            ? `Assigned to ${sheet.name}`
                                            : assignedCharacterId
                                                ? `Assigned to another character`
                                                : 'No assigned character'}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void onAssign(player.id, null)}
                                        disabled={!assignedCharacterId || isBusy}
                                        className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-300 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Unassign
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void onAssign(player.id, sheet.id)}
                                        disabled={isAssignedToActive || isBusy}
                                        className="rounded-full border border-sky-400/35 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:border-sky-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isBusy ? 'Saving...' : 'Assign active sheet'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
