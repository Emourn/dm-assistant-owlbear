import { Combatant, CombatLogEntry, TurnState } from '../types/combat';
import { rollD20 } from './diceEngine';
import { parseMonsterSpellSlots } from './fiveEToolsParser';
import { getPrimaryMonsterTokenUrl } from './portraitEngine';

interface RawMonster {
    name?: string;
    source?: string;
    ac?: unknown;
    hp?: unknown;
    speed?: unknown;
    cr?: unknown;
    dex?: number;
    str?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
    legendary?: unknown;
    legendaryActions?: number;
    save?: Record<string, unknown>;
    spellcasting?: unknown;
    resistances?: unknown;
    resist?: unknown;
    immunities?: unknown;
    immune?: unknown;
    vulnerabilities?: unknown;
    vulnerable?: unknown;
    conditionImmunities?: unknown;
    conditionImmune?: unknown;
    damageNotes?: string;
}


/**
 * Parses a speed string (e.g., "30 ft", "20 ft, fly 60 ft") into its primary numerical value.
 */
export function parseSpeed(speed: unknown): number {
    if (typeof speed === 'number') return speed;

    if (typeof speed === 'object' && speed !== null) {
        // Handle 5e.tools style speed objects: { walk: 30, fly: 60 } or { "walk": 30 }
        const speedObj = speed as Record<string, unknown>;
        if (typeof speedObj.walk === 'number') return speedObj.walk;
        if (typeof speedObj.walk === 'string') return parseInt(speedObj.walk.match(/\d+/)?.[0] || '30', 10);
        // Fallback to first numeric value in any key
        for (const val of Object.values(speedObj)) {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                const m = val.match(/\d+/);
                if (m) return parseInt(m[0], 10);
            }
        }
    }

    if (typeof speed === 'string') {
        const match = speed.match(/\d+/);
        return match ? parseInt(match[0], 10) : 30;
    }

    return 30;
}

function getAverageFromDiceFormula(formula: string): number | null {
    const normalized = formula.trim();
    const match = normalized.match(/^(\d+)\s*d\s*(\d+)\s*([+-]\s*\d+)?$/i);
    if (!match) return null;

    const diceCount = parseInt(match[1], 10);
    const diceFaces = parseInt(match[2], 10);
    const modifierRaw = match[3]?.replace(/\s+/g, '') ?? '0';
    const modifier = parseInt(modifierRaw, 10);
    if (!Number.isFinite(diceCount) || !Number.isFinite(diceFaces) || !Number.isFinite(modifier)) return null;
    if (diceCount <= 0 || diceFaces <= 0) return null;

    return Math.max(1, Math.floor(diceCount * ((diceFaces + 1) / 2) + modifier));
}

function parseMonsterAc(rawAc: unknown): number {
    const coerceAc = (value: unknown): number | null => {
        if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.floor(value));
        if (typeof value === 'string') {
            const m = value.match(/\d+/);
            if (m) return Math.max(1, parseInt(m[0], 10));
        }
        if (typeof value === 'object' && value !== null) {
            const nested = (value as { ac?: unknown }).ac;
            if (typeof nested === 'number' && Number.isFinite(nested)) return Math.max(1, Math.floor(nested));
            if (typeof nested === 'string') {
                const m = nested.match(/\d+/);
                if (m) return Math.max(1, parseInt(m[0], 10));
            }
        }
        return null;
    };

    if (Array.isArray(rawAc)) {
        for (const entry of rawAc) {
            const parsed = coerceAc(entry);
            if (parsed !== null) return parsed;
        }
        return 10;
    }

    return coerceAc(rawAc) ?? 10;
}

function parseMonsterHp(rawHp: unknown): number {
    if (typeof rawHp === 'number' && Number.isFinite(rawHp)) return Math.max(1, Math.floor(rawHp));

    if (typeof rawHp === 'string') {
        const fromFormula = getAverageFromDiceFormula(rawHp);
        if (fromFormula !== null) return fromFormula;
        const match = rawHp.match(/\d+/);
        if (match) return Math.max(1, parseInt(match[0], 10));
        return 10;
    }

    if (typeof rawHp === 'object' && rawHp !== null) {
        const hpObj = rawHp as { average?: unknown; formula?: unknown };
        if (typeof hpObj.average === 'number' && Number.isFinite(hpObj.average)) {
            return Math.max(1, Math.floor(hpObj.average));
        }
        if (typeof hpObj.formula === 'string') {
            const fromFormula = getAverageFromDiceFormula(hpObj.formula);
            if (fromFormula !== null) return fromFormula;
            const match = hpObj.formula.match(/\d+/);
            if (match) return Math.max(1, parseInt(match[0], 10));
        }
    }

    return 10;
}

