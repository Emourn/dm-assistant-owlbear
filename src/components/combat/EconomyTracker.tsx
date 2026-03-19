import { useCombatStore } from '../../store/combatStore';
import { Sword, Zap, Shield, Crown } from 'lucide-react';
import { Combatant } from '../../types/combat';
import { MetricTooltip } from './MetricTooltip';

interface EconomyTrackerProps {
    combatant: Combatant;
    compact?: boolean;
}

export function EconomyTracker({ combatant, compact = false }: EconomyTrackerProps) {
    const toggleResource = useCombatStore((state) => state.toggleCombatantResource);

    const resources = [
        {
            key: 'action' as const,
            icon: Sword,
            active: combatant.hasAction ?? true,
            color: 'text-amber-400',
            label: 'Action',
            dimmedColor: 'text-stone-700'
        },
        {
            key: 'bonus' as const,
            icon: Zap,
            active: combatant.hasBonusAction ?? true,
            color: 'text-sky-400',
            label: 'Bonus Action',
            dimmedColor: 'text-stone-700'
        },
        {
            key: 'reaction' as const,
            icon: Shield,
            active: combatant.hasReaction ?? true,
            color: 'text-emerald-400',
            label: 'Reaction',
            dimmedColor: 'text-stone-700'
        }
    ];

    const showLegendary = combatant.legendaryActionsMax !== undefined;
    const legendaryActions = combatant.legendaryActionsRemaining ?? 0;
    const legendaryMax = combatant.legendaryActionsMax ?? 0;

    const extraActionsCount = combatant.extraActions || 0;
    const hasHaste = combatant.hasHasteAction ?? false;

    return (
        <div className={`flex items-center gap-1.5 ${compact ? 'scale-75 origin-left' : ''}`}>
            <MetricTooltip
                title="Action"
                description="Your primary action during a turn. Used for the most significant things you do."
                math="1 per turn (unless Action Surge or Haste allows more)."
                coaching="Standard actions include: Attack, Dash, Disengage, Dodge, Help, Hide, Ready, Search, and Use an Object."
                icon={<Sword size={12} className="text-amber-400" />}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleResource(combatant.id, 'action');
                    }}
                    className={`
                        p-1 rounded transition-all duration-200 hover:bg-stone-800 active:scale-95
                        ${combatant.hasAction ? 'text-amber-400 drop-shadow-[0_0_5px_currentColor]' : 'text-stone-700'}
                    `}
                >
                    <Sword size={compact ? 12 : 14} fill={combatant.hasAction ? 'currentColor' : 'none'} className="opacity-90" />
                </button>
            </MetricTooltip>

            {/* Haste Action */}
            {hasHaste && (
                <div
                    title="Haste Action: Available"
                    className="p-1 rounded text-cyan-400 drop-shadow-[0_0_5px_currentColor]"
                >
                    <div className="relative">
                        <Sword size={compact ? 12 : 14} fill="currentColor" className="opacity-90" />
                        <Zap size={compact ? 6 : 8} className="absolute -top-1 -right-1 text-white fill-current animate-pulse" />
                    </div>
                </div>
            )}

            {/* Extra Actions (Action Surge, etc) */}
            {extraActionsCount > 0 && Array.from({ length: extraActionsCount }).map((_, i) => (
                <div
                    key={i}
                    title="Extra Action (Action Surge): Available"
                    className="p-1 rounded text-orange-400 drop-shadow-[0_0_5px_currentColor]"
                >
                    <div className="relative">
                        <Sword size={compact ? 12 : 14} fill="currentColor" className="opacity-90" />
                        <span className="absolute -top-1 -right-1 text-[8px] font-black text-white bg-orange-600 rounded-full w-2.5 h-2.5 flex items-center justify-center">
                            !
                        </span>
                    </div>
                </div>
            ))}

            {resources.slice(1).map((res) => (
                <MetricTooltip
                    key={res.key}
                    title={res.label}
                    description={res.key === 'bonus'
                        ? "A quick additional action. You can only take one if a spell or feature specifically allows it."
                        : "An instant response to a trigger (like an Opportunity Attack)."}
                    math={res.key === 'bonus' ? "1 per turn." : "1 per round (resets at start of your turn)."}
                    coaching={res.key === 'bonus'
                        ? "Ask: 'Do you have a bonus action?' many players forget they have rogue abilities or spells that use this!"
                        : "Reactions happen OUTSIDE your turn. The most common is the Opportunity Attack when someone leaves your reach."}
                    icon={<res.icon size={12} className={res.color} />}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleResource(combatant.id, res.key);
                        }}
                        className={`
                            p-1 rounded transition-all duration-200 hover:bg-stone-800 active:scale-95
                            ${res.active ? `${res.color} drop-shadow-[0_0_5px_currentColor]` : res.dimmedColor}
                        `}
                    >
                        <res.icon size={compact ? 12 : 14} fill={res.active ? 'currentColor' : 'none'} className="opacity-90" />
                    </button>
                </MetricTooltip>
            ))}

            {showLegendary && (
                <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-stone-800">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleResource(combatant.id, 'legendary');
                        }}
                        className={`p-1 rounded transition-all ${legendaryActions > 0 ? 'text-purple-400 drop-shadow-[0_0_5px_currentColor]' : 'text-stone-700'}`}
                        title={`Legendary Actions: ${legendaryActions}/${legendaryMax}`}
                    >
                        <Crown size={compact ? 12 : 14} fill={legendaryActions > 0 ? 'currentColor' : 'none'} />
                    </button>
                    {!compact && legendaryMax > 1 && (
                        <div className="flex gap-0.5">
                            {Array.from({ length: legendaryMax }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1 h-1 rounded-full ${i < legendaryActions ? 'bg-purple-400 shadow-[0_0_3px_#a855f7]' : 'bg-stone-800'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
