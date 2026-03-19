import { Character, Effect } from '../types/character';
import { getAbilityModifier, getEffectiveAbilityScore, getProficiencyBonus } from './statCalculations';

/**
 * MECHANICS ENGINE — D&D 5th Edition
 * 
 * Centralized logic for aggregating and resolving complex mechanics 
 * (bonuses, set values, advantages) from items and features.
 */

/**
 * Collects all active effects from equipped items and features.
 */
export function getActiveEffects(character: Character): Effect[] {
    const effects: Effect[] = [];

    // Equipment effects (only if equipped)
    character.inventory.forEach(item => {
        if (item.isEquipped && item.effects) {
            effects.push(...item.effects);
        }
    });

    // Feature effects
    character.features.forEach(feature => {
        if (feature.effects) {
            effects.push(...feature.effects);
        }
    });

    // Feat effects
    character.feats.forEach(feat => {
        if (feat.effects) {
            effects.push(...feat.effects);
        }
    });

    // Racial traits effects
    character.racialTraits.forEach(trait => {
        if (trait.effects) {
            effects.push(...trait.effects);
        }
    });

    return effects;
}

/**
 * Resolves a dynamic value string (e.g. "@pb", "@level", "@mod:str") into a number.
 */
export function resolveValue(value: unknown, character: Character): number {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;

    let str = value.trim();

    // Replace tokens
    str = str.replace(/@pb/g, getProficiencyBonus(character).toString());
    str = str.replace(/@level/g, (character.level || 1).toString());

    const modMatch = str.match(/@mod:([a-z]{3})/g);
    if (modMatch) {
        modMatch.forEach(match => {
            const stat = match.split(':')[1] as keyof Character['abilityScores'];
            const mod = getAbilityModifier(getEffectiveAbilityScore(character, stat));
            str = str.replace(match, mod.toString());
        });
    }

    // Basic arithmetic evaluation (safe for simple 5e formulas)
    try {
        // Remove anything not a number, operator, or parenthesis
        const safeStr = str.replace(/[^0-9+\-*/().]/g, '');
        return evaluateSimpleMathExpression(safeStr);
    } catch (e) {
        console.error(`Failed to resolve dynamic value: ${value}`, e);
        return 0;
    }
}

function evaluateSimpleMathExpression(expression: string): number {
    const input = expression.trim();
    if (!input) return 0;

    let index = 0;

    const parseExpression = (): number => {
        let value = parseTerm();
        while (index < input.length) {
            const operator = input[index];
            if (operator !== '+' && operator !== '-') break;
            index++;
            const right = parseTerm();
            value = operator === '+' ? value + right : value - right;
        }
        return value;
    };

    const parseTerm = (): number => {
        let value = parseFactor();
        while (index < input.length) {
            const operator = input[index];
            if (operator !== '*' && operator !== '/') break;
            index++;
            const right = parseFactor();
            value = operator === '*' ? value * right : value / right;
        }
        return value;
    };

    const parseFactor = (): number => {
        if (input[index] === '+') {
            index++;
            return parseFactor();
        }
        if (input[index] === '-') {
            index++;
            return -parseFactor();
        }
        if (input[index] === '(') {
            index++;
            const value = parseExpression();
            if (input[index] !== ')') {
                throw new Error('Unmatched parenthesis in expression');
            }
            index++;
            return value;
        }

        const start = index;
        while (index < input.length && /[0-9.]/.test(input[index])) {
            index++;
        }
        if (start === index) {
            throw new Error(`Unexpected token at position ${index}`);
        }

        const parsed = Number(input.slice(start, index));
        if (!Number.isFinite(parsed)) {
            throw new Error('Invalid number in expression');
        }
        return parsed;
    };

    const result = parseExpression();
    if (index !== input.length || !Number.isFinite(result)) {
        throw new Error('Invalid arithmetic expression');
    }
    return result;
}

/**
 * Sums numeric bonuses of a specific type and target.
 * target === 'all' or undefined matches everything for that type.
 */
export function sumBonus(character: Character, type: Effect['type'], target?: string): number {
    const effects = getActiveEffects(character);
    return effects
        .filter(e => e.type === type && (!target || e.target === target || e.target === 'all'))
        .reduce((sum, e) => sum + resolveValue(e.value, character), 0);
}

/**
 * Gets the highest "Set" value (e.g., base AC from multiple sources).
 */
export function getHighestAcSet(character: Character): { value: number; source: string; base: number; dex: number; dexCap: number | null } {
    const unarmoredDex = getAbilityModifier(getEffectiveAbilityScore(character, 'dex'));
    let bestAc = 10 + unarmoredDex;
    let bestSource = 'Unarmored';
    let bestBase = 10;
    let bestDex = unarmoredDex;
    let bestCap: number | null = null;

    const effects = getActiveEffects(character);
    const acSets = effects.filter(e => e.type === 'set_ac');

    acSets.forEach(effect => {
        let res: { total: number; base: number; dex: number; dexCap: number | null };
        if (typeof effect.value === 'number') {
            res = { total: effect.value, base: effect.value, dex: 0, dexCap: 0 };
        } else {
            res = evaluateAcFormula(effect.value as string, character);
        }

        if (res.total > bestAc) {
            bestAc = res.total;
            bestSource = effect.note || 'Special AC Source';
            bestBase = res.base;
            bestDex = res.dex;
            bestCap = res.dexCap;
        }
    });

    return { value: bestAc, source: bestSource, base: bestBase, dex: bestDex, dexCap: bestCap };
}

/**
 * Evaluates simple AC formulas found in 5e rules.
 * Supports: "10 + DEX", "13 + DEX", "10 + DEX + CON", "10 + DEX + WIS"
 */
function evaluateAcFormula(formula: string, character: Character): { total: number; base: number; dex: number; dexCap: number | null } {
    const dex = getAbilityModifier(getEffectiveAbilityScore(character, 'dex'));
    const con = getAbilityModifier(getEffectiveAbilityScore(character, 'con'));
    const wis = getAbilityModifier(getEffectiveAbilityScore(character, 'wis'));

    const base = parseInt(formula.match(/^\d+/)?.[0] || '10');
    let dexBonus = 0;
    let dexCap: number | null = null;

    const normalized = formula.toUpperCase();
    if (normalized.includes('DEX')) dexBonus = dex;
    if (normalized.includes('CON')) dexBonus += con;
    if (normalized.includes('WIS')) dexBonus += wis;

    // Handle caps (e.g. Medium armor max +2)
    const dexCapMatch = formula.match(/MAX\s+(\d+)/i);
    if (dexCapMatch) {
        dexCap = parseInt(dexCapMatch[1]);
        dexBonus = Math.min(dexBonus, dexCap);
    }

    return { total: base + dexBonus, base, dex: dexBonus, dexCap };
}
