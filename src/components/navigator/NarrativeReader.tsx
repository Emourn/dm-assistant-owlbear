import { useState, useEffect, useRef } from 'react';
import { NarrativeScene, NarrativeChapter, DungeonMap, MapRoom, SourceCitation } from '../../types/campaignNavigator';
import { NarrationBlock } from './NarrationBlock';
import { ChoiceCard } from './ChoiceCard';
import { ChapterSidebar } from './ChapterSidebar';
import { DungeonMapView } from './DungeonMapView';
import { BookOpen, Map, PanelLeftClose, PanelLeftOpen, ChevronUp, FileText, Clock, Undo2, Pencil, PencilOff } from 'lucide-react';
import { SceneBlockEditor } from './SceneBlockEditor';

interface Props {
    chapters: NarrativeChapter[];
    currentScene: NarrativeScene | null;
    visitedSceneIds: string[];
    dungeonMaps: DungeonMap[];
    activeFloorId: string | null;
    partyRoomId: string | null;
    canGoBack: boolean;
    onNavigateToScene: (sceneId: string) => void;
    onRoomClick: (room: MapRoom) => void;
    onGoBack: () => void;
    onFloorChange: (floorId: string) => void;
}

export function NarrativeReader({
    chapters,
    currentScene,
    visitedSceneIds,
    dungeonMaps,
    activeFloorId,
    partyRoomId,
    canGoBack,
    onNavigateToScene,
    onRoomClick,
    onGoBack,
    onFloorChange
}: Props) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMapExpanded, setIsMapExpanded] = useState(true);
    const [animatingBlocks, setAnimatingBlocks] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Animate blocks on scene change
    useEffect(() => {
        setAnimatingBlocks(true);
        const timer = setTimeout(() => setAnimatingBlocks(false), 100);
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return () => clearTimeout(timer);
    }, [currentScene?.id]);

    if (!currentScene) {
        return (
            <div className="flex items-center justify-center h-full text-stone-500">
                <div className="text-center">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-cinzel text-lg">No Scene Selected</p>
                    <p className="text-sm mt-1">Choose a scene from the chapter sidebar to begin.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* ── Chapter Sidebar ──────────────────────────────── */}
            {isSidebarOpen && (
                <div className="w-64 shrink-0 animate-[fadeIn_0.2s_ease-out]">
                    <ChapterSidebar
                        chapters={chapters}
                        currentSceneId={currentScene.id}
                        visitedSceneIds={visitedSceneIds}
                        onSceneSelect={onNavigateToScene}
                    />
                </div>
            )}

            {/* ── Main Reading Area ───────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-stone-800/40 bg-stone-900/30 shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-1.5 text-stone-500 hover:text-amber-400 rounded transition-colors hover:bg-stone-800/50"
                            title={isSidebarOpen ? 'Hide chapters' : 'Show chapters'}
                        >
                            {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                        </button>

                        {/* ── BACK / RETURN BUTTON ─── */}
                        {canGoBack && (
                            <button
                                type="button"
                                onClick={onGoBack}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md
                                    bg-stone-800/50 hover:bg-amber-900/30
                                    text-stone-400 hover:text-amber-300
                                    border border-stone-700/30 hover:border-amber-700/40
                                    transition-all duration-200
                                    text-xs font-medium"
                                title="Return to previous scene"
                            >
                                <Undo2 size={13} />
                                Return
                            </button>
                        )}

                        <div className="ml-1">
                            <h2 className="font-cinzel text-amber-400 text-sm font-bold tracking-wide">{currentScene.title}</h2>
                            {currentScene.subtitle && (
                                <p className="text-stone-500 text-[10px] tracking-wide">{currentScene.subtitle}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Tags */}
                        <div className="flex gap-1.5">
                            {currentScene.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-full bg-stone-800/60 text-stone-500 border border-stone-700/30">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        {currentScene.estimatedMinutes && (
                            <span className="flex items-center gap-1 text-[10px] text-stone-600">
                                <Clock size={10} /> ~{currentScene.estimatedMinutes}min
                            </span>
                        )}
                        {/* Edit Mode Toggle */}
                        <button
                            type="button"
                            onClick={() => setIsEditMode(!isEditMode)}
                            title={isEditMode ? 'Exit edit mode' : 'Edit scene blocks'}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide transition-all border ${
                                isEditMode
                                    ? 'bg-amber-900/40 border-amber-600/50 text-amber-300 hover:bg-amber-800/50'
                                    : 'bg-stone-800/40 border-stone-700/30 text-stone-500 hover:text-amber-400 hover:border-amber-700/40'
                            }`}
                        >
                            {isEditMode ? <PencilOff size={12} /> : <Pencil size={12} />}
                            {isEditMode ? 'Done' : 'Edit'}
                        </button>
                    </div>
                </div>

                {/* Content Area — splits between narration and map */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Narration Scroll */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent"
                    >
                        <div className="max-w-2xl mx-auto px-8 py-8">
                            {/* Scene Header */}
                            <div className="mb-8 text-center">
                                <div className="flex items-center justify-center gap-3 mb-3">
                                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-700/40" />
                                    <BookOpen size={16} className="text-amber-600/60" />
                                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-700/40" />
                                </div>
                                <h1 className="font-cinzel text-2xl text-amber-300 font-bold tracking-wide mb-1">
                                    {currentScene.title}
                                </h1>
                                {currentScene.subtitle && (
                                    <p className="text-stone-500 text-sm italic">{currentScene.subtitle}</p>
                                )}
                            </div>

                            {/* Narration Blocks */}
                            <div className="space-y-1">
                                {isEditMode && (
                                    <SceneBlockEditor sceneId={currentScene.id} />
                                )}
                                {currentScene.narrationBlocks.map((block) => (
                                    <div key={block.id}>
                                        <NarrationBlock
                                            block={block}
                                            isAnimating={animatingBlocks}
                                            sceneEncounter={currentScene.encounter}
                                            isEditMode={isEditMode}
                                            sceneId={currentScene.id}
                                        />
                                        {isEditMode && (
                                            <SceneBlockEditor
                                                sceneId={currentScene.id}
                                                afterBlockId={block.id}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Source Citations */}
                            {currentScene.sources.length > 0 && (
                                <div className="mt-8 pt-4 border-t border-stone-800/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText size={12} className="text-stone-600" />
                                        <span className="text-[10px] uppercase tracking-[0.15em] text-stone-600 font-bold">Sources</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {currentScene.sources.map((src, i) => (
                                            <SourceBadge key={i} source={src} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* DM Notes */}
                            {currentScene.dmNotes && (
                                <div className="mt-4 p-3 rounded-md bg-purple-950/15 border border-purple-900/20">
                                    <p className="text-purple-300/50 text-xs">
                                        <span className="font-bold">📝 Your Notes:</span> {currentScene.dmNotes}
                                    </p>
                                </div>
                            )}

                            {/* ── Choices ─────────────────────────────────── */}
                            {currentScene.choices.length > 0 && (
                                <div className="mt-10 mb-8">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-800/30 to-transparent" />
                                        <span className="text-[10px] uppercase tracking-[0.2em] text-amber-600/50 font-cinzel font-bold whitespace-nowrap">
                                            What do the adventurers do?
                                        </span>
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-800/30 to-transparent" />
                                    </div>

                                    <div className="space-y-3">
                                        {currentScene.choices.map((choice, idx) => (
                                            <ChoiceCard
                                                key={choice.id}
                                                choice={choice}
                                                index={idx}
                                                onChoose={(c) => onNavigateToScene(c.targetSceneId)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Back Button at Bottom Too ─────────────── */}
                            {canGoBack && (
                                <div className="mt-6 mb-10 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={onGoBack}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg
                                            bg-stone-800/40 hover:bg-stone-800/60
                                            text-stone-500 hover:text-stone-300
                                            border border-stone-700/30 hover:border-stone-600/50
                                            transition-all duration-200 text-sm"
                                    >
                                        <Undo2 size={14} />
                                        Return to Previous Scene
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Map Panel (Right Side) — BIGGER ─────────── */}
                    {dungeonMaps.length > 0 && (
                        <div className={`
                            shrink-0 border-l border-stone-800/40 bg-stone-950/40
                            transition-all duration-300
                            ${isMapExpanded ? 'w-[550px]' : 'w-10'}
                        `}>
                            {isMapExpanded ? (
                                <div className="h-full flex flex-col">
                                    <button
                                        type="button"
                                        onClick={() => setIsMapExpanded(false)}
                                        className="flex items-center justify-between px-3 py-2 border-b border-stone-800/30 hover:bg-stone-800/30 transition-colors shrink-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Map size={13} className="text-amber-500" />
                                            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Dungeon Map</span>
                                        </div>
                                        <ChevronUp size={14} className="text-stone-600 rotate-90" />
                                    </button>
                                    <div className="flex-1 overflow-hidden p-2">
                                        <DungeonMapView
                                            maps={dungeonMaps}
                                            activeFloorId={activeFloorId}
                                            partyRoomId={partyRoomId}
                                            onRoomClick={onRoomClick}
                                            onFloorChange={onFloorChange}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsMapExpanded(true)}
                                    className="h-full w-full flex items-center justify-center hover:bg-stone-800/30 transition-colors"
                                    title="Expand map"
                                >
                                    <Map size={16} className="text-stone-600 hover:text-amber-500 transition-colors" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Source Citation Badge ─────────────────────────────────
function SourceBadge({ source }: { source: SourceCitation }) {
    const colors: Record<string, string> = {
        'Fixing Vecna': 'bg-amber-900/30 border-amber-700/40 text-amber-400',
        'Curse of Strahd': 'bg-red-900/30 border-red-700/40 text-red-400',
        'Death House': 'bg-red-900/30 border-red-700/40 text-red-300',
        'Eve of Ruin': 'bg-purple-900/30 border-purple-700/40 text-purple-400',
    };
    const colorClass = colors[source.documentTitle] || 'bg-stone-800/40 border-stone-700/40 text-stone-400';

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border ${colorClass}`}>
            📖 {source.documentTitle}
            {source.pageNumber != null && <span className="opacity-70">p.{source.pageNumber}</span>}
            {source.sectionTitle && <span className="opacity-50">• {source.sectionTitle}</span>}
        </span>
    );
}
