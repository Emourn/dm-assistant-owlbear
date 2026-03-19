import { Character } from '../types/character';
import { getHighestAcSet, sumBonus, getActiveEffects } from './mechanicsEngine';

export function getAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

export function getEffectiveAbilityScore(character: Character, stat: keyof Character['abilityScores']): number {
    let score = character.abilityScores[stat] || 10;

    // 1. Legacy bonuses (Features/Feats)
    for (const feat of character.feats || []) {
        if (feat.abilityScoreBonuses && feat.abilityScoreBonuses[stat]) {
            score += feat.abilityScoreBonuses[stat]!;
        }
    }

    // 2. Effect System bonuses (summing flat modifiers and finding highest SET value)
    const effects = getActiveEffects(character);
    const bonuses = effects.filter((e: any) => e.type === 'modify_ability_score' && e.target === stat);

    let flatBonus = 0;
    let setVal = -1;

    bonuses.forEach((b: any) => {
        if (typeof b.value === 'string' && b.value.startsWith('SET:')) {
            const v = parseInt(b.value.split(':')[1]);
            if (!isNaN(v) && v > setVal) setVal = v;
        } else {
            flatBonus += Number(b.value) || 0;
        }
    });

    let total = score + flatBonus;
    if (setVal > total) total = setVal;

    return total;
}

export function getProficiencyBonus(character: Character): number {
    const profOverride = character.customOverrides?.overrides?.find(o => o.field === 'proficiencyBonus' && o.isActive);
    if (profOverride) return Number(profOverride.value);

    const effectiveLevel = character.classes && character.classes.length > 0
        ? character.classes.reduce((sum, entry) => sum + (entry.level || 0), 0)
        : character.level;

    const base = Math.ceil((effectiveLevel || 1) / 4) + 1;
    const modifier = character.customOverrides?.modifiers?.proficiencyBonus || 0;
    return base + modifier;
}

export function getInitiative(character: Character): number {
    const initOverride = character.customOverrides?.overrides?.find(o => o.field === 'initiativeMod' && o.isActive);
    if (initOverride) return Number(initOverride.value);

    const dexMod = getAbilityModifier(getEffectiveAbilityScore(character, 'dex'));
    const itemBonus = sumBonus(character, 'add_initiative_bonus');
    const modifier = character.customOverrides?.modifiers?.initiativeMod || 0;

    return dexMod + itemBonus + modifier;
}

export interface ArmorClassBreakdown {
    base: number;
    source: string;
    dexBonus: number;
    dexCap: number | null;
    shieldBonus: number;
    modifierBonus: number;
    total: number;
    isOverridden: boolean;
}

export function getArmorClassBreakdown(character: Character): ArmorClassBreakdown {
    // 1. DM Override check
    const acOverride = character.customOverrides?.overrides?.find(o => o.field === 'ac' && o.isActive);
    if (acOverride) {
        return {
            base: Number(acOverride.value),
            source: 'DM Override: ' + (acOverride.reason || 'None'),
            dexBonus: 0,
            dexCap: null,
            shieldBonus: 0,
            modifierBonus: 0,
            total: Number(acOverride.value),
            isOverridden: true
        };
    }

    // 2. Base AC from Mechanics Engine (handles Armor vs Unarmored Defense)
    const res = getHighestAcSet(character);

    // 3. Shield & Magic Bonuses
    const shieldBonus = sumBonus(character, 'add_ac_bonus', 'ac');
    const flatModifier = character.customOverrides?.modifiers?.ac || 0;

    const total = res.value + shieldBonus + flatModifier;

    return {
        base: res.base,
        source: res.source,
        dexBonus: res.dex,
        dexCap: res.dexCap,
        shieldBonus: shieldBonus,
        modifierBonus: flatModifier,
        total: total,
        isOverridden: false
    };
}

export function getArmorClass(character: Character): number {
    return getArmorClassBreakdown(character).total;
}

export function getSpellSaveDc(character: Character): number {
    const dcOverride = character.customOverrides?.overrides?.find(o => o.field === 'spellSaveDc' && o.isActive);
    if (dcOverride) return Number(dcOverride.value);

    if (character.spellcastingAbility === 'none') return 10;
    const prof = getProficiencyBonus(character);
    const mod = getAbilityModifier(getEffectiveAbilityScore(character, character.spellcastingAbility as any));
    return 8 + prof + mod + (character.customOverrides?.modifiers?.spellSaveDc || 0);
}

export function getSpellAttackMod(character: Character): number {
    const attackOverride = character.customOverrides?.overrides?.find(o => o.field === 'spellAttackMod' && o.isActive);
    if (attackOverride) return Number(attackOverride.value);

    if (character.spellcastingAbility === 'none') return 0;
    const prof = getProficiencyBonus(character);
    const mod = getAbilityModifier(getEffectiveAbilityScore(character, character.spellcastingAbility as any));
    return prof + mod + (character.customOverrides?.modifiers?.spellAttackMod || 0);
}

export function getSkillTotal(character: Character, skillName: string): number {
    const skillOverride = character.customOverrides?.overrides?.find(o => o.field.toLowerCase() === skillName.toLowerCase() && o.isActive);
    if (skillOverride) return Number(skillOverride.value);

    const skill = character.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
    if (!skill) return 0;

    let tot = getAbilityModifier(getEffectiveAbilityScore(character, skill.stat));
    // When calculating skill total, we use the effective proficiency bonus. 
    // If the DM overridden proficiency bonus, that's what we use.
    const profBonus = getProficiencyBonus(character);

    if (skill.proficient) tot += profBonus;
    if (skill.expertise) tot += profBonus;

    return tot + (skill.bonus || 0) + (character.customOverrides?.modifiers?.[skillName] || 0);
}

export function getPassiveScore(character: Character, skillName: string): number {
    const passiveOverride = character.customOverrides?.overrides?.find(o => o.field.toLowerCase() === `passive${skillName.toLowerCase()}` && o.isActive);
    if (passiveOverride) return Number(passiveOverride.value);

    const base = 10 + getSkillTotal(character, skillName);
    const modifier = character.customOverrides?.modifiers?.[`passive${skillName}`] || 0;
    return base + modifier;
}

// D&D 5e Official Experience Points Thresholds (Levels 1-20)
export const XP_THRESHOLDS = [
    0,      // Level 1
    300,    // Level 2
    900,    // Level 3
    2700,   // Level 4
    6500,   // Level 5
    14000,  // Level 6
    23000,  // Level 7
    34000,  // Level 8
    48000,  // Level 9
    64000,  // Level 10
    85000,  // Level 11
    100000, // Level 12
    120000, // Level 13
    140000, // Level 14
    165000, // Level 15
    195000, // Level 16
    225000, // Level 17
    265000, // Level 18
    305000, // Level 19
    355000  // Level 20
];

/**
 * Returns the XP required to reach the NEXT level based on the character's current level.
 * If the character is level 20 or higher, it returns the cap (Level 20 XP requirement).
 */
export function getXpRequiredForNextLevel(currentLevel: number): number {
    if (currentLevel < 1) return XP_THRESHOLDS[1]; // Fallback to level 2 if current is 0
    if (currentLevel >= 20) return XP_THRESHOLDS[19]; // Level 20 cap
    return XP_THRESHOLDS[currentLevel]; // Array is 0-indexed, so index 1 represents level 2
}
