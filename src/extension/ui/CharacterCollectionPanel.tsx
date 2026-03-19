import { useMemo, useState } from 'react';
import {
    serializeStoredCharacterCollection,
    serializeStoredCharacterRecord,
    type StoredCharacterCollection,
} from '../domain/characterRecords';

interface CharacterCollectionPanelProps {
    collection: StoredCharacterCollection | null;
    activeCharacterId: string | null;
    canEdit: boolean;
    isSaving: boolean;
    onSelectCharacter: (characterId: string) => void;
    onCreateCharacter: () => Promise<void>;
    onDuplicateCharacter: (characterId: string) => Promise<void>;
    onDeleteCharacter: (characterId: string) => Promise<void>;
    onImportCharacters: (payload: string, mode: 'append' | 'replace') => Promise<number>;
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
    onImportCharacters,
}: CharacterCollectionPanelProps) {
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [exportText, setExportText] = useState('');
    const [importText, setImportText] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const activeCharacter = useMemo(
        () => collection?.characters.find((record) => record.sheet.id === activeCharacterId) ?? null,
        [activeCharacterId, collection],
    );

    if (!canEdit || !collection) {
        return null;
    }

    const handleImport = async (mode: 'append' | 'replace') => {
        setStatus(null);
        try {
            const importedCount = await onImportCharacters(importText, mode);
            setStatus(
                mode === 'append'
                    ? `Imported ${importedCount} character${importedCount === 1 ? '' : 's'} into this room.`
                    : `Replaced this room with ${importedCount} imported character${importedCount === 1 ? '' : 's'}.`,
            );
            setImportText('');
        } catch (cause) {
            setStatus(cause instanceof Error ? cause.message : 'Import failed.');
        }
    };

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
                    <button
                        type="button"
                        onClick={() => setIsTransferOpen((current) => !current)}
                        className="rounded-full border border-sky-400/35 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:border-sky-300/60"
                    >
                        {isTransferOpen ? 'Hide JSON tools' : 'JSON tools'}
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

            {isTransferOpen && (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">Export</div>
                                <div className="mt-1 text-sm text-parchment">Versioned JSON snapshots</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => activeCharacter && setExportText(serializeStoredCharacterRecord(activeCharacter))}
                                    disabled={!activeCharacter}
                                    className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Load active JSON
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setExportText(serializeStoredCharacterCollection(collection))}
                                    className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-semibold text-stone-200 transition hover:border-stone-500"
                                >
                                    Load collection JSON
                                </button>
                            </div>
                        </div>
                        <textarea
                            readOnly
                            value={exportText}
                            rows={12}
                            className="mt-3 w-full rounded-2xl border border-stone-700 bg-stone-950 px-3 py-3 text-xs text-stone-200 outline-none"
                            placeholder="Load the active sheet or the full room collection to inspect/export JSON."
                        />
                    </div>

                    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">Import</div>
                                <div className="mt-1 text-sm text-parchment">Append or replace from JSON</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => void handleImport('append')}
                                    disabled={isSaving || !importText.trim()}
                                    className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Append JSON
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleImport('replace')}
                                    disabled={isSaving || !importText.trim()}
                                    className="rounded-full border border-red-400/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:border-red-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Replace room
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={importText}
                            onChange={(event) => setImportText(event.target.value)}
                            rows={12}
                            className="mt-3 w-full rounded-2xl border border-stone-700 bg-stone-950 px-3 py-3 text-xs text-stone-200 outline-none transition focus:border-sky-400/50"
                            placeholder="Paste a versioned collection export, a stored character record, or a compatible Phase 1 sheet JSON payload."
                        />
                        <div className="mt-3 text-xs text-stone-500">
                            Append preserves current room data and imports new records. Replace swaps the room collection to the imported payload.
                        </div>
                        {status && (
                            <div className="mt-3 rounded-2xl border border-stone-700 bg-stone-950/70 px-3 py-2 text-xs text-stone-300">
                                {status}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
