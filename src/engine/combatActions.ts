import { Character } from '../types/character';
import { CombatAction, CombatActionType, ActionEconomy } from '../types/combat';
import { flattenEntries } from './fiveEToolsParser';

// ----- Global Constants -----

export const GENERIC_ACTIONS: CombatAction[] = [
    {
        id: 'generic-dash', name: 'Dash', economy: 'action', category: 'Standard',
        description: 'Gain extra movement for the current turn. The increase equals your speed after modifiers.\n\nCOACHING: Tell the player their character sprints! They can move twice their speed this turn.',
        sourceType: 'generic', icon: '🏃', source: 'PHB 2024'
    },
    {
        id: 'generic-disengage', name: 'Disengage', economy: 'action', category: 'Standard',
        description: 'Your movement doesn\'t provoke opportunity attacks for the rest of the turn.\n\nCOACHING: Tell the player they are weaving through the fray! Enemies cannot strike them as they move away.',
        sourceType: 'generic', icon: '🛡️', source: 'PHB 2024'
    },
    {
        id: 'generic-dodge', name: 'Dodge', economy: 'action', category: 'Standard',
        description: 'Focus entirely on avoiding attacks. Until your next turn, attacks against you have disadvantage and you have advantage on Dexterity saves.\n\nCOACHING: Tell the player they are focusing on defense. They are much harder to hit until their next turn.',
        sourceType: 'generic', icon: '💨', source: 'PHB 2024'
    },
    {
        id: 'generic-help', name: 'Help', economy: 'action', category: 'Standard',
        description: 'Lend aid to another creature. They gain advantage on their next ability check of your choice. If you help with an attack, the target must be within 5 feet of you.\n\nCOACHING: Tell the player they are assisting an ally. The ally gets to roll twice (Advantage) on their next specific check.',
        sourceType: 'generic', icon: '🤝', source: 'PHB 2024'
    },
    {
        id: 'generic-hide', name: 'Hide', economy: 'action', category: 'Standard',
        description: 'Make a Dexterity (Stealth) check (DC 15) to become hidden. You must be heavily obscured or behind three-quarters or total cover.\n\nCOACHING: Ask the player for a Dexterity (Stealth) [DEX] roll. They need a 15+ to succeed.',
        diceNotation: '1d20',
        sourceType: 'generic', icon: '🕵️', source: 'PHB 2024'
    },
    {
        id: 'generic-ready', name: 'Ready', economy: 'action', category: 'Standard',
        description: 'Set a trigger to take an action or move as a reaction later.\n\nCOACHING: Ask the player: "What is the trigger?" (e.g., "When the orc moves") and "What is your action?" (e.g., "I fire my bow").',
        sourceType: 'generic', icon: '⌛', source: 'PHB 2024'
    },
    {
        id: 'generic-search', name: 'Search', economy: 'action', category: 'Standard',
        description: 'Devote attention to finding something hidden or identifying a creature. Usually Wisdom (Perception or Insight).\n\nCOACHING: Ask the player for a Wisdom (Perception) [WIS] or Wisdom (Insight) [WIS] roll.',
        diceNotation: '1d20',
        sourceType: 'generic', icon: '🔍', source: 'PHB 2024'
    },
    {
        id: 'generic-study', name: 'Study', economy: 'action', category: 'Standard',
        description: 'Recall information from your memories or specialized training. Usually Intelligence (Arcana, History, Investigation, Nature, or Religion).\n\nCOACHING: Ask the player for an Intelligence-based skill check to recall lore or information.',
        diceNotation: '1d20',
        sourceType: 'generic', icon: '📖', source: 'PHB 2024'
    },
    {
        id: 'generic-influence', name: 'Influence', economy: 'action', category: 'Standard',
        description: 'Influence a creature to be more helpful. Usually Charisma (Animal Handling, Deception, Intimidation, or Persuasion).\n\nCOACHING: Ask the player for a Charisma-based check to persuade or intimidate.',
        diceNotation: '1d20',
        sourceType: 'generic', icon: '📢', source: 'PHB 2024'
    },
    {
        id: 'generic-use-object', name: 'Utilize', economy: 'action', category: 'Standard',
        description: 'Use a magic item or interact with an object in a complex way.\n\nCOACHING: Simple interactions are free, but activating a magic item or complex device costs an Action.',
        sourceType: 'generic', icon: '🎒', source: 'PHB 2024'
    },
    {
        id: 'generic-grapple', name: 'Grapple', economy: 'action', category: 'Standard',
        description: 'Try to seize a creature. The target makes a Str or Dex save against your Grapple DC (8 + Str + PB).\n\nCOACHING: Ask the target for a Strength or Dexterity Saving Throw. If they fail, they are Grappled (Speed 0).',
        sourceType: 'generic', icon: '✊', source: 'PHB 2024'
    },
    {
        id: 'generic-shove', name: 'Shove', economy: 'action', category: 'Standard',
        description: 'Knock a creature prone or push it 5 ft away. Target makes a Str or Dex save against your Shove DC (8 + Str + PB).\n\nCOACHING: Ask the target for a Strength or Dexterity Saving Throw. If they fail, they are Prone or Pushed.',
        sourceType: 'generic', icon: '🫳', source: 'PHB 2024'
    },
    {
        id: 'generic-offhand', name: 'Offhand Attack', economy: 'bonus', category: 'Standard',
        description: 'Attack with a light melee weapon in your other hand if you took the Attack action.\n\nCOACHING: Tell the player they can use their Bonus Action for an extra swing. IMPORTANT: They do NOT add their Strength/Dexterity bonus to the damage (only to the hit) unless they have the Fighting Style.',
        sourceType: 'generic', icon: '🗡️', source: 'PHB 2024'
    }
];

