import type { StructuredRollRequest, StructuredRollResult } from './types';

export interface StructuredRollOptions {
    rng?: () => number;
    timestamp?: number;
}

function rollDie(rng: () => number): number {
    return Math.floor(rng() * 20) + 1;
}

export function rollStructuredD20(
    request: StructuredRollRequest,
    options: StructuredRollOptions = {},
): StructuredRollResult {
    const rng = options.rng ?? Math.random;
    const first = rollDie(rng);
    const second = request.advantage === 'normal' ? null : rollDie(rng);

    let kept = first;
    let dropped: number | null = null;

    if (second !== null) {
        if (request.advantage === 'advantage') {
            kept = Math.max(first, second);
            dropped = Math.min(first, second);
        } else {
            kept = Math.min(first, second);
            dropped = Math.max(first, second);
        }
    }

    return {
        ...request,
        rolled: first,
        secondaryRolled: second,
        kept,
        dropped,
        total: kept + request.totalModifier,
        metadata: {
            critical: kept === 20,
            fumble: kept === 1,
            timestamp: options.timestamp ?? Date.now(),
        },
    };
}
