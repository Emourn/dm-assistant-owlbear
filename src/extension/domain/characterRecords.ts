import { SKILL_DEFINITIONS } from '../../features/dnd2024/domain/constants';
import type {
    AbilityId,
    Phase1ActionSummary,
    Phase1CharacterSheet,
    Phase1Movement,
    Phase1ResourceCounter,
    Phase1Sense,
    Phase1Skill,
    ProficiencyTier,
    SkillId,
} from '../../features/dnd2024/domain/types';

export const CHARACTER_COLLECTION_VERSION = 1;
export const CHARACTER_RULESET = 'dnd-2024';

export interface StoredCharacterRecord {
    version: typeof CHARACTER_COLLECTION_VERSION;
    ruleset: typeof CHARACTER_RULESET;
    updatedAt: number;
    sheet: Phase1CharacterSheet;
}

export interface StoredCharacterCollection {
    version: typeof CHARACTER_COLLECTION_VERSION;
    activeCharacterId: string | null;
    characters: StoredCharacterRecord[];
}

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'character';
}

function createSkill(
    skillId: SkillId,
    proficiency: ProficiencyTier,
    bonus = 0,
    source?: string,
): Phase1Skill {
    const definition = SKILL_DEFINITIONS.find((skill) => skill.id === skillId)!;
    return {
        id: skillId,
        label: definition.label,
        ability: definition.ability as AbilityId,
        proficiency,
        bonus,
        source,
    };
}

function createSkillMap(
    entries: Array<{
        id: SkillId;
        proficiency?: ProficiencyTier;
        bonus?: number;
        source?: string;
    }> = [],
): Record<SkillId, Phase1Skill> {
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    return Object.fromEntries(
        SKILL_DEFINITIONS.map((skill) => {
            const match = byId.get(skill.id);
            return [
                skill.id,
                createSkill(skill.id, match?.proficiency ?? 'none', match?.bonus ?? 0, match?.source),
            ];
        }),
    ) as Record<SkillId, Phase1Skill>;
}

function createMovement(...movement: Phase1Movement[]): Phase1Movement[] {
    return movement;
}

function createSenses(...senses: Phase1Sense[]): Phase1Sense[] {
    return senses;
}

function createResources(...resources: Phase1ResourceCounter[]): Phase1ResourceCounter[] {
    return resources;
}

function createActions(...actions: Phase1ActionSummary[]): Phase1ActionSummary[] {
    return actions;
}

function createCharacterRecord(sheet: Phase1CharacterSheet, updatedAt: number): StoredCharacterRecord {
    return {
        version: CHARACTER_COLLECTION_VERSION,
        ruleset: CHARACTER_RULESET,
        updatedAt,
        sheet,
    };
}

function createNameSet(collection: StoredCharacterCollection): Set<string> {
    return new Set(collection.characters.map((record) => record.sheet.name.trim().toLowerCase()));
}

function createUniqueCharacterName(collection: StoredCharacterCollection, baseName: string): string {
    const normalized = baseName.trim() || 'New Character';
    const taken = createNameSet(collection);
    if (!taken.has(normalized.toLowerCase())) {
        return normalized;
    }

    let suffix = 2;
    let next = `${normalized} ${suffix}`;
    while (taken.has(next.toLowerCase())) {
        suffix += 1;
        next = `${normalized} ${suffix}`;
    }

    return next;
}

function createUniqueCharacterId(collection: StoredCharacterCollection, preferredName: string): string {
    const taken = new Set(collection.characters.map((record) => record.sheet.id));
    const base = slugify(preferredName);
    let next = base;
    let suffix = 2;

    while (taken.has(next)) {
        next = `${base}-${suffix}`;
        suffix += 1;
    }

    return next;
}

