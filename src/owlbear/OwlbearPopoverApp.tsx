import { useCallback, useEffect, useState } from 'react';
import OBR, { type Player } from '@owlbear-rodeo/sdk';
import { AlertTriangle, Heart, RefreshCw, Shield, Sparkles, Users } from 'lucide-react';
import { resolvePlayerCharacter } from './bridge';
import { triggerEmbersSpellFromCharacter } from './integrations';
import { OwlbearWorkbenchApp } from './OwlbearWorkbenchApp';
import { type OwlbearRoomState, type PlayerCharacterResolution, getRoomStateFromMetadata } from './shared';
import { PlayerCharacterSheet } from '../components/player/PlayerCharacterSheet';

export function OwlbearPopoverApp() {
    const [role, setRole] = useState<'GM' | 'PLAYER' | null>(null);
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [roomState, setRoomState] = useState<OwlbearRoomState | null>(null);
    const [playerCharacter, setPlayerCharacter] = useState<PlayerCharacterResolution | null>(null);

    const refresh = useCallback(async () => {
        const nextRole = await OBR.player.getRole();
        const [playersResult, metadataResult, characterResult] = await Promise.allSettled([
            OBR.party.getPlayers(),
            OBR.room.getMetadata(),
            nextRole === 'PLAYER' ? resolvePlayerCharacter() : Promise.resolve(null),
        ]);

        const nextPlayers = playersResult.status === 'fulfilled' ? playersResult.value : [];
        const nextRoomState = metadataResult.status === 'fulfilled'
            ? getRoomStateFromMetadata(metadataResult.value)
            : null;
        setRole(nextRole);
        setPlayers(nextPlayers);
        setRoomState(nextRoomState);
        setPlayerCharacter(nextRole === 'PLAYER' && characterResult.status === 'fulfilled' ? characterResult.value : null);

        await Promise.all([
            OBR.action.setWidth(nextRole === 'GM' ? 560 : 460),
            OBR.action.setHeight(nextRole === 'GM' ? 760 : 720),
            OBR.action.setBadgeText(
                nextRoomState?.activeEncounter ? String(nextRoomState.activeEncounter.combatants.length) : undefined,
            ),
        ]);
    }, []);

    const runRefresh = useCallback(async (): Promise<boolean> => {
        try {
            await refresh();
            setLoadError(null);
            setLoadState('ready');
            return true;
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : 'Failed to connect to Owlbear Rodeo.');
            setLoadState('error');
            return false;
        }
    }, [refresh]);

    useEffect(() => {
        if (!OBR.isAvailable) {
            return;
        }

        let isDisposed = false;
        let cleanups: Array<() => void> = [];
        OBR.onReady(async () => {
            if (isDisposed) {
                return;
            }

            const connected = await runRefresh();
            if (!connected || isDisposed) {
                return;
            }

            cleanups = [
                OBR.party.onChange(() => {
                    void runRefresh();
                }),
                OBR.room.onMetadataChange(() => {
                    void runRefresh();
                }),
                OBR.player.onChange(() => {
                    void runRefresh();
                }),
            ];
        });

        return () => {
            isDisposed = true;
            cleanups.forEach((cleanup) => cleanup());
        };
    }, [runRefresh]);

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

    if (loadState === 'error') {
        return (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_28%),linear-gradient(180deg,_rgba(10,10,10,0.98),_rgba(17,24,39,0.98))] p-4 text-stone-100">
                <ConnectionErrorCard
                    error={loadError}
                    onRetry={() => {
                        setLoadState('loading');
                        setLoadError(null);
                        void runRefresh();
                    }}
                />
            </div>
        );
    }

    if (loadState === 'loading' || role === null) {
        return (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_28%),linear-gradient(180deg,_rgba(10,10,10,0.98),_rgba(17,24,39,0.98))] p-4 text-stone-100">
                <LoadingPopoverCard />
            </div>
        );
    }

    if (role === 'GM') {
        return (
            <div className="h-screen bg-stone-950 text-stone-100">
                <OwlbearWorkbenchApp />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_28%),linear-gradient(180deg,_rgba(10,10,10,0.98),_rgba(17,24,39,0.98))] p-4 text-stone-100">
            <PlayerPopoverView playerCount={players.filter((player) => player.role === 'PLAYER').length} roomState={roomState} resolution={playerCharacter} />
        </div>
    );
}

