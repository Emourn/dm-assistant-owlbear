/**
 * PROGRESSION TABLES — D&D 5th Edition
 *
 * All static rules data: spell slot tables, ASI levels, proficiency bonus,
 * multiclass prerequisites, Point Buy costs, Standard Array.
 *
 * Sources: Player's Handbook (PHB), Xanathar's Guide to Everything (XGE),
 * Tasha's Cauldron of Everything (TCE).
 *
 * These are read-only constants. The rules engine imports and indexes them.
 * Nothing here should ever be mutated at runtime.
 */

import type { StatBlock } from '../../types/character';
import type { SpellcasterType } from '../../types/rules';

// ─────────────────────────────────────────────────────────────────────────────
// PROFICIENCY BONUS
// Index = character level (0 unused, 1–20 valid).
// PHB p.15: +2 at L1, increases every 4 levels.
// ─────────────────────────────────────────────────────────────────────────────

export const PROFICIENCY_BONUS_BY_LEVEL: number[] = [
    //  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20
    0, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6
];

/** Returns the proficiency bonus for a given level (1–20). */
export function getProficiencyBonusForLevel(level: number): number {
    const clamped = Math.max(1, Math.min(20, level));
    return PROFICIENCY_BONUS_BY_LEVEL[clamped];
}

// ─────────────────────────────────────────────────────────────────────────────
// SPELL SLOT TABLES
//
// Each row is a class level (index 0 unused, 1–20 valid).
// Each column is a spell slot level (index 0 = 1st, 1 = 2nd … 8 = 9th).
// Values are the NUMBER OF SLOTS at that spell level.
//
// PHB Tables: 5-4 (Bard), 5-8 (Cleric), 5-11 (Druid),
//             5-27 (Sorcerer), 5-43 (Wizard), 5-50 (Paladin),
//             5-30 (Ranger), 5-38 (Warlock).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full casters: Bard, Cleric, Druid, Sorcerer, Wizard.
 * [L1, L2, L3, L4, L5, L6, L7, L8, L9]
 */
export const FULL_CASTER_SLOTS: number[][] = [
    //  L1  L2  L3  L4  L5  L6  L7  L8  L9
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // Level 0 (unused)
    [2, 0, 0, 0, 0, 0, 0, 0, 0], // Level 1
    [3, 0, 0, 0, 0, 0, 0, 0, 0], // Level 2
    [4, 2, 0, 0, 0, 0, 0, 0, 0], // Level 3
    [4, 3, 0, 0, 0, 0, 0, 0, 0], // Level 4
    [4, 3, 2, 0, 0, 0, 0, 0, 0], // Level 5
    [4, 3, 3, 0, 0, 0, 0, 0, 0], // Level 6
    [4, 3, 3, 1, 0, 0, 0, 0, 0], // Level 7
    [4, 3, 3, 2, 0, 0, 0, 0, 0], // Level 8
    [4, 3, 3, 3, 1, 0, 0, 0, 0], // Level 9
    [4, 3, 3, 3, 2, 0, 0, 0, 0], // Level 10
    [4, 3, 3, 3, 2, 1, 0, 0, 0], // Level 11
    [4, 3, 3, 3, 2, 1, 0, 0, 0], // Level 12
    [4, 3, 3, 3, 2, 1, 1, 0, 0], // Level 13
    [4, 3, 3, 3, 2, 1, 1, 0, 0], // Level 14
    [4, 3, 3, 3, 2, 1, 1, 1, 0], // Level 15
    [4, 3, 3, 3, 2, 1, 1, 1, 0], // Level 16
    [4, 3, 3, 3, 2, 1, 1, 1, 1], // Level 17
    [4, 3, 3, 3, 3, 1, 1, 1, 1], // Level 18
    [4, 3, 3, 3, 3, 2, 1, 1, 1], // Level 19
    [4, 3, 3, 3, 3, 2, 2, 1, 1], // Level 20
];

