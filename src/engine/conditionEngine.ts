import { Character } from '../types/character';

/**
 * CONDITION ENGINE — D&D 2024
 * 
 * Maps conditions to their mechanical effects as per the 2024 PHB.
 * Supports distance/type-based modifiers (e.g., Melee vs Ranged).
 */

export interface RollingModifier {
    advantage?: boolean;
    disadvantage?: boolean;
    autoCrit?: boolean;
    autoFail?: boolean;
    // For 2024 rules like Prone where distance matters
    ifMelee?: boolean;
    ifRanged?: boolean;
}

export interface ConditionEffect {
    name: string;
    description: string;
    attackRolls?: RollingModifier;
    attackRollsAgainst?: RollingModifier | RollingModifier[]; // Use array for complex rules like Prone
    savingThrows?: {
        [key: string]: RollingModifier; // e.g. "dex": { autoFail: true }
    };
    abilityChecks?: {
        [key: string]: RollingModifier;
    };
    movement?: {
        speedMultiplier?: number;
        speedBonus?: number;
    };
    actions?: {
        canTakeAction?: boolean;
        canTakeBonusAction?: boolean;
        canTakeReaction?: boolean;
    };
    pageRef?: string;
}

export const CONDITION_EFFECTS: Record<string, ConditionEffect> = {
    "blinded": {
        name: "Blinded",
        description: "You can't see. Attack rolls against you have Advantage. Your attack rolls have Disadvantage. You auto-fail sight-based checks.",
        attackRolls: { disadvantage: true },
        attackRollsAgainst: { advantage: true },
        abilityChecks: {
            "perception": { disadvantage: true }, // Sight based
        },
        pageRef: "PHB 2024, p.366"
    },
    "charmed": {
        name: "Charmed",
        description: "You can't attack the charmer or target them with harmful abilities. The charmer has Advantage on social checks against you.",
        abilityChecks: {
            "persuasion": { advantage: true }, // Charmer gets advantage
        },
        pageRef: "PHB 2024, p.366"
    },
    "deafened": {
        name: "Deafened",
        description: "You can't hear. You auto-fail hearing-based checks.",
        pageRef: "PHB 2024, p.366"
    },
    "frightened": {
        name: "Frightened",
        description: "Disadvantage on ability checks and attack rolls while source of fear is in sight. You can't willingly move closer to the source.",
        attackRolls: { disadvantage: true },
        abilityChecks: { "default": { disadvantage: true } },
        pageRef: "PHB 2024, p.366"
    },
    "grappled": {
        name: "Grappled",
        description: "Speed 0. Can't benefit from speed bonuses.",
        movement: { speedMultiplier: 0 },
        pageRef: "PHB 2024, p.366"
    },
    "incapacitated": {
        name: "Incapacitated",
        description: "Can't take Actions or Reactions.",
        actions: { canTakeAction: false, canTakeReaction: false },
        pageRef: "PHB 2024, p.367"
    },
    "invisible": {
        name: "Invisible",
        description: "You are impossible to see without special senses. You have Advantage on attack rolls. Attack rolls against you have Disadvantage.",
        attackRolls: { advantage: true },
        attackRollsAgainst: { disadvantage: true },
        pageRef: "PHB 2024, p.367"
    },
    "paralyzed": {
        name: "Paralyzed",
        description: "Incapacitated. Can't move or speak. Auto-fail STR and DEX saves. Attack rolls against have Advantage. Critical hit if attacker is within 5ft.",
        actions: { canTakeAction: false, canTakeReaction: false },
        movement: { speedMultiplier: 0 },
        savingThrows: {
            "str": { autoFail: true },
            "dex": { autoFail: true }
        },
        attackRollsAgainst: [
            { advantage: true },
            { autoCrit: true, ifMelee: true }
        ],
        pageRef: "PHB 2024, p.367"
    },
    "petrified": {
        name: "Petrified",
        description: "Transformed into stone. Incapacitated. Can't move or speak. Auto-fail STR and DEX saves. Resistance to all damage. Immune to poison/disease.",
        actions: { canTakeAction: false, canTakeReaction: false },
        movement: { speedMultiplier: 0 },
        savingThrows: {
            "str": { autoFail: true },
            "dex": { autoFail: true }
        },
        attackRollsAgainst: { advantage: true },
        pageRef: "PHB 2024, p.367"
    },
    "poisoned": {
        name: "Poisoned",
        description: "Disadvantage on attack rolls and ability checks.",
        attackRolls: { disadvantage: true },
        abilityChecks: { "default": { disadvantage: true } },
        pageRef: "PHB 2024, p.367"
    },
    "prone": {
        name: "Prone",
        description: "Only crawl (half speed) or stand up. Disadvantage on attack rolls. Attack rolls against have Advantage if within 5ft, otherwise Disadvantage.",
        attackRolls: { disadvantage: true },
        attackRollsAgainst: [
            { advantage: true, ifMelee: true },
            { disadvantage: true, ifRanged: true }
        ],
        pageRef: "PHB 2024, p.367"
    },
    "restrained": {
        name: "Restrained",
        description: "Speed 0. Attack rolls against have Advantage. Your attack rolls have Disadvantage. Disadvantage on DEX saves.",
        movement: { speedMultiplier: 0 },
        attackRolls: { disadvantage: true },
        attackRollsAgainst: { advantage: true },
        savingThrows: {
            "dex": { disadvantage: true }
        },
        pageRef: "PHB 2024, p.368"
    },
    "stunned": {
        name: "Stunned",
        description: "Incapacitated. Can't move. Speak falteringly. Auto-fail STR and DEX saves. Attack rolls against have Advantage.",
        actions: { canTakeAction: false, canTakeReaction: false },
        movement: { speedMultiplier: 0 },
        savingThrows: {
            "str": { autoFail: true },
            "dex": { autoFail: true }
        },
        attackRollsAgainst: { advantage: true },
        pageRef: "PHB 2024, p.368"
    },
    "unconscious": {
        name: "Unconscious",
        description: "Incapacitated. Can't move or speak. Unaware of surroundings. Drop everything. Auto-fail STR and DEX saves. Attack rolls against have Advantage. Critical hit if attacker is within 5ft.",
        actions: { canTakeAction: false, canTakeReaction: false },
        movement: { speedMultiplier: 0 },
        savingThrows: {
            "str": { autoFail: true },
            "dex": { autoFail: true }
        },
        attackRollsAgainst: [
            { advantage: true },
            { autoCrit: true, ifMelee: true }
        ],
        pageRef: "PHB 2024, p.368"
    }
};

