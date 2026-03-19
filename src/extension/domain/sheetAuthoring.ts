import type {
    AbilityId,
    Phase1ActionOutcome,
    Phase1ActionSummary,
    Phase1CharacterSheet,
    Phase1ResourceCounter,
    Phase1Spellcasting,
} from '../../features/dnd2024/domain/types';

export interface EditableActionOutcomeInput {
    label: string;
    kind: 'damage' | 'healing' | 'effect';
    formula?: string;
    damageType?: string;
    summary?: string;
    hpApplication?: 'none' | 'damage' | 'healing';
    conditionLabel?: string;
    conditionMode?: 'add' | 'remove';
}

export interface EditableActionInput {
    id?: string;
    name: string;
    kind: string;
    source?: string;
    description?: string;
    automationMode?: 'none' | 'attack-roll' | 'save-dc';
    attackEnabled?: boolean;
    attackSource?: AbilityId | 'spellcasting';
    proficient?: boolean;
    attackBonus?: number;
    attackRange?: 'melee' | 'ranged' | 'other';
    saveAbility?: AbilityId;
    dcSource?: AbilityId | 'spellcasting' | 'fixed';
    fixedDc?: number;
    effectSummary?: string;
    successSummary?: string;
    failureSummary?: string;
    outcomes?: EditableActionOutcomeInput[];
    resourceCostId?: string;
    resourceCostAmount?: number;
}

export interface EditableSpellSlotInput {
    id?: string;
    name: string;
    current: number;
    max: number;
    resetOn: Phase1ResourceCounter['resetOn'];
    level?: number;
    detail?: string;
}

export interface EditableSpellcastingInput {
    ability: AbilityId;
    attackBonus: number;
    saveDc: number;
    slots: EditableSpellSlotInput[];
}

function clampInteger(value: number, fallback: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeText(value: string | undefined): string | undefined {
    const next = value?.trim();
    return next ? next : undefined;
}

function normalizeKind(value: string, fallback: string): string {
    const next = value.trim().toLowerCase();
    return next || fallback;
}

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'entry';
}

function createUniqueChildId(
    sheetId: string,
    prefix: 'action' | 'slot',
    name: string,
    takenIds: Set<string>,
): string {
    const base = `${sheetId}:${prefix}:${slugify(name)}`;
    let next = base;
    let suffix = 2;

    while (takenIds.has(next)) {
        next = `${base}-${suffix}`;
        suffix += 1;
    }

    takenIds.add(next);
    return next;
}

function sanitizeAction(
    sheetId: string,
    input: EditableActionInput,
    takenIds: Set<string>,
): Phase1ActionSummary | null {
    const name = input.name.trim();
    if (!name) {
        return null;
    }

    const existingId = input.id?.trim();
    const id = existingId && !takenIds.has(existingId)
        ? existingId
        : createUniqueChildId(sheetId, 'action', name, takenIds);

    takenIds.add(id);

    const sanitizedOutcomes = (input.outcomes ?? [])
        .map((outcome) => sanitizeOutcome(outcome))
        .filter((outcome): outcome is Phase1ActionOutcome => Boolean(outcome));

    return {
        id,
        name,
        kind: normalizeKind(input.kind, 'action'),
        source: normalizeText(input.source),
        description: normalizeText(input.description),
        automation: (input.automationMode ?? (input.attackEnabled ? 'attack-roll' : 'none')) === 'attack-roll'
            ? {
                kind: 'attack-roll',
                attackSource: input.attackSource ?? 'str',
                proficient: Boolean(input.proficient),
                bonus: clampInteger(input.attackBonus ?? 0, 0, -20, 40),
                range: input.attackRange ?? 'other',
                outcomes: sanitizedOutcomes,
                resourceCost: input.resourceCostId && clampInteger(input.resourceCostAmount ?? 1, 1, 1, 99) > 0
                    ? {
                        resourceId: input.resourceCostId,
                        amount: clampInteger(input.resourceCostAmount ?? 1, 1, 1, 99),
                    }
                    : null,
            }
            : (input.automationMode ?? 'none') === 'save-dc'
                ? {
                    kind: 'save-dc',
                    saveAbility: input.saveAbility ?? 'dex',
                    dcSource: input.dcSource ?? 'spellcasting',
                    proficient: Boolean(input.proficient),
                    bonus: clampInteger(input.attackBonus ?? 0, 0, -20, 40),
                    fixedDc: (input.dcSource ?? 'spellcasting') === 'fixed'
                        ? clampInteger(input.fixedDc ?? 10, 10, 1, 40)
                        : null,
                    effectSummary: normalizeText(input.effectSummary),
                    successSummary: normalizeText(input.successSummary),
                    failureSummary: normalizeText(input.failureSummary),
                    outcomes: sanitizedOutcomes,
                    resourceCost: input.resourceCostId && clampInteger(input.resourceCostAmount ?? 1, 1, 1, 99) > 0
                        ? {
                            resourceId: input.resourceCostId,
                            amount: clampInteger(input.resourceCostAmount ?? 1, 1, 1, 99),
                        }
                        : null,
                }
            : null,
    };
}