/**
 * Half casters (floor): Paladin, Ranger.
 * No slots at level 1. Slot progression uses floor(level/2) as effective level.
 */
export const HALF_CASTER_SLOTS: number[][] = [
    //  L1  L2  L3  L4  L5
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // Level 0 (unused)
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // Level 1 — no slots
    [2, 0, 0, 0, 0, 0, 0, 0, 0], // Level 2
    [3, 0, 0, 0, 0, 0, 0, 0, 0], // Level 3
    [3, 0, 0, 0, 0, 0, 0, 0, 0], // Level 4
    [4, 2, 0, 0, 0, 0, 0, 0, 0], // Level 5
    [4, 2, 0, 0, 0, 0, 0, 0, 0], // Level 6
    [4, 3, 0, 0, 0, 0, 0, 0, 0], // Level 7
    [4, 3, 0, 0, 0, 0, 0, 0, 0], // Level 8
    [4, 3, 2, 0, 0, 0, 0, 0, 0], // Level 9
    [4, 3, 2, 0, 0, 0, 0, 0, 0], // Level 10
    [4, 3, 3, 0, 0, 0, 0, 0, 0], // Level 11
    [4, 3, 3, 0, 0, 0, 0, 0, 0], // Level 12
    [4, 3, 3, 1, 0, 0, 0, 0, 0], // Level 13
    [4, 3, 3, 1, 0, 0, 0, 0, 0], // Level 14
    [4, 3, 3, 2, 0, 0, 0, 0, 0], // Level 15
    [4, 3, 3, 2, 0, 0, 0, 0, 0], // Level 16
    [4, 3, 3, 3, 1, 0, 0, 0, 0], // Level 17
    [4, 3, 3, 3, 1, 0, 0, 0, 0], // Level 18
    [4, 3, 3, 3, 2, 0, 0, 0, 0], // Level 19
    [4, 3, 3, 3, 2, 0, 0, 0, 0], // Level 20
];

/**
 * Artificer (ceiling): Rounds up instead of down.
 * Artificer gets slots at level 1 (unlike Paladin/Ranger).
 * TCE p.12.
 */
export const ARTIFICER_SLOTS: number[][] = [
    //  L1  L2  L3  L4  L5
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // Level 0 (unused)
    [2, 0, 0, 0, 0, 0, 0, 0, 0], // Level 1
    [2, 0, 0, 0, 0, 0, 0, 0, 0], // Level 2
    [3, 0, 0, 0, 0, 0, 0, 0, 0], // Level 3
    [3, 0, 0, 0, 0, 0, 0, 0, 0], // Level 4
    [4, 2, 0, 0, 0, 0, 0, 0, 0], // Level 5
    [4, 2, 0, 0, 0, 0, 0, 0, 0], // Level 6
    [4, 3, 0, 0, 0, 0, 0, 0, 0], // Level 7
    [4, 3, 0, 0, 0, 0, 0, 0, 0], // Level 8
    [4, 3, 2, 0, 0, 0, 0, 0, 0], // Level 9
    [4, 3, 2, 0, 0, 0, 0, 0, 0], // Level 10
    [4, 3, 3, 0, 0, 0, 0, 0, 0], // Level 11
    [4, 3, 3, 0, 0, 0, 0, 0, 0], // Level 12
    [4, 3, 3, 1, 0, 0, 0, 0, 0], // Level 13
    [4, 3, 3, 1, 0, 0, 0, 0, 0], // Level 14
    [4, 3, 3, 2, 0, 0, 0, 0, 0], // Level 15
    [4, 3, 3, 2, 0, 0, 0, 0, 0], // Level 16
    [4, 3, 3, 3, 1, 0, 0, 0, 0], // Level 17
    [4, 3, 3, 3, 1, 0, 0, 0, 0], // Level 18
    [4, 3, 3, 3, 2, 0, 0, 0, 0], // Level 19
    [4, 3, 3, 3, 2, 0, 0, 0, 0], // Level 20
];

