import { Character } from '../src/types/character';
import { getMasteryProperty, hasMastery, resolveMasteryEffect } from '../src/engine/weaponMasteryEngine';

const mockCharacter: Character = {
    id: 'test-id',
    name: 'Master Fighter',
    masteredWeapons: ['Longsword', 'Longbow'],
    abilityScores: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
    // ... other properties not needed for basic engine test
} as any;

console.log('--- Weapon Mastery Engine Test ---');

// Test 1: hasMastery
console.log('Test 1: hasMastery(Longsword) - Expected: true');
console.log('Result:', hasMastery(mockCharacter, 'Longsword'));

console.log('Test 1b: hasMastery(Greataxe) - Expected: false');
console.log('Result:', hasMastery(mockCharacter, 'Greataxe'));

// Test 2: getMasteryProperty
console.log('\nTest 2: getMasteryProperty(Longsword) - Expected: Sap');
const lsProp = getMasteryProperty('Longsword');
console.log('Result:', lsProp?.name, '-', lsProp?.description);

console.log('\nTest 2b: getMasteryProperty(Longbow) - Expected: Slow');
const lbProp = getMasteryProperty('Longbow');
console.log('Result:', lbProp?.name, '-', lbProp?.description);

// Test 3: resolveMasteryEffect
console.log('\nTest 3: resolveMasteryEffect(Longsword, Hit)');
const effect = resolveMasteryEffect(mockCharacter, 'Longsword', true, 18, 15);
console.log('Result:', effect);

console.log('\nTest 3b: resolveMasteryEffect(Longbow, Hit)');
const effect2 = resolveMasteryEffect(mockCharacter, 'Longbow', true, 18, 15);
console.log('Result:', effect2);

console.log('\n--- Test Complete ---');