function parseCrToNumber(rawCr: unknown): number {
    if (typeof rawCr === 'number' && Number.isFinite(rawCr)) return Math.max(0, rawCr);
    if (typeof rawCr === 'string') {
        const normalized = rawCr.trim();
        const fractionMatch = normalized.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (fractionMatch) {
            const numerator = parseInt(fractionMatch[1], 10);
            const denominator = parseInt(fractionMatch[2], 10);
            if (denominator > 0) return numerator / denominator;
        }
        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    }
    if (typeof rawCr === 'object' && rawCr !== null) {
        const nestedCr = (rawCr as { cr?: unknown }).cr;
        return parseCrToNumber(nestedCr);
    }
    return 0;
}

function parseCrLabel(rawCr: unknown): string | undefined {
    if (typeof rawCr === 'string' && rawCr.trim()) return rawCr;
    if (typeof rawCr === 'number' && Number.isFinite(rawCr)) return String(rawCr);
    if (typeof rawCr === 'object' && rawCr !== null) {
        const nested = (rawCr as { cr?: unknown }).cr;
        return parseCrLabel(nested);
    }
    return undefined;
}

function getProfBonusForCr(crNum: number): number {
    return crNum < 5 ? 2 : crNum < 9 ? 3 : crNum < 13 ? 4 : crNum < 17 ? 5 : crNum < 21 ? 6 : crNum < 25 ? 7 : crNum < 29 ? 8 : 9;
}

function stringifyMonsterSpeed(speedRaw: unknown): string {
    if (typeof speedRaw === 'string' && speedRaw.trim()) return speedRaw;
    if (!speedRaw || typeof speedRaw !== 'object') return '30 ft';

    const entries = Object.entries(speedRaw as Record<string, unknown>)
        .map(([k, v]) => {
            if (typeof v === 'number' && Number.isFinite(v)) return `${k} ${v} ft`;
            if (typeof v === 'string') {
                const match = v.match(/\d+/);
                return match ? `${k} ${match[0]} ft` : '';
            }
            if (typeof v === 'object' && v !== null) {
                const nested = v as { number?: unknown };
                if (typeof nested.number === 'number' && Number.isFinite(nested.number)) return `${k} ${nested.number} ft`;
            }
            return '';
        })
        .filter(Boolean);

    return entries.length > 0 ? entries.join(', ') : '30 ft';
}

function normalizeDamageTypeList(raw: unknown): string[] | undefined {
    if (!raw) return undefined;
    const out: string[] = [];

    const visit = (node: unknown): void => {
        if (!node) return;
        if (typeof node === 'string') {
            const cleaned = node.trim();
            if (cleaned) out.push(cleaned.toLowerCase());
            return;
        }
        if (Array.isArray(node)) {
            node.forEach(visit);
            return;
        }
        if (typeof node === 'object') {
            const rec = node as Record<string, unknown>;
            ['res', 'resist', 'immune', 'immunities', 'vulnerable', 'vulnerabilities', 'cond', 'conditionImmune', 'conditionImmunities'].forEach((k) => visit(rec[k]));
        }
    };

    visit(raw);
    const unique = Array.from(new Set(out));
    return unique.length > 0 ? unique : undefined;
}

function extractDamageNotes(raw: unknown): string | undefined {
    if (!raw) return undefined;
    if (typeof raw === 'string') return raw;
    const notes: string[] = [];

    const visit = (node: unknown): void => {
        if (!node) return;
        if (Array.isArray(node)) {
            node.forEach(visit);
            return;
        }
        if (typeof node === 'object') {
            const rec = node as Record<string, unknown>;
            ['note', 'preNote', 'special'].forEach((k) => {
                if (typeof rec[k] === 'string' && rec[k]!.trim()) notes.push(rec[k] as string);
            });
            ['res', 'resist', 'immune', 'immunities', 'vulnerable', 'vulnerabilities', 'cond', 'conditionImmune', 'conditionImmunities'].forEach((k) => visit(rec[k]));
        }
    };

    visit(raw);
    const unique = Array.from(new Set(notes.map((n) => n.trim()).filter(Boolean)));
    return unique.length > 0 ? unique.join('; ') : undefined;
}

