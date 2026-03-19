/**
 * RULES TYPE SCHEMAS — D&D 5th Edition
 *
 * Data-driven type definitions for all game rule entities.
 * These types define the shape of JSON data loaded from 5e.tools
 * and from local static tables in src/data/dnd5e/.
 *
 * All UI components and engines derive calculations from these schemas.
 * Adding new content only requires satisfying these interfaces — the
 * engine and UI update automatically.
 */

import type { StatBlock } from './character';

// ─────────────────────────────────────────────────────────────────────────────
// EFFECT SYSTEM
// Modular, data-driven effects applied by features, feats, spells, and items.
// The rules engine interprets effects and applies them to derived stats.
// ─────────────────────────────────────────────────────────────────────────────

export type EffectType =
    | 'add_proficiency'          // grants armor/weapon/tool/skill proficiency
    | 'add_expertise'            // doubles proficiency for a skill
    | 'grant_spell'              // adds a spell to known/prepared list
    | 'grant_cantrip'            // adds a cantrip permanently
    | 'modify_ability_score'     // adds flat bonus to a stat
    | 'add_attack_bonus'         // bonus to attack rolls
    | 'add_damage_bonus'         // bonus to damage rolls
    | 'add_ac_bonus'             // bonus to armor class
    | 'set_ac'                   // sets base AC (e.g. 10 + DEX + CON)
    | 'add_save_bonus'           // bonus to saving throws (all or specific)
    | 'add_initiative_bonus'     // bonus to initiative rolls
    | 'increase_speed'           // adds to movement speed
    | 'grant_darkvision'         // grants or extends darkvision (value in feet)
    | 'grant_resistance'         // grants damage resistance
    | 'grant_immunity'           // grants damage immunity
    | 'grant_language'           // adds a language
    | 'grant_advantage'          // grants advantage on rolls (saves, checks, attacks)
    | 'grant_feature'            // grants another feature by ID
    | 'modify_hp_max'            // bonus to maximum hit points
    | 'modify_hit_points'        // legacy: bonus HP per level or flat
    | 'add_saving_throw_prof'    // proficiency in a saving throw
    | 'add_skill_proficiency'    // proficiency in a skill
    | 'set_spellcasting_ability' // sets INT/WIS/CHA for spellcasting
    | 'add_resource'             // grants a tracked resource (Ki, Rage, etc.)
    | 'custom';                  // DM-defined or complex effect

