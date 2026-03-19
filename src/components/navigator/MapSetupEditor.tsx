import React, { useState, useCallback, useEffect } from 'react';
import { DungeonMap } from '../../types/campaignNavigator';
import { Settings, X, Upload, Save, Maximize2, Move, Layout, Pencil, Grid, Palette, Eye, EyeOff } from 'lucide-react';
import { useNavigatorStore } from '../../store/navigatorStore';
import { BattleMap } from '../combat/BattleMap';
import { ShapeControls, DrawingMode } from '../combat/ShapeControls';
import { dungeonMapToBattleMapState } from '../../engine/mapBridge';
import { GridPosition, MapShape, FreehandPath } from '../../types/battleMap';

interface Props {
    map: DungeonMap;
    onClose: () => void;
}

type EditorTab = 'rooms' | 'grid' | 'draw' | 'fog';
type RoomResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const MIN_ROOM_SIZE_PERCENT = 3;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function MapSetupEditor({ map, onClose }: Props) {
    const { updateRoomPosition, updateDungeonMapBattleState, updateDungeonMapGrid } = useNavigatorStore();

    // Local state for the entirety of the map being edited
    const [localMap, setLocalMap] = useState<DungeonMap>({ ...map });
    const [activeTab, setActiveTab] = useState<EditorTab>('rooms');
    const [drawingMode, setDrawingMode] = useState<DrawingMode>('select');
    const [draggingRoom, setDraggingRoom] = useState<string | null>(null);
    const [resizingRoom, setResizingRoom] = useState<{ roomId: string, handle: RoomResizeHandle } | null>(null);

    // Bridge local state to BattleMap component
    const battleMapState = dungeonMapToBattleMapState(localMap);

    // --- Actions ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const url = event.target?.result as string;
            setLocalMap(prev => ({ ...prev, imageUrl: url }));
        };
        reader.readAsDataURL(file);
    };

    const handleUpdateGrid = (updates: Partial<Pick<DungeonMap, 'gridWidth' | 'gridHeight' | 'cellSizePx'>>) => {
        setLocalMap(prev => ({ ...prev, ...updates }));
    };

    const handleBackgroundUpdate = (updates: { offsetDelta?: { dx: number, dy: number }, offset?: { x: number, y: number }, scaleX?: number, scaleY?: number }) => {
        setLocalMap(prev => {
            let newOffset = prev.backgroundOffset || { x: 0, y: 0 };
            if (updates.offsetDelta) {
                newOffset = { x: newOffset.x + updates.offsetDelta.dx, y: newOffset.y + updates.offsetDelta.dy };
            } else if (updates.offset) {
                newOffset = updates.offset;
            }

            return {
                ...prev,
                backgroundOffset: newOffset,
                backgroundScaleX: updates.scaleX !== undefined ? updates.scaleX : prev.backgroundScaleX,
                backgroundScaleY: updates.scaleY !== undefined ? updates.scaleY : prev.backgroundScaleY
            };
        });
    };

    const handleShapeAdd = (shape: MapShape) => {
        setLocalMap(prev => ({ ...prev, shapes: [...prev.shapes, shape] }));
    };

    const handleFreehandAdd = (path: FreehandPath) => {
        setLocalMap(prev => ({ ...prev, freehandPaths: [...prev.freehandPaths, path] }));
    };

    const handleFogAdd = (shape: MapShape) => {
        setLocalMap(prev => ({ ...prev, fogOfWar: [...prev.fogOfWar, shape] }));
    };

    const handleFogFreehandAdd = (path: FreehandPath) => {
        setLocalMap(prev => ({ ...prev, fogOfWarFreehand: [...prev.fogOfWarFreehand, path] }));
    };

    const handleClearDrawings = () => {
        setLocalMap(prev => ({
            ...prev,
            shapes: [],
            freehandPaths: [],
            fogOfWar: [],
            fogOfWarFreehand: []
        }));
    };

    const handleResizeGrid = (side: 'top' | 'bottom' | 'left' | 'right', delta: number) => {
        setLocalMap(prev => {
            const isHorizontal = side === 'left' || side === 'right';
            const newWidth = isHorizontal ? Math.max(5, prev.gridWidth + delta) : prev.gridWidth;
            const newHeight = !isHorizontal ? Math.max(5, prev.gridHeight + delta) : prev.gridHeight;

            const appliedDelta = isHorizontal ? (newWidth - prev.gridWidth) : (newHeight - prev.gridHeight);
            const colShift = side === 'left' ? appliedDelta : 0;
            const rowShift = side === 'top' ? appliedDelta : 0;

            const shiftGridPos = (p: GridPosition) => ({
                col: p.col + colShift,
                row: p.row + rowShift
            });

            const updatedTokens = prev.tokens.map(token => ({
                ...token,
                position: {
                    col: Math.max(0, Math.min(token.position.col + colShift, newWidth - (token.size || 1))),
                    row: Math.max(0, Math.min(token.position.row + rowShift, newHeight - (token.size || 1)))
                }
            }));

            const updatedShapes = prev.shapes.map(s => ({
                ...s,
                points: s.points.map(shiftGridPos)
            }));

            const pxColShift = colShift * prev.cellSizePx;
            const pxRowShift = rowShift * prev.cellSizePx;
            const updatedPaths = prev.freehandPaths.map(path => ({
                ...path,
                points: path.points.map(p => ({ x: p.x + pxColShift, y: p.y + pxRowShift }))
            }));

            const updatedFoW = prev.fogOfWar.map(s => ({
                ...s,
                points: s.points.map(shiftGridPos)
            }));
            const updatedFoWFree = prev.fogOfWarFreehand.map(path => ({
                ...path,
                points: path.points.map(p => ({ x: p.x + pxColShift, y: p.y + pxRowShift }))
            }));

            let newBackgroundOffset = prev.backgroundOffset;
            if (newBackgroundOffset) {
                newBackgroundOffset = {
                    x: newBackgroundOffset.x + pxColShift,
                    y: newBackgroundOffset.y + pxRowShift
                };
            }

            return {
                ...prev,
                gridWidth: newWidth,
                gridHeight: newHeight,
                tokens: updatedTokens,
                shapes: updatedShapes,
                freehandPaths: updatedPaths,
                fogOfWar: updatedFoW,
                fogOfWarFreehand: updatedFoWFree,
                backgroundOffset: newBackgroundOffset
            };
        });
    };

    // --- Room Dragging (using grid-relative positioning if we wanted, but keeping % for now for compatibility) ---
    const handleRoomMouseDown = (e: React.MouseEvent, roomId: string) => {
        if (activeTab !== 'rooms') return;
        e.stopPropagation();
        setResizingRoom(null);
        setDraggingRoom(roomId);
    };

    const handleRoomResizeMouseDown = (e: React.MouseEvent, roomId: string, handle: RoomResizeHandle) => {
        if (activeTab !== 'rooms') return;
        e.stopPropagation();
        e.preventDefault();
        setDraggingRoom(null);
        setResizingRoom({ roomId, handle });
    };

    // Simplified percentage-based dragging for the editor
    const handleRoomMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingRoom && !resizingRoom) return;

        // In the new editor, rooms sit on the grid container
        // We can just use the BattleMap's internal cursor logic if we wanted,
        // but for now let's just use mouse coords relative to the transformed div.
        // Actually, let's keep it simple: rooms are % based on the total grid size.
        const gridEl = document.querySelector('.battle-map-grid');
        if (!gridEl) return;

        const rect = gridEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // rect.width/height already accounts for zoom transforms
        const pctX = (mouseX / rect.width) * 100;
        const pctY = (mouseY / rect.height) * 100;

        setLocalMap(prev => ({
            ...prev,
            rooms: prev.rooms.map(r => {
                if (draggingRoom && r.id === draggingRoom) {
                    return {
                        ...r,
                        x: clamp(pctX - (r.width / 2), 0, 100 - r.width),
                        y: clamp(pctY - (r.height / 2), 0, 100 - r.height)
                    };
                }

                if (resizingRoom && r.id === resizingRoom.roomId) {
                    const handle = resizingRoom.handle;
                    const right = r.x + r.width;
                    const bottom = r.y + r.height;

                    let x = r.x;
                    let y = r.y;
                    let width = r.width;
                    let height = r.height;

                    if (handle.includes('e')) {
                        const nextRight = clamp(pctX, x + MIN_ROOM_SIZE_PERCENT, 100);
                        width = nextRight - x;
                    }

                    if (handle.includes('s')) {
                        const nextBottom = clamp(pctY, y + MIN_ROOM_SIZE_PERCENT, 100);
                        height = nextBottom - y;
                    }

                    if (handle.includes('w')) {
                        const nextLeft = clamp(pctX, 0, right - MIN_ROOM_SIZE_PERCENT);
                        x = nextLeft;
                        width = right - nextLeft;
                    }

                    if (handle.includes('n')) {
                        const nextTop = clamp(pctY, 0, bottom - MIN_ROOM_SIZE_PERCENT);
                        y = nextTop;
                        height = bottom - nextTop;
                    }

                    x = clamp(x, 0, 100 - MIN_ROOM_SIZE_PERCENT);
                    y = clamp(y, 0, 100 - MIN_ROOM_SIZE_PERCENT);
                    width = clamp(width, MIN_ROOM_SIZE_PERCENT, 100 - x);
                    height = clamp(height, MIN_ROOM_SIZE_PERCENT, 100 - y);

                    return { ...r, x, y, width, height };
                }

                return r;
            })
        }));
    }, [draggingRoom, resizingRoom]);

    useEffect(() => {
        if (draggingRoom || resizingRoom) {
            const up = () => {
                setDraggingRoom(null);
                setResizingRoom(null);
            };
            window.addEventListener('mousemove', handleRoomMouseMove);
            window.addEventListener('mouseup', up);
            return () => {
                window.removeEventListener('mousemove', handleRoomMouseMove);
                window.removeEventListener('mouseup', up);
            };
        }
    }, [draggingRoom, resizingRoom, handleRoomMouseMove]);

    const handleSave = () => {
        // 1. Update Grid
        updateDungeonMapGrid(map.id, {
            gridWidth: localMap.gridWidth,
            gridHeight: localMap.gridHeight,
            cellSizePx: localMap.cellSizePx,
            gridColor: localMap.gridColor
        });

        // 2. Update Battle State (Bulk)
        updateDungeonMapBattleState(map.id, {
            shapes: localMap.shapes,
            freehandPaths: localMap.freehandPaths,
            fogOfWar: localMap.fogOfWar,
            fogOfWarFreehand: localMap.fogOfWarFreehand,
            backgroundOffset: localMap.backgroundOffset,
            backgroundScaleX: localMap.backgroundScaleX,
            backgroundScaleY: localMap.backgroundScaleY,
            imageUrl: localMap.imageUrl,
            tokens: localMap.tokens
        });

        // 3. Update Rooms
        localMap.rooms.forEach(r => {
            updateRoomPosition(map.id, r.id, { x: r.x, y: r.y, width: r.width, height: r.height });
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100000] bg-stone-950 flex flex-col font-cinzel overflow-hidden">
            {/* ═══ TOP HEADER ═══ */}
            <header className="h-16 border-b border-white/5 bg-stone-900/60 backdrop-blur-xl flex items-center justify-between px-6 z-50 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight uppercase leading-tight">Cartography Studio</h2>
                        <p className="text-[9px] text-stone-500 font-black uppercase tracking-widest">{map.name} — Editor</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <button className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-600 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all transition-colors cursor-pointer">
                            <Upload size={14} />
                            Source Image
                        </button>
                    </div>
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    <button onClick={onClose} className="px-4 py-2 bg-stone-900/40 hover:bg-red-500/10 hover:text-red-400 text-stone-400 rounded-xl flex items-center gap-2 transition-all border border-white/5 text-xs font-bold uppercase tracking-widest">
                        <X size={14} /> Cancel
                    </button>
                    <button onClick={handleSave} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-[0_10px_30px_rgba(245,158,11,0.2)] text-xs uppercase tracking-widest">
                        <Save size={14} /> Save Changes
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* ═══ SIDEBAR: TOOLS ═══ */}
                <aside className="w-80 border-r border-white/5 bg-stone-900/20 backdrop-blur-md flex flex-col z-40 shrink-0">
                    <div className="flex border-b border-white/5 shrink-0">
                        <button
                            onClick={() => { setActiveTab('rooms'); setDrawingMode('select'); }}
                            className={`flex-1 py-3 flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'rooms' ? 'text-amber-500 bg-amber-500/10' : 'text-stone-500 hover:text-stone-300'}`}
                        >
                            <Layout size={14} />
                            Rooms
                        </button>
                        <button
                            onClick={() => { setActiveTab('grid'); setDrawingMode('select'); }}
                            className={`flex-1 py-3 flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'grid' ? 'text-amber-500 bg-amber-500/10' : 'text-stone-500 hover:text-stone-300'}`}
                        >
                            <Grid size={14} />
                            Grid
                        </button>
                        <button
                            onClick={() => { setActiveTab('draw'); setDrawingMode('select'); }}
                            className={`flex-1 py-3 flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'draw' ? 'text-amber-500 bg-amber-500/10' : 'text-stone-500 hover:text-stone-300'}`}
                        >
                            <Pencil size={14} />
                            Draw
                        </button>
                        <button
                            onClick={() => { setActiveTab('fog'); setDrawingMode('select'); }}
                            className={`flex-1 py-3 flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'fog' ? 'text-amber-500 bg-amber-500/10' : 'text-stone-500 hover:text-stone-300'}`}
                        >
                            <EyeOff size={14} />
                            Fog
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-8">
                        {activeTab === 'rooms' && (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">Narrative Overlays</h3>
                                <p className="text-[10px] text-stone-500 leading-relaxed italic border-l-2 border-stone-800 pl-3">
                                    Drag room bodies to move them. Drag border/corner handles to resize and fit the map exactly.
                                </p>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {localMap.rooms.map(r => (
                                        <div key={r.id} className="p-3 bg-stone-950/40 border border-white/5 rounded-xl flex items-center justify-between group hover:border-amber-500/30 transition-all">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-amber-500">{r.label}</span>
                                                <span className="text-[11px] text-stone-300 truncate max-w-[120px]">{r.name}</span>
                                            </div>
                                            <Move size={12} className="text-stone-600 group-hover:text-amber-500 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'grid' && (
                            <div className="space-y-8">
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">Grid Geometry</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-stone-500">Columns</label>
                                            <input
                                                type="number" value={localMap.gridWidth}
                                                onChange={(e) => handleUpdateGrid({ gridWidth: parseInt(e.target.value) })}
                                                className="w-full bg-stone-950 border border-white/5 rounded-xl p-3 text-xs font-mono text-amber-500 hover:bg-black focus:border-amber-500/50 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-stone-500">Rows</label>
                                            <input
                                                type="number" value={localMap.gridHeight}
                                                onChange={(e) => handleUpdateGrid({ gridHeight: parseInt(e.target.value) })}
                                                className="w-full bg-stone-950 border border-white/5 rounded-xl p-3 text-xs font-mono text-amber-500 hover:bg-black focus:border-amber-500/50 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3 pt-2">
                                        <div className="flex justify-between items-center text-[9px] font-black uppercase text-stone-500 tracking-widest">
                                            <span>Cell Size</span>
                                            <span className="text-amber-500 font-mono">{localMap.cellSizePx}px</span>
                                        </div>
                                        <input
                                            type="range" min="16" max="128" value={localMap.cellSizePx}
                                            onChange={(e) => handleUpdateGrid({ cellSizePx: parseInt(e.target.value) })}
                                            className="w-full accent-amber-600 h-1 bg-stone-900 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </section>

                                {localMap.imageUrl && (
                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">Calibration</h3>
                                        <div className="space-y-4 bg-stone-950/40 p-4 rounded-2xl border border-white/5">
                                            <button
                                                onClick={() => setDrawingMode(prev => prev === 'calibrate' ? 'select' : 'calibrate')}
                                                className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${drawingMode === 'calibrate' ? 'bg-amber-600 border-amber-400 text-stone-950 shadow-lg' : 'bg-stone-900 border-white/5 text-stone-500 hover:text-stone-300'}`}
                                            >
                                                {drawingMode === 'calibrate' ? <Maximize2 size={14} /> : <Move size={14} />}
                                                {drawingMode === 'calibrate' ? 'Stop Positioning' : 'Move Background'}
                                            </button>

                                            <div className="space-y-3">
                                                <div className="flex justify-between text-[9px] font-black uppercase text-stone-500">
                                                    <span>Stretch Width</span>
                                                    <span className="text-amber-500">{Math.round((localMap.backgroundScaleX || 1) * 100)}%</span>
                                                </div>
                                                <input type="range" min="0.5" max="3" step="0.01" value={localMap.backgroundScaleX || 1} onChange={(e) => handleBackgroundUpdate({ scaleX: parseFloat(e.target.value) })} className="w-full accent-amber-600 h-1 bg-stone-900 rounded-lg" />

                                                <div className="flex justify-between text-[9px] font-black uppercase text-stone-500">
                                                    <span>Stretch Height</span>
                                                    <span className="text-amber-500">{Math.round((localMap.backgroundScaleY || 1) * 100)}%</span>
                                                </div>
                                                <input type="range" min="0.5" max="3" step="0.01" value={localMap.backgroundScaleY || 1} onChange={(e) => handleBackgroundUpdate({ scaleY: parseFloat(e.target.value) })} className="w-full accent-amber-600 h-1 bg-stone-900 rounded-lg" />
                                            </div>

                                            <button
                                                onClick={() => setLocalMap(prev => ({ ...prev, backgroundOffset: { x: 0, y: 0 }, backgroundScaleX: 1, backgroundScaleY: 1 }))}
                                                className="w-full py-2 bg-stone-900 border border-white/5 rounded-xl text-[9px] font-black uppercase text-stone-600 hover:text-stone-400 transition-all"
                                            >
                                                Reset Positioning
                                            </button>
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}

                        {(activeTab === 'draw' || activeTab === 'fog') && (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">
                                    {activeTab === 'draw' ? 'Strategic Markings' : 'Fog of War Tools'}
                                </h3>
                                <ShapeControls
                                    currentMode={drawingMode}
                                    onModeChange={(m) => setDrawingMode(prev => prev === m ? 'select' : m)}
                                    onClearAll={handleClearDrawings}
                                    onUndo={() => { }}
                                    canUndo={false}
                                    className="w-full border-none p-0 bg-transparent shadow-none"
                                />
                                {activeTab === 'fog' && (
                                    <div className="pt-4 space-y-3">
                                        <button
                                            onClick={() => setDrawingMode('fow-hide')}
                                            className={`w-full py-3 rounded-xl border flex items-center justify-center gap-3 transition-all ${drawingMode === 'fow-hide' ? 'bg-stone-950 border-white text-white' : 'bg-stone-900 border-white/5 text-stone-500'}`}
                                        >
                                            <EyeOff size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Add Fog (Hide)</span>
                                        </button>
                                        <button
                                            onClick={() => setDrawingMode('fow-reveal')}
                                            className={`w-full py-3 rounded-xl border flex items-center justify-center gap-3 transition-all ${drawingMode === 'fow-reveal' ? 'bg-white border-white text-stone-950' : 'bg-stone-900 border-white/5 text-stone-500'}`}
                                        >
                                            <Eye size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Clear Fog (Reveal)</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/5 bg-stone-950/20 text-[9px] text-stone-600 italic leading-relaxed text-center">
                        Scroll to zoom • RMB to pan • Shift+Drag to measure
                    </div>
                </aside>

                {/* ═══ CANVAS AREA ═══ */}
                <main className="flex-1 relative bg-black overflow-hidden">
                    <BattleMap
                        mapState={battleMapState}
                        tokens={localMap.tokens}
                        drawingMode={drawingMode}
                        onDrawingModeChange={setDrawingMode}
                        onBackgroundUpdate={handleBackgroundUpdate}
                        onShapeAdd={handleShapeAdd}
                        onFreehandPathAdd={handleFreehandAdd}
                        onFogOfWarAdd={handleFogAdd}
                        onFogOfWarFreehandAdd={handleFogFreehandAdd}
                        onResizeGrid={handleResizeGrid}
                        className="w-full h-full"
                    >
                        {/* THE BATTLE MAP GRID CLASS IS USED BY ROOM DRAGGING LOGIC */}
                        <div className="battle-map-grid absolute inset-0 pointer-events-none" style={{ width: localMap.gridWidth * localMap.cellSizePx, height: localMap.gridHeight * localMap.cellSizePx }}>
                            {activeTab === 'rooms' && localMap.rooms.map(room => (
                                (() => {
                                    const isDragging = draggingRoom === room.id;
                                    const isResizing = resizingRoom?.roomId === room.id;
                                    const showHandles = !isDragging;

                                    return (
                                        <div
                                            key={room.id}
                                            onMouseDown={(e) => handleRoomMouseDown(e, room.id)}
                                            className={`
                                                group absolute rounded border-2 shadow-2xl transition-all backdrop-blur-sm pointer-events-auto
                                                ${isDragging || isResizing
                                                    ? 'bg-amber-600/55 border-amber-300 z-[120] scale-105 cursor-grabbing'
                                                    : 'bg-amber-950/20 border-amber-500/60 hover:border-amber-400 cursor-grab hover:bg-amber-900/30'}
                                            `}
                                            style={{
                                                left: `${room.x}%`,
                                                top: `${room.y}%`,
                                                width: `${room.width}%`,
                                                height: `${room.height}%`,
                                                borderRadius: room.shape === 'circle' ? '50%' : undefined,
                                            }}
                                        >
                                            <div className="absolute inset-0 flex flex-col items-center justify-center font-cinzel font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-[11px] text-center pointer-events-none px-1 leading-tight tracking-widest uppercase brightness-125">
                                                {room.label}
                                                <span className="text-[8px] font-bold text-amber-300/80 truncate max-w-full">{room.name}</span>
                                            </div>

                                            {showHandles && (
                                                <>
                                                    <button
                                                        type="button"
                                                        aria-label={`Resize ${room.label} north`}
                                                        onMouseDown={(e) => handleRoomResizeMouseDown(e, room.id, 'n')}
                                                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 rounded bg-amber-300/90 border border-stone-950 cursor-n-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={`Resize ${room.label} south`}
                                                        onMouseDown={(e) => handleRoomResizeMouseDown(e, room.id, 's')}
                                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 rounded bg-amber-300/90 border border-stone-950 cursor-s-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={`Resize ${room.label} west`}
                                                        onMouseDown={(e) => handleRoomResizeMouseDown(e, room.id, 'w')}
                                                        className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-6 rounded bg-amber-300/90 border border-stone-950 cursor-w-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={`Resize ${room.label} east`}
                                                        onMouseDown={(e) => handleRoomResizeMouseDown(e, room.id, 'e')}
                                                        className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-6 rounded bg-amber-300/90 border border-stone-950 cursor-e-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                                    />

                                                    <button
                                                        type="button"
                                                        aria-label={`Resize ${room.label} north west`}
                                                        onMouseDown={(e) => handleRoomResizeMouseDown(e, room.id, 'nw')}
                                                        className="absolute -top-1 -left-1 w-3 h-3 rounded-sm bg-amber-300 border border-stone-950 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={`Resize ${room.label} north east`}
                                                        onMouseDown={(e) => handleRoomResizeMouseDown(e, room.id, 'ne')}
                                                        className="absolute -top-1 -right-1 w-3 h-3 rounded-sm bg-amber-300 border border-stone-950 cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={`Resize ${room.label} south west`}
                                                        onMouseDown={(e) => handleRoomResizeMouseDown(e, room.id, 'sw')}
                                                        className="absolute -bottom-1 -left-1 w-3 h-3 rounded-sm bg-amber-300 border border-stone-950 cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={`Resize ${room.label} south east`}
                                                        onMouseDown={(e) => handleRoomResizeMouseDown(e, room.id, 'se')}
                                                        className="absolute -bottom-1 -right-1 w-3 h-3 rounded-sm bg-amber-300 border border-stone-950 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                                    />
                                                </>
                                            )}

                                            {!isDragging && !isResizing && (
                                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 pointer-events-none">
                                                    <Move size={10} className="text-amber-400/60" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()
                            ))}
                        </div>
                    </BattleMap>

                    {/* Status HUD (Left Bottom) */}
                    <div className="absolute bottom-6 left-6 z-50 flex items-center gap-3">
                        <div className="bg-stone-900/80 backdrop-blur-xl border border-white/5 h-10 px-4 rounded-xl flex items-center gap-4 shadow-2xl">
                            <div className="flex items-center gap-2">
                                <Layout size={14} className="text-amber-500" />
                                <span className="text-[10px] font-black uppercase text-white/90">{localMap.rooms.length} Rooms</span>
                            </div>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-2">
                                <Palette size={14} className="text-amber-500" />
                                <span className="text-[10px] font-black uppercase text-white/90">{localMap.shapes.length + localMap.freehandPaths.length} Drawings</span>
                            </div>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-2">
                                <EyeOff size={14} className="text-amber-500" />
                                <span className="text-[10px] font-black uppercase text-white/90">{localMap.fogOfWar.length} Fog Points</span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