/**
 * Third casters: Eldritch Knight (Fighter), Arcane Trickster (Rogue).
 * No spell slots until level 3. Uses floor(level/3) as effective caster level.
 */
export const THIRD_CASTER_SLOTS: number[][] = [
    //  L1  L2  L3  L4
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // Level 0 (unused)
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // Level 1
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // Level 2
    [2, 0, 0, 0, 0, 0, 0, 0, 0], // Level 3
    [3, 0, 0, 0, 0, 0, 0, 0, 0], // Level 4
    [3, 0, 0, 0, 0, 0, 0, 0, 0], // Level 5
    [3, 0, 0, 0, 0, 0, 0, 0, 0], // Level 6
    [4, 2, 0, 0, 0, 0, 0, 0, 0], // Level 7
    [4, 2, 0, 0, 0, 0, 0, 0, 0], // Level 8
    [4, 2, 0, 0, 0, 0, 0, 0, 0], // Level 9
    [4, 3, 0, 0, 0, 0, 0, 0, 0], // Level 10
    [4, 3, 0, 0, 0, 0, 0, 0, 0], // Level 11
    [4, 3, 0, 0, 0, 0, 0, 0, 0], // Level 12
    [4, 3, 2, 0, 0, 0, 0, 0, 0], // Level 13
    [4, 3, 2, 0, 0, 0, 0, 0, 0], // Level 14
    [4, 3, 2, 0, 0, 0, 0, 0, 0], // Level 15
    [4, 3, 3, 0, 0, 0, 0, 0, 0], // Level 16
    [4, 3, 3, 0, 0, 0, 0, 0, 0], // Level 17
    [4, 3, 3, 0, 0, 0, 0, 0, 0], // Level 18
    [4, 3, 3, 1, 0, 0, 0, 0, 0], // Level 19
    [4, 3, 3, 1, 0, 0, 0, 0, 0], // Level 20
];

/**
 * Warlock — Pact Magic progression.
 * Slots all recharge on SHORT rest.
 * Each entry: [slotCount, slotLevel (1-based)].
 * PHB Table 5-38.
 */
export const WARLOCK_PACT_MAGIC: { count: number; slotLevel: number }[] = [
    //                  Level:
    { count: 0, slotLevel: 0 }, // Level 0 (unused)
    { count: 1, slotLevel: 1 }, // Level 1
    { count: 2, slotLevel: 1 }, // Level 2
    { count: 2, slotLevel: 2 }, // Level 3
    { count: 2, slotLevel: 2 }, // Level 4
    { count: 2, slotLevel: 3 }, // Level 5
    { count: 2, slotLevel: 3 }, // Level 6
    { count: 2, slotLevel: 4 }, // Level 7
    { count: 2, slotLevel: 4 }, // Level 8
    { count: 2, slotLevel: 5 }, // Level 9
    { count: 2, slotLevel: 5 }, // Level 10
    { count: 3, slotLevel: 5 }, // Level 11
    { count: 3, slotLevel: 5 }, // Level 12
    { count: 3, slotLevel: 5 }, // Level 13
    { count: 3, slotLevel: 5 }, // Level 14
    { count: 3, slotLevel: 5 }, // Level 15
    { count: 3, slotLevel: 5 }, // Level 16
    { count: 4, slotLevel: 5 }, // Level 17
    { count: 4, slotLevel: 5 }, // Level 18
    { count: 4, slotLevel: 5 }, // Level 19
    { count: 4, slotLevel: 5 }, // Level 20
];