export interface Effect {
    id: string;
    type: EffectType;
    /** The target of the effect: stat name, skill name, damage type, "all", etc. */
    target?: string;
    /** Numeric value or formula string. */
    value?: number | string;
    /** String payload (e.g. spell name, language, proficiency name). */
    payload?: string;
    /** For conditional effects: when this applies. */
    condition?: string;
    /** Human-readable note shown in UI. */
    note?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES
// Discrete abilities granted by race, class, subclass, background, or feat.
// ─────────────────────────────────────────────────────────────────────────────

export type FeatureChoiceType =
    | 'skill'
    | 'spell'
    | 'feat'
    | 'fighting_style'
    | 'tool'
    | 'language'
    | 'subclass'
    | 'eldritch_invocation'
    | 'pact_boon'
    | 'metamagic'
    | 'maneuver'
    | 'custom';

export interface FeatureChoice {
    type: FeatureChoiceType;
    count: number;
    /** Optional filter: skill list, spell level cap, school restrictions, etc. */
    filter?: Record<string, unknown>;
    /** Options list (used when the choice set is finite and static). */
    options?: string[];
}

export interface RuleFeature {
    id: string;
    name: string;
    /** Human-readable description (may contain markdown). */
    description: string;
    /** Character level at which this feature is gained (1–20). */
    levelRequirement: number;
    /** Structured effects that the rules engine applies automatically. */
    effects: Effect[];
    /** If the feature requires the user to make a choice. */
    choice?: FeatureChoice;
    /** If the feature has limited uses (Rage, Channel Divinity, etc.). */
    hasUses?: boolean;
    usesFormula?: string;   // e.g. "CON_MOD" | "PB" | "LEVEL/2" | "3"
    resetOn?: 'short' | 'long' | 'never';
    /** True if the feature scales with level (Sneak Attack, Martial Arts, etc.). */
    scalesWithLevel?: boolean;
    scalingFormula?: string;
    /** Source for attribution. */
    source?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// RACES & SUBRACES
// ─────────────────────────────────────────────────────────────────────────────

export interface AbilityScoreBonus {
    stat: keyof StatBlock | 'choice'; // 'choice' means "pick any stat"
    value: number;
    choiceCount?: number; // if stat === 'choice', how many stats to pick
}

export interface SubraceData {
    id: string;
    name: string;
    source: string;
    description: string;
    abilityScoreBonuses: AbilityScoreBonus[];
    traits: RuleFeature[];
    languages?: string[];
    proficiencies?: string[];
}

export type CreatureSize = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';

export interface RaceData {
    id: string;
    name: string;
    source: string;
    description: string;
    size: CreatureSize;
    speed: number;                         // base walking speed in feet
    abilityScoreBonuses: AbilityScoreBonus[];
    traits: RuleFeature[];
    subraces: SubraceData[];
    languages: string[];
    proficiencies?: string[];              // weapon / tool / armor profs granted
    resistances?: string[];
    immunities?: string[];
    darkvision?: number;                   // feet, 0 if none
    senses?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SPELLCASTING PROGRESSION
// ─────────────────────────────────────────────────────────────────────────────

export type SpellcasterType =
    | 'full'       // Bard, Cleric, Druid, Sorcerer, Wizard
    | 'half'       // Paladin, Ranger (floor)
    | 'artificer'  // Artificer (ceiling)
    | 'third'      // Eldritch Knight (Fighter), Arcane Trickster (Rogue)
    | 'pact'       // Warlock — separate Pact Magic progression
    | 'none';      // Non-spellcaster

export interface SpellcastingProgression {
    type: SpellcasterType;
    /** Primary spellcasting ability score. */
    ability: keyof StatBlock;
    /** "Known" casters list (e.g. Bard, Sorcerer, Warlock, Ranger). */
    spellsKnownFormula?: string;  // e.g. "table" | "INT_MOD + LEVEL"
    /** "Prepared" casters (Wizard, Cleric, etc.) have all spells prepared dynamically. */
    isPrepared?: boolean;
    preparedFormula?: string;     // e.g. "WIS_MOD + LEVEL"
    /** Ritual casting capability. */
    canRitualCast?: boolean;
    /** True if class can learn spells from other class lists (Eldritch Knight, etc.). */
    restrictedSpellList?: string; // Abjuration/Evocation for EKF, etc.
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSES
// ─────────────────────────────────────────────────────────────────────────────

export interface LevelEntry {
    level: number;
    /** IDs or names of features gained at this level. */
    features: string[];
    /**
     * Spell slots for this level (if spellcaster).
     * Index 0 = L1 slots, index 1 = L2 slots … index 8 = L9 slots.
     * For Warlock: slot count (single tier) + separate slotsLevel.
     */
    spellSlots?: number[];
    /** Warlock: the level of their Pact Magic spell slot. */
    pactSlotLevel?: number;
    /** Spells known (Known casters only). */
    spellsKnown?: number;
    /** Cantrips known. */
    cantripsKnown?: number;
    /** Class-specific resources (Ki, Rage, Sorcery Points, etc.) */
    resources?: Record<string, number>;
    /** True if this level grants an ASI (or feat choice). */
    isASILevel?: boolean;
}

export interface ClassData {
    id: string;
    name: string;
    source: string;
    description: string;
    hitDice: number;                       // die faces: 6 | 8 | 10 | 12
    savingThrows: (keyof StatBlock)[];
    armorProficiencies: string[];
    weaponProficiencies: string[];
    toolProficiencies?: string[];
    /** Number of skill choices the class grants. */
    skillChoiceCount: number;
    /** Which skills the class can choose from. */
    skillChoiceList: string[];
    spellcasting?: SpellcastingProgression;
    /** Level-by-level progression table (20 entries). */
    levels: LevelEntry[];
    /** Subclass title (e.g. "Arcane Tradition" for Wizard). */
    subclassTitle: string;
    /** Level at which the subclass is chosen. */
    subclassLevel: number;
    /** Available starting equipment options. */
    startingEquipment?: string[][];
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCLASSES
// ─────────────────────────────────────────────────────────────────────────────

export interface SubclassData {
    id: string;
    name: string;
    fullName: string;                      // e.g. "School of Evocation"
    source: string;
    parentClass: string;                   // parent class name
    description: string;
    /** Levels at which the subclass grants features. */
    levels: LevelEntry[];
    /** Additional spells granted (e.g. Domain Spells, Oath Spells). */
    additionalSpells?: Record<number, string[]>; // level → spell names
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUNDS
// ─────────────────────────────────────────────────────────────────────────────

export interface BackgroundData {
    id: string;
    name: string;
    source: string;
    description: string;
    skillProficiencies: string[];          // exactly 2 skills
    toolProficiencies: string[];
    languages: number;                     // number of additional languages
    languageChoices?: string[];            // optional restricted list
    startingEquipment: string[];
    /** The signature background feature (Wanderer, Criminal Contact, etc.). */
    feature: RuleFeature;
    /** Personality trait options (d8 table). */
    personalityTraits?: string[];
    ideals?: string[];
    bonds?: string[];
    flaws?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATS
// ─────────────────────────────────────────────────────────────────────────────

export interface FeatPrerequisite {
    type: 'ability_score' | 'proficiency' | 'race' | 'class' | 'spellcasting' | 'level';
    stat?: keyof StatBlock;
    minimum?: number;
    name?: string;
    description?: string;
}

export interface FeatData {
    id: string;
    name: string;
    source: string;
    description: string;
    prerequisites: FeatPrerequisite[];
    abilityScoreBonuses?: Partial<Record<keyof StatBlock, number>>;
    effects: Effect[];
    /** True if feat has limited uses. */
    hasUses?: boolean;
    usesFormula?: string;
    resetOn?: 'short' | 'long' | 'never';
}

// ─────────────────────────────────────────────────────────────────────────────
// SPELLS
// ─────────────────────────────────────────────────────────────────────────────

export type SpellSchool =
    | 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment'
    | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';

export interface SpellScaling {
    type: 'per_level' | 'at_level';       // upcast behavior
    stat: 'damage' | 'targets' | 'duration' | 'custom';
    formula: string;                       // e.g. "1d6 per slot level above 1st"
    description: string;
}

export interface SpellComponents {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    materialDescription?: string;
    cost?: number;                         // gold cost if consumed
    consumed?: boolean;
}

export interface SpellData {
    id: string;
    name: string;
    level: number;                         // 0 = cantrip, 1–9 = spell levels
    school: SpellSchool;
    castingTime: string;
    range: string;
    duration: string;
    concentration: boolean;
    ritual: boolean;
    components: SpellComponents;
    description: string;
    higherLevels?: string;                 // "At Higher Levels..." text
    scaling?: SpellScaling;
    /** Class lists this spell appears on. */
    classes: string[];
    source: string;
    tags?: string[];                        // 'damage', 'healing', 'control', etc.
}

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPMENT
// ─────────────────────────────────────────────────────────────────────────────

export type WeaponCategory = 'simple-melee' | 'simple-ranged' | 'martial-melee' | 'martial-ranged';
export type ArmorCategory = 'light' | 'medium' | 'heavy' | 'shield';
export type EquipmentCategory = 'weapon' | 'armor' | 'adventuring-gear' | 'tool' | 'mount' | 'vehicle' | 'magic-item' | 'other';

export type WeaponProperty =
    | 'ammunition' | 'finesse' | 'heavy' | 'light' | 'loading'
    | 'reach' | 'thrown' | 'two-handed' | 'versatile' | 'special';

export interface ArmorData {
    category: ArmorCategory;
    baseAC: number;
    /** Max DEX bonus. null = no cap (light), 2 = medium, 0 = heavy. */
    maxDexBonus: number | null;
    strengthRequirement?: number;
    stealthDisadvantage?: boolean;
    donMinutes?: number;
    doffMinutes?: number;
}

export interface WeaponData {
    category: WeaponCategory;
    damageDice: string;                    // e.g. "1d8"
    damageType: string;                    // "slashing", "piercing", "bludgeoning"
    properties: WeaponProperty[];
    thrownRange?: [number, number];        // [normal, long] range in feet
    ammunitionType?: string;
    versatileDamageDice?: string;          // damage when used two-handed
}

export interface EquipmentData {
    id: string;
    name: string;
    source: string;
    category: EquipmentCategory;
    description: string;
    weight: number;                        // pounds
    costGP: number;
    rarity?: 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary' | 'Artifact' | 'None';
    requiresAttunement?: boolean;
    armor?: ArmorData;
    weapon?: WeaponData;
    effects?: Effect[];                     // for magic items
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTICLASS
// ─────────────────────────────────────────────────────────────────────────────

export interface MulticlassPrerequisite {
    className: string;
    requirements: {
        stat: keyof StatBlock;
        minimum: number;
    }[];
    /** Some classes also require at least 13 in primary + multiclass stat. */
    requireBothPrimary?: boolean;
}

/**
 * Represents a single class entry in a multiclassed character.
 * The character's root `className` / `level` represent the primary class;
 * `classes` holds ALL classes including the primary.
 */
export interface ClassEntry {
    className: string;
    subclass: string;
    level: number;
    hitDice: number;                       // die faces for this class
    spellcastingAbility: keyof StatBlock | 'none';
    spellcasterType: SpellcasterType;
}

// ─────────────────────────────────────────────────────────────────────────────
// DERIVED CHARACTER STATS
// Output of the rules engine's computeDerivedStats()
// ─────────────────────────────────────────────────────────────────────────────

export interface DerivedStats {
    proficiencyBonus: number;
    totalLevel: number;
    initiativeBonus: number;
    armorClass: number;
    passivePerception: number;
    passiveInsight: number;
    passiveInvestigation: number;
    spellSaveDC: number;
    spellAttackBonus: number;
    /** Skill totals (18 skills). */
    skillBonuses: Record<string, number>;
    /** Saving throw totals. */
    savingThrowBonuses: Partial<Record<keyof StatBlock, number>>;
    /** multiclass-aware spell slots (indices 1–9). */
    spellSlots: { current: number; max: number }[];
    /** True if character is eligible for ASI/feat at their current primary class level. */
    isASIEligible: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ABILITY SCORE GENERATION METHODS
// ─────────────────────────────────────────────────────────────────────────────

export type AbilityScoreMethod = 'standard_array' | 'point_buy' | 'roll';

export interface AbilityScoreGenerationState {
    method: AbilityScoreMethod;
    /** For standard_array and point_buy: remaining pool to assign. */
    pool: number;
    /** For point_buy: points remaining out of 27. */
    pointsRemaining?: number;
    /** Current stat values before racial bonuses. */
    baseScores: Record<keyof StatBlock, number>;
    /** Rolled results (for roll method). */
    rolledSets?: number[][];
}

// ─────────────────────────────────────────────────────────────────────────────
// CHARACTER CREATOR WIZARD STATE
// Drives the step-by-step character creation flow.
// ─────────────────────────────────────────────────────────────────────────────

export type CreatorStep =
    | 'race'
    | 'class'
    | 'background'
    | 'ability_scores'
    | 'skills'
    | 'equipment'
    | 'spells'
    | 'review';

export interface WizardState {
    step: CreatorStep;
    completedSteps: CreatorStep[];
    /** Draft character built up step by step. */
    draft: Partial<import('./character').Character>;
    abilityScoreState?: AbilityScoreGenerationState;
    selectedRaceId?: string;
    selectedSubraceId?: string;
    selectedClassId?: string;
    selectedBackgroundId?: string;
    /** Skill proficiency choices remaining. */
    skillChoicesRemaining: number;
    selectedSkills: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL-UP WIZARD PAYLOAD
// Passed to the store's levelUpCharacter() action.
// ─────────────────────────────────────────────────────────────────────────────

export interface LevelUpChoices {
    /** HP gained this level (roll result or fixed average). */
    hpGain: number;
    /** Ability score increases (if ASI level). */
    abilityScoreIncreases?: Partial<Record<keyof StatBlock, number>>;
    /** Feat taken instead of ASI (if ASI level). */
    feat?: import('./character').Feature;
    /** Spells added to known/prepared list. */
    newSpells?: import('./character').Spell[];
    /** New class (if multiclassing instead of single class level up). */
    newClassEntry?: ClassEntry;
}
