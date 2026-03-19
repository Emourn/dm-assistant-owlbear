/**
 * Session Lobby — Entry point for multiplayer
 * 
 * DM can create a session, players can join with a room code.
 * Both roles land here first before being routed to their respective views.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Users, Copy, Check, Wifi, WifiOff, Loader, AlertTriangle } from 'lucide-react';
import { useSessionStore } from '../multiplayer/sessionStore';
import { useCharacterStore } from '../store/characterStore';
import { useCombatStore } from '../store/combatStore';
import { useNavigatorStore } from '../store/navigatorStore';
import {
    registerStoresForSync,
    startDMSync,
    startPlayerSync,
    pushInitialState,
} from '../multiplayer/syncMiddleware';
import { fetchMultiplayerJson } from '../multiplayer/serverConfig';

export function SessionLobby() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
    const [joinCode, setJoinCode] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdCode, setCreatedCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [serverReady, setServerReady] = useState<boolean | null>(null);

    const { createSession, joinSession, connectionStatus } = useSessionStore();

    useEffect(() => {
        let cancelled = false;

        const checkServer = async () => {
            try {
                await fetchMultiplayerJson('/api/health');
                if (!cancelled) setServerReady(true);
            } catch {
                if (!cancelled) setServerReady(false);
            }
        };

        checkServer();
        const interval = window.setInterval(checkServer, 5000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, []);

    // Register stores for sync
    const registerStores = () => {
        registerStoresForSync({
            getCharacters: () => useCharacterStore.getState().characters,
            getCombat: () => {
                const { activeEncounter } = useCombatStore.getState();
                return activeEncounter;
            },
            getNavigator: () => {
                const {
                    sourceDocuments,
                    narratives,
                    dungeonMaps,
                    activeNarrativeId,
                    currentSceneId,
                    isProcessing,
                    processingProgress,
                    enrichmentCache,
                    partyRoomId,
                    sceneHistory,
                    activeFloorId,
                } = useNavigatorStore.getState();

                return {
                    sourceDocuments,
                    narratives,
                    dungeonMaps,
                    activeNarrativeId,
                    currentSceneId,
                    isProcessing,
                    processingProgress,
                    enrichmentCache,
                    partyRoomId,
                    sceneHistory,
                    activeFloorId,
                };
            },
            setCharacters: (chars) => {
                useCharacterStore.setState({ characters: chars });
            },
            setCombat: (combat) => {
                useCombatStore.setState({ activeEncounter: combat });
            },
            setNavigator: (navigator) => {
                if (!navigator) return;
                useNavigatorStore.setState(navigator);
            },
        });
    };

    const handleCreateSession = async () => {
        setLoading(true);
        setError(null);

        if (serverReady === false) {
            setError('The multiplayer relay on this device is offline right now. Start the multiplayer service, then try again.');
            setLoading(false);
            return;
        }
        
        registerStores();
        const result = await createSession();
        
        if (result.success && result.code) {
            setCreatedCode(result.code);
            setMode('create');

            // Start DM sync — push existing state to server
            startDMSync(useCharacterStore, useCombatStore, useNavigatorStore);
            pushInitialState();
        } else {
            setError(result.error || 'Failed to create session. Is the server running?');
        }

        setLoading(false);
    };

    const handleJoinSession = async () => {
        if (!joinCode.trim() || !playerName.trim()) {
            setError('Please enter both a room code and your name.');
            return;
        }

        setLoading(true);
        setError(null);

        if (serverReady === false) {
            setError('The multiplayer relay on this device is offline right now. Ask the DM to start it, then try joining again.');
            setLoading(false);
            return;
        }
        
        registerStores();
        const result = await joinSession(joinCode.trim(), playerName.trim());

        if (result.success) {
            // Start player sync — listen for state from server
            startPlayerSync();
            navigate('/player');
        } else {
            setError(result.error || 'Failed to join session. Check the room code and try again.');
        }

        setLoading(false);
    };

    const handleCopyCode = async () => {
        if (!createdCode) return;
        try {
            await navigator.clipboard.writeText(createdCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for non-HTTPS
            const input = document.createElement('input');
            input.value = createdCode;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDmContinue = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <Swords className="w-10 h-10 text-amber-400" />
                        <h1 className="text-3xl font-bold text-stone-100 tracking-tight">
                            DM Assistant
                        </h1>
                    </div>
                    <p className="text-stone-400 text-sm">Multiplayer Session</p>
                </div>

                {/* Connection Status */}
                <div className="flex items-center justify-center gap-2 mb-6 text-xs">
                    {serverReady === false ? (
                        <>
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span className="text-red-400">Multiplayer relay offline</span>
                        </>
                    ) : connectionStatus === 'connected' ? (
                        <>
                            <Wifi className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Connected</span>
                        </>
                    ) : serverReady === null ? (
                        <>
                            <Loader className="w-3 h-3 text-stone-500 animate-spin" />
                            <span className="text-stone-500">Checking relay...</span>
                        </>
                    ) : connectionStatus === 'connecting' ? (
                        <>
                            <Loader className="w-3 h-3 text-amber-400 animate-spin" />
                            <span className="text-amber-400">Connecting...</span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="w-3 h-3 text-stone-500" />
                            <span className="text-stone-500">Not connected</span>
                        </>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 mb-6 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {serverReady === false && (
                    <div className="bg-stone-900/80 border border-stone-700 rounded-lg p-3 mb-6 text-stone-300 text-sm">
                        Multiplayer needs the local relay service to be running on this device before anyone can host or join.
                    </div>
                )}

                {/* Mode: Choose */}
                {mode === 'choose' && (
                    <div className="space-y-4">
                        <button
                            onClick={handleCreateSession}
                            disabled={loading || serverReady === false}
                            className="w-full bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/40
                                       text-amber-200 rounded-xl p-6 text-left transition-all group
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center gap-4">
                                <Swords className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform" />
                                <div>
                                    <div className="font-bold text-lg">I am the DM</div>
                                    <div className="text-amber-300/60 text-sm mt-1">
                                        Create a session for your players to join
                                    </div>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => setMode('join')}
                            disabled={loading || serverReady === false}
                            className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/40
                                       text-blue-200 rounded-xl p-6 text-left transition-all group
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center gap-4">
                                <Users className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
                                <div>
                                    <div className="font-bold text-lg">I am a Player</div>
                                    <div className="text-blue-300/60 text-sm mt-1">
                                        Join your DM's session with a room code
                                    </div>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="w-full text-stone-500 hover:text-stone-300 text-sm py-3
                                       transition-colors"
                        >
                            Continue in single-player mode →
                        </button>
                    </div>
                )}

                {/* Mode: DM Created Session */}
                {mode === 'create' && createdCode && (
                    <div className="space-y-6">
                        <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 text-center">
                            <p className="text-stone-400 text-sm mb-3">
                                Share this code with your players:
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-3xl font-mono font-bold text-amber-300 tracking-widest">
                                    {createdCode}
                                </span>
                                <button
                                    onClick={handleCopyCode}
                                    className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 
                                               text-stone-400 hover:text-stone-200 transition-colors"
                                    title="Copy code"
                                >
                                    {copied ? (
                                        <Check className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <Copy className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4 text-sm text-stone-400">
                            <p className="mb-2">✅ Session active. Players can now join.</p>
                            <p>You can continue to the DM dashboard — players will connect in the background.</p>
                        </div>

                        <button
                            onClick={handleDmContinue}
                            className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 
                                       font-bold py-3 rounded-xl transition-colors"
                        >
                            Continue to Dashboard →
                        </button>
                    </div>
                )}

                {/* Mode: Player Join */}
                {mode === 'join' && (
                    <div className="space-y-4">
                        <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 space-y-4">
                            <div>
                                <label className="block text-stone-400 text-sm mb-2">Your Name</label>
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    placeholder="e.g., Carlos"
                                    className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3
                                               text-stone-100 placeholder-stone-500 focus:outline-none 
                                               focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-stone-400 text-sm mb-2">Room Code</label>
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    placeholder="e.g., DARK-GOBLIN"
                                    className="w-full bg-stone-800 border border-stone-600 rounded-lg px-4 py-3
                                               text-stone-100 placeholder-stone-500 font-mono text-lg tracking-wider
                                               focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleJoinSession}
                            disabled={loading || !joinCode.trim() || !playerName.trim() || serverReady === false}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white 
                                       font-bold py-3 rounded-xl transition-colors
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                'Join Session'
                            )}
                        </button>

                        <button
                            onClick={() => { setMode('choose'); setError(null); }}
                            className="w-full text-stone-500 hover:text-stone-300 text-sm py-2 transition-colors"
                        >
                            ← Back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
