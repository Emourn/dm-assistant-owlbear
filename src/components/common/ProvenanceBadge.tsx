import type { ImportOrigin, RulesEdition } from '../../types/source';
import {
    getEditionClasses,
    getEditionLabel,
    getOriginClasses,
    getOriginLabel
} from '../../engine/sourceMetadata';

interface ProvenanceBadgeProps {
    origin?: ImportOrigin;
    edition?: RulesEdition;
    compact?: boolean;
}

export function ProvenanceBadge({ origin = 'manual', edition = 'unknown', compact = false }: ProvenanceBadgeProps) {
    const sizeClasses = compact ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1';

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full border font-semibold tracking-wide ${sizeClasses} ${getOriginClasses(origin)}`}>
                {getOriginLabel(origin)}
            </span>
            <span className={`inline-flex items-center rounded-full border font-semibold tracking-wide ${sizeClasses} ${getEditionClasses(edition)}`}>
                {getEditionLabel(edition)}
            </span>
        </div>
    );
}