function createBlankCharacterSheet(characterId: string, name: string): Phase1CharacterSheet {
    return {
        id: characterId,
        name,
        playerName: '',
        level: 1,
        ancestry: 'Unknown',
        classSummary: 'Adventurer',
        abilities: {
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10,
        },
        savingThrowProficiencies: [],
        skills: createSkillMap(),
        armorClass: {
            value: 10,
            source: 'Manual entry',
            audit: ['Created from the Phase 1 collection manager.'],
        },
        hitPoints: {
            current: 1,
            max: 1,
            temp: 0,
        },
        deathSaves: {
            successes: 0,
            failures: 0,
        },
        proficiencyBonusOverride: null,
        rollAdjustments: {
            initiative: 0,
            saves: {},
            skills: {},
        },
        movement: createMovement({
            kind: 'walk',
            label: '30 ft',
            distance: 30,
            unit: 'ft',
        }),
        senses: createSenses({
            kind: 'passive-perception',
            label: 'Passive Perception 10',
            range: null,
            unit: 'score',
        }),
        spellcasting: null,
        resources: [],
        actions: [],
        notes: [
            'Created from the Phase 1 collection manager.',
            'Fill in class, ancestry, actions, spells, and resources as this sheet is authored.',
        ],
    };
}

function remapOwnedId(previousSheetId: string, nextSheetId: string, currentId: string, fallback: string): string {
    const prefix = `${previousSheetId}:`;
    if (currentId.startsWith(prefix)) {
        return `${nextSheetId}:${currentId.slice(prefix.length)}`;
    }

    return `${nextSheetId}:${fallback}`;
}

