import { useCombatStore } from '../../store/combatStore';
import { Shield, Zap, User, Sword, Clock } from 'lucide-react';
import { EconomyTracker } from './EconomyTracker';
import { MetricTooltip } from './MetricTooltip';

interface PortraitRibbonProps {
    onConditionHover?: (name: string, e: React.MouseEvent) => void;
    onConditionLeave?: () => void;
}

export function PortraitRibbon({ onConditionHover, onConditionLeave }: PortraitRibbonProps) {
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const selectedCombatantId = useCombatStore((state) => state.selectedCombatantId);
    const setSelectedCombatant = useCombatStore((state) => state.setSelectedCombatant);

    if (!activeEncounter || !activeEncounter.isActive) return null;

    const { combatants = [], activeCombatantId } = activeEncounter;

    return (
        <div id="portrait-ribbon-container" className="w-full bg-stone-900 border-b border-stone-800 sticky top-0 z-40 shadow-2xl">
            <div className="flex items-center gap-6 px-6 py-4 overflow-x-auto no-scrollbar min-h-[110px]">
                {combatants.map((c) => {
                    const isActive = c.id === activeCombatantId;
                    const isSelected = c.id === selectedCombatantId;
                    const isPlayer = c.type === 'player';
                    const isEnemy = c.type === 'monster';
                    const isFriendly = c.type === 'npc';

                    const borderColor = isActive
                        ? 'border-gold shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                        : isSelected
                            ? 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                            : 'border-stone-700 hover:border-stone-500';

                    const ringColor = isActive
                        ? 'ring-gold/50'
                        : isSelected
                            ? 'ring-cyan-400/50'
                            : 'ring-transparent';

                    const healthPercent = Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100));

                    return (
                        <div
                            key={c.id}
                            className={`flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer transition-all duration-300 relative ${c.isDead ? 'opacity-40 grayscale' : 'opacity-100'}`}
                            onClick={() => setSelectedCombatant(c.id)}
                        >
                            <div className={`
                                relative w-14 h-14 rounded-full border-2 transition-all duration-500 flex items-center justify-center p-0.5
                                bg-stone-950 ring-2
                                ${borderColor} ${ringColor}
                            `}>
                                <div className={`
                                    w-full h-full rounded-full flex items-center justify-center overflow-hidden
                                    ${isPlayer ? 'bg-indigo-900/40' : isEnemy ? 'bg-red-900/40' : 'bg-emerald-900/40'}
                                `}>
                                    {c.portraitUrl ? (
                                        <div className="w-full h-full relative group/img">
                                            <img
                                                src={c.portraitUrl}
                                                alt={c.name}
                                                className="w-full h-full object-cover scale-[1.15]"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                            <div className="hidden absolute inset-0 flex items-center justify-center">
                                                {isPlayer ? (
                                                    <User size={24} className="text-indigo-400" />
                                                ) : isFriendly ? (
                                                    <Shield size={24} className="text-emerald-400" />
                                                ) : (
                                                    <Sword size={24} className="text-red-400" />
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        isPlayer ? (
                                            <User size={24} className="text-indigo-400" />
                                        ) : isFriendly ? (
                                            <Shield size={24} className="text-emerald-400" />
                                        ) : (
                                            <Sword size={24} className="text-red-400" />
                                        )
                                    )}
                                </div>

                                <MetricTooltip
                                    title="Initiative Score"
                                    description="This character's position in the turn order for this round."
                                    coaching="Combat proceeds from highest to lowest initiative."
                                    icon={<Clock size={12} className="text-gold" />}
                                >
                                    <div className={`
                                        absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow-lg
                                        ${isActive ? 'bg-gold border-stone-800 text-stone-950' : 'bg-stone-900 border-stone-800 text-stone-400'}
                                    `}>
                                        {c.initiativeScore}
                                    </div>
                                </MetricTooltip>

                                {isActive && (
                                    <div className="absolute inset-0 rounded-full animate-ping ring-4 ring-gold/20 pointer-events-none"></div>
                                )}

                                {isSelected && (
                                    <div className="absolute -top-1 -left-1 bg-cyan-500 text-white rounded-full p-1 shadow-lg border border-cyan-400 animate-bounce">
                                        <Zap size={10} fill="currentColor" />
                                    </div>
                                )}
                            </div>

                            <span className={`
                                text-[10px] font-bold tracking-widest uppercase truncate max-w-[70px]
                                ${isActive ? 'text-gold' : isSelected ? 'text-cyan-400' : 'text-stone-500 group-hover:text-stone-300'}
                            `}>
                                {c.name.split(' ')[0]}
                            </span>

                            {!c.isDead && c.currentHp > 0 && (
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-10 h-1 bg-stone-950 rounded-full overflow-hidden border border-stone-800/30">
                                        <div
                                            className={`h-full ${isPlayer ? 'bg-indigo-500' : 'bg-red-500'} transition-all`}
                                            style={{ width: `${healthPercent}%` }}
                                        ></div>
                                    </div>
                                    <EconomyTracker combatant={c} compact={true} />

                                    {/* Mini Condition Badges */}
                                    {c.conditions.length > 0 && (
                                        <div className="flex flex-wrap justify-center gap-0.5 mt-1 max-w-[80px]">
                                            {c.conditions.map((cond, idx) => (
                                                <div
                                                    key={cond.id || idx}
                                                    onMouseEnter={(e) => onConditionHover?.(cond.name, e)}
                                                    onMouseLeave={() => onConditionLeave?.()}
                                                    className={`
                                                        w-2 h-2 rounded-full border-[0.5px]
                                                        ${cond.type === 'buff' ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_3px_rgba(34,211,238,0.5)]' : 'bg-blood border-blood/50 shadow-[0_0_3px_rgba(220,38,38,0.5)]'}
                                                    `}
                                                    title={cond.name}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Death Saves for Players at 0HP */}
                            {!c.isDead && c.currentHp <= 0 && c.type === 'player' && c.deathSaves && (
                                <div className="flex flex-col gap-1 items-center animate-pulse">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3].map(i => (
                                            <div key={`s-${i}`} className={`w-1.5 h-1.5 rounded-full border-[0.5px] border-stone-700 ${c.deathSaves!.successes >= i ? 'bg-green-500' : 'bg-stone-900'}`} />
                                        ))}
                                    </div>
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3].map(i => (
                                            <div key={`f-${i}`} className={`w-1.5 h-1.5 rounded-full border-[0.5px] border-stone-700 ${c.deathSaves!.failures >= i ? 'bg-blood' : 'bg-stone-900'}`} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {c.isJoinedMidRound && (
                                <div className="absolute -top-1 -right-1 bg-stone-800 text-stone-400 text-[7px] font-bold px-1 rounded border border-stone-700">
                                    WAIT
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div >
    );
}