function sanitizeOutcome(input: EditableActionOutcomeInput): Phase1ActionOutcome | null {
    const label = input.label.trim();
    const formula = normalizeText(input.formula);
    const summary = normalizeText(input.summary);
    const conditionLabel = normalizeText(input.conditionLabel);
    const hpApplication = input.hpApplication === 'damage' || input.hpApplication === 'healing'
        ? input.hpApplication
        : undefined;

    if (!label || (!formula && !summary && !hpApplication && !conditionLabel)) {
        return null;
    }

    return {
        label,
        kind: input.kind,
        formula,
        damageType: normalizeText(input.damageType),
        summary,
        application: hpApplication || conditionLabel
            ? {
                hitPoints: hpApplication,
                conditionLabel,
                conditionMode: input.conditionMode === 'remove' ? 'remove' : 'add',
            }
            : null,
    };
}

function sanitizeSpellSlot(
    sheetId: string,
    input: EditableSpellSlotInput,
    takenIds: Set<string>,
): Phase1ResourceCounter | null {
    const name = input.name.trim();
    if (!name) {
        return null;
    }

    const max = clampInteger(input.max, 0, 0, 99);
    const existingId = input.id?.trim();
    const id = existingId && !takenIds.has(existingId)
        ? existingId
        : createUniqueChildId(sheetId, 'slot', name, takenIds);

    takenIds.add(id);

    return {
        id,
        name,
        current: clampInteger(input.current, max, 0, max),
        max,
        resetOn: input.resetOn,
        kind: 'spell-slot',
        level: clampInteger(input.level ?? 1, 1, 1, 9),
        detail: normalizeText(input.detail),
    };
}

export function updateSheetActions(
    sheet: Phase1CharacterSheet,
    actions: EditableActionInput[],
): Phase1CharacterSheet {
    const takenIds = new Set<string>();
    const nextActions = actions
        .map((action) => sanitizeAction(sheet.id, action, takenIds))
        .filter((action): action is Phase1ActionSummary => Boolean(action));

    return {
        ...sheet,
        actions: nextActions,
    };
}

export function updateSheetSpellcasting(
    sheet: Phase1CharacterSheet,
    spellcasting: EditableSpellcastingInput | null,
): Phase1CharacterSheet {
    if (!spellcasting) {
        return {
            ...sheet,
            spellcasting: null,
        };
    }

    const takenIds = new Set<string>();
    const nextSpellcasting: Phase1Spellcasting = {
        ability: spellcasting.ability,
        attackBonus: clampInteger(spellcasting.attackBonus, 0, -20, 40),
        saveDc: clampInteger(spellcasting.saveDc, 8, 1, 40),
        slots: spellcasting.slots
            .map((slot) => sanitizeSpellSlot(sheet.id, slot, takenIds))
            .filter((slot): slot is Phase1ResourceCounter => Boolean(slot)),
    };

    return {
        ...sheet,
        spellcasting: nextSpellcasting,
    };
}
