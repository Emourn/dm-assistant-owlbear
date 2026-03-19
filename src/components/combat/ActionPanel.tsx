import OBR from '@owlbear-rodeo/sdk';
import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCombatStore } from '../../store/combatStore';
import { useCharacterStore } from '../../store/characterStore';
import {
    ABILITY_NAMES,
    SAVE_DESCRIPTIONS,
    getPlayerCombatActions,
    getMonsterCombatActions
} from '../../engine/combatActions';
import { Combatant, CombatAction } from '../../types/combat';
import { Swords, Sparkles, BookOpen, Backpack, ScrollText, Crown, ShieldAlert, Zap, X, Skull, Info } from 'lucide-react';
import { getSourceBadgeColor } from '../common/InfoTooltip';
import { useAltKey } from '../../hooks/useAltKey';
import { SpellSlotTracker } from './SpellSlotTracker';
import { getMasteryProperty, hasMastery } from '../../engine/weaponMasteryEngine';
import { getEmbersSpellId, triggerEmbersSpellFromCombatant } from '../../owlbear/integrations';

// Tab icons map
const TAB_ICONS: Record<string, any> = {
    'Attacks': Swords,
    'Actions': Swords,
    'Spells': Sparkles,
    'Features': BookOpen,
    'Items': Backpack,
    'Traits': ScrollText,
    'Legendary': Crown,
    'Reactions': ShieldAlert,
    'Standard': Zap,
    'Bonus': Zap
};

const ECONOMY_COLORS: Record<string, string> = {
    action: 'bg-gold/20 text-gold border-gold/30',
    bonus: 'bg-arcane/20 text-arcane border-arcane/30',
    reaction: 'bg-blood/20 text-blood border-blood/30',
    legendary: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    free: 'bg-stone-700/30 text-stone-400 border-stone-600',
    trait: 'bg-stone-700/30 text-stone-400 border-stone-600'
};

const ECONOMY_LABELS: Record<string, string> = {
    action: 'Action',
    bonus: 'Bonus Action',
    reaction: 'Reaction',
    legendary: 'Legendary',
    free: 'Free',
    trait: 'Passive'
};

interface ActionPanelProps {
    combatant: Combatant;
    selectedTarget?: Combatant | null;
    onActionClick?: (action: CombatAction) => void;
    onActionHover?: (action: CombatAction | null) => void;
}

