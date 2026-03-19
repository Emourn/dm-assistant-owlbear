/**
 * RULES ENGINE — D&D 5th Edition
 *
 * Centralized, pure-function computation layer for all D&D 5e character
 * statistics. This engine:
 *
 *   1. Re-exports the original stat calculations (backward compatible).
 *   2. Adds multiclass spell slot calculation (PHB p.165).
 *   3. Adds ASI level detection, multiclass prerequisite validation.
 *   4. Provides computeDerivedStats() — one call to get ALL derived values.
 *
 * RULE: This file contains ONLY pure functions — no React, no Zustand, no
 * side effects. Any component or store can import from here safely.
 */

import type { Character, StatBlock } from '../types/character';
import type { ClassEntry, DerivedStats } from '../types/rules';
import {
    getAbilityModifier,
    getEffectiveAbilityScore,
    getProficiencyBonus,
    getInitiative,
    getArmorClass,
    getSpellSaveDc,
    getSpellAttackMod,
    getSkillTotal,
    getPassiveScore,
} from './statCalculations';
import {
    FULL_CASTER_SLOTS,
    HALF_CASTER_SLOTS,
    ARTIFICER_SLOTS,
    THIRD_CASTER_SLOTS,
    WARLOCK_PACT_MAGIC,
    MULTICLASS_SPELL_SLOT_TABLE,
    SPELLCASTER_TYPE_BY_CLASS,
    THIRD_CASTER_SUBCLASSES,
    MULTICLASS_PREREQUISITES,
    isASILevel,
    getHitDie,
    SPELLCASTING_ABILITY_BY_CLASS,
    SKILL_ABILITY_MAP,
    POINT_BUY_BUDGET,
    POINT_BUY_MIN,
    getPointBuyCost,
} from '../data/dnd5e/progression';

// Re-export everything from statCalculations so callers only need to import
// from this one file.
export {
    getAbilityModifier,
    getEffectiveAbilityScore,
    getProficiencyBonus,
    getInitiative,
    getArmorClass,
    getSpellSaveDc,
    getSpellAttackMod,
    getSkillTotal,
    getPassiveScore,
} from './statCalculations';

// Re-export static data helpers so callers don't need to know about
// the progression module.
export {
    isASILevel,
    getHitDie,
    getProficiencyBonusForLevel,
    getPointBuyCost,
    getPointBuyIncreaseCost,
    STANDARD_ARRAY,
    POINT_BUY_BUDGET,
    POINT_BUY_MIN,
    POINT_BUY_MAX,
    POINT_BUY_COST_FROM_8,
    SKILL_ABILITY_MAP,
    ALL_SKILLS,
    SPELLCASTING_ABILITY_BY_CLASS,
    MULTICLASS_PREREQUISITES,
    WARLOCK_PACT_MAGIC,
} from '../data/dnd5e/progression';

// ─────────────────────────────────────────────────────────────────────────────
// TOTAL CHARACTER LEVEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the total character level, summing all class entries if multiclassed.
 * Falls back to character.level for single-class characters.
 */
