import { DungeonMap, MapRoom } from '../../types/campaignNavigator';
import { useState, useRef, useCallback, useMemo } from 'react';
import { MapPin, Lock, Footprints, Layers, Settings, Search, Swords, Users, UserPlus, Eye, EyeOff, Radio } from 'lucide-react';
import { MapSetupEditor } from './MapSetupEditor';
import { BattleMap } from '../combat/BattleMap';
import { dungeonMapToBattleMapState, DEFAULT_DUNGEON_GRID } from '../../engine/mapBridge';
import { useNavigatorStore } from '../../store/navigatorStore';
import { useCombatStore } from '../../store/combatStore';
import { setBroadcastBlackout } from '../../multiplayer/mapBroadcast';
import { useCharacterStore } from '../../store/characterStore';
import { useNavigate } from 'react-router-dom';
import { MapToken } from '../../types/battleMap';
import { useSessionStore } from '../../multiplayer/sessionStore';

interface Props {
    maps: DungeonMap[];
    activeFloorId: string | null;
    partyRoomId: string | null;
    onRoomClick: (room: MapRoom) => void;
    onFloorChange: (floorId: string) => void;
}

export function DungeonMapView({ maps, activeFloorId, partyRoomId, onRoomClick, onFloorChange }: Props) {
    const navigate = useNavigate();
    const updateDungeonMapToken = useNavigatorStore(state => state.updateDungeonMapToken);
    const addDungeonMapToken = useNavigatorStore(state => state.addDungeonMapToken);
    const initializeEncounterFromNavigator = useCombatStore(state => state.initializeEncounterFromNavigator);
    const characters = useCharacterStore(state => state.characters);
    const { isMultiplayer, role, presentation, mapData: liveSessionMap } = useSessionStore();

    const [hoveredRoom, setHoveredRoom] = useState<MapRoom | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const [showHeroDropdown, setShowHeroDropdown] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sort maps by floor order
    const sortedMaps = [...maps].sort((a, b) => a.floorOrder - b.floorOrder);
    const activeMap = sortedMaps.find(m => m.floorId === activeFloorId) || sortedMaps[0];
    const displayTokens = useMemo(() => {
        if (
            isMultiplayer &&
            role === 'dm' &&
            activeMap?.id &&
            liveSessionMap?.id === activeMap.id
        ) {
            return liveSessionMap.tokens ?? activeMap.tokens;
        }

        return activeMap?.tokens ?? [];
    }, [activeMap, isMultiplayer, liveSessionMap, role]);

    // Determine which floor the party is currently on
    const partyFloorId = sortedMaps.find(m => m.rooms.some(r => r.id === partyRoomId))?.floorId;

    const handleRoomMouseMove = useCallback((e: React.MouseEvent, room: MapRoom) => {
        setTooltipPos({ x: e.clientX, y: e.clientY });
        setHoveredRoom(room);
    }, []);

    const handlePlaceHero = (character: any) => {
        if (!activeMap) return;

        // Don't add if already on map
        if (displayTokens.some((t: MapToken) => t.combatantId === character.id)) {
            setShowHeroDropdown(false);
            return;
        }

        const newToken: MapToken = {
            id: crypto.randomUUID(),
            combatantId: character.id,
            name: character.name,
            position: { col: 5, row: 5 }, // Default spawn position
            elevation: 0,
            color: '#fbbf24', // Amber
            faction: 'player',
            size: 1
        };

        addDungeonMapToken(activeMap.id, newToken);
        setShowHeroDropdown(false);
    };

    const getRoomStyles = (room: MapRoom): string => {
        const isPartyHere = room.id === partyRoomId;
        const base = 'absolute z-20 rounded transition-all duration-300 cursor-pointer border bg-transparent';

        if (isPartyHere) {
            return `${base} border-amber-400/85 shadow-[0_0_8px_rgba(245,158,11,0.25)] hover:bg-transparent`;
        }

        switch (room.status) {
            case 'current':
                return `${base} border-amber-300/75 hover:bg-transparent shadow-[0_0_6px_rgba(245,158,11,0.22)]`;
            case 'explored':
                return `${base} border-stone-200/60 hover:bg-transparent`;
            case 'locked':
                return `${base} border-red-300/75 hover:bg-transparent`;
            case 'unexplored':
            default:
                return room.isRevealed
                    ? `${base} border-white/35 hover:bg-transparent border-dashed`
                    : `${base} border-stone-500/55 hover:bg-transparent border-dotted opacity-70`;
        }
    }

    // Unified Map Integration: Convert DungeonMap to BattleMapState
    const battleMapState = useMemo(() => {
        if (!activeMap || !activeMap.id) return null;

        // Defensive defaults in case the persist layer hasn't caught up
        const safeMap = {
            ...(isMultiplayer && role === 'dm' && liveSessionMap?.id === activeMap.id
                ? { ...activeMap, ...liveSessionMap, tokens: displayTokens }
                : activeMap),
            gridWidth: activeMap.gridWidth || DEFAULT_DUNGEON_GRID.gridWidth,
            gridHeight: activeMap.gridHeight || DEFAULT_DUNGEON_GRID.gridHeight,
            cellSizePx: activeMap.cellSizePx || DEFAULT_DUNGEON_GRID.cellSizePx,
            gridColor: activeMap.gridColor || DEFAULT_DUNGEON_GRID.gridColor,
            tokens: displayTokens || DEFAULT_DUNGEON_GRID.tokens,
            shapes: activeMap.shapes || DEFAULT_DUNGEON_GRID.shapes,
            freehandPaths: activeMap.freehandPaths || DEFAULT_DUNGEON_GRID.freehandPaths,
            fogOfWar: activeMap.fogOfWar || DEFAULT_DUNGEON_GRID.fogOfWar,
            fogOfWarFreehand: activeMap.fogOfWarFreehand || DEFAULT_DUNGEON_GRID.fogOfWarFreehand,
        };

        return dungeonMapToBattleMapState(safeMap);
    }, [activeMap, displayTokens, isMultiplayer, liveSessionMap, role]);

    if (!activeMap || !battleMapState) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-stone-950 text-stone-500 font-cinzel gap-4">
                <Search size={48} className="animate-pulse text-stone-800" />
                <div className="text-center">
                    <p className="text-lg tracking-widest uppercase">No Floor Data Detected</p>
                    <p className="text-xs text-stone-600 mt-1 uppercase">Select a floor or check narrative context</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-stone-950/60 rounded-lg border border-stone-800/40 overflow-hidden">
            {/* Map Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800/30 bg-stone-900/40 shrink-0">
                <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-amber-500" />
                    <h4 className="font-cinzel text-xs font-bold text-amber-400 tracking-wider font-outline-sm">{activeMap.name}</h4>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => {/* rules search placeholder */ }}
                        className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded border border-stone-700 transition-colors"
                        title="Search Rules / Entities"
                    >
                        <Search size={12} />
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowHeroDropdown(!showHeroDropdown)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 hover:text-white rounded border border-stone-700 transition-colors text-stone-300 text-[10px] font-bold uppercase tracking-wider"
                        >
                            <Users size={12} /> Place Heroes
                        </button>

                        {showHeroDropdown && (
                            <div className="absolute top-full right-0 mt-1 w-48 bg-stone-900 border border-stone-700 rounded shadow-xl z-50 py-1">
                                {characters.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-stone-500 italic">No heroes available</div>
                                ) : (
                                    characters.map(char => {
                                        const isPlaced = displayTokens.some((t: MapToken) => t.combatantId === char.id);
                                        return (
                                            <button
                                                key={char.id}
                                                onClick={() => handlePlaceHero(char)}
                                                disabled={isPlaced}
                                                className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors
                                                    ${isPlaced
                                                        ? 'opacity-50 cursor-not-allowed text-stone-500'
                                                        : 'hover:bg-stone-800 text-stone-300'}`}
                                            >
                                                <span className="truncate">{char.name}</span>
                                                <UserPlus size={12} className={isPlaced ? 'text-stone-600' : 'text-amber-500'} />
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 hover:text-white rounded border border-stone-700 transition-colors text-stone-300 text-[10px] font-bold uppercase tracking-wider"
                    >
                        <Settings size={12} /> Edit Map
                    </button>
                    {isMultiplayer && role === 'dm' && (
                        <>
                            <div className="h-4 w-px bg-stone-700 mx-1"></div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${
                                presentation?.mode === 'blackout'
                                    ? 'bg-red-950/30 border-red-700/40 text-red-300'
                                    : 'bg-emerald-950/20 border-emerald-700/30 text-emerald-300'
                            }`}>
                                <Radio size={12} />
                                {presentation?.mode === 'blackout' ? 'Blackout' : 'Auto Live'}
                            </div>
                            <button
                                onClick={() => setBroadcastBlackout(presentation?.mode !== 'blackout')}
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-700 transition-colors text-[10px] font-bold uppercase tracking-wider"
                                title={presentation?.mode === 'blackout' ? 'Resume the player display' : 'Hide the player display temporarily'}
                            >
                                {presentation?.mode === 'blackout' ? <Eye size={12} /> : <EyeOff size={12} />}
                                {presentation?.mode === 'blackout' ? 'Resume' : 'Blackout'}
                            </button>
                        </>
                    )}
                    <div className="h-4 w-px bg-stone-700 mx-1"></div>
                    <button
                        onClick={() => {
                            const mapForCombat = {
                                ...activeMap,
                                gridWidth: activeMap.gridWidth || DEFAULT_DUNGEON_GRID.gridWidth,
                                gridHeight: activeMap.gridHeight || DEFAULT_DUNGEON_GRID.gridHeight,
                                cellSizePx: activeMap.cellSizePx || DEFAULT_DUNGEON_GRID.cellSizePx,
                                gridColor: activeMap.gridColor || DEFAULT_DUNGEON_GRID.gridColor,
                                tokens: activeMap.tokens || DEFAULT_DUNGEON_GRID.tokens,
                                shapes: activeMap.shapes || DEFAULT_DUNGEON_GRID.shapes,
                                freehandPaths: activeMap.freehandPaths || DEFAULT_DUNGEON_GRID.freehandPaths,
                                fogOfWar: activeMap.fogOfWar || DEFAULT_DUNGEON_GRID.fogOfWar,
                                fogOfWarFreehand: activeMap.fogOfWarFreehand || DEFAULT_DUNGEON_GRID.fogOfWarFreehand,
                            };
                            initializeEncounterFromNavigator(mapForCombat);
                            navigate('/combat');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded border border-amber-500 transition-colors text-[10px] font-black uppercase tracking-wider shadow-lg shadow-amber-900/20"
                    >
                        <Swords size={12} /> Engage Combat
                    </button>
                </div>
            </div>

            {/* Floor Tabs */}
            {sortedMaps.length > 1 && (
                <div className="flex items-center gap-1 px-3 py-2 border-b border-stone-800/20 bg-stone-900/20 shrink-0">
                    <Layers size={12} className="text-stone-500 mr-1" />
                    {sortedMaps.map(m => {
                        const isActive = m.floorId === activeMap.floorId;
                        const hasParty = m.floorId === partyFloorId;
                        return (
                            <button
                                key={m.floorId}
                                type="button"
                                onClick={() => onFloorChange(m.floorId)}
                                className={`px-3 py-1 rounded text-[10px] font-bold tracking-wide transition-all
                                    ${isActive
                                        ? 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                                        : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/40 border border-transparent'
                                    }
                                `}
                            >
                                {m.floorLabel}
                                {hasParty && !isActive && (
                                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Tactical Map Engine */}
            <div className="flex-1 relative overflow-hidden" ref={containerRef}>
                <BattleMap
                    mapState={battleMapState}
                    tokens={displayTokens}
                    onTokenMove={(tid, pos) => updateDungeonMapToken(activeMap.id, tid, { position: pos })}
                    className="w-full h-full"
                >
                    {/* Narrative Rooms Overlay — positioned relative to the map content (fixed size) */}
                    <div className="absolute inset-0 z-20 pointer-events-none" style={{ width: activeMap.gridWidth * activeMap.cellSizePx, height: activeMap.gridHeight * activeMap.cellSizePx }}>
                        {activeMap.rooms.map(room => (
                            <div
                                key={room.id}
                                className={`${getRoomStyles(room)} pointer-events-auto shadow-black/80 shadow-lg`}
                                style={{
                                    left: `${room.x}%`,
                                    top: `${room.y}%`,
                                    width: `${room.width}%`,
                                    height: `${room.height}%`,
                                    borderRadius: room.shape === 'circle' ? '50%' : undefined,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRoomClick(room);
                                }}
                                onMouseMove={(e) => handleRoomMouseMove(e, room)}
                                onMouseLeave={() => setHoveredRoom(null)}
                            >
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                                    <span className="text-[14px] font-cinzel font-black tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] brightness-110">
                                        {room.label}
                                    </span>
                                    <span className="text-[10px] text-stone-100 font-bold max-w-full truncate px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] brightness-110">
                                        {room.name}
                                    </span>
                                    {room.id === partyRoomId && (
                                        <Footprints size={16} className="text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] animate-pulse mt-1" />
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Connections */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {activeMap.connections.filter(c => c.isRevealed).map(conn => {
                                const from = activeMap.rooms.find(r => r.id === conn.fromRoomId);
                                const to = activeMap.rooms.find(r => r.id === conn.toRoomId);
                                if (!from || !to) return null;

                                const fx = from.x + from.width / 2;
                                const fy = from.y + from.height / 2;
                                const tx = to.x + to.width / 2;
                                const ty = to.y + to.height / 2;

                                return (
                                    <line
                                        key={`${conn.fromRoomId}-${conn.toRoomId}`}
                                        x1={fx} y1={fy}
                                        x2={tx} y2={ty}
                                        stroke={conn.type === 'secret' ? 'rgba(168,85,247,0.3)' : 'rgba(168,162,158,0.25)'}
                                        strokeWidth="0.4"
                                        strokeDasharray={conn.type === 'secret' ? '1 1' : conn.type === 'trap' ? '0.5 0.5' : 'none'}
                                    />
                                );
                            })}
                        </svg>
                    </div>
                </BattleMap>
            </div>

            {/* Room Tooltip */}
            {hoveredRoom && (
                <div
                    className="fixed z-[1000] pointer-events-none"
                    style={{
                        left: tooltipPos.x,
                        top: tooltipPos.y,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="bg-stone-900/95 border border-stone-700/60 rounded-lg px-3 py-2 shadow-2xl backdrop-blur-md max-w-[220px]">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-amber-500 font-cinzel text-xs font-bold font-outline-sm">{hoveredRoom.label}</span>
                            <span className="text-stone-100 text-xs font-bold drop-shadow-md">{hoveredRoom.name}</span>
                        </div>
                        {hoveredRoom.description && (
                            <p className="text-stone-300 text-[10px] leading-relaxed italic">{hoveredRoom.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-stone-800/50">
                            {hoveredRoom.status === 'locked' && <Lock size={10} className="text-red-400" />}
                            <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">{hoveredRoom.status}</span>
                            {hoveredRoom.sceneId && hoveredRoom.isRevealed && (
                                <span className="text-[9px] text-amber-500 ml-auto font-black italic">Go to Scene</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Editor Overlay */}
            {isEditing && (
                <MapSetupEditor
                    map={activeMap}
                    onClose={() => setIsEditing(false)}
                />
            )}
        </div>
    );
}
