import { useCallback, useEffect, useMemo, useState } from 'react';
import OBR, { type Player } from '@owlbear-rodeo/sdk';
import {
    BookOpen,
    CalendarClock,
    Copy,
    FileUp,
    Link2,
    Moon,
    PencilLine,
    ScrollText,
    Search,
    Sparkles,
    Swords,
    Trash2,
    Users,
    Plus,
    RefreshCw,
    Shield,
    SunMoon,
    TentTree,
} from 'lucide-react';
import { useCampaignStore } from '../../store/campaignStore';
import { useCharacterStore } from '../../store/characterStore';
import type { Character } from '../../types/character';
import { useCombatStore } from '../../store/combatStore';
import type { Combatant } from '../../types/combat';
import {
    getSelectedSceneItems,
    importCurrentSelectionIntoCombat,
    linkCharacterToCurrentSelection,
    publishRoomStateFromStores,
    setPlayerAssignment,
} from '../bridge';
import {
    deriveSmokeVisionProfile,
    getEmbersSpellId,
    triggerEmbersSpellFromCombatant,
} from '../integrations';
import { getRoomStateFromMetadata, type OwlbearRoomState } from '../shared';
import { getPanelLabel, type WorkspacePanel } from './runtimeTypes';

export function HeaderAction({
    icon: Icon,
    label,
    onClick,
    disabled,
    accent = false,
}: {
    icon: typeof Sparkles;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    accent?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition-colors disabled:cursor-wait disabled:opacity-50 ${
                accent
                    ? 'border-gold/30 bg-gold px-3 text-stone-950 hover:bg-yellow-400'
                    : 'border-stone-800 bg-stone-900/80 text-stone-100 hover:border-sky-400/20 hover:text-sky-100'
            }`}
        >
            <Icon size={14} />
            {label}
        </button>
    );
}

export function CompactStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-stone-800 bg-stone-950/70 px-3 py-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-stone-100">{value}</div>
        </div>
    );
}

export function RuntimeLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-2 text-sm">
            <span className="text-stone-500">{label}</span>
            <span className="font-semibold text-stone-100">{value}</span>
        </div>
    );
}

export function FirstRunPanel({
    onImport,
    onCreate,
    onOpenCampaigns,
}: {
    onImport: () => void;
    onCreate: () => void;
    onOpenCampaigns: () => void;
}) {
    return (
        <section className="rounded-[1.75rem] border border-gold/20 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_34%),linear-gradient(135deg,_rgba(17,24,39,0.94),_rgba(10,10,10,0.95))] p-5 shadow-[0_24px_60px_-34px_rgba(245,158,11,0.45)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                    <div className="text-[10px] font-black uppercase tracking-[0.26em] text-gold">First-time setup</div>
                    <h2 className="mt-2 font-cinzel text-3xl font-bold text-parchment">Start with a sheet, then link it to a token</h2>
                    <p className="mt-3 text-sm leading-relaxed text-stone-300">
                        Import or create a sheet first, then connect it to a selected token and assign it to a player. This keeps the extension centered on Owlbear's token workflow instead of feeling like a separate app.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <HeaderAction icon={FileUp} label="Import PDF" onClick={onImport} accent />
                    <HeaderAction icon={PencilLine} label="Create Sheet" onClick={onCreate} />
                    <HeaderAction icon={BookOpen} label="Campaigns" onClick={onOpenCampaigns} />
                </div>
            </div>
        </section>
    );
}

export function QuickActionRail({
    activePanel,
    onOpenPanel,
}: {
    activePanel: WorkspacePanel;
    onOpenPanel: (panel: WorkspacePanel) => void;
}) {
    const items: Array<{ id: WorkspacePanel; label: string; icon: typeof Sparkles; description: string }> = [
        { id: 'roster', label: 'Sheets', icon: Users, description: 'Roster, import, and quick editing' },
        { id: 'combat', label: 'Combat', icon: Swords, description: 'Initiative and turn tools' },
        { id: 'sync', label: 'Sync', icon: Link2, description: 'Linking, assignment, publishing' },
        { id: 'camp', label: 'Camp', icon: Moon, description: 'Short and long rests' },
        { id: 'notes', label: 'Notes', icon: ScrollText, description: 'Navigator and DM notes' },
        { id: 'campaigns', label: 'Campaigns', icon: BookOpen, description: 'Campaign administration' },
    ];

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/80 p-3">
            <div className="flex flex-wrap gap-2">
                {items.map((item) => {
                    const isActive = activePanel === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onOpenPanel(isActive ? 'none' : item.id)}
                            className={`flex min-w-[120px] flex-1 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                                isActive
                                    ? 'border-sky-400/20 bg-sky-500/10 text-sky-100'
                                    : 'border-stone-800 bg-stone-900/70 text-stone-200 hover:border-stone-700 hover:text-stone-50'
                            }`}
                        >
                            <div className={`rounded-xl border p-2 ${isActive ? 'border-sky-400/20 bg-sky-500/10' : 'border-stone-800 bg-stone-950/70'}`}>
                                <item.icon size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[11px] font-black uppercase tracking-[0.18em]">{item.label}</div>
                                <div className="mt-1 text-xs text-stone-500">{item.description}</div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

export function RoomSnapshotCard({
    roomState,
    playerRows,
    characters,
    onOpenSync,
    onOpenRoster,
}: {
    roomState: OwlbearRoomState | null;
    playerRows: Player[];
    characters: Character[];
    onOpenSync: () => void;
    onOpenRoster: () => void;
}) {
    return (
        <section className="rounded-[1.5rem] border border-stone-800 bg-stone-950/80 p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Room snapshot</div>
                    <h2 className="mt-2 font-cinzel text-2xl font-bold text-parchment">Roster and sync posture</h2>
                </div>
                <div className="flex gap-2">
                    <HeaderAction icon={Link2} label="Sync" onClick={onOpenSync} />
                    <HeaderAction icon={Users} label="Sheets" onClick={onOpenRoster} />
                </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <CompactStat label="Players" value={String(playerRows.length)} />
                <CompactStat label="Published sheets" value={String(roomState?.characters.length ?? characters.length)} />
                <CompactStat label="Assignments" value={String(Object.keys(roomState?.playerAssignments ?? {}).length)} />
            </div>
            <div className="mt-4 rounded-2xl border border-stone-800 bg-stone-900/60 p-3 text-sm leading-relaxed text-stone-400">
                DM Assistant keeps its metadata isolated so Owlbear's tabletop features and other extensions remain the owners of the live scene.
            </div>
        </section>
    );
}

export function WorkspaceDrawer({
    activePanel,
    onClose,
    onImportPdf,
    onCreateCharacter,
    onEditCharacter,
}: {
    activePanel: WorkspacePanel;
    onClose: () => void;
    onImportPdf: () => void;
    onCreateCharacter: () => void;
    onEditCharacter: (characterId: string) => void;
}) {
    return (
        <section className="rounded-[1.6rem] border border-stone-800 bg-stone-950/90 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.95)]">
            <div className="flex items-center justify-between border-b border-stone-800/80 px-4 py-3">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-stone-500">Secondary workspace</div>
                    <h3 className="mt-1 font-cinzel text-2xl font-bold text-parchment">{getPanelLabel(activePanel)}</h3>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-stone-800 bg-stone-900/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-stone-200 transition-colors hover:border-sky-400/20 hover:text-sky-100"
                >
                    Close
                </button>
            </div>
            <div className="max-h-[58vh] overflow-y-auto px-3 py-3">
                {activePanel === 'roster' && (
                    <RosterWorkspace onImportPdf={onImportPdf} onCreateCharacter={onCreateCharacter} onEditCharacter={onEditCharacter} />
                )}
                {activePanel === 'combat' && <CombatWorkspace />}
                {activePanel === 'sync' && <SyncWorkspace />}
                {activePanel === 'camp' && <CampWorkspace />}
                {activePanel === 'notes' && <NotesWorkspace />}
                {activePanel === 'campaigns' && <CampaignWorkspace />}
            </div>
        </section>
    );
}

function RosterWorkspace({
    onImportPdf,
    onCreateCharacter,
    onEditCharacter,
}: {
    onImportPdf: () => void;
    onCreateCharacter: () => void;
    onEditCharacter: (characterId: string) => void;
}) {
    const characters = useCharacterStore((state) => state.characters);
    const [query, setQuery] = useState('');
    const filteredCharacters = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            return characters;
        }

        return characters.filter((character) => {
            const haystack = [character.name, character.className, character.race, character.playerName]
                .join(' ')
                .toLowerCase();
            return haystack.includes(normalized);
        });
    }, [characters, query]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <HeaderAction icon={FileUp} label="Import PDF" onClick={onImportPdf} accent />
                <HeaderAction icon={PencilLine} label="Create Sheet" onClick={onCreateCharacter} />
            </div>
            <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Filter sheets by name, class, race, or player"
                    className="w-full rounded-2xl border border-stone-700 bg-stone-950 py-3 pl-11 pr-4 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                {characters.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-stone-800 p-4 text-sm text-stone-500">
                        No saved sheets yet. Import a PDF or create a sheet to begin linking tokens and assigning players.
                    </div>
                )}
                {characters.length > 0 && filteredCharacters.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-stone-800 p-4 text-sm text-stone-500">
                        No saved sheets match that filter.
                    </div>
                )}
                {filteredCharacters.map((character) => (
                    <div key={character.id} className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="font-cinzel text-xl font-bold text-parchment">{character.name || 'Unnamed'}</div>
                                <div className="mt-1 text-sm text-stone-400">
                                    Lv.{character.level} {character.className || 'Adventurer'}{character.race ? ` - ${character.race}` : ''}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onEditCharacter(character.id)}
                                className="rounded-full border border-stone-800 bg-stone-950/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-stone-200 transition-colors hover:border-sky-400/20 hover:text-sky-100"
                            >
                                Edit
                            </button>
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            <CompactStat label="HP" value={`${character.currentHp}/${character.maxHp}`} />
                            <CompactStat label="AC" value={String(character.ac)} />
                            <CompactStat label="Spells" value={String(character.spells.length)} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SyncWorkspace() {
    const characters = useCharacterStore((state) => state.characters);
    const [players, setPlayers] = useState<Player[]>([]);
    const [roomState, setRoomState] = useState<OwlbearRoomState | null>(null);
    const [selectedCharacterId, setSelectedCharacterId] = useState('');
    const [selectionCount, setSelectionCount] = useState(0);
    const [isBusy, setIsBusy] = useState(false);

    const playerRows = useMemo(() => players.filter((player) => player.role === 'PLAYER'), [players]);
    const selectedCharacter = useMemo(
        () => characters.find((entry) => entry.id === selectedCharacterId) ?? null,
        [characters, selectedCharacterId],
    );
    const smokeVisionProfile = useMemo(
        () => (selectedCharacter ? deriveSmokeVisionProfile(selectedCharacter) : null),
        [selectedCharacter],
    );

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

    const handleAssign = async (playerId: string, characterId: string | null) => {
        setIsBusy(true);
        try {
            const next = await setPlayerAssignment(playerId, characterId);
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
        } finally {
            setIsBusy(false);
        }
    };

    const handleCopySmokeProfile = async () => {
        if (!selectedCharacter || !smokeVisionProfile) {
            await OBR.notification.show('Choose a character first.', 'WARNING');
            return;
        }

        const notes = smokeVisionProfile.notes.length ? ` | Notes: ${smokeVisionProfile.notes.join('; ')}` : '';
        await navigator.clipboard.writeText(
            `${selectedCharacter.name}: range ${smokeVisionProfile.range} ft | greyscale ${smokeVisionProfile.greyscale ? 'yes' : 'no'} | falloff ${smokeVisionProfile.falloff}${notes}`,
        );
        await OBR.notification.show('Copied the Smoke vision profile.', 'SUCCESS');
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-gold">
                            <Shield size={16} />
                            <div className="text-[11px] font-black uppercase tracking-[0.22em]">Sync and linking</div>
                        </div>
                        <div className="mt-2 font-cinzel text-2xl font-bold text-parchment">Room state and token ownership</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <HeaderAction icon={RefreshCw} label="Publish" onClick={() => void handlePublish()} disabled={isBusy} />
                        <HeaderAction icon={Swords} label="To Combat" onClick={() => void handleImportToCombat()} disabled={isBusy} accent />
                    </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    <CompactStat label="Selection" value={`${selectionCount} token${selectionCount === 1 ? '' : 's'}`} />
                    <CompactStat label="Players" value={String(playerRows.length)} />
                    <CompactStat label="Published" value={String(roomState?.characters.length ?? characters.length)} />
                    <CompactStat label="Assignments" value={String(Object.keys(roomState?.playerAssignments ?? {}).length)} />
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Link selection</div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <select
                            value={selectedCharacterId}
                            onChange={(event) => setSelectedCharacterId(event.target.value)}
                            className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                        >
                            <option value="">Choose a character</option>
                            {characters.map((character) => (
                                <option key={character.id} value={character.id}>
                                    {character.name || 'Unnamed'} - Lv.{character.level} {character.className || 'Adventurer'}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => void handleLinkSelection()}
                            disabled={!selectedCharacterId || isBusy}
                            className="rounded-2xl bg-gold px-5 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Link Selection
                        </button>
                    </div>
                    <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-relaxed text-stone-300">
                        DM Assistant only writes under its own metadata namespace, so Smoke and Spectre!, Embers, and Owlbear map features stay isolated.
                    </div>

                    {selectedCharacter && smokeVisionProfile && (
                        <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Smoke profile</div>
                                    <div className="mt-2 text-sm font-semibold text-stone-100">{selectedCharacter.name}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void handleCopySmokeProfile()}
                                    className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-sky-400/40 hover:text-sky-200"
                                >
                                    <Copy size={12} />
                                    Copy
                                </button>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                <CompactStat label="Range" value={`${smokeVisionProfile.range} ft`} />
                                <CompactStat label="Greyscale" value={smokeVisionProfile.greyscale ? 'Yes' : 'No'} />
                                <CompactStat label="Falloff" value={String(smokeVisionProfile.falloff)} />
                            </div>
                            <div className="mt-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-3 text-sm text-stone-300">
                                Apply this in Smoke and Spectre! after linking the token. Use the selected token as the Smoke owner, set range to {smokeVisionProfile.range} ft, then match greyscale and falloff here.
                            </div>
                            {selectedCharacter.senses && (
                                <div className="mt-3 text-sm text-stone-400">
                                    Sheet senses: {selectedCharacter.senses}
                                </div>
                            )}
                            {smokeVisionProfile.notes.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {smokeVisionProfile.notes.map((note) => (
                                        <div key={note} className="rounded-xl border border-stone-800 bg-stone-950/70 px-3 py-2 text-sm text-stone-400">
                                            {note}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                    <div className="flex items-center gap-2 text-gold">
                        <Users size={16} />
                        <div className="text-[11px] font-black uppercase tracking-[0.22em]">Player assignments</div>
                    </div>
                    <div className="mt-4 space-y-3">
                        {playerRows.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-stone-800 p-4 text-sm text-stone-500">
                                No Owlbear players are connected right now.
                            </div>
                        )}
                        {playerRows.map((player) => (
                            <div key={player.id} className="rounded-2xl border border-stone-800 bg-stone-950/70 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold text-stone-100">{player.name}</div>
                                        <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-stone-500">{player.id.slice(0, 8)}</div>
                                    </div>
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: player.color }} />
                                </div>
                                <select
                                    value={roomState?.playerAssignments[player.id] ?? ''}
                                    onChange={(event) => {
                                        void handleAssign(player.id, event.target.value || null);
                                    }}
                                    className="mt-3 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 outline-none focus:border-gold"
                                >
                                    <option value="">No assigned character</option>
                                    {characters.map((character) => (
                                        <option key={character.id} value={character.id}>
                                            {character.name || 'Unnamed'} - Lv.{character.level} {character.className || 'Adventurer'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
        </div>
    );
}

function CombatWorkspace() {
    const characters = useCharacterStore((state) => state.characters);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const startEncounter = useCombatStore((state) => state.startEncounter);
    const completeSetup = useCombatStore((state) => state.completeSetup);
    const skipMapSetup = useCombatStore((state) => state.skipMapSetup);
    const cancelEncounter = useCombatStore((state) => state.cancelEncounter);
    const endEncounter = useCombatStore((state) => state.endEncounter);
    const clearCombatants = useCombatStore((state) => state.clearCombatants);
    const removeCombatant = useCombatStore((state) => state.removeCombatant);
    const rollAllInitiative = useCombatStore((state) => state.rollAllInitiative);
    const beginCombat = useCombatStore((state) => state.beginCombat);
    const nextTurn = useCombatStore((state) => state.nextTurn);
    const setInitiative = useCombatStore((state) => state.setInitiative);
    const damageCombatant = useCombatStore((state) => state.damageCombatant);
    const healCombatant = useCombatStore((state) => state.healCombatant);
    const [title, setTitle] = useState('');
    const [isBusy, setIsBusy] = useState(false);

    const activeCampaign = campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null;
    const activeCombatant = activeEncounter?.combatants.find((combatant) => combatant.id === activeEncounter.activeCombatantId) ?? null;
    const activeCharacter = useMemo(
        () => (activeCombatant?.sourceId ? characters.find((character) => character.id === activeCombatant.sourceId) ?? null : null),
        [activeCombatant?.sourceId, characters],
    );
    const embersReadySpells = useMemo(
        () => (activeCharacter?.spells ?? []).filter((spell) => Boolean(getEmbersSpellId(spell.name))),
        [activeCharacter],
    );
    const partyLevel = activeCampaign
        ? characters
            .filter((character) => activeCampaign.partyIds.includes(character.id))
            .reduce((sum, character) => sum + character.level, 0)
        : 0;

    const handleCreateEncounter = async () => {
        const encounterTitle = title.trim() || 'Owlbear Encounter';
        startEncounter(encounterTitle, [], activeCampaignId || undefined);
        completeSetup();
        skipMapSetup();
        setTitle('');
        await OBR.notification.show(`Created ${encounterTitle}.`, 'SUCCESS');
    };

    const handleImportSelection = async () => {
        setIsBusy(true);
        try {
            const count = await importCurrentSelectionIntoCombat('workbench');
            if (count === 0) {
                await OBR.notification.show('Select one or more Owlbear tokens first.', 'WARNING');
                return;
            }
            await OBR.notification.show(`Imported ${count} token${count === 1 ? '' : 's'} into combat.`, 'SUCCESS');
        } finally {
            setIsBusy(false);
        }
    };

    const handleRemoveCombatant = async (combatant: Combatant) => {
        removeCombatant(combatant.id);
        await OBR.notification.show(`Removed ${combatant.name} from the encounter.`, 'SUCCESS');
    };

    const handleCastActiveSpell = async (spellName: string) => {
        if (!activeCombatant) {
            return;
        }

        setIsBusy(true);
        try {
            await triggerEmbersSpellFromCombatant(activeCombatant, spellName);
        } finally {
            setIsBusy(false);
        }
    };

    if (!activeEncounter) {
        return (
            <div className="space-y-4">
                <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                    <div className="flex items-center gap-2 text-gold">
                        <Swords size={16} />
                        <div className="text-[11px] font-black uppercase tracking-[0.22em]">Combat staging</div>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                        <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Encounter title"
                            className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                        />
                        <button
                            type="button"
                            onClick={() => void handleCreateEncounter()}
                            className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm font-semibold text-stone-100 transition-colors hover:border-sky-400/20 hover:text-sky-100"
                        >
                            Start Empty
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleImportSelection()}
                            disabled={isBusy}
                            className="rounded-2xl bg-gold px-4 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Import Selected
                        </button>
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    <CompactStat label="Active campaign" value={activeCampaign?.title || 'None'} />
                    <CompactStat label="Party level sum" value={String(partyLevel)} />
                    <CompactStat label="Map mode" value="Owlbear-owned" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-gold">
                            <Swords size={16} />
                            <div className="text-[11px] font-black uppercase tracking-[0.22em]">Combat control</div>
                        </div>
                        <div className="mt-2 font-cinzel text-2xl font-bold text-parchment">{activeEncounter.title}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <HeaderAction icon={Swords} label="Import Selected" onClick={() => void handleImportSelection()} disabled={isBusy} accent />
                        <HeaderAction icon={RefreshCw} label="Roll Init" onClick={rollAllInitiative} />
                        <HeaderAction icon={Sparkles} label={activeEncounter.isActive ? 'Next Turn' : 'Begin'} onClick={activeEncounter.isActive ? nextTurn : beginCombat} />
                        <HeaderAction icon={Trash2} label={activeEncounter.isActive ? 'End' : 'Discard'} onClick={activeEncounter.isActive ? endEncounter : cancelEncounter} />
                    </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    <CompactStat label="Round" value={String(activeEncounter.round)} />
                    <CompactStat label="Combatants" value={String(activeEncounter.combatants.length)} />
                    <CompactStat label="State" value={activeEncounter.isActive ? 'Active' : 'Preparing'} />
                    <CompactStat label="Current turn" value={activeCombatant?.name || 'None'} />
                </div>
            </div>

            {activeCombatant && (
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Current turn</div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="font-cinzel text-2xl font-bold text-parchment">{activeCombatant.name}</div>
                            <div className="mt-1 text-sm text-stone-400">
                                HP {activeCombatant.currentHp}/{activeCombatant.maxHp} - Init {activeCombatant.initiativeScore ?? '-'}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => damageCombatant(activeCombatant.id, 5)}
                                className="rounded-full border border-stone-700 bg-stone-950 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-red-400/30 hover:text-red-200"
                            >
                                Damage 5
                            </button>
                            <button
                                type="button"
                                onClick={() => healCombatant(activeCombatant.id, 5)}
                                className="rounded-full border border-stone-700 bg-stone-950 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-emerald-400/30 hover:text-emerald-200"
                            >
                                Heal 5
                            </button>
                        </div>
                    </div>
                    {activeCharacter && embersReadySpells.length > 0 && (
                        <div className="mt-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-gold">Embers-ready spells</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {embersReadySpells.slice(0, 6).map((spell) => (
                                    <button
                                        key={spell.id}
                                        type="button"
                                        onClick={() => void handleCastActiveSpell(spell.name)}
                                        disabled={isBusy}
                                        className="rounded-full border border-gold/30 bg-gold/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-gold transition-colors hover:border-gold/50 hover:bg-gold/15 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {spell.name}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 text-xs text-stone-400">
                                Embers uses the active combatant as caster and the current Owlbear token selection as target context.
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={clearCombatants}
                    className="rounded-full border border-stone-700 bg-stone-950 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-red-400/30 hover:text-red-200"
                >
                    Clear Combatants
                </button>
            </div>

            <div className="space-y-3">
                {activeEncounter.combatants.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-stone-800 p-4 text-sm text-stone-500">
                        No combatants yet. Import selected Owlbear tokens to start initiative.
                    </div>
                )}
                {activeEncounter.combatants.map((combatant) => (
                    <div key={combatant.id} className={`rounded-2xl border p-4 ${combatant.id === activeEncounter.activeCombatantId ? 'border-sky-400/20 bg-sky-500/5' : 'border-stone-800 bg-stone-900/70'}`}>
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_110px_110px_auto_auto_auto] lg:items-center">
                            <div className="min-w-0">
                                <div className="truncate font-semibold text-stone-100">{combatant.name}</div>
                                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-stone-500">{combatant.type}</div>
                            </div>
                            <input
                                type="number"
                                value={combatant.initiativeScore ?? ''}
                                onChange={(event) => setInitiative(combatant.id, Number(event.target.value) || 0)}
                                className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                                placeholder="Init"
                            />
                            <div className="rounded-xl border border-stone-800 bg-stone-950/70 px-3 py-2 text-sm text-stone-300">
                                HP {combatant.currentHp}/{combatant.maxHp}
                            </div>
                            <button
                                type="button"
                                onClick={() => damageCombatant(combatant.id, 5)}
                                className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm font-semibold text-stone-100 transition-colors hover:border-red-400/30 hover:text-red-200"
                            >
                                -5
                            </button>
                            <button
                                type="button"
                                onClick={() => healCombatant(combatant.id, 5)}
                                className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm font-semibold text-stone-100 transition-colors hover:border-emerald-400/30 hover:text-emerald-200"
                            >
                                +5
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleRemoveCombatant(combatant)}
                                className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm font-semibold text-stone-100 transition-colors hover:border-red-400/30 hover:text-red-200"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CampaignWorkspace() {
    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
    const addCampaign = useCampaignStore((state) => state.addCampaign);
    const setActiveCampaign = useCampaignStore((state) => state.setActiveCampaign);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleCreate = async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            await OBR.notification.show('Give the campaign a title first.', 'WARNING');
            return;
        }

        addCampaign({
            title: trimmedTitle,
            description: description.trim(),
            partyIds: [],
            npcs: [],
            locations: [],
            timeTracking: {
                currentDay: 1,
                currentHour: 8,
                currentMinute: 0,
                calendarSystem: 'generic',
            },
        });
        setTitle('');
        setDescription('');
        await OBR.notification.show(`Created ${trimmedTitle}.`, 'SUCCESS');
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                <div className="flex items-center gap-2 text-gold">
                    <BookOpen size={16} />
                    <div className="text-[11px] font-black uppercase tracking-[0.22em]">Campaign staging</div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="New campaign title"
                        className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                    />
                    <input
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Short description"
                        className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                    />
                    <button
                        type="button"
                        onClick={() => void handleCreate()}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-4 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400"
                    >
                        <Plus size={16} />
                        Create
                    </button>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {campaigns.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-stone-800 p-4 text-sm text-stone-500">
                        No campaigns yet. Create one here so rest flows, notes, and party context have a home inside Owlbear.
                    </div>
                )}
                {campaigns.map((campaign) => (
                    <button
                        key={campaign.id}
                        type="button"
                        onClick={() => setActiveCampaign(campaign.id)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${
                            campaign.id === activeCampaignId
                                ? 'border-gold/40 bg-gold/10'
                                : 'border-stone-800 bg-stone-900/70 hover:border-stone-700 hover:bg-stone-900'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="truncate font-cinzel text-xl font-bold text-parchment">{campaign.title}</div>
                                <div className="mt-2 text-sm leading-relaxed text-stone-400">
                                    {campaign.description || 'No description yet.'}
                                </div>
                            </div>
                            {campaign.id === activeCampaignId && (
                                <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gold">
                                    Active
                                </span>
                            )}
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-4">
                            <CompactStat label="Party" value={String(campaign.partyIds.length)} />
                            <CompactStat label="Notes" value={String(campaign.sessionNotes.length)} />
                            <CompactStat label="NPCs" value={String(campaign.npcs.length)} />
                            <CompactStat label="Sites" value={String(campaign.locations.length)} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

function CampWorkspace() {
    const characters = useCharacterStore((state) => state.characters);
    const shortRest = useCharacterStore((state) => state.shortRest);
    const longRest = useCharacterStore((state) => state.longRest);
    const longRestParty = useCharacterStore((state) => state.longRestParty);
    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
    const [hitDiceMap, setHitDiceMap] = useState<Record<string, number>>({});

    const activeCampaign = campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null;
    const party = useMemo(
        () => characters.filter((character) => activeCampaign?.partyIds.includes(character.id)),
        [activeCampaign?.partyIds, characters],
    );
    const totalCurrentHp = party.reduce((sum, character) => sum + character.currentHp, 0);
    const totalMaxHp = party.reduce((sum, character) => sum + character.maxHp, 0);

    const handleShortRest = async (character: Character) => {
        const spend = Math.max(0, hitDiceMap[character.id] ?? 0);
        shortRest(character.id, spend);
        await OBR.notification.show(`Applied a short rest to ${character.name || 'that character'}.`, 'SUCCESS');
    };

    const handleLongRest = async (character: Character) => {
        longRest(character.id);
        await OBR.notification.show(`Applied a long rest to ${character.name || 'that character'}.`, 'SUCCESS');
    };

    const handlePartyLongRest = async () => {
        longRestParty(party.map((character) => character.id));
        await OBR.notification.show('Applied a long rest to the active party.', 'SUCCESS');
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-gold">
                            <TentTree size={16} />
                            <div className="text-[11px] font-black uppercase tracking-[0.22em]">Camp control</div>
                        </div>
                        <div className="mt-2 font-cinzel text-2xl font-bold text-parchment">
                            {activeCampaign?.title || 'No active campaign'}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handlePartyLongRest()}
                        disabled={party.length === 0}
                        className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <SunMoon size={16} />
                        Long Rest Party
                    </button>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <CompactStat label="Members" value={String(party.length)} />
                    <CompactStat label="Party HP" value={`${totalCurrentHp}/${totalMaxHp || 0}`} />
                    <CompactStat label="Condition" value={party.length === 0 ? 'Idle' : totalMaxHp > 0 ? `${Math.round((totalCurrentHp / totalMaxHp) * 100)}%` : 'Ready'} />
                </div>
            </div>

            {party.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-800 p-4 text-sm text-stone-500">
                    Add characters to the active campaign to use camp automation here.
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {party.map((character) => (
                        <div key={character.id} className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="font-cinzel text-xl font-bold text-parchment">{character.name || 'Unnamed'}</div>
                                    <div className="mt-1 text-sm text-stone-400">
                                        Lv.{character.level} {character.className || 'Adventurer'}
                                    </div>
                                </div>
                                <CompactStat label="HP" value={`${character.currentHp}/${character.maxHp}`} />
                            </div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                <CompactStat label="AC" value={String(character.ac)} />
                                <CompactStat label="Temp HP" value={String(character.tempHp)} />
                                <CompactStat label="Exhaustion" value={String(character.exhaustion)} />
                            </div>
                            <div className="mt-4 grid gap-3 lg:grid-cols-[120px_repeat(2,minmax(0,1fr))]">
                                <input
                                    type="number"
                                    min="0"
                                    value={hitDiceMap[character.id] ?? 0}
                                    onChange={(event) => setHitDiceMap((current) => ({ ...current, [character.id]: Number(event.target.value) || 0 }))}
                                    className="rounded-2xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                                />
                                <button
                                    type="button"
                                    onClick={() => void handleShortRest(character)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-2.5 text-sm font-semibold text-stone-100 transition-colors hover:border-sky-400/20 hover:text-sky-100"
                                >
                                    <Moon size={15} />
                                    Short Rest
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleLongRest(character)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm font-semibold text-gold transition-colors hover:border-gold/50 hover:bg-gold/15"
                                >
                                    <SunMoon size={15} />
                                    Long Rest
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function NotesWorkspace() {
    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);
    const addSessionNote = useCampaignStore((state) => state.addSessionNote);
    const advanceTime = useCampaignStore((state) => state.advanceTime);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const activeCampaign = campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null;
    const notes = [...(activeCampaign?.sessionNotes ?? [])].sort((left, right) => right.date - left.date);
    const nextSessionNumber = (notes[0]?.sessionNumber ?? 0) + 1;
    const timeLabel = activeCampaign
        ? `Day ${activeCampaign.timeTracking.currentDay}, ${String(activeCampaign.timeTracking.currentHour).padStart(2, '0')}:${String(activeCampaign.timeTracking.currentMinute).padStart(2, '0')}`
        : 'No active campaign';

    const handleAddNote = async () => {
        if (!activeCampaign) {
            await OBR.notification.show('Choose an active campaign first.', 'WARNING');
            return;
        }
        if (!title.trim() || !content.trim()) {
            await OBR.notification.show('Add a title and note content first.', 'WARNING');
            return;
        }

        addSessionNote(activeCampaign.id, {
            sessionNumber: nextSessionNumber,
            title: title.trim(),
            content: content.trim(),
        });
        setTitle('');
        setContent('');
        await OBR.notification.show('Saved the note to the active campaign.', 'SUCCESS');
    };

    const handleAdvanceTime = async (minutes: number) => {
        if (!activeCampaign) {
            await OBR.notification.show('Choose an active campaign first.', 'WARNING');
            return;
        }
        advanceTime(activeCampaign.id, minutes);
        await OBR.notification.show('Advanced campaign time.', 'SUCCESS');
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-gold">
                            <CalendarClock size={16} />
                            <div className="text-[11px] font-black uppercase tracking-[0.22em]">Navigator and notes</div>
                        </div>
                        <div className="mt-2 font-cinzel text-2xl font-bold text-parchment">{activeCampaign?.title || 'No active campaign'}</div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                        <button
                            type="button"
                            onClick={() => void handleAdvanceTime(10)}
                            className="rounded-full border border-stone-700 bg-stone-950 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-100 transition-colors hover:border-sky-400/20 hover:text-sky-100"
                        >
                            +10 min
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleAdvanceTime(60)}
                            className="rounded-full border border-stone-700 bg-stone-950 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-100 transition-colors hover:border-sky-400/20 hover:text-sky-100"
                        >
                            +1 hour
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleAdvanceTime(480)}
                            className="rounded-full border border-stone-700 bg-stone-950 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-100 transition-colors hover:border-sky-400/20 hover:text-sky-100"
                        >
                            +8 hours
                        </button>
                    </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    <CompactStat label="Clock" value={timeLabel} />
                    <CompactStat label="Notes" value={String(notes.length)} />
                    <CompactStat label="NPCs" value={String(activeCampaign?.npcs.length ?? 0)} />
                    <CompactStat label="Locations" value={String(activeCampaign?.locations.length ?? 0)} />
                </div>
            </div>

            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Quick DM note</div>
                <div className="mt-3 grid gap-3">
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Session title or scene name"
                        className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                    />
                    <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="Capture clue chains, improvised rulings, NPC intent, treasure, or anything you need to remember mid-session."
                        className="min-h-[140px] rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                    />
                    <button
                        type="button"
                        onClick={() => void handleAddNote()}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-4 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400"
                    >
                        <ScrollText size={16} />
                        Save Note
                    </button>
                </div>
            </div>

            <div className="grid gap-3">
                {notes.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-stone-800 p-4 text-sm text-stone-500">
                        No campaign notes yet. Save quick notes here instead of leaving Owlbear to update another app screen.
                    </div>
                )}
                {notes.slice(0, 6).map((note) => (
                    <div key={note.id} className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="font-cinzel text-xl font-bold text-parchment">{note.title}</div>
                                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-stone-500">
                                    Session {note.sessionNumber} - {new Date(note.date).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 text-sm leading-relaxed text-stone-300 whitespace-pre-wrap">
                            {note.content}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
