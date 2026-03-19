/**
 * Player View — Main page for connected players
 *
 * Three-panel layout (collapsible left + right):
 *   Left:   Own character sheet
 *   Center: Live battle map
 *   Right:  Dice roller + chat
 *
 * The map panel grows to fill all available space when side panels collapse.
 */

import { useMemo, useState } from 'react';
import { Wifi, WifiOff, Loader, LogOut, Swords, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../multiplayer/sessionStore';
import { useCharacterStore } from '../store/characterStore';
import { PlayerCharacterSheet } from '../components/player/PlayerCharacterSheet';
import { PlayerMapView } from '../components/player/PlayerMapView';
import { PlayerDiceChat } from '../components/player/PlayerDiceChat';
import { stopSync } from '../multiplayer/syncMiddleware';

export function PlayerView() {
    const navigate = useNavigate();
    const {
        isMultiplayer, connectionStatus, room, player, leaveSession,
        // The session store receives state:sync from the server and stores the map here
        mapData,
        presentation,
    } = useSessionStore();

    const characters = useCharacterStore((s) => s.characters);
    const [sheetOpen, setSheetOpen] = useState(true);
    const [chatOpen, setChatOpen] = useState(true);

    const myCharacter = useMemo(() => {
        if (!player?.characterId) return null;
        return characters.find((c) => c.id === player.characterId) ?? null;
    }, [characters, player?.characterId]);

    const handleLeave = () => {
        stopSync();
        leaveSession();
        navigate('/lobby');
    };

    if (!isMultiplayer) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-stone-400 mb-4">Not connected to a session.</p>
                    <button
                        onClick={() => navigate('/lobby')}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg"
                    >
                        Go to Lobby
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-stone-950 text-stone-100 overflow-hidden">
            {/* ── Top Bar ─────────────────────────────────────── */}
            <header className="flex items-center justify-between px-4 py-2 bg-stone-900 border-b border-stone-700/50 shrink-0">
                <div className="flex items-center gap-3">
                    <Swords className="w-4 h-4 text-amber-400" />
                    <div>
                        <div className="text-sm font-semibold text-stone-200">
                            {myCharacter?.name ?? player?.name ?? 'Player'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                            {presentation?.mode === 'combat'
                                ? `Live combat${presentation.encounterTitle ? ` • ${presentation.encounterTitle}` : ''}`
                                : presentation?.mode === 'navigator'
                                ? `${presentation.sceneTitle ?? 'Exploration'}${presentation.floorLabel ? ` • ${presentation.floorLabel}` : ''}`
                                : presentation?.mode === 'blackout'
                                ? 'The DM has hidden the table display'
                                : 'Waiting for the next scene'}
                        </div>
                    </div>
                    {room?.code && (
                        <span className="text-xs bg-stone-800 px-2 py-0.5 rounded text-stone-500 font-mono">
                            {room.code}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Connection indicator */}
                    <div className="flex items-center gap-1.5 text-xs">
                        {connectionStatus === 'connected' ? (
                            <><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Connected</span></>
                        ) : connectionStatus === 'connecting' ? (
                            <><Loader className="w-3 h-3 text-amber-400 animate-spin" /><span className="text-amber-400">Reconnecting…</span></>
                        ) : (
                            <><WifiOff className="w-3 h-3 text-red-400" /><span className="text-red-400">Disconnected</span></>
                        )}
                    </div>
                    <button
                        onClick={handleLeave}
                        className="flex items-center gap-1 text-stone-500 hover:text-red-400 text-xs transition-colors"
                        title="Leave session"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Leave
                    </button>
                </div>
            </header>

            {/* ── Main Three-Panel Layout ──────────────────────── */}
            <div className="flex-1 flex min-h-0">

                {/* Left: Character Sheet — collapsible */}
                <div className={`relative flex shrink-0 transition-all duration-200 ${sheetOpen ? 'w-72' : 'w-8'}`}>
                    {sheetOpen && (
                        <div className="flex-1 bg-stone-900/40 border-r border-stone-700/30 overflow-y-auto">
                            <div className="px-3 py-2 border-b border-stone-700/30 sticky top-0 bg-stone-900 z-10">
                                <h2 className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">
                                    Character Sheet
                                </h2>
                            </div>
                            <PlayerCharacterSheet
                                character={myCharacter}
                                canEdit={player?.canEditSheet ?? false}
                            />
                        </div>
                    )}
                    {/* Toggle tab */}
                    <button
                        onClick={() => setSheetOpen(!sheetOpen)}
                        className="absolute top-1/2 -translate-y-1/2 -right-3 z-20 w-6 h-10
                                   bg-stone-800 border border-stone-700 rounded-r-lg
                                   flex items-center justify-center text-stone-500 hover:text-stone-200 transition-colors"
                        title={sheetOpen ? 'Collapse sheet' : 'Expand sheet'}
                    >
                        {sheetOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                </div>

                {/* Center: Map — takes all remaining space */}
                <div className="flex-1 min-w-0 flex">
                    <PlayerMapView mapData={mapData ?? null} />
                </div>

                {/* Right: Dice + Chat — collapsible */}
                <div className={`relative flex shrink-0 transition-all duration-200 ${chatOpen ? 'w-72' : 'w-8'}`}>
                    {/* Toggle tab */}
                    <button
                        onClick={() => setChatOpen(!chatOpen)}
                        className="absolute top-1/2 -translate-y-1/2 -left-3 z-20 w-6 h-10
                                   bg-stone-800 border border-stone-700 rounded-l-lg
                                   flex items-center justify-center text-stone-500 hover:text-stone-200 transition-colors"
                        title={chatOpen ? 'Collapse chat' : 'Expand chat'}
                    >
                        {chatOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                    </button>
                    {chatOpen && (
                        <div className="flex-1 bg-stone-900/40 border-l border-stone-700/30 overflow-hidden">
                            <PlayerDiceChat />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
