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
import type { Character, Condition } from '../../types/character';
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
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] transition-colors disabled:cursor-wait disabled:opacity-50 ${
                accent
                    ? 'border-gold/40 bg-gold text-stone-950 shadow-[0_0_0_1px_rgba(245,158,11,0.18)] hover:bg-yellow-400'
                    : 'border-stone-700 bg-stone-950/90 text-stone-100 hover:border-sky-400/20 hover:text-sky-100'
            }`}
        >
            <Icon size={14} />
            {label}
        </button>
    );
}

export function CompactStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-stone-800 bg-[linear-gradient(180deg,rgba(28,25,23,0.94),rgba(12,10,9,0.96))] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-stone-500">{label}</div>
            <div className="mt-1 text-sm font-semibold tracking-tight text-stone-100">{value}</div>
        </div>
    );
}

export function RuntimeLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-2 text-sm">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-stone-500">{label}</span>
            <span className="font-semibold text-stone-100">{value}</span>
        </div>
    );
}

function WorkspaceCard({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`relative overflow-hidden rounded-2xl border border-stone-800 bg-[linear-gradient(180deg,rgba(41,37,36,0.88),rgba(12,10,9,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-stone-500/20 before:to-transparent ${className}`.trim()}
        >
            {children}
        </div>
    );
}

function SmallActionButton({
    label,
    icon,
    onClick,
    variant = 'neutral',
    disabled,
    className = '',
}: {
    label: string;
    icon?: typeof Sparkles;
    onClick: () => void;
    variant?: 'neutral' | 'sky' | 'gold' | 'danger' | 'success';
    disabled?: boolean;
    className?: string;
}) {
    const Icon = icon;
    const tone =
        variant === 'gold'
            ? 'border-gold/30 bg-gold/10 text-gold hover:border-gold/50 hover:bg-gold/15'
            : variant === 'danger'
                ? 'border-stone-700 bg-stone-950 text-stone-100 hover:border-red-400/30 hover:text-red-200'
                : variant === 'success'
                    ? 'border-stone-700 bg-stone-950 text-stone-100 hover:border-emerald-400/30 hover:text-emerald-200'
                    : variant === 'sky'
                        ? 'border-stone-700 bg-stone-950 text-stone-100 hover:border-sky-400/20 hover:text-sky-100'
                        : 'border-stone-700 bg-stone-950 text-stone-100 hover:border-stone-600';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tone} ${className}`.trim()}
        >
            {Icon && <Icon size={12} />}
            {label}
        </button>
    );
}

