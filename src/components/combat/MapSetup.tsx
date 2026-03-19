import React, { useState, useCallback, useEffect } from 'react';
import { BattleMap } from './BattleMap';
import { ShapeControls, DrawingMode } from './ShapeControls';
import { VisionZoneControls } from './VisionZoneControls';
import { BattleMapState, GridPosition, MapToken, MapShape, FreehandPath, LightLevel, WeatherEffect } from '../../types/battleMap';
import { Combatant } from '../../types/combat';
import { syncCombatantsToTokens } from '../../engine/battleMapEngine';
import { Settings, Maximize2, Move, ArrowRight, X, Users, Plus, Layout, RotateCcw, Pencil, Eye, EyeOff, Trash2 } from 'lucide-react';
import mapTemplates from '../../data/maps/templates.json';

interface MapSetupProps {
    initialState?: Partial<BattleMapState>;
    combatants: Combatant[];
    onComplete: (state: BattleMapState) => void;
    onCancel: () => void;
}

type RightPanelTab = 'tools' | 'inspector';

export const MapSetup: React.FC<MapSetupProps> = ({
    initialState,
    combatants,
    onComplete,
    onCancel
}) => {
    // Initialize tokens from combatants if not already present
    const initialTokens = initialState?.tokens && initialState.tokens.length > 0
        ? initialState.tokens
        : syncCombatantsToTokens(combatants);

    const [mapState, setMapState] = useState<BattleMapState>({
        gridWidth: initialState?.gridWidth || 20,
        gridHeight: initialState?.gridHeight || 20,
        cellSizePx: initialState?.cellSizePx || 40,
        gridColor: initialState?.gridColor || 'rgba(75, 85, 99, 0.4)',
        backgroundColor: initialState?.backgroundColor || '#111827',
        tokens: initialTokens,
        shapes: initialState?.shapes || [],
        freehandPaths: initialState?.freehandPaths || [],
        backgroundImageUrl: initialState?.backgroundImageUrl,
        backgroundOffset: initialState?.backgroundOffset,
        backgroundScaleX: initialState?.backgroundScaleX,
        backgroundScaleY: initialState?.backgroundScaleY,
        fogOfWar: initialState?.fogOfWar || [],
        fogOfWarFreehand: initialState?.fogOfWarFreehand || []
    });

    const [drawingMode, setDrawingMode] = useState<DrawingMode>('select');
    const [zoom, setZoom] = useState(1);
    const [hoverPos, setHoverPos] = useState<GridPosition | null>(null);
    const [activeLightLevel, setActiveLightLevel] = useState<LightLevel>('bright');
    const [activeWeather, setActiveWeather] = useState<WeatherEffect>('none');
    const [history, setHistory] = useState<BattleMapState[]>([]);
    const [rightTab, setRightTab] = useState<RightPanelTab>('tools');
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

    const toggleMode = (mode: DrawingMode) => {
        setDrawingMode(prev => prev === mode ? 'select' : mode);
    };

    const pushToHistory = () => {
        setHistory(prev => [...prev.slice(-19), mapState]);
    };

    const handleApplyTemplate = (template: any) => {
        pushToHistory();
        setMapState(prev => ({
            ...prev,
            gridWidth: template.gridWidth,
            gridHeight: template.gridHeight,
            backgroundColor: template.backgroundColor,
            gridColor: template.gridColor,
            shapes: template.shapes.map((s: any) => ({ ...s, id: crypto.randomUUID() })),
            freehandPaths: [],
            fogOfWar: [],
            fogOfWarFreehand: []
        }));
    };

    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setMapState(previous);
        setHistory(prev => prev.slice(0, -1));
    }, [history]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const key = e.key.toLowerCase();
            if (key === '1') setDrawingMode('select');
            if (key === '2') setDrawingMode('rectangle');
            if (key === '3') setDrawingMode('circle');
            if (key === '4') setDrawingMode('line');
            if (key === '5') setDrawingMode('freehand');
            if (key === 'c') setDrawingMode('calibrate');
            if (key === '6' || key === 'e') setDrawingMode('eraser');
            if (key === 'g') setDrawingMode('fow-hide');
            if (key === 'f') setDrawingMode('fow-reveal');
            if (key === 'escape') setDrawingMode('select');

            if (key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleUndo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo]);

    const handleBackgroundUpdate = (updates: { offsetDelta?: { dx: number, dy: number }, offset?: { x: number, y: number }, scaleX?: number, scaleY?: number }) => {
        setMapState(prev => {
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



    const handleCellSizeChange = (val: number) => {
        setMapState((prev: BattleMapState) => ({ ...prev, cellSizePx: Math.max(16, Math.min(128, val)) }));
    };

    const handleTokenMove = (tokenId: string, position: GridPosition) => {
        setMapState((prev: BattleMapState) => ({
            ...prev,
            tokens: prev.tokens.map((t: MapToken) => t.id === tokenId ? { ...t, position } : t)
        }));
    };

    const handleVisionZoneAdd = (zone: import('../../types/battleMap').VisionZone) => {
        pushToHistory();
        setMapState(prev => ({
            ...prev,
            visionZones: [...(prev.visionZones || []), zone]
        }));
    };

    const handleClearAllZones = () => {
        pushToHistory();
        setMapState(prev => ({
            ...prev,
            visionZones: []
        }));
    };

    const handleResizeGrid = (side: 'top' | 'bottom' | 'left' | 'right', delta: number) => {
        setMapState((prev: BattleMapState) => {
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

            // Sync background image so it doesn't move visually when Origin shifts
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

    const handleShapeAdd = (shape: MapShape) => {
        pushToHistory();
        setMapState((prev: BattleMapState) => ({
            ...prev,
            shapes: [...prev.shapes, shape]
        }));
    };

    const handleToggleShapeVisibility = (id: string) => {
        pushToHistory();
        setMapState((prev: BattleMapState) => ({
            ...prev,
            shapes: prev.shapes.map(s => s.id === id ? { ...s, visibility: s.visibility === 'dm-only' ? 'all' : 'dm-only' } : s),
            fogOfWar: prev.fogOfWar.map(s => s.id === id ? { ...s, visibility: s.visibility === 'dm-only' ? 'all' : 'dm-only' } : s)
        }));
    };

    const handleDeleteShape = (id: string) => {
        pushToHistory();
        setMapState((prev: BattleMapState) => ({
            ...prev,
            shapes: prev.shapes.filter(s => s.id !== id),
            fogOfWar: prev.fogOfWar.filter(s => s.id !== id)
        }));
    };

    const handleFreehandAdd = (path: FreehandPath) => {
        pushToHistory();
        setMapState((prev: BattleMapState) => ({
            ...prev,
            freehandPaths: [...prev.freehandPaths, path]
        }));
    };

    const handleClearDrawings = () => {
        pushToHistory();
        setMapState((prev: BattleMapState) => ({
            ...prev,
            shapes: [],
            freehandPaths: [],
            fogOfWar: [],
            fogOfWarFreehand: []
        }));
    };

    const handleFogOfWarAdd = (shape: MapShape) => {
        pushToHistory();
        setMapState((prev: BattleMapState) => ({
            ...prev,
            fogOfWar: [...prev.fogOfWar, shape]
        }));
    };

    const handleFogOfWarFreehandAdd = (path: FreehandPath) => {
        pushToHistory();
        setMapState((prev: BattleMapState) => ({
            ...prev,
            fogOfWarFreehand: [...prev.fogOfWarFreehand, path]
        }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setMapState(prev => ({ ...prev, backgroundImageUrl: base64 }));
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveBackground = () => {
        pushToHistory();
        setMapState(prev => ({ ...prev, backgroundImageUrl: undefined, backgroundOffset: undefined, backgroundScaleX: undefined, backgroundScaleY: undefined }));
    };

    const handleUndoImageReset = () => {
        if (history.length > 0) handleUndo();
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-stone-950 font-cinzel text-stone-300">
            {/* ═══ HEADER: ACTION BAR ═══ */}
            <header className="h-16 border-b border-white/5 bg-stone-900/40 backdrop-blur-xl flex items-center justify-between px-6 z-30 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(147,51,234,0.2)]">
                        <Maximize2 size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight uppercase leading-tight">Map Setup</h2>
                        <p className="text-[9px] text-stone-500 font-black uppercase tracking-widest">Cartography & Vision Studio</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 bg-stone-900/40 backdrop-blur-md hover:bg-red-500/10 hover:text-red-400 text-stone-300 rounded-xl flex items-center gap-2 transition-all border border-white/5 hover:border-red-500/30 font-bold uppercase tracking-widest text-xs"
                    >
                        <X size={16} />
                        Discard
                    </button>
                    <button
                        onClick={() => onComplete(mapState)}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl flex items-center gap-3 transition-all active:scale-95 shadow-[0_10px_30px_rgba(37,99,235,0.3)] uppercase tracking-widest text-xs"
                    >
                        Start Battle
                        <ArrowRight size={16} />
                    </button>
                </div>
            </header>

            <div className="flex flex-row flex-grow overflow-hidden relative">
                {/* ═══ CENTER: THE CANVAS (no left sidebar!) ═══ */}
                <main className="flex-grow relative bg-stone-950">
                    <BattleMap
                        mapState={mapState}
                        tokens={mapState.tokens}
                        drawingMode={drawingMode}
                        onDrawingModeChange={setDrawingMode}
                        onTokenMove={handleTokenMove}
                        onShapeAdd={handleShapeAdd}
                        onFreehandPathAdd={handleFreehandAdd}
                        onFogOfWarAdd={handleFogOfWarAdd}
                        onFogOfWarFreehandAdd={handleFogOfWarFreehandAdd}
                        onVisionZoneAdd={handleVisionZoneAdd}
                        activeVisionLightLevel={activeLightLevel}
                        activeVisionWeather={activeWeather}
                        onResizeGrid={handleResizeGrid}
                        onZoomChange={setZoom}
                        onHoverGridChange={setHoverPos}
                        onBackgroundUpdate={handleBackgroundUpdate}
                        className="w-full h-full border-0 rounded-none"
                    />

                    {/* DOCKED STATUS (Center-Bottom) */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                        <div className="pointer-events-auto bg-stone-900/80 backdrop-blur-xl border border-white/10 py-2.5 px-6 rounded-2xl shadow-2xl flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/90">{mapState.tokens.length} Tokens</span>
                            </div>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-2 min-w-[120px]">
                                <Move size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
                                    {drawingMode === 'select' ? 'Neutral' : drawingMode.toUpperCase()}
                                    {hoverPos && <span className="ml-2 text-stone-500">[{String.fromCharCode(65 + hoverPos.col)}{hoverPos.row + 1}]</span>}
                                </span>
                            </div>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="text-[10px] font-mono text-blue-400 font-black">
                                {Math.round(zoom * 100)}%
                            </div>
                        </div>
                    </div>
                </main>

                {/* ═══ RIGHT SIDEBAR: TABBED (Tools + Inspector) ═══ */}
                <aside className={`${rightPanelCollapsed ? 'w-0 overflow-hidden' : 'w-80'} border-l border-white/5 bg-stone-900/20 backdrop-blur-sm flex flex-col z-20 transition-all duration-300 relative shrink-0`}>
                    <button
                        onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                        className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-stone-900 border border-white/10 rounded-full flex items-center justify-center text-stone-500 hover:text-white z-30 shadow-xl"
                    >
                        {rightPanelCollapsed ? <Plus size={10} /> : <X size={10} />}
                    </button>

                    {!rightPanelCollapsed && (
                        <>
                            {/* ═══ TAB HEADER ═══ */}
                            <div className="flex border-b border-white/5 shrink-0">
                                <button
                                    onClick={() => setRightTab('tools')}
                                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${rightTab === 'tools'
                                        ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
                                        : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'
                                        }`}
                                >
                                    <Pencil size={12} />
                                    Tools
                                </button>
                                <button
                                    onClick={() => setRightTab('inspector')}
                                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${rightTab === 'inspector'
                                        ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
                                        : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'
                                        }`}
                                >
                                    <Settings size={12} />
                                    Inspector
                                </button>
                            </div>

                            {/* ═══ TAB CONTENT ═══ */}
                            <div className="flex-grow overflow-y-auto custom-scrollbar">

                                {/* TOOLS TAB */}
                                {rightTab === 'tools' && (
                                    <div className="p-4 space-y-4">
                                        <ShapeControls
                                            currentMode={drawingMode}
                                            onModeChange={toggleMode}
                                            onClearAll={handleClearDrawings}
                                            onUndo={handleUndo}
                                            canUndo={history.length > 0}
                                            className="w-full"
                                        />
                                        <VisionZoneControls
                                            currentMode={drawingMode}
                                            onModeChange={toggleMode}
                                            activeLightLevel={activeLightLevel}
                                            onLightLevelChange={setActiveLightLevel}
                                            activeWeather={activeWeather}
                                            onWeatherChange={setActiveWeather}
                                            onClearAllZones={handleClearAllZones}
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                {/* INSPECTOR TAB */}
                                {rightTab === 'inspector' && (
                                    <div className="p-6 space-y-10">
                                        <section className="space-y-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/80">Grid Geometry</h3>
                                            <div className="bg-stone-950/40 p-4 rounded-xl border border-white/5 space-y-4">
                                                <div className="flex justify-between items-center px-4">
                                                    <div className="text-center">
                                                        <div className="text-[10px] text-stone-500 font-bold uppercase">Columns</div>
                                                        <div className="text-sm font-mono text-blue-400">{mapState.gridWidth}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-[10px] text-stone-500 font-bold uppercase">Rows</div>
                                                        <div className="text-sm font-mono text-blue-400">{mapState.gridHeight}</div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-center gap-1 mt-2">
                                                    {/* TOP */}
                                                    <div className="flex gap-1 border-b border-white/10 pb-1 mb-1">
                                                        <button onClick={() => handleResizeGrid('top', 1)} className="p-1 px-3 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded-md text-xs font-mono">+1</button>
                                                        <div className="text-[9px] uppercase font-black text-stone-600 self-center px-2">Top</div>
                                                        <button onClick={() => handleResizeGrid('top', -1)} className="p-1 px-3 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded-md text-xs font-mono">-1</button>
                                                    </div>
                                                    <div className="flex justify-between w-full">
                                                        {/* LEFT */}
                                                        <div className="flex flex-col gap-1 border-r border-white/10 pr-2 mr-1">
                                                            <div className="text-[9px] uppercase font-black text-stone-600 text-center">Left</div>
                                                            <div className="flex gap-1 justify-center">
                                                                <button onClick={() => handleResizeGrid('left', 1)} className="p-1 px-2 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded-md text-xs font-mono">+</button>
                                                                <button onClick={() => handleResizeGrid('left', -1)} className="p-1 px-2 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded-md text-xs font-mono">-</button>
                                                            </div>
                                                        </div>
                                                        {/* RIGHT */}
                                                        <div className="flex flex-col gap-1 border-l border-white/10 pl-2 ml-1">
                                                            <div className="text-[9px] uppercase font-black text-stone-600 text-center">Right</div>
                                                            <div className="flex gap-1 justify-center">
                                                                <button onClick={() => handleResizeGrid('right', -1)} className="p-1 px-2 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded-md text-xs font-mono">-</button>
                                                                <button onClick={() => handleResizeGrid('right', 1)} className="p-1 px-2 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded-md text-xs font-mono">+</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* BOTTOM */}
                                                    <div className="flex gap-1 border-t border-white/10 pt-1 mt-1">
                                                        <button onClick={() => handleResizeGrid('bottom', 1)} className="p-1 px-3 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded-md text-xs font-mono">+1</button>
                                                        <div className="text-[9px] uppercase font-black text-stone-600 self-center px-2">Bottom</div>
                                                        <button onClick={() => handleResizeGrid('bottom', -1)} className="p-1 px-3 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded-md text-xs font-mono">-1</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/80">Visual Scale</h3>
                                            <div className="bg-stone-950/40 p-1.5 rounded-2xl border border-white/5">
                                                <div className="p-4 space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] font-bold uppercase text-stone-500 tracking-widest">Cell Size</span>
                                                        <span className="text-xs font-mono text-blue-400">{mapState.cellSizePx}px</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="16"
                                                        max="128"
                                                        value={mapState.cellSizePx}
                                                        onChange={(e) => handleCellSizeChange(parseInt(e.target.value))}
                                                        className="w-full h-1.5 bg-stone-950 rounded-full appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all border border-white/5"
                                                    />
                                                    <div className="flex justify-between text-[8px] text-stone-600 font-black uppercase tracking-tighter">
                                                        <span>Micro</span>
                                                        <span>Macro</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/80">Battlefield Canvas</h3>
                                            {mapState.backgroundImageUrl ? (
                                                <div className="space-y-4">
                                                    <div className="relative group rounded-2xl overflow-hidden border border-white/10 aspect-video shadow-2xl bg-black">
                                                        <img src={mapState.backgroundImageUrl} alt="Map Background" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700" />
                                                        <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                                                            <button onClick={handleRemoveBackground} className="text-[10px] font-black uppercase bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-2xl transition-all hover:scale-105 active:scale-95">
                                                                Purge Image
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="bg-stone-950/40 p-4 rounded-xl border border-white/5 space-y-4">
                                                        {/* Stretch Width */}
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] font-black uppercase text-stone-500">Stretch Width</span>
                                                                <span className="text-[10px] font-mono text-blue-400">{Math.round((mapState.backgroundScaleX || 1.0) * 100)}%</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="0.1"
                                                                max="5"
                                                                step="0.01"
                                                                value={mapState.backgroundScaleX || 1.0}
                                                                onChange={(e) => handleBackgroundUpdate({ scaleX: parseFloat(e.target.value) })}
                                                                className="w-full h-1 bg-stone-900 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                            />
                                                        </div>
                                                        {/* Stretch Height */}
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] font-black uppercase text-stone-500">Stretch Height</span>
                                                                <span className="text-[10px] font-mono text-blue-400">{Math.round((mapState.backgroundScaleY || 1.0) * 100)}%</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="0.1"
                                                                max="5"
                                                                step="0.01"
                                                                value={mapState.backgroundScaleY || 1.0}
                                                                onChange={(e) => handleBackgroundUpdate({ scaleY: parseFloat(e.target.value) })}
                                                                className="w-full h-1 bg-stone-900 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                            />
                                                        </div>
                                                        {/* Action Buttons */}
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    handleBackgroundUpdate({ scaleX: 1.0, scaleY: 1.0 });
                                                                    setMapState(prev => ({ ...prev, backgroundOffset: { x: 0, y: 0 } }));
                                                                }}
                                                                className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30 transition-all"
                                                            >
                                                                Fit to Grid
                                                            </button>
                                                            <button
                                                                onClick={() => toggleMode('calibrate')}
                                                                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${drawingMode === 'calibrate' ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-stone-900 border-white/5 text-stone-500 hover:text-stone-300'}`}
                                                            >
                                                                {drawingMode === 'calibrate' ? 'Stop Calibration' : 'Drag Image'}
                                                            </button>
                                                            <button
                                                                onClick={handleUndoImageReset}
                                                                className="px-3 py-2 bg-stone-900 border border-white/5 rounded-lg text-stone-500 hover:text-white transition-all shadow-sm"
                                                                title="Undo"
                                                            >
                                                                <RotateCcw size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        className="hidden"
                                                        id="bg-upload-studio"
                                                    />
                                                    <label
                                                        htmlFor="bg-upload-studio"
                                                        className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-white/5 rounded-3xl text-stone-600 hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group"
                                                    >
                                                        <div className="w-12 h-12 rounded-2xl bg-stone-950 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl">
                                                            <Plus size={24} />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Import Layer</span>
                                                    </label>
                                                </div>
                                            )}
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/80">Map Layouts</h3>
                                            <div className="grid grid-cols-1 gap-2">
                                                {mapTemplates.map(template => (
                                                    <button
                                                        key={template.id}
                                                        onClick={() => handleApplyTemplate(template)}
                                                        className="flex flex-col items-start p-3 rounded-xl bg-stone-950/40 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left group"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Layout size={10} className="text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                                                            <span className="text-[11px] font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-wider">{template.name}</span>
                                                        </div>
                                                        <span className="text-[9px] text-stone-500 leading-tight mt-1">{template.description}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/80">Map Layers</h3>
                                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                                {mapState.shapes.length === 0 && mapState.fogOfWar.length === 0 && (
                                                    <span className="text-[10px] text-stone-600 italic">No drawn shapes.</span>
                                                )}
                                                {[...mapState.shapes.map(s => ({...s, _layerType: 'Shape'})), ...mapState.fogOfWar.map(s => ({...s, _layerType: 'Fog Mask'}))].map((shape, i) => (
                                                    <div key={shape.id} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950/40 border border-white/5 hover:border-white/10 transition-colors">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold text-stone-300 capitalize">{shape._layerType}: {shape.type} {i + 1}</span>
                                                            <span className="text-[8px] text-stone-500">{shape.style.fill === 'white' ? 'Reveal Mask' : shape.style.fill === 'black' ? 'Hide Mask' : 'Drawn Shape'}</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={() => handleToggleShapeVisibility(shape.id)}
                                                                className={`p-1.5 rounded-lg transition-colors border ${shape.visibility === 'dm-only' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20'}`}
                                                                title={shape.visibility === 'dm-only' ? 'Currently DM Only' : 'Currently Visible to All'}
                                                            >
                                                                {shape.visibility === 'dm-only' ? <EyeOff size={12} /> : <Eye size={12} />}
                                                            </button>
                                                            <button onClick={() => handleDeleteShape(shape.id)} className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all" title="Delete Layer"><Trash2 size={12} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-white/5 bg-stone-950/20 shrink-0">
                                <p className="text-[9px] text-stone-600 leading-relaxed italic">
                                    Right-click tokens for properties. Scroll to zoom. MMB to pan.
                                </p>
                            </div>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
};
