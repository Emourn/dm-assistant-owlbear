import { Character } from '../types/character';

/**
 * REST ENGINE — Pure functions for D&D 5e Short Rest and Long Rest mechanics.
 * No UI or state management here, just the rules.
 */

export interface RestSummaryEntry {
    label: string;
    detail: string;
}

export interface RestResult {
    updatedCharacter: Character;
    summary: RestSummaryEntry[];
}

/**
 * Rolls a single hit die (e.g. "1d10") and returns the result.
 * Uses the die size from the character's hitDice string.
 */
function parseHitDieSize(hitDice: string): number {
    // e.g. "5d10" → 10, "3d8" → 8
    const match = hitDice.match(/d(\d+)/i);
    return match ? parseInt(match[1]) : 8; // fallback to d8
}

function rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
}

function getConMod(character: Character): number {
    return Math.floor(((character.abilityScores?.con || 10) - 10) / 2);
}

/**
 * Calculates the maximum number of hit dice a character has (equals their level).
 */
function getMaxHitDice(character: Character): number {
    return character.level || 1;
}

/**
 * Calculates how many hit dice the character currently has remaining.
 * We parse the hitDice string "XdY" where X = remaining count.
 */
function getHitDiceRemaining(character: Character): number {
    const match = character.hitDice.match(/^(\d+)/);
    return match ? parseInt(match[1]) : character.level || 1;
}

/**
 * Rebuilds the hitDice string with a new remaining count.
 */
function setHitDiceRemaining(character: Character, remaining: number): string {
    const dieSize = parseHitDieSize(character.hitDice);
    return `${remaining}d${dieSize}`;
}

/**
 * SHORT REST
 * - Spend N hit dice to heal (each: 1dX + CON mod, minimum 1 HP per die)
 * - Reset features/resources with resetOn: 'short'
 */
export function applyShortRest(character: Character, hitDiceToSpend: number): RestResult {
    const summary: RestSummaryEntry[] = [];
    const char = { ...character };

    // 1. Spend hit dice to heal
    const dieSize = parseHitDieSize(char.hitDice);
    const conMod = getConMod(char);
    let currentRemaining = getHitDiceRemaining(char);
    const actualSpend = Math.min(hitDiceToSpend, currentRemaining);
    let totalHealing = 0;

    if (actualSpend > 0) {
        const rolls: number[] = [];
        for (let i = 0; i < actualSpend; i++) {
            const roll = rollDie(dieSize);
            const heal = Math.max(1, roll + conMod);
            rolls.push(heal);
            totalHealing += heal;
        }

        char.currentHp = Math.min(char.maxHp, char.currentHp + totalHealing);
        currentRemaining -= actualSpend;
        char.hitDice = setHitDiceRemaining(char, currentRemaining);

        summary.push({
            label: 'Hit Dice',
            detail: `Spent ${actualSpend}d${dieSize} → Healed ${totalHealing} HP (rolls: ${rolls.join(', ')})`
        });
    }

    // 2. Reset short-rest features
    const resetFeatures: string[] = [];
    char.features = char.features.map(f => {
        if (f.hasUses && f.resetOn === 'short' && f.usesCurrent !== f.usesMax) {
            resetFeatures.push(f.name);
            return { ...f, usesCurrent: f.usesMax };
        }
        return f;
    });

    // 2b. Reset short-rest feats
    if (char.feats) {
        char.feats = char.feats.map(f => {
            if (f.hasUses && f.resetOn === 'short' && f.usesCurrent !== f.usesMax) {
                resetFeatures.push(f.name);
                return { ...f, usesCurrent: f.usesMax };
            }
            return f;
        });
    }

    // 2c. Reset short-rest racial traits
    if (char.racialTraits) {
        char.racialTraits = char.racialTraits.map(f => {
            if (f.hasUses && f.resetOn === 'short' && f.usesCurrent !== f.usesMax) {
                resetFeatures.push(f.name);
                return { ...f, usesCurrent: f.usesMax };
            }
            return f;
        });
    }

    if (resetFeatures.length > 0) {
        summary.push({ label: 'Features Reset', detail: resetFeatures.join(', ') });
    }


    // 3. Reset short-rest resources
    const resetResources: string[] = [];
    char.resources = char.resources.map(r => {
        if (r.resetOn === 'short' && r.current !== r.max) {
            resetResources.push(r.name);
            return { ...r, current: r.max };
        }
        return r;
    });
    if (resetResources.length > 0) {
        summary.push({ label: 'Resources Reset', detail: resetResources.join(', ') });
    }

    // 4. Warlock Pact Magic: Restore ALL spell slots on short rest
    if (char.className?.toLowerCase().includes('warlock')) {
        const slotsRestored: string[] = [];
        char.spellSlots = char.spellSlots.map((slot, level) => {
            if (level === 0) return slot; // Cantrips don't have slots
            if (slot.max > 0 && slot.current < slot.max) {
                slotsRestored.push(`Level ${level}: ${slot.current}→${slot.max}`);
                return { ...slot, current: slot.max };
            }
            return slot;
        });
        if (slotsRestored.length > 0) {
            summary.push({ label: '✨ Pact Magic', detail: `Warlock slots restored: ${slotsRestored.join(', ')}` });
        }
    }

    if (summary.length === 0) {
        summary.push({ label: 'Short Rest', detail: 'Nothing to restore.' });
    }

    return { updatedCharacter: char, summary };
}