/**
 * Multiclass Spell Slot Table (PHB p.165).
 * Key = total effective caster level (1–20).
 * Values = [L1, L2, L3, L4, L5, L6, L7, L8, L9] slot maximums.
 *
 * Effective caster level:
 *   Full caster (Bard, Cleric, Druid, Sorcerer, Wizard):  class_level × 1
 *   Half caster (Paladin, Ranger):                        floor(class_level / 2)
 *   Artificer:                                            ceil(class_level / 2)
 *   Third caster (EK Fighter, AT Rogue):                  floor(class_level / 3)
 *   Warlock:                                              NOT included (separate Pact Magic slots)
 *
 * Sum effective levels → look up this table.
 */
export const MULTICLASS_SPELL_SLOT_TABLE: number[][] = [
    //  L1  L2  L3  L4  L5  L6  L7  L8  L9
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // Effective level 0 (unused)
    [2, 0, 0, 0, 0, 0, 0, 0, 0], // Effective level 1
    [3, 0, 0, 0, 0, 0, 0, 0, 0], // Effective level 2
    [4, 2, 0, 0, 0, 0, 0, 0, 0], // Effective level 3
    [4, 3, 0, 0, 0, 0, 0, 0, 0], // Effective level 4
    [4, 3, 2, 0, 0, 0, 0, 0, 0], // Effective level 5
    [4, 3, 3, 0, 0, 0, 0, 0, 0], // Effective level 6
    [4, 3, 3, 1, 0, 0, 0, 0, 0], // Effective level 7
    [4, 3, 3, 2, 0, 0, 0, 0, 0], // Effective level 8
    [4, 3, 3, 3, 1, 0, 0, 0, 0], // Effective level 9
    [4, 3, 3, 3, 2, 0, 0, 0, 0], // Effective level 10
    [4, 3, 3, 3, 2, 1, 0, 0, 0], // Effective level 11
    [4, 3, 3, 3, 2, 1, 0, 0, 0], // Effective level 12
    [4, 3, 3, 3, 2, 1, 1, 0, 0], // Effective level 13
    [4, 3, 3, 3, 2, 1, 1, 0, 0], // Effective level 14
    [4, 3, 3, 3, 2, 1, 1, 1, 0], // Effective level 15
    [4, 3, 3, 3, 2, 1, 1, 1, 0], // Effective level 16
    [4, 3, 3, 3, 2, 1, 1, 1, 1], // Effective level 17
    [4, 3, 3, 3, 3, 1, 1, 1, 1], // Effective level 18
    [4, 3, 3, 3, 3, 2, 1, 1, 1], // Effective level 19
    [4, 3, 3, 3, 3, 2, 2, 1, 1], // Effective level 20
];

// ─────────────────────────────────────────────────────────────────────────────
// SPELLCASTER TYPE BY CLASS
// Maps class name (lowercase) to spellcaster progression type.
// Used to compute effective caster level for multiclassing.
// ─────────────────────────────────────────────────────────────────────────────

export const SPELLCASTER_TYPE_BY_CLASS: Record<string, SpellcasterType> = {
    'bard': 'full',
    'cleric': 'full',
    'druid': 'full',
    'sorcerer': 'full',
    'wizard': 'full',
    'paladin': 'half',
    'ranger': 'half',
    'artificer': 'artificer',
    'fighter': 'third',  // Only Eldritch Knight subclass
    'rogue': 'third',  // Only Arcane Trickster subclass
    'warlock': 'pact',
    'barbarian': 'none',
    'monk': 'none',
};

// Subclasses that turn non-casters into third-casters
export const THIRD_CASTER_SUBCLASSES = new Set([
    'eldritch knight',
    'arcane trickster',
]);

// ─────────────────────────────────────────────────────────────────────────────
// ASI LEVELS BY CLASS
// The class levels that grant an Ability Score Improvement (or Feat).
// PHB class tables.
// ─────────────────────────────────────────────────────────────────────────────

