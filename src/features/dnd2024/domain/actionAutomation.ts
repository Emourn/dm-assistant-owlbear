import { ABILITY_BY_ID } from './constants';
import { getPhase1ProficiencyBonus, getAbilityModifier, formatSignedNumber } from './sheet';
import { updateSheetResourceCounter } from './mutations';
import type {
    ActionOutcomeRollRequest,
    AbilityId,
    NumericBreakdown,
    Phase1ActionOutcome,
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

export interface ActionSaveDcSummary {
    label: string;
    saveAbility: AbilityId;
    dc: number;
    effectSummary?: string;
    successSummary?: string;
    failureSummary?: string;
    audit: string[];
}

export interface ActionOutcomeSummary {
    id: string;
    label: string;
    kind: Phase1ActionOutcome['kind'];
    formula?: string;
    damageType?: string;
    summary?: string;
    request: ActionOutcomeRollRequest | null;
    audit: string[];
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

export function canUseActionSaveDc(sheet: Phase1CharacterSheet, action: Phase1ActionSummary): boolean {
    if (action.automation?.kind !== 'save-dc') {
        return false;
    }

    if (action.automation.dcSource === 'spellcasting') {
        return Boolean(sheet.spellcasting);
    }

    if (action.automation.dcSource === 'fixed') {
        return typeof action.automation.fixedDc === 'number';
    }

    return true;
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

function createOutcomeRequest(
    sheet: Phase1CharacterSheet,
    action: Phase1ActionSummary,
    index: number,
    outcome: Phase1ActionOutcome,
    audit: string[],
): ActionOutcomeRollRequest | null {
    const formula = outcome.formula?.trim();
    if (!formula) {
        return null;
    }

    return {
        id: `action-outcome:${sheet.id}:${action.id}:${index + 1}`,
        label: `${action.name} - ${outcome.label}`,
        kind: outcome.kind,
        formula,
        damageType: outcome.damageType,
        summary: outcome.summary,
        audit,
    };
}

function computeSaveDc(sheet: Phase1CharacterSheet, action: Phase1ActionSummary): { dc: number; audit: string[] } | null {
    if (action.automation?.kind !== 'save-dc') {
        return null;
    }

    const audit: string[] = [];
    let dc: number;

    if (action.automation.dcSource === 'spellcasting') {
        if (!sheet.spellcasting) {
            return null;
        }
        dc = sheet.spellcasting.saveDc;
        audit.push(`Uses stored spell save DC ${sheet.spellcasting.saveDc}.`);
    } else if (action.automation.dcSource === 'fixed') {
        if (typeof action.automation.fixedDc !== 'number') {
            return null;
        }
        dc = action.automation.fixedDc;
        audit.push(`Uses fixed DC ${action.automation.fixedDc}.`);
    } else {
        const ability = action.automation.dcSource;
        const modifier = getAbilityModifier(sheet.abilities[ability]);
        const proficiency = action.automation.proficient ? getPhase1ProficiencyBonus(sheet) : 0;
        dc = 8 + modifier + proficiency;
        audit.push(`Base DC 8 + ${ABILITY_BY_ID[ability].name} modifier ${formatSignedNumber(modifier)}.`);
        if (action.automation.proficient) {
            audit.push(`Adds proficiency bonus ${formatSignedNumber(proficiency)}.`);
        }
    }

    if (action.automation.bonus !== 0) {
        dc += action.automation.bonus;
        audit.push(`Applies action DC adjustment ${formatSignedNumber(action.automation.bonus)}.`);
    }

    return {
        dc,
        audit,
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

export function buildActionSaveDcSummary(
    sheet: Phase1CharacterSheet,
    action: Phase1ActionSummary,
): ActionSaveDcSummary | null {
    if (action.automation?.kind !== 'save-dc') {
        return null;
    }

    const resolved = computeSaveDc(sheet, action);
    if (!resolved) {
        return null;
    }

    const useState = getActionUseState(sheet, action);
    const audit = [
        ...resolved.audit,
        `Targets a ${ABILITY_BY_ID[action.automation.saveAbility].name} saving throw.`,
    ];

    if (useState.resource) {
        audit.push(`Can spend ${useState.amount} from ${useState.resource.name}.`);
    }

    return {
        label: `${action.name} Save DC`,
        saveAbility: action.automation.saveAbility,
        dc: resolved.dc,
        effectSummary: action.automation.effectSummary,
        successSummary: action.automation.successSummary,
        failureSummary: action.automation.failureSummary,
        audit,
    };
}

export function buildActionOutcomeSummaries(
    sheet: Phase1CharacterSheet,
    action: Phase1ActionSummary,
): ActionOutcomeSummary[] {
    const outcomes = action.automation?.outcomes ?? [];
    if (outcomes.length === 0) {
        return [];
    }

    return outcomes.map((outcome, index) => {
        const audit = [`Outcome ${outcome.label} is modeled on ${action.name}.`];
        if (outcome.damageType) {
            audit.push(`Typed as ${outcome.damageType}.`);
        }
        if (outcome.summary) {
            audit.push(outcome.summary);
        }
        if (outcome.formula) {
            audit.push(`Uses formula ${outcome.formula}.`);
        } else {
            audit.push('This outcome is descriptive only.');
        }

        return {
            id: `${action.id}:outcome:${index + 1}`,
            label: outcome.label,
            kind: outcome.kind,
            formula: outcome.formula?.trim() || undefined,
            damageType: outcome.damageType,
            summary: outcome.summary,
            request: createOutcomeRequest(sheet, action, index, outcome, audit),
            audit,
        };
    });
}

export function spendActionResource(sheet: Phase1CharacterSheet, action: Phase1ActionSummary): Phase1CharacterSheet {
    const useState = getActionUseState(sheet, action);
    if (!useState.resource || !useState.canSpend) {
        return sheet;
    }

    return updateSheetResourceCounter(sheet, useState.resource.id, -useState.amount);
}
