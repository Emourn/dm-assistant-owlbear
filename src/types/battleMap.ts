export interface GridPosition {
    col: number;
    row: number;
}

export interface Aura {
    id: string;
    name: string;
    radiusFt: number;
    color: string;
    opacity: number;
}

export type LightLevel = 'bright' | 'dim' | 'darkness' | 'magical-darkness';
export type WeatherEffect = 'none' | 'rain' | 'heavy-rain' | 'fog' | 'mist' | 'blizzard' | 'sandstorm';

export interface VisionZone {
    id: string;
    type: 'rectangle' | 'circle';
    position: GridPosition; // Top-left for rect, center for circle
    widthFt?: number;       // For rect
    heightFt?: number;      // For rect
    radiusFt?: number;      // For circle
    lightLevel?: LightLevel;
    weatherEffect?: WeatherEffect;
    label?: string;
    color?: string;         // DM display color overlay
}

export interface TokenVision {
    sightRadiusFt: number;   // Normal vision range (default 120ft outdoors)
    darkvisionFt: number;    // Sees in dark as dim (0, 30, 60, 120)
    blindsightFt: number;    // Sees without eyes
    tremorsenseFt: number;   // Senses vibrations
    truesightFt: number;     // Sees through magical darkness/illusions
    devilsSight: boolean;    // Sees through magical darkness normally
}

export interface VisionResult {
    visibleCells: string[];  // Array of "col,row" strings
    visibleTokenIds: string[];
}

export interface MapToken {
    id: string; // Internal token ID
    combatantId: string; // Links to Combatant.id
    name: string; // Display name
    faction: 'player' | 'enemy' | 'neutral' | 'ally';
    position: GridPosition;
    size: number; // 1 = Medium (1x1), 2 = Large (2x2), 3 = Huge (3x3), 4 = Gargantuan (4x4)
    color?: string; // Optional border color override
    label?: string; // Optional display letter/number override
    elevation: number; // Feet above ground (for flying creatures)
    auras?: Aura[];
    showHealthBar?: boolean;
    showNameLabel?: boolean;
    vision?: TokenVision;
}

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'polygon' | 'freehand';

export interface MapShape {
    id: string;
    type: ShapeType;
    points: GridPosition[]; // Defining points of the shape
    style: {
        stroke: string; // Border color
        strokeWidth: number;
        fill: string; // Fill color (with alpha usually)
        dashed: boolean;
    };
    label?: string; // "Wall", "Table", "Lava", etc.
    isBlockingTerrain?: boolean; // Blocks movement
    isBlockingLoS?: boolean; // Blocks line of sight
    isDifficultTerrain?: boolean; // Costs double movement
    /** 'dm-only' shapes are only visible to the DM and stripped before sending to players. */
    visibility?: 'dm-only' | 'all';
}

export interface FreehandPath {
    id: string;
    points: { x: number; y: number }[]; // Pixel coordinates for smooth freehand drawing
    color: string;
    width: number;
}

export interface TargetingOverlay {
    type: 'circle' | 'cone' | 'cube' | 'line' | 'sphere' | 'cylinder';
    originPosition: GridPosition; // Usually caster position
    targetPosition?: GridPosition; // Current mouse/target pos
    radiusFt: number; // For circles/spheres
    rangeFt: number; // Max range ring
    coneLengthFt?: number;
    lineWidthFt?: number;
    affectedCells: GridPosition[]; // Calculated impact area
    affectedCombatantIds: string[]; // Combatants within the area
    damageType?: string; // For coloring the AoE
}

export interface BattleMapState {
    id?: string; // Links this state to its source map/encounter for live sync
    gridWidth: number; // Columns
    gridHeight: number; // Rows
    cellSizePx: number; // Visual zoom level
    gridColor: string;
    backgroundColor: string;
    tokens: MapToken[];
    shapes: MapShape[];
    freehandPaths: FreehandPath[];
    backgroundImageUrl?: string; // Optional encounter map image
    backgroundOffset?: { x: number; y: number }; // Alignment offset
    backgroundScaleX?: number; // Horizontal stretch factor
    backgroundScaleY?: number; // Vertical stretch factor
    fogOfWar: MapShape[]; // Masks for revealing/hiding
    fogOfWarFreehand: FreehandPath[]; // Freehand masks for revealing/hiding
    visibleCells?: string[]; // Array of "col,row" for player's computed vision
    visionZones?: VisionZone[]; // Areas of light/darkness/weather
    defaultLightLevel?: LightLevel; // Global ambient light
    defaultWeather?: WeatherEffect; // Global ambient weather
    movementOverlay?: GridPosition[]; // Highlighted cells for available movement
    contextMenu?: {
        x: number;
        y: number;
        tokenId: string;
    } | null;
}

export interface TargetingMode {
    action: import('./combat').CombatAction;
    rangeFt: number;
    aoeType?: TargetingOverlay['type'];
    aoeRadiusFt?: number;
}
