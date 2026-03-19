import { Condition } from './character';
import { BattleMapState, GridPosition } from './battleMap';

export type CombatantType = 'player' | 'monster' | 'npc';
export type ActionEconomy = 'action' | 'bonus' | 'reaction' | 'legendary' | 'free' | 'trait';
export type CombatActionType = 'attack' | 'save-spell' | 'heal' | 'self-buff' | 'utility' | 'contested' | 'death-save' | 'saving-throw';

export interface CombatAction {
    id: string;
    name: string;
    economy: ActionEconomy;
    category: string;         // Tab grouping key
    description: string;      // Full text, tooltip content
    diceNotation?: string;    // e.g. "1d20+5" for attack rolls
    damageNotation?: string;  // e.g. "2d6+3"
    damageType?: string;
    toHit?: number;
    saveDc?: number;
    saveAbility?: string;
    range?: string;
    reach?: number; // New: Melee reach in feet (usually 5 or 10)
    spellLevel?: number;
    usesRemaining?: number;
    usesMax?: number;
    sourceType: 'weapon' | 'spell' | 'feature' | 'item' | 'monster' | 'generic' | 'legendary' | 'trait' | 'reaction';
    icon?: string;
    isCantrip?: boolean;
    attacksPerAction?: number; // New: For Multiattack / Extra Attack
    isHasteAction?: boolean; // New: For haste restriction check
    requiresConcentration?: boolean;
    source?: string;
    weaponBaseName?: string; // New: For 2024 Weapon Mastery lookup
    actionType?: CombatActionType; // Added for Action Wizard
}

export interface Combatant {
    id: string;
    type: CombatantType;
    name: string;
    portraitUrl?: string; // Base64 data URL (player) or external CDN URL (monster)

    // Core combat stats
    ac: number;
    maxHp: number;
    currentHp: number;
    tempHp: number;
    speed: string;
    cr?: string;

    // For sorting and rolling
    initiativeMod: number;
    initiativeScore: number | null; // Null means hasn't rolled yet
    dexterityScore: number; // For tie-breaking

    // Ability scores for checks/saves
    abilityScores?: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
    proficiencyBonus?: number;
    savingThrowProficiencies?: string[]; // e.g. ['dex', 'wis']
    spellcastingAbility?: string;
    spellSaveDc?: number;
    spellAttackMod?: number;
    passivePerception?: number;
    passiveInvestigation?: number;
    passiveInsight?: number;
    senses?: string;

    // Status
    conditions: Condition[];
    isSurprised?: boolean;
    isDead?: boolean;
    isConcentrating?: boolean;
    concentratingOn?: { spellId: string; name: string };
    isJoinedMidRound?: boolean;
    hasActedThisRound?: boolean;

    // Action Economy Status (Synched with TurnState when active)
    hasAction?: boolean;
    hasBonusAction?: boolean;
    hasReaction?: boolean;
    extraActions?: number; // For Action Surge, etc.
    hasHasteAction?: boolean; // For Haste
    spellSlots?: { current: number; max: number }[];

    deathSaves?: { successes: number; failures: number };
    exhaustion?: number;
    readiedAction?: { description: string; trigger: string };
    isLair?: boolean;

    // Legendary tracking (monsters only)
    legendaryActionsMax?: number;
    legendaryActionsRemaining?: number;

    // Resistances & Immunities
    resistances?: string[];
    immunities?: string[];
    vulnerabilities?: string[];
    conditionImmunities?: string[];
    damageNotes?: string; // e.g. "magic/silver to bypass"

    // Map Integration (NEW)
    gridPosition?: GridPosition;
    tokenSize?: number; // 1=Med, 2=Large, etc.
    elevation?: number; // Flying height in feet

    // References to full data if needed
    sourceId?: string; // e.g. the Character ID from characterStore
    monsterData?: any; // The raw 5e.tools payload
}

export interface TurnState {
    hasAction: boolean;
    hasBonusAction: boolean;
    hasReaction: boolean;
    extraActions: number;
    hasHasteAction: boolean;
    hasCastLeveledSpell: boolean; // New: For Bonus Action spell rule
    hasCastBonusActionSpell: boolean;
    hasUsedHasteAction: boolean; // New: For Haste restriction tracking
    movementRemaining: number;
    movementUsedFt: number; // Tracked feet used this turn
    notes: string;
}

export interface CombatLogEntry {
    id: string;
    round: number;
    timestamp: number;
    combatantId?: string;
    message: string;
    type: 'roll' | 'damage' | 'heal' | 'status' | 'system' | 'action';
    details?: any; // Additional context like dice roll arrays
}

export interface Encounter {
    id: string;
    title: string;
    isActive: boolean;
    isSetupComplete?: boolean;
    mapSetupComplete?: boolean; // New phase flag
    round: number;
    campaignId?: string;
    combatStartTime?: number; // Real-time duration tracking

    combatants: Combatant[];
    activeCombatantId: string | null;

    battleMap?: BattleMapState; // Full map data
    turnState: TurnState;
    log: CombatLogEntry[];
}

export interface SavedEncounter {
    id: string;
    title: string;
    description?: string;
    enemies: Combatant[];
    cr?: string;
    estimatedDifficulty?: string;
    totalXP?: number;
    campaignId?: string;
    createdAt: number;
}