// ----- Player Action Extraction -----

export function getPlayerCombatActions(character: Character): CombatAction[] {
    const actions: CombatAction[] = [];
    const strMod = Math.floor((Number(character.abilityScores.str) - 10) / 2);
    const dexMod = Math.floor((Number(character.abilityScores.dex) - 10) / 2);
    const pb = Number(character.proficiencyBonus) || 2;

    // 1. Weapon Attacks from equipped inventory
    character.inventory
        .filter(item => item.isEquipped && (item.type === 'weapon'))
        .forEach(item => {
            // Determine finesse/ranged/reach properties
            // Determine properties from description
            const descLower = (item.description || '').toLowerCase();
            const nameLower = item.name.toLowerCase();
            const isFinesse = descLower.includes('finesse');
            const isReach = descLower.includes('reach');
            const isThrown = descLower.includes('thrown');

            // NEW: More robust Ranged detection (Description OR Name-based)
            const rangedKeywords = ['ranged', 'ammunition', 'range'];
            const rangedWeaponNames = [
                'shortbow', 'longbow', 'short bow', 'long bow',
                'crossbow', 'sling', 'blowgun', 'dart', 'net',
                'musket', 'pistol', 'gun', 'firearm', 'rifle', 'bow'
            ];

            const isRanged = rangedKeywords.some(k => descLower.includes(k)) ||
                rangedWeaponNames.some(w => nameLower.includes(w)) ||
                (descLower.includes('range') && (descLower.includes('/') || /\d+/.test(descLower)));

            const atkMod = isRanged ? dexMod : (isFinesse ? Math.max(strMod, dexMod) : strMod);
            const toHit = atkMod + pb;

            // NEW: Parse reach and range separately
            let reach = 0;
            let range = '';

            if (!isRanged || isThrown) {
                reach = 5;
                if (isReach) reach = 10;
                // Standard 5e reach weapon/longer reach lookup
                const reachWeapons = ['whip', 'glaive', 'halberd', 'pike', 'lance', 'naginata', 'polearm'];
                if (reachWeapons.some(w => nameLower.includes(w))) reach = 10;
            }

            if (isRanged || isThrown) {
                // Common 5e weapon range map (Normal/Long in feet)
                const rangeMap: Record<string, string> = {
                    'shortbow': '80/320 ft', 'short bow': '80/320 ft',
                    'longbow': '150/600 ft', 'long bow': '150/600 ft',
                    'dagger': '20/60 ft', 'handaxe': '20/60 ft', 'javelin': '30/120 ft',
                    'spear': '20/60 ft', 'trident': '20/60 ft', 'hammer': '20/60 ft',
                    'sling': '30/120 ft',
                    'crossbow': nameLower.includes('heavy') ? '100/400 ft' : (nameLower.includes('hand') ? '30/120 ft' : '80/320 ft'),
                    'dart': '20/60 ft', 'net': '5/15 ft', 'blowgun': '25/100 ft',
                    'pistol': '30/90 ft', 'musket': '40/120 ft',
                    'bow': '80/320 ft' // Fallback for generic "Bow"
                };

                // Prioritize longer keys (e.g., 'shortbow' before 'bow')
                const sortedKeys = Object.keys(rangeMap).sort((a, b) => b.length - a.length);
                for (const key of sortedKeys) {
                    if (nameLower.includes(key)) {
                        range = rangeMap[key];
                        break;
                    }
                }

                // Try to parse from description override if available
                // Handles: "Range (80/320)", "Range 80/320", "Range 150/600 ft", "150/600 ft", etc.
                if (descLower) {
                    const m = descLower.match(/range\s*\(?(\d+)\s*\/\s*(\d+)\)?/i) ||
                        descLower.match(/(\d+)\s*\/\s*(\d+)\s*ft/i) ||
                        descLower.match(/range\s*\(?(\d+)\)?/i);
                    if (m) {
                        if (m[2]) {
                            range = `${m[1]}/${m[2]} ft`;
                        } else {
                            range = `${m[1]} ft`;
                        }
                    }
                }
            }

            actions.push({
                id: `weapon-${item.id}`,
                name: item.name,
                economy: 'action',
                category: 'Attacks',
                description: item.description || `Attack with ${item.name}.`,
                diceNotation: `1d20+${toHit}`,
                damageNotation: item.damage || '1d6',
                toHit,
                range: range || undefined,
                reach: reach || undefined,
                sourceType: 'weapon',
                icon: isRanged ? '🏹' : (isFinesse ? '🗡️' : '⚔️'),
                source: 'Inventory',
                weaponBaseName: item.name
            });
        });

    // 2. Prepared Spells
    character.spells
        .filter(spell => spell.prepared || spell.level === 0)
        .forEach(spell => {
            const slotIndex = spell.level;
            const slotsLeft = slotIndex > 0 && character.spellSlots[slotIndex]
                ? character.spellSlots[slotIndex].current
                : undefined;

            // Basic spell attack/save detection
            const desc = (spell.description || '').toLowerCase();
            const isAttack = desc.includes('spell attack') || spell.name.toLowerCase().includes('bolt') || spell.name.toLowerCase().includes('blast');
            const isSave = desc.includes('saving throw') || desc.includes('dc ');

            // Determine attack/save modifiers
            const spellAbility = character.spellcastingAbility?.toLowerCase() || 'int';
            const abilityScores = character.abilityScores as any;
            const spellAbilityMod = Math.floor(((Number(abilityScores[spellAbility]) || 10) - 10) / 2);
            const fallbackAtkMod = spellAbilityMod + pb;
            const fallbackDc = 8 + pb + spellAbilityMod;

            actions.push({
                id: `spell-${spell.id}`,
                name: spell.name,
                economy: spell.castingTime?.toLowerCase().includes('bonus') ? 'bonus' :
                    spell.castingTime?.toLowerCase().includes('reaction') ? 'reaction' : 'action',
                category: 'Spells',
                description: (spell.description || spell.name) + (spell.higherLevels ? `\n\nAt Higher Levels: ${spell.higherLevels}` : ''),
                spellLevel: spell.level,
                isCantrip: spell.level === 0,
                requiresConcentration: spell.concentration,
                range: spell.range,
                usesRemaining: slotsLeft,
                usesMax: slotIndex > 0 && character.spellSlots[slotIndex] ? character.spellSlots[slotIndex].max : undefined,
                toHit: isAttack ? (character.spellAttackMod || fallbackAtkMod) : undefined,
                saveDc: isSave ? (character.spellSaveDc || fallbackDc) : undefined,
                saveAbility: isSave ? (desc.match(/(strength|dexterity|constitution|intelligence|wisdom|charisma) saving throw/)?.[1]?.slice(0, 3) || 'dex') : undefined,
                damageNotation: desc.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/)?.[1],
                sourceType: 'spell',
                icon: spell.level === 0 ? '✨' : '🔮',
                source: (spell as any).source || 'PHB'
            });
        });

    // 3. Class Features & Feats
    const classFeatures = [...character.features, ...character.feats, ...(character.racialTraits || [])];
    const hasExtraAttack = classFeatures.some(f => f.name.toLowerCase().includes('extra attack'));
    const hasMultiAttack = classFeatures.some(f => f.name.toLowerCase().includes('multiattack'));

    // PHB: Fighters get 3 attacks at level 11, 4 at level 20. All other Extra Attack classes get 2.
    let attacksCount = 1;
    if (hasExtraAttack || hasMultiAttack) {
        const isFighter = character.className.toLowerCase().includes('fighter');
        if (isFighter && character.level >= 20) attacksCount = 4;
        else if (isFighter && character.level >= 11) attacksCount = 3;
        else attacksCount = 2;
    }

    classFeatures.forEach(feat => {
        if (!feat.name) return;
        const nameLower = feat.name.toLowerCase();
        const inferredEconomy = inferFeatureEconomy(feat.description || '');

        // Special Case: Cunning Action (Rogue)
        if (nameLower.includes('cunning action')) {
            // We'll add bonus action versions of standard actions later or just ensure this is marked
        }

        actions.push({
            id: `feature-${feat.id}`,
            name: feat.name,
            economy: inferredEconomy,
            category: inferredEconomy === 'bonus' ? 'Bonus' : inferredEconomy === 'reaction' ? 'Reactions' : 'Features',
            description: feat.description || `${feat.name} — no description available.`,
            usesRemaining: feat.hasUses ? feat.usesCurrent : undefined,
            usesMax: feat.hasUses ? feat.usesMax : undefined,
            sourceType: 'feature',
            icon: feat.isFeat ? '🏅' : '⭐',
            source: (feat as any).source || 'Class Feature',
            // If it's an attack feature, apply count
            attacksPerAction: nameLower.includes('attack') && inferredEconomy === 'action' ? attacksCount : undefined
        });
    });

    // Apply attacksCount to weapon actions retrospectively or during creation
    actions.forEach(a => {
        if (a.category === 'Attacks' && a.economy === 'action' && !a.attacksPerAction) {
            a.attacksPerAction = attacksCount;
        }
    });

    // Add Cunning Action variants if applicable
    if (classFeatures.some(f => f.name.toLowerCase().includes('cunning action'))) {
        const cunningVariants = GENERIC_ACTIONS
            .filter(a => ['Dash', 'Disengage', 'Hide'].includes(a.name))
            .map(a => ({
                ...a,
                id: `cunning-${a.id}`,
                name: `Cunning Action: ${a.name}`,
                economy: 'bonus' as ActionEconomy,
                category: 'Bonus',
                source: 'Cunning Action'
            }));
        actions.push(...cunningVariants);
    }

    // 4. Direct Actions from the character's action list
    character.actions.forEach(act => {
        // Avoid duplicating weapons we already added
        if (actions.some(a => a.name === act.name)) return;
        actions.push({
            id: `action-${act.id}`,
            name: act.name,
            economy: act.type === 'bonus' ? 'bonus' : act.type === 'reaction' ? 'reaction' : 'action',
            category: act.type === 'bonus' ? 'Bonus' : act.type === 'reaction' ? 'Reactions' : 'Attacks',
            description: (act.description || act.name) + (act.rulesText ? `\n\n${act.rulesText}` : ''),
            diceNotation: act.effects?.find(e => e.dice)?.dice,
            sourceType: 'weapon',
            icon: '⚔️',
            source: 'Class Feature'
        });
    });

    // 5. Usable Items (potions, scrolls)
    character.inventory
        .filter(item => (item.type === 'potion' || item.type === 'scroll' || item.type === 'magic') && item.quantity > 0)
        .forEach(item => {
            actions.push({
                id: `item-${item.id}`,
                name: item.name,
                economy: 'action',
                category: 'Items',
                description: item.description || `Use ${item.name}.`,
                usesRemaining: item.quantity,
                sourceType: 'item',
                icon: item.type === 'potion' ? '🧪' : item.type === 'scroll' ? '📜' : '💎',
                source: (item as any).source || 'DMG'
            });
        });

    // 6. Generic actions
    actions.push(...GENERIC_ACTIONS);

    return actions;
}

