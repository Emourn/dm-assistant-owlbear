import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    ChevronRight,
    ChevronLeft,
    Target,
    Zap,
    Shield,
    Sparkles,
    CheckCircle2,
    Info,
    Skull,
    Activity,
    BookOpen,
    Dice5,
    AlertCircle,
    Crosshair,
    Star
} from 'lucide-react';
import { Combatant, CombatAction } from '../../types/combat';
import { CORE_RULE_DESCRIPTIONS, ABILITY_DESCRIPTIONS } from '../../data/dnd5e/tooltipDescriptions';
import { ABILITY_NAMES } from '../../engine/combatActions';
import { evaluateCombatConditions, resolveAdvantageMode, rollD20 } from '../../engine/diceEngine';

export type WizardStep = 'level' | 'target' | 'roll' | 'result' | 'target-saves' | 'damage' | 'effect' | 'summary';

interface ActionWizardProps {
    isOpen: boolean;
    onClose: () => void;
    action: CombatAction;
    actor: Combatant;
    allCombatants: Combatant[];
    onConfirm: (result: ActionWizardResult) => void;
    initialTargets?: Combatant[];
}

interface ConditionSelection {
    id: string;
    name: string;
    icon?: string;
}

interface TargetSaveResult {
    roll?: number;
    total?: number;
    saved?: boolean;
    isManual?: boolean;
}

interface MultiTargetResult {
    targetId: string;
    instanceIdx: number;
    roll?: number;
    total?: number;
    damage?: number;
    isCrit?: boolean;
    isFumble?: boolean;
    saved?: boolean;
}

interface WizardContext {
    selectedTargets: Combatant[];
    rollResult: number | null;
    damageResult: number | null;
    isCrit: boolean;
    isFumble: boolean;
    advantageMode: 'normal' | 'advantage' | 'disadvantage';
    damageMod: string;
    overrideAc: number | null;
    overrideToHit: number | null;
    selectedConditions: ConditionSelection[];
    applyConcentration: boolean;
    showRules: boolean;
    activeRuleId: string | null;
    conditionToSave: ConditionSelection | null;
    saveTargetId: string | null;
    manualRollInput: string;
    multiTargetResults: MultiTargetResult[];
    concentrationSaveTargetId: string | null;
    concentrationSaveDc: number;
    castLevel: number;
    isHitOverride: boolean | null;
    slowSpellFailed: boolean;
    targetSaves: Record<string, TargetSaveResult>;
    targetAdvStates: Record<string, 'normal' | 'advantage' | 'disadvantage'>;
}

interface TargetDetail {
    saved?: boolean;
    hit?: boolean;
    conditions?: ConditionSelection[];
}

export type ActionWizardResult = WizardContext & {
    targetDetails: Record<string, TargetDetail>;
};

interface RuleReference {
    name: string;
    description: string;
    whenToUse?: string;
    saves?: string;
}

const COMMON_CONDITIONS = [
    { id: 'blinded', name: 'Blinded', icon: '🌑' },
    { id: 'charmed', name: 'Charmed', icon: '❤️' },
    { id: 'deafened', name: 'Deafened', icon: '🙉' },
    { id: 'frightened', name: 'Frightened', icon: '😱' },
    { id: 'grappled', name: 'Grappled', icon: '🤼' },
    { id: 'incapacitated', name: 'Incapacitated', icon: '😵' },
    { id: 'invisible', name: 'Invisible', icon: '👻' },
    { id: 'paralyzed', name: 'Paralyzed', icon: '⚡' },
    { id: 'petrified', name: 'Petrified', icon: '🗿' },
    { id: 'poisoned', name: 'Poisoned', icon: '🤢' },
    { id: 'prone', name: 'Prone', icon: '🛌' },
    { id: 'restrained', name: 'Restrained', icon: '🕸️' },
    { id: 'stunned', name: 'Stunned', icon: '💫' },
    { id: 'unconscious', name: 'Unconscious', icon: '💤' }
];

/**
 * ActionWizard — Interactive DM Tutor for Combat
 * Guides the DM through every step of a combat action.
 */
