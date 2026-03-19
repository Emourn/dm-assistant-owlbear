// ─────────────────────────────────────────────────────────
// CAMPAIGN NAVIGATOR — TYPE DEFINITIONS
// The interactive narrative engine for DM-guided storytelling
// ─────────────────────────────────────────────────────────

/** A parsed PDF source document */
export interface SourceDocument {
    id: string;
    filename: string;
    title: string;
    isMasterGuide: boolean;
    totalPages: number;
    parsedAt: number;
    status: 'pending' | 'parsing' | 'ready' | 'error';
    errorMessage?: string;
    chapters: ParsedChapter[];
}

/** A chapter extracted from a PDF */
export interface ParsedChapter {
    id: string;
    sourceDocId: string;
    title: string;
    pageStart: number;
    pageEnd: number;
    rawText: string;
    sections: ParsedSection[];
}

/** A section within a chapter */
export interface ParsedSection {
    id: string;
    title: string;
    pageNumber: number;
    rawText: string;
    type: SectionType;
}

export type SectionType =
    | 'narrative'
    | 'encounter'
    | 'npc'
    | 'location'
    | 'treasure'
    | 'rules'
    | 'dialog'
    | 'trap'
    | 'puzzle';

// ─────────────────────────────────────────────────────────
// NARRATIVE SCENE SYSTEM
// ─────────────────────────────────────────────────────────

/** The full campaign narrative structure */
export interface CampaignNarrative {
    id: string;
    campaignId?: string;
    title: string;
    description: string;
    masterGuideId?: string;
    sourceDocumentIds: string[];
    chapters: NarrativeChapter[];
    currentSceneId: string | null;
    visitedSceneIds: string[];
    createdAt: number;
    updatedAt: number;
}

/** A chapter in the interactive narrative */
export interface NarrativeChapter {
    id: string;
    title: string;
    subtitle?: string;
    levelRange: string;
    order: number;
    scenes: NarrativeScene[];
    isUnlocked: boolean;
    mapImageUrl?: string;
}

/** A scene — the core unit of the narrative */
export interface NarrativeScene {
    id: string;
    chapterId: string;
    title: string;
    subtitle?: string;
    order: number;

    /** The immersive narration content */
    narrationBlocks: NarrationBlock[];

    /** Branching choices at the end of the scene */
    choices: NarrativeChoice[];

    /** Source material citations */
    sources: SourceCitation[];

    /** Inline entity references (items, NPCs, etc.) */
    entities: LinkedEntity[];

    /** Optional encounter data for this scene */
    encounter?: SceneEncounter;

    /** Optional map room reference */
    mapRoomId?: string;

    /** Which floor of the dungeon this scene is on */
    mapFloorId?: string;

    /** Override to show maps from a different chapter (e.g., ['chap-deathhouse']) */
    visibleChapterMaps?: string[];

    /** Tags for filtering/search */
    tags: SceneTag[];

    /** DM's personal notes */
    dmNotes: string;

    /** Estimated time to play */
    estimatedMinutes?: number;
}

export type SceneTag =
    | 'combat'
    | 'roleplay'
    | 'exploration'
    | 'puzzle'
    | 'trap'
    | 'boss'
    | 'rest'
    | 'loot'
    | 'story'
    | 'transition';

// ─────────────────────────────────────────────────────────
// NARRATION BLOCKS — The actual text content
// ─────────────────────────────────────────────────────────

export interface NarrationBlock {
    id: string;
    type: NarrationBlockType;
    text: string;
    /** For dialog blocks: who is speaking */
    speaker?: string;
    /** For dialog: emotional delivery hint */
    emotion?: string;
    /** For encounter-ref: monster names and counts */
    encounterDetails?: string;
    /** For loot-ref: item names and quantities */
    lootDetails?: string;
}

export type NarrationBlockType =
    | 'description'      // Environmental/scene description
    | 'read-aloud'       // Boxed text the DM reads verbatim
    | 'dialog'           // NPC speech with speaker tag
    | 'atmosphere'       // Mood, sounds, sensory details
    | 'dm-note'          // Hidden tip/advice for the DM only
    | 'encounter-ref'    // Links to a combat encounter
    | 'loot-ref'         // Lists treasure/items found
    | 'skill-check'      // A skill check prompt
    | 'transition';      // Scene transition text

// ─────────────────────────────────────────────────────────
// CHOICES — Branching navigation
// ─────────────────────────────────────────────────────────

export interface NarrativeChoice {
    id: string;
    text: string;
    targetSceneId: string;
    /** Optional condition text shown to DM */
    condition?: string;
    /** Brief consequence hint */
    consequence?: string;
    /** Source reference */
    sourceRef?: string;
    /** Icon hint for the choice type */
    icon?: 'door' | 'combat' | 'dialog' | 'search' | 'stairs' | 'path' | 'secret' | 'rest';
}

