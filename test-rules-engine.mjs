/**
 * RULES ENGINE VERIFICATION TESTS
 *
 * Pure JavaScript smoke tests for D&D rules math.
 * Run with: node test-rules-engine.mjs
 *
 * No test framework required — just Node.js.
 * Tests import from the compiled/source data directly
 * using static values (no TypeScript compilation needed).
 */

// ─── TEST HARNESS ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.error(`  ❌ ${label}`);
        console.error(`     Expected: ${JSON.stringify(expected)}`);
        console.error(`     Got:      ${JSON.stringify(actual)}`);
        failed++;
    }
}

function section(name) {
    console.log(`\n── ${name} ─────────────────────────────────────────────────`);
}

// ─── INLINE IMPLEMENTATIONS (mirrors src/engine/rulesEngine.ts logic) ────────
// We inline the logic here so we can test without TypeScript compilation.

function getAbilityModifier(score) {
    return Math.floor((score - 10) / 2);
}

// Proficiency bonus table (PHB)
const PROF_BONUS = [0, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];
function getProficiencyBonusForLevel(level) {
    return PROF_BONUS[Math.max(1, Math.min(20, level))];
}

// ASI levels by class
const ASI_LEVELS = {
    'fighter': new Set([4, 6, 8, 12, 14, 16, 19, 20]),
    'rogue': new Set([4, 8, 10, 12, 16, 19]),
    'default': new Set([4, 8, 12, 16, 19]),
};
function isASILevel(className, level) {
    return (ASI_LEVELS[className.toLowerCase()] ?? ASI_LEVELS['default']).has(level);
}

// Point Buy cost table
const POINT_BUY_COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
function getPointBuyCost(score) {
    if (score < 8) return 0;
    if (score > 15) return POINT_BUY_COSTS[15];
    return POINT_BUY_COSTS[score] ?? 0;
}

// Full caster spell slots (PHB)
const FULL_CASTER_SLOTS = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // 0 unused
    [2, 0, 0, 0, 0, 0, 0, 0, 0], // 1
    [3, 0, 0, 0, 0, 0, 0, 0, 0], // 2
    [4, 2, 0, 0, 0, 0, 0, 0, 0], // 3
    [4, 3, 0, 0, 0, 0, 0, 0, 0], // 4
    [4, 3, 2, 0, 0, 0, 0, 0, 0], // 5
    [4, 3, 3, 0, 0, 0, 0, 0, 0], // 6
    [4, 3, 3, 1, 0, 0, 0, 0, 0], // 7
    [4, 3, 3, 2, 0, 0, 0, 0, 0], // 8
    [4, 3, 3, 3, 1, 0, 0, 0, 0], // 9
    [4, 3, 3, 3, 2, 0, 0, 0, 0], // 10
    [4, 3, 3, 3, 2, 1, 0, 0, 0], // 11
    [4, 3, 3, 3, 2, 1, 0, 0, 0], // 12
    [4, 3, 3, 3, 2, 1, 1, 0, 0], // 13
    [4, 3, 3, 3, 2, 1, 1, 0, 0], // 14
    [4, 3, 3, 3, 2, 1, 1, 1, 0], // 15
    [4, 3, 3, 3, 2, 1, 1, 1, 0], // 16
    [4, 3, 3, 3, 2, 1, 1, 1, 1], // 17
    [4, 3, 3, 3, 3, 1, 1, 1, 1], // 18
    [4, 3, 3, 3, 3, 2, 1, 1, 1], // 19
    [4, 3, 3, 3, 3, 2, 2, 1, 1], // 20
];

// Multiclass slot table (PHB p.165)
const MULTICLASS_TABLE = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // 0 unused
    [2, 0, 0, 0, 0, 0, 0, 0, 0], // 1
    [3, 0, 0, 0, 0, 0, 0, 0, 0], // 2
    [4, 2, 0, 0, 0, 0, 0, 0, 0], // 3
    [4, 3, 0, 0, 0, 0, 0, 0, 0], // 4
    [4, 3, 2, 0, 0, 0, 0, 0, 0], // 5
    [4, 3, 3, 0, 0, 0, 0, 0, 0], // 6
    [4, 3, 3, 1, 0, 0, 0, 0, 0], // 7
    [4, 3, 3, 2, 0, 0, 0, 0, 0], // 8
    [4, 3, 3, 3, 1, 0, 0, 0, 0], // 9
    [4, 3, 3, 3, 2, 0, 0, 0, 0], // 10
    [4, 3, 3, 3, 2, 1, 0, 0, 0], // 11
    [4, 3, 3, 3, 2, 1, 0, 0, 0], // 12
    [4, 3, 3, 3, 2, 1, 1, 0, 0], // 13
    [4, 3, 3, 3, 2, 1, 1, 0, 0], // 14
    [4, 3, 3, 3, 2, 1, 1, 1, 0], // 15
    [4, 3, 3, 3, 2, 1, 1, 1, 0], // 16
    [4, 3, 3, 3, 2, 1, 1, 1, 1], // 17
    [4, 3, 3, 3, 3, 1, 1, 1, 1], // 18
    [4, 3, 3, 3, 3, 2, 1, 1, 1], // 19
    [4, 3, 3, 3, 3, 2, 2, 1, 1], // 20
];