export const ASI_LEVELS_BY_CLASS: Record<string, Set<number>> = {
    'fighter': new Set([4, 6, 8, 12, 14, 16, 19, 20]),
    'rogue': new Set([4, 8, 10, 12, 16, 19]),
    // All other classes:
    'barbarian': new Set([4, 8, 12, 16, 19]),
    'bard': new Set([4, 8, 12, 16, 19]),
    'cleric': new Set([4, 8, 12, 16, 19]),
    'druid': new Set([4, 8, 12, 16, 19]),
    'monk': new Set([4, 8, 12, 16, 19]),
    'paladin': new Set([4, 8, 12, 16, 19]),
    'ranger': new Set([4, 8, 12, 16, 19]),
    'sorcerer': new Set([4, 8, 12, 16, 19]),
    'warlock': new Set([4, 8, 12, 16, 19]),
    'wizard': new Set([4, 8, 12, 16, 19]),
    'artificer': new Set([4, 8, 12, 16, 19]),
};

// Default for unknown classes
const DEFAULT_ASI_LEVELS = new Set([4, 8, 12, 16, 19]);

/** Returns true if the given class grants an ASI at the given level. */
export function isASILevel(className: string, level: number): boolean {
    const key = className.toLowerCase().trim();
    const levels = ASI_LEVELS_BY_CLASS[key] ?? DEFAULT_ASI_LEVELS;
    return levels.has(level);
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTICLASS PREREQUISITES
// PHB p.163. A character must meet the minimum stat(s) for BOTH their
// current class AND the new class to multiclass.
// ─────────────────────────────────────────────────────────────────────────────

export interface MulticlassPrereq {
    /** Requirements for this class. Uses AND logic within each entry, OR across entries. */
    requirements: { stat: keyof StatBlock; minimum: number }[][];
}

export const MULTICLASS_PREREQUISITES: Record<string, MulticlassPrereq> = {
    'barbarian': { requirements: [[{ stat: 'str', minimum: 13 }]] },
    'bard': { requirements: [[{ stat: 'cha', minimum: 13 }]] },
    'cleric': { requirements: [[{ stat: 'wis', minimum: 13 }]] },
    'druid': { requirements: [[{ stat: 'wis', minimum: 13 }]] },
    'fighter': {
        requirements: [
            [{ stat: 'str', minimum: 13 }],
            [{ stat: 'dex', minimum: 13 }]
        ]
    }, // STR 13 OR DEX 13
    'monk': { requirements: [[{ stat: 'dex', minimum: 13 }, { stat: 'wis', minimum: 13 }]] }, // DEX 13 AND WIS 13
    'paladin': { requirements: [[{ stat: 'str', minimum: 13 }, { stat: 'cha', minimum: 13 }]] }, // STR 13 AND CHA 13
    'ranger': { requirements: [[{ stat: 'dex', minimum: 13 }, { stat: 'wis', minimum: 13 }]] }, // DEX 13 AND WIS 13
    'rogue': { requirements: [[{ stat: 'dex', minimum: 13 }]] },
    'sorcerer': { requirements: [[{ stat: 'cha', minimum: 13 }]] },
    'warlock': { requirements: [[{ stat: 'cha', minimum: 13 }]] },
    'wizard': { requirements: [[{ stat: 'int', minimum: 13 }]] },
    'artificer': { requirements: [[{ stat: 'int', minimum: 13 }]] },
};

// ─────────────────────────────────────────────────────────────────────────────
// POINT BUY
// PHB p.13. All ability scores start at 8. Budget = 27 points.
// Scores 9–13 cost 1 pt each. Scores 14 (2 pts extra) and 15 (2 pts extra).
// ─────────────────────────────────────────────────────────────────────────────

/** Point buy cost to raise the score FROM 8 TO the given value. */
export const POINT_BUY_COST_FROM_8: Record<number, number> = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9,
};

export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;

/**
 * Returns the additional point cost to increase a stat from `current` to `current + 1`.
 * Returns null if the increase is invalid (above 15).
 */
