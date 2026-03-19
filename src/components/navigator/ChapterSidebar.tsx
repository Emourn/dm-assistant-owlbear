import { NarrativeChapter, NarrativeScene } from '../../types/campaignNavigator';
import { ChevronRight, ChevronDown, BookOpen, EyeOff, MapPin } from 'lucide-react';
import { useState } from 'react';

interface Props {
    chapters: NarrativeChapter[];
    currentSceneId: string | null;
    visitedSceneIds: string[];
    onSceneSelect: (sceneId: string) => void;
}

export function ChapterSidebar({ chapters, currentSceneId, visitedSceneIds, onSceneSelect }: Props) {
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(() => {
        // Auto-expand chapter containing current scene
        const set = new Set<string>();
        for (const ch of chapters) {
            if (ch.scenes.some(s => s.id === currentSceneId)) {
                set.add(ch.id);
            }
        }
        return set;
    });

    const toggleChapter = (id: string) => {
        setExpandedChapters(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getSceneStatus = (scene: NarrativeScene): 'current' | 'visited' | 'unvisited' => {
        if (scene.id === currentSceneId) return 'current';
        if (visitedSceneIds.includes(scene.id)) return 'visited';
        return 'unvisited';
    };

    const totalScenes = chapters.reduce((sum, ch) => sum + ch.scenes.length, 0);
    const visitedCount = visitedSceneIds.length;
    const progress = totalScenes > 0 ? Math.round((visitedCount / totalScenes) * 100) : 0;

    return (
        <div className="h-full flex flex-col bg-stone-950/80 border-r border-stone-800/60">
            {/* Header */}
            <div className="p-4 border-b border-stone-800/40">
                <div className="flex items-center gap-2 text-amber-500 mb-3">
                    <BookOpen size={16} />
                    <h3 className="font-cinzel font-bold text-sm tracking-wider">Chapters</h3>
                </div>
                {/* Progress bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-stone-500">
                        <span>{visitedCount} / {totalScenes} scenes</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-700 to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Chapter Tree */}
            <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-stone-700">
                {chapters.map((chapter, chIdx) => {
                    const isExpanded = expandedChapters.has(chapter.id);
                    const chapterHasCurrentScene = chapter.scenes.some(s => s.id === currentSceneId);

                    return (
                        <div key={chapter.id} className="mb-1">
                            {/* Chapter header */}
                            <button
                                type="button"
                                onClick={() => toggleChapter(chapter.id)}
                                className={`
                                    w-full flex items-center gap-2 px-4 py-2.5 text-left
                                    hover:bg-stone-800/40 transition-colors
                                    ${chapterHasCurrentScene ? 'text-amber-400' : 'text-stone-400'}
                                `}
                            >
                                {isExpanded
                                    ? <ChevronDown size={14} className="shrink-0" />
                                    : <ChevronRight size={14} className="shrink-0" />
                                }
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-stone-600 font-cinzel">
                                            {String.fromCharCode(8544 + chIdx) /* Roman numerals */}
                                        </span>
                                        <span className="text-xs font-medium truncate">
                                            {chapter.title}
                                        </span>
                                    </div>
                                    {chapter.levelRange && (
                                        <span className="text-[10px] text-stone-600 ml-5">
                                            Lv. {chapter.levelRange}
                                        </span>
                                    )}
                                </div>
                                {!chapter.isUnlocked && (
                                    <EyeOff size={12} className="text-stone-600 shrink-0" />
                                )}
                            </button>

                            {/* Scene list */}
                            {isExpanded && (
                                <div className="ml-4 border-l border-stone-800/40">
                                    {chapter.scenes.map((scene) => {
                                        const status = getSceneStatus(scene);
                                        return (
                                            <button
                                                key={scene.id}
                                                type="button"
                                                onClick={() => onSceneSelect(scene.id)}
                                                className={`
                                                    w-full flex items-center gap-2.5 pl-4 pr-3 py-2 text-left
                                                    transition-all duration-200
                                                    ${status === 'current'
                                                        ? 'bg-amber-900/20 text-amber-300 border-l-2 border-amber-500 -ml-px'
                                                        : status === 'visited'
                                                            ? 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/30'
                                                            : 'text-stone-600 hover:text-stone-400 hover:bg-stone-800/20'
                                                    }
                                                `}
                                            >
                                                {/* Status dot */}
                                                <div className={`
                                                    w-2 h-2 rounded-full shrink-0
                                                    ${status === 'current'
                                                        ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse'
                                                        : status === 'visited'
                                                            ? 'bg-stone-600'
                                                            : 'bg-stone-800 border border-stone-700'
                                                    }
                                                `} />

                                                <span className="text-xs truncate flex-1">{scene.title}</span>

                                                {scene.mapRoomId && (
                                                    <MapPin size={10} className="text-stone-600 shrink-0" />
                                                )}

                                                {/* Tag icons */}
                                                {scene.tags.includes('combat') && (
                                                    <span className="text-[9px] text-red-500/50">⚔️</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
