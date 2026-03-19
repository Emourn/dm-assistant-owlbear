import type { StoredCharacterCollection } from '../domain/characterRecords';

interface CharacterCollectionPanelProps {
    collection: StoredCharacterCollection | null;
    activeCharacterId: string | null;
    canEdit: boolean;
    isSaving: boolean;
    onSelectCharacter: (characterId: string) => void;
    onCreateCharacter: () => Promise<void>;
    onDuplicateCharacter: (characterId: string) => Promise<void>;
    onDeleteCharacter: (characterId: string) => Promise<void>;
}

export function CharacterCollectionPanel({
    collection,
    activeCharacterId,
    canEdit,
    isSaving,
    onSelectCharacter,
    onCreateCharacter,
    onDuplicateCharacter,
    onDeleteCharacter,
}: CharacterCollectionPanelProps) {
    if (!canEdit || !collection) {
        return null;
    }

    const activeCharacter = collection.characters.find((record) => record.sheet.id === activeCharacterId) ?? null;

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.26em] text-sky-300">Character collection</div>
                    <div className="mt-2 text-lg font-semibold text-parchment">Manage room sheets</div>
                    <div className="mt-1 text-sm text-stone-400">
                        Create real characters, switch the active record, or duplicate a sheet before making class-specific edits.
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => void onCreateCharacter()}
                        disabled={isSaving}
                        className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? 'Working...' : 'New character'}
                    </button>
                    <button
                        type="button"
                        onClick={() => activeCharacter && void onDuplicateCharacter(activeCharacter.sheet.id)}
                        disabled={isSaving || !activeCharacter}
                        className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Duplicate active
                    </button>
                    <button
                        type="button"
                        onClick={() => activeCharacter && void onDeleteCharacter(activeCharacter.sheet.id)}
                        disabled={isSaving || !activeCharacter}
                        className="rounded-full border border-red-400/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:border-red-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Delete active
                    </button>
                </div>
            </div>

            {collection.characters.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                    {collection.characters.map((record) => (
                        <button
                            key={record.sheet.id}
                            type="button"
                            onClick={() => onSelectCharacter(record.sheet.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                record.sheet.id === activeCharacterId
                                    ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                                    : 'border-stone-700 bg-stone-950 text-stone-400 hover:border-stone-500 hover:text-stone-200'
                            }`}
                        >
                            {record.sheet.name}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-stone-700 bg-stone-950/50 p-4 text-sm text-stone-400">
                    No character records are stored yet. Create one here and the rest of the Phase 1 sheet tooling will light up around it.
                </div>
            )}
        </section>
    );
}