// ─────────────────────────────────────────────────────────
// SOURCE CITATIONS
// ─────────────────────────────────────────────────────────

export interface SourceCitation {
    documentId?: string;
    documentTitle: string;
    pageNumber?: number;
    sectionTitle?: string;
    quote?: string;
}

// ─────────────────────────────────────────────────────────
// LINKED ENTITIES — Interactive inline references
// ─────────────────────────────────────────────────────────

export interface LinkedEntity {
    id: string;
    name: string;
    type: EntityType;
    /** Key for 5e.tools or other DB lookup */
    lookupKey?: string;
    /** Inline description if no lookup available */
    description?: string;
    /** For monsters: basic stat block summary */
    statBlock?: EntityStatBlock;
}

export type EntityType =
    | 'item'
    | 'npc'
    | 'monster'
    | 'spell'
    | 'condition'
    | 'location'
    | 'lore';

export interface EntityStatBlock {
    ac?: number;
    hp?: string;
    cr?: string;
    type?: string;
    abilities?: string;
}

// ─────────────────────────────────────────────────────────
// SCENE ENCOUNTERS — Link to combat system
// ─────────────────────────────────────────────────────────

export interface SceneEncounter {
    monsters: EncounterMonster[];
    difficulty?: string;
    description?: string;
    mapRoomId?: string;
    specialRules?: string;
}

export interface EncounterMonster {
    name: string;
    count: number;
    cr?: string;
    lookupKey?: string;
    notes?: string;
}

// ─────────────────────────────────────────────────────────
// DUNGEON MAP — Room-based exploration map
// ─────────────────────────────────────────────────────────

export interface DungeonMap {
    id: string;
    name: string;
    /** Which narrative chapters this map belongs to (e.g., ['chap-deathhouse']) */
    chapterIds: string[];
    /** Floor identifier — links map to a specific floor */
    floorId: string;
    /** Human-readable floor label (e.g., "Ground Floor", "Upper Floor", "Dungeon Level") */
    floorLabel: string;
    /** Sort order: lower = deeper/basement, higher = upper floors */
    floorOrder: number;
    imageUrl?: string;
    width: number;
    height: number;
    rooms: MapRoom[];
    connections: RoomConnection[];

    // ── Tactical Grid Fields (mirrors BattleMapState) ──
    gridWidth: number;       // Columns (default 20)
    gridHeight: number;      // Rows (default 20)
    cellSizePx: number;      // Visual cell size in pixels (default 40)
    gridColor: string;       // Grid line color
    tokens: import('./battleMap').MapToken[];
    shapes: import('./battleMap').MapShape[];
    freehandPaths: import('./battleMap').FreehandPath[];
    backgroundOffset?: { x: number; y: number };
    backgroundScaleX?: number;
    backgroundScaleY?: number;
    fogOfWar: import('./battleMap').MapShape[];
    fogOfWarFreehand: import('./battleMap').FreehandPath[];
}

export interface MapRoom {
    id: string;
    label: string;           // "H1", "B2", "A3" — matches PDF labels
    name: string;            // "Grand Foyer", "Hidden Crypt"
    x: number;               // Position on map image (percentage 0-100)
    y: number;
    width: number;           // Size (percentage)
    height: number;
    shape: 'rect' | 'circle' | 'polygon';
    /** Which scene this room links to */
    sceneId?: string;
    /** Tooltip description */
    description?: string;
    /** Is this room discovered/visible? */
    isRevealed: boolean;
    /** Is the party currently here? */
    isActive: boolean;
    /** Room status */
    status: 'unexplored' | 'current' | 'explored' | 'locked';
    /** Optional polygon points for irregular shapes */
    polygonPoints?: Array<{ x: number; y: number }>;
}

export interface RoomConnection {
    fromRoomId: string;
    toRoomId: string;
    type: 'door' | 'passage' | 'stairs' | 'secret' | 'trap' | 'one-way';
    isRevealed: boolean;
    label?: string;
}

// ─────────────────────────────────────────────────────────
// NAVIGATOR STATE
// ─────────────────────────────────────────────────────────

export interface NavigatorState {
    sourceDocuments: SourceDocument[];
    narratives: CampaignNarrative[];
    dungeonMaps: DungeonMap[];
    activeNarrativeId: string | null;
    currentSceneId: string | null;
    isProcessing: boolean;
    processingProgress: string;
    enrichmentCache: Record<string, LinkedEntity>;
    /** Party position on the dungeon map */
    partyRoomId: string | null;
    /** Scene navigation history for back button */
    sceneHistory: string[];
    /** Currently active floor on the dungeon map */
    activeFloorId: string | null;
}