// ----- Monster Action Extraction -----

export function getMonsterCombatActions(monsterData: any): CombatAction[] {
    if (!monsterData) return [...GENERIC_ACTIONS];

    const actions: CombatAction[] = [];

    // Actions
    if (monsterData.action) {
        monsterData.action.forEach((a: any, i: number) => {
            const parsed = a.entries ? parseMonsterEntry(a.entries) : { text: '', toHit: undefined, damage: undefined, damageType: undefined, range: undefined, requiresConcentration: false };
            actions.push({
                id: `monster-action-${i}`,
                name: a.name,
                economy: 'action',
                category: 'Actions',
                description: parsed.text || a.name,
                toHit: parsed.toHit,
                diceNotation: parsed.toHit !== undefined ? `1d20+${parsed.toHit}` : undefined,
                damageNotation: parsed.damage,
                damageType: parsed.damageType,
                range: parsed.range,
                requiresConcentration: parsed.requiresConcentration,
                sourceType: 'monster',
                icon: '⚔️',
                source: monsterData.source
            });
        });
    }

    // Bonus Actions
    if (monsterData.bonus) {
        monsterData.bonus.forEach((a: any, i: number) => {
            const parsed = a.entries ? parseMonsterEntry(a.entries) : { text: '', toHit: undefined, damage: undefined, damageType: undefined, range: undefined, requiresConcentration: false };
            actions.push({
                id: `monster-bonus-${i}`,
                name: a.name,
                economy: 'bonus',
                category: 'Actions',
                description: parsed.text || a.name,
                toHit: parsed.toHit,
                diceNotation: parsed.toHit !== undefined ? `1d20+${parsed.toHit}` : undefined,
                damageNotation: parsed.damage,
                damageType: parsed.damageType,
                requiresConcentration: parsed.requiresConcentration,
                sourceType: 'monster',
                icon: '🔵',
                source: monsterData.source
            });
        });
    }

    // Spellcasting
    if (monsterData.spellcasting) {
        monsterData.spellcasting.forEach((sc: any, scIdx: number) => {
            if (!sc.spells) return;

            // Extract global monster spellcasting stats
            const spellAttackPercent = sc.spellAttackMod ? parseInt(sc.spellAttackMod) : undefined;
            const spellDc = sc.spellSaveDc ? parseInt(sc.spellSaveDc) : undefined;

            Object.entries(sc.spells).forEach(([level, data]: [string, any]) => {
                const lvl = parseInt(level);
                if (!data.spells) return;
                data.spells.forEach((s: string, sIdx: number) => {
                    const nameMatch = s.match(/\{@spell ([^}]+)\}/);
                    const name = nameMatch ? nameMatch[1] : s;

                    actions.push({
                        id: `monster-spell-${scIdx}-${lvl}-${sIdx}`,
                        name: name,
                        economy: 'action',
                        category: 'Spells',
                        description: `Casts ${name}. (Level ${lvl})`,
                        spellLevel: lvl,
                        requiresConcentration: false,
                        toHit: spellAttackPercent,
                        saveDc: spellDc,
                        sourceType: 'monster',
                        icon: '🔮',
                        source: monsterData.source,
                        usesRemaining: data.slots,
                        usesMax: data.slots
                    });
                });
            });
        });
    }

    // Reactions
    if (monsterData.reaction) {
        monsterData.reaction.forEach((a: any, i: number) => {
            const parsed = a.entries ? parseMonsterEntry(a.entries) : { text: '', toHit: undefined, damage: undefined, damageType: undefined, range: undefined, requiresConcentration: false };
            actions.push({
                id: `monster-reaction-${i}`,
                name: a.name,
                economy: 'reaction',
                category: 'Reactions',
                description: parsed.text || a.name,
                requiresConcentration: parsed.requiresConcentration,
                sourceType: 'reaction',
                icon: '🔴',
                source: monsterData.source
            });
        });
    }

    // Traits (passive)
    if (monsterData.trait) {
        monsterData.trait.forEach((t: any, i: number) => {
            const text = t.entries ? flattenEntries(t.entries) : '';
            actions.push({
                id: `monster-trait-${i}`,
                name: t.name,
                economy: 'trait',
                category: 'Traits',
                description: text
                    .replace(/\{@\w+ ([^}|]+)(?:\|[^}]*)?\}/g, '$1')
                    .trim(),
                sourceType: 'trait',
                icon: '📖',
                source: monsterData.source
            });
        });
    }

    // Legendary Actions
    if (monsterData.legendary) {
        monsterData.legendary.forEach((a: any, i: number) => {
            const parsed = a.entries ? parseMonsterEntry(a.entries) : { text: '', toHit: undefined, damage: undefined, damageType: undefined, range: undefined, requiresConcentration: false };
            actions.push({
                id: `monster-legendary-${i}`,
                name: a.name,
                economy: 'legendary',
                category: 'Legendary',
                description: parsed.text || a.name,
                toHit: parsed.toHit,
                diceNotation: parsed.toHit !== undefined ? `1d20+${parsed.toHit}` : undefined,
                damageNotation: parsed.damage,
                damageType: parsed.damageType,
                requiresConcentration: parsed.requiresConcentration,
                sourceType: 'legendary',
                icon: '👑',
                source: monsterData.source
            });
        });
    }

    // Generic actions for monsters too
    actions.push(...GENERIC_ACTIONS);

    return actions;
}

