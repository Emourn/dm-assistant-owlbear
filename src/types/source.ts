export type RulesEdition = '2024' | '2014' | 'mixed' | 'unknown';

export type ImportOrigin =
    | 'manual'
    | 'dnd-beyond-pdf'
    | '5etools'
    | 'homebrew'
    | 'campaign-lore'
    | 'mixed';

export interface ImportProvenance {
    origin: ImportOrigin;
    edition: RulesEdition;
    sourceSummary: string;
    importedAt?: number;
}
