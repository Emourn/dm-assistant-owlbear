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
}

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
    scope: 'ability' | 'saving-throw' | 'skill' | 'initiative';
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
