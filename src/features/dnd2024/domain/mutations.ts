import type { Phase1CharacterSheet } from './types';

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
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