// ----- Feature Economy Inference -----

/**
 * Parses feature description text to determine the correct action economy type.
 * Searches for canonical 5e phrasing patterns like "bonus action", "reaction", etc.
 */
function inferFeatureEconomy(description: string): ActionEconomy {
    const desc = description.toLowerCase();

    // Reaction patterns: "use your reaction", "as a reaction", "using your reaction"
    if (
        desc.includes('as a reaction') ||
        desc.includes('use your reaction') ||
        desc.includes('using your reaction') ||
        desc.includes('spend your reaction') ||
        /\breaction\b.*\bwhen\b/.test(desc) ||
        /\bwhen\b.*\breaction\b/.test(desc)
    ) {
        return 'reaction';
    }

    // Bonus action patterns: "bonus action", "as a bonus action"
    if (
        desc.includes('bonus action') ||
        desc.includes('as a bonus')
    ) {
        return 'bonus';
    }

    // Free/passive patterns: "no action required", "always active", "passive"
    if (
        desc.includes('no action required') ||
        desc.includes('automatically') ||
        desc.includes('passive') ||
        desc.includes('you have') && !desc.includes('you have advantage') ||
        desc.includes('you gain resistance') ||
        desc.includes('you are immune') ||
        desc.includes('while you') ||
        desc.includes('whenever you')
    ) {
        return 'free';
    }

    return 'action'; // Default
}