function LoadingPopoverCard() {
    return (
        <div className="rounded-[1.75rem] border border-stone-800 bg-stone-950/80 p-6">
            <div className="flex items-center gap-2 text-gold">
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-[11px] font-black uppercase tracking-[0.28em]">Connecting</span>
            </div>
            <h1 className="mt-3 font-cinzel text-3xl font-bold text-parchment">Loading Owlbear workspace</h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
                DM Assistant is checking your Owlbear room role, current scene state, and linked sheets before deciding whether to open the GM workspace or player sheet.
            </p>
        </div>
    );
}

function ConnectionErrorCard({ error, onRetry }: { error: string | null; onRetry: () => void }) {
    return (
        <div className="rounded-[1.75rem] border border-amber-500/20 bg-stone-950/80 p-6">
            <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle size={16} />
                <span className="text-[11px] font-black uppercase tracking-[0.28em]">Connection issue</span>
            </div>
            <h1 className="mt-3 font-cinzel text-3xl font-bold text-parchment">DM Assistant could not finish loading</h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
                {error || 'The extension could not finish connecting to Owlbear Rodeo. Retrying usually fixes startup timing issues.'}
            </p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400"
            >
                <RefreshCw size={16} />
                Retry connection
            </button>
        </div>
    );
}

function PlayerPopoverView({
    playerCount,
    roomState,
    resolution,
}: {
    playerCount: number;
    roomState: OwlbearRoomState | null;
    resolution: PlayerCharacterResolution | null;
}) {
    const [castingSpellId, setCastingSpellId] = useState<string | null>(null);

    if (!resolution || resolution.source === 'none') {
        return (
            <div className="rounded-[1.75rem] border border-stone-800 bg-stone-950/80 p-6">
                <div className="flex items-center gap-2 text-gold">
                    <Users size={16} />
                    <span className="text-[11px] font-black uppercase tracking-[0.28em]">Player Sheet</span>
                </div>
                <h1 className="mt-3 font-cinzel text-3xl font-bold text-parchment">No linked character yet</h1>
                <p className="mt-3 text-sm leading-relaxed text-stone-400">
                    Ask your GM to assign your character in the DM Assistant sync panel or link your token to a character sheet. If your token is already linked,
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
                <section className="grid grid-cols-3 gap-3">
                    <MiniStat label="Players" value={playerCount} icon={Users} accent="text-emerald-300" />
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
    const preparedSpells = character.spells.filter((spell) => spell.prepared);

    const handleCastSpell = async (spellId: string, spellName: string) => {
        setCastingSpellId(spellId);
        try {
            await triggerEmbersSpellFromCharacter(character, spellName);
        } finally {
            setCastingSpellId(null);
        }
    };

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

            <section className="grid grid-cols-4 gap-3">
                <MiniStat label="Players" value={playerCount} icon={Users} accent="text-emerald-300" />
                <MiniStat label="HP" value={character.currentHp} suffix={`/ ${character.maxHp}`} icon={Heart} accent="text-rose-300" />
                <MiniStat label="AC" value={character.ac} icon={Shield} accent="text-amber-300" />
                <MiniStat label="Prof" value={character.proficiencyBonus} prefix="+" icon={Sparkles} accent="text-sky-300" />
            </section>

            <section className="rounded-3xl border border-stone-800 bg-stone-950/75">
                <PlayerCharacterSheet character={character} canEdit={false} />
            </section>

            <section className="rounded-3xl border border-stone-800 bg-stone-950/75 p-4">
                <h2 className="font-cinzel text-lg font-bold text-parchment">Prepared spells</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                    Select a target token on the map, then cast a mapped spell effect through Embers from here.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {preparedSpells.length === 0 && <span className="text-sm text-stone-500">No prepared spells tracked.</span>}
                    {preparedSpells.slice(0, 16).map((spell) => (
                        <button
                            key={spell.id}
                            type="button"
                            onClick={() => void handleCastSpell(spell.id, spell.name)}
                            disabled={castingSpellId === spell.id}
                            className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs text-gold transition-colors hover:border-gold/50 hover:bg-gold/15 disabled:opacity-50"
                        >
                            {castingSpellId === spell.id ? `Casting ${spell.name}...` : spell.name}
                        </button>
                    ))}
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
