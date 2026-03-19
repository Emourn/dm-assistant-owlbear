import type { Character, Skill as LegacySkill } from '../../../types/character';
import { ABILITY_DEFINITIONS, SKILL_DEFINITIONS, SKILL_ID_BY_LABEL } from '../domain/constants';
import { getAbilityModifier } from '../domain/sheet';
import type {
    AbilityId,
    Phase1ActionSummary,
    Phase1CharacterSheet,
    Phase1Movement,
    Phase1ResourceCounter,
    Phase1Sense,
    Phase1Skill,
    SkillId,
} from '../domain/types';

function normalizeAbility(value: string): AbilityId | null {
    const normalized = value.trim().toLowerCase().slice(0, 3);
    return ABILITY_DEFINITIONS.some((ability) => ability.id === normalized)
        ? (normalized as AbilityId)
        : null;
}

function parseMovement(speed: string): Phase1Movement[] {
    return speed
        .split(',')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment, index) => {
            const match = segment.match(/^(?:(?<kind>[a-zA-Z ]+?)\s+)?(?<distance>\d+)\s*(?<unit>ft|feet|mi|mile|miles)\b/i);
            const kind = match?.groups?.kind?.trim().toLowerCase() || (index === 0 ? 'walk' : 'special');
            const distance = match?.groups?.distance ? Number(match.groups.distance) : null;
            const unit = match?.groups?.unit?.toLowerCase() ?? 'ft';

            return {
                kind,
                label: segment,
                distance,
                unit,
            };
        });
}

function pushSense(
    senses: Phase1Sense[],
    seen: Set<string>,
    sense: Phase1Sense,
): void {
    const key = `${sense.kind}:${sense.range ?? 'na'}:${sense.label.toLowerCase()}`;
    if (!seen.has(key)) {
        seen.add(key);
        senses.push(sense);
    }
}

function parseSenses(sensesText: string, darkvision?: number): Phase1Sense[] {
    const senses: Phase1Sense[] = [];
    const seen = new Set<string>();

    if (typeof darkvision === 'number' && darkvision > 0) {
        pushSense(senses, seen, {
            kind: 'darkvision',
            label: `Darkvision ${darkvision} ft`,
            range: darkvision,
            unit: 'ft',
        });
    }

    sensesText
        .split(',')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .forEach((segment) => {
            const match = segment.match(/^(?<kind>[a-zA-Z ]+?)\s+(?<range>\d+)\s*(?<unit>ft|feet|mi|mile|miles)\b/i);
            pushSense(senses, seen, {
                kind: match?.groups?.kind?.trim().toLowerCase() || 'special',
                label: segment,
                range: match?.groups?.range ? Number(match.groups.range) : null,
                unit: match?.groups?.unit?.toLowerCase() ?? 'ft',
            });
        });

    return senses;
}

function getProficiencyOverride(character: Character): number | null {
    const override = character.customOverrides?.overrides?.find(
        (entry) => entry.field === 'proficiencyBonus' && entry.isActive,
    );

    if (!override) {
        return null;
    }

    const parsed = Number(override.value);
    return Number.isFinite(parsed) ? parsed : null;
}

function adaptSkill(legacySkill: LegacySkill | undefined, skillId: SkillId): Phase1Skill {
    const definition = SKILL_DEFINITIONS.find((skill) => skill.id === skillId)!;

    return {
        id: skillId,
        label: definition.label,
        ability: definition.ability,
        proficiency: legacySkill?.expertise ? 'expertise' : legacySkill?.proficient ? 'proficient' : 'none',
        bonus: legacySkill?.bonus ?? 0,
        source: legacySkill?.source,
    };
}

function adaptSkills(character: Character): Record<SkillId, Phase1Skill> {
    const byId = Object.fromEntries(
        character.skills
            .map((skill) => [SKILL_ID_BY_LABEL[skill.name.toLowerCase()], skill] as const)
            .filter((entry): entry is [SkillId, LegacySkill] => Boolean(entry[0])),
    );

    return Object.fromEntries(
        SKILL_DEFINITIONS.map((skill) => [skill.id, adaptSkill(byId[skill.id], skill.id)]),
    ) as Record<SkillId, Phase1Skill>;
}