export function createBasicTurnState(combatant?: Combatant): TurnState {
    if (!combatant) {
        return {
            hasAction: true,
            hasBonusAction: true,
            hasReaction: true,
            extraActions: 0,
            hasHasteAction: false,
            hasCastLeveledSpell: false,
            hasCastBonusActionSpell: false,
            hasUsedHasteAction: false,
            movementRemaining: 30,
            movementUsedFt: 0,
            notes: ''
        };
    }

    let speed = parseSpeed(combatant.speed);
    const conditions = combatant.conditions.map(c => c.name.toLowerCase());

    // 1. Check for Speed 0 conditions
    const zeroSpeedConditions = ['grappled', 'restrained', 'paralyzed', 'petrified', 'stunned', 'unconscious'];
    if (conditions.some(c => zeroSpeedConditions.includes(c))) {
        speed = 0;
    }

    // 1b. Exhaustion penalties (PHB): Level 2 = half speed, Level 5 = speed 0
    const exhaustion = combatant.exhaustion || 0;
    if (exhaustion >= 5) {
        speed = 0;
    } else if (exhaustion >= 2) {
        speed = Math.floor(speed / 2);
    }

    // 2. Initial state
    const state: TurnState = {
        hasAction: true,
        hasBonusAction: true,
        hasReaction: true,
        extraActions: combatant.extraActions || 0,
        hasHasteAction: false,
        hasCastLeveledSpell: false,
        hasCastBonusActionSpell: false,
        hasUsedHasteAction: false,
        movementRemaining: speed,
        movementUsedFt: 0,
        notes: ''
    };

    // 3. Handle Haste
    if (conditions.includes('hasted') || conditions.includes('haste')) {
        state.hasHasteAction = true;
        state.movementRemaining *= 2;
        state.notes += 'Hasted (+1 Action, Double Speed). ';
    }

    // 3b. Exhaustion combat notes
    if (exhaustion >= 1 && exhaustion < 5) {
        state.notes += `Exhaustion Lv${exhaustion} (-${exhaustion} to all d20 rolls). `;
    } else if (exhaustion >= 5) {
        state.notes += `Exhaustion Lv${exhaustion} (Speed 0, -${exhaustion} to all d20 rolls). `;
    }

    // 4. Handle Slow
    if (conditions.includes('slowed') || conditions.includes('slow')) {
        state.hasReaction = false;
        state.movementRemaining = Math.floor(state.movementRemaining / 2);
        state.notes += 'Slowed (No Reaction, Half Speed, Action OR Bonus). ';
    }

    // 5. Handle Surprised/Incapacitated
    const incapacitatedConditions = ['incapacitated', 'paralyzed', 'petrified', 'stunned', 'unconscious'];
    const isIncapacitated = conditions.some(c => incapacitatedConditions.includes(c));

    if (combatant.isSurprised || isIncapacitated) {
        state.hasAction = false;
        state.hasBonusAction = false;
        state.hasReaction = false;
        state.extraActions = 0;
        state.hasHasteAction = false;
        state.movementRemaining = 0;
        state.notes = isIncapacitated ? 'Incapacitated (No actions)' : 'Surprised (No actions)';
    }

    return state;
}

export function generateLogEntry(message: string, type: CombatLogEntry['type'] = 'system', combatantId?: string, details?: unknown): CombatLogEntry {
    return {
        id: crypto.randomUUID(),
        round: 0, // This gets updated by the store when inserted
        timestamp: Date.now(),
        message,
        type,
        combatantId,
        details
    };
}

/**
 * Sorts array of combatants based on Initiative score.
 * Tied initiative goes to the highest Dexterity score.
 */
export function sortCombatantsByInitiative(combatants: Combatant[]): Combatant[] {
    return [...combatants].sort((a, b) => {
        const scoreA = a.initiativeScore ?? -99;
        const scoreB = b.initiativeScore ?? -99;

        if (scoreA !== scoreB) {
            return scoreB - scoreA; // Descending
        }

        // Tie breaker: Dexterity
        return b.dexterityScore - a.dexterityScore;
    });
}

/**
 * Rolls initiative for any combatant that hasn't rolled yet.
 */