export function ActionPanel({ combatant, selectedTarget = null, onActionClick, onActionHover }: ActionPanelProps) {
    const characters = useCharacterStore(s => s.characters);
    const activeEncounter = useCombatStore(s => s.activeEncounter);

    const [activeTab, setActiveTab] = useState<string>('');
    const [hoveredAction, setHoveredAction] = useState<CombatAction | null>(null);
    const [castingActionId, setCastingActionId] = useState<string | null>(null);

    const [dmOverride, setDmOverride] = useState(false);
    const hoveredElementRef = useRef<HTMLDivElement | null>(null);
    const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
    const isHoveringRef = useRef(false);

    useEffect(() => {

        setHoveredAction(null);
        hoveredElementRef.current = null;
        setCastingActionId(null);
    }, [combatant.id]);

    useEffect(() => {
        setHoveredAction(null);
        hoveredElementRef.current = null;
    }, [activeTab]);

    const altPressed = useAltKey();

    useEffect(() => {
        if (!hoveredAction || !hoveredElementRef.current) return;
        const updateRect = () => {
            if (hoveredElementRef.current) {
                setHoverRect(hoveredElementRef.current.getBoundingClientRect());
            }
        };
        updateRect();
        window.addEventListener('scroll', updateRect, true);
        window.addEventListener('resize', updateRect);
        return () => {
            window.removeEventListener('scroll', updateRect, true);
            window.removeEventListener('resize', updateRect);
        };
    }, [hoveredAction]);

    useEffect(() => {
        if (!altPressed && !isHoveringRef.current) {
            setHoveredAction(null);
        }
    }, [altPressed]);

    // Build action list based on combatant type
    const allActions = useMemo(() => {
        if (combatant.type === 'player' && combatant.sourceId) {
            const char = characters.find(c => c.id === combatant.sourceId);
            if (char) return getPlayerCombatActions(char);
        }
        if (combatant.type === 'monster' || combatant.type === 'npc') {
            return getMonsterCombatActions(combatant.monsterData);
        }
        return [];
    }, [combatant, characters]);

    // Group by category (tab)
    const categories = useMemo(() => {
        const grouped: Record<string, CombatAction[]> = {};
        allActions.forEach(a => {
            const cat = a.category;
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(a);
        });
        return grouped;
    }, [allActions]);

    const tabKeys = Object.keys(categories);

    // Auto-select first tab
    if (!activeTab && tabKeys.length > 0) {
        const preferred = tabKeys.find(t => t !== 'Standard') || tabKeys[0];
        setActiveTab(preferred);
    }

    const currentActions = categories[activeTab] || [];

    // ---- Handlers ----
    const handleActionClick = (action: CombatAction) => {
        onActionClick?.(action);
    };

    const handleTriggerEmbers = async (action: CombatAction) => {
        setCastingActionId(action.id);
        try {
            await triggerEmbersSpellFromCombatant(combatant, action.name, selectedTarget);
        } finally {
            setCastingActionId((current) => current === action.id ? null : current);
        }
    };

    const handleSavingThrow = (ability: string) => {
        const abilityScores = combatant.abilityScores;
        if (!abilityScores) return;

        const score = Number((abilityScores as any)[ability]) || 10;
        const mod = Math.floor((score - 10) / 2);
        const profBonus = combatant.savingThrowProficiencies?.includes(ability) ? (combatant.proficiencyBonus || 2) : 0;
        const totalMod = mod + profBonus;

        const saveAction: CombatAction = {
            id: `save-${ability}`,
            name: `${ABILITY_NAMES[ability]} Saving Throw`,
            economy: 'free',
            category: 'Saves',
            description: SAVE_DESCRIPTIONS[ability] || '',
            saveDc: 0,
            saveAbility: ability,
            sourceType: 'generic',
            icon: '🛡️',
            toHit: totalMod,
            actionType: 'save-spell'
        };

        onActionClick?.(saveAction);
    };

    const handleDeathSave = () => {
        const deathSaveAction: CombatAction = {
            id: 'death-save',
            name: 'Death Saving Throw',
            economy: 'action',
            category: 'Standard',
            description: 'You are at 0 HP. Roll a d20 to see if you stabilize or die.',
            sourceType: 'generic',
            icon: '💀',
            actionType: 'death-save'
        };
        onActionClick?.(deathSaveAction);
    };



    const triggerReadiedAction = () => {
        useCombatStore.getState().addLog({ message: `${combatant.name} triggers their readied action! "${combatant.readiedAction?.description}"`, type: 'system', combatantId: combatant.id });
        if (activeEncounter?.turnState.hasReaction) useCombatStore.getState().consumeReaction();
        useCombatStore.getState().setReadiedAction(combatant.id, null);
    };

    const cancelReadiedAction = () => {
        useCombatStore.getState().addLog({ message: `${combatant.name} cancelled their readied action.`, type: 'system', combatantId: combatant.id });
        useCombatStore.getState().setReadiedAction(combatant.id, null);
    };

    // ---- Render ----
    if (combatant.type === 'player' && combatant.currentHp <= 0 && !dmOverride) {
        const dSaves = combatant.deathSaves || { successes: 0, failures: 0 };
        const isDead = dSaves.failures >= 3;
        const isStable = dSaves.successes >= 3;

        return (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div className="bg-stone-950 border border-blood/50 rounded-lg overflow-hidden shadow-2xl">
                    <div className="bg-blood/20 p-4 border-b border-blood/50 flex flex-col items-center justify-center relative">
                        <h3 className="text-blood font-bold text-xl uppercase tracking-widest flex items-center gap-2">
                            {isDead && <Skull size={24} className="animate-pulse" />}
                            {isDead ? 'DECEASED' : isStable ? 'STABILIZED' : 'UNCONSCIOUS'}
                        </h3>
                        <p className="text-blood/70 text-xs mt-1">Make death saving throws on your turn.</p>

                        <button
                            onClick={() => setDmOverride(true)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-stone-900/50 hover:bg-blood/30 border border-blood/30 p-2 rounded-lg text-blood/50 hover:text-white transition-all group flex items-center gap-2"
                            title="DM Override: Show actions anyway (for special rulings)"
                        >
                            <ShieldAlert size={14} className="group-hover:animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest">DM Override</span>
                        </button>
                    </div>
                    {!isDead && !isStable && (
                        <div className="p-6 flex flex-col items-center gap-6">
                            <div className="flex w-full justify-around max-w-sm">
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-parchment text-xs font-bold uppercase tracking-wider">Successes</span>
                                    <div className="flex gap-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className={`w-4 h-4 rounded-full border-2 ${dSaves.successes >= i ? 'bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-transparent border-stone-700'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-blood text-xs font-bold uppercase tracking-wider">Failures</span>
                                    <div className="flex gap-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className={`w-4 h-4 rounded-full border-2 ${dSaves.failures >= i ? 'bg-blood border-blood shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-transparent border-stone-700'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="max-w-md w-full bg-stone-900 shadow-inner rounded-xl p-4 border border-stone-800/80 space-y-3">
                                <div className="space-y-1">
                                    <h5 className="text-[10px] font-black uppercase text-blood tracking-widest flex items-center gap-2">
                                        <Info size={12} /> The Rules of Dying
                                    </h5>
                                    <p className="text-[11px] text-stone-300 leading-relaxed italic">
                                        Roll a <span className="text-parchment font-bold">d20</span>. On a <span className="text-gold font-bold text-xs">10 or higher</span>, you succeed!
                                        3 successes and you stabilize. 3 failures and you're gone.
                                    </p>
                                </div>
                                <div className="pt-2 border-t border-stone-800 space-y-1">
                                    <h5 className="text-[10px] font-black uppercase text-gold tracking-widest flex items-center gap-2">
                                        <BookOpen size={12} /> DM Coaching
                                    </h5>
                                    <p className="text-[11px] text-parchment font-bold leading-relaxed border-l-2 border-gold/30 pl-2 text-pretty">
                                        Tell your player: "Roll for your life!" <br />
                                        <span className="text-cyan-400">Natural 20:</span> You instantly regain 1 HP and stand up. <br />
                                        <span className="text-blood">Natural 1:</span> TWO failures at once.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleDeathSave}
                                className="bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-gold px-8 py-3 rounded-lg text-gold font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 font-medieval"
                            >
                                <Zap size={16} /> Roll Death Save
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ---- Render - Main View ----
    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300 max-w-[calc(100vw-450px)]">
            <div className="bg-stone-900/40 backdrop-blur-xl border border-gold/20 rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                {/* Tab Bar Container */}
                <div className="flex items-center justify-between bg-stone-950/40 border-b border-stone-800/50">
                    {dmOverride && (
                        <div className="pl-4 pr-2 border-r border-stone-800 animate-in slide-in-from-left-2 duration-300">
                            <button
                                onClick={() => setDmOverride(false)}
                                className="flex items-center gap-2 bg-blood/10 hover:bg-blood/20 border border-blood/30 px-2 py-1 rounded text-[9px] text-blood font-black uppercase tracking-widest"
                            >
                                <X size={10} /> Exit Override
                            </button>
                        </div>
                    )}
                    <div className="flex overflow-x-auto custom-scrollbar flex-1">
                        {tabKeys.map(tab => {
                            const Icon = TAB_ICONS[tab] || Zap;
                            const count = categories[tab].length;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${activeTab === tab
                                        ? 'border-gold text-gold bg-stone-950/60'
                                        : 'border-transparent text-stone-500 hover:text-stone-300 hover:bg-stone-900'
                                        }`}
                                >
                                    <Icon size={14} />
                                    {tab}
                                    <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-gold/20 text-gold' : 'bg-stone-800 text-stone-500'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                </div>



                {/* Readied Action Banner */}
                {combatant.readiedAction && (
                    <div className="bg-arcane/20 border-b border-arcane/40 p-3 flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <span className="text-arcane font-bold text-[10px] uppercase tracking-wider block flex items-center gap-1"><Zap size={10} /> Readied Action</span>
                            <span className="text-parchment text-xs font-medium">{combatant.readiedAction.description}</span>
                            <span className="text-stone-400 text-xs italic ml-2">Trigger: {combatant.readiedAction.trigger}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={triggerReadiedAction} className="px-3 py-1 bg-arcane/30 text-arcane text-xs font-bold rounded hover:bg-arcane/50 border border-arcane/50 transition-colors">Trigger</button>
                            <button onClick={cancelReadiedAction} className="px-3 py-1 bg-stone-800/80 text-stone-400 text-xs font-bold rounded hover:bg-stone-700 border border-stone-700">Cancel</button>
                        </div>
                    </div>
                )}

                {/* Saving Throw Quick Bar */}
                {combatant.abilityScores && (
                    <div className="flex items-center justify-between px-4 py-2 bg-stone-900/40 border-b border-stone-800">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mr-2">Saves:</span>
                            {Object.entries(combatant.abilityScores).map(([ability, score]) => {
                                const mod = Math.floor((Number(score) - 10) / 2);
                                const profBonus = combatant.savingThrowProficiencies?.includes(ability) ? (combatant.proficiencyBonus || 2) : 0;
                                const total = mod + profBonus;
                                const isProficient = combatant.savingThrowProficiencies?.includes(ability);
                                return (
                                    <button
                                        key={ability}
                                        onClick={() => handleSavingThrow(ability)}
                                        className={`flex flex-col items-center px-2 py-1 rounded text-[10px] transition-all ${isProficient ? 'bg-gold/10 border border-gold/30 text-gold' : 'bg-stone-900 border border-stone-800 text-stone-400'}`}
                                    >
                                        <span className="uppercase font-bold">{ability}</span>
                                        <span className={`font-mono ${total >= 0 ? 'text-green-400' : 'text-blood'}`}>{total >= 0 ? '+' : ''}{total}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Action Cards Grid */}
                <div className="p-4">
                    {activeTab === 'Spells' && <SpellSlotTracker combatant={combatant} />}
                    {activeTab === 'Spells' && OBR.isAvailable && (
                        <div className="mb-3 rounded-lg border border-arcane/30 bg-arcane/8 px-3 py-2 text-[11px] text-stone-300">
                            Spell actions with an <span className="font-black uppercase tracking-wider text-arcane-light">Embers</span> button can send their mapped visual effect to Owlbear.
                            {selectedTarget ? ` ${selectedTarget.name} is the current combat target.` : ' Select a target token on the map, or target another combatant, before casting.'}
                        </div>
                    )}
                    {currentActions.length === 0 ? (
                        <div className="text-center text-stone-500 text-sm italic py-8">No actions in this category.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                            {currentActions.map(action => {
                                // Rule Enforcements
                                const turnState = activeEncounter?.turnState;
                                let isRestricted = false;
                                let restrictionReason = "";

                                if (turnState && !dmOverride) {
                                    // 1. Bonus Action Spell Rule (PHB p.202)
                                    // "If you cast a spell as a bonus action, you can't cast another spell
                                    //  during the same turn, except a cantrip with a casting time of 1 action."
                                    // This works BOTH directions in practice.
                                    const isSpell = action.category === 'Spells';
                                    const isCantrip = action.spellLevel === 0;
                                    const isBonusSpell = isSpell && action.economy === 'bonus';

                                    // Direction 1: BA spell was cast → only cantrips allowed as Action spells
                                    if (turnState.hasCastBonusActionSpell && isSpell && !isCantrip && action.economy === 'action') {
                                        isRestricted = true;
                                        restrictionReason = "BA Spell Cast — Only Cantrips Allowed";
                                    }
                                    // Direction 2: Leveled Action spell was cast → no BA leveled spells
                                    if (turnState.hasCastLeveledSpell && isBonusSpell && !isCantrip) {
                                        isRestricted = true;
                                        restrictionReason = "Leveled Spell Cast — BA Spell Blocked";
                                    }

                                    // 2. Haste Restricted Action
                                    // If only Haste Action remains, only specific actions are valid
                                    const onlyHasteLeft = !turnState.hasAction && turnState.hasHasteAction;
                                    if (onlyHasteLeft) {
                                        const allowedHasteNames = ['Attack', 'Dash', 'Disengage', 'Hide', 'Use Object'];
                                        const isAllowedHaste = allowedHasteNames.some(n => action.name.includes(n));
                                        if (!isAllowedHaste) {
                                            isRestricted = true;
                                            restrictionReason = "Haste Restriction";
                                        } else if (action.name.includes('Attack') && action.attacksPerAction && action.attacksPerAction > 1) {
                                            // Haste Attack is ONE weapon attack only
                                            // We'll let the user click but maybe the wizard should handle the limit
                                        }
                                    }

                                    // 3. Economy Check
                                    const hasEconomy = (action.economy === 'action' && (turnState.hasAction || turnState.extraActions > 0 || turnState.hasHasteAction)) ||
                                        (action.economy === 'bonus' && turnState.hasBonusAction) ||
                                        (action.economy === 'reaction' && turnState.hasReaction) ||
                                        (action.economy === 'free' || action.economy === 'trait');

                                    if (!hasEconomy) {
                                        isRestricted = true;
                                        restrictionReason = "No Economy";
                                    }
                                }

                                const embersSpellId = OBR.isAvailable && action.category === 'Spells'
                                    ? getEmbersSpellId(action.name)
                                    : null;
                                const canTriggerEmbers = Boolean(embersSpellId);
                                const embersDisabled = (isRestricted && !dmOverride) || castingActionId === action.id;

                                return (
                                    <div
                                        key={action.id}
                                        className={`relative group ${isRestricted ? 'opacity-40 grayscale-[0.5]' : ''}`}
                                        title={restrictionReason}
                                        onMouseEnter={(e) => {
                                            setHoveredAction(action);
                                            hoveredElementRef.current = e.currentTarget;
                                            isHoveringRef.current = true;
                                            onActionHover?.(action);
                                        }}
                                        onMouseLeave={() => {
                                            isHoveringRef.current = false;
                                            if (!altPressed) {
                                                setHoveredAction(null);
                                                onActionHover?.(null);
                                            }
                                        }}
                                    >
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <button
                                                onClick={() => handleActionClick(action)}
                                                disabled={isRestricted && !dmOverride}
                                                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${isRestricted
                                                    ? 'bg-stone-900/10 border-stone-800/50'
                                                    : 'bg-stone-800/30 backdrop-blur-md border-stone-700/50 hover:border-gold/50 hover:bg-stone-800/50 hover:shadow-[0_0_15px_rgba(217,119,6,0.1)] hover:-translate-y-0.5 active:translate-y-0'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <div className="flex items-center gap-2.5 truncate">
                                                        <span className="text-lg">{action.icon}</span>
                                                        <span className={`font-bold text-base leading-tight ${isRestricted ? 'text-stone-500' : 'text-parchment'}`}>{action.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        {isRestricted && (
                                                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-blood/10 text-blood border border-blood/30 font-black uppercase tracking-tighter">
                                                                {restrictionReason}
                                                            </span>
                                                        )}
                                                        {action.source && (
                                                            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${getSourceBadgeColor(action.source)}`}>
                                                                {action.source}
                                                            </span>
                                                        )}
                                                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${ECONOMY_COLORS[action.economy]}`}>{ECONOMY_LABELS[action.economy]}</span>
                                                    </div>
                                                </div>

                                                {action.requiresConcentration && combatant.concentratingOn && (
                                                    <div className="flex items-center gap-1.5 px-2 py-1 mb-2 rounded bg-amber-900/20 border border-amber-700/50 text-amber-500 animate-in slide-in-from-top-1 duration-200">
                                                        <Info size={10} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest shadow-text">Warn: Already Concentrating on {combatant.concentratingOn.name}</span>
                                                    </div>
                                                )}

                                                <div className="flex gap-2.5 mt-2">
                                                    {action.toHit !== undefined && <span className="text-xs text-arcane font-medium">+{action.toHit} hit</span>}
                                                    {action.damageNotation && <span className="text-xs text-blood font-medium">{action.damageNotation}</span>}

                                                    {/* Weapon Mastery Display */}
                                                    {action.sourceType === 'weapon' && action.weaponBaseName && (
                                                        (() => {
                                                            const char = combatant.type === 'player' ? characters.find(c => c.id === combatant.sourceId) : null;
                                                            if (char && hasMastery(char, action.weaponBaseName)) {
                                                                const mastery = getMasteryProperty(action.weaponBaseName);
                                                                if (mastery) {
                                                                    return (
                                                                        <div className="flex items-center gap-1 bg-gold/10 text-gold px-1.5 py-0.5 rounded border border-gold/30 animate-in fade-in zoom-in-95 duration-300 group/mastery relative">
                                                                            <Zap size={10} className="text-gold" />
                                                                            <span className="text-[9px] font-black uppercase tracking-widest">{mastery.name}</span>

                                                                            {/* Tooltip for the mastery property */}
                                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/mastery:block w-48 p-2 bg-stone-900 border border-gold/40 rounded shadow-xl z-50 pointer-events-none">
                                                                                <p className="text-[10px] text-parchment leading-tight">{mastery.description}</p>
                                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gold/40" />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                            }
                                                            return null;
                                                        })()
                                                    )}

                                                    {action.attacksPerAction && action.attacksPerAction > 1 && !isRestricted && (
                                                        <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded font-black uppercase tracking-tighter self-center ml-auto">
                                                            {action.attacksPerAction} Attacks
                                                        </span>
                                                    )}
                                                </div>
                                            </button>

                                            {canTriggerEmbers && (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleTriggerEmbers(action)}
                                                    disabled={embersDisabled}
                                                    className="flex min-h-[76px] items-center justify-center gap-2 rounded-lg border border-arcane/40 bg-arcane/12 px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-arcane-light transition-colors hover:border-arcane hover:bg-arcane/20 disabled:cursor-wait disabled:opacity-60 sm:w-[110px] sm:flex-col"
                                                    title={`Send ${action.name} to Embers`}
                                                >
                                                    <Sparkles size={14} />
                                                    <span>{castingActionId === action.id ? 'Casting' : 'Embers FX'}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Tooltip Portal */}
            {hoveredAction && hoverRect && createPortal(
                <div
                    className="fixed z-[99999] p-4 bg-stone-950/90 backdrop-blur-xl border border-gold/40 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] w-80 max-h-[320px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        left: `${Math.max(10, Math.min(window.innerWidth - 330, hoverRect.left + hoverRect.width / 2 - 160))}px`,
                        top: hoverRect.top < 320 ? `${hoverRect.bottom + 10}px` : `${hoverRect.top - 10}px`,
                        transform: hoverRect.top < 320 ? 'none' : 'translateY(-100%)'
                    }}
                >
                    <div className="flex items-center justify-between mb-3 border-b border-gold/10 pb-2">
                        <span className="font-cinzel font-bold text-gold tracking-wide">{hoveredAction.name}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-black uppercase tracking-widest ${ECONOMY_COLORS[hoveredAction.economy]}`}>{ECONOMY_LABELS[hoveredAction.economy]}</span>
                    </div>
                    <p className="text-xs text-stone-200 whitespace-pre-wrap leading-relaxed opacity-90">{hoveredAction.description}</p>

                    {altPressed && (
                        <div className="mt-4 pt-3 border-t border-gold/5 text-[10px] text-stone-500 italic flex items-center gap-2">
                            <Info size={12} className="text-gold/50" />
                            Use mouse to scroll or click links
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
