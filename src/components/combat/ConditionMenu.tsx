import React, { useState } from 'react';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowDown,
    Ban,
    BatteryLow,
    Brain,
    Calculator,
    Compass,
    EarOff,
    EyeOff,
    Ghost,
    GripHorizontal,
    Heart,
    HelpCircle,
    Link,
    Lock,
    Maximize,
    MessageSquare,
    Moon,
    Mountain,
    Music,
    Shield,
    ShieldCheck,
    ShieldPlus,
    Skull,
    Sparkles,
    Star,
    Swords,
    Wind,
    X,
    Zap,
    ZapOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCombatStore } from '../../store/combatStore';

import { Condition } from '../../types/character';
import conditionsData from '../../data/dnd5e/conditions.json';

interface ConditionData {
    name: string;
    icon: string;
    description: string;
    type: 'condition' | 'buff';
    flavor?: string;
    coaching?: {
        instruction: string;
        maths: string;
        save: string;
    };
}

interface ConditionMenuProps {
    targetId?: string;
    onHover?: (name: string, e: React.MouseEvent) => void;
    onLeave?: () => void;
}

export function ConditionMenu({ targetId: propTargetId, onHover, onLeave }: ConditionMenuProps) {
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const selectedCombatantId = useCombatStore((state) => state.selectedCombatantId);
    const updateCombatant = useCombatStore((state) => state.updateCombatant);
    const addLog = useCombatStore((state) => state.addLog);

    const [durationInput, setDurationInput] = useState<{ [key: string]: string }>({});
    const [wizardContext, setWizardContext] = useState<{ condId: string, condName: string, targetId: string } | null>(null);

    if (!activeEncounter) return null;

    const activeCombatantId = activeEncounter.activeCombatantId;
    const activeCombatant = activeEncounter.combatants.find(c => c.id === activeCombatantId);
    const targetId = wizardContext?.targetId || propTargetId || selectedCombatantId || activeCombatantId;
    if (!targetId) return null;

    const target = activeEncounter.combatants.find(c => c.id === targetId);
    if (!target) return null;

    const conditions = (conditionsData as ConditionData[]).filter(c => c.type === 'condition');
    const buffs = (conditionsData as ConditionData[]).filter(c => c.type === 'buff');

    const ICONS_BY_NAME: Record<string, LucideIcon> = {
        'alert-circle': AlertCircle,
        'alert-triangle': AlertTriangle,
        'arrow-down': ArrowDown,
        'ban': Ban,
        'battery-low': BatteryLow,
        'brain': Brain,
        'compass': Compass,
        'ear-off': EarOff,
        'eye-off': EyeOff,
        'ghost': Ghost,
        'grip-horizontal': GripHorizontal,
        'heart': Heart,
        'link': Link,
        'lock': Lock,
        'maximize': Maximize,
        'moon': Moon,
        'mountain': Mountain,
        'music': Music,
        'shield': Shield,
        'shield-check': ShieldCheck,
        'shield-plus': ShieldPlus,
        'skull': Skull,
        'sparkles': Sparkles,
        'swords': Swords,
        'wind': Wind,
        'zap': Zap,
    };

    const getIcon = (iconName: string): LucideIcon => ICONS_BY_NAME[iconName] || HelpCircle;

    const getConditionSaveInfo = (condId: string) => {
        const attackerStr = activeCombatant?.abilityScores?.str || 10;
        const attackerMod = Math.floor((attackerStr - 10) / 2);
        const attackerProf = activeCombatant?.proficiencyBonus || 2;
        const physicalDC = 8 + attackerMod + attackerProf;
        const spellDC = activeCombatant?.spellSaveDc || (8 + (activeCombatant?.proficiencyBonus || 2) + 3);

        switch (condId.toLowerCase()) {
            case 'grappled':
                return {
                    save: 'Strength (STR) or Dexterity (DEX) Saving Throw (Target\'s Choice)',
                    dcLabel: `Difficulty Class (DC) ${physicalDC} (8 + STR Mod ${attackerMod >= 0 ? '+' : ''}${attackerMod} + Proficiency ${attackerProf})`,
                    ruleTip: '2024 Rule: Grappled creatures have Disadvantage on attacks against anyone except the grappler!'
                };
            case 'prone':
                return {
                    save: 'Dexterity (DEX) Saving Throw (usually from an Unarmed Strike)',
                    dcLabel: `Difficulty Class (DC) ${physicalDC} (8 + STR Mod ${attackerMod >= 0 ? '+' : ''}${attackerMod} + Proficiency ${attackerProf})`,
                    ruleTip: '2024 Rule: Standing up costs half your movement and no longer provokes opportunity attacks.'
                };
            case 'stunned':
            case 'paralyzed':
                return {
                    save: 'Constitution (CON) Saving Throw',
                    dcLabel: `Difficulty Class (DC) ${spellDC} (Typically attacker's Spell Save DC)`,
                    ruleTip: '2024 Rule: Stunned/Paralyzed creatures fail Strength (STR) and Dexterity (DEX) saves automatically.'
                };
            case 'poisoned':
                return {
                    save: 'Constitution (CON) Saving Throw',
                    dcLabel: `Difficulty Class (DC) ${spellDC} or Source DC`,
                    ruleTip: 'Poisoned creatures have Disadvantage on attack rolls and ability checks.'
                };
            case 'exhaustion':
                return {
                    save: 'Constitution (CON) Saving Throw (if recurring)',
                    dcLabel: 'DC Varies',
                    ruleTip: '2024 Rule: Exhaustion is now a penalty (Exhausted 1-6) to D20 tests and Speed.'
                };
            default:
                return null;
        }
    };

    const toggleCondition = (cond: ConditionData, duration?: number, specificTargetId?: string) => {
        const idToUpdate = specificTargetId || wizardContext?.targetId || selectedCombatantId || activeCombatantId;
        if (!idToUpdate) return;

        const targetToUpdate = activeEncounter.combatants.find(c => c.id === idToUpdate);
        if (!targetToUpdate) return;

        const condId = cond.name.toLowerCase();
        const hasCondition = targetToUpdate.conditions.some(c => c.id === condId);

        if (hasCondition) {
            const updated = targetToUpdate.conditions.filter(c => c.id !== condId);
            updateCombatant(idToUpdate, { conditions: updated });
            addLog({
                message: `${targetToUpdate.name} is no longer ${cond.name}.`,
                type: 'status',
                combatantId: idToUpdate
            });
        } else {
            const newCondition: Condition = {
                id: condId,
                name: cond.name,
                duration: duration || undefined,
                description: cond.description
            };
            updateCombatant(idToUpdate, { conditions: [...targetToUpdate.conditions, newCondition] });
            addLog({
                message: `${targetToUpdate.name} is now ${cond.name}${duration ? ` (${duration} rounds)` : ''}.`,
                type: 'status',
                combatantId: idToUpdate
            });
        }
        setWizardContext(null);
    };

    const renderGrid = (items: ConditionData[], title: string, colorClass: string, icon: React.ReactNode) => (
        <div className="space-y-2">
            <h4 className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${colorClass}`}>
                {icon}
                {title}
            </h4>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
                {items.map((cond) => {
                    const condId = cond.name.toLowerCase();
                    const isActive = target.conditions.some(c => c.id === condId);
                    const Icon = getIcon(cond.icon);
                    const duration = target.conditions.find(c => c.id === condId)?.duration;

                    return (
                        <div key={cond.name} className="relative group/item">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isActive) {
                                        toggleCondition(cond);
                                    } else {
                                        setWizardContext({ condId: condId, condName: cond.name, targetId: targetId });
                                    }
                                }}
                                onMouseEnter={(e) => onHover?.(cond.name, e)}
                                onMouseLeave={() => onLeave?.()}
                                className={`
                                    w-full aspect-square flex flex-col items-center justify-center p-1 rounded border transition-all relative
                                    ${isActive
                                        ? cond.type === 'buff'
                                            ? 'bg-cyan-500/10 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/50'
                                            : 'bg-blood/10 border-blood shadow-[0_0_15px_rgba(153,27,27,0.3)] ring-1 ring-red-500/50'
                                        : 'bg-stone-950 border-stone-800/50 hover:border-stone-600 hover:bg-stone-900'}
                                `}
                            >
                                <Icon size={16} className={`${isActive ? cond.type === 'buff' ? 'text-cyan-400' : 'text-blood' : 'text-stone-600 group-hover/item:text-stone-400'} transition-colors`} />
                                {duration && (
                                    <div className="absolute -top-1 -right-1 bg-gold text-stone-950 text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-stone-950 shadow-sm">
                                        {duration}
                                    </div>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col space-y-5 bg-stone-900/30 p-3 rounded-xl border border-stone-800/50 relative">
            {/* Condition Wizard Overlay */}
            {wizardContext && (
                <div className="absolute inset-0 z-[200] animate-in fade-in zoom-in-95 duration-200 pointer-events-auto bg-stone-950 flex flex-col pt-0" onClick={e => e.stopPropagation()}>
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="bg-gold/10 border-b border-gold/20 p-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-stone-900 rounded-lg border border-gold/20">
                                    <Star className="text-gold" size={18} />
                                </div>
                                <div>
                                    <h4 className="text-gold font-bold text-xs uppercase tracking-widest">Status Wizard</h4>
                                    <p className="text-stone-400 text-[10px] uppercase font-bold tracking-tight">PHB 2024 Standards</p>
                                </div>
                            </div>
                            <button onClick={() => setWizardContext(null)} className="text-stone-500 hover:text-white p-1">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-1">
                                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Applying To</span>
                                <p className="text-parchment font-bold text-lg leading-tight">{target.name}</p>
                            </div>

                            <div className="bg-stone-900/50 rounded-lg p-4 border border-stone-800/50 space-y-4">
                                {(() => {
                                    const cond = conditionsData.find(c => c.name.toLowerCase() === wizardContext.condId) as ConditionData;
                                    return (
                                        <>
                                            <div className="space-y-1">
                                                <h5 className="text-[9px] text-gold font-black uppercase tracking-widest flex items-center gap-1.5">
                                                    <MessageSquare size={10} /> How to explain to players
                                                </h5>
                                                <p className="text-xs text-parchment leading-relaxed font-bold">
                                                    {cond?.coaching?.instruction || cond?.flavor || "Inform the player of this change in status."}
                                                </p>
                                            </div>

                                            <div className="space-y-1 pt-2 border-t border-stone-800/50">
                                                <h5 className="text-[9px] text-cyan-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                                    <Calculator size={10} /> Core Maths & Rules
                                                </h5>
                                                <p className="text-[10px] text-stone-300 leading-relaxed">
                                                    {cond?.coaching?.maths || cond?.description}
                                                </p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {getConditionSaveInfo(wizardContext.condId) && (
                                <div className="bg-blood/5 border border-blood/20 rounded-lg p-3 space-y-2">
                                    <h5 className="text-blood font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                                        <ZapOff size={12} /> Resisting the Condition
                                    </h5>
                                    <div className="space-y-1">
                                        <p className="text-xs text-parchment font-bold">
                                            Roll: <span className="text-gold">{getConditionSaveInfo(wizardContext.condId)?.save}</span>
                                        </p>
                                        <p className="text-[10px] text-stone-400 font-mono">
                                            {getConditionSaveInfo(wizardContext.condId)?.dcLabel}
                                        </p>
                                    </div>
                                    <div className="pt-2 border-t border-blood/10">
                                        <p className="text-[9px] text-stone-400 leading-tight">
                                            <strong className="text-gold">Quick Rule:</strong> {getConditionSaveInfo(wizardContext.condId)?.ruleTip}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 pt-2">
                                <div>
                                    <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest block mb-2">Duration (Rounds)</label>
                                    <div className="flex gap-2">
                                        <input
                                            autoFocus
                                            type="number"
                                            placeholder="∞"
                                            className="bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm text-parchment w-20 focus:outline-none focus:border-gold transition-all"
                                            value={durationInput[wizardContext.condId] || ''}
                                            onChange={(e) => setDurationInput({ ...durationInput, [wizardContext.condId]: e.target.value })}
                                        />
                                        <button
                                            onClick={() => {
                                                const cond = conditionsData.find(c => c.name.toLowerCase() === wizardContext.condId);
                                                if (cond) toggleCondition(cond as ConditionData, parseInt(durationInput[wizardContext.condId]) || undefined);
                                            }}
                                            className="flex-1 bg-gold text-stone-950 font-black text-[10px] uppercase tracking-widest py-2 rounded-lg hover:bg-gold-bright transition-all shadow-lg active:scale-95"
                                        >
                                            Confirm Application
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-1">
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-stone-500" />
                    <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">
                        Effects Management
                    </h3>
                </div>
                {target.conditions.length > 0 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            updateCombatant(targetId, { conditions: [] });
                        }}
                        className="text-[9px] font-bold text-blood hover:text-red-400 transition-colors flex items-center gap-1 uppercase tracking-tighter"
                    >
                        <X size={10} />
                        Wipe States
                    </button>
                )}
            </div>

            {/* Buffs Section */}
            {renderGrid(buffs, "Positive Buffs", "text-cyan-400", <Sparkles size={12} />)}

            {/* Conditions Section */}
            {renderGrid(conditions, "Negative Conditions", "text-blood", <Skull size={12} />)}

            <div className="pt-2 border-t border-stone-800/50">
                <p className="text-[8px] text-stone-600 italic leading-tight">
                    Hover icons to view tactical details. Click to apply/remove effect to the active target.
                </p>
            </div>
        </div>
    );
}