export function ActionWizard({
    isOpen,
    onClose,
    action,
    actor,
    allCombatants,
    onConfirm,
    initialTargets
}: ActionWizardProps) {
    const hasInitialTargets = initialTargets && initialTargets.length > 0;
    const initialStep: WizardStep = (action.spellLevel !== undefined && action.spellLevel > 0) ? 'level' : (hasInitialTargets ? 'roll' : 'target');
    const [step, setStep] = useState<WizardStep>(initialStep);
    const [wizardContext, setWizardContext] = useState<WizardContext>({
        selectedTargets: initialTargets || [],
        rollResult: null,
        damageResult: null,
        isCrit: false,
        isFumble: false,
        advantageMode: 'normal' as 'normal' | 'advantage' | 'disadvantage',
        damageMod: 'Normal',
        overrideAc: null,
        overrideToHit: null,
        selectedConditions: [],
        applyConcentration: false,
        showRules: false,
        activeRuleId: null,
        conditionToSave: null, // Track which condition is currently prompting for a save
        saveTargetId: null,
        manualRollInput: '', // For manual roll input in condition saves
        multiTargetResults: [], // For AOE or multi-attack tracking [{targetId, roll, damage, isHit, saveResult}]
        concentrationSaveTargetId: null, // New: Target ID needing a concentration save
        concentrationSaveDc: 0, // New: DC for the concentration save
        castLevel: action.spellLevel || 0,
        isHitOverride: null as boolean | null, // New: DM override for hit/miss
        slowSpellFailed: false, // New: Track if a spell was delayed by Slow
        targetSaves: {},
        targetAdvStates: {} as Record<string, 'normal' | 'advantage' | 'disadvantage'>,
    });

    // Determine the sequence of steps based on action type
    const steps: WizardStep[] = useMemo(() => {
        const flow: WizardStep[] = [];
        const actionName = action.name.toLowerCase();

        // 0. Spells with slots get a configuration step if not a cantrip
        if (action.spellLevel !== undefined && action.spellLevel > 0) {
            flow.push('level');
        }

        // Skip targeting for dedicated self-rolls like saves
        const isStandaloneRoll = action.actionType === 'saving-throw' || action.id === 'death-save';
        const isSelfRange = action.range === 'Self' || action.range === 'self';
        const isSelfRoll = isStandaloneRoll || isSelfRange;

        if (!isSelfRoll) {
            flow.push('target');
        }

        // 1. Special Case: Magic Missile (Auto-hit, Multi-target)
        if (actionName.includes('magic missile')) {
            flow.push('damage', 'effect', 'summary');
            return flow;
        }

        // 2. Attack Actions (Roll to Hit)
        if (action.toHit !== undefined) {
            flow.push('roll', 'result');
        }

        // 3. Save Actions (Targets roll saves)
        if (isStandaloneRoll) {
            flow.push('roll', 'result');
        } else if (action.saveDc !== undefined || action.saveAbility || actionName === 'grapple' || actionName === 'shove') {
            flow.push('target-saves');
        }

        // 4. Follow-up: Damage and Effects
        if (action.damageNotation || action.damageType || (action.description && action.description.toLowerCase().includes('damage'))) {
            flow.push('damage');
        }

        flow.push('effect');
        flow.push('summary');
        return flow;
    }, [action]);

    // Calculate dynamic limits based on level
    const targetLimit = useMemo(() => {
        const actionName = action.name.toLowerCase();
        const level = wizardContext.castLevel || action.spellLevel || 1;

        if (actionName.includes('magic missile')) return level + 2;
        if (actionName.includes('scorching ray')) return level + 1;

        // NEW: Support Multiattack / Extra Attack
        if (action.attacksPerAction && action.attacksPerAction > 1) {
            return action.attacksPerAction;
        }

        // Default: Area effects often have "unlimited" targets in a zone
        const isAOE = action.description?.toLowerCase().includes('each creature in') ||
            action.description?.toLowerCase().includes('radius');
        if (isAOE) return 99;

        return 1; // Single target default
    }, [action, wizardContext.castLevel]);

    if (!isOpen) return null;

    const currentStepIndex = steps.indexOf(step);
    const canGoBack = currentStepIndex > 0;
    const isLastStep = currentStepIndex === steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            // Build final results object with targetDetails for CombatBoard
            const finalResults: ActionWizardResult = {
                ...wizardContext,
                targetDetails: {}
            };

            // Populate targetDetails based on results
            const targetDetails: Record<string, TargetDetail> = {};

            wizardContext.selectedTargets.forEach((target: Combatant, idx: number) => {
                const saveResult = wizardContext.targetSaves[target.id];
                const attackResult = wizardContext.multiTargetResults.find((r) => r.targetId === target.id && r.instanceIdx === idx);

                const isAttack = action.toHit !== undefined;
                const isSave = action.saveDc !== undefined || action.saveAbility;

                let hit = false;
                if (isAttack && attackResult) {
                    const effectiveAc = wizardContext.overrideAc !== null && idx === 0 ? wizardContext.overrideAc : target.ac;
                    const attackTotal = attackResult.total ?? Number.NEGATIVE_INFINITY;
                    hit = (attackResult.isCrit || attackTotal >= effectiveAc) && !attackResult.isFumble;
                    if (wizardContext.isHitOverride !== null && idx === 0) hit = wizardContext.isHitOverride;
                }

                targetDetails[target.id] = {
                    saved: isSave ? saveResult?.saved : undefined,
                    hit: isAttack ? hit : undefined
                };
            });

            finalResults.targetDetails = targetDetails;
            onConfirm(finalResults);
            onClose();
        } else {
            // Logic to check if we can move to next step
            if (step === 'target' && wizardContext.selectedTargets.length === 0) {
                return; // Must select target
            }
            if (step === 'roll' && wizardContext.rollResult === null) {
                return; // Must have a roll
            }
            if (step === 'target-saves') {
                const allDone = wizardContext.selectedTargets.every((t: Combatant) => wizardContext.targetSaves[t.id]?.saved !== undefined);
                if (!allDone) return;
            }

            // Auto-advance logic for misses
            if (step === 'result' || step === 'target-saves') {
                const isAttack = action.toHit !== undefined;
                const isSave = action.saveDc !== undefined || action.saveAbility;

                const anyEffective = wizardContext.selectedTargets.some((target: Combatant, idx: number) => {
                    const saveResult = wizardContext.targetSaves[target.id];
                    const attackResult = wizardContext.multiTargetResults.find((r) => r.targetId === target.id && r.instanceIdx === idx);

                    if (isAttack && attackResult) {
                        const effectiveAc = wizardContext.overrideAc !== null && idx === 0 ? wizardContext.overrideAc : target.ac;
                        const attackTotal = attackResult.total ?? Number.NEGATIVE_INFINITY;
                        const hit = (attackResult.isCrit || attackTotal >= effectiveAc) && !attackResult.isFumble;
                        if (hit) return true;
                    }
                    if (isSave && saveResult && !saveResult.saved) {
                        return true;
                    }
                    return false;
                });

                const actionName = action.name.toLowerCase();
                const hasDamageStep = steps.includes('damage');
                const isHalfDamageSpell = actionName.includes('fireball') || actionName.includes('breath') || actionName.includes('lightning bolt');

                if (!anyEffective && !isHalfDamageSpell && hasDamageStep && !actionName.includes('magic missile')) {
                    // Skip damage if everyone missed/saved (unless it's a half-damage spell)
                    setStep('summary');
                    return;
                }
            }

            // Handle Slow Condition for Spells: 50% chance to fail
            if (step === 'level' || (step === 'target' && steps[0] !== 'level')) {
                const isSlowed = actor.conditions.some(c => c.name.toLowerCase() === 'slowed' || c.name.toLowerCase() === 'slow');
                const isLeveledSpell = action.spellLevel !== undefined && action.spellLevel > 0;

                if (isSlowed && isLeveledSpell && !wizardContext.slowSpellFailed) {
                    const roll = Math.random();
                    if (roll < 0.5) {
                        setWizardContext({ ...wizardContext, slowSpellFailed: true });
                        setStep('summary');
                        return;
                    }
                }
            }

            setStep(steps[currentStepIndex + 1]);
        }
    };

    const handleBack = () => {
        if (canGoBack) {
            setStep(steps[currentStepIndex - 1]);
        }
    };

    const isActorPlayer = actor.type === 'player';

    // Helper to get relative rule for the current step
    const mapAbilityRule = (abilityKey: string): RuleReference | null => {
        const abilityRule = ABILITY_DESCRIPTIONS[abilityKey];
        if (!abilityRule) return null;
        return {
            name: abilityRule.name,
            description: abilityRule.description,
            saves: abilityRule.saves
        };
    };

    const getCurrentStepRule = (): RuleReference | null => {
        if (step === 'target') return CORE_RULE_DESCRIPTIONS['target-selection'] || { name: 'Targeting', description: 'Choose a creature within range of your action.' };
        if (step === 'target-saves' || step === 'roll' || step === 'result') {
            const saveAbility = action.saveAbility || 'dex';
            if (step === 'target-saves') return CORE_RULE_DESCRIPTIONS['saving-throw'] || mapAbilityRule(saveAbility);
            if (action.actionType === 'saving-throw' && action.saveAbility) return mapAbilityRule(action.saveAbility);
            if (action.toHit !== undefined) return CORE_RULE_DESCRIPTIONS['attack-action'];
            if (action.saveDc !== undefined) return CORE_RULE_DESCRIPTIONS['saving-throw'];
        }
        if (step === 'damage') return CORE_RULE_DESCRIPTIONS['damage-roll'] || { name: 'Damage', description: 'Roll the dice specified by your attack or spell to determine how much health the target loses.' };
        if (step === 'effect') return CORE_RULE_DESCRIPTIONS['conditions'] || { name: 'Conditions', description: 'Certain effects impose conditions that change what a creature can do.' };
        return null;
    };

    const currentRule: RuleReference | null = wizardContext.activeRuleId
        ? CORE_RULE_DESCRIPTIONS[wizardContext.activeRuleId] || mapAbilityRule(wizardContext.activeRuleId)
        : getCurrentStepRule();

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-stone-950 border border-stone-800 rounded-xl shadow-2xl flex flex-row max-h-[90vh] overflow-hidden transition-all duration-500">

                {/* Main Wizard Content */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-stone-800 relative">
                    {/* Header */}
                    <div className="p-4 border-b border-stone-800 bg-stone-900/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                                <Zap size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-parchment leading-tight">{action.name}</h2>
                                <p className="text-xs text-stone-500 uppercase tracking-widest font-bold">
                                    {actor.name}'s Turn • {action.economy}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setWizardContext({ ...wizardContext, showRules: !wizardContext.showRules })}
                                className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold ${wizardContext.showRules ? 'bg-gold/20 border-gold text-gold' : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-parchment'}`}
                            >
                                <BookOpen size={16} />
                                {wizardContext.showRules ? 'Hide Rules' : 'Rules'}
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 text-stone-500 hover:text-parchment hover:bg-stone-800 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-6 py-3 bg-stone-900/30 flex items-center justify-center gap-2 border-b border-stone-900">
                        {steps.map((s, idx) => (
                            <div key={s} className="flex items-center">
                                <div
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx <= currentStepIndex ? 'bg-gold shadow-[0_0_8px_rgba(255,215,0,0.5)]' : 'bg-stone-800'}`}
                                />
                                {idx < steps.length - 1 && (
                                    <div className={`w-8 h-0.5 mx-1 transition-all duration-300 ${idx < currentStepIndex ? 'bg-gold/50' : 'bg-stone-800'}`} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        {step === 'level' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-cinzel font-bold text-parchment tracking-widest">Cast at what level?</h3>
                                    <p className="text-xs text-stone-500 uppercase tracking-tighter">Higher levels often increase damage or number of targets.</p>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => l >= (action.spellLevel || 1)).map(lvl => (
                                        <button
                                            key={lvl}
                                            onClick={() => setWizardContext({ ...wizardContext, castLevel: lvl })}
                                            className={`
                                                p-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1
                                                ${wizardContext.castLevel === lvl
                                                    ? 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(255,215,0,0.2)]'
                                                    : 'bg-stone-900 border-stone-800 hover:border-stone-700 text-stone-500'}
                                            `}
                                        >
                                            <span className="text-lg font-cinzel font-black">{lvl}</span>
                                            <span className="text-[9px] uppercase font-bold tracking-widest">Level</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 'target' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-gold/5 border border-gold/20 p-4 rounded-lg">
                                    <h3 className="text-gold font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Info size={14} /> DM coaching: {isActorPlayer ? 'Player Prompt' : 'Monster Action'}
                                    </h3>
                                    <p className="text-parchment italic text-sm">
                                        {isActorPlayer
                                            ? `Ask ${actor.name}: "Who do you want to target with ${action.name}?"`
                                            : `${actor.name} prepares to use ${action.name}. Select the intended target.`}
                                    </p>
                                    {action.range && (
                                        <p className="mt-2 text-[10px] text-stone-500 uppercase tracking-widest font-bold flex items-center gap-1">
                                            <Target size={12} /> Range: {action.range}
                                        </p>
                                    )}
                                </div>

                                {wizardContext.selectedTargets.length > 0 && (
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">Targets Selected</span>
                                            <span className={`px-2 py-0.5 rounded-full border border-gold/30 font-mono text-xs ${wizardContext.selectedTargets.length >= targetLimit ? 'bg-blood/20 text-blood border-blood/50' : 'bg-gold/20 text-gold'}`}>
                                                {wizardContext.selectedTargets.length} / {targetLimit}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setWizardContext({ ...wizardContext, selectedTargets: [] })}
                                            className="text-[10px] text-stone-500 hover:text-blood uppercase tracking-widest font-bold transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {(['monster', 'player'] as const).map(type => {
                                        const filtered = allCombatants.filter(c => c.type === type && !c.isDead && !c.isLair);
                                        if (filtered.length === 0) return null;

                                        return (
                                            <div key={type} className="space-y-2">
                                                <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.2em] px-1">
                                                    {type === 'monster' ? 'Hostile Targets' : 'Friendly Targets'}
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {filtered.map(c => {
                                                        const isSelected = wizardContext.selectedTargets.some((t: Combatant) => t.id === c.id);
                                                        const hpPercent = (c.currentHp / c.maxHp) * 100;

                                                        return (
                                                            <button
                                                                key={c.id}
                                                                onClick={() => {
                                                                    const name = action.name.toLowerCase();
                                                                    const isMultiTarget = name.includes('magic missile') || (action.saveDc !== undefined) || (action.saveAbility);

                                                                    if (isMultiTarget) {
                                                                        // For Magic Missile, we can select same target multiple times
                                                                        // For AOEs, just toggle
                                                                        if (name.includes('magic missile')) {
                                                                            if (wizardContext.selectedTargets.length < targetLimit) {
                                                                                setWizardContext({
                                                                                    ...wizardContext,
                                                                                    selectedTargets: [...wizardContext.selectedTargets, c]
                                                                                });
                                                                            }
                                                                        } else {
                                                                            const isAlreadyIn = wizardContext.selectedTargets.some((t: Combatant) => t.id === c.id);
                                                                            if (!isAlreadyIn && wizardContext.selectedTargets.length >= targetLimit) return;

                                                                            setWizardContext({
                                                                                ...wizardContext,
                                                                                selectedTargets: isAlreadyIn
                                                                                    ? wizardContext.selectedTargets.filter((t: Combatant) => t.id !== c.id)
                                                                                    : [...wizardContext.selectedTargets, c]
                                                                            });
                                                                        }
                                                                    } else {
                                                                        setWizardContext({
                                                                            ...wizardContext,
                                                                            selectedTargets: [c]
                                                                        });
                                                                    }
                                                                }}
                                                                className={`text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${isSelected
                                                                    ? 'bg-gold/10 border-gold shadow-[0_0_10px_rgba(255,215,0,0.1)]'
                                                                    : 'bg-stone-900/50 border-stone-800 hover:border-stone-700'
                                                                    }`}
                                                            >
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className={`font-bold text-sm truncate ${isSelected ? 'text-gold' : 'text-parchment'}`}>
                                                                            {c.name}
                                                                        </span>
                                                                        <div className="flex items-center gap-1 bg-stone-950 px-1.5 py-0.5 rounded border border-stone-800">
                                                                            <Shield size={10} className="text-stone-500" />
                                                                            <span className="text-[10px] font-mono text-stone-300">{c.ac}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-1 w-full bg-stone-800 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full transition-all duration-500 ${hpPercent > 50 ? 'bg-green-600' : hpPercent > 20 ? 'bg-yellow-600' : 'bg-blood'}`}
                                                                            style={{ width: `${hpPercent}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-center gap-1">
                                                                    {isSelected && (
                                                                        <CheckCircle2 size={16} className="text-gold flex-shrink-0 animate-in zoom-in duration-200" />
                                                                    )}
                                                                    {wizardContext.selectedTargets.filter((t: Combatant) => t.id === c.id).length > 1 && (
                                                                        <span className="bg-gold text-stone-950 text-[10px] font-black px-1.5 rounded-full animate-in scale-in duration-200">
                                                                            x{wizardContext.selectedTargets.filter((t: Combatant) => t.id === c.id).length}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {step === 'roll' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-gold/5 border border-gold/20 p-4 rounded-lg">
                                    <h3 className="text-gold font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Info size={14} /> DM coaching: {isActorPlayer ? 'Ask Player' : 'Monster Roll'}
                                    </h3>
                                    <div className="space-y-2">
                                        <p className="text-parchment text-sm">
                                            {isActorPlayer ? (
                                                action.id === 'death-save'
                                                    ? <>Ask {actor.name} to roll a <span className="text-gold font-bold">Death Saving Throw</span>.</>
                                                    : action.actionType === 'saving-throw'
                                                        ? <>Ask {actor.name} for a <span className="text-gold font-bold">{action.name}</span>.</>
                                                        : <>Ask {actor.name} for an <span className="text-gold font-bold">Attack Roll</span> (d20 + {wizardContext.overrideToHit !== null ? wizardContext.overrideToHit : (action.toHit || 0)}).</>
                                            ) : (
                                                action.actionType === 'saving-throw'
                                                    ? <>Roll a <span className="text-gold font-bold">{action.name}</span> for {actor.name}.</>
                                                    : <>Roll for {actor.name}: <span className="text-gold font-bold">1d20 + {wizardContext.overrideToHit !== null ? wizardContext.overrideToHit : (action.toHit || 0)}</span></>
                                            )}
                                        </p>
                                        {action.name.toLowerCase().includes('magic missile') && (
                                            <div className="mt-3 p-3 bg-arcane/10 border border-arcane/20 rounded text-[11px] leading-relaxed animate-in slide-in-from-left duration-500">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Star size={12} className="text-arcane" />
                                                    <span className="font-black uppercase tracking-widest text-arcane">DM Pro-Tip</span>
                                                </div>
                                                Officially (RAW), you roll 1d4+1 <span className="font-bold underline">once</span> and apply that number to all darts. However, many DMs prefer rolling for each dart separately. Choose the method that fits your table's speed!
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Target AC Summary (Desktop only) */}
                                {wizardContext.selectedTargets.length > 0 && (
                                    <div className="hidden sm:flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                        {wizardContext.selectedTargets.reduce((acc: Combatant[], t: Combatant) => {
                                            if (!acc.find(x => x.id === t.id)) acc.push(t);
                                            return acc;
                                        }, []).map((t: Combatant) => (
                                            <div key={t.id} className="bg-stone-900 border border-stone-800 px-3 py-1 rounded flex items-center gap-2 flex-shrink-0">
                                                <span className="text-[10px] font-bold text-stone-500 uppercase">{t.name}</span>
                                                <span className="text-xs font-mono font-black text-gold">AC {wizardContext.overrideAc !== null && t.id === wizardContext.selectedTargets[0].id ? wizardContext.overrideAc : t.ac}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Roll Inputs List */}
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {wizardContext.selectedTargets.map((target: Combatant, idx: number) => {
                                        const actionType = action.range?.toLowerCase().includes('melee') || action.range?.toLowerCase() === 'touch' ? 'melee' : 'ranged';
                                        const condEval = evaluateCombatConditions(actor, target, actionType);
                                        const resolvedAdv = resolveAdvantageMode([condEval]);

                                        // Use DM override if set, otherwise fallback to the automatic calculation
                                        const currentAdvMode = wizardContext.targetAdvStates[target.id] || resolvedAdv.mode;

                                        return (
                                            <div key={`${target.id}-${idx}`} className="bg-stone-900 border border-stone-800 p-4 rounded-lg space-y-3">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-black text-parchment uppercase tracking-widest flex items-center gap-2">
                                                            <Crosshair size={14} className="text-blood" />
                                                            {wizardContext.selectedTargets.length > 1 ? `Attack ${idx + 1}: ${target.name}` : `Attack vs ${target.name}`}
                                                        </h4>
                                                        <div className="text-[10px] text-stone-500 font-bold">
                                                            AC {target.id === wizardContext.selectedTargets[0].id && wizardContext.overrideAc !== null ? wizardContext.overrideAc : target.ac}
                                                        </div>
                                                    </div>

                                                    {/* Advantage / Disadvantage Toggle */}
                                                    <div className="flex items-center justify-between bg-stone-950 p-1.5 rounded border border-stone-800/50">
                                                        <div className="flex gap-1">
                                                            {(['disadvantage', 'normal', 'advantage'] as const).map(mode => (
                                                                <button
                                                                    key={mode}
                                                                    onClick={() => setWizardContext({
                                                                        ...wizardContext,
                                                                        targetAdvStates: { ...wizardContext.targetAdvStates, [target.id]: mode }
                                                                    })}
                                                                    className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${currentAdvMode === mode
                                                                        ? (mode === 'advantage' ? 'bg-green-600 border-green-500 text-white' : mode === 'disadvantage' ? 'bg-blood border-blood text-white' : 'bg-stone-700 text-white')
                                                                        : 'bg-transparent text-stone-500 hover:bg-stone-800'
                                                                        }`}
                                                                >
                                                                    {mode === 'normal' ? 'Norm' : mode.substring(0, 3)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {resolvedAdv.reasons.length > 0 && (
                                                            <div className="text-[9px] text-stone-500 italic max-w-[150px] truncate text-right">
                                                                {resolvedAdv.reasons.join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {condEval.autoCrit && (
                                                    <div className="bg-gold/10 border border-gold/30 rounded p-1.5 flex items-center justify-center gap-2 animate-pulse mb-3">
                                                        <Sparkles size={12} className="text-gold" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gold">Any Hit is a Critical (Condition)</span>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest">Manual Roll</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                placeholder="d20"
                                                                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-sm font-mono text-parchment focus:border-gold outline-none"
                                                                value={wizardContext.multiTargetResults.find((r) => r.targetId === target.id && r.instanceIdx === idx)?.roll ?? ''}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    if (isNaN(val)) return;

                                                                    let bonus = 0;
                                                                    if (action.actionType === 'saving-throw') {
                                                                        const abilityKey = (action.saveAbility as keyof NonNullable<Combatant['abilityScores']>) || 'wis';
                                                                        const score = actor.abilityScores?.[abilityKey] || 10;
                                                                        const mod = Math.floor((score - 10) / 2);
                                                                        const isProficient = actor.savingThrowProficiencies?.includes(abilityKey);
                                                                        bonus = mod + (isProficient ? (actor.proficiencyBonus || 2) : 0);
                                                                    } else {
                                                                        bonus = wizardContext.overrideToHit !== null ? wizardContext.overrideToHit : (action.toHit || 0);
                                                                    }

                                                                    const total = val + bonus;
                                                                    const effectiveAc = wizardContext.overrideAc !== null ? wizardContext.overrideAc : target.ac;
                                                                    const isHitRaw = total >= effectiveAc;
                                                                    const finalIsCrit = val === 20 || (condEval.autoCrit && isHitRaw && val !== 1);

                                                                    const newResults = [...wizardContext.multiTargetResults.filter((r) => !(r.targetId === target.id && r.instanceIdx === idx))];
                                                                    newResults.push({
                                                                        targetId: target.id,
                                                                        instanceIdx: idx,
                                                                        roll: val,
                                                                        total: total,
                                                                        isCrit: finalIsCrit,
                                                                        isFumble: val === 1
                                                                    });

                                                                    const updates: Partial<WizardContext> = { multiTargetResults: newResults };
                                                                    if (wizardContext.selectedTargets.length === 1) {
                                                                        updates.rollResult = total;
                                                                        updates.isCrit = finalIsCrit;
                                                                        updates.isFumble = val === 1;
                                                                    }
                                                                    setWizardContext({ ...wizardContext, ...updates });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-stone-500 uppercase tracking-widest">Digital</label>
                                                        <button
                                                            onClick={() => {
                                                                let bonus = 0;
                                                                if (action.actionType === 'saving-throw') {
                                                                    const abilityKey = (action.saveAbility as keyof NonNullable<Combatant['abilityScores']>) || 'wis';
                                                                    const score = actor.abilityScores?.[abilityKey] || 10;
                                                                    const mod = Math.floor((score - 10) / 2);
                                                                    const isProficient = actor.savingThrowProficiencies?.includes(abilityKey);
                                                                    bonus = mod + (isProficient ? (actor.proficiencyBonus || 2) : 0);
                                                                } else {
                                                                    bonus = wizardContext.overrideToHit !== null ? wizardContext.overrideToHit : (action.toHit || 0);
                                                                }

                                                                // NEW: Use rollD20 to handle advantage naturally
                                                                const res = rollD20(bonus, currentAdvMode);

                                                                // We extract the base d20 result(s) for the UI if needed
                                                                // rollD20 total includes modifier.
                                                                // For manual compatibility, we'll store the raw d20 roll (highest/lowest if Adv/Dis).
                                                                const rawRoll = res.rolls.length > 0 ? (currentAdvMode === 'advantage' ? Math.max(...res.rolls) : currentAdvMode === 'disadvantage' ? Math.min(...res.rolls) : res.rolls[0]) : 1;

                                                                const effectiveAc = wizardContext.overrideAc !== null ? wizardContext.overrideAc : target.ac;
                                                                const isHitRaw = res.total >= effectiveAc;
                                                                const finalIsCrit = res.isCrit || (condEval.autoCrit && isHitRaw && !res.isFumble);

                                                                const newResults = [...wizardContext.multiTargetResults.filter((r) => !(r.targetId === target.id && r.instanceIdx === idx))];
                                                                newResults.push({
                                                                    targetId: target.id,
                                                                    instanceIdx: idx,
                                                                    roll: rawRoll,
                                                                    total: res.total,
                                                                    isCrit: finalIsCrit,
                                                                    isFumble: res.isFumble
                                                                });

                                                                const updates: Partial<WizardContext> = { multiTargetResults: newResults };
                                                                if (wizardContext.selectedTargets.length === 1) {
                                                                    updates.rollResult = res.total;
                                                                    updates.isCrit = finalIsCrit;
                                                                    updates.isFumble = res.isFumble;
                                                                }
                                                                setWizardContext({ ...wizardContext, ...updates });
                                                            }}
                                                            className="w-full h-[38px] bg-arcane/10 hover:bg-arcane/20 border border-arcane/30 text-arcane rounded flex items-center justify-center gap-2 transition-all active:scale-95"
                                                        >
                                                            <Dice5 size={14} />
                                                            <span className="text-xs font-bold uppercase">
                                                                {currentAdvMode === 'advantage' ? 'Roll (Adv)' : currentAdvMode === 'disadvantage' ? 'Roll (Dis)' : 'Roll'}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="pt-4 border-t border-stone-800 flex justify-end">
                                    <button
                                        onClick={() => setStep('result')}
                                        disabled={wizardContext.multiTargetResults.length < wizardContext.selectedTargets.length}
                                        className="bg-gold text-stone-950 px-8 py-3 rounded-lg font-black uppercase tracking-widest text-sm hover:scale-105 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                                    >
                                        Compare & Continue
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'target-saves' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-gold/5 border border-gold/20 p-4 rounded-lg">
                                    <div className="space-y-2">
                                        <p className="text-parchment text-sm">
                                            {(action.name.toLowerCase() === 'grapple' || action.name.toLowerCase() === 'shove') ? (
                                                <>Ask the target for a <span className="font-bold text-gold">Strength or Dexterity Saving Throw</span> (their choice) against a <span className="font-bold text-gold">DC of {8 + (Math.floor((((actor.abilityScores?.str ?? 10)) - 10) / 2)) + (Number(actor.proficiencyBonus) || 2)}</span>.</>
                                            ) : (
                                                <>The following targets must roll a <span className="text-gold font-bold">{(action.saveAbility || 'DEX').toUpperCase()} Save (DC {action.saveDc || 10})</span>.</>
                                            )}
                                        </p>
                                        <div className="mt-3 p-3 bg-stone-900/50 border border-stone-800 rounded text-[11px] leading-relaxed">
                                            <span className="font-black uppercase tracking-widest text-gold block mb-1">DM Help</span>
                                            {isActorPlayer
                                                ? "Players often force saves with spells or abilities. You manage the monsters' reaction."
                                                : "Your monster is forcing a save. Tell your players what to roll."}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {wizardContext.selectedTargets.map((target: Combatant) => {
                                        const isPlayer = target.type === 'player';
                                        const result = wizardContext.targetSaves[target.id] || {};
                                        const hasResult = result.saved !== undefined;

                                        // Calculate NPC modifiers
                                        const abilityKey = (action.saveAbility as keyof NonNullable<Combatant['abilityScores']>) || 'wis';
                                        const score = target.abilityScores?.[abilityKey] || 10;
                                        const mod = Math.floor((score - 10) / 2);
                                        const isProficient = target.savingThrowProficiencies?.includes(abilityKey);
                                        const bonus = mod + (isProficient ? (target.proficiencyBonus || 2) : 0);

                                        // Condition evaluation
                                        const condEval = evaluateCombatConditions(actor, target, 'save', abilityKey);
                                        const resolvedAdv = resolveAdvantageMode([condEval]);
                                        const currentAdvMode = wizardContext.targetAdvStates[target.id] || resolvedAdv.mode;
                                        const autoFail = condEval.autoFailSave;

                                        // Calculate DC for 2024 rules or standard saves
                                        const actionName = action.name.toLowerCase();
                                        const dc = (actionName === 'grapple' || actionName === 'shove')
                                            ? (8 + (Math.floor((((actor.abilityScores?.str ?? 10)) - 10) / 2)) + (Number(actor.proficiencyBonus) || 2))
                                            : (action.saveDc || 10);

                                        return (
                                            <div key={target.id} className={`p-4 rounded-lg border-2 transition-all ${hasResult ? (result.saved ? 'bg-green-600/10 border-green-600/30' : 'bg-blood/10 border-blood/30') : 'bg-stone-900/50 border-stone-800'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded bg-stone-950 border border-stone-700 flex items-center justify-center font-bold text-xs ${isPlayer ? 'text-blue-400' : 'text-blood'}`}>
                                                            {target.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-parchment">{target.name}</h4>
                                                            <p className="text-[10px] text-stone-500 uppercase tracking-tighter">{isPlayer ? 'Player' : 'Monster'} • {abilityKey.toUpperCase()} Save</p>
                                                        </div>
                                                    </div>
                                                    {hasResult && (
                                                        <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${result.saved ? 'bg-green-600/20 text-green-500' : 'bg-blood/20 text-blood'}`}>
                                                            {result.saved ? 'Success ✓' : 'Failed ✗'}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Advantage / Disadvantage Toggle */}
                                                <div className="flex items-center justify-between bg-stone-950 p-1.5 rounded border border-stone-800/50 mb-3">
                                                    <div className="flex gap-1">
                                                        {(['disadvantage', 'normal', 'advantage'] as const).map(mode => (
                                                            <button
                                                                key={mode}
                                                                onClick={() => setWizardContext({
                                                                    ...wizardContext,
                                                                    targetAdvStates: { ...wizardContext.targetAdvStates, [target.id]: mode }
                                                                })}
                                                                className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${currentAdvMode === mode
                                                                    ? (mode === 'advantage' ? 'bg-green-600 border-green-500 text-white' : mode === 'disadvantage' ? 'bg-blood border-blood text-white' : 'bg-stone-700 text-white')
                                                                    : 'bg-transparent text-stone-500 hover:bg-stone-800'
                                                                    }`}
                                                            >
                                                                {mode === 'normal' ? 'Norm' : mode.substring(0, 3)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {resolvedAdv.reasons.length > 0 && (
                                                        <div className="text-[9px] text-stone-500 italic max-w-[150px] truncate text-right">
                                                            {resolvedAdv.reasons.join(', ')}
                                                        </div>
                                                    )}
                                                </div>

                                                {autoFail && (
                                                    <div className="bg-blood/20 border border-blood/40 rounded p-2 flex items-center justify-center gap-2 mb-3 animate-pulse">
                                                        <Skull size={14} className="text-blood" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-blood">Auto-Fails {abilityKey.toUpperCase()} Save (Condition)</span>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {isPlayer ? (
                                                        <div className="col-span-2 bg-stone-950 p-3 rounded border border-stone-800 text-center">
                                                            <p className="text-xs text-stone-400 mb-2 italic">"Ask {target.name} for a <span className="text-parchment font-bold underline">DC {dc} {abilityKey.toUpperCase()} Save</span>."</p>
                                                            <div className="flex gap-2 justify-center">
                                                                <button
                                                                    onClick={() => setWizardContext({
                                                                        ...wizardContext,
                                                                        targetSaves: { ...wizardContext.targetSaves, [target.id]: { saved: true } }
                                                                    })}
                                                                    className={`flex-1 py-1.5 rounded text-[10px] font-black uppercase transition-all ${result.saved === true ? 'bg-green-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}
                                                                >
                                                                    Success
                                                                </button>
                                                                <button
                                                                    onClick={() => setWizardContext({
                                                                        ...wizardContext,
                                                                        targetSaves: { ...wizardContext.targetSaves, [target.id]: { saved: false } }
                                                                    })}
                                                                    className={`flex-1 py-1.5 rounded text-[10px] font-black uppercase transition-all ${result.saved === false ? 'bg-blood text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}
                                                                >
                                                                    Fail
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-stone-500 uppercase">Manual Roll</label>
                                                                <input
                                                                    type="number"
                                                                    placeholder="d20"
                                                                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 text-xs text-parchment font-mono outline-none focus:border-gold"
                                                                    value={result.roll || ''}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value);
                                                                        if (isNaN(val)) return;
                                                                        setWizardContext({
                                                                            ...wizardContext,
                                                                            targetSaves: {
                                                                                ...wizardContext.targetSaves,
                                                                                [target.id]: { roll: val, saved: val >= dc, isManual: true }
                                                                            }
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-stone-500 uppercase">Digital</label>
                                                                <button
                                                                    onClick={() => {
                                                                        if (autoFail) {
                                                                            setWizardContext({
                                                                                ...wizardContext,
                                                                                targetSaves: {
                                                                                    ...wizardContext.targetSaves,
                                                                                    [target.id]: { roll: 1, total: 1 + bonus, saved: false, isManual: false }
                                                                                }
                                                                            });
                                                                            return;
                                                                        }

                                                                        const d20 = Math.floor(Math.random() * 20) + 1;
                                                                        // Simulating adv/dis if needed
                                                                        let finalRoll = d20;
                                                                        if (currentAdvMode === 'advantage') finalRoll = Math.max(d20, Math.floor(Math.random() * 20) + 1);
                                                                        if (currentAdvMode === 'disadvantage') finalRoll = Math.min(d20, Math.floor(Math.random() * 20) + 1);

                                                                        const total = finalRoll + bonus;
                                                                        setWizardContext({
                                                                            ...wizardContext,
                                                                            targetSaves: {
                                                                                ...wizardContext.targetSaves,
                                                                                [target.id]: { roll: finalRoll, total, saved: total >= dc, isManual: false }
                                                                            }
                                                                        });
                                                                    }}
                                                                    className={`w-full h-[32px] flex items-center justify-center gap-2 rounded text-[10px] font-black uppercase transition-all ${hasResult && !result.isManual ? 'bg-arcane text-white' : 'bg-arcane/10 text-arcane border border-arcane/30 hover:bg-arcane/20'}`}
                                                                >
                                                                    <Dice5 size={12} /> {hasResult && !result.isManual ? `Result: ${result.total}` : autoFail ? 'Force Fail' : `Roll (${currentAdvMode === 'normal' ? '' : currentAdvMode === 'advantage' ? 'Adv' : 'Dis'})`}
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {step === 'result' && (
                            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                                <div className="flex flex-col items-center justify-center p-4">
                                    {wizardContext.selectedTargets.length === 1 ? (
                                        (() => {
                                            const target = wizardContext.selectedTargets[0];
                                            const effectiveAc = wizardContext.overrideAc !== null ? wizardContext.overrideAc : target.ac;
                                            const isAttack = action.toHit !== undefined;
                                            const resolvedRoll = wizardContext.rollResult ?? 0;
                                            const displayRoll = wizardContext.rollResult ?? '--';

                                            if (wizardContext.isCrit) {
                                                return (
                                                    <div className="text-center">
                                                        <div className="w-20 h-20 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-gold mx-auto mb-4 animate-bounce shadow-2xl">
                                                            <Sparkles size={40} />
                                                        </div>
                                                        <h3 className="text-4xl font-black text-gold uppercase underline decoration-gold/30">CRITICAL HIT!</h3>
                                                    </div>
                                                );
                                            }

                                            if (wizardContext.isFumble) {
                                                return (
                                                    <div className="text-center">
                                                        <div className="w-20 h-20 rounded-full bg-blood/20 border-2 border-blood flex items-center justify-center text-blood mx-auto mb-4 animate-pulse">
                                                            <Skull size={40} />
                                                        </div>
                                                        <h3 className="text-4xl font-black text-blood uppercase">CRITICAL MISS!</h3>
                                                    </div>
                                                );
                                            }

                                            if (isAttack) {
                                                const autoHit = resolvedRoll >= effectiveAc;
                                                const isHit = wizardContext.isHitOverride !== null ? wizardContext.isHitOverride : autoHit;
                                                const isOverridden = wizardContext.isHitOverride !== null;

                                                return (
                                                    <div className="text-center">
                                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${isHit ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-stone-800 border-stone-700 text-stone-500'}`}>
                                                            {isHit ? <CheckCircle2 size={40} /> : <X size={40} />}
                                                        </div>
                                                        <h3 className={`text-4xl font-black uppercase ${isHit ? 'text-green-500' : 'text-stone-500'}`}>
                                                            {isHit ? 'HIT!' : 'MISS'}
                                                        </h3>
                                                        <div className="flex flex-col items-center gap-1 mt-2">
                                                            <p className="text-parchment font-mono text-xl">
                                                                {displayRoll} <span className="text-stone-500 text-sm mx-1">vs</span> {effectiveAc} AC
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                {isOverridden && (
                                                                    <span className="text-[10px] font-black uppercase text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/30 animate-pulse">
                                                                        DM Override Active
                                                                    </span>
                                                                )}
                                                                <button
                                                                    onClick={() => setWizardContext({
                                                                        ...wizardContext,
                                                                        isHitOverride: !isHit
                                                                    })}
                                                                    className="text-[10px] font-black uppercase text-stone-500 hover:text-parchment border border-stone-800 px-2 py-0.5 rounded bg-stone-900 transition-colors"
                                                                >
                                                                    Flip Result
                                                                </button>
                                                                {isOverridden && (
                                                                    <button
                                                                        onClick={() => setWizardContext({
                                                                            ...wizardContext,
                                                                            isHitOverride: null
                                                                        })}
                                                                        className="text-[10px] font-black uppercase text-blood hover:text-white border border-blood/30 px-2 py-0.5 rounded bg-blood/10 transition-colors"
                                                                    >
                                                                        Reset
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Save result for single target
                                            // Save result for single target
                                            if (action.saveDc) {
                                                const autoSaveFail = resolvedRoll < (action.saveDc || 10);
                                                const isFail = wizardContext.isHitOverride !== null ? wizardContext.isHitOverride : autoSaveFail;
                                                const isOverridden = wizardContext.isHitOverride !== null;

                                                return (
                                                    <div className="text-center">
                                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${isFail ? 'bg-blood/20 border-blood text-blood' : 'bg-green-500/20 border-green-500 text-green-500'}`}>
                                                            {isFail ? <X size={40} /> : <CheckCircle2 size={40} />}
                                                        </div>
                                                        <h3 className={`text-4xl font-black uppercase ${isFail ? 'text-blood' : 'text-green-500'}`}>
                                                            {isFail ? 'FAILED SAVE' : 'SUCCESS!'}
                                                        </h3>
                                                        <div className="flex flex-col items-center gap-1 mt-2">
                                                            <p className="text-parchment font-mono text-xl">
                                                                {displayRoll} <span className="text-stone-500 text-sm mx-1">vs</span> DC {action.saveDc}
                                                            </p>
                                                            <div className="flex items-center justify-center gap-2 mt-4">
                                                                {isOverridden && (
                                                                    <span className="text-[10px] font-black uppercase text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/30 animate-pulse">
                                                                        DM Override Active
                                                                    </span>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        setWizardContext({ ...wizardContext, isHitOverride: !isFail });
                                                                    }}
                                                                    className="text-[10px] font-black uppercase text-stone-500 hover:text-parchment border border-stone-800 px-3 py-1 rounded bg-stone-900 transition-colors"
                                                                >
                                                                    Flip Result
                                                                </button>
                                                                {isOverridden && (
                                                                    <button
                                                                        onClick={() => setWizardContext({ ...wizardContext, isHitOverride: null })}
                                                                        className="text-[10px] font-black uppercase text-blood border border-blood/30 px-3 py-1 rounded bg-blood/10 transition-colors"
                                                                    >
                                                                        Reset
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return null;
                                        })()
                                    ) : (
                                        <div className="w-full space-y-4">
                                            <h3 className="text-gold font-bold text-xs uppercase tracking-widest text-center">Multi-Target Results</h3>
                                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-2">
                                                {wizardContext.selectedTargets.map((t: Combatant, idx: number) => {
                                                    const res = wizardContext.multiTargetResults.find((r) => r.targetId === t.id && r.instanceIdx === idx);
                                                    const isAttack = action.toHit !== undefined;
                                                    const effectiveAc = t.ac; // No individual overrides for multi-target yet to keep it simple
                                                    const resolvedTotal = res?.total ?? Number.NEGATIVE_INFINITY;
                                                    const resolvedRoll = res?.roll ?? Number.NEGATIVE_INFINITY;
                                                    const isFail = isAttack
                                                        ? (res ? resolvedTotal < effectiveAc : false)
                                                        : (res ? resolvedRoll < (action.saveDc || 10) : false);

                                                    return (
                                                        <div key={`${t.id}-${idx}`} className="bg-stone-900 border border-stone-800 p-3 rounded-lg flex items-center justify-between">
                                                            <span className="text-parchment font-bold text-sm truncate">{t.name} (Ray {idx + 1})</span>
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Roll"
                                                                    className="w-16 bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs font-mono text-gold text-right"
                                                                    value={res?.roll || ''}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value);
                                                                        const bonus = wizardContext.overrideToHit !== null ? wizardContext.overrideToHit : (action.toHit || 0);
                                                                        const newResults = [...wizardContext.multiTargetResults.filter((r) => !(r.targetId === t.id && r.instanceIdx === idx))];
                                                                        if (!isNaN(val)) {
                                                                            newResults.push({
                                                                                targetId: t.id,
                                                                                instanceIdx: idx,
                                                                                roll: val,
                                                                                total: val + (action.toHit !== undefined ? bonus : 0),
                                                                                isCrit: val === 20,
                                                                                isFumble: val === 1
                                                                            });
                                                                        }
                                                                        setWizardContext({ ...wizardContext, multiTargetResults: newResults });
                                                                    }}
                                                                />
                                                                {res && (
                                                                    <div className={`p-1 rounded ${isFail ? 'bg-blood/20 text-blood' : 'bg-green-500/20 text-green-500'}`}>
                                                                        {isFail ? <X size={14} /> : <CheckCircle2 size={14} />}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[10px] text-stone-500 text-center italic">Enter individual rolls for each target above.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 'damage' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {/* coaching */}
                                <div className="bg-gold/5 border border-gold/20 p-4 rounded-lg">
                                    <h3 className="text-gold font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Info size={14} /> DM coaching: {isActorPlayer ? 'Ask for Damage' : 'Monster Damage'}
                                    </h3>
                                    <p className="text-parchment text-sm">
                                        {isActorPlayer
                                            ? `Say this: "${actor.name}, great hit! Roll your damage: ${action.damageNotation || '1d6'} ${action.damageType || ''}."`
                                            : `${actor.name} deals damage to the target. Roll ${action.damageNotation || '1d6'}.`}
                                    </p>
                                </div>

                                {/* Target Resistance Analysis */}
                                <div className="bg-stone-900 border border-stone-800 p-4 rounded-lg">
                                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Shield size={14} /> Target Resistance Check
                                    </h4>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="text-sm">
                                                <p className="font-bold text-parchment">{wizardContext.selectedTargets[0].name}</p>
                                                <p className="text-xs text-stone-500">Damage Type: <span className="text-gold uppercase font-black">{action.damageType || 'Typeless'}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {(['Normal', 'Resistant', 'Immune', 'Vulnerable'] as const).map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => setWizardContext({ ...wizardContext, damageMod: mode })}
                                                    className={`px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all border ${wizardContext.damageMod === mode
                                                        ? 'bg-gold border-gold text-stone-950'
                                                        : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
                                                        }`}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Damage Inputs */}
                                <div className="space-y-6">
                                    {/* Multi-Instance Damage (MM, Scorching Ray) */}
                                    {(action.name.toLowerCase().includes('magic missile') || action.name.toLowerCase().includes('scorching ray')) ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Zap size={12} className="text-gold" /> Damage per Instance
                                                </label>
                                                <button
                                                    onClick={() => {
                                                        const notation = action.damageNotation || '1d4+1';
                                                        const match = notation.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/);
                                                        const newResults = [...wizardContext.multiTargetResults];

                                                        wizardContext.selectedTargets.forEach((_item: Combatant, idx: number) => {
                                                            let total = 0;
                                                            if (match) {
                                                                const num = parseInt(match[1]);
                                                                const sides = parseInt(match[2]);
                                                                const op = match[3];
                                                                const mod = parseInt(match[4] || '0');

                                                                const isCrit = wizardContext.multiTargetResults[idx]?.isCrit || false;
                                                                const numDice = isCrit ? num * 2 : num;

                                                                for (let i = 0; i < numDice; i++) total += Math.floor(Math.random() * sides) + 1;
                                                                if (op === '-') total -= mod;
                                                                else total += mod;
                                                            }

                                                            const existing = newResults.find((r) => r.instanceIdx === idx);
                                                            if (existing) {
                                                                existing.damage = total;
                                                            } else {
                                                                newResults.push({ targetId: wizardContext.selectedTargets[idx].id, instanceIdx: idx, damage: total });
                                                            }
                                                        });
                                                        setWizardContext({ ...wizardContext, multiTargetResults: newResults });
                                                    }}
                                                    className="text-[10px] text-gold hover:text-white uppercase font-bold tracking-tight px-2 py-1 bg-gold/10 border border-gold/30 rounded"
                                                >
                                                    Roll All Instances ({action.damageNotation || '1d4+1'})
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {wizardContext.selectedTargets.map((t: Combatant, idx: number) => {
                                                    const res = wizardContext.multiTargetResults.find((r) => r.instanceIdx === idx);
                                                    return (
                                                        <div key={`${t.id}-${idx}`} className="bg-stone-900 border border-stone-800 p-3 rounded-lg flex items-center justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-parchment truncate">{t.name}</p>
                                                                <p className="text-[10px] text-stone-500 uppercase">Instance {idx + 1}</p>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                placeholder="Dmg"
                                                                className="w-16 bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-sm font-mono text-center focus:border-gold outline-none"
                                                                value={res?.damage || ''}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    const newResults = [...wizardContext.multiTargetResults];
                                                                    const existing = newResults.find((r) => r.instanceIdx === idx);
                                                                    if (existing) {
                                                                        existing.damage = isNaN(val) ? 0 : val;
                                                                    } else {
                                                                        newResults.push({ targetId: t.id, instanceIdx: idx, damage: isNaN(val) ? 0 : val });
                                                                    }
                                                                    setWizardContext({ ...wizardContext, multiTargetResults: newResults });
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Activity size={12} className="text-blood" /> Total Damage Rolled
                                                    </label>
                                                    <input
                                                        type="number"
                                                        placeholder="Enter total damage"
                                                        className="w-full bg-stone-950 border border-stone-700 rounded-lg px-4 py-3 text-lg font-mono text-parchment focus:border-gold focus:outline-none"
                                                        value={wizardContext.damageResult || ''}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            setWizardContext({
                                                                ...wizardContext,
                                                                damageResult: isNaN(val) ? null : val
                                                            });
                                                        }}
                                                    />
                                                </div>

                                                {wizardContext.selectedTargets.length > 1 && (
                                                    <div className="bg-stone-900/50 border border-stone-800 p-4 rounded-lg space-y-3">
                                                        <h4 className="text-[10px] font-bold text-gold uppercase tracking-widest">Damage Breakdown</h4>
                                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                                            {wizardContext.selectedTargets.map((t: Combatant, idx: number) => {
                                                                const saveResult = wizardContext.targetSaves[t.id];
                                                                const saved = saveResult?.saved === true;

                                                                const actionName = action.name.toLowerCase();
                                                                const isHalfOnSave = actionName.includes('fireball') || actionName.includes('breath') || actionName.includes('lightning bolt') || actionName.includes('shatter');

                                                                let multiplier = 1;
                                                                if (saved) multiplier = isHalfOnSave ? 0.5 : 0;

                                                                const count = wizardContext.selectedTargets.filter((st) => st.id === t.id).length;
                                                                const isFirstInstance = wizardContext.selectedTargets.findIndex((st) => st.id === t.id) === idx;
                                                                if (!isFirstInstance) return null;

                                                                const finalDmg = Math.floor((wizardContext.damageResult || 0) * multiplier);

                                                                return (
                                                                    <div key={t.id} className="flex justify-between items-center text-xs">
                                                                        <span className="text-stone-400 truncate">{t.name} {count > 1 ? `(x${count})` : ''}</span>
                                                                        <span className="text-blood font-mono font-bold">
                                                                            {finalDmg}
                                                                            {multiplier !== 1 && <span className="text-[10px] text-stone-600 ml-1">(half)</span>}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Dice5 size={12} className="text-arcane" /> Roll Digitally
                                                </label>
                                                <button
                                                    onClick={() => {
                                                        const notation = action.damageNotation || '1d6';
                                                        const match = notation.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/);
                                                        if (match) {
                                                            const num = parseInt(match[1]);
                                                            const sides = parseInt(match[2]);
                                                            const op = match[3];
                                                            const mod = parseInt(match[4] || '0');

                                                            let numDice = num;
                                                            if (wizardContext.isCrit) {
                                                                numDice *= 2; // Official 5e: Roll twice the number of dice
                                                            }

                                                            let total = 0;
                                                            for (let i = 0; i < numDice; i++) total += Math.floor(Math.random() * sides) + 1;

                                                            if (op === '-') total -= mod;
                                                            else total += mod;

                                                            setWizardContext({ ...wizardContext, damageResult: total });
                                                        }
                                                    }}
                                                    className="w-full h-[52px] bg-stone-900 border border-stone-800 hover:border-gold/50 text-parchment rounded-lg font-mono flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <Dice5 size={18} className="text-gold" />
                                                    <span>Roll {action.damageNotation || '1d6'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Damage Preview */}
                                {wizardContext.damageResult !== null && (
                                    <div className="bg-stone-900 border border-stone-800 p-4 rounded-lg space-y-4 animate-in zoom-in duration-300">
                                        <div className="grid grid-cols-1 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                            {wizardContext.selectedTargets.reduce((acc: Combatant[], t: Combatant) => {
                                                if (!acc.find(x => x.id === t.id)) acc.push(t);
                                                return acc;
                                            }, []).map((t: Combatant) => {
                                                const count = wizardContext.selectedTargets.filter((st) => st.id === t.id).length;
                                                const isMultiInstance = action.name.toLowerCase().includes('magic missile') ||
                                                    action.name.toLowerCase().includes('scorching ray');

                                                const isSplit = !isMultiInstance && (action.toHit !== undefined && wizardContext.selectedTargets.length > 1);

                                                let baseDmg = 0;
                                                if (isMultiInstance) {
                                                    // Sum up damage for all instances targeting this creature
                                                    baseDmg = wizardContext.multiTargetResults
                                                        .filter((r) => r.targetId === t.id)
                                                        .reduce((sum: number, r) => sum + (r.damage || 0), 0);
                                                } else {
                                                    baseDmg = isSplit
                                                        ? (wizardContext.damageResult || 0) / wizardContext.selectedTargets.length
                                                        : (wizardContext.damageResult || 0);
                                                }

                                                const saveResult = wizardContext.targetSaves[t.id];
                                                const saved = saveResult?.saved === true;

                                                const actionName = action.name.toLowerCase();
                                                const isHalfOnSave = actionName.includes('fireball') || actionName.includes('breath') || actionName.includes('lightning bolt') || actionName.includes('shatter');

                                                let multiplier = 1;
                                                if (saved) multiplier = isHalfOnSave ? 0.5 : 0;

                                                if (wizardContext.damageMod === 'Resistant') multiplier *= 0.5;
                                                if (wizardContext.damageMod === 'Immune') multiplier = 0;
                                                if (wizardContext.damageMod === 'Vulnerable') multiplier *= 2;

                                                const finalDmg = Math.floor(baseDmg * count * multiplier);
                                                const newHp = Math.max(0, t.currentHp - finalDmg);

                                                return (
                                                    <div key={t.id} className="flex items-center justify-between border-b border-stone-800/50 pb-2 last:border-0 last:pb-0">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-parchment truncate">{t.name} {count > 1 ? `(x${count})` : ''}</p>
                                                            <p className="text-[10px] text-stone-500 font-mono">
                                                                HP: {t.currentHp} → <span className={newHp < t.currentHp ? 'text-blood font-bold' : 'text-stone-300'}>{newHp}</span>
                                                            </p>
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <p className="text-[10px] text-stone-500 uppercase font-black">Dealt</p>
                                                            <p className="text-xs font-mono font-black text-blood">-{finalDmg}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 'effect' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-gold/5 border border-gold/20 p-4 rounded-lg">
                                    <h3 className="text-gold font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Info size={14} /> DM coaching: {isActorPlayer ? 'Additional Effects' : 'Monster Effects'}
                                    </h3>
                                    <p className="text-parchment text-sm">
                                        {isActorPlayer
                                            ? `Does ${action.name} apply any conditions to ${wizardContext.selectedTargets[0].name}?`
                                            : `Apply any additional effects from ${action.name}.`}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {/* Condition Save Prompt Sub-module */}
                                    {wizardContext.conditionToSave && (
                                        <div className="bg-arcane/10 border border-arcane/30 p-4 rounded-lg animate-in zoom-in duration-300 space-y-4 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-black text-arcane flex items-center gap-2 uppercase tracking-widest">
                                                    <AlertCircle size={16} /> Save Required: {wizardContext.conditionToSave.name}
                                                </h4>
                                                <button
                                                    onClick={() => setWizardContext({ ...wizardContext, conditionToSave: null })}
                                                    className="text-stone-500 hover:text-parchment transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            <div className="p-3 bg-stone-950/50 border border-arcane/20 rounded-lg">
                                                <p className="text-xs text-parchment leading-relaxed text-center">
                                                    Ask the target for a <span className="text-gold font-bold">{ABILITY_NAMES[action.saveAbility || 'dex'] || 'DEX'} Saving Throw</span>
                                                    <br />
                                                    <span className="text-stone-500 font-black">DC {action.saveDc || 10}</span>
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Dice roll result"
                                                        className="flex-1 bg-stone-950 border border-arcane/30 rounded px-3 py-2 text-sm font-mono text-gold focus:border-gold focus:outline-none"
                                                        value={wizardContext.manualRollInput}
                                                        onChange={(e) => setWizardContext({ ...wizardContext, manualRollInput: e.target.value })}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const val = parseInt(wizardContext.manualRollInput);
                                                            if (isNaN(val)) return;

                                                            const dc = action.saveDc || 10;
                                                            if (val >= dc) {
                                                                setWizardContext({ ...wizardContext, conditionToSave: null, manualRollInput: '' });
                                                            } else {
                                                                setWizardContext({
                                                                    ...wizardContext,
                                                                    selectedConditions: wizardContext.conditionToSave
                                                                        ? [...wizardContext.selectedConditions, wizardContext.conditionToSave]
                                                                        : wizardContext.selectedConditions,
                                                                    conditionToSave: null,
                                                                    manualRollInput: ''
                                                                });
                                                            }
                                                        }}
                                                        disabled={!wizardContext.manualRollInput}
                                                        className="bg-arcane text-stone-950 px-4 py-2 rounded font-black text-[10px] uppercase hover:bg-arcane/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Confirm
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const d20 = Math.floor(Math.random() * 20) + 1;
                                                            const dc = action.saveDc || 10;
                                                            if (d20 >= dc) {
                                                                setWizardContext({ ...wizardContext, conditionToSave: null });
                                                            } else {
                                                                setWizardContext({
                                                                    ...wizardContext,
                                                                    selectedConditions: wizardContext.conditionToSave
                                                                        ? [...wizardContext.selectedConditions, wizardContext.conditionToSave]
                                                                        : wizardContext.selectedConditions,
                                                                    conditionToSave: null
                                                                });
                                                            }
                                                        }}
                                                        className="bg-stone-900 border border-stone-800 p-3 rounded-lg text-[10px] font-black text-parchment hover:border-arcane hover:bg-arcane/5 transition-all flex flex-col items-center gap-1 uppercase"
                                                    >
                                                        <Dice5 size={14} className="text-arcane" /> Digital Save
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setWizardContext({
                                                                ...wizardContext,
                                                                selectedConditions: wizardContext.conditionToSave
                                                                    ? [...wizardContext.selectedConditions, wizardContext.conditionToSave]
                                                                    : wizardContext.selectedConditions,
                                                                conditionToSave: null
                                                            });
                                                        }}
                                                        className="bg-stone-900 border border-stone-800 p-3 rounded-lg text-[10px] font-black text-gold hover:border-gold hover:bg-gold/5 transition-all flex flex-col items-center gap-1 uppercase"
                                                    >
                                                        <Zap size={14} className="text-gold" /> DM Override
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Concentration Toggle */}
                                    {action.requiresConcentration && (
                                        <button
                                            onClick={() => setWizardContext({ ...wizardContext, applyConcentration: !wizardContext.applyConcentration })}
                                            className={`w-full p-4 rounded-lg border flex items-center justify-between transition-all ${wizardContext.applyConcentration ? 'bg-arcane/10 border-arcane shadow-[0_0_15px_rgba(139,92,246,0.1)]' : 'bg-stone-900/50 border-stone-800'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${wizardContext.applyConcentration ? 'bg-arcane/20 border-arcane text-arcane' : 'bg-stone-800 border-stone-700 text-stone-500'}`}>
                                                    <Activity size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <p className={`font-bold text-sm ${wizardContext.applyConcentration ? 'text-arcane' : 'text-parchment'}`}>Begin Concentration</p>
                                                    <p className="text-[10px] text-stone-500 uppercase font-black">Actor will be marked as concentrating</p>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${wizardContext.applyConcentration ? 'bg-arcane border-arcane' : 'bg-transparent border-stone-600'}`}>
                                                {wizardContext.applyConcentration && <CheckCircle2 size={12} className="text-white" />}
                                            </div>
                                        </button>
                                    )}

                                    {/* Concentration Save Prompt */}
                                    {wizardContext.selectedTargets.some((t) => t.isConcentrating) && !wizardContext.concentrationSaveTargetId && (
                                        <div className="bg-blood/5 border border-blood/20 p-4 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top duration-300">
                                            <div className="flex items-center gap-3">
                                                <Activity size={20} className="text-blood" />
                                                <div className="text-left">
                                                    <p className="font-bold text-sm text-parchment">Concentration Check Needed</p>
                                                    <p className="text-[10px] text-stone-500 uppercase font-black">Target is Concentrating and took damage</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const target = wizardContext.selectedTargets.find((t) => t.isConcentrating);
                                                    if (target) {
                                                        const dmg = wizardContext.damageResult || 0;
                                                        const dc = Math.max(10, Math.floor(dmg / 2));
                                                        setWizardContext({
                                                            ...wizardContext,
                                                            concentrationSaveTargetId: target.id,
                                                            concentrationSaveDc: dc
                                                        });
                                                    }
                                                }}
                                                className="px-4 py-2 bg-blood/10 hover:bg-blood/20 border border-blood/30 text-blood rounded text-[10px] font-black uppercase transition-all"
                                            >
                                                Resolve Now
                                            </button>
                                        </div>
                                    )}

                                    {/* Concentration Save Resolver UI */}
                                    {wizardContext.concentrationSaveTargetId && (
                                        <div className="bg-blood/10 border border-blood/30 p-4 rounded-xl space-y-4 animate-in slide-in-from-top duration-500">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blood/20 border border-blood/50 flex items-center justify-center text-blood">
                                                    <Activity size={22} className="animate-pulse" />
                                                </div>
                                                <div>
                                                    <h4 className="text-blood font-black uppercase text-xs tracking-widest leading-none">Concentration Save Required</h4>
                                                    <p className="text-[10px] text-stone-500 uppercase mt-1">
                                                        {allCombatants.find(c => c.id === wizardContext.concentrationSaveTargetId)?.name} must make a DC {wizardContext.concentrationSaveDc} CON Save
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-stone-500 uppercase">Digital Prompt</label>
                                                    <button
                                                        onClick={() => {
                                                            const d20 = Math.floor(Math.random() * 20) + 1;
                                                            const target = allCombatants.find(c => c.id === wizardContext.concentrationSaveTargetId);
                                                            const conMod = target ? Math.floor(((target.abilityScores?.con || 10) - 10) / 2) : 0;
                                                            const total = d20 + conMod;
                                                            setWizardContext({
                                                                ...wizardContext,
                                                                manualRollInput: `Roll: ${d20} + ${conMod} = ${total}`
                                                            });
                                                        }}
                                                        className="w-full h-10 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-parchment rounded-lg flex items-center justify-center gap-2 transition-all font-mono text-xs"
                                                    >
                                                        <Dice5 size={16} className="text-gold" /> Roll for them
                                                    </button>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-stone-500 uppercase">Effect</label>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setWizardContext({
                                                                    ...wizardContext,
                                                                    concentrationSaveTargetId: null,
                                                                    manualRollInput: ''
                                                                });
                                                            }}
                                                            className="flex-1 h-10 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-500 rounded-lg font-black uppercase text-[10px]"
                                                        >
                                                            Success
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setWizardContext({
                                                                    ...wizardContext,
                                                                    concentrationSaveTargetId: null,
                                                                    manualRollInput: '',
                                                                    selectedConditions: [...wizardContext.selectedConditions, { id: 'lost-con', name: 'Broke Concentration', icon: '💥' }]
                                                                });
                                                            }}
                                                            className="flex-1 h-10 bg-blood/10 hover:bg-blood/20 border border-blood/30 text-blood rounded-lg font-black uppercase text-[10px]"
                                                        >
                                                            Fail
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            {wizardContext.manualRollInput && (
                                                <p className="text-center text-[10px] text-stone-400">
                                                    {wizardContext.manualRollInput}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Conditions Grid */}
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.2em] px-1">Conditions to Apply</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {COMMON_CONDITIONS.map(condition => {
                                                const isSelected = wizardContext.selectedConditions.some((c) => c.id === condition.id);
                                                const isPending = wizardContext.conditionToSave?.id === condition.id;

                                                return (
                                                    <button
                                                        key={condition.id}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setWizardContext({
                                                                    ...wizardContext,
                                                                    selectedConditions: wizardContext.selectedConditions.filter((c) => c.id !== condition.id)
                                                                });
                                                            } else {
                                                                setWizardContext({ ...wizardContext, conditionToSave: condition });
                                                            }
                                                        }}
                                                        className={`p-2 rounded-lg border text-left transition-all flex items-center justify-between ${isSelected ? 'bg-gold/10 border-gold shadow-[0_0_10px_rgba(255,215,0,0.1)]' : isPending ? 'bg-arcane/10 border-arcane border-dashed animate-pulse' : 'bg-stone-900 border-stone-800 hover:border-stone-700'}`}
                                                    >
                                                        <span className="text-[10px] font-bold text-parchment flex items-center gap-1">
                                                            <span className="text-base">{condition.icon}</span>
                                                            {condition.name}
                                                        </span>
                                                        {isSelected && <CheckCircle2 size={12} className="text-gold" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'summary' && (
                            <div className="space-y-6 text-center animate-in zoom-in duration-500">
                                {wizardContext.slowSpellFailed ? (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-blood/10 border border-blood/30 flex items-center justify-center text-blood mx-auto mb-4 animate-pulse">
                                            <AlertCircle size={32} />
                                        </div>
                                        <h3 className="text-2xl font-black text-blood uppercase">Spell Delayed!</h3>
                                        <p className="text-sm text-stone-400 max-w-sm mx-auto">
                                            The <span className="text-gold font-bold">Slow</span> condition has caused the magical energies to falter. The spell is delayed until your next turn (or lost if concentration breaks).
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mx-auto mb-4">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <h3 className="text-2xl font-black text-parchment uppercase">Action Complete</h3>
                                    </>
                                )}
                                <div className="bg-stone-900/50 border border-stone-800 rounded-xl divide-y divide-stone-800 text-left max-w-sm mx-auto">
                                    <div className="p-4 flex justify-between">
                                        <span className="text-xs text-stone-500 uppercase">Target{wizardContext.selectedTargets.length > 1 ? 's' : ''}</span>
                                        <span className="text-sm font-bold text-parchment text-right">
                                            {wizardContext.selectedTargets.length > 3
                                                ? `${wizardContext.selectedTargets.length} Creatures`
                                                : wizardContext.selectedTargets.reduce((acc: Combatant[], t: Combatant) => {
                                                    if (!acc.find(x => x.id === t.id)) acc.push(t);
                                                    return acc;
                                                }, []).map((t) => t.name).join(', ')
                                            }
                                        </span>
                                    </div>
                                    <div className="p-4 flex justify-between">
                                        <span className="text-xs text-stone-500 uppercase">Roll Result</span>
                                        <span className="text-sm font-bold text-parchment font-mono">{wizardContext.rollResult}</span>
                                    </div>
                                    {wizardContext.selectedConditions.length > 0 && (
                                        <div className="p-4 flex flex-col gap-2">
                                            <span className="text-xs text-stone-500 uppercase">Conditions Applied</span>
                                            <div className="flex flex-wrap gap-2">
                                                {wizardContext.selectedConditions.map((c) => (
                                                    <span key={c.id} className="text-[10px] font-bold bg-gold/10 text-gold border border-gold/30 px-2 py-0.5 rounded flex items-center gap-1">
                                                        <span>{c.icon}</span> {c.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {wizardContext.applyConcentration && (
                                        <div className="p-4 flex justify-between bg-arcane/5">
                                            <span className="text-xs text-arcane uppercase font-black">Concentration</span>
                                            <span className="text-[10px] font-black text-arcane uppercase">Active</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-stone-800 bg-stone-900/50 flex items-center justify-between">
                        <button
                            onClick={handleBack}
                            disabled={!canGoBack}
                            className="flex items-center gap-2 px-4 py-2 text-stone-500 hover:text-parchment disabled:opacity-0 transition-all font-bold text-sm"
                        >
                            <ChevronLeft size={16} /> Back
                        </button>

                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-8 py-3 bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold rounded-lg text-sm font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,215,0,0.1)] active:scale-[0.98]"
                        >
                            {isLastStep ? 'Finalize Action' : 'Continue'} <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Rules Side Panel */}
                {wizardContext.showRules && (
                    <div className="w-80 bg-stone-900 border-l border-stone-800 flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
                        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
                            <h3 className="text-xs font-black text-gold uppercase tracking-[0.2em] flex items-center gap-2">
                                <BookOpen size={14} /> Rule Reference
                            </h3>
                            <button
                                onClick={() => setWizardContext({ ...wizardContext, showRules: false })}
                                className="text-stone-500 hover:text-parchment"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {currentRule ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-stone-950/50 border border-gold/10 rounded-lg">
                                        <h4 className="text-parchment font-bold text-sm mb-2 underline decoration-gold/30">{currentRule.name}</h4>
                                        <p className="text-xs text-stone-400 leading-relaxed whitespace-pre-wrap">{currentRule.description}</p>
                                    </div>

                                    {currentRule.whenToUse && (
                                        <div className="p-4 bg-gold/5 border border-gold/10 rounded-lg">
                                            <h5 className="text-[10px] font-black text-gold uppercase mb-2">When to use:</h5>
                                            <p className="text-[11px] text-parchment italic leading-relaxed">{currentRule.whenToUse}</p>
                                        </div>
                                    )}

                                    {currentRule.saves && (
                                        <div className="p-4 bg-arcane/5 border border-arcane/10 rounded-lg">
                                            <h5 className="text-[10px] font-black text-arcane uppercase mb-2">Saving Throws:</h5>
                                            <p className="text-[11px] text-parchment italic leading-relaxed">{currentRule.saves}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Info size={32} className="text-stone-700 mb-2" />
                                    <p className="text-xs text-stone-500 italic">No specific rule found for this step.</p>
                                </div>
                            )}

                            {/* Quick Links */}
                            <div className="pt-4 border-t border-stone-800 space-y-2">
                                <h5 className="text-[9px] font-black text-stone-500 uppercase tracking-widest px-1">Common Rules</h5>
                                <div className="flex flex-wrap gap-1.5">
                                    {['attack-action', 'saving-throw', 'magic-action', 'study-action'].map(id => (
                                        <button
                                            key={id}
                                            onClick={() => setWizardContext({ ...wizardContext, activeRuleId: id })}
                                            className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${wizardContext.activeRuleId === id ? 'bg-gold text-stone-950' : 'bg-stone-800 text-stone-400 hover:text-parchment'}`}
                                        >
                                            {CORE_RULE_DESCRIPTIONS[id]?.name || id}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >,
        document.body
    );
}