function PrimaryActionButton({
    label,
    icon,
    onClick,
    disabled,
    className = '',
}: {
    label: string;
    icon?: typeof Sparkles;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}) {
    const Icon = icon;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
        >
            {Icon && <Icon size={16} />}
            {label}
        </button>
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
        <section className="rounded-[1.4rem] border border-gold/20 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.14),_transparent_28%),linear-gradient(180deg,_rgba(28,25,23,0.98),_rgba(12,10,9,0.98))] p-5 shadow-[0_24px_60px_-34px_rgba(245,158,11,0.3)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-[0.26em] text-gold">First-time setup</div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-parchment">Start with a sheet, then link it to a token</h2>
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
        <section className="rounded-[1.25rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(12,10,9,0.96),rgba(28,25,23,0.92))] p-3">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                {items.map((item) => {
                    const isActive = activePanel === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onOpenPanel(isActive ? 'none' : item.id)}
                            className={`flex min-w-[120px] items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                                isActive
                                    ? 'border-sky-400/20 bg-sky-500/10 text-sky-100 shadow-[inset_0_1px_0_rgba(125,211,252,0.08)]'
                                    : 'border-stone-800 bg-stone-900/60 text-stone-200 hover:border-stone-700 hover:text-stone-50'
                            }`}
                        >
                            <div className={`rounded-lg border p-2 ${isActive ? 'border-sky-400/20 bg-sky-500/10' : 'border-stone-800 bg-stone-950/70'}`}>
                                <item.icon size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em]">{item.label}</div>
                                <div className="mt-1 text-[11px] leading-snug text-stone-500">{item.description}</div>
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
        <section className="rounded-[1.25rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(12,10,9,0.96),rgba(28,25,23,0.92))] p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-emerald-300">Room snapshot</div>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-parchment">Roster and sync posture</h2>
                </div>
                <div className="flex gap-2">
                    <HeaderAction icon={Link2} label="Sync" onClick={onOpenSync} />
                    <HeaderAction icon={Users} label="Sheets" onClick={onOpenRoster} />
                </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <CompactStat label="Players" value={String(playerRows.length)} />
                <CompactStat label="Published" value={String(roomState?.characters.length ?? characters.length)} />
                <CompactStat label="Assignments" value={String(Object.keys(roomState?.playerAssignments ?? {}).length)} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center rounded-xl border border-stone-800 bg-stone-900/60 p-3 text-sm text-stone-400">
                <div>DM Assistant stores only its own metadata. Owlbear and other extensions stay in control of the scene.</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">Sheets {roomState?.characters.length ?? characters.length}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">Links {Object.keys(roomState?.playerAssignments ?? {}).length}</div>
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
        <section className="overflow-hidden rounded-[1.35rem] border border-stone-800 bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(28,25,23,0.94))] shadow-[0_24px_60px_-36px_rgba(15,23,42,0.95)]">
            <div className="flex items-center justify-between border-b border-stone-800/80 px-4 py-3">
                <div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-stone-500">Secondary workspace</div>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight text-parchment">{getPanelLabel(activePanel)}</h3>
                </div>
                <SmallActionButton label="Close" onClick={onClose} />
            </div>
            <div className="max-h-[58vh] overflow-y-auto px-3 py-3">
                {activePanel === 'roster' && (
                    <RosterWorkspace onImportPdf={onImportPdf} onCreateCharacter={onCreateCharacter} onEditCharacter={onEditCharacter} />
                )}
                {activePanel === 'combat' && <CombatWorkspace onEditCharacter={onEditCharacter} />}
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
                    <WorkspaceCard key={character.id}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="font-cinzel text-xl font-bold text-parchment">{character.name || 'Unnamed'}</div>
                                <div className="mt-1 text-sm text-stone-400">
                                    Lv.{character.level} {character.className || 'Adventurer'}{character.race ? ` - ${character.race}` : ''}
                                </div>
                                {character.playerName && (
                                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-stone-500">{character.playerName}</div>
                                )}
                            </div>
                            <SmallActionButton label="Edit" onClick={() => onEditCharacter(character.id)} />
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            <CompactStat label="HP" value={`${character.currentHp}/${character.maxHp}`} />
                            <CompactStat label="AC" value={String(character.ac)} />
                            <CompactStat label="Spells" value={String(character.spells.length)} />
                        </div>
                    </WorkspaceCard>
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
            <WorkspaceCard>
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
            </WorkspaceCard>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <WorkspaceCard>
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
                        <PrimaryActionButton
                            label="Link Selection"
                            onClick={() => void handleLinkSelection()}
                            disabled={!selectedCharacterId || isBusy}
                            className="px-5"
                        />
                    </div>
                    <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-relaxed text-stone-300">
                        DM Assistant only writes to its own metadata. Smoke, Embers, and Owlbear keep owning their own state.
                    </div>

                    {selectedCharacter && smokeVisionProfile && (
                        <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Smoke profile</div>
                                    <div className="mt-2 text-sm font-semibold text-stone-100">{selectedCharacter.name}</div>
                                </div>
                                <SmallActionButton
                                    label="Copy"
                                    icon={Copy}
                                    onClick={() => void handleCopySmokeProfile()}
                                    variant="sky"
                                />
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                <CompactStat label="Range" value={`${smokeVisionProfile.range} ft`} />
                                <CompactStat label="Greyscale" value={smokeVisionProfile.greyscale ? 'Yes' : 'No'} />
                                <CompactStat label="Falloff" value={String(smokeVisionProfile.falloff)} />
                            </div>
                            <div className="mt-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-3 text-sm text-stone-300">
                                In Smoke and Spectre!, use the linked token as owner, set range to {smokeVisionProfile.range} ft, then match greyscale and falloff.
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
                </WorkspaceCard>

                <WorkspaceCard>
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
                            <div key={player.id} className="grid gap-2 rounded-xl border border-stone-800 bg-stone-950/70 px-3 py-2 md:grid-cols-[minmax(0,150px)_1fr] md:items-center">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: player.color }} />
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold text-stone-100">{player.name}</div>
                                        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">{player.id.slice(0, 8)}</div>
                                    </div>
                                </div>
                                <select
                                    value={roomState?.playerAssignments[player.id] ?? ''}
                                    onChange={(event) => {
                                        void handleAssign(player.id, event.target.value || null);
                                    }}
                                    className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-gold"
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
                </WorkspaceCard>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(roomState?.characters ?? []).map((character) => (
                    <WorkspaceCard key={character.id} className="bg-stone-900/60">
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
                    </WorkspaceCard>
                ))}
            </div>
        </div>
    );
}