export function rollMissingInitiatives(combatants: Combatant[]): { updatedCombatants: Combatant[], logs: CombatLogEntry[] } {
    const logs: CombatLogEntry[] = [];
    const updated = combatants.map(c => {
        if (typeof c.initiativeScore === 'number') return c; // Already rolled

        const result = rollD20(c.initiativeMod);
        logs.push(generateLogEntry(`${c.name} rolled Initiative: ${result.total} (Roll: ${result.rolls[0]}, Mod: ${c.initiativeMod})`, 'roll', c.id, result));

        return {
            ...c,
            initiativeScore: result.total
        };
    });

    return { updatedCombatants: updated, logs };
}

/**
 * Gets the next combatant in the order, looping back to the beginning if at the end.
 * Skips dead combatants.
 */
export function getNextCombatant(combatants: Combatant[], currentId: string | null): string | null {
    if (combatants.length === 0) return null;

    const aliveCombatants = combatants.filter(c => !c.isDead);
    if (aliveCombatants.length === 0) return null;

    if (!currentId) return aliveCombatants[0].id;

    const currentIndex = aliveCombatants.findIndex(c => c.id === currentId);
    if (currentIndex === -1 || currentIndex === aliveCombatants.length - 1) {
        return aliveCombatants[0].id; // Loop to top
    }

    return aliveCombatants[currentIndex + 1].id;
}

/**
 * Converts a raw 5e.tools monster payload into an app Combatant record.
 */
export function convertMonsterToCombatant(item: RawMonster, customName?: string): Combatant {
    const dexScore = typeof item.dex === 'number' ? item.dex : 10;
    const strScore = typeof item.str === 'number' ? item.str : 10;
    const conScore = typeof item.con === 'number' ? item.con : 10;
    const intScore = typeof item.int === 'number' ? item.int : 10;
    const wisScore = typeof item.wis === 'number' ? item.wis : 10;
    const chaScore = typeof item.cha === 'number' ? item.cha : 10;
    const dexMod = Math.floor((dexScore - 10) / 2);
    const speed = stringifyMonsterSpeed(item.speed);
    const ac = parseMonsterAc(item.ac);
    const hp = parseMonsterHp(item.hp);
    const crNum = parseCrToNumber(item.cr);
    const profBonus = getProfBonusForCr(crNum);
    const crLabel = parseCrLabel(item.cr);

    const resistances = normalizeDamageTypeList(item.resistances ?? item.resist);
    const immunities = normalizeDamageTypeList(item.immunities ?? item.immune);
    const vulnerabilities = normalizeDamageTypeList(item.vulnerabilities ?? item.vulnerable);
    const conditionImmunities = normalizeDamageTypeList(item.conditionImmunities ?? item.conditionImmune);
    const damageNotes = item.damageNotes ?? extractDamageNotes(item.resist ?? item.immune ?? item.vulnerable);

    // Legendary actions
    const legendaryMax = item.legendary ? (item.legendaryActions ?? 3) : 0;

    // Saving throw proficiencies
    const saveProfs: string[] = [];
    if (item.save) {
        Object.keys(item.save).forEach(k => saveProfs.push(k));
    }

    return {
        id: crypto.randomUUID(),
        type: 'monster',
        name: customName || item.name || 'Unknown Monster',
        ac,
        maxHp: hp,
        currentHp: hp,
        tempHp: 0,
        speed,
        initiativeMod: dexMod,
        initiativeScore: null,
        dexterityScore: dexScore,
        abilityScores: {
            str: strScore, dex: dexScore, con: conScore,
            int: intScore, wis: wisScore, cha: chaScore
        },
        proficiencyBonus: profBonus,
        savingThrowProficiencies: saveProfs,
        legendaryActionsMax: legendaryMax,
        legendaryActionsRemaining: legendaryMax,
        conditions: [],
        monsterData: item,
        cr: crLabel,
        resistances,
        immunities,
        vulnerabilities,
        conditionImmunities,
        damageNotes,
        spellSlots: item.spellcasting ? parseMonsterSpellSlots(Array.isArray(item.spellcasting) ? item.spellcasting : [item.spellcasting]) : undefined,
        isConcentrating: false,
        exhaustion: 0,
        portraitUrl: getPrimaryMonsterTokenUrl(item.name, item.source)
    };
}