// ----- Saving Throw Utilities -----

export const ABILITY_NAMES: Record<string, string> = {
    str: 'Strength', dex: 'Dexterity', con: 'Constitution',
    int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
};

export const SAVE_DESCRIPTIONS: Record<string, string> = {
    str: 'Strength saves resist being moved, restrained, or physically overpowered. Common against spells like Thunderwave or effects that push/pull.',
    dex: 'Dexterity saves help you dodge area effects like Fireball, Lightning Bolt, and traps. You dive out of the way of danger.',
    con: 'Constitution saves resist poison, disease, and effects that tax your body\'s endurance. Also used to maintain Concentration on spells.',
    int: 'Intelligence saves resist mental attacks that assault logic and memory. Used against spells like Feeblemind and Phantasmal Force.',
    wis: 'Wisdom saves resist charms, frightens, and illusions. Common against spells like Hold Person, Command, and Fear.',
    cha: 'Charisma saves resist effects that would displace your soul or personality. Used against Banishment, Zone of Truth, and similar.'
};

export const COMMON_ROLLS: { name: string; notation: string; tooltip: string }[] = [
    { name: 'Death Save', notation: '1d20', tooltip: 'Roll a d20 with no modifiers. 10+ = success, 9 or below = failure. 20 = regain 1 HP. 1 = two failures. 3 successes stabilize. 3 failures = death.' },
    { name: 'Percentile', notation: '1d100', tooltip: 'Roll percentile dice (1-100). Used for random encounter tables, loot, wild magic surges, and similar randomization.' },
    { name: 'Initiative', notation: '1d20', tooltip: 'Roll 1d20 + your Dexterity modifier. Determines turn order in combat. Higher goes first.' }
];

