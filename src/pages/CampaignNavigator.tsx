import { useNavigatorStore } from '../store/navigatorStore';
import { NarrativeReader } from '../components/navigator/NarrativeReader';
import { NavigatorCommandDeck } from '../components/navigator/NavigatorCommandDeck';
import { MapRoom, NarrativeScene } from '../types/campaignNavigator';
import { BookOpenText, Sparkles, FileUp, RotateCcw } from 'lucide-react';
import { useSessionStore } from '../multiplayer/sessionStore';

export function CampaignNavigator() {
    const { isMultiplayer, room, presentation } = useSessionStore();
    const {
        narratives,
        activeNarrativeId,
        currentSceneId,
        dungeonMaps,
        partyRoomId,
        sceneHistory,
        activeFloorId,
        navigateToScene,
        goBack,
        setPartyRoom,
        revealRoom,
        setActiveFloor,
        loadMockData,
    } = useNavigatorStore();

    const activeNarrative = narratives.find(n => n.id === activeNarrativeId);

    // Find the current scene
    let currentScene: NarrativeScene | null = null;
    if (activeNarrative && currentSceneId) {
        for (const chapter of activeNarrative.chapters) {
            const found = chapter.scenes.find(s => s.id === currentSceneId);
            if (found) {
                currentScene = found;
                break;
            }
        }
    }

    // Filter maps: Use explicit override if provided, otherwise default to current chapter
    const currentChapterId = currentScene?.chapterId ?? null;
    const mapChapterOverrides = currentScene?.visibleChapterMaps;
    
    const filteredMaps = (mapChapterOverrides || currentChapterId)
        ? dungeonMaps.filter(m => {
            const mapChaps = m.chapterIds ?? [];
            if (mapChapterOverrides) {
                return mapChapterOverrides.some(id => mapChaps.includes(id));
            }
            return currentChapterId && mapChaps.includes(currentChapterId);
        })
        : [];

    const commandDeckMap = filteredMaps.find(m => m.floorId === activeFloorId) ?? filteredMaps[0] ?? null;
    const playerCount = room?.players.filter(player => player.role === 'player').length ?? 0;

    const handleNavigateToScene = (sceneId: string) => {
        navigateToScene(sceneId);

        // Auto-move party to room linked to the scene
        if (activeNarrative) {
            for (const chapter of activeNarrative.chapters) {
                const scene = chapter.scenes.find(s => s.id === sceneId);
                if (scene?.mapRoomId) {
                    setPartyRoom(scene.mapRoomId);
                    // Reveal the room on the correct floor's map
                    const targetMap = dungeonMaps.find(m => m.floorId === scene.mapFloorId);
                    if (targetMap) {
                        revealRoom(targetMap.id, scene.mapRoomId);
                    }
                    break;
                }
            }
        }
    };

    const handleRoomClick = (room: MapRoom) => {
        if (room.sceneId && room.isRevealed) {
            handleNavigateToScene(room.sceneId);
        }
    };

    // ── No Narrative Loaded — Show Landing ──────────────
    if (!activeNarrative) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                    {/* Hero icon */}
                    <div className="relative mx-auto w-24 h-24 mb-6">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-purple-500/10 rounded-full blur-xl" />
                        <div className="relative w-full h-full rounded-full bg-stone-900/80 border border-stone-700/40 flex items-center justify-center">
                            <BookOpenText size={40} className="text-amber-500/60" />
                        </div>
                    </div>

                    <h1 className="font-cinzel text-2xl text-amber-400 font-bold tracking-wide mb-2">Campaign Navigator</h1>
                    <p className="text-stone-400 text-sm mb-8 leading-relaxed">
                        An immersive, interactive narrative engine for running your campaigns.
                        Read beautifully crafted scenes aloud, make choices, and track your party's journey.
                    </p>

                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={loadMockData}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg
                                bg-gradient-to-r from-amber-900/30 to-amber-800/20
                                border border-amber-700/40 hover:border-amber-500/60
                                text-amber-300 hover:text-amber-200
                                transition-all duration-300
                                hover:shadow-[0_0_25px_rgba(217,119,6,0.15)]
                                hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Sparkles size={18} />
                            <span className="font-cinzel font-bold tracking-wide text-sm">Load Death House (Prologue + Module)</span>
                        </button>

                        <button
                            type="button"
                            disabled
                            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg
                                bg-stone-800/30 border border-stone-700/30
                                text-stone-500 cursor-not-allowed"
                        >
                            <FileUp size={16} />
                            <span className="text-sm">Import Campaign PDFs</span>
                            <span className="text-[9px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-600">Coming Soon</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Active Narrative — Show Reader ─────────────────
    return (
        <div className="h-full flex flex-col">
            {/* Narrative Title Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800/50 bg-gradient-to-r from-stone-900/60 to-stone-950/60 shrink-0">
                <div className="flex items-center gap-3">
                    <BookOpenText size={18} className="text-amber-500" />
                    <div>
                        <h2 className="font-cinzel text-amber-400 text-sm font-bold tracking-wider">{activeNarrative.title}</h2>
                        <p className="text-stone-500 text-[10px]">{activeNarrative.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadMockData}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                            bg-stone-800/50 hover:bg-amber-900/30
                            text-stone-400 hover:text-amber-300
                            border border-stone-700/30 hover:border-amber-700/40
                            transition-all duration-200"
                        title="Restart the prologue and reset Death House"
                    >
                        <RotateCcw size={12} /> Restart Prologue
                    </button>
                </div>
            </div>

            {/* Reader */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <NavigatorCommandDeck
                    currentScene={currentScene}
                    activeMap={commandDeckMap}
                    isMultiplayer={isMultiplayer}
                    roomCode={room?.code ?? null}
                    playerCount={playerCount}
                    presentation={presentation}
                />
                <div className="flex-1 overflow-hidden">
                    <NarrativeReader
                        chapters={activeNarrative.chapters}
                        currentScene={currentScene}
                        visitedSceneIds={activeNarrative.visitedSceneIds}
                        dungeonMaps={filteredMaps}
                        activeFloorId={activeFloorId}
                        partyRoomId={partyRoomId}
                        canGoBack={sceneHistory.length > 0}
                        onNavigateToScene={handleNavigateToScene}
                        onRoomClick={handleRoomClick}
                        onGoBack={goBack}
                        onFloorChange={setActiveFloor}
                    />
                </div>
            </div>
        </div>
    );
}
