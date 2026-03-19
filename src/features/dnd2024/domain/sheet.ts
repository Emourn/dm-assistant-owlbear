import { ABILITY_BY_ID, ABILITY_DEFINITIONS, SKILL_DEFINITIONS } from './constants';
import type {
    AbilityId,
    CharacterSheetViewModel,
    NumericBreakdown,
    Phase1CharacterSheet,
    RollModifierPart,
    RollableSheetRow,
    SkillId,
    StructuredRollRequest,
} from './types';

export function getAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

export function formatSignedNumber(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
}

export function getPhase1ProficiencyBonus(sheet: Phase1CharacterSheet): number {
    if (typeof sheet.proficiencyBonusOverride === 'number') {
        return sheet.proficiencyBonusOverride;
    }

    return Math.ceil(Math.max(sheet.level, 1) / 4) + 1;
}

function buildFormula(parts: RollModifierPart[]): string {
    if (parts.length === 0) {
        return '1d20';
    }

    return `1d20 ${parts.map((part) => (part.value >= 0 ? `+ ${part.value}` : `- ${Math.abs(part.value)}`)).join(' ')}`;
}

function buildBreakdown(parts: RollModifierPart[], audit: string[]): NumericBreakdown {
    return {
        total: parts.reduce((sum, part) => sum + part.value, 0),
        parts,
        formula: buildFormula(parts),
        audit,
    };
}

function buildRollRequest(
    id: string,
    label: string,
    scope: StructuredRollRequest['scope'],
    breakdown: NumericBreakdown,
): StructuredRollRequest {
    return {
        id,
        label,
        scope,
        formula: breakdown.formula,
        totalModifier: breakdown.total,
        breakdown: breakdown.parts,
        audit: breakdown.audit,
        advantage: 'normal',
    };
}

export function buildAbilityCheckBreakdown(sheet: Phase1CharacterSheet, ability: AbilityId): NumericBreakdown {
    const descriptor = ABILITY_BY_ID[ability];
    const modifier = getAbilityModifier(sheet.abilities[ability]);
    return buildBreakdown(
        [
            {
                label: `${descriptor.name} modifier`,
                value: modifier,
                source: 'ability',
            },
        ],
        [`Derived from ${descriptor.name} ${sheet.abilities[ability]}.`],
    );
}

export function buildSavingThrowBreakdown(sheet: Phase1CharacterSheet, ability: AbilityId): NumericBreakdown {
    const descriptor = ABILITY_BY_ID[ability];
    const parts: RollModifierPart[] = [
        {
            label: `${descriptor.name} modifier`,
            value: getAbilityModifier(sheet.abilities[ability]),
            source: 'ability',
        },
    ];
    const audit = [`Derived from ${descriptor.name} ${sheet.abilities[ability]}.`];
    const proficiencyBonus = getPhase1ProficiencyBonus(sheet);

    if (sheet.savingThrowProficiencies.includes(ability)) {
        parts.push({
            label: 'Saving throw proficiency',
            value: proficiencyBonus,
            source: 'proficiency',
        });
        audit.push(`Adds proficiency bonus ${formatSignedNumber(proficiencyBonus)}.`);
    }

    const adjustment = sheet.rollAdjustments.saves[ability] ?? 0;
    if (adjustment !== 0) {
        parts.push({
            label: 'Existing save adjustments',
            value: adjustment,
            source: 'legacy',
        });
        audit.push('Carries forward existing sheet save adjustments.');
    }

    return buildBreakdown(parts, audit);
}

export function buildSkillCheckBreakdown(sheet: Phase1CharacterSheet, skillId: SkillId): NumericBreakdown {
    const skill = sheet.skills[skillId];
    const parts: RollModifierPart[] = [
        {
            label: `${ABILITY_BY_ID[skill.ability].name} modifier`,
            value: getAbilityModifier(sheet.abilities[skill.ability]),
            source: 'ability',
        },
    ];
    const audit = [`Uses ${ABILITY_BY_ID[skill.ability].name} for ${skill.label}.`];
    const proficiencyBonus = getPhase1ProficiencyBonus(sheet);

    if (skill.proficiency === 'proficient') {
        parts.push({
            label: 'Skill proficiency',
            value: proficiencyBonus,
            source: 'proficiency',
        });
        audit.push(`Adds proficiency bonus ${formatSignedNumber(proficiencyBonus)}.`);
    } else if (skill.proficiency === 'expertise') {
        parts.push({
            label: 'Skill expertise',
            value: proficiencyBonus * 2,
            source: 'proficiency',
        });
        audit.push(`Adds double proficiency ${formatSignedNumber(proficiencyBonus * 2)}.`);
    }

    if (skill.bonus !== 0) {
        parts.push({
            label: 'Skill bonus',
            value: skill.bonus,
            source: 'bonus',
        });
        audit.push('Includes modeled skill-specific bonuses.');
    }

    const adjustment = sheet.rollAdjustments.skills[skillId] ?? 0;
    if (adjustment !== 0) {
        parts.push({
            label: 'Existing sheet adjustments',
            value: adjustment,
            source: 'legacy',
        });
        audit.push('Carries forward existing sheet adjustments.');
    }

    if (skill.source) {
        audit.push(`Proficiency source: ${skill.source}.`);
    }

    return buildBreakdown(parts, audit);
}

