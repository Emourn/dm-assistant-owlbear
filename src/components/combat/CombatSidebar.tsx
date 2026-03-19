import { useState, useEffect, useRef, useCallback } from 'react';
import { Combatant, CombatAction } from '../../types/combat';
import { ActionPanel } from './ActionPanel';
import { ConditionMenu } from './ConditionMenu';
import {
    Zap,
    ChevronLeft,
    ChevronRight,
    Info,
    Swords,
    Star,
    X,
    Pin,
    PinOff,
    Shield,
    Eye,
    Search,
    Brain
} from 'lucide-react';
import { EconomyTracker } from './EconomyTracker';
import { MetricTooltip } from './MetricTooltip';

interface CombatSidebarProps {
    combatant: Combatant;
    selectedCombatant: Combatant | null;
    onActionClick: (action: CombatAction, actorOverride?: Combatant) => void;
    onActionHover: (action: CombatAction | null) => void;
    setSelectedCombatant: (id: string | null) => void;
    setConcentration: (id: string, concentration: { spellId: string; name: string } | null) => void;
    onConditionHover: (name: string, e: React.MouseEvent) => void;
    onConditionLeave: () => void;
}

export function CombatSidebar({
    combatant,
    selectedCombatant,
    onActionClick,
    onActionHover,
    setSelectedCombatant,
    setConcentration,
    onConditionHover,
    onConditionLeave
}: CombatSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [activeTab, setActiveTab] = useState<'actions' | 'conditions' | 'info'>('actions');
    const sidebarRef = useRef<HTMLDivElement>(null);
    const closeTimerRef = useRef<number | null>(null);

    // Clear any pending close timer
    const clearCloseTimer = useCallback(() => {
        if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    // Schedule a close after delay
    const scheduleClose = useCallback((delay: number) => {
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => {
            setIsOpen(false);
        }, delay);
    }, [clearCloseTimer]);

    // Proximity-based auto-reveal
    useEffect(() => {
        if (isPinned) return;

        const EDGE_THRESHOLD = 80; // px from right edge to trigger

        const handleMouseMove = (e: MouseEvent) => {
            const distFromRight = window.innerWidth - e.clientX;
            const isNearEdge = distFromRight < EDGE_THRESHOLD;

            // Check if mouse is over the sidebar itself
            const isOverSidebar = sidebarRef.current?.contains(e.target as Node);

            if (isNearEdge || isOverSidebar) {
                clearCloseTimer();
                setIsOpen(true);
            } else {
                // Mouse moved away from both edge AND sidebar — schedule close
                if (!closeTimerRef.current) {
                    scheduleClose(400);
                }
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearCloseTimer();
        };
    }, [isPinned, clearCloseTimer, scheduleClose]);

    // When pinned, force open
    useEffect(() => {
        if (isPinned) {
            clearCloseTimer();
            setIsOpen(true);
        }
    }, [isPinned, clearCloseTimer]);

    const target = selectedCombatant || combatant;

    return (
        <div
            ref={sidebarRef}
            className={`
                absolute top-0 right-0 bottom-0 flex
                transition-transform duration-200 ease-out
                ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%-12px)]'}
            `}
            style={{ zIndex: 30 }}
        >
            {/* Toggle Handle (always visible) */}
            <div className="flex flex-col justify-center -ml-1">
                <button
                    onClick={() => {
                        if (isPinned) {
                            setIsPinned(false);
                            setIsOpen(false);
                        } else {
                            setIsPinned(true);
                            setIsOpen(true);
                        }
                    }}
                    className={`
                        w-7 h-14 flex items-center justify-center rounded-l-lg
                        border-y border-l shadow-lg transition-all duration-150
                        ${isOpen
                            ? 'bg-stone-900/95 border-stone-700 text-stone-400 hover:text-gold'
                            : 'bg-gold/90 border-gold/60 text-stone-950 hover:bg-gold shadow-gold/20'
                        }
                    `}
                    title={isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                >
                    {isOpen ? (isPinned ? <Pin size={13} /> : <ChevronRight size={15} />) : <ChevronLeft size={15} />}
                </button>
            </div>

            {/* Sidebar Panel */}
            <div className="w-[400px] bg-stone-900/40 backdrop-blur-xl border-l border-gold/20 shadow-[-8px_0_30px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">

                {/* Header: Compact Stat Card */}
                <div className="px-3 py-2.5 bg-stone-950/40 border-b border-stone-800/50 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center font-cinzel font-bold text-sm border ${combatant.type === 'player' ? 'bg-arcane/10 border-arcane/40 text-arcane' : 'bg-blood/10 border-blood/40 text-blood'}`}>
                            {combatant.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-sm font-cinzel font-bold text-parchment leading-none truncate max-w-[150px]">{combatant.name}</h2>
                            <div className="flex items-center gap-1.5 mt-1">
                                <MetricTooltip
                                    title="Armor Class (AC)"
                                    description="Armor Class represents how hard it is to land a clean blow on a creature. It accounts for armor, agility, and magical protection."
                                    math="10 + Dexterity Modifier + Armor/Shield Bonus. (e.g. 10 + 2 + 3 = 15)"
                                    coaching="Tell your players: 'The monster swings... and hits!' if their roll matches or beats this AC number. If they roll lower, they miss or the shield deflects the blow."
                                    icon={<Shield size={12} className="text-amber-400" />}
                                >
                                    <span className="text-[9px] uppercase font-bold text-stone-500 tracking-wider hover:text-stone-300">
                                        AC {combatant.ac}
                                    </span>
                                </MetricTooltip>
                                <span className="text-[9px] text-stone-700">•</span>
                                <div title="Action Economy: Shows your available Action, Bonus Action, and Reaction for this round.">
                                    <EconomyTracker combatant={combatant} compact={true} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-sm font-bold text-parchment font-cinzel">{target.currentHp}</span>
                            <span className="text-[9px] text-stone-600">/{target.maxHp}</span>
                        </div>

                        <button
                            onClick={() => setIsPinned(!isPinned)}
                            className={`p-1 rounded transition-colors ${isPinned ? 'text-gold bg-gold/10' : 'text-stone-600 hover:text-stone-400'}`}
                            title={isPinned ? "Unpin Sidebar" : "Pin Sidebar Open"}
                        >
                            {isPinned ? <Pin size={12} /> : <PinOff size={12} />}
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-stone-800/80 bg-stone-950/30 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('actions')}
                        className={`flex-1 py-2.5 text-[10px] uppercase tracking-widest font-black flex items-center justify-center gap-1.5 transition-all border-b-2 ${activeTab === 'actions' ? 'border-gold text-gold bg-gold/5' : 'border-transparent text-stone-600 hover:text-stone-300'}`}
                    >
                        <Swords size={12} /> Actions
                    </button>
                    <button
                        onClick={() => setActiveTab('conditions')}
                        className={`flex-1 py-2.5 text-[10px] uppercase tracking-widest font-black flex items-center justify-center gap-1.5 transition-all border-b-2 ${activeTab === 'conditions' ? 'border-blood text-blood bg-blood/5' : 'border-transparent text-stone-600 hover:text-stone-300'}`}
                    >
                        <Star size={12} /> Status
                    </button>
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex-1 py-2.5 text-[10px] uppercase tracking-widest font-black flex items-center justify-center gap-1.5 transition-all border-b-2 ${activeTab === 'info' ? 'border-arcane text-arcane bg-arcane/5' : 'border-transparent text-stone-600 hover:text-stone-300'}`}
                    >
                        <Info size={12} /> Stats
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 min-h-0">

                    {activeTab === 'actions' && (
                        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                            <ActionPanel
                                combatant={combatant}
                                onActionClick={(a) => onActionClick(a, combatant)}
                                onActionHover={onActionHover}
                            />
                        </div>
                    )}

                    {activeTab === 'conditions' && (
                        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                            <ConditionMenu
                                targetId={target.id}
                                onHover={onConditionHover}
                                onLeave={onConditionLeave}
                            />
                        </div>
                    )}

                    {activeTab === 'info' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                            {/* Ability Scores */}
                            {combatant.abilityScores && (
                                <div className="grid grid-cols-3 gap-1.5">
                                    {Object.entries(combatant.abilityScores).map(([key, val]) => {
                                        const mod = Math.floor((val - 10) / 2);
                                        return (
                                            <div key={key} className="bg-stone-950/80 border border-stone-800 rounded-md p-1.5 text-center group hover:border-stone-700 transition-colors">
                                                <div className="text-[7px] text-stone-500 uppercase font-bold tracking-widest">{key}</div>
                                                <div className="text-lg font-cinzel font-bold text-parchment leading-none">{val}</div>
                                                <div className={`text-[9px] font-mono ${mod >= 0 ? 'text-green-500' : 'text-blood'}`}>
                                                    {mod >= 0 ? '+' : ''}{mod}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Passive Senses */}
                            <div className="grid grid-cols-3 gap-1.5">
                                <MetricTooltip
                                    title="Passive Perception"
                                    description="Your ability to notice things without actively looking."
                                    math="10 + Perception Modifier. +5 if you have Advantage."
                                    coaching="Compare this to an enemy's Stealth check to see if the character notices them sneaking."
                                    icon={<Eye size={12} className="text-emerald-400" />}
                                >
                                    <div className="bg-stone-900/50 border border-stone-800 rounded-md p-2 text-center group hover:border-emerald-500/30 transition-colors">
                                        <div className="text-[7px] text-stone-500 uppercase font-bold tracking-widest">Perception</div>
                                        <div className="text-sm font-bold text-emerald-400">{combatant.passivePerception ?? 10}</div>
                                    </div>
                                </MetricTooltip>

                                <MetricTooltip
                                    title="Passive Investigation"
                                    description="Your ability to deduce things or find patterns without an active search."
                                    math="10 + Investigation Modifier."
                                    coaching="Use this to see if a character automatically notices a hidden trap or a flaw in a disguise."
                                    icon={<Search size={12} className="text-cyan-400" />}
                                >
                                    <div className="bg-stone-900/50 border border-stone-800 rounded-md p-2 text-center group hover:border-cyan-500/30 transition-colors">
                                        <div className="text-[7px] text-stone-500 uppercase font-bold tracking-widest">Investig.</div>
                                        <div className="text-sm font-bold text-cyan-400">{combatant.passiveInvestigation ?? 10}</div>
                                    </div>
                                </MetricTooltip>

                                <MetricTooltip
                                    title="Passive Insight"
                                    description="Your ability to tell if someone is lying or hiding their true intentions."
                                    math="10 + Insight Modifier."
                                    coaching="Compare this to an NPC's Deception check to see if the character gets a 'bad feeling' about them."
                                    icon={<Brain size={12} className="text-purple-400" />}
                                >
                                    <div className="bg-stone-900/50 border border-stone-800 rounded-md p-2 text-center group hover:border-purple-500/30 transition-colors">
                                        <div className="text-[7px] text-stone-500 uppercase font-bold tracking-widest">Insight</div>
                                        <div className="text-sm font-bold text-purple-400">{combatant.passiveInsight ?? 10}</div>
                                    </div>
                                </MetricTooltip>
                            </div>

                            {/* Senses String */}
                            {combatant.senses && (
                                <div className="bg-stone-950/80 border border-stone-800 rounded-lg p-2.5">
                                    <h3 className="text-[8px] font-bold text-stone-500 uppercase tracking-widest mb-1">Special Senses</h3>
                                    <p className="text-[10px] text-parchment leading-tight font-medium italic">{combatant.senses}</p>
                                </div>
                            )}

                            {/* Resistances / Immunities / Vulnerabilities */}
                            <div className="space-y-3">
                                {(combatant.resistances?.length || 0) + (combatant.immunities?.length || 0) + (combatant.vulnerabilities?.length || 0) > 0 && (
                                    <div className="bg-stone-950/80 border border-stone-800 rounded-lg p-3 space-y-2">
                                        <h3 className="text-[8px] font-bold text-stone-500 uppercase tracking-widest">Resistances & Vitals</h3>
                                        <div className="flex flex-wrap gap-1">
                                            {combatant.immunities?.map(i => (
                                                <span key={i} className="text-[8px] uppercase font-black px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded">IMM: {i}</span>
                                            ))}
                                            {combatant.resistances?.map(r => (
                                                <span key={r} className="text-[8px] uppercase font-black px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">RES: {r}</span>
                                            ))}
                                            {combatant.vulnerabilities?.map(v => (
                                                <span key={v} className="text-[8px] uppercase font-black px-1.5 py-0.5 bg-blood/10 text-blood border border-blood/30 rounded">VULN: {v}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {combatant.legendaryActionsMax && combatant.legendaryActionsMax > 0 && (
                                    <div className="bg-stone-950/80 border border-stone-800 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-[8px] font-bold text-yellow-500 uppercase tracking-widest">👑 Legendary Actions</h3>
                                            <span className="text-[9px] font-bold text-stone-500">{combatant.legendaryActionsRemaining || 0} / {combatant.legendaryActionsMax}</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {Array.from({ length: combatant.legendaryActionsMax }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1.5 flex-1 rounded-full border transition-all ${i < (combatant.legendaryActionsRemaining || 0) ? 'bg-yellow-500 border-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.3)]' : 'bg-stone-800 border-stone-700'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {combatant.concentratingOn && (
                                    <div className="bg-arcane/5 border border-arcane/20 rounded-lg p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-md bg-arcane/20 border border-arcane/40 flex items-center justify-center text-arcane animate-pulse">
                                                <Zap size={14} />
                                            </div>
                                            <div>
                                                <span className="text-[7px] uppercase tracking-widest font-bold text-arcane/70">Concentrating</span>
                                                <p className="text-xs font-bold text-arcane-light">{combatant.concentratingOn.name}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setConcentration(combatant.id, null)}
                                            className="p-1 text-stone-600 hover:text-white hover:bg-stone-800 rounded transition-all"
                                            title="Drop Concentration"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer: Target Info (if targeting someone else) */}
                {selectedCombatant && selectedCombatant.id !== combatant.id && (
                    <div className="px-3 py-2 bg-cyan-950/20 border-t border-cyan-500/30 flex items-center gap-2 flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <div className="flex-1 min-w-0">
                            <span className="text-[7px] uppercase tracking-widest font-black text-cyan-400">Targeting</span>
                            <p className="text-[10px] font-bold text-parchment truncate">{selectedCombatant.name}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-[7px] uppercase tracking-widest font-bold text-stone-500">HP</span>
                            <p className="text-[10px] font-bold text-parchment leading-none">{selectedCombatant.currentHp}/{selectedCombatant.maxHp}</p>
                        </div>
                        <button onClick={() => setSelectedCombatant(null)} className="p-0.5 hover:bg-cyan-500/20 rounded text-cyan-400">
                            <X size={10} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
