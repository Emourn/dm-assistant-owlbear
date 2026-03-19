export const CR_TO_XP: Record<string, number> = {
    '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
    '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
    '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
    '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
    '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
    '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000,
    '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000
};

export const XP_THRESHOLDS: Record<number, { easy: number, medium: number, hard: number, deadly: number, daily: number }> = {
    1: { easy: 25, medium: 50, hard: 75, deadly: 100, daily: 300 },
    2: { easy: 50, medium: 100, hard: 150, deadly: 200, daily: 600 },
    3: { easy: 75, medium: 150, hard: 225, deadly: 400, daily: 1200 },
    4: { easy: 125, medium: 250, hard: 375, deadly: 500, daily: 1700 },
    5: { easy: 250, medium: 500, hard: 750, deadly: 1100, daily: 3500 },
    6: { easy: 300, medium: 600, hard: 900, deadly: 1400, daily: 4000 },
    7: { easy: 350, medium: 750, hard: 1100, deadly: 1700, daily: 5000 },
    8: { easy: 450, medium: 900, hard: 1400, deadly: 2100, daily: 6000 },
    9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400, daily: 7500 },
    10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800, daily: 9000 },
    11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600, daily: 10500 },
    12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500, daily: 11500 },
    13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100, daily: 13500 },
    14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700, daily: 15000 },
    15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400, daily: 18000 },
    16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200, daily: 20000 },
    17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800, daily: 25000 },
    18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500, daily: 27000 },
    19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900, daily: 30000 },
    20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700, daily: 40000 }
};

export function getEncounterMultiplier(monsterCount: number, partySize: number = 4): number {
    if (monsterCount === 0) return 0;

    // Base multipliers
    const steps = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
    let stepIndex = 1; // Default x1 for 1 monster

    if (monsterCount === 2) stepIndex = 2; // 1.5
    else if (monsterCount >= 3 && monsterCount <= 6) stepIndex = 3; // 2
    else if (monsterCount >= 7 && monsterCount <= 10) stepIndex = 4; // 2.5
    else if (monsterCount >= 11 && monsterCount <= 14) stepIndex = 5; // 3
    else if (monsterCount >= 15) stepIndex = 6; // 4

    // Adjust for party size
    if (partySize < 3) stepIndex = Math.min(steps.length - 1, stepIndex + 1);
    if (partySize > 5) stepIndex = Math.max(0, stepIndex - 1);

    return steps[stepIndex];
}

export function calculateEncounterDifficulty(partyLevels: number[], monsterCRs: (string | number)[]) {
    let totalXP = 0;
    monsterCRs.forEach(cr => {
        const crStr = String(cr);
        totalXP += CR_TO_XP[crStr] || 0;
    });

    const partySize = partyLevels.length;
    const multiplier = getEncounterMultiplier(monsterCRs.length, partySize);
    const adjustedXP = totalXP * multiplier;

    const thresholds = { easy: 0, medium: 0, hard: 0, deadly: 0, daily: 0 };
    partyLevels.forEach(level => {
        const lvStr = level > 20 ? 20 : level < 1 ? 1 : level;
        const t = XP_THRESHOLDS[lvStr];
        if (t) {
            thresholds.easy += t.easy;
            thresholds.medium += t.medium;
            thresholds.hard += t.hard;
            thresholds.deadly += t.deadly;
            thresholds.daily += t.daily;
        }
    });

    let difficulty: 'Trivial' | 'Easy' | 'Medium' | 'Hard' | 'Deadly' = 'Trivial';
    if (adjustedXP >= thresholds.deadly) difficulty = 'Deadly';
    else if (adjustedXP >= thresholds.hard) difficulty = 'Hard';
    else if (adjustedXP >= thresholds.medium) difficulty = 'Medium';
    else if (adjustedXP >= thresholds.easy) difficulty = 'Easy';

    return { totalXP, adjustedXP, difficulty, thresholds, dailyBudget: thresholds.daily, multiplier };
}

export function getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
        case 'Easy': return 'bg-green-900/40 text-green-400 border-green-800';
        case 'Medium': return 'bg-yellow-900/40 text-yellow-400 border-yellow-800';
        case 'Hard': return 'bg-orange-900/40 text-orange-400 border-orange-800';
        case 'Deadly': return 'bg-red-900/40 text-red-500 border-red-800';
        default: return 'bg-stone-800 text-stone-400 border-stone-700';
    }
}
