import type { Phase1CharacterSheet } from './types';

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'condition';
}

function shouldRecoverResource(
    kind: 'short' | 'long',
    resource: Phase1CharacterSheet['resources'][number],
): boolean {
    if (resource.kind !== 'resource' && resource.kind !== 'spell-slot') {
        return false;
    }

    if (kind === 'short') {
        return resource.resetOn === 'short';
    }

    return resource.resetOn === 'short' || resource.resetOn === 'long';
}

export function updateSheetResourceCounter(
    sheet: Phase1CharacterSheet,
    resourceId: string,
    delta: number,
): Phase1CharacterSheet {
    const resources = sheet.resources.map((resource) =>
        resource.id === resourceId
            ? {
                ...resource,
                current: clamp(resource.current + delta, 0, resource.max),
            }
            : resource,
    );

    const spellcasting = sheet.spellcasting
        ? {
            ...sheet.spellcasting,
            slots: sheet.spellcasting.slots.map((slot) =>
                slot.id === resourceId
                    ? {
                        ...slot,
                        current: clamp(slot.current + delta, 0, slot.max),
                    }
                    : slot,
            ),
        }
        : null;

    return {
        ...sheet,
        resources,
        spellcasting,
    };
}

export function updateDeathSaves(
    sheet: Phase1CharacterSheet,
    kind: 'successes' | 'failures',
    delta: number,
): Phase1CharacterSheet {
    return {
        ...sheet,
        deathSaves: {
            ...sheet.deathSaves,
            [kind]: clamp(sheet.deathSaves[kind] + delta, 0, 3),
        },
    };
}

export function setProficiencyBonusOverride(
    sheet: Phase1CharacterSheet,
    value: number | null,
): Phase1CharacterSheet {
    return {
        ...sheet,
        proficiencyBonusOverride: value,
    };
}

export function setInitiativeAdjustment(
    sheet: Phase1CharacterSheet,
    value: number,
): Phase1CharacterSheet {
    return {
        ...sheet,
        rollAdjustments: {
            ...sheet.rollAdjustments,
            initiative: value,
        },
    };
}

export function applyHitPointDelta(
    sheet: Phase1CharacterSheet,
    kind: 'damage' | 'healing',
    amount: number,
): Phase1CharacterSheet {
    const nextAmount = clamp(Math.trunc(amount), 0, 999);
    if (nextAmount === 0) {
        return sheet;
    }

    if (kind === 'healing') {
        return {
            ...sheet,
            hitPoints: {
                ...sheet.hitPoints,
                current: clamp(sheet.hitPoints.current + nextAmount, 0, sheet.hitPoints.max),
            },
        };
    }

    const absorbedByTemp = Math.min(sheet.hitPoints.temp, nextAmount);
    const remaining = nextAmount - absorbedByTemp;

    return {
        ...sheet,
        hitPoints: {
            ...sheet.hitPoints,
            temp: sheet.hitPoints.temp - absorbedByTemp,
            current: clamp(sheet.hitPoints.current - remaining, 0, sheet.hitPoints.max),
        },
    };
}

export function addCondition(
    sheet: Phase1CharacterSheet,
    condition: {
        label: string;
        source?: string;
        summary?: string;
    },
): Phase1CharacterSheet {
    const label = condition.label.trim();
    if (!label) {
        return sheet;
    }

    const id = `condition:${slugify(label)}`;
    const nextCondition = {
        id,
        label,
        source: condition.source?.trim() || undefined,
        summary: condition.summary?.trim() || undefined,
    };
    const existingIndex = sheet.conditions.findIndex((entry) => entry.id === id);

    if (existingIndex === -1) {
        return {
            ...sheet,
            conditions: [...sheet.conditions, nextCondition],
        };
    }

    return {
        ...sheet,
        conditions: sheet.conditions.map((entry, index) =>
            index === existingIndex ? nextCondition : entry),
    };
}

export function removeCondition(
    sheet: Phase1CharacterSheet,
    label: string,
): Phase1CharacterSheet {
    const normalized = slugify(label);
    const nextConditions = sheet.conditions.filter((condition) => slugify(condition.label) !== normalized);
    if (nextConditions.length === sheet.conditions.length) {
        return sheet;
    }

    return {
        ...sheet,
        conditions: nextConditions,
    };
}

export function applyRestRecovery(
    sheet: Phase1CharacterSheet,
    kind: 'short' | 'long',
): Phase1CharacterSheet {
    const resources = sheet.resources.map((resource) =>
        shouldRecoverResource(kind, resource)
            ? {
                ...resource,
                current: resource.max,
            }
            : resource,
    );

    const spellcasting = sheet.spellcasting
        ? {
            ...sheet.spellcasting,
            slots: sheet.spellcasting.slots.map((slot) =>
                shouldRecoverResource(kind, slot)
                    ? {
                        ...slot,
                        current: slot.max,
                    }
                    : slot,
            ),
        }
        : null;

    return {
        ...sheet,
        resources,
        spellcasting,
    };
}