function duplicateSheet(source: Phase1CharacterSheet, nextSheetId: string, nextName: string): Phase1CharacterSheet {
    const resourceIdMap = new Map<string, string>();
    const nextResources = source.resources.map((resource, index) => {
        const nextId = remapOwnedId(source.id, nextSheetId, resource.id, `resource-${index + 1}`);
        resourceIdMap.set(resource.id, nextId);
        return {
            ...resource,
            id: nextId,
        };
    });

    const nextSpellcasting = source.spellcasting
        ? {
            ...source.spellcasting,
            slots: source.spellcasting.slots.map((slot, index) => {
                const nextId = remapOwnedId(source.id, nextSheetId, slot.id, `slot-${index + 1}`);
                resourceIdMap.set(slot.id, nextId);
                return {
                    ...slot,
                    id: nextId,
                };
            }),
        }
        : null;

    const nextActions = source.actions.map((action, index) => ({
        ...action,
        id: remapOwnedId(source.id, nextSheetId, action.id, `action-${index + 1}`),
        automation: action.automation
            ? {
                ...action.automation,
                resourceCost: action.automation.resourceCost
                    ? {
                        ...action.automation.resourceCost,
                        resourceId: resourceIdMap.get(action.automation.resourceCost.resourceId)
                            ?? action.automation.resourceCost.resourceId,
                    }
                    : null,
            }
            : null,
    }));

    return {
        ...source,
        id: nextSheetId,
        name: nextName,
        resources: nextResources,
        spellcasting: nextSpellcasting,
        actions: nextActions,
        notes: [
            ...source.notes,
            `Duplicated from ${source.name}.`,
        ],
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isSheetLike(value: unknown): value is Phase1CharacterSheet {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.id === 'string'
        && typeof value.name === 'string'
        && isRecord(value.abilities)
        && isRecord(value.skills)
        && Array.isArray(value.actions)
        && Array.isArray(value.resources)
        && Array.isArray(value.movement)
        && Array.isArray(value.senses)
        && isRecord(value.hitPoints)
        && isRecord(value.armorClass)
        && isRecord(value.deathSaves)
    );
}

function isStoredCharacterRecord(value: unknown): value is StoredCharacterRecord {
    if (!isRecord(value)) {
        return false;
    }

    return (
        value.version === CHARACTER_COLLECTION_VERSION
        && value.ruleset === CHARACTER_RULESET
        && typeof value.updatedAt === 'number'
        && isSheetLike(value.sheet)
    );
}

export function createEmptyCharacterCollection(): StoredCharacterCollection {
    return {
        version: CHARACTER_COLLECTION_VERSION,
        activeCharacterId: null,
        characters: [],
    };
}

export function selectActiveCharacterRecord(
    collection: StoredCharacterCollection,
): StoredCharacterRecord | null {
    if (collection.characters.length === 0) {
        return null;
    }

    const active = collection.characters.find((record) => record.sheet.id === collection.activeCharacterId);
    return active ?? collection.characters[0];
}

export function parseStoredCharacterCollection(value: unknown): StoredCharacterCollection | null {
    if (!isRecord(value) || value.version !== CHARACTER_COLLECTION_VERSION || !Array.isArray(value.characters)) {
        return null;
    }

    const characters = value.characters.filter(isStoredCharacterRecord);
    if (characters.length === 0) {
        return createEmptyCharacterCollection();
    }

    const activeCharacterId = typeof value.activeCharacterId === 'string'
        ? value.activeCharacterId
        : characters[0].sheet.id;

    return {
        version: CHARACTER_COLLECTION_VERSION,
        activeCharacterId,
        characters,
    };
}

export function updateStoredCharacterRecord(
    collection: StoredCharacterCollection,
    characterId: string,
    updater: (record: StoredCharacterRecord) => StoredCharacterRecord,
    updatedAt = Date.now(),
): StoredCharacterCollection | null {
    let didUpdate = false;
    const characters = collection.characters.map((record) => {
        if (record.sheet.id !== characterId) {
            return record;
        }

        didUpdate = true;
        return {
            ...updater(record),
            updatedAt,
        };
    });

    if (!didUpdate) {
        return null;
    }

    return {
        ...collection,
        characters,
    };
}

export function addBlankCharacterRecord(
    collection: StoredCharacterCollection,
    updatedAt = Date.now(),
    baseName = 'New Character',
): StoredCharacterCollection {
    const name = createUniqueCharacterName(collection, baseName);
    const id = createUniqueCharacterId(collection, name);
    const nextRecord = createCharacterRecord(createBlankCharacterSheet(id, name), updatedAt);

    return {
        ...collection,
        activeCharacterId: nextRecord.sheet.id,
        characters: [...collection.characters, nextRecord],
    };
}

export function duplicateStoredCharacterRecord(
    collection: StoredCharacterCollection,
    characterId: string,
    updatedAt = Date.now(),
): StoredCharacterCollection | null {
    const source = collection.characters.find((record) => record.sheet.id === characterId);
    if (!source) {
        return null;
    }

    const nextName = createUniqueCharacterName(collection, `${source.sheet.name} Copy`);
    const nextId = createUniqueCharacterId(collection, nextName);
    const nextRecord = createCharacterRecord(
        duplicateSheet(source.sheet, nextId, nextName),
        updatedAt,
    );

    return {
        ...collection,
        activeCharacterId: nextRecord.sheet.id,
        characters: [...collection.characters, nextRecord],
    };
}

export function deleteStoredCharacterRecord(
    collection: StoredCharacterCollection,
    characterId: string,
): StoredCharacterCollection | null {
    const index = collection.characters.findIndex((record) => record.sheet.id === characterId);
    if (index === -1) {
        return null;
    }

    const characters = collection.characters.filter((record) => record.sheet.id !== characterId);
    const nextActiveCharacterId = collection.activeCharacterId !== characterId
        ? collection.activeCharacterId
        : characters[index]?.sheet.id
            ?? characters[index - 1]?.sheet.id
            ?? null;

    return {
        ...collection,
        activeCharacterId: nextActiveCharacterId,
        characters,
    };
}

export function createSampleCharacterCollection(now = Date.now()): StoredCharacterCollection {
    const characterId = 'demo-seraphina-vale';

    return {
        version: CHARACTER_COLLECTION_VERSION,
        activeCharacterId: characterId,
        characters: [
            {
                version: CHARACTER_COLLECTION_VERSION,
                ruleset: CHARACTER_RULESET,
                updatedAt: now,
                sheet: {
                    id: characterId,
                    name: 'Seraphina Vale',
                    playerName: 'Demo Player',
                    level: 5,
                    ancestry: 'Human',
                    classSummary: 'Cleric 5 - Light Domain',
                    abilities: {
                        str: 10,
                        dex: 14,
                        con: 14,
                        int: 12,
                        wis: 18,
                        cha: 14,
                    },
                    savingThrowProficiencies: ['wis', 'cha'],
                    skills: createSkillMap([
                        { id: 'insight', proficiency: 'proficient', source: 'Class' },
                        { id: 'medicine', proficiency: 'proficient', source: 'Class' },
                        { id: 'religion', proficiency: 'proficient', source: 'Background' },
                        { id: 'perception', proficiency: 'proficient', source: 'Species' },
                        { id: 'persuasion', proficiency: 'proficient', bonus: 1, source: 'Origin feat' },
                    ]),
                    armorClass: {
                        value: 18,
                        source: 'Chain mail, shield',
                        audit: [
                            'Base AC recorded from equipped armor and shield.',
                            'This slice preserves AC as stored sheet data while full recalculation is still in progress.',
                        ],
                    },
                    hitPoints: {
                        current: 38,
                        max: 38,
                        temp: 4,
                    },
                    deathSaves: {
                        successes: 0,
                        failures: 0,
                    },
                    proficiencyBonusOverride: null,
                    rollAdjustments: {
                        initiative: 0,
                        saves: {},
                        skills: {},
                    },
                    movement: createMovement({
                        kind: 'walk',
                        label: '30 ft',
                        distance: 30,
                        unit: 'ft',
                    }),
                    senses: createSenses({
                        kind: 'passive-perception',
                        label: 'Passive Perception 16',
                        range: null,
                        unit: 'score',
                    }),
                    spellcasting: {
                        ability: 'wis',
                        attackBonus: 7,
                        saveDc: 15,
                        slots: [
                            {
                                id: `${characterId}:slot-1`,
                                name: 'Spell Slot 1',
                                current: 4,
                                max: 4,
                                resetOn: 'long',
                                kind: 'spell-slot',
                                level: 1,
                            },
                            {
                                id: `${characterId}:slot-2`,
                                name: 'Spell Slot 2',
                                current: 3,
                                max: 3,
                                resetOn: 'long',
                                kind: 'spell-slot',
                                level: 2,
                            },
                            {
                                id: `${characterId}:slot-3`,
                                name: 'Spell Slot 3',
                                current: 2,
                                max: 2,
                                resetOn: 'long',
                                kind: 'spell-slot',
                                level: 3,
                            },
                        ],
                    },
                    resources: createResources(
                        {
                            id: `${characterId}:hit-dice`,
                            name: 'Hit Dice',
                            current: 5,
                            max: 5,
                            resetOn: 'long',
                            kind: 'hit-dice',
                            detail: 'd8',
                        },
                        {
                            id: `${characterId}:channel-divinity`,
                            name: 'Channel Divinity',
                            current: 2,
                            max: 2,
                            resetOn: 'short',
                            kind: 'resource',
                            detail: 'Turn Undead / Radiance of the Dawn',
                        },
                    ),
                    actions: createActions(
                        {
                            id: `${characterId}:mace`,
                            name: 'Mace',
                            kind: 'attack',
                            source: 'Equipped weapon',
                            description: 'Melee weapon attack using Strength. Damage automation is a later slice.',
                            automation: {
                                kind: 'attack-roll',
                                attackSource: 'str',
                                proficient: true,
                                bonus: 0,
                                range: 'melee',
                                resourceCost: null,
                            },
                        },
                        {
                            id: `${characterId}:sacred-flame`,
                            name: 'Sacred Flame',
                            kind: 'cantrip',
                            source: 'Cleric spellcasting',
                            description: 'Dexterity save cantrip. Spell automation is staged for a later Phase 1 slice.',
                        },
                        {
                            id: `${characterId}:guiding-bolt`,
                            name: 'Guiding Bolt',
                            kind: 'spell',
                            source: 'Prepared spell',
                            description: 'Attack roll spell using the stored spellcasting bonus. Linked spell-slot spending is enabled; damage automation comes later.',
                            automation: {
                                kind: 'attack-roll',
                                attackSource: 'spellcasting',
                                proficient: false,
                                bonus: 0,
                                range: 'ranged',
                                resourceCost: {
                                    resourceId: `${characterId}:slot-1`,
                                    amount: 1,
                                },
                            },
                        },
                    ),
                    notes: [
                        'Seeded demo character for validating the rebuilt Owlbear extension.',
                        'Stored under the extension metadata namespace so token and room integrations can be layered on safely.',
                    ],
                },
            },
        ],
    };
}