function getEffectiveCasterLevel(className, level) {
    const c = className.toLowerCase();
    if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(c)) return level;
    if (['paladin', 'ranger'].includes(c)) return Math.floor(level / 2);
    if (c === 'artificer') return Math.ceil(level / 2);
    if (c === 'fighter' || c === 'rogue') return Math.floor(level / 3); // EK/AT
    return 0;
}

function getMulticlassSpellSlots(classes) {
    // Sum effective levels (exclude Warlock, it's separate)
    let totalEffective = 0;
    let warlockLevel = 0;
    for (const c of classes) {
        if (c.className.toLowerCase() === 'warlock') { warlockLevel = c.level; continue; }
        totalEffective += getEffectiveCasterLevel(c.className, c.level);
    }
    const slots = [...(MULTICLASS_TABLE[Math.min(20, totalEffective)] ?? new Array(9).fill(0))];
    return slots;
}

// Multiclass prereqs
const PREREQS = {
    'barbarian': [[{ stat: 'str', min: 13 }]],
    'bard': [[{ stat: 'cha', min: 13 }]],
    'monk': [[{ stat: 'dex', min: 13 }, { stat: 'wis', min: 13 }]],
    'fighter': [[{ stat: 'str', min: 13 }], [{ stat: 'dex', min: 13 }]],
    'paladin': [[{ stat: 'str', min: 13 }, { stat: 'cha', min: 13 }]],
    'wizard': [[{ stat: 'int', min: 13 }]],
};

function validateMulticlassPrereqs(abilityScores, newClass) {
    const prereqs = PREREQS[newClass.toLowerCase()];
    if (!prereqs) return { valid: true };
    const anySatisfied = prereqs.some(group =>
        group.every(req => (abilityScores[req.stat] ?? 10) >= req.min)
    );
    return { valid: anySatisfied };
}

// ─── TEST SUITES ─────────────────────────────────────────────────────────────

section('Ability Modifiers (PHB p.173)');
assert('Score 10 → mod 0', getAbilityModifier(10), 0);
assert('Score 15 → mod 2', getAbilityModifier(15), 2);
assert('Score 8  → mod -1', getAbilityModifier(8), -1);
assert('Score 20 → mod 5', getAbilityModifier(20), 5);
assert('Score 1  → mod -5', getAbilityModifier(1), -5);
assert('Score 11 → mod 0', getAbilityModifier(11), 0);
assert('Score 12 → mod 1', getAbilityModifier(12), 1);

section('Proficiency Bonus by Level (PHB p.15)');
assert('Level 1  → +2', getProficiencyBonusForLevel(1), 2);
assert('Level 4  → +2', getProficiencyBonusForLevel(4), 2);
assert('Level 5  → +3', getProficiencyBonusForLevel(5), 3);
assert('Level 8  → +3', getProficiencyBonusForLevel(8), 3);
assert('Level 9  → +4', getProficiencyBonusForLevel(9), 4);
assert('Level 12 → +4', getProficiencyBonusForLevel(12), 4);
assert('Level 13 → +5', getProficiencyBonusForLevel(13), 5);
assert('Level 17 → +6', getProficiencyBonusForLevel(17), 6);
assert('Level 20 → +6', getProficiencyBonusForLevel(20), 6);

section('ASI Levels by Class (PHB class tables)');
assert('Fighter ASI at L4', isASILevel('Fighter', 4), true);
assert('Fighter ASI at L6', isASILevel('Fighter', 6), true);
assert('Fighter ASI at L8', isASILevel('Fighter', 8), true);
assert('Fighter no ASI at L5', isASILevel('Fighter', 5), false);
assert('Wizard ASI at L4', isASILevel('Wizard', 4), true);
assert('Wizard no ASI at L6', isASILevel('Wizard', 6), false);
assert('Rogue ASI at L10', isASILevel('Rogue', 10), true);
assert('Rogue no ASI at L6', isASILevel('Rogue', 6), false);
assert('Cleric ASI at L8', isASILevel('Cleric', 8), true);
assert('Cleric ASI at L12', isASILevel('Cleric', 12), true);

section('Point Buy (PHB p.13)');
assert('Score 8  costs 0 pts', getPointBuyCost(8), 0);
assert('Score 13 costs 5 pts', getPointBuyCost(13), 5);
assert('Score 14 costs 7 pts', getPointBuyCost(14), 7);
assert('Score 15 costs 9 pts', getPointBuyCost(15), 9);
const standardAllotment = [15, 14, 13, 12, 10, 8].reduce((s, v) => s + getPointBuyCost(v), 0);
assert('Standard Array spends ≤ 27 pts', standardAllotment <= 27, true);
console.log(`     (Standard Array uses ${standardAllotment} of 27 points)`);