/**
 * LONG REST
 * - Restore HP to max
 * - Restore ALL spell slots to max
 * - Reset features/resources with resetOn: 'short' OR 'long'
 * - Regain half of total hit dice (minimum 1)
 * - Clear death saves
 * - Reduce exhaustion by 1
 */
export function applyLongRest(character: Character): RestResult {
    const summary: RestSummaryEntry[] = [];
    const char = { ...character };

    // 1. Restore HP
    const hpHealed = char.maxHp - char.currentHp;
    char.currentHp = char.maxHp;
    // D&D 5e: Temp HP persists through rests — only lost when absorbed or source ends.
    if (hpHealed > 0) {
        summary.push({ label: 'Hit Points', detail: `Restored ${hpHealed} HP → Full (${char.maxHp})` });
    }

    // 2. Restore ALL spell slots
    const slotsRestored: string[] = [];
    char.spellSlots = char.spellSlots.map((slot, level) => {
        if (level === 0) return slot; // Cantrips don't have slots
        if (slot.max > 0 && slot.current < slot.max) {
            slotsRestored.push(`Level ${level}: ${slot.current}→${slot.max}`);
            return { ...slot, current: slot.max };
        }
        return slot;
    });
    if (slotsRestored.length > 0) {
        summary.push({ label: 'Spell Slots', detail: slotsRestored.join(', ') });
    }

    // 3. Regain hit dice (half of max, minimum 1)
    const maxHD = getMaxHitDice(char);
    const currentHD = getHitDiceRemaining(char);
    const regain = Math.max(1, Math.floor(maxHD / 2));
    const newHD = Math.min(maxHD, currentHD + regain);
    if (newHD > currentHD) {
        char.hitDice = setHitDiceRemaining(char, newHD);
        summary.push({ label: 'Hit Dice', detail: `Regained ${newHD - currentHD} hit dice (${newHD}/${maxHD})` });
    }

    // 4. Reset short AND long rest features
    const resetFeatures: string[] = [];
    char.features = char.features.map(f => {
        if (f.hasUses && (f.resetOn === 'short' || f.resetOn === 'long') && f.usesCurrent !== f.usesMax) {
            resetFeatures.push(f.name);
            return { ...f, usesCurrent: f.usesMax };
        }
        return f;
    });

    // 4b. Reset feats on rest
    if (char.feats) {
        char.feats = char.feats.map(f => {
            if (f.hasUses && (f.resetOn === 'short' || f.resetOn === 'long') && f.usesCurrent !== f.usesMax) {
                resetFeatures.push(f.name);
                return { ...f, usesCurrent: f.usesMax };
            }
            return f;
        });
    }

    // 4c. Reset racial traits on rest
    if (char.racialTraits) {
        char.racialTraits = char.racialTraits.map(f => {
            if (f.hasUses && (f.resetOn === 'short' || f.resetOn === 'long') && f.usesCurrent !== f.usesMax) {
                resetFeatures.push(f.name);
                return { ...f, usesCurrent: f.usesMax };
            }
            return f;
        });
    }

    if (resetFeatures.length > 0) {
        summary.push({ label: 'Features Reset', detail: resetFeatures.join(', ') });
    }


    // 5. Reset short AND long rest resources
    const resetResources: string[] = [];
    char.resources = char.resources.map(r => {
        if ((r.resetOn === 'short' || r.resetOn === 'long') && r.current !== r.max) {
            resetResources.push(r.name);
            return { ...r, current: r.max };
        }
        return r;
    });
    if (resetResources.length > 0) {
        summary.push({ label: 'Resources Reset', detail: resetResources.join(', ') });
    }

    // 6. Clear death saves
    if (char.deathSaves.successes > 0 || char.deathSaves.failures > 0) {
        char.deathSaves = { successes: 0, failures: 0 };
        summary.push({ label: 'Death Saves', detail: 'Cleared' });
    }

    // 7. Reduce exhaustion by 1
    if (char.exhaustion > 0) {
        char.exhaustion = Math.max(0, char.exhaustion - 1);
        summary.push({ label: 'Exhaustion', detail: `Reduced to level ${char.exhaustion}` });
    }

    if (summary.length === 0) {
        summary.push({ label: 'Long Rest', detail: 'Already fully rested!' });
    }

    return { updatedCharacter: char, summary };
}
