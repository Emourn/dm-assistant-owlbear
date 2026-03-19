import { useCallback, useEffect, useMemo, useState } from 'react';
import OBR, { type Player } from '@owlbear-rodeo/sdk';
import { Link2, RadioTower, RefreshCw, Swords, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../store/characterStore';
import { type OwlbearRoomState, getRoomStateFromMetadata } from './shared';
import {
    getSelectedSceneItems,
    importCurrentSelectionIntoCombat,
    linkCharacterToCurrentSelection,
    publishRoomStateFromStores,
    setPlayerAssignment,
} from './bridge';

export function OwlbearRoomPage() {
    const navigate = useNavigate();
    const characters = useCharacterStore((state) => state.characters);
    const [players, setPlayers] = useState<Player[]>([]);
    const [roomState, setRoomState] = useState<OwlbearRoomState | null>(null);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
    const [selectionCount, setSelectionCount] = useState(0);
    const [isBusy, setIsBusy] = useState(false);

    const playerRows = useMemo(() => players.filter((player) => player.role === 'PLAYER'), [players]);

    const refresh = useCallback(async () => {
        const [partyPlayers, metadata, selectedItems] = await Promise.all([
            OBR.party.getPlayers(),
            OBR.room.getMetadata(),
            getSelectedSceneItems(),
        ]);

        setPlayers(partyPlayers);
        setRoomState(getRoomStateFromMetadata(metadata));
        setSelectionCount(selectedItems.length);
        if (!selectedCharacterId && characters[0]) {
            setSelectedCharacterId(characters[0].id);
        }
    }, [characters, selectedCharacterId]);

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

    const handleLinkSelection = async () => {
        const character = characters.find((entry) => entry.id === selectedCharacterId);
        if (!character) {
            await OBR.notification.show('Choose a character first.', 'WARNING');
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

    const handleAssign = async (playerId: string, characterId: string) => {
        setIsBusy(true);
        try {
            const next = await setPlayerAssignment(playerId, characterId || null);
            setRoomState(next);
            await OBR.notification.show(characterId ? 'Updated player assignment.' : 'Cleared player assignment.', 'SUCCESS');
        } finally {
            setIsBusy(false);
        }
    };

    const handleImportToCombat = async () => {
        setIsBusy(true);
        try {
            const count = await importCurrentSelectionIntoCombat('workbench');
            if (count === 0) {
                await OBR.notification.show('Select one or more Owlbear tokens first.', 'WARNING');
                return;
            }

            await OBR.notification.show(`Imported ${count} token${count === 1 ? '' : 's'} into combat.`, 'SUCCESS');
            navigate('/combat');
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="space-y-6 p-6 md:p-8">
            <header className="flex flex-col gap-4 rounded-[2rem] border border-stone-800 bg-stone-950/80 p-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-gold">
                        <RadioTower size={18} />
                        <span className="text-xs font-black uppercase tracking-[0.28em]">Owlbear room integration</span>
                    </div>
                    <h1 className="mt-3 font-cinzel text-4xl font-bold text-parchment">Token Linking & Party Sync</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-400">
                        Link character sheets to tabletop tokens, assign players, and publish the shared room roster so players can open their sheets from Owlbear Rodeo.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-100 transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
                    >
                        <RefreshCw size={16} />
                        Publish Room State
                    </button>
                    <button
                        type="button"
                        onClick={handleImportToCombat}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
                    >
                        <Swords size={16} />
                        Import Selection to Combat
                    </button>
                </div>
            </header>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
                <section className="rounded-3xl border border-stone-800 bg-stone-950/70 p-6">
                    <div className="flex items-center gap-2 text-gold">
                        <Link2 size={18} />
                        <h2 className="font-cinzel text-xl font-bold text-parchment">Link selected tokens</h2>
                    </div>
                    <p className="mt-3 text-sm text-stone-400">
                        Current selection: <span className="font-semibold text-stone-100">{selectionCount}</span> Owlbear token{selectionCount === 1 ? '' : 's'}.
                    </p>

                    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
                        <select
                            value={selectedCharacterId}
                            onChange={(event) => setSelectedCharacterId(event.target.value)}
                            className="rounded-2xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                        >
                            <option value="">Choose a character</option>
                            {characters.map((character) => (
                                <option key={character.id} value={character.id}>
                                    {character.name || 'Unnamed'} · Lv.{character.level} {character.className || 'Adventurer'}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleLinkSelection}
                            disabled={!selectedCharacterId || isBusy}
                            className="rounded-2xl bg-gold px-5 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
                        >
                            Link Selection
                        </button>
                    </div>

                    <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-relaxed text-stone-300">
                        DM Assistant writes linked sheets under its own metadata namespace only. Visual and environmental extensions like Smoke &amp; Specter! and Embers can continue to manage their own scene metadata without collision.
                    </div>
                </section>

                <section className="rounded-3xl border border-stone-800 bg-stone-950/70 p-6">
                    <div className="flex items-center gap-2 text-gold">
                        <Users size={18} />
                        <h2 className="font-cinzel text-xl font-bold text-parchment">Player assignments</h2>
                    </div>
                    <div className="mt-5 space-y-4">
                        {playerRows.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-stone-700 p-5 text-sm text-stone-500">
                                No Owlbear players are connected right now.
                            </div>
                        )}
                        {playerRows.map((player) => (
                            <div key={player.id} className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="font-semibold text-stone-100">{player.name}</div>
                                        <div className="text-xs uppercase tracking-[0.22em] text-stone-500">{player.id.slice(0, 8)}</div>
                                    </div>
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: player.color }} />
                                </div>
                                <select
                                    value={roomState?.playerAssignments[player.id] ?? ''}
                                    onChange={(event) => {
                                        void handleAssign(player.id, event.target.value);
                                    }}
                                    className="mt-4 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 outline-none focus:border-gold"
                                >
                                    <option value="">No assigned character</option>
                                    {characters.map((character) => (
                                        <option key={character.id} value={character.id}>
                                            {character.name || 'Unnamed'} · Lv.{character.level} {character.className || 'Adventurer'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <section className="rounded-3xl border border-stone-800 bg-stone-950/70 p-6">
                <h2 className="font-cinzel text-xl font-bold text-parchment">Published room roster</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {(roomState?.characters ?? []).map((character) => (
                        <div key={character.id} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="font-cinzel text-xl font-bold text-parchment">{character.name || 'Unnamed'}</div>
                                    <div className="mt-1 text-sm text-stone-400">
                                        Lv.{character.level} {character.className || 'Adventurer'}
                                    </div>
                                </div>
                                <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-gold">
                                    {character.linkedTokenIds.length} token{character.linkedTokenIds.length === 1 ? '' : 's'}
                                </span>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-sm text-stone-400">
                                <span>HP {character.currentHp}/{character.maxHp}</span>
                                <span>AC {character.ac}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