function CombatWorkspace({
    onEditCharacter,
}: {
    onEditCharacter: (characterId: string) => void;
}) {
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
    const toggleCombatantResource = useCombatStore((state) => state.toggleCombatantResource);
    const useSpellSlot = useCombatStore((state) => state.useSpellSlot);
    const setConcentration = useCombatStore((state) => state.setConcentration);
    const updateCombatant = useCombatStore((state) => state.updateCombatant);
    const [title, setTitle] = useState('');
    const [isBusy, setIsBusy] = useState(false);
    const [selectedConcentrationSpell, setSelectedConcentrationSpell] = useState('');
    const [selectedConditionName, setSelectedConditionName] = useState('Blessed');
    const [customConditionName, setCustomConditionName] = useState('');
    const [conditionDuration, setConditionDuration] = useState('1');
    const [selectedTargetCombatantId, setSelectedTargetCombatantId] = useState('');

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
    const concentrationSpells = useMemo(
        () => (activeCharacter?.spells ?? []).filter((spell) => spell.concentration),
        [activeCharacter],
    );
    const embersTargets = useMemo(
        () => (activeEncounter?.combatants ?? []).filter((combatant) => combatant.id !== activeCombatant?.id),
        [activeCombatant?.id, activeEncounter?.combatants],
    );
    const partyLevel = activeCampaign
        ? characters
            .filter((character) => activeCampaign.partyIds.includes(character.id))
            .reduce((sum, character) => sum + character.level, 0)
        : 0;
    const commonConditions = ['Blessed', 'Charmed', 'Frightened', 'Grappled', 'Invisible', 'Poisoned', 'Prone', 'Restrained', 'Stunned'];

    useEffect(() => {
        if (concentrationSpells.length === 0) {
            setSelectedConcentrationSpell('');
            return;
        }
        setSelectedConcentrationSpell((current) => {
            if (current && concentrationSpells.some((spell) => spell.name === current)) {
                return current;
            }
            return concentrationSpells[0]?.name ?? '';
        });
    }, [concentrationSpells]);

    useEffect(() => {
        if (embersTargets.length === 0) {
            setSelectedTargetCombatantId('');
            return;
        }

        setSelectedTargetCombatantId((current) => {
            if (current && embersTargets.some((combatant) => combatant.id === current)) {
                return current;
            }
            return embersTargets[0]?.id ?? '';
        });
    }, [embersTargets]);

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
            const targetCombatant = embersTargets.find((combatant) => combatant.id === selectedTargetCombatantId) ?? null;
            await triggerEmbersSpellFromCombatant(activeCombatant, spellName, targetCombatant);
        } finally {
            setIsBusy(false);
        }
    };

    const handleToggleResource = async (resource: 'action' | 'bonus' | 'reaction') => {
        if (!activeCombatant) {
            return;
        }
        toggleCombatantResource(activeCombatant.id, resource);
        await OBR.notification.show(`Toggled ${resource} for ${activeCombatant.name}.`, 'SUCCESS');
    };

    const handleUseSpellSlot = async (level: number) => {
        if (!activeCombatant) {
            return;
        }
        useSpellSlot(activeCombatant.id, level);
        await OBR.notification.show(`Spent a level ${level} spell slot for ${activeCombatant.name}.`, 'SUCCESS');
    };

    const handleSetConcentration = async () => {
        if (!activeCombatant || !selectedConcentrationSpell) {
            return;
        }

        const spell = concentrationSpells.find((entry) => entry.name === selectedConcentrationSpell);
        if (!spell) {
            return;
        }

        setConcentration(activeCombatant.id, { spellId: spell.id, name: spell.name });
        await OBR.notification.show(`${activeCombatant.name} is now concentrating on ${spell.name}.`, 'SUCCESS');
    };

    const handleClearConcentration = async () => {
        if (!activeCombatant) {
            return;
        }
        setConcentration(activeCombatant.id, null);
        await OBR.notification.show(`Cleared concentration for ${activeCombatant.name}.`, 'SUCCESS');
    };

    const handleAddCondition = async () => {
        if (!activeCombatant) {
            return;
        }

        const conditionName = (customConditionName.trim() || selectedConditionName.trim());
        if (!conditionName) {
            return;
        }

        const duration = Number(conditionDuration);
        const nextCondition: Condition = {
            id: crypto.randomUUID(),
            name: conditionName,
            type: 'condition',
            duration: Number.isFinite(duration) && duration > 0 ? duration : undefined,
            description: 'Applied from the Owlbear compact combat panel.',
        };
        updateCombatant(activeCombatant.id, {
            conditions: [...activeCombatant.conditions, nextCondition],
        });
        await OBR.notification.show(`Added ${nextCondition.name} to ${activeCombatant.name}.`, 'SUCCESS');
        setCustomConditionName('');
    };

    const handleRemoveCondition = async (conditionId: string, name: string) => {
        if (!activeCombatant) {
            return;
        }
        updateCombatant(activeCombatant.id, {
            conditions: activeCombatant.conditions.filter((condition) => condition.id !== conditionId),
        });
        await OBR.notification.show(`Removed ${name} from ${activeCombatant.name}.`, 'SUCCESS');
    };

    if (!activeEncounter) {
        return (
            <div className="space-y-4">
                <WorkspaceCard>
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
                        <PrimaryActionButton
                            label="Start Empty"
                            onClick={() => void handleCreateEncounter()}
                            className="border border-stone-700 bg-stone-950 text-stone-100 hover:bg-stone-900"
                        />
                        <PrimaryActionButton
                            label="Import Selected"
                            onClick={() => void handleImportSelection()}
                            disabled={isBusy}
                        />
                    </div>
                </WorkspaceCard>
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
            <WorkspaceCard>
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
            </WorkspaceCard>

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
                        <div className="flex flex-wrap gap-2">
                            {activeCharacter && (
                                <SmallActionButton label="Open Sheet" onClick={() => onEditCharacter(activeCharacter.id)} variant="sky" />
                            )}
                            <SmallActionButton label="Damage 5" onClick={() => damageCombatant(activeCombatant.id, 5)} variant="danger" />
                            <SmallActionButton label="Heal 5" onClick={() => healCombatant(activeCombatant.id, 5)} variant="success" />
                        </div>
                    </div>
                    {activeCharacter && embersReadySpells.length > 0 && (
                        <div className="mt-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-gold">Embers-ready spells</div>
                            <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px]">
                                <div className="text-xs text-stone-400">
                                    Embers uses the active combatant as caster and the selected target below for effect direction.
                                </div>
                                <select
                                    value={selectedTargetCombatantId}
                                    onChange={(event) => setSelectedTargetCombatantId(event.target.value)}
                                    className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                                >
                                    {embersTargets.length === 0 && <option value="">No other combatant</option>}
                                    {embersTargets.map((combatant) => (
                                        <option key={combatant.id} value={combatant.id}>
                                            {combatant.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {embersReadySpells.slice(0, 6).map((spell) => (
                                    <SmallActionButton
                                        key={spell.id}
                                        label={spell.name}
                                        onClick={() => void handleCastActiveSpell(spell.name)}
                                        disabled={isBusy}
                                        variant="gold"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="mt-4 grid gap-4 xl:grid-cols-3">
                        <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Action economy</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <SmallActionButton label="Action" onClick={() => void handleToggleResource('action')} variant={activeCombatant.hasAction ? 'success' : 'neutral'} />
                                <SmallActionButton label="Bonus" onClick={() => void handleToggleResource('bonus')} variant={activeCombatant.hasBonusAction ? 'success' : 'neutral'} />
                                <SmallActionButton label="Reaction" onClick={() => void handleToggleResource('reaction')} variant={activeCombatant.hasReaction ? 'success' : 'neutral'} />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Concentration</div>
                            {activeCombatant.concentratingOn ? (
                                <div className="mt-3 space-y-3">
                                    <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
                                        {activeCombatant.concentratingOn.name}
                                    </div>
                                    <SmallActionButton label="Clear" onClick={() => void handleClearConcentration()} variant="danger" />
                                </div>
                            ) : concentrationSpells.length > 0 ? (
                                <div className="mt-3 space-y-3">
                                    <select
                                        value={selectedConcentrationSpell}
                                        onChange={(event) => setSelectedConcentrationSpell(event.target.value)}
                                        className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                                    >
                                        {concentrationSpells.map((spell) => (
                                            <option key={spell.id} value={spell.name}>
                                                {spell.name}
                                            </option>
                                        ))}
                                    </select>
                                    <SmallActionButton label="Set" onClick={() => void handleSetConcentration()} variant="sky" />
                                </div>
                            ) : (
                                <div className="mt-3 text-sm text-stone-500">No concentration spells on the linked sheet.</div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Spell slots</div>
                            {activeCombatant.spellSlots && activeCombatant.spellSlots.some((slot, index) => index > 0 && slot.max > 0) ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {activeCombatant.spellSlots.map((slot, index) => {
                                        if (index === 0 || slot.max <= 0) {
                                            return null;
                                        }
                                        return (
                                            <SmallActionButton
                                                key={index}
                                                label={`L${index} ${slot.current}/${slot.max}`}
                                                onClick={() => void handleUseSpellSlot(index)}
                                                variant="gold"
                                            />
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="mt-3 text-sm text-stone-500">No tracked spell slots for this combatant.</div>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Conditions</div>
                            <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_90px_auto]">
                                <select
                                    value={selectedConditionName}
                                    onChange={(event) => setSelectedConditionName(event.target.value)}
                                    className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                                >
                                    {commonConditions.map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    min="0"
                                    value={conditionDuration}
                                    onChange={(event) => setConditionDuration(event.target.value)}
                                    className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                                    placeholder="Rounds"
                                />
                                <SmallActionButton label="Add" onClick={() => void handleAddCondition()} variant="sky" className="rounded-xl" />
                            </div>
                            <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_repeat(4,auto)]">
                                <input
                                    value={customConditionName}
                                    onChange={(event) => setCustomConditionName(event.target.value)}
                                    placeholder="Custom condition name"
                                    className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none transition-colors focus:border-gold"
                                />
                                {[1, 3, 10, 60].map((rounds) => (
                                    <SmallActionButton
                                        key={rounds}
                                        label={`${rounds}r`}
                                        onClick={() => setConditionDuration(String(rounds))}
                                        variant={conditionDuration === String(rounds) ? 'gold' : 'neutral'}
                                        className="rounded-xl"
                                    />
                                ))}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {activeCombatant.conditions.length === 0 && (
                                    <div className="text-sm text-stone-500">No active conditions.</div>
                                )}
                                {activeCombatant.conditions.map((condition) => (
                                    <SmallActionButton
                                        key={condition.id}
                                        label={`${condition.name}${condition.duration ? ` (${condition.duration})` : ''}`}
                                        onClick={() => void handleRemoveCondition(condition.id, condition.name)}
                                        variant="danger"
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Turn notes</div>
                            <div className="mt-3 space-y-2 text-sm text-stone-400">
                                <div>Use the action buttons above to mark spent economy on the current turn.</div>
                                <div>Removing a condition from this panel clears it immediately from the combatant.</div>
                                <div>Concentration and spell slot changes here sync against the combat encounter state.</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end">
                <SmallActionButton label="Clear Combatants" onClick={clearCombatants} variant="danger" />
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
                            <SmallActionButton label="-5" onClick={() => damageCombatant(combatant.id, 5)} variant="danger" className="rounded-xl" />
                            <SmallActionButton label="+5" onClick={() => healCombatant(combatant.id, 5)} variant="success" className="rounded-xl" />
                            <SmallActionButton label="Remove" onClick={() => void handleRemoveCombatant(combatant)} variant="danger" className="rounded-xl" />
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
            <WorkspaceCard>
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
                    <PrimaryActionButton label="Create" icon={Plus} onClick={() => void handleCreate()} />
                </div>
            </WorkspaceCard>

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
            <WorkspaceCard>
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
                    <PrimaryActionButton
                        label="Long Rest Party"
                        icon={SunMoon}
                        onClick={() => void handlePartyLongRest()}
                        disabled={party.length === 0}
                    />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <CompactStat label="Members" value={String(party.length)} />
                    <CompactStat label="Party HP" value={`${totalCurrentHp}/${totalMaxHp || 0}`} />
                    <CompactStat label="Condition" value={party.length === 0 ? 'Idle' : totalMaxHp > 0 ? `${Math.round((totalCurrentHp / totalMaxHp) * 100)}%` : 'Ready'} />
                </div>
            </WorkspaceCard>

            {party.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-800 p-4 text-sm text-stone-500">
                    Add characters to the active campaign to use camp automation here.
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {party.map((character) => (
                        <WorkspaceCard key={character.id}>
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
                                <SmallActionButton label="Short Rest" icon={Moon} onClick={() => void handleShortRest(character)} variant="sky" className="rounded-xl py-2.5 text-sm normal-case tracking-[0.08em]" />
                                <SmallActionButton label="Long Rest" icon={SunMoon} onClick={() => void handleLongRest(character)} variant="gold" className="rounded-xl py-2.5 text-sm normal-case tracking-[0.08em]" />
                            </div>
                        </WorkspaceCard>
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
            <WorkspaceCard>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-gold">
                            <CalendarClock size={16} />
                            <div className="text-[11px] font-black uppercase tracking-[0.22em]">Navigator and notes</div>
                        </div>
                        <div className="mt-2 font-cinzel text-2xl font-bold text-parchment">{activeCampaign?.title || 'No active campaign'}</div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                        <SmallActionButton label="+10 min" onClick={() => void handleAdvanceTime(10)} variant="sky" />
                        <SmallActionButton label="+1 hour" onClick={() => void handleAdvanceTime(60)} variant="sky" />
                        <SmallActionButton label="+8 hours" onClick={() => void handleAdvanceTime(480)} variant="sky" />
                    </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    <CompactStat label="Clock" value={timeLabel} />
                    <CompactStat label="Notes" value={String(notes.length)} />
                    <CompactStat label="NPCs" value={String(activeCampaign?.npcs.length ?? 0)} />
                    <CompactStat label="Locations" value={String(activeCampaign?.locations.length ?? 0)} />
                </div>
            </WorkspaceCard>

            <WorkspaceCard>
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
                    <PrimaryActionButton label="Save Note" icon={ScrollText} onClick={() => void handleAddNote()} />
                </div>
            </WorkspaceCard>

            <div className="grid gap-3">
                {notes.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-stone-800 p-4 text-sm text-stone-500">
                        No campaign notes yet. Save quick notes here instead of leaving Owlbear to update another app screen.
                    </div>
                )}
                {notes.slice(0, 6).map((note) => (
                    <WorkspaceCard key={note.id}>
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
                    </WorkspaceCard>
                ))}
            </div>
        </div>
    );
}