export function buildInitiativeBreakdown(sheet: Phase1CharacterSheet): NumericBreakdown {
    const parts: RollModifierPart[] = [
        {
            label: 'Dexterity modifier',
            value: getAbilityModifier(sheet.abilities.dex),
            source: 'ability',
        },
    ];
    const audit = [`Derived from Dexterity ${sheet.abilities.dex}.`];

    if (sheet.rollAdjustments.initiative !== 0) {
        parts.push({
            label: 'Existing initiative adjustments',
            value: sheet.rollAdjustments.initiative,
            source: 'legacy',
        });
        audit.push('Carries forward existing initiative adjustments from the sheet snapshot.');
    }

    return buildBreakdown(parts, audit);
}

export function buildAbilityCheckRoll(sheet: Phase1CharacterSheet, ability: AbilityId): StructuredRollRequest {
    const descriptor = ABILITY_BY_ID[ability];
    return buildRollRequest(
        `ability:${sheet.id}:${ability}`,
        `${descriptor.name} Check`,
        'ability',
        buildAbilityCheckBreakdown(sheet, ability),
    );
}

export function buildSavingThrowRoll(sheet: Phase1CharacterSheet, ability: AbilityId): StructuredRollRequest {
    const descriptor = ABILITY_BY_ID[ability];
    return buildRollRequest(
        `save:${sheet.id}:${ability}`,
        `${descriptor.name} Saving Throw`,
        'saving-throw',
        buildSavingThrowBreakdown(sheet, ability),
    );
}

export function buildSkillCheckRoll(sheet: Phase1CharacterSheet, skillId: SkillId): StructuredRollRequest {
    const skill = sheet.skills[skillId];
    return buildRollRequest(
        `skill:${sheet.id}:${skillId}`,
        skill.label,
        'skill',
        buildSkillCheckBreakdown(sheet, skillId),
    );
}

export function buildInitiativeRoll(sheet: Phase1CharacterSheet): StructuredRollRequest {
    return buildRollRequest(
        `initiative:${sheet.id}`,
        'Initiative',
        'initiative',
        buildInitiativeBreakdown(sheet),
    );
}

function toRollableRow(
    id: string,
    label: string,
    request: StructuredRollRequest,
    subtitle?: string,
): RollableSheetRow {
    return {
        id,
        label,
        subtitle,
        total: request.totalModifier,
        request,
    };
}

export function createCharacterSheetViewModel(sheet: Phase1CharacterSheet): CharacterSheetViewModel {
    return {
        proficiencyBonus: getPhase1ProficiencyBonus(sheet),
        initiative: toRollableRow(
            'initiative',
            'Initiative',
            buildInitiativeRoll(sheet),
            'Dexterity-based',
        ),
        abilities: ABILITY_DEFINITIONS.map((ability) => ({
            id: ability.id,
            label: ability.label,
            name: ability.name,
            score: sheet.abilities[ability.id],
            modifier: getAbilityModifier(sheet.abilities[ability.id]),
            request: buildAbilityCheckRoll(sheet, ability.id),
        })),
        saves: ABILITY_DEFINITIONS.map((ability) =>
            toRollableRow(
                `save:${ability.id}`,
                ability.name,
                buildSavingThrowRoll(sheet, ability.id),
                sheet.savingThrowProficiencies.includes(ability.id) ? 'Proficient' : undefined,
            ),
        ),
        skills: SKILL_DEFINITIONS.map((skill) => {
            const model = sheet.skills[skill.id];
            const subtitle =
                model.proficiency === 'expertise'
                    ? 'Expertise'
                    : model.proficiency === 'proficient'
                        ? 'Proficient'
                        : undefined;
            return toRollableRow(
                `skill:${skill.id}`,
                skill.label,
                buildSkillCheckRoll(sheet, skill.id),
                subtitle,
            );
        }),
    };
}
