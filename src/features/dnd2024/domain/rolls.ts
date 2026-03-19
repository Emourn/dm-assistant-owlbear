import type {
    ActionOutcomeRollPart,
    ActionOutcomeRollRequest,
    ActionOutcomeRollResult,
    StructuredRollRequest,
    StructuredRollResult,
} from './types';

export interface StructuredRollOptions {
    rng?: () => number;
    timestamp?: number;
}

function rollDie(rng: () => number): number {
    return Math.floor(rng() * 20) + 1;
}

interface ParsedOutcomeTerm {
    kind: 'dice' | 'modifier';
    sign: 1 | -1;
    count?: number;
    sides?: number;
    value?: number;
}

function parseOutcomeFormula(formula: string): ParsedOutcomeTerm[] | null {
    const normalized = formula.replace(/\s+/g, '');
    if (!normalized) {
        return null;
    }

    const terms: ParsedOutcomeTerm[] = [];
    let index = 0;

    while (index < normalized.length) {
        let sign: 1 | -1 = 1;
        const current = normalized[index];
        if (current === '+') {
            index += 1;
        } else if (current === '-') {
            sign = -1;
            index += 1;
        }

        const next = normalized.slice(index);
        const match = next.match(/^(\d*d\d+|\d+)/i);
        if (!match) {
            return null;
        }

        const token = match[1];
        index += token.length;

        if (/d/i.test(token)) {
            const [countText, sidesText] = token.toLowerCase().split('d');
            const count = countText === '' ? 1 : Number.parseInt(countText, 10);
            const sides = Number.parseInt(sidesText, 10);
            if (!Number.isFinite(count) || !Number.isFinite(sides) || count <= 0 || sides <= 0) {
                return null;
            }

            terms.push({
                kind: 'dice',
                sign,
                count,
                sides,
            });
            continue;
        }

        const value = Number.parseInt(token, 10);
        if (!Number.isFinite(value)) {
            return null;
        }

        terms.push({
            kind: 'modifier',
            sign,
            value,
        });
    }

    return terms.length > 0 ? terms : null;
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

export function rollActionOutcome(
    request: ActionOutcomeRollRequest,
    options: StructuredRollOptions = {},
): ActionOutcomeRollResult | null {
    const parsed = parseOutcomeFormula(request.formula);
    if (!parsed) {
        return null;
    }

    const rng = options.rng ?? Math.random;
    const parts: ActionOutcomeRollPart[] = parsed.map((term) => {
        if (term.kind === 'modifier') {
            const signed = (term.value ?? 0) * term.sign;
            return {
                kind: 'modifier',
                label: signed >= 0 ? `+${Math.abs(signed)}` : `-${Math.abs(signed)}`,
                value: signed,
            };
        }

        const rolls = Array.from({ length: term.count ?? 1 }, () => Math.floor(rng() * (term.sides ?? 1)) + 1);
        const subtotal = rolls.reduce((sum, roll) => sum + roll, 0) * term.sign;
        const baseLabel = `${term.count}d${term.sides}`;
        return {
            kind: 'dice',
            label: term.sign === -1 ? `-${baseLabel}` : baseLabel,
            value: subtotal,
            rolls,
        };
    });

    return {
        ...request,
        total: parts.reduce((sum, part) => sum + part.value, 0),
        parts,
        metadata: {
            timestamp: options.timestamp ?? Date.now(),
        },
    };
}
