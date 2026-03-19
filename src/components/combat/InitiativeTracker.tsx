import { useCombatStore } from '../../store/combatStore';
import { Skull, Shield, Clock } from 'lucide-react';
import { Combatant } from '../../types/combat';
import { Condition } from '../../types/character';
import { EconomyTracker } from './EconomyTracker';
import { MetricTooltip } from './MetricTooltip';

interface InitiativeTrackerProps {
    onConditionHover?: (name: string, e: React.MouseEvent) => void;
    onConditionLeave?: () => void;
}

export function InitiativeTracker({ onConditionHover, onConditionLeave }: InitiativeTrackerProps) {
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const setInitiative = useCombatStore((state) => state.setInitiative);
    const selectedCombatantId = useCombatStore((state) => state.selectedCombatantId);
    const setSelectedCombatant = useCombatStore((state) => state.setSelectedCombatant);

    if (!activeEncounter) return null;

    const { combatants, activeCombatantId, isActive } = activeEncounter;

    return (
        <div className="w-full bg-stone-950/80 backdrop-blur border-b border-stone-800 sticky top-0 z-40 shadow-xl overflow-x-auto custom-scrollbar">
            <div className="flex p-4 gap-4 min-w-max items-center">

                <div className="flex-shrink-0 flex flex-col items-center justify-center px-4 border-r border-stone-800 mr-2">
                    <MetricTooltip
                        title="Combat Initiative"
                        description="Initiative determines the order of turns in combat. It represents how quickly a creature reacts when a battle begins."
                        math="1d20 + Dexterity Modifier. Tied scores are broken by highest modifier or DM choice."
                        coaching="High rollers go sooner! Use this to build suspense: 'Thorin, you see them charging... you're up first!'"
                        icon={<Clock size={12} className="text-gold" />}
                    >
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest hover:text-stone-300">Round</span>
                    </MetricTooltip>
                    <span className="text-2xl font-cinzel font-bold text-gold">{activeEncounter.round}</span>
                </div>

                {combatants.map((c) => {
                    const isCurrent = c.id === activeCombatantId;
                    const isSelected = c.id === selectedCombatantId;
                    const isPlayer = c.type === 'player';

                    return (
                        <div
                            key={c.id}
                            onClick={() => setSelectedCombatant(c.id)}
                            className={`
                                relative flex items-center gap-3 px-4 py-2 rounded-lg border flex-shrink-0 min-w-[200px] transition-all cursor-pointer group/item
                                ${c.isDead ? 'opacity-40 grayscale' : 'opacity-100'}
                                ${isCurrent
                                    ? 'border-gold shadow-[0_0_15px_rgba(255,215,0,0.15)] bg-gold/5'
                                    : 'border-stone-800 bg-stone-900 hover:bg-stone-800/50 hover:border-stone-700'}
                                ${isSelected ? 'ring-2 ring-cyan-500/50 border-cyan-500/50' : ''}
                            `}
                        >
                            {/* Initiative Badge */}
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                ${isCurrent ? 'bg-gold text-stone-950' : 'bg-stone-950 border border-stone-700 text-stone-400'}
                            `}>
                                {!isActive ? (
                                    <input
                                        type="number"
                                        className="w-full h-full bg-transparent text-center focus:outline-none appearance-none"
                                        value={c.initiativeScore ?? ''}
                                        onChange={(e) => setInitiative(c.id, parseInt(e.target.value) || 0)}
                                        placeholder="-"
                                    />
                                ) : (
                                    c.initiativeScore ?? '-'
                                )}
                            </div>

                            {/* Combatant Info */}
                            <div className="flex-1 min-w-0">
                                <div className={`font-cinzel font-bold truncate text-sm flex items-center gap-1.5
                                    ${isPlayer ? 'text-arcane-light' : 'text-blood'}
                                    ${c.isDead ? 'line-through decoration-blood/50' : ''}
                                `}>
                                    {c.name}
                                    {c.isDead && <Skull size={12} className="text-blood opacity-50 block xl:hidden" />}
                                    {c.isSurprised && !c.isDead && (
                                        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-arcane/20 border border-arcane/50 text-arcane text-[10px] font-sans font-bold shadow-[0_0_5px_rgba(102,204,255,0.3)]" title="Surprised">
                                            !
                                        </div>
                                    )}
                                    {c.concentratingOn && !c.isDead && (
                                        <div
                                            className={`
                                                flex items-center gap-1 px-1.5 py-0.5 rounded shadow-lg border animate-in zoom-in-75 duration-300
                                                bg-yellow-900/30 border-yellow-700/50 text-yellow-400 group/conc
                                            `}
                                            title={`Concentrating on ${c.concentratingOn.name}`}
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_5px_#fbbf24]"></div>
                                            <span className="text-[9px] font-bold tracking-tighter">CONC</span>
                                        </div>
                                    )}
                                </div>

                                {/* Mini health bar */}
                                <div className="h-1.5 w-full bg-stone-950 rounded-full mt-1.5 overflow-hidden flex">
                                    <div
                                        className={`h-full transition-all duration-300 ${isPlayer ? 'bg-arcane' : 'bg-blood'}`}
                                        style={{ width: `${Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100))}%` }}
                                    ></div>
                                    {c.tempHp > 0 && (
                                        <div className="h-full bg-gold/80 flex-shrink-0" style={{ width: '10%' }}></div>
                                    )}
                                </div>

                                <div className="mt-1">
                                    <EconomyTracker combatant={c} compact={true} />
                                </div>
                            </div>

                            {/* AC display */}
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-stone-900 border border-stone-700 rounded-full flex items-center justify-center shadow-lg" title="Armor Class">
                                <Shield size={10} className={isPlayer ? 'text-arcane' : 'text-blood'} />
                                <span className="text-[9px] font-bold text-parchment absolute">{c.ac}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Global Status Dashboard */}
            {combatants.some(c => c.conditions.length > 0) && (
                <div className="flex px-4 pb-3 pt-1 gap-2 overflow-x-auto no-scrollbar border-t border-stone-900/50">
                    <div className="flex-shrink-0 flex items-center gap-2 pr-3 border-r border-stone-800 mr-1">
                        <Clock size={12} className="text-stone-500" />
                        <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">Active Effects</span>
                    </div>
                    {combatants.flatMap((c: Combatant) => c.conditions.map((cond: Condition) => ({ ...cond, combatantName: c.name, combatantId: c.id }))).map((cond, idx) => (
                        <div
                            key={`${cond.combatantId}-${cond.id}-${idx}`}
                            onClick={() => setSelectedCombatant(cond.combatantId)}
                            onMouseEnter={(e) => onConditionHover?.(cond.name, e)}
                            onMouseLeave={() => onConditionLeave?.()}
                            className={`
                                flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all cursor-pointer group/status
                                ${selectedCombatantId === cond.combatantId
                                    ? 'bg-gold/10 border-gold/30 ring-1 ring-gold/20'
                                    : 'bg-stone-900/40 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40'}
                            `}
                        >
                            <span className={`text-[10px] font-bold ${selectedCombatantId === cond.combatantId ? 'text-gold' : 'text-stone-400'}`}>
                                {cond.combatantName}:
                            </span>
                            <span className="text-[10px] text-parchment font-medium">{cond.name}</span>
                            {cond.duration !== undefined && (
                                <span className="flex items-center gap-0.5 text-[10px] text-sky-400 bg-sky-950/30 px-1 rounded ml-1">
                                    {cond.duration}r
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