/**
 * Classifies an action to determine the wizard's flow.
 */
export function classifyAction(action: CombatAction): CombatActionType {
    if (action.id === 'death-save') return 'death-save';

    const name = action.name.toLowerCase();
    const desc = (action.description || '').toLowerCase();

    // 2. Detect AOE (Saving Throws for multiple targets)
    const isAOE = desc.includes('each creature in') ||
        desc.includes('all creatures') ||
        (desc.includes('within') && desc.includes('radius')) ||
        desc.includes('line') || desc.includes('cone');

    if (action.saveDc !== undefined || action.saveAbility || isAOE) {
        return 'save-spell'; // Wizard will handle AOE logic if multiple targets selected
    }

    // 3. Detect Attacks
    if (action.toHit !== undefined) return 'attack';

    // 4. Other types
    if (desc.includes('regain') || desc.includes('heal')) return 'heal';

    // 2024 Grapple/Shove are saves, handled by save-spell logic in wizard
    if (name === 'grapple' || name === 'shove') return 'save-spell';
    if (name === 'contested') return 'contested';

    // Self-buff detection
    if (desc.includes('you gain') || desc.includes('yourselves') || desc.includes('your next')) {
        return 'self-buff';
    }

    return 'utility';
}

// ----- Private Helpers -----

function parseMonsterEntry(entries: any[]): any {
    const text = flattenEntries(entries);
    const toHitMatch = text.match(/([+-]\d+) to hit/);
    const damageMatch = text.match(/Hit: (\d+ \(\d+d\d+(?:\s*[+-]\s*\d+)?\)) (\w+) damage/);
    const rangeMatch = text.match(/range (\d+(?:\/\d+)?)\s*ft/i);

    return {
        text: text.replace(/\{@\w+ ([^}|]+)(?:\|[^}]*)?\}/g, '$1'),
        toHit: toHitMatch ? parseInt(toHitMatch[1]) : undefined,
        damage: damageMatch ? damageMatch[1].match(/\(([^)]+)\)/)?.[1] : undefined,
        damageType: damageMatch ? damageMatch[2] : undefined,
        range: rangeMatch ? rangeMatch[1] + ' ft' : undefined,
        requiresConcentration: text.includes('Concentration')
    };
}

// flattenEntries is imported from fiveEToolsParser.ts (single source of truth)
