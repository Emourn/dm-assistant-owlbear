import { ABILITY_BY_ID } from './constants';
import { getPhase1ProficiencyBonus, getAbilityModifier, formatSignedNumber } from './sheet';
import { updateSheetResourceCounter } from './mutations';
import type {
    NumericBreakdown,
    Phase1ActionSummary,
    Phase1CharacterSheet,
    Phase1ResourceCounter,
    RollModifierPart,
    StructuredRollRequest,
} from './types';

export interface ActionUseState {
    resource: Phase1ResourceCounter | null;
    amount: number;
    canSpend: boolean;
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

function buildRequest(
    id: string,
    label: string,
    breakdown: NumericBreakdown,
): StructuredRollRequest {
    return {
        id,
        label,
        scope: 'attack',
        formula: breakdown.formula,
        totalModifier: breakdown.total,
        breakdown: breakdown.parts,
        audit: breakdown.audit,
        advantage: 'normal',
    };
}

export function canRollAction(sheet: Phase1CharacterSheet, action: Phase1ActionSummary): boolean {
    if (action.automation?.kind !== 'attack-roll') {
        return false;
    }

    return action.automation.attackSource !== 'spellcasting' || Boolean(sheet.spellcasting);
}

export function getActionUseState(
    sheet: Phase1CharacterSheet,
    action: Phase1ActionSummary,
): ActionUseState {
    const cost = action.automation?.resourceCost;
    if (!cost) {
        return {
            resource: null,
            amount: 0,
            canSpend: false,
        };
    }

    const resource = [
        ...sheet.resources,
        ...(sheet.spellcasting?.slots ?? []),
    ].find((entry) => entry.id === cost.resourceId) ?? null;

    return {
        resource,
        amount: cost.amount,
        canSpend: resource !== null && resource.current >= cost.amount,
    };
}

export function buildActionRoll(sheet: Phase1CharacterSheet, action: Phase1ActionSummary): StructuredRollRequest | null {
    if (action.automation?.kind !== 'attack-roll') {
        return null;
    }

    const parts: RollModifierPart[] = [];
    const audit: string[] = [];

    if (action.automation.attackSource === 'spellcasting') {
        if (!sheet.spellcasting) {
            return null;
        }

        parts.push({
            label: 'Spell attack bonus',
            value: sheet.spellcasting.attackBonus,
            source: 'manual',
        });
        audit.push(`Uses stored spell attack bonus ${formatSignedNumber(sheet.spellcasting.attackBonus)}.`);
    } else {
        const ability = action.automation.attackSource;
        const modifier = getAbilityModifier(sheet.abilities[ability]);
        parts.push({
            label: `${ABILITY_BY_ID[ability].name} modifier`,
            value: modifier,
            source: 'ability',
        });
        audit.push(`Uses ${ABILITY_BY_ID[ability].name} ${sheet.abilities[ability]} for the attack roll.`);

        if (action.automation.proficient) {
            const proficiencyBonus = getPhase1ProficiencyBonus(sheet);
            parts.push({
                label: 'Attack proficiency',
                value: proficiencyBonus,
                source: 'proficiency',
            });
            audit.push(`Adds proficiency bonus ${formatSignedNumber(proficiencyBonus)}.`);
        }
    }

    if (action.automation.bonus !== 0) {
        parts.push({
            label: 'Action bonus',
            value: action.automation.bonus,
            source: 'bonus',
        });
        audit.push('Includes action-specific attack adjustments.');
    }

    if (action.automation.range) {
        audit.push(`Tagged as ${action.automation.range} attack.`);
    }

    const useState = getActionUseState(sheet, action);
    if (useState.resource) {
        audit.push(`Can spend ${useState.amount} from ${useState.resource.name}.`);
    }

    return buildRequest(
        `action:${sheet.id}:${action.id}`,
        `${action.name} Attack`,
        buildBreakdown(parts, audit),
    );
}

export function spendActionResource(sheet: Phase1CharacterSheet, action: Phase1ActionSummary): Phase1CharacterSheet {
    const useState = getActionUseState(sheet, action);
    if (!useState.resource || !useState.canSpend) {
        return sheet;
    }

    return updateSheetResourceCounter(sheet, useState.resource.id, -useState.amount);
}
