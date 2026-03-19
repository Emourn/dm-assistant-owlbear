import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { NarrativeScene, DungeonMap } from '../../types/campaignNavigator';
import type { SessionPresentation } from '../../engine/sessionPresentation';
import { ChevronDown, ChevronUp, Clock3, MapPinned, Radio, Sparkles, Users } from 'lucide-react';

interface Props {
    currentScene: NarrativeScene | null;
    activeMap: DungeonMap | null;
    isMultiplayer: boolean;
    roomCode: string | null;
    playerCount: number;
    presentation: SessionPresentation | null;
}

function buildSceneChecklist(scene: NarrativeScene | null): string[] {
    if (!scene) return ['Pick a scene from the sidebar to begin the table flow.'];

    const checklist = [
        scene.narrationBlocks.some(block => block.type === 'read-aloud') ? 'Read the boxed text first.' : null,
        scene.dmNotes ? 'Check your private note before you reveal consequences.' : null,
        scene.narrationBlocks.some(block => block.type === 'skill-check') ? 'Have the main skill check ready.' : null,
        scene.encounter ? 'Be ready to launch initiative if the tension breaks.' : null,
        scene.choices.length > 0 ? `Offer ${scene.choices.length} clear path${scene.choices.length === 1 ? '' : 's'} when the beat ends.` : null,
    ].filter(Boolean) as string[];

    return checklist.slice(0, 3);
}

function buildBeginnerPrompts(scene: NarrativeScene | null): string[] {
    if (!scene) return ['Use the map, narration, and notes together as your DM screen.'];

    const prompts = [
        scene.tags.includes('exploration') ? 'If the table stalls, ask who leads and what they inspect.' : null,
        scene.tags.includes('roleplay') ? 'Let the NPC speak first, then ask who answers.' : null,
        scene.tags.includes('combat') ? 'Summarize the threat in one sentence before initiative.' : null,
        scene.tags.includes('trap') || scene.tags.includes('puzzle') ? 'Describe what is obvious before asking for solutions.' : null,
        'End the beat by restating the room, exits, and immediate pressure.',
    ].filter(Boolean) as string[];

    return prompts.slice(0, 3);
}

function SummaryCard({
    label,
    value,
    subvalue,
    icon,
    tone,
}: {
    label: string;
    value: string;
    subvalue?: string;
    icon: ReactNode;
    tone: string;
}) {
    return (
        <div className={`rounded-2xl border px-3 py-2.5 ${tone}`}>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-stone-400">
                {icon}
                <span>{label}</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-stone-100 truncate">{value}</div>
            {subvalue && <div className="mt-0.5 text-[11px] text-stone-500 truncate">{subvalue}</div>}
        </div>
    );
}

export function NavigatorCommandDeck({
    currentScene,
    activeMap,
    isMultiplayer,
    roomCode,
    playerCount,
    presentation,
}: Props) {
    const [isExpanded, setIsExpanded] = useState(false);

    const sceneChecklist = useMemo(() => buildSceneChecklist(currentScene), [currentScene]);
    const beginnerPrompts = useMemo(() => buildBeginnerPrompts(currentScene), [currentScene]);
    const liveLabel = presentation?.mode === 'combat'
        ? 'Combat live'
        : presentation?.mode === 'navigator'
        ? 'Navigator live'
        : presentation?.mode === 'blackout'
        ? 'Player blackout'
        : 'Waiting';

    return (
        <div className="border-b border-stone-800/50 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(12,10,9,0.88))]">
            <div className="grid gap-2 px-4 py-3 md:grid-cols-4">
                <SummaryCard
                    label="Live Table"
                    value={liveLabel}
                    subvalue={isMultiplayer ? `Room ${roomCode ?? 'Live'}` : 'Single-player'}
                    icon={<Radio size={12} className="text-emerald-300" />}
                    tone="border-emerald-900/40 bg-emerald-950/20"
                />
                <SummaryCard
                    label="Scene"
                    value={currentScene?.title ?? 'No scene selected'}
                    subvalue={currentScene?.subtitle ?? presentation?.sceneTitle ?? 'Choose a scene to start'}
                    icon={<Sparkles size={12} className="text-amber-300" />}
                    tone="border-amber-900/40 bg-amber-950/20"
                />
                <SummaryCard
                    label="Map"
                    value={activeMap?.name ?? presentation?.mapName ?? 'No map focus'}
                    subvalue={presentation?.floorLabel ?? 'Navigator overview'}
                    icon={<MapPinned size={12} className="text-blue-300" />}
                    tone="border-blue-900/40 bg-sky-950/20"
                />
                <SummaryCard
                    label="Table Pulse"
                    value={currentScene?.estimatedMinutes ? `~${currentScene.estimatedMinutes} min` : `${playerCount} players`}
                    subvalue={currentScene?.estimatedMinutes ? `${playerCount} players${isMultiplayer ? ` • ${roomCode ?? 'Live'}` : ''}` : `Players ${playerCount}`}
                    icon={currentScene?.estimatedMinutes ? <Clock3 size={12} className="text-fuchsia-300" /> : <Users size={12} className="text-fuchsia-300" />}
                    tone="border-fuchsia-900/40 bg-fuchsia-950/20"
                />
            </div>

            <div className="px-4 pb-3">
                <button
                    type="button"
                    onClick={() => setIsExpanded((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-stone-300 transition-colors hover:border-amber-700/40 hover:text-amber-200"
                >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? 'Hide DM Assist' : 'Show DM Assist'}
                </button>
            </div>

            {isExpanded && (
                <div className="grid gap-3 border-t border-stone-800/50 px-4 py-3 md:grid-cols-2">
                    <section className="rounded-2xl border border-stone-800/70 bg-stone-950/70 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300">Run This Scene</div>
                        <div className="mt-3 space-y-2">
                            {sceneChecklist.map((item) => (
                                <div key={item} className="rounded-xl bg-stone-900/80 px-3 py-2 text-sm text-stone-200">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className="rounded-2xl border border-stone-800/70 bg-stone-950/70 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">Beginner Assist</div>
                        <div className="mt-3 space-y-2">
                            {beginnerPrompts.map((item) => (
                                <div key={item} className="rounded-xl bg-stone-900/80 px-3 py-2 text-sm text-stone-200">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
