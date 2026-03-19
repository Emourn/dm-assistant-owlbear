import { Action } from './actions';
export type { Action } from './actions';
import type { ClassEntry, Effect } from './rules';
export type { ClassEntry, Effect } from './rules';
import type { ImportProvenance } from './source';

export type SystemType = 'dnd5e' | 'v20';

export interface StatBlock {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
}

export interface Skill {
    name: string;
    stat: keyof StatBlock;
    proficient: boolean;
    expertise: boolean;
    bonus: number; // For manual overrides or magic item bonuses
    source?: string; // e.g., "Rogue", "Acolyte", "Elf"
    sourceId?: string; // ID of the feature or background that granted it
}

export interface Resource {
    id: string;
    name: string;
    current: number;
    max: number;
    resetOn: 'short' | 'long' | 'never';
}

export interface Item {
    id: string;
    name: string;
    quantity: number;
    weight: number;
    isEquipped: boolean;
    isAttuned: boolean;
    description: string;
    type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'gear' | 'magic' | 'other';
    damage?: string; // e.g., "1d8+STR"
    acBonus?: number;
    effects?: Effect[];
    isHomebrew?: boolean;
    homebrewSource?: string;
    is2024?: boolean;
}

export interface Spell {
    id: string;
    name: string;
    level: number; // 0 for cantrip
    school: string;
    castingTime: string;
    range: string;
    components: { v: boolean; s: boolean; m: boolean; mDesc?: string };
    duration: string;
    concentration: boolean;
    ritual: boolean;
    description: string;
    higherLevels?: string;
    prepared: boolean;
    isHomebrew?: boolean;
    homebrewSource?: string;
    source?: string;
    is2024?: boolean;
}

export interface Condition {
    id: string;
    name: string;
    type?: 'buff' | 'condition';
    icon?: string;
    duration?: number; // Rounds remaining
    description: string;
}

export interface Feature {
    id: string;
    name: string;
    source: string; // e.g., "Fighter Level 1", "Feat"
    description: string;
    hasUses: boolean;
    usesCurrent?: number;
    usesMax?: number;
    resetOn?: 'short' | 'long' | 'never';
    isFeat?: boolean;
    requiresChoice?: boolean;
    choiceType?: string;
    prerequisite?: any;
    count?: number;
    abilityScoreBonuses?: Partial<StatBlock>;
    grantsProficiency?: string[];
    grantsLanguage?: string[];
    grantsSkillProficiency?: string[];
    grantsResistance?: string[];
    effects?: Effect[];
    source5eTools?: string;
    isHomebrew?: boolean;
    homebrewSource?: string;
    is2024?: boolean;
}

export interface Currencies {
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;
}

export interface Character {
    id: string;
    name: string;
    system: SystemType;
    playerName: string;
    portraitUrl?: string;

    // D&D 5e Specific Core
    race: string;
    className: string;
    subclass: string;
    level: number;
    background: string;
    alignment: string;
    experience: number;
    /**
     * Multiclass support: all class entries including primary class.
     * Optional for backward compatibility — single-class characters
     * only use `className` / `subclass` / `level`.
     */
    classes?: ClassEntry[];

    // Stats & Skills
    abilityScores: StatBlock;
    savingThrows: (keyof StatBlock)[];
    skills: Skill[];
    senses: string; // e.g., "Darkvision 60ft"
    darkvision?: number;
    passivePerception: number;
    passiveInvestigation: number;
    passiveInsight: number;
    languages: string;
    proficiencies: string; // Tools, weapons, armor

    // Combat
    ac: number;
    maxHp: number;
    currentHp: number;
    tempHp: number;
    hitDice: string; // e.g., "5d10"
    speed: string; // string to allow "30ft, Fly 60ft"
    initiativeMod: number; // Usually matches DEX mod, but can be altered
    proficiencyBonus: number;

    // Magic
    spellcastingAbility: keyof StatBlock | 'none';
    spellSaveDc: number;
    spellAttackMod: number;
    spellSlots: { current: number; max: number }[]; // Index 0 isCantrips (usually ignored), 1=1st level
    spells: Spell[];

    // Equipment & Economy
    inventory: Item[];
    currencies: Currencies;

    // Abilities
    resources: Resource[];
    actions: Action[];
    features: Feature[];
    feats: Feature[];
    racialTraits: Feature[];
    masteredWeapons: string[]; // List of weapon names (e.g. "Longsword", "Shortbow")

    // State
    conditions: Condition[];
    deathSaves: { successes: number; failures: number };
    exhaustion: number; // 0-6
    resistances: string[];
    immunities: string[];
    vulnerabilities: string[];
    conditionImmunities: string[];
    damageNotes: string;