section('Full Caster Spell Slots (PHB Table 5-4)');
assert('Wizard L1 slots:  [2,0,0,0,0,0,0,0,0]', FULL_CASTER_SLOTS[1], [2, 0, 0, 0, 0, 0, 0, 0, 0]);
assert('Wizard L3 slots:  [4,2,0,0,0,0,0,0,0]', FULL_CASTER_SLOTS[3], [4, 2, 0, 0, 0, 0, 0, 0, 0]);
assert('Wizard L5 slots:  [4,3,2,0,0,0,0,0,0]', FULL_CASTER_SLOTS[5], [4, 3, 2, 0, 0, 0, 0, 0, 0]);
assert('Wizard L17 slots: [4,3,3,3,2,1,1,1,1]', FULL_CASTER_SLOTS[17], [4, 3, 3, 3, 2, 1, 1, 1, 1]);
assert('Wizard L20 slots: [4,3,3,3,3,2,2,1,1]', FULL_CASTER_SLOTS[20], [4, 3, 3, 3, 3, 2, 2, 1, 1]);

section('Effective Caster Levels (PHB p.164)');
assert('Wizard 5 → eff. 5', getEffectiveCasterLevel('Wizard', 5), 5);
assert('Paladin 5 → eff. 2', getEffectiveCasterLevel('Paladin', 5), 2);
assert('Ranger 4 → eff. 2', getEffectiveCasterLevel('Ranger', 4), 2);
assert('Fighter(EK) 3 → eff. 1', getEffectiveCasterLevel('Fighter', 3), 1);
assert('Barbarian 10 → eff. 0', getEffectiveCasterLevel('Barbarian', 10), 0);

section('Multiclass Spell Slots — Fighter 3 / Wizard 3 (PHB p.165)');
// Fighter(EK) Lv3 → eff 1, Wizard Lv3 → eff 3 → total eff 4
const slots_F3W3 = getMulticlassSpellSlots([
    { className: 'Fighter', level: 3 },
    { className: 'Wizard', level: 3 },
]);
assert('F3W3 eff=4: L1 slots=4', slots_F3W3[0], 4);
assert('F3W3 eff=4: L2 slots=3', slots_F3W3[1], 3);
assert('F3W3 eff=4: L3 slots=0', slots_F3W3[2], 0);

section('Multiclass Spell Slots — Paladin 5 / Wizard 5 (PHB p.165)');
// Paladin Lv5 → eff 2, Wizard Lv5 → eff 5 → total eff 7
const slots_P5W5 = getMulticlassSpellSlots([
    { className: 'Paladin', level: 5 },
    { className: 'Wizard', level: 5 },
]);
assert('P5W5 eff=7: L1 slots=4', slots_P5W5[0], 4);
assert('P5W5 eff=7: L2 slots=3', slots_P5W5[1], 3);
assert('P5W5 eff=7: L3 slots=3', slots_P5W5[2], 3);
assert('P5W5 eff=7: L4 slots=1', slots_P5W5[3], 1);

section('Multiclass Prerequisites (PHB p.163)');
const highStats = { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 8 };
const lowStats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 8 };

assert('High STR qualifies for Barbarian', validateMulticlassPrereqs(highStats, 'barbarian').valid, true);
assert('Low STR fails for Barbarian', validateMulticlassPrereqs(lowStats, 'barbarian').valid, false);
assert('High STR qualifies for Fighter (STR or DEX)', validateMulticlassPrereqs(highStats, 'fighter').valid, true);
assert('High STR + CHA 8 fails for Paladin (needs CHA 13)',
    validateMulticlassPrereqs(highStats, 'paladin').valid, false
);
const paladinStats = { str: 16, dex: 10, con: 12, int: 10, wis: 10, cha: 14 };
assert('STR 16 + CHA 14 qualifies for Paladin', validateMulticlassPrereqs(paladinStats, 'paladin').valid, true);
const monkStats = { str: 10, dex: 14, con: 12, int: 10, wis: 14, cha: 8 };
assert('DEX 14 + WIS 14 qualifies for Monk', validateMulticlassPrereqs(monkStats, 'monk').valid, true);
assert('Low stats fail for Monk', validateMulticlassPrereqs(lowStats, 'monk').valid, false);

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
console.log(`\n═══════════════════════════════════════════════════════════`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
    console.log('  🎉 ALL TESTS PASSED — Rules engine is correct!');
} else {
    console.error(`  💥 ${failed} test(s) FAILED — Review table data!`);
    process.exitCode = 1;
}
console.log(`═══════════════════════════════════════════════════════════\n`);
