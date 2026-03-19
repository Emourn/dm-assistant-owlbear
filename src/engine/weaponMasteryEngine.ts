import { Character } from '../types/character';
import EQUIP_DATA from '../data/rules2024/equipment.json';

export interface MasteryProperty {
    name: string;
    description: string;
}

/**
 * Normalizes a weapon name for lookup (removes (2024) suffixes, trims, lowercase).
 */
export function normalizeWeaponName(name: string): string {
    if (!name) return '';
    return name.replace(/\s*\(?\s*2024\s*\)?\s*/gi, '').trim().toLowerCase();
}

/**
 * Checks if a character has mastery over a specific weapon.
 * In the 2024 rules, this is usually granted by a class feature.
 */
export function hasMastery(character: Character, weaponName: string): boolean {
    if (!character.masteredWeapons) return false;
    const normalizedTarget = normalizeWeaponName(weaponName);
    return character.masteredWeapons.some(w => normalizeWeaponName(w) === normalizedTarget);
}

/**
 * Retrieves the mastery property for a given weapon from the 2024 equipment data.
 */
export function getMasteryProperty(weaponName: string): MasteryProperty | null {
    const normalizedTarget = normalizeWeaponName(weaponName);
    const weapon = (EQUIP_DATA.weapons as any[]).find(w => normalizeWeaponName(w.name) === normalizedTarget);
    if (!weapon || !weapon.mastery) return null;

    const prop = (EQUIP_DATA.masteryProperties as any[]).find(p => p.name.toLowerCase() === weapon.mastery.toLowerCase());
    return prop || null;
}

/**
 * Resolves the mechanical trigger for a weapon mastery.
 * Some masteries are automatic (Graze, Slow, Vex) while others require choices or saves (Topple, Push).
 */
export function resolveMasteryEffect(
    character: Character,
    weaponName: string,
    isHit: boolean,
    attackRoll: number,
    targetAC: number
): {
    type: 'automatic' | 'save' | 'choice';
    propertyName: string;
    description: string;
    trigger?: string;
} | null {
    void attackRoll;
    void targetAC;
    if (!hasMastery(character, weaponName)) return null;

    const prop = getMasteryProperty(weaponName);
    if (!prop) return null;

    // Handle specific property triggers
    switch (prop.name) {
        case 'Graze':
            if (!isHit) return { type: 'automatic', propertyName: prop.name, description: prop.description, trigger: 'miss' };
            break;
        case 'Cleave':
            if (isHit) return { type: 'choice', propertyName: prop.name, description: prop.description, trigger: 'hit' };
            break;
        case 'Topple':
            if (isHit) return { type: 'save', propertyName: prop.name, description: prop.description, trigger: 'hit' };
            break;
        case 'Push':
        case 'Sap':
        case 'Slow':
        case 'Vex':
            if (isHit) return { type: 'automatic', propertyName: prop.name, description: prop.description, trigger: 'hit' };
            break;
        case 'Nick':
            // Nick is a passive modification to the Light property (no trigger needed during attack resolution)
            return null;
    }

    return null;
}