    // Flavors
    personalityTraits: string;
    ideals: string;
    bonds: string;
    flaws: string;
    backstory: string;
    notes: string;

    // Choice Tracking (Added Phase 8)
    pendingChoices?: Array<{
        id: string;
        type: 'skill' | 'language' | 'feat' | 'subclass' | 'equipment';
        count: number;
        options: string[]; // List of names or categories
        source: string; // e.g. "Rogue level 1"
        isResolved: boolean;
        selected?: string[];
    }>;

    // Custom DM Overrides (Added Phase 3.5, expanded Phase 5)
    customOverrides?: {
        maxAction?: number;
        maxBonusAction?: number;
        maxReaction?: number;
        extraMovement?: number;
        ignoreEconomy?: boolean; // The DM "Make it happen" toggle
        modifiers?: Record<string, number>; // DM Modifiers (e.g. { ac: 2, speed: -10 })
        overrides: Array<{
            id: string;
            field: string;       // e.g. "ac", "maxHp", "speed", "proficiencyBonus"
            label: string;       // Display name
            value: string | number;
            isActive: boolean;
            reason: string;      // DM note for why
        }>;
    };

    // Stored import references (Added Phase 3.6)
    importedData?: {
        race?: any;
        class?: any;
        background?: any;
        subclass?: any;
    };
    provenance?: ImportProvenance;
}

const DEFAULT_SKILLS: Skill[] = [
    { name: 'Acrobatics', stat: 'dex', proficient: false, expertise: false, bonus: 0 },
    { name: 'Animal Handling', stat: 'wis', proficient: false, expertise: false, bonus: 0 },
    { name: 'Arcana', stat: 'int', proficient: false, expertise: false, bonus: 0 },
    { name: 'Athletics', stat: 'str', proficient: false, expertise: false, bonus: 0 },
    { name: 'Deception', stat: 'cha', proficient: false, expertise: false, bonus: 0 },
    { name: 'History', stat: 'int', proficient: false, expertise: false, bonus: 0 },
    { name: 'Insight', stat: 'wis', proficient: false, expertise: false, bonus: 0 },
    { name: 'Intimidation', stat: 'cha', proficient: false, expertise: false, bonus: 0 },
    { name: 'Investigation', stat: 'int', proficient: false, expertise: false, bonus: 0 },
    { name: 'Medicine', stat: 'wis', proficient: false, expertise: false, bonus: 0 },
    { name: 'Nature', stat: 'int', proficient: false, expertise: false, bonus: 0 },
    { name: 'Perception', stat: 'wis', proficient: false, expertise: false, bonus: 0 },
    { name: 'Performance', stat: 'cha', proficient: false, expertise: false, bonus: 0 },
    { name: 'Persuasion', stat: 'cha', proficient: false, expertise: false, bonus: 0 },
    { name: 'Religion', stat: 'int', proficient: false, expertise: false, bonus: 0 },
    { name: 'Sleight of Hand', stat: 'dex', proficient: false, expertise: false, bonus: 0 },
    { name: 'Stealth', stat: 'dex', proficient: false, expertise: false, bonus: 0 },
    { name: 'Survival', stat: 'wis', proficient: false, expertise: false, bonus: 0 }
];


export function createEmptyCharacter(): Character {
    return {
        id: crypto.randomUUID(),
        name: '',
        system: 'dnd5e',
        playerName: '',
        race: '',
        className: '',
        subclass: '',
        level: 1,
        background: '',
        alignment: '',
        experience: 0,
        abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        savingThrows: [],
        skills: [...DEFAULT_SKILLS.map(s => ({ ...s }))],
        senses: '',
        passivePerception: 10,
        passiveInvestigation: 10,
        passiveInsight: 10,
        languages: 'Common',
        proficiencies: '',
        ac: 10,
        maxHp: 10,
        currentHp: 10,
        tempHp: 0,
        hitDice: '1d8',
        speed: '30 ft',
        initiativeMod: 0,
        proficiencyBonus: 2,
        spellcastingAbility: 'none',
        spellSaveDc: 10,
        spellAttackMod: 2,
        spellSlots: Array.from({ length: 10 }, () => ({ current: 0, max: 0 })),
        spells: [],
        inventory: [],
        currencies: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
        resources: [],
        actions: [],
        features: [],
        feats: [],
        racialTraits: [],
        masteredWeapons: [],
        conditions: [],
        deathSaves: { successes: 0, failures: 0 },
        exhaustion: 0,
        resistances: [],
        immunities: [],
        vulnerabilities: [],
        conditionImmunities: [],
        damageNotes: '',
        personalityTraits: '',
        ideals: '',
        bonds: '',
        flaws: '',
        backstory: '',
        notes: ''
    };
}
