import type { ABILITY_DEFINITIONS, SKILL_DEFINITIONS } from './constants';

export type AbilityId = typeof ABILITY_DEFINITIONS[number]['id'];
export type SkillId = typeof SKILL_DEFINITIONS[number]['id'];
export type ProficiencyTier = 'none' | 'proficient' | 'expertise';

export interface Phase1Skill {
    id: SkillId;
    label: string;
    ability: AbilityId;
    proficiency: ProficiencyTier;
    bonus: number;
    source?: string;
}

export interface Phase1ResourceCounter {
    id: string;
    name: string;
    current: number;
    max: number;
    resetOn: 'short' | 'long' | 'never';
    kind: 'resource' | 'spell-slot' | 'hit-dice' | 'consumable' | 'other';
    level?: number;
    detail?: string;
}

export interface Phase1Condition {
    id: string;
    label: string;
    source?: string;
    summary?: string;
}

export interface Phase1Movement {
    kind: string;
    label: string;
    distance: number | null;
    unit: string;
}

export interface Phase1Sense {
    kind: string;
    label: string;
    range: number | null;
    unit: string;
}

export interface Phase1ActionSummary {
    id: string;
    name: string;
    kind: string;
    source?: string;
    description?: string;
    automation?: Phase1ActionAutomation | null;
}

export interface Phase1ActionResourceCost {
    resourceId: string;
    amount: number;
}

export interface Phase1ActionOutcome {
    label: string;
    kind: 'damage' | 'healing' | 'effect';
    formula?: string;
    damageType?: string;
    summary?: string;
    application?: Phase1OutcomeApplication | null;
}

export interface Phase1OutcomeApplication {
    hitPoints?: 'damage' | 'healing';
    conditionLabel?: string;
    conditionMode?: 'add' | 'remove';
}

export interface Phase1AttackRollAutomation {
    kind: 'attack-roll';
    attackSource: AbilityId | 'spellcasting';
    proficient: boolean;
    bonus: number;
    range?: 'melee' | 'ranged' | 'other';
    outcomes?: Phase1ActionOutcome[];
    resourceCost?: Phase1ActionResourceCost | null;
}

export interface Phase1SaveDcAutomation {
    kind: 'save-dc';
    saveAbility: AbilityId;
    dcSource: AbilityId | 'spellcasting' | 'fixed';
    proficient: boolean;
    bonus: number;
    fixedDc?: number | null;
    effectSummary?: string;
    successSummary?: string;
    failureSummary?: string;
    outcomes?: Phase1ActionOutcome[];
    resourceCost?: Phase1ActionResourceCost | null;
}

export type Phase1ActionAutomation = Phase1AttackRollAutomation | Phase1SaveDcAutomation;

export interface Phase1ArmorClass {
    value: number;
    source: string;
    audit: string[];
}

export interface Phase1HitPoints {
    current: number;
    max: number;
    temp: number;
}

export interface Phase1Spellcasting {
    ability: AbilityId;
    attackBonus: number;
    saveDc: number;
    slots: Phase1ResourceCounter[];
}

export interface Phase1RollAdjustments {
    initiative: number;
    saves: Partial<Record<AbilityId, number>>;
    skills: Partial<Record<SkillId, number>>;
}

export interface Phase1CharacterSheet {
    id: string;
    name: string;
    playerName: string;
    level: number;
    ancestry: string;
    classSummary: string;
    abilities: Record<AbilityId, number>;
    savingThrowProficiencies: AbilityId[];
    skills: Record<SkillId, Phase1Skill>;
    armorClass: Phase1ArmorClass;
    hitPoints: Phase1HitPoints;
    deathSaves: { successes: number; failures: number };
    proficiencyBonusOverride: number | null;
    rollAdjustments: Phase1RollAdjustments;
    movement: Phase1Movement[];
    senses: Phase1Sense[];
    spellcasting: Phase1Spellcasting | null;
    resources: Phase1ResourceCounter[];
    conditions: Phase1Condition[];
    actions: Phase1ActionSummary[];
    notes: string[];
}

export interface RollModifierPart {
    label: string;
    value: number;
    source: 'ability' | 'proficiency' | 'bonus' | 'manual' | 'legacy';
}

export interface NumericBreakdown {
    total: number;
    parts: RollModifierPart[];
    formula: string;
    audit: string[];
}

export interface StructuredRollRequest {
    id: string;
    label: string;
    scope: 'ability' | 'saving-throw' | 'skill' | 'initiative' | 'attack';
    formula: string;
    totalModifier: number;
    breakdown: RollModifierPart[];
    audit: string[];
    advantage: 'normal' | 'advantage' | 'disadvantage';
}

export interface StructuredRollResult extends StructuredRollRequest {
    rolled: number;
    secondaryRolled: number | null;
    kept: number;
    dropped: number | null;
    total: number;
    metadata: {
        critical: boolean;
        fumble: boolean;
        timestamp: number;
    };
}

export interface ActionOutcomeRollRequest {
    id: string;
    label: string;
    kind: 'damage' | 'healing' | 'effect';
    formula: string;
    damageType?: string;
    summary?: string;
    audit: string[];
}

export interface ActionOutcomeRollPart {
    kind: 'dice' | 'modifier';
    label: string;
    value: number;
    rolls?: number[];
}

export interface ActionOutcomeRollResult extends ActionOutcomeRollRequest {
    total: number;
    parts: ActionOutcomeRollPart[];
    metadata: {
        timestamp: number;
    };
}

export interface RollableSheetRow {
    id: string;
    label: string;
    subtitle?: string;
    total: number;
    request: StructuredRollRequest;
}

export interface CharacterSheetViewModel {
    proficiencyBonus: number;
    initiative: RollableSheetRow;
    abilities: Array<{
        id: AbilityId;
        label: string;
        name: string;
        score: number;
        modifier: number;
        request: StructuredRollRequest;
    }>;
    saves: RollableSheetRow[];
    skills: RollableSheetRow[];
}
