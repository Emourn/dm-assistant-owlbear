import { useCombatStore } from '../../store/combatStore';
import { useRef, useEffect, useState, useCallback } from 'react';
import { ScrollText, Dice5, Crosshair, HeartPulse, Sparkles, ShieldAlert, Undo2, ChevronUp } from 'lucide-react';

interface CombatLogProps {
    variant?: 'default' | 'drawer';
    isExpanded?: boolean;
    onToggle?: (expanded: boolean) => void;
}

export function CombatLog({ variant = 'default', isExpanded: propIsExpanded, onToggle }: CombatLogProps) {
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const pastStates = useCombatStore((state) => state.pastStates);
    const undo = useCombatStore((state) => state.undo);
    const scrollRef = useRef<HTMLDivElement>(null);
    const drawerRef = useRef<HTMLDivElement>(null);
    const [localExpanded, setLocalExpanded] = useState(false);
    const closeTimerRef = useRef<number | null>(null);

    const isExpanded = propIsExpanded !== undefined ? propIsExpanded : localExpanded;

    const setExpanded = useCallback((val: boolean) => {
        setLocalExpanded(val);
        onToggle?.(val);
    }, [onToggle]);

    // Auto-scroll to bottom on new log entry
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activeEncounter?.log.length, isExpanded]);

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
            setExpanded(false);
        }, delay);
    }, [clearCloseTimer, setExpanded]);

    // Auto-reveal for drawer variant
    useEffect(() => {
        if (variant !== 'drawer') return;

        const EDGE_THRESHOLD = 60; // px from bottom

        const handleMouseMove = (e: MouseEvent) => {
            const distFromBottom = window.innerHeight - e.clientY;
            const isNearBottom = distFromBottom < EDGE_THRESHOLD;
            const isOverDrawer = drawerRef.current?.contains(e.target as Node);

            if (isNearBottom || isOverDrawer) {
                clearCloseTimer();
                if (!isExpanded) {
                    setExpanded(true);
                }
            } else if (isExpanded && !isOverDrawer) {
                if (!closeTimerRef.current) {
                    scheduleClose(500);
                }
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearCloseTimer();
        };
    }, [variant, isExpanded, clearCloseTimer, scheduleClose, setExpanded]);

    if (!activeEncounter) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case 'roll': return <Dice5 size={12} className="text-arcane" />;
            case 'damage': return <Crosshair size={12} className="text-blood" />;
            case 'heal': return <HeartPulse size={12} className="text-green-400" />;
            case 'action': return <Sparkles size={12} className="text-gold" />;
            case 'system': return <ShieldAlert size={12} className="text-stone-500" />;
            default: return <ScrollText size={12} className="text-stone-400" />;
        }
    };

    const isDrawer = variant === 'drawer';

    return (
        <div
            ref={drawerRef}
            className={`
                flex flex-col bg-stone-900/97 backdrop-blur-xl border border-stone-700/50 shadow-2xl overflow-hidden
                transition-all duration-200 ease-out
                ${isDrawer
                    ? 'absolute bottom-0 left-1/2 -translate-x-1/2 w-[min(90%,800px)] rounded-t-xl'
                    : 'flex-1 rounded-lg max-h-[400px]'
                }
                ${isDrawer && !isExpanded ? 'h-10' : isDrawer ? 'h-56' : 'h-full'}
            `}
            style={isDrawer ? { zIndex: 30 } : undefined}
        >
            {/* Header */}
            <div
                className="bg-stone-950/60 px-3 py-1.5 border-b border-stone-800/80 flex items-center justify-between cursor-pointer select-none flex-shrink-0"
                onClick={() => isDrawer && setExpanded(!isExpanded)}
            >
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ScrollText size={13} className={isDrawer && isExpanded ? 'text-gold' : 'text-stone-500'} />
                    Combat Log
                    {isDrawer && !isExpanded && activeEncounter.log.length > 0 && (
                        <span className="text-[9px] text-stone-600 font-normal normal-case ml-1.5 truncate max-w-[300px]">
                            — {activeEncounter.log[activeEncounter.log.length - 1].message}
                        </span>
                    )}
                </h3>

                <div className="flex items-center gap-1.5">
                    {pastStates.length > 0 && isExpanded && (
                        <button
                            onClick={(e) => { e.stopPropagation(); undo(); }}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-stone-900 border border-stone-700 text-[9px] font-bold text-stone-400 uppercase hover:text-gold hover:border-gold/50 transition-all rounded active:scale-95"
                            title="Undo last combat action"
                        >
                            <Undo2 size={10} /> Undo
                        </button>
                    )}
                    <span className="text-[9px] text-stone-500 bg-stone-900/80 px-1.5 py-0.5 rounded border border-stone-800">
                        R{activeEncounter.round}
                    </span>
                    {isDrawer && (
                        <ChevronUp size={12} className={`text-stone-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                </div>
            </div>

            {/* Log Entries */}
            <div
                ref={scrollRef}
                className={`flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar min-h-0 transition-opacity duration-200 ${isDrawer && !isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
                {activeEncounter.log.length === 0 ? (
                    <div className="text-center text-stone-600 text-xs italic mt-4">No log entries yet.</div>
                ) : (
                    activeEncounter.log.map((entry) => (
                        <div key={entry.id} className="flex gap-2 text-xs">
                            <div className="pt-0.5 w-5 h-5 flex-shrink-0 bg-stone-950/80 border border-stone-800 rounded flex items-center justify-center">
                                {getIcon(entry.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[9px] text-stone-600 font-mono">
                                    {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <div className={`mt-0 leading-snug ${entry.type === 'system' ? 'text-stone-400 italic' :
                                    entry.type === 'damage' ? 'text-blood font-medium' :
                                        entry.type === 'heal' ? 'text-green-400 font-medium' :
                                            entry.type === 'roll' ? 'text-arcane-light' :
                                                'text-parchment'
                                    }`}>
                                    {entry.message}
                                </div>

                                {entry.details && entry.type === 'roll' && entry.details.rolls && (
                                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                                        {entry.details.rolls.map((r: number, i: number) => (
                                            <span key={i} className="text-[9px] bg-stone-950 border border-stone-800 text-stone-400 px-1 py-0 rounded">
                                                [{r}]
                                            </span>
                                        ))}
                                        {entry.details.modifier !== 0 && (
                                            <span className="text-[9px] text-stone-500 px-0.5 font-mono">
                                                {entry.details.modifier > 0 ? '+' : ''}{entry.details.modifier}
                                            </span>
                                        )}
                                        <span className="text-[10px] font-bold text-arcane ml-0.5 border border-arcane/30 px-1 rounded bg-arcane/10">
                                            = {entry.details.total}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
