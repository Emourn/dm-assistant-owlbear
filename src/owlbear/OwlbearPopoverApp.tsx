import { useCallback, useEffect, useMemo, useState } from 'react';
import OBR, { type Player } from '@owlbear-rodeo/sdk';
import {
    BookOpen,
    Crosshair,
    Heart,
    Link2,
    ScrollText,
    Shield,
    Sparkles,
    Swords,
    Users,
} from 'lucide-react';
import { publishRoomStateFromStores, resolvePlayerCharacter } from './bridge';
import { openWorkbench, stashPendingTokenImport } from './host';
import { type OwlbearRoomState, type PlayerCharacterResolution, getRoomStateFromMetadata } from './shared';

export function OwlbearPopoverApp() {
    const [role, setRole] = useState<'GM' | 'PLAYER' | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [roomState, setRoomState] = useState<OwlbearRoomState | null>(null);
    const [selectionCount, setSelectionCount] = useState(0);
    const [playerCharacter, setPlayerCharacter] = useState<PlayerCharacterResolution | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    const playerCount = useMemo(
        () => players.filter((player) => player.role === 'PLAYER').length,
        [players],
    );

    const refresh = useCallback(async () => {
        const [nextRole, nextPlayers, metadata, selection] = await Promise.all([
            OBR.player.getRole(),
            OBR.party.getPlayers(),
            OBR.room.getMetadata(),
            OBR.player.getSelection(),
        ]);

        const nextRoomState = getRoomStateFromMetadata(metadata);
        setRole(nextRole);
        setPlayers(nextPlayers);
        setRoomState(nextRoomState);
        setSelectionCount(selection?.length ?? 0);

        if (nextRole === 'PLAYER') {
            setPlayerCharacter(await resolvePlayerCharacter());
        }

        await OBR.action.setWidth(440);
        await OBR.action.setHeight(nextRole === 'GM' ? 680 : 720);
        await OBR.action.setBadgeText(
            nextRoomState?.activeEncounter ? String(nextRoomState.activeEncounter.combatants.length) : undefined,
        );
    }, []);

    useEffect(() => {
        if (!OBR.isAvailable) {
            return;
        }

        let cleanups: Array<() => void> = [];
        const setup = async () => {
            await refresh();
            cleanups = [
                OBR.party.onChange((nextPlayers) => setPlayers(nextPlayers)),
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

    const handleOpenWorkbench = async (hash = '#/') => {
        setIsBusy(true);
        try {
            await openWorkbench(hash);
        } finally {
            setIsBusy(false);
        }
    };

    const handleImportSelection = async () => {
        const selection = await OBR.player.getSelection();
        if (!selection?.length) {
            await OBR.notification.show('Select one or more Owlbear tokens first.', 'WARNING');
            return;
        }

        const items = await OBR.scene.items.getItems(selection);
        stashPendingTokenImport(items, 'popover');
        await handleOpenWorkbench('#/combat');
    };

    const handlePublish = async () => {
        setIsBusy(true);
        try {
            const next = await publishRoomStateFromStores();
            setRoomState(next);
            await OBR.notification.show('Published room state.', 'SUCCESS');
        } finally {
            setIsBusy(false);
        }
    };

    if (!OBR.isAvailable) {
        return (
            <div className="min-h-screen bg-stone-950 p-6 text-stone-100">
                <div className="rounded-3xl border border-stone-800 bg-stone-900/70 p-6">
                    <h1 className="font-cinzel text-2xl font-bold text-gold">DM Assistant</h1>
                    <p className="mt-3 text-sm text-stone-400">
                        This entry point is meant to run inside Owlbear Rodeo as an extension popover.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_28%),linear-gradient(180deg,_rgba(10,10,10,0.98),_rgba(17,24,39,0.98))] p-4 text-stone-100">
            {role === 'PLAYER' ? (
                <PlayerPopoverView roomState={roomState} resolution={playerCharacter} />
            ) : (
                <div className="space-y-4">
                    <section className="rounded-[1.75rem] border border-gold/20 bg-stone-950/80 p-5 shadow-[0_25px_70px_-45px_rgba(245,158,11,0.5)]">
                        <div className="flex items-center gap-2 text-gold">
                            <Sparkles size={16} />
                            <span className="text-[11px] font-black uppercase tracking-[0.28em]">GM Control Hub</span>
                        </div>
                        <h1 className="mt-3 font-cinzel text-3xl font-bold text-parchment">DM Assistant</h1>
                        <p className="mt-2 text-sm leading-relaxed text-stone-400">
                            Owlbear keeps the tabletop. DM Assistant handles sheets, campaign state, token-linked rosters, and combat automation around it.
                        </p>
                    </section>

                    <section className="grid grid-cols-2 gap-3">
                        <MiniStat label="Campaigns" value={roomState?.campaigns.length ?? 0} icon={ScrollText} accent="text-blue-300" />
                        <MiniStat label="Players" value={playerCount} icon={Users} accent="text-emerald-300" />
                        <MiniStat label="Selection" value={selectionCount} icon={Crosshair} accent="text-amber-300" />
                        <MiniStat label="Encounter" value={roomState?.activeEncounter?.combatants.length ?? 0} icon={Swords} accent="text-rose-300" />
                    </section>

                    <section className="rounded-3xl border border-stone-800 bg-stone-950/75 p-4">
                        <div className="grid gap-3">
                            <button
                                type="button"
                                onClick={() => void handleOpenWorkbench('#/')}
                                disabled={isBusy}
                                className="inline-flex items-center justify-between rounded-2xl bg-gold px-4 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
                            >
                                <span>Open DM Workbench</span>
                                <BookOpen size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleImportSelection()}
                                disabled={isBusy}
                                className="inline-flex items-center justify-between rounded-2xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-100 transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
                            >
                                <span>Import Selected Tokens</span>
                                <Swords size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleOpenWorkbench('#/room')}
                                disabled={isBusy}
                                className="inline-flex items-center justify-between rounded-2xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-100 transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
                            >
                                <span>Link Tokens & Assign Players</span>
                                <Link2 size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => void handlePublish()}
                                disabled={isBusy}
                                className="inline-flex items-center justify-between rounded-2xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-100 transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-50"
                            >
                                <span>Publish Room State</span>
                                <Shield size={16} />
                            </button>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-stone-800 bg-stone-950/75 p-4">
                        <h2 className="font-cinzel text-lg font-bold text-parchment">Active room</h2>
                        <div className="mt-4 space-y-3 text-sm">
                            <Row label="Active campaign" value={roomState?.campaigns.find((campaign) => campaign.id === roomState?.activeCampaignId)?.title ?? 'None'} />
                            <Row label="Encounter" value={roomState?.activeEncounter?.title ?? 'No active encounter'} />
                            <Row label="Compatibility" value="Smoke & Specter!, Embers, and other visual extensions remain non-destructively compatible." />
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

function PlayerPopoverView({
    roomState,
    resolution,
}: {
    roomState: OwlbearRoomState | null;
    resolution: PlayerCharacterResolution | null;
}) {
    if (!resolution || resolution.source === 'none') {
        return (
            <div className="rounded-[1.75rem] border border-stone-800 bg-stone-950/80 p-6">
                <div className="flex items-center gap-2 text-gold">
                    <Users size={16} />
                    <span className="text-[11px] font-black uppercase tracking-[0.28em]">Player Sheet</span>
                </div>
                <h1 className="mt-3 font-cinzel text-3xl font-bold text-parchment">No linked character yet</h1>
                <p className="mt-3 text-sm leading-relaxed text-stone-400">
                    Ask your GM to assign your character in the DM Assistant room panel or link your token to a character sheet. If your token is already linked,
                    select it on the tabletop and open this extension again.
                </p>
            </div>
        );
    }

    if (!resolution.snapshot && resolution.summary) {
        return (
            <div className="space-y-4">
                <section className="rounded-[1.75rem] border border-gold/20 bg-stone-950/80 p-5">
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-gold">Assigned character</div>
                    <h1 className="mt-3 font-cinzel text-3xl font-bold text-parchment">{resolution.summary.name}</h1>
                    <p className="mt-1 text-sm text-stone-400">
                        Lv.{resolution.summary.level} {resolution.summary.className || 'Adventurer'}
                    </p>
                </section>
                <section className="grid grid-cols-2 gap-3">
                    <MiniStat label="HP" value={resolution.summary.currentHp} suffix={`/ ${resolution.summary.maxHp}`} icon={Heart} accent="text-rose-300" />
                    <MiniStat label="AC" value={resolution.summary.ac} icon={Shield} accent="text-amber-300" />
                </section>
                <section className="rounded-3xl border border-stone-800 bg-stone-950/75 p-4 text-sm leading-relaxed text-stone-400">
                    Your GM assigned you a character, but no full linked token sheet is available in the current scene yet. Ask them to link your Owlbear token on the tabletop for a full read-only sheet.
                </section>
            </div>
        );
    }

    const character = resolution.snapshot!;
    return (
        <div className="space-y-4">
            <section className="rounded-[1.75rem] border border-gold/20 bg-stone-950/80 p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.28em] text-gold">Player sheet</div>
                        <h1 className="mt-3 font-cinzel text-3xl font-bold text-parchment">{character.name || 'Unnamed'}</h1>
                        <p className="mt-1 text-sm text-stone-400">
                            Lv.{character.level} {character.className || 'Adventurer'}{character.race ? ` · ${character.race}` : ''}
                        </p>
                    </div>
                    <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">
                        {resolution.source === 'selected-token' ? 'Selected token' : 'Assigned token'}
                    </span>
                </div>
            </section>

            <section className="grid grid-cols-3 gap-3">
                <MiniStat label="HP" value={character.currentHp} suffix={`/ ${character.maxHp}`} icon={Heart} accent="text-rose-300" />
                <MiniStat label="AC" value={character.ac} icon={Shield} accent="text-amber-300" />
                <MiniStat label="Prof" value={character.proficiencyBonus} prefix="+" icon={Sparkles} accent="text-sky-300" />
            </section>

            <section className="rounded-3xl border border-stone-800 bg-stone-950/75 p-4">
                <h2 className="font-cinzel text-lg font-bold text-parchment">Ability scores</h2>
                <div className="mt-4 grid grid-cols-3 gap-3">
                    {Object.entries(character.abilityScores).map(([ability, score]) => (
                        <div key={ability} className="rounded-2xl border border-stone-800 bg-stone-900/70 p-3 text-center">
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-stone-500">{ability}</div>
                            <div className="mt-2 font-cinzel text-2xl font-bold text-parchment">{score}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-3xl border border-stone-800 bg-stone-950/75 p-4">
                <h2 className="font-cinzel text-lg font-bold text-parchment">Skills & conditions</h2>
                <div className="mt-4 grid gap-3">
                    <div className="flex flex-wrap gap-2">
                        {character.conditions.length === 0 && <span className="text-sm text-stone-500">No active conditions.</span>}
                        {character.conditions.map((condition) => (
                            <span
                                key={condition.id}
                                className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold"
                            >
                                {condition.name}
                            </span>
                        ))}
                    </div>
                    <div className="grid gap-2">
                        {character.skills.slice(0, 8).map((skill) => (
                            <div key={skill.name} className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm">
                                <span className="text-stone-300">{skill.name}</span>
                                <span className="font-semibold text-stone-100">
                                    {skill.bonus >= 0 ? '+' : ''}
                                    {skill.bonus}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-stone-800 bg-stone-950/75 p-4">
                <h2 className="font-cinzel text-lg font-bold text-parchment">Spell slots & resources</h2>
                <div className="mt-4 space-y-3 text-sm">
                    {character.spellSlots
                        .map((slot, index) => ({ ...slot, level: index }))
                        .filter((slot) => slot.level > 0 && slot.max > 0)
                        .map((slot) => (
                            <div key={slot.level} className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-2">
                                <span className="text-stone-300">Level {slot.level}</span>
                                <span className="font-semibold text-stone-100">{slot.current}/{slot.max}</span>
                            </div>
                        ))}
                    {character.resources.map((resource) => (
                        <div key={resource.id} className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-2">
                            <span className="text-stone-300">{resource.name}</span>
                            <span className="font-semibold text-stone-100">{resource.current}/{resource.max}</span>
                        </div>
                    ))}
                    {character.resources.length === 0 && character.spellSlots.every((slot) => slot.max === 0) && (
                        <div className="text-sm text-stone-500">No tracked spell slots or resources.</div>
                    )}
                </div>
            </section>

            <section className="rounded-3xl border border-stone-800 bg-stone-950/75 p-4">
                <h2 className="font-cinzel text-lg font-bold text-parchment">Prepared tools</h2>
                <div className="mt-4 space-y-3">
                    <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Inventory</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {character.inventory.length === 0 && <span className="text-sm text-stone-500">No tracked inventory.</span>}
                            {character.inventory.slice(0, 10).map((item) => (
                                <span key={item.id} className="rounded-full border border-stone-700 bg-stone-900 px-3 py-1 text-xs text-stone-200">
                                    {item.name}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-500">Prepared spells</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {character.spells.filter((spell) => spell.prepared).length === 0 && <span className="text-sm text-stone-500">No prepared spells tracked.</span>}
                            {character.spells
                                .filter((spell) => spell.prepared)
                                .slice(0, 12)
                                .map((spell) => (
                                    <span key={spell.id} className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs text-gold">
                                        {spell.name}
                                    </span>
                                ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-stone-800 bg-stone-950/75 p-4 text-sm leading-relaxed text-stone-400">
                <div className="font-semibold text-stone-200">Room note</div>
                <p className="mt-2">
                    This player view reads sheets from token-linked metadata so the GM can keep Owlbear as the tabletop source of truth while still sharing character sheets inside the room.
                </p>
                {roomState?.activeEncounter && (
                    <p className="mt-2">
                        Active encounter: <span className="font-semibold text-stone-100">{roomState.activeEncounter.title}</span>
                    </p>
                )}
            </section>
        </div>
    );
}

function MiniStat({
    label,
    value,
    icon: Icon,
    accent,
    prefix = '',
    suffix = '',
}: {
    label: string;
    value: number;
    icon: typeof Sparkles;
    accent: string;
    prefix?: string;
    suffix?: string;
}) {
    return (
        <div className="rounded-3xl border border-stone-800 bg-stone-950/75 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">{label}</div>
                    <div className="mt-2 font-cinzel text-3xl font-bold text-parchment">
                        {prefix}{value}{suffix}
                    </div>
                </div>
                <Icon className={accent} size={18} />
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">{label}</div>
            <div className="mt-1 text-sm leading-relaxed text-stone-100">{value}</div>
        </div>
    );
}
