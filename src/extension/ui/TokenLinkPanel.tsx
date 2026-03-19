import type { Phase1CharacterSheet } from '../../features/dnd2024/domain/types';
import type { CharacterRepositorySnapshot } from '../owlbear/characterRepository';

interface TokenLinkPanelProps {
    sheet: Phase1CharacterSheet;
    role: 'GM' | 'PLAYER' | null;
    characterState: CharacterRepositorySnapshot;
    defaultLinkVisibility: 'room' | 'assigned-only' | 'gm-only';
    isLinking: boolean;
    onLink: (sheet: Phase1CharacterSheet) => Promise<void>;
    onUnlink: () => Promise<void>;
}

function resolutionLabel(source: CharacterRepositorySnapshot['resolution']['source']): string {
    if (source === 'selected-token') {
        return 'Viewing selected token';
    }
    if (source === 'assigned-character') {
        return 'Viewing assigned character';
    }
    if (source === 'active-character') {
        return 'Viewing active record';
    }
    return 'No linked record';
}

export function TokenLinkPanel({
    sheet,
    role,
    characterState,
    defaultLinkVisibility,
    isLinking,
    onLink,
    onUnlink,
}: TokenLinkPanelProps) {
    const selection = characterState.selection;
    const hasSelection = selection.count > 0;
    const hasLinkedSelection = selection.linkedCount > 0;

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">Token link</div>
                    <div className="mt-2 text-lg font-semibold text-parchment">{resolutionLabel(characterState.resolution.source)}</div>
                    <div className="mt-1 text-sm text-stone-400">
                        {selection.count === 0
                            ? 'Select one or more tokens to link them to the active character.'
                            : `${selection.count} selected token${selection.count === 1 ? '' : 's'} - ${selection.linkedCount} linked`}
                    </div>
                    {role === 'GM' && (
                        <div className="mt-1 text-xs text-stone-500">
                            New links use the current default visibility: {defaultLinkVisibility}.
                        </div>
                    )}
                </div>
                {role === 'GM' && (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => void onUnlink()}
                            disabled={!hasLinkedSelection || isLinking}
                            className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-300 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Unlink selection
                        </button>
                        <button
                            type="button"
                            onClick={() => void onLink(sheet)}
                            disabled={!hasSelection || isLinking}
                            className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLinking ? 'Linking...' : 'Link active sheet'}
                        </button>
                    </div>
                )}
            </div>

            {selection.links.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {selection.links.map((link, index) => (
                        <span
                            key={`${link.characterId}:${index}`}
                            className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs text-stone-300"
                        >
                            {link.characterName} ({link.visibility})
                        </span>
                    ))}
                </div>
            )}
        </section>
    );
}
