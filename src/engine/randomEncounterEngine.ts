import { fetch5eData } from './fiveEToolsParser';
import { calculateEncounterDifficulty, CR_TO_XP } from './encounterDifficulty';

export interface RandomEncounterResult {
    monsters: any[];
    difficulty: string;
    totalXP: number;
    adjustedXP: number;
}

/**
 * Generates a random set of monsters that fit a specific difficulty for a party.
 */
export async function generateRandomEncounter(
    partyLevels: number[],
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Deadly'
): Promise<RandomEncounterResult | null> {
    if (partyLevels.length === 0) return null;

    // 1. Calculate the target XP budget
    const dummy = calculateEncounterDifficulty(partyLevels, []);
    const targetXP = dummy.thresholds[difficulty.toLowerCase() as keyof typeof dummy.thresholds];

    // Calculate a "safety cap" to avoid infinite loops or crazy high CRs
    const avgPartyLevel = partyLevels.reduce((a, b) => a + b, 0) / partyLevels.length;
    const maxCr = Math.ceil(avgPartyLevel * 1.5);

    // 2. Fetch a pool of potential monsters
    // We'll focus on the core books for "random" encounters to keep it thematic
    const mmData = await fetch5eData('bestiary/bestiary-mm.json');
    const xmmData = await fetch5eData('bestiary/bestiary-xmm.json'); // 2024 MM

    let monsterPool = [...(mmData?.monster || []), ...(xmmData?.monster || [])];

    // Filter out very high CRs and non-combatants
    monsterPool = monsterPool.filter(m => {
        const crValue = typeof m.cr === 'string' ? m.cr : (m.cr?.cr || '0');
        // Simple numeric conversion for comparison
        let numericCr = 0;
        if (crValue.includes('/')) {
            const [num, den] = crValue.split('/').map(Number);
            numericCr = num / den;
        } else {
            numericCr = Number(crValue) || 0;
        }
        return numericCr <= maxCr && numericCr > 0;
    });

    if (monsterPool.length === 0) return null;

    // 3. Filling Algorithm
    const selectedMonsters: any[] = [];
    let currentDifficultyData = calculateEncounterDifficulty(partyLevels, []);

    // Limit attempts to avoid infinite loops
    let attempts = 0;
    const MAX_ATTEMPTS = 20;

    while (currentDifficultyData.adjustedXP < targetXP && attempts < MAX_ATTEMPTS) {
        attempts++;

        // Pick a monster that roughly fits the remaining budget
        const remainingXP = targetXP - currentDifficultyData.adjustedXP;

        // Find monsters in the pool that could fit
        // Note: multiplier changes as we add more, so this is an approximation
        const potentialNext = monsterPool.filter(m => {
            const crValue = typeof m.cr === 'string' ? m.cr : (m.cr?.cr || '0');
            const xp = CR_TO_XP[crValue] || 0;
            return xp <= remainingXP || selectedMonsters.length === 0;
        });

        if (potentialNext.length === 0) break;

        const picked = potentialNext[Math.floor(Math.random() * potentialNext.length)];
        selectedMonsters.push(picked);

        // Recalculate
        currentDifficultyData = calculateEncounterDifficulty(
            partyLevels,
            selectedMonsters.map(m => typeof m.cr === 'string' ? m.cr : (m.cr?.cr || '0'))
        );

        // If we are significantly over the target, maybe remove the last one and stop
        // unless it's the first monster
        if (currentDifficultyData.adjustedXP > targetXP * 1.5 && selectedMonsters.length > 1) {
            selectedMonsters.pop();
            break;
        }
    }

    // 4. Final mapping to our internal format
    const finalMonsters = selectedMonsters.map(m => {
        const cr = typeof m.cr === 'string' ? m.cr : (m.cr?.cr || '0');
        const ac = m.ac ? (typeof m.ac[0] === 'number' ? m.ac[0] : m.ac[0]?.ac || 10) : 10;
        const hp = m.hp ? m.hp.average || 10 : 10;

        return {
            ...m,
            cr,
            ac,
            hp,
            currentHp: hp,
            maxHp: hp,
        };
    });

    const finalDiff = calculateEncounterDifficulty(partyLevels, finalMonsters.map(m => m.cr));

    return {
        monsters: finalMonsters,
        difficulty: finalDiff.difficulty,
        totalXP: finalDiff.totalXP,
        adjustedXP: finalDiff.adjustedXP
    };
}
