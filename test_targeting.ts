import { parseActionRange } from './src/engine/targetingEngine';

const testCases = [
    {
        name: "Fireball",
        action: { range: "150 ft", description: "A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw." },
        expected: { rangeFt: 150, aoeType: 'circle', aoeRadiusFt: 20 }
    },
    {
        name: "Cone of Cold",
        action: { range: "Self (60-foot cone)", description: "A blast of cold air erupts from your hands. Each creature in a 60-foot cone must make a Constitution saving throw." },
        expected: { rangeFt: 0, aoeType: 'cone', aoeRadiusFt: 60 }
    },
    {
        name: "Lightning Bolt",
        action: { range: "Self (100-foot line)", description: "A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you in a direction you choose." },
        expected: { rangeFt: 0, aoeType: 'line', aoeRadiusFt: 100 }
    },
    {
        name: "Thunderwave",
        action: { range: "Self (15-foot cube)", description: "A wave of thunderous force sweeps out from you. Each creature in a 15-foot cube originating from you must make a Constitution saving throw." },
        expected: { rangeFt: 0, aoeType: 'cube', aoeRadiusFt: 15 }
    },
    {
        name: "Shatter",
        action: { range: "60 ft", description: "A sudden loud ringing noise, painfully intense, erupts from a point of your choice within range. Each creature in a 10-foot-radius sphere centered on that point must make a Constitution saving throw." },
        expected: { rangeFt: 60, aoeType: 'circle', aoeRadiusFt: 10 }
    },
    {
        name: "Moonbeam",
        action: { range: "120 ft", description: "A silvery beam of pale light shines down in a 5-foot-radius, 40-foot-high cylinder centered on a point within range." },
        expected: { rangeFt: 120, aoeType: 'circle', aoeRadiusFt: 5 }
    },
    {
        name: "Cure Wounds",
        action: { range: "Touch", description: "A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier." },
        expected: { rangeFt: 5 } // touch is 5ft
    },
    {
        name: "Magic Missile",
        action: { range: "120 ft", description: "You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range." },
        expected: { rangeFt: 120 }
    },
    {
        name: "Burning Hands",
        action: { range: "Self (15-foot cone)", description: "As you hold your hands with thumbs touching and fingers spread, a thin sheet of flames shoots forth from your outstretched fingertips. Each creature in a 15-foot cone must make a Dexterity saving throw." },
        expected: { rangeFt: 0, aoeType: 'cone', aoeRadiusFt: 15 }
    }
];

let allPassed = true;

testCases.forEach(tc => {
    const result = parseActionRange(tc.action as any);

    let passed = true;
    if (result.rangeFt !== tc.expected.rangeFt) passed = false;
    if (result.aoeType !== tc.expected.aoeType) passed = false;
    if (result.aoeRadiusFt !== tc.expected.aoeRadiusFt) passed = false;

    if (passed) {
        console.log(`✅ ${tc.name} passed.`);
    } else {
        console.log(`❌ ${tc.name} failed!`);
        console.log(`Expected:`, tc.expected);
        console.log(`Got:`, result);
        allPassed = false;
    }
});

if (allPassed) {
    console.log("ALL TESTS PASSED.");
} else {
    console.log("SOME TESTS FAILED.");
}