export function getPointBuyIncreaseCost(current: number): number | null {
    if (current >= POINT_BUY_MAX) return null;
    const costNow = POINT_BUY_COST_FROM_8[current + 1] ?? null;
    const costCurrent = POINT_BUY_COST_FROM_8[current] ?? 0;
    if (costNow === null) return null;
    return costNow - costCurrent;
}

/**
 * Returns the point budget used given a stat value (compared to base 8).
 */
export function getPointBuyCost(score: number): number {
    if (score < POINT_BUY_MIN) return 0;
    if (score > POINT_BUY_MAX) return POINT_BUY_COST_FROM_8[POINT_BUY_MAX];
    return POINT_BUY_COST_FROM_8[score] ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD ARRAY
// PHB p.13: assign [15, 14, 13, 12, 10, 8] to the six ability scores.
// ─────────────────────────────────────────────────────────────────────────────

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

// ─────────────────────────────────────────────────────────────────────────────
// HIT DICE BY CLASS
// ─────────────────────────────────────────────────────────────────────────────

export const HIT_DICE_BY_CLASS: Record<string, number> = {
    'barbarian': 12,
    'fighter': 10,
    'paladin': 10,
    'ranger': 10,
    'bard': 8,
    'cleric': 8,
    'druid': 8,
    'monk': 8,
    'rogue': 8,
    'warlock': 8,
    'artificer': 8,
    'sorcerer': 6,
    'wizard': 6,
};

/** Returns the hit die faces for a class (defaults to d8 if unknown). */
export function getHitDie(className: string): number {
    return HIT_DICE_BY_CLASS[className.toLowerCase().trim()] ?? 8;
}

// ─────────────────────────────────────────────────────────────────────────────
// SPELLCASTING ABILITY BY CLASS
// ─────────────────────────────────────────────────────────────────────────────

type StatKey = keyof StatBlock;

export const SPELLCASTING_ABILITY_BY_CLASS: Record<string, StatKey> = {
    'bard': 'cha',
    'cleric': 'wis',
    'druid': 'wis',
    'paladin': 'cha',
    'ranger': 'wis',
    'sorcerer': 'cha',
    'warlock': 'cha',
    'wizard': 'int',
    'artificer': 'int',
    // Fighter (Eldritch Knight) and Rogue (Arcane Trickster) use INT
    'fighter': 'int',
    'rogue': 'int',
};

// ─────────────────────────────────────────────────────────────────────────────
// SKILL → ABILITY MAPPING
// ─────────────────────────────────────────────────────────────────────────────

export const SKILL_ABILITY_MAP: Record<string, StatKey> = {
    'Acrobatics': 'dex',
    'Animal Handling': 'wis',
    'Arcana': 'int',
    'Athletics': 'str',
    'Deception': 'cha',
    'History': 'int',
    'Insight': 'wis',
    'Intimidation': 'cha',
    'Investigation': 'int',
    'Medicine': 'wis',
    'Nature': 'int',
    'Perception': 'wis',
    'Performance': 'cha',
    'Persuasion': 'cha',
    'Religion': 'int',
    'Sleight of Hand': 'dex',
    'Stealth': 'dex',
    'Survival': 'wis',
};

export const ALL_SKILLS = Object.keys(SKILL_ABILITY_MAP);

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIENCE THRESHOLDS (re-exported for convenience)
// ─────────────────────────────────────────────────────────────────────────────

export const XP_THRESHOLDS_BY_LEVEL: number[] = [
    0,       // Level 1
    300,     // Level 2
    900,     // Level 3
    2700,    // Level 4
    6500,    // Level 5
    14000,   // Level 6
    23000,   // Level 7
    34000,   // Level 8
    48000,   // Level 9
    64000,   // Level 10
    85000,   // Level 11
    100000,  // Level 12
    120000,  // Level 13
    140000,  // Level 14
    165000,  // Level 15
    195000,  // Level 16
    225000,  // Level 17
    265000,  // Level 18
    305000,  // Level 19
    355000,  // Level 20
];