/**
 * Returns the mechanical effects for a given condition.
 */
export function getConditionModifiers(conditionName: string): ConditionEffect | undefined {
    return CONDITION_EFFECTS[conditionName.toLowerCase()];
}

/**
 * Evaluates all conditions on a character to determine net mechanical state.
 */
export function evaluateCharacterConditions(character: Character, type: 'attack' | 'check' | 'save', stat?: string): { advantage: boolean; disadvantage: boolean; reasons: string[] } {
    const reasons: string[] = [];
    let hasAdvantage = false;
    let hasDisadvantage = false;

    if (!character.conditions) return { advantage: false, disadvantage: false, reasons: [] };

    for (const cond of character.conditions) {
        const effect = getConditionModifiers(cond.name);
        if (!effect) continue;

        let mod: RollingModifier | undefined;

        if (type === 'attack') mod = effect.attackRolls;
        if (type === 'check') mod = effect.abilityChecks?.[stat?.toLowerCase() || 'default'] || effect.abilityChecks?.['default'];
        if (type === 'save') mod = effect.savingThrows?.[stat?.toLowerCase() || ''];

        if (mod) {
            if (mod.advantage) {
                hasAdvantage = true;
                reasons.push(`${cond.name}: Advantage`);
            }
            if (mod.disadvantage) {
                hasDisadvantage = true;
                reasons.push(`${cond.name}: Disadvantage`);
            }
        }
    }

    return { advantage: hasAdvantage, disadvantage: hasDisadvantage, reasons };
}