function adaptResources(character: Character): Phase1ResourceCounter[] {
    const resources: Phase1ResourceCounter[] = character.resources.map((resource) => ({
        id: resource.id,
        name: resource.name,
        current: resource.current,
        max: resource.max,
        resetOn: resource.resetOn,
        kind: 'resource',
    }));

    const hitDiceMatch = character.hitDice.match(/(?<count>\d+)d(?<die>\d+)/i);
    if (hitDiceMatch?.groups) {
        resources.unshift({
            id: `${character.id}:hit-dice`,
            name: 'Hit Dice',
            current: Number(hitDiceMatch.groups.count),
            max: Number(hitDiceMatch.groups.count),
            resetOn: 'long',
            kind: 'hit-dice',
            detail: `d${hitDiceMatch.groups.die}`,
        });
    }

    return resources;
}

function adaptSpellcasting(character: Character): Phase1CharacterSheet['spellcasting'] {
    const ability = normalizeAbility(character.spellcastingAbility);
    if (!ability) {
        return null;
    }

    return {
        ability,
        attackBonus: character.spellAttackMod,
        saveDc: character.spellSaveDc,
        slots: character.spellSlots
            .map((slot, index) => ({
                id: `${character.id}:spell-slot:${index}`,
                name: `Spell Slot ${index}`,
                current: slot.current,
                max: slot.max,
                resetOn: 'long' as const,
                kind: 'spell-slot' as const,
                level: index,
            }))
            .filter((slot) => slot.level && slot.max > 0),
    };
}

function adaptActions(character: Character): Phase1ActionSummary[] {
    return character.actions.slice(0, 10).map((action) => ({
        id: action.id,
        name: action.name,
        kind: action.type,
        source: action.source,
        description: action.description,
    }));
}

function getTotalLevel(character: Character): number {
    if (character.classes?.length) {
        return character.classes.reduce((sum, entry) => sum + (entry.level || 0), 0);
    }

    return character.level;
}

function getArmorClassAudit(character: Character): Phase1CharacterSheet['armorClass'] {
    const override = character.customOverrides?.overrides?.find(
        (entry) => entry.field === 'ac' && entry.isActive,
    );

    if (override) {
        return {
            value: Number(override.value),
            source: 'Manual override',
            audit: [override.reason || 'AC overridden manually.'],
        };
    }

    return {
        value: character.ac,
        source: 'Legacy derived value',
        audit: ['AC is preserved from the current character snapshot while the new domain layer is being phased in.'],
    };
}

function getInitiativeAdjustment(character: Character): number {
    return character.initiativeMod - getAbilityModifier(character.abilityScores.dex);
}

export function adaptLegacyCharacterToPhase1Sheet(character: Character): Phase1CharacterSheet {
    const saveAdjustments = Object.fromEntries(
        ABILITY_DEFINITIONS.map((ability) => [
            ability.id,
            Number(character.customOverrides?.modifiers?.[`${ability.id}Save`] ?? 0),
        ]),
    ) as Partial<Record<AbilityId, number>>;
    const skillAdjustments = Object.fromEntries(
        SKILL_DEFINITIONS.map((skill) => [
            skill.id,
            Number(character.customOverrides?.modifiers?.[skill.label] ?? 0),
        ]),
    ) as Partial<Record<SkillId, number>>;

    return {
        id: character.id,
        name: character.name || 'Unnamed',
        playerName: character.playerName,
        level: getTotalLevel(character),
        ancestry: character.race || 'Adventurer',
        classSummary: [character.className, character.subclass].filter(Boolean).join(' - ') || 'Adventurer',
        abilities: {
            str: character.abilityScores.str,
            dex: character.abilityScores.dex,
            con: character.abilityScores.con,
            int: character.abilityScores.int,
            wis: character.abilityScores.wis,
            cha: character.abilityScores.cha,
        },
        savingThrowProficiencies: character.savingThrows
            .map((save) => normalizeAbility(save))
            .filter((save): save is AbilityId => Boolean(save)),
        skills: adaptSkills(character),
        armorClass: getArmorClassAudit(character),
        hitPoints: {
            current: character.currentHp,
            max: character.maxHp,
            temp: character.tempHp,
        },
        deathSaves: {
            successes: character.deathSaves.successes,
            failures: character.deathSaves.failures,
        },
        proficiencyBonusOverride: getProficiencyOverride(character),
        rollAdjustments: {
            initiative: getInitiativeAdjustment(character),
            saves: saveAdjustments,
            skills: skillAdjustments,
        },
        movement: parseMovement(character.speed || '30 ft'),
        senses: parseSenses(character.senses || '', character.darkvision),
        spellcasting: adaptSpellcasting(character),
        resources: adaptResources(character),
        conditions: [],
        actions: adaptActions(character),
        notes: [character.notes, character.damageNotes].filter(Boolean),
    };
}