export function getTotalCharacterLevel(character: Character): number {
    if (character.classes && character.classes.length > 0) {
        return character.classes.reduce((sum, c) => sum + c.level, 0);
    }
    return character.level ?? 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// SPELLCASTER TYPE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

type SpellcasterTypeLocal = 'full' | 'half' | 'artificer' | 'third' | 'pact' | 'none';

/**
 * Returns the spellcaster progression type for the given class+subclass combo.
 * Fighter and Rogue are 'none' unless their subclass is Eldritch Knight /
 * Arcane Trickster, in which case they become 'third' casters.
 */
export function getSpellcasterType(
    className: string,
    subclass?: string
): SpellcasterTypeLocal {
    const key = className.toLowerCase().trim();
    const type = SPELLCASTER_TYPE_BY_CLASS[key] ?? 'none';

    // Fighter/Rogue upgrade to 'third' only with specific subclasses
    if (type === 'third' && !subclass) {
        // Class is listed as 'third' but no subclass selected = treat as 'none'
        // until user picks EK or AT
        return 'none';
    }
    if ((key === 'fighter' || key === 'rogue') && subclass) {
        const sub = subclass.toLowerCase().trim();
        if (THIRD_CASTER_SUBCLASSES.has(sub)) return 'third';
        return 'none';
    }

    return type as SpellcasterTypeLocal;
}

/**
 * Converts a class's level to its effective caster level for multiclassing.
 * Returns 0 for non-casters (Warlock is handled separately via Pact Magic).
 */
export function getEffectiveCasterLevel(
    className: string,
    classLevel: number,
    subclass?: string
): number {
    const type = getSpellcasterType(className, subclass);
    switch (type) {
        case 'full': return classLevel;
        case 'half': return Math.floor(classLevel / 2);
        case 'artificer': return Math.ceil(classLevel / 2);
        case 'third': return Math.floor(classLevel / 3);
        case 'pact': return 0; // Pact Magic is tracked separately
        case 'none': return 0;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SPELL SLOT CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the spell slot table for a single-class character.
 * Returns an array of 9 numbers: [L1slots, L2slots, …, L9slots].
 */
export function getSingleClassSpellSlots(
    className: string,
    classLevel: number,
    subclass?: string
): number[] {
    const lvl = Math.max(0, Math.min(20, classLevel));
    const key = className.toLowerCase().trim();
    const type = getSpellcasterType(className, subclass);

    switch (type) {
        case 'full': return FULL_CASTER_SLOTS[lvl] ?? Array(9).fill(0);
        case 'half':
            // D&D 2024 Paladins and Rangers gain spellcasting at level 1.
            if (lvl === 1 && (key === 'paladin' || key === 'ranger')) {
                return [2, 0, 0, 0, 0, 0, 0, 0, 0];
            }
            return HALF_CASTER_SLOTS[lvl] ?? Array(9).fill(0);
        case 'artificer': return ARTIFICER_SLOTS[lvl] ?? Array(9).fill(0);
        case 'third': return THIRD_CASTER_SLOTS[lvl] ?? Array(9).fill(0);
        case 'pact':
        case 'none':
        default: return Array(9).fill(0);
    }
}

/**
 * Multiclass Spell Slot Calculation (PHB p.165).
 *
 * Algorithm:
 *   1. Sum effective caster levels across all non-Warlock spellcasting classes.
 *   2. Look up the total in the multiclass slot table.
 *   3. Warlock contributes Pact Magic slots separately (not combined).
 *
 * Returns a 10-element array matching the Character.spellSlots format:
 *   Index 0 = unused (cantrips), Indices 1–9 = spell levels 1–9.
 */
export function getMulticlassSpellSlots(classes: ClassEntry[]): { current: number; max: number }[] {
    // Build the 10-slot array (index 0 unused)
    const result: { current: number; max: number }[] = Array.from(
        { length: 10 },
        () => ({ current: 0, max: 0 })
    );

    // No classes → return empty
    if (!classes || classes.length === 0) return result;

    // Single class → use the direct slot table (no multiclass math needed)
    if (classes.length === 1) {
        const c = classes[0];
        const rawSlots = getSingleClassSpellSlots(c.className, c.level, c.subclass);
        for (let i = 0; i < 9; i++) {
            result[i + 1] = { current: rawSlots[i], max: rawSlots[i] };
        }
        return result;
    }

    // Multi-class: sum effective caster levels (excluding Warlock)
    let totalEffectiveLevel = 0;
    let warlockEntry: ClassEntry | null = null;

    for (const c of classes) {
        const className = c.className.toLowerCase().trim();
        if (className === 'warlock') {
            warlockEntry = c;
            continue; // Pact Magic handled separately
        }
        totalEffectiveLevel += getEffectiveCasterLevel(c.className, c.level, c.subclass);
    }

    // Apply the multiclass slot table for combined slots
    const cappedLevel = Math.max(0, Math.min(20, totalEffectiveLevel));
    if (cappedLevel > 0) {
        const tableSlots = MULTICLASS_SPELL_SLOT_TABLE[cappedLevel] ?? Array(9).fill(0);
        for (let i = 0; i < 9; i++) {
            result[i + 1] = { current: tableSlots[i], max: tableSlots[i] };
        }
    }

    // Add Pact Magic slots as an ADDITIONAL pool at their slot level
    // (PHB: Pact Magic slots are NOT combined into the multiclass table)
    if (warlockEntry) {
        const warlockLvl = Math.max(0, Math.min(20, warlockEntry.level));
        const pact = WARLOCK_PACT_MAGIC[warlockLvl];
        if (pact && pact.count > 0) {
            const pactSlotIndex = pact.slotLevel; // 1-indexed, matches result[] index
            const existing = result[pactSlotIndex];
            // Pact slots stack at their specific level (they are separate slots)
            result[pactSlotIndex] = {
                current: existing.current + pact.count,
                max: existing.max + pact.count,
            };
        }
    }

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTICLASS PREREQUISITE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export interface MulticlassValidation {
    valid: boolean;
    reason?: string;
    unmetRequirements: string[];
}

/**
 * Validates whether a character can legally multiclass into `newClassName`.
 *
 * D&D 5e Rule (PHB p.163):
 *   "To qualify for a new class, you must meet the ability score prerequisites
 *   for both your current class and your new one."
 *
 * The current class prereq check is waived here since the character is already
 * playing that class — the DM has already confirmed it. We only enforce the
 * NEW class prerequisites.
 */
export function validateMulticlassPrereqs(
    abilityScores: Character['abilityScores'],
    newClassName: string,
    existingClasses: ClassEntry[]
): MulticlassValidation {
    const key = newClassName.toLowerCase().trim();

    // Can't multiclass into a class you already have
    const alreadyHas = existingClasses.some(
        c => c.className.toLowerCase().trim() === key
    );
    if (alreadyHas) {
        return {
            valid: false,
            reason: `Character already has ${newClassName} levels. To gain more, level up that class instead.`,
            unmetRequirements: [],
        };
    }

    const prereqs = MULTICLASS_PREREQUISITES[key];
    if (!prereqs) {
        // No prerequisites defined — allow it (homebrew or unknown class)
        return { valid: true, unmetRequirements: [] };
    }

    /**
     * Requirements are a 2D array:
     *   Outer array = OR (any one group can satisfy the requirement)
     *   Inner array = AND (ALL conditions in a group must be met)
     */
    const unmet: string[] = [];

    const anySatisfied = prereqs.requirements.some(group => {
        return group.every(req => {
            const score = abilityScores[req.stat] ?? 10;
            return score >= req.minimum;
        });
    });

    if (!anySatisfied) {
        // Collect human-readable requirements for error display
        for (const group of prereqs.requirements) {
            const desc = group
                .map(r => `${r.stat.toUpperCase()} ${r.minimum}`)
                .join(' and ');
            unmet.push(desc);
        }
        return {
            valid: false,
            reason: `Minimum ability score requirements not met for ${newClassName}.`,
            unmetRequirements: unmet,
        };
    }

    return { valid: true, unmetRequirements: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// ASI ELIGIBILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the character gains an ASI/Feat at their current level
 * in their PRIMARY class (character.className, character.level).
 *
 * For multiclassed characters the primary class is the one with the most levels
 * (or the first class if tied).
 */
export function isCharacterASIEligible(character: Character): boolean {
    if (character.classes && character.classes.length > 0) {
        // Find the primary class (highest level)
        const primary = [...character.classes].sort((a, b) => b.level - a.level)[0];
        return isASILevel(primary.className, primary.level);
    }
    return isASILevel(character.className, character.level);
}

import { sumBonus } from './mechanicsEngine';

/**
 * Returns saving throw bonus for a given ability score stat.
 * Proficiency is automatically added if the character has proficiency in
 * that saving throw.
 */
export function getSavingThrowBonus(character: Character, stat: keyof StatBlock): number {
    const mod = getAbilityModifier(getEffectiveAbilityScore(character, stat));
    const prof = getProficiencyBonus(character);
    const hasProficiency = (character.savingThrows ?? []).includes(stat);

    // Add magical bonuses (e.g. Cloak of Protection)
    const magicalBonus = sumBonus(character, 'add_save_bonus', stat) + sumBonus(character, 'add_save_bonus', 'all');

    return mod + (hasProficiency ? prof : 0) + magicalBonus;
}

/**
 * Returns all 6 saving throw bonuses.
 */
export function getAllSavingThrows(character: Character): Record<keyof StatBlock, number> {
    const stats: (keyof StatBlock)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    return Object.fromEntries(
        stats.map(stat => [stat, getSavingThrowBonus(character, stat)])
    ) as Record<keyof StatBlock, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HP CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates maximum HP for a character, using the fixed average method
 * (die average + CON mod per level, max at 1st level).
 *
 * Formula: hitDie + CON_mod (level 1) + (floor(hitDie/2) + 1 + CON_mod) × (level - 1)
 *
 * For multiclassed characters, each class level uses that class's hit die.
 */
export function calculateMaxHP(
    character: Pick<Character, 'abilityScores' | 'level' | 'hitDice' | 'classes' | 'inventory' | 'features' | 'feats' | 'racialTraits'>
): number {
    const conMod = getAbilityModifier(character.abilityScores?.con ?? 10);
    let baseHp = 0;

    // Multiclass HP: sum contributions per class
    if (character.classes && character.classes.length > 0) {
        let isFirstLevel = true;

        for (const classEntry of character.classes) {
            const die = classEntry.hitDice;
            for (let lvl = 1; lvl <= classEntry.level; lvl++) {
                if (isFirstLevel) {
                    baseHp += die + conMod;
                    isFirstLevel = false;
                } else {
                    baseHp += Math.max(1, Math.floor(die / 2) + 1 + conMod);
                }
            }
        }
    } else {
        // Single-class HP
        const dieMatch = character.hitDice?.match(/d(\d+)/i);
        const die = dieMatch ? parseInt(dieMatch[1]) : 8;
        const level = character.level ?? 1;

        const firstLevel = die + conMod;
        const perLevel = Math.max(1, Math.floor(die / 2) + 1 + conMod);
        baseHp = firstLevel + (level - 1) * perLevel;
    }

    // Add bonuses from features/feats/items (e.g. Tough feat)
    const bonusHp = sumBonus(character as Character, 'modify_hp_max');

    return Math.max(1, baseHp + bonusHp);
}

// ─────────────────────────────────────────────────────────────────────────────
// DICE ROLLING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rolls 4d6, drops the lowest die, returns the sum.
 * Used for the "Roll" ability score generation method.
 */
export function roll4d6DropLowest(): number {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    const sorted = [...rolls].sort((a, b) => a - b);
    return sorted[1] + sorted[2] + sorted[3]; // drop index 0 (lowest)
}

/**
 * Generates a complete set of 6 rolled ability scores (4d6 drop lowest each).
 */
export function generateRolledScores(): number[] {
    return Array.from({ length: 6 }, roll4d6DropLowest);
}

// ─────────────────────────────────────────────────────────────────────────────
// POINT BUY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns total points spent given current stat values (from base 8). */
export function calculatePointsSpent(scores: Partial<Record<keyof StatBlock, number>>): number {
    return Object.values(scores).reduce<number>((total, score) => {
        return total + getPointBuyCost(typeof score === 'number' ? score : POINT_BUY_MIN);
    }, 0);
}

/** Returns remaining points in the budget given current scores. */
export function getPointBuyRemaining(scores: Partial<Record<keyof StatBlock, number>>): number {
    return POINT_BUY_BUDGET - calculatePointsSpent(scores);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTE ALL DERIVED STATS — The Master Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes ALL derived statistics for a character in one pass.
 *
 * This is the single source of truth for every number displayed on the
 * character sheet. UI components should call this (or the individual
 * functions above) rather than doing their own arithmetic.
 *
 * Performance: Pure function (no side effects), suitable for memoization.
 * Typical execution time: < 1ms per character.
 */
export function computeDerivedStats(character: Character): DerivedStats {
    const totalLevel = getTotalCharacterLevel(character);
    const proficiencyBonus = getProficiencyBonus(character);

    // Ability modifiers
    const stats: (keyof StatBlock)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    // Saving throws
    const savingThrowBonuses: Partial<Record<keyof StatBlock, number>> = {};
    for (const stat of stats) {
        savingThrowBonuses[stat] = getSavingThrowBonus(character, stat);
    }

    // Skill bonuses (all 18 skills)
    const skillBonuses: Record<string, number> = {};
    for (const skill of Object.keys(SKILL_ABILITY_MAP)) {
        skillBonuses[skill] = getSkillTotal(character, skill);
    }

    // Passive scores
    const passivePerception = getPassiveScore(character, 'Perception');
    const passiveInsight = getPassiveScore(character, 'Insight');
    const passiveInvestigation = getPassiveScore(character, 'Investigation');

    // Spell slots (multiclass-aware)
    let spellSlots: { current: number; max: number }[];
    if (character.classes && character.classes.length > 1) {
        spellSlots = getMulticlassSpellSlots(character.classes);
    } else {
        // Use the character's stored spell slots (already computed on class select)
        spellSlots = character.spellSlots && character.spellSlots.length === 10
            ? character.spellSlots
            : Array.from({ length: 10 }, () => ({ current: 0, max: 0 }));
    }

    return {
        proficiencyBonus,
        totalLevel,
        initiativeBonus: getInitiative(character),
        armorClass: getArmorClass(character),
        passivePerception,
        passiveInsight,
        passiveInvestigation,
        spellSaveDC: getSpellSaveDc(character),
        spellAttackBonus: getSpellAttackMod(character),
        skillBonuses,
        savingThrowBonuses,
        spellSlots,
        isASIEligible: isCharacterASIEligible(character),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPELL SLOT ARRAY CONVERSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a raw 9-element slot count array (from progression tables)
 * into the 10-element Character.spellSlots format (index 0 = cantrip placeholder).
 *
 * Used when applying class features to set initial spell slots.
 */
export function slotArrayToCharacterFormat(rawSlots: number[]): { current: number; max: number }[] {
    const result: { current: number; max: number }[] = [{ current: 0, max: 0 }]; // [0] = cantrips placeholder
    for (let i = 0; i < 9; i++) {
        const count = rawSlots[i] ?? 0;
        result.push({ current: count, max: count });
    }
    return result;
}

/**
 * Creates a fresh spell slot array for a given class at a given level.
 * Handles all progression types (full, half, artificer, third, pact, none).
 */
export function buildSpellSlotsForClass(
    className: string,
    classLevel: number,
    subclass?: string
): { current: number; max: number }[] {
    const type = getSpellcasterType(className, subclass);

    if (type === 'pact') {
        // Warlock gets Pact Magic slots, not standard slots
        const lvl = Math.max(0, Math.min(20, classLevel));
        const pact = WARLOCK_PACT_MAGIC[lvl];
        const result: { current: number; max: number }[] = Array.from(
            { length: 10 },
            () => ({ current: 0, max: 0 })
        );
        if (pact && pact.count > 0) {
            result[pact.slotLevel] = { current: pact.count, max: pact.count };
        }
        return result;
    }

    const rawSlots = getSingleClassSpellSlots(className, classLevel, subclass);
    return slotArrayToCharacterFormat(rawSlots);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL-UP HP CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the fixed average HP gain for a new level in the given class.
 * Formula: floor(hitDie / 2) + 1 + CON mod (minimum 1).
 */
export function getAverageHPGain(className: string, conModifier: number): number {
    const die = getHitDie(className);
    return Math.max(1, Math.floor(die / 2) + 1 + conModifier);
}

/**
 * Rolls and returns a random HP gain for a new level in the given class.
 * Formula: roll 1d(hitDie) + CON mod (minimum 1).
 */
export function getRolledHPGain(className: string, conModifier: number): number {
    const die = getHitDie(className);
    const roll = Math.floor(Math.random() * die) + 1;
    return Math.max(1, roll + conModifier);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASS PROFICIENCY RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the spellcasting ability for a class.
 * Returns 'none' if the class is not a spellcaster.
 */
export function getClassSpellcastingAbility(
    className: string,
    subclass?: string
): keyof StatBlock | 'none' {
    const type = getSpellcasterType(className, subclass);
    if (type === 'none') return 'none';
    const key = className.toLowerCase().trim();
    return (SPELLCASTING_ABILITY_BY_CLASS[key] as keyof StatBlock) ?? 'none';
}

/**
 * Returns whether a class can cast spells at the given level.
 */
export function canCastAtLevel(
    className: string,
    classLevel: number,
    subclass?: string
): boolean {
    const slots = getSingleClassSpellSlots(className, classLevel, subclass);
    const type = getSpellcasterType(className, subclass);
    return type === 'pact' || slots.some(s => s > 0);
}
