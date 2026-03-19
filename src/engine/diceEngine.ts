export interface DiceResult {
    total: number;
    rolls: number[];
    modifier: number;
    notation: string;
    isCrit: boolean;
    isFumble: boolean;
    advantageMode?: 'advantage' | 'disadvantage' | 'normal';
    droppedRolls?: number[];
}

/**
 * Rolls a simple die.
 */
function rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
}

/**
 * Parses a standard dice notation like "1d20+5", "2d6", "1d8-1"
 * Returns a complete DiceResult object.
 */
export function rollDice(notation: string, advantageMode: 'advantage' | 'disadvantage' | 'normal' = 'normal'): DiceResult {
    // Clean string and default to 1d20 if empty
    const cleanNotation = notation.replace(/\s+/g, '').toLowerCase() || '1d20';

    // Parse the dice part (XdY) and the modifier part (+Z or -Z)
    const match = cleanNotation.match(/(\d*)d(\d+)([+-]\d+)?/);

    if (!match) {
        // Just a flat number?
        const flatInt = parseInt(cleanNotation);
        if (!isNaN(flatInt)) {
            return {
                total: flatInt,
                rolls: [],
                modifier: flatInt,
                notation: cleanNotation,
                isCrit: false,
                isFumble: false,
                advantageMode: 'normal'
            };
        }
        throw new Error(`Invalid dice notation: ${notation}`);
    }

    const numDice = parseInt(match[1]) || 1;
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;

    const rolls: number[] = [];
    const droppedRolls: number[] = [];

    // Implement advantage/disadvantage for d20s natively
    if (sides === 20 && numDice === 1 && advantageMode !== 'normal') {
        const roll1 = rollDie(20);
        const roll2 = rollDie(20);

        if (advantageMode === 'advantage') {
            rolls.push(Math.max(roll1, roll2));
            droppedRolls.push(Math.min(roll1, roll2));
        } else {
            rolls.push(Math.min(roll1, roll2));
            droppedRolls.push(Math.max(roll1, roll2));
        }
    } else {
        // Standard rolling
        for (let i = 0; i < numDice; i++) {
            rolls.push(rollDie(sides));
        }
    }

    const rollSum = rolls.reduce((a, b) => a + b, 0);
    const total = rollSum + modifier;

    // Crit/fumble logic applies primarily to standard d20 rolls
    const isCrit = sides === 20 && rolls.includes(20);
    const isFumble = sides === 20 && rolls.includes(1);

    return {
        total,
        rolls,
        modifier,
        notation: cleanNotation,
        isCrit,
        isFumble,
        advantageMode,
        droppedRolls: droppedRolls.length > 0 ? droppedRolls : undefined
    };
}

/**
 * Convenience function for a quick ability/skill check or saving throw.
 */
export function rollD20(modifier: number, advantageMode: 'advantage' | 'disadvantage' | 'normal' = 'normal'): DiceResult {
    const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
    return rollDice(`1d20${modStr}`, advantageMode);
}

import { ConditionEffect, RollingModifier, CONDITION_EFFECTS } from './conditionEngine';

// ... (DiceResult interface and rollDice/rollD20 remain the same)

// --- Condition Effect Automation ---
export interface ConditionEvaluation {
    advantage: boolean;
    disadvantage: boolean;
    autoCrit: boolean;
    autoFailSave: boolean;
    reasons: string[];
}

/**
 * Standardizes advantage/disadvantage cancellation (5e rule: Any Advantage + Any Disadvantage = Normal, neither stack)
 * Returns the resolved mode and combined reasons.
 */
export function resolveAdvantageMode(evals: ConditionEvaluation[]): { mode: 'advantage' | 'disadvantage' | 'normal', reasons: string[] } {
    let hasAdv = false;
    let hasDis = false;
    const reasons: string[] = [];

    for (const e of evals) {
        if (e.advantage) hasAdv = true;
        if (e.disadvantage) hasDis = true;
        reasons.push(...e.reasons);
    }

    let mode: 'advantage' | 'disadvantage' | 'normal' = 'normal';
    if (hasAdv && !hasDis) mode = 'advantage';
    if (hasDis && !hasAdv) mode = 'disadvantage';

    return { mode, reasons };
}

/**
 * Evaluates D&D 5e mechanical condition rules between an attacker and defender.
 * Uses the data-driven CONDITION_EFFECTS from conditionEngine.ts
 */
export function evaluateCombatConditions(
    attacker: import('../types/combat').Combatant | null,
    defender: import('../types/combat').Combatant | null,
    actionType: 'melee' | 'ranged' | 'save',
    saveAbility?: string // e.g., 'str', 'dex'
): ConditionEvaluation {
    const result: ConditionEvaluation = {
        advantage: false,
        disadvantage: false,
        autoCrit: false,
        autoFailSave: false,
        reasons: []
    };

    const atkConds = attacker?.conditions?.map(c => c.name.toLowerCase()) || [];
    const defConds = defender?.conditions?.map(c => c.name.toLowerCase()) || [];

    // 1. Process Attacker Conditions
    atkConds.forEach(condName => {
        const effect: ConditionEffect | undefined = CONDITION_EFFECTS[condName];
        if (!effect) return;

        const mod: RollingModifier | undefined = effect.attackRolls;
        if (mod) {
            if (mod.advantage) {
                result.advantage = true;
                result.reasons.push(`Attacker ${effect.name}: Advantage`);
            }
            if (mod.disadvantage) {
                result.disadvantage = true;
                result.reasons.push(`Attacker ${effect.name}: Disadvantage`);
            }
        }
    });

    // 2. Process Defender Conditions
    defConds.forEach(condName => {
        const effect = CONDITION_EFFECTS[condName];
        if (!effect) return;

        // Advantage/Disadvantage Against
        if (actionType !== 'save') {
            const mods = Array.isArray(effect.attackRollsAgainst)
                ? effect.attackRollsAgainst
                : (effect.attackRollsAgainst ? [effect.attackRollsAgainst] : []);

            mods.forEach(mod => {
                // Filter by type if specified (e.g. Prone)
                if (mod.ifMelee && actionType !== 'melee') return;
                if (mod.ifRanged && actionType !== 'ranged') return;

                if (mod.advantage) {
                    result.advantage = true;
                    result.reasons.push(`Target ${effect.name}: Advantage`);
                }
                if (mod.disadvantage) {
                    result.disadvantage = true;
                    result.reasons.push(`Target ${effect.name}: Disadvantage`);
                }
                if (mod.autoCrit) {
                    result.autoCrit = true;
                    result.reasons.push(`Target ${effect.name}: Critical Hit (if hit)`);
                }
            });
        }

        // Saving Throw Effects
        if (actionType === 'save' && saveAbility && effect.savingThrows) {
            const mod = effect.savingThrows[saveAbility.toLowerCase()];
            if (mod) {
                if (mod.advantage) {
                    result.advantage = true;
                    result.reasons.push(`Target ${effect.name}: Advantage on ${saveAbility.toUpperCase()} save`);
                }
                if (mod.disadvantage) {
                    result.disadvantage = true;
                    result.reasons.push(`Target ${effect.name}: Disadvantage on ${saveAbility.toUpperCase()} save`);
                }
                if (mod.autoFail) {
                    result.autoFailSave = true;
                    result.reasons.push(`Target ${effect.name}: Auto-fails ${saveAbility.toUpperCase()} save`);
                }
            }
        }
    });

    return result;
}
