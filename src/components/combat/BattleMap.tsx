import React, { useState, useRef, useMemo, useCallback } from 'react';
import { BattleMapCanvas } from './BattleMapCanvas';
import { AmbientOverlay } from './AmbientOverlay';
import { Token } from './Token';
import { DrawingMode } from './ShapeControls';
import { getReachableCells } from '../../engine/gridEngine';
import { buildTargetingOverlay } from '../../engine/targetingEngine';

import { ZoomIn, ZoomOut, Maximize, Ruler, Plus, Minus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { BattleMapState, MapToken, GridPosition, MapShape, FreehandPath, TargetingMode, TargetingOverlay, VisionZone, LightLevel, WeatherEffect } from '../../types/battleMap';
import { TokenContextMenu } from './TokenContextMenu';
import { DraggablePanel } from '../common/DraggablePanel';
import { TokenTooltip } from './TokenTooltip';

interface BattleMapProps {
    mapState: BattleMapState;
    tokens: MapToken[];
    combatants?: import('../../types/combat').Combatant[];
    activeCombatantId?: string | null;
    activeCombatantConditions?: string[];
    selectedTokenId?: string | null;
    drawingMode?: DrawingMode;
    movementRemaining?: number;
    movementMax?: number; // New: Total speed for the meter
    movementOverlay?: GridPosition[];
    targeting?: TargetingMode | null;
    onTokenClick?: (tokenId: string) => void;
    onTokenMove?: (tokenId: string, position: GridPosition) => void;
    onShapeAdd?: (shape: MapShape) => void;
    onFreehandPathAdd?: (path: FreehandPath) => void;
    onFogOfWarAdd?: (shape: MapShape) => void;
    onFogOfWarFreehandAdd?: (path: FreehandPath) => void;
    onVisionZoneAdd?: (zone: VisionZone) => void;
    activeVisionLightLevel?: LightLevel;
    activeVisionWeather?: WeatherEffect;
    onTargetSelect?: (targetIds: string[]) => void;
    contextMenu?: { x: number; y: number; tokenId: string; combatantId?: string | null } | null;
    onContextMenuOpen?: (x: number, y: number, tokenId: string, combatantId?: string | null) => void;
    onContextMenuClose?: () => void;
    onTokenUpdate?: (tokenId: string, updates: Partial<MapToken>) => void;
    onTokenRemove?: (tokenId: string) => void;
    onMarkDead?: (combatantId: string) => void;
    onRevive?: (combatantId: string) => void;
    onApplyCondition?: (combatantId: string, conditionId: string) => void;
    onActionClick?: (combatantId: string, action: import('../../types/combat').CombatAction) => void;
    onDrawingModeChange?: (mode: DrawingMode) => void;
    onEndTurn?: () => void;
    onResizeGrid?: (side: 'top' | 'bottom' | 'left' | 'right', delta: number) => void;
    hoveredAction?: import('../../types/combat').CombatAction | null;
    onConditionHover?: (name: string, e: React.MouseEvent) => void;
    onConditionLeave?: () => void;
    onViewStatBlock?: (combatantId: string) => void;
    onZoomChange?: (zoom: number) => void;
    onHoverGridChange?: (pos: GridPosition | null) => void;
    onBackgroundUpdate?: (updates: { offsetDelta?: { dx: number, dy: number }, offset?: { x: number, y: number }, scaleX?: number, scaleY?: number }) => void;
    className?: string;
    children?: React.ReactNode;
}

export const BattleMap: React.FC<BattleMapProps> = ({
    mapState,
    tokens,
    combatants = [],
    activeCombatantId,
    activeCombatantConditions = [],
    selectedTokenId,
    drawingMode = 'select',
    movementRemaining = 30,
    movementMax = 30,
    targeting = null,
    onTokenClick,
    onTokenMove,
    onShapeAdd,
    onFreehandPathAdd,
    onFogOfWarAdd,
    onFogOfWarFreehandAdd,
    onVisionZoneAdd,
    activeVisionLightLevel = 'bright',
    activeVisionWeather = 'none',
    onTargetSelect,
    onTokenUpdate,
    onTokenRemove,
    onMarkDead,
    onRevive,
    onApplyCondition,
    onActionClick,
    onDrawingModeChange,
    onEndTurn,
    onResizeGrid,
    hoveredAction = null,
    onConditionHover,
    onConditionLeave,
    onViewStatBlock,
    onZoomChange,
    onHoverGridChange,
    onBackgroundUpdate,
    movementOverlay = [],
    contextMenu: externalContextMenu,
    onContextMenuOpen,
    onContextMenuClose,
    className = "",
    children
}) => {
    type ContextMenuState = { x: number; y: number; tokenId: string; combatantId?: string | null } | null;
    type DrawableShapeMode = Extract<DrawingMode, MapShape['type']>;
    const isDrawableShapeMode = (mode: DrawingMode): mode is DrawableShapeMode =>
        mode === 'rectangle' || mode === 'circle' || mode === 'line';

    // --- State & Refs ---
    const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [currentDragPos, setCurrentDragPos] = useState({ x: 0, y: 0 });

    const [drawingStartPos, setDrawingStartPos] = useState<GridPosition | null>(null);
    const [freehandPoints, setFreehandPoints] = useState<{ x: number, y: number }[]>([]);
    const [targetingOverlay, setTargetingOverlay] = useState<TargetingOverlay | null>(null);

    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    const [internalContextMenu, setInternalContextMenu] = useState<ContextMenuState>(null);
    const contextMenu = externalContextMenu !== undefined ? externalContextMenu : internalContextMenu;
    const setContextMenu = useCallback((val: ContextMenuState) => {
        if (onContextMenuOpen && val) onContextMenuOpen(val.x, val.y, val.tokenId, val.combatantId);
        else if (onContextMenuClose && !val) onContextMenuClose();
        else setInternalContextMenu(val);
    }, [onContextMenuOpen, onContextMenuClose]);
    const [measurementStart, setMeasurementStart] = useState<GridPosition | null>(null);
    const [measurementCurrent, setMeasurementCurrent] = useState<GridPosition | null>(null);
    const [hoveredGridPos, setHoveredGridPos] = useState<GridPosition | null>(null);
    const [hoveredTokenId, setHoveredTokenId] = useState<string | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const hasDragged = useRef(false);
    const dragStartMousePos = useRef({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);

    const isActiveCombat = !!activeCombatantId;

    // --- Keyboard Shortcuts ---
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if in an input/textarea
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

            switch (e.key) {
                case '1': onDrawingModeChange?.('select'); break;
                case '2': onDrawingModeChange?.('rectangle'); break;
                case '3': onDrawingModeChange?.('circle'); break;
                case '4': onDrawingModeChange?.('line'); break;
                case '5': onDrawingModeChange?.('freehand'); break;
                case 'c': onDrawingModeChange?.('calibrate'); break;
                case 'f': onDrawingModeChange?.('fow-reveal'); break;
                case 'g': onDrawingModeChange?.('fow-hide'); break;
                case 'e': onDrawingModeChange?.('eraser'); break;
                case 'Escape':
                    if (targeting) onTargetSelect?.([]);
                    if (contextMenu) setContextMenu(null);
                    if (drawingMode !== 'select') onDrawingModeChange?.('select');
                    if (measurementStart) setMeasurementStart(null);
                    break;
                case ' ':
                    e.preventDefault();
                    if (isActiveCombat) onEndTurn?.();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onDrawingModeChange, onEndTurn, targeting, onTargetSelect, contextMenu, isActiveCombat, drawingMode, measurementStart, setContextMenu]);

    const width = mapState.gridWidth * mapState.cellSizePx;
    const height = mapState.gridHeight * mapState.cellSizePx;

    // --- Reachable Cells Calculation ---
    const reachableCells = useMemo(() => {
        if (!activeCombatantId) return [];
        const activeToken = (tokens || []).find(t => t.combatantId === activeCombatantId);
        if (!activeToken) return [];

        const blockingTerrain = (mapState.shapes || [])
            .filter(s => s.isBlockingTerrain)
            .flatMap(s => s.points);

        const hostileTokens = (tokens || [])
            .filter(t => {
                if (t.id === activeToken.id) return false;
                // Basic hostility rules
                if (activeToken.faction === 'player' || activeToken.faction === 'ally') {
                    return t.faction === 'enemy';
                }
                if (activeToken.faction === 'enemy') {
                    return t.faction === 'player' || t.faction === 'ally';
                }
                return false;
            })
            .map(t => t.position);

        return getReachableCells(activeToken.position, movementRemaining, blockingTerrain, hostileTokens);
    }, [activeCombatantId, tokens, mapState.shapes, movementRemaining]);

    // --- Helper for coordinate conversion ---
    const getClampedPos = (clientX: number, clientY: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };

        // 1. Get relative to container viewport
        const relX = clientX - rect.left;
        const relY = clientY - rect.top;

        // 2. Apply inverse transform: (pos - currentOffset) / zoom
        const transformedX = (relX - panOffset.x) / zoom;
        const transformedY = (relY - panOffset.y) / zoom;

        return {
            x: Math.max(-1000, Math.min(width + 1000, transformedX)),
            y: Math.max(-1000, Math.min(height + 1000, transformedY))
        };
    };

    const getGridPosition = (x: number, y: number): GridPosition => {
        const cellSize = mapState.cellSizePx;
        return {
            col: Math.floor(x / cellSize),
            row: Math.floor(y / cellSize)
        };
    };

    // --- Mouse Handlers ---
    const handleMouseDown = (e: React.MouseEvent, token?: MapToken) => {
        const isMiddleClick = e.button === 1;
        const isAltClick = e.button === 0 && e.altKey;
        const isShiftClick = e.button === 0 && e.shiftKey;

        const pos = getClampedPos(e.clientX, e.clientY);
        const gridPos = getGridPosition(pos.x, pos.y);

        if (isShiftClick) {
            setMeasurementStart(gridPos);
            setMeasurementCurrent(gridPos);
            return;
        }

        // Right click, Middle click, or Alt+Click for panning
        if (isMiddleClick || isAltClick || e.button === 2) {
            // ALWAYS allow panning regardless of drawingMode
            if (!targeting) {
                setIsPanning(true);
                setLastMousePos({ x: e.clientX, y: e.clientY });
                dragStartMousePos.current = { x: e.clientX, y: e.clientY };
                hasDragged.current = false;
                return;
            }
        }

        if (e.button !== 0) return; // Left click only

        if (targeting) {
            e.stopPropagation();
            if (targetingOverlay && targetingOverlay.affectedCombatantIds.length > 0) {
                onTargetSelect?.(targetingOverlay.affectedCombatantIds);
            } else {
                onTargetSelect?.([]); // Clicked empty space
            }
        } else if (drawingMode === 'calibrate') {
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        } else if (drawingMode === 'select') {
            if (token) {
                e.stopPropagation();

                // Clicking a token ALWAYS selects that combatant in the UI
                if (token.combatantId) {
                    onTokenClick?.(token.id);
                }

                setDraggingTokenId(token.id);
                const tokenX = token.position.col * mapState.cellSizePx;
                const tokenY = token.position.row * mapState.cellSizePx;
                setDragOffset({ x: pos.x - tokenX, y: pos.y - tokenY });
                setCurrentDragPos(pos);
            } else {
                // CLICKED EMPTY SPACE (Click-to-Move)
                const activeToken = tokens.find(t => t.combatantId === activeCombatantId);
                const isReachable = reachableCells.some(rc => rc.col === gridPos.col && rc.row === gridPos.row);

                if (activeToken && isReachable) {
                    onTokenMove?.(activeToken.id, gridPos);
                }

                // Deselect
                onTokenClick?.('');
            }
        } else if (drawingMode === 'freehand' || drawingMode === 'fow-hide' || drawingMode === 'fow-reveal') {
            setFreehandPoints([pos]);
        } else if (drawingMode !== 'eraser') {
            setDrawingStartPos(gridPos);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;

            if (drawingMode === 'calibrate' && onBackgroundUpdate) {
                onBackgroundUpdate({
                    offsetDelta: {
                        dx: dx / zoom,
                        dy: dy / zoom
                    }
                });
            } else {
                // Check if we've moved enough to be considered a drag
                const totalDist = Math.sqrt(
                    Math.pow(e.clientX - dragStartMousePos.current.x, 2) +
                    Math.pow(e.clientY - dragStartMousePos.current.y, 2)
                );
                if (totalDist > 5) {
                    hasDragged.current = true;
                }

                setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            }
            setLastMousePos({ x: e.clientX, y: e.clientY });
            return;
        }

        const pos = getClampedPos(e.clientX, e.clientY);
        const gridPos = getGridPosition(pos.x, pos.y);
        setCurrentDragPos(pos);

        if (measurementStart) {
            setMeasurementCurrent(gridPos);
            return;
        }

        if (draggingTokenId) {
            // No action needed here, currentDragPos is used for rendering
        } else if (targeting) {
            const activeToken = tokens.find(t => t.combatantId === activeCombatantId);
            if (activeToken) {
                const overlay = buildTargetingOverlay(
                    targeting.action,
                    activeToken.position,
                    gridPos,
                    tokens
                );
                setTargetingOverlay(overlay);
            }
        } else if (freehandPoints.length > 0) {
            setFreehandPoints(prev => [...prev, pos]);
        }

        // Track grid hover for pathing
        const cellSize = mapState.cellSizePx;
        const gridX = Math.floor(pos.x / cellSize);
        const gridY = Math.floor(pos.y / cellSize);

        if (!hoveredGridPos || hoveredGridPos.col !== gridX || hoveredGridPos.row !== gridY) {
            setHoveredGridPos({ col: gridX, row: gridY });
            onHoverGridChange?.({ col: gridX, row: gridY });
        }
    };



    const handleMouseUp = () => {
        setIsPanning(false);
        setMeasurementStart(null);
        setMeasurementCurrent(null);
        onHoverGridChange?.(null);

        if (draggingTokenId) {
            const finalX = currentDragPos.x - dragOffset.x;
            const finalY = currentDragPos.y - dragOffset.y;
            const finalGridPos = getGridPosition(finalX + mapState.cellSizePx / 2, finalY + mapState.cellSizePx / 2);
            onTokenMove?.(draggingTokenId, {
                col: Math.max(0, Math.min(mapState.gridWidth - 1, finalGridPos.col)),
                row: Math.max(0, Math.min(mapState.gridHeight - 1, finalGridPos.row))
            });
            setDraggingTokenId(null);
        } else if (freehandPoints.length > 1) {
            if (drawingMode === 'fow-hide' || drawingMode === 'fow-reveal') {
                onFogOfWarFreehandAdd?.({
                    id: crypto.randomUUID(),
                    points: freehandPoints,
                    color: drawingMode === 'fow-hide' ? 'black' : 'white',
                    width: 20
                });
            } else {
                onFreehandPathAdd?.({
                    id: crypto.randomUUID(),
                    points: freehandPoints,
                    color: '#ef4444',
                    width: 3
                });
            }
            setFreehandPoints([]);
        } else if (drawingStartPos) {
            const endGridPos = getGridPosition(currentDragPos.x, currentDragPos.y);

            if (drawingMode === 'fow-hide' || drawingMode === 'fow-reveal') {
                const newShape: MapShape = {
                    id: crypto.randomUUID(),
                    type: 'rectangle',
                    points: [drawingStartPos, endGridPos],
                    style: {
                        stroke: 'none',
                        strokeWidth: 0,
                        fill: drawingMode === 'fow-hide' ? 'black' : 'white', // Black hides, White reveals
                        dashed: false
                    }
                };
                onFogOfWarAdd?.(newShape);
            } else if (drawingMode === 'zone-rect' || drawingMode === 'zone-circle') {
                const widthInCells = Math.max(1, Math.abs(endGridPos.col - drawingStartPos.col));
                const heightInCells = Math.max(1, Math.abs(endGridPos.row - drawingStartPos.row));
                const dx = endGridPos.col - drawingStartPos.col;
                const dy = endGridPos.row - drawingStartPos.row;
                const radiusInCells = Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy)));

                const newZone: VisionZone = {
                    id: crypto.randomUUID(),
                    type: drawingMode === 'zone-rect' ? 'rectangle' : 'circle',
                    position: drawingMode === 'zone-rect' ? 
                        { col: Math.min(drawingStartPos.col, endGridPos.col), row: Math.min(drawingStartPos.row, endGridPos.row) } :
                        drawingStartPos,
                    widthFt: drawingMode === 'zone-rect' ? widthInCells * 5 : undefined,
                    heightFt: drawingMode === 'zone-rect' ? heightInCells * 5 : undefined,
                    radiusFt: drawingMode === 'zone-circle' ? radiusInCells * 5 : undefined,
                    lightLevel: activeVisionLightLevel,
                    weatherEffect: activeVisionWeather
                };
                onVisionZoneAdd?.(newZone);
            } else if (isDrawableShapeMode(drawingMode)) {
                const newShape: MapShape = {
                    id: crypto.randomUUID(),
                    type: drawingMode,
                    points: [drawingStartPos, endGridPos],
                    style: {
                        stroke: '#3b82f6',
                        strokeWidth: 2,
                        fill: 'rgba(59, 130, 246, 0.2)',
                        dashed: false
                    }
                };
                onShapeAdd?.(newShape);
            }
            setDrawingStartPos(null);
        }
    };

    // --- Preview Calculations ---
    const getPreviewShape = (): MapShape | null => {
        if (!drawingStartPos || drawingMode === 'select' || drawingMode === 'eraser' || drawingMode === 'freehand') return null;

        const endGridPos = getGridPosition(currentDragPos.x, currentDragPos.y);

        if (drawingMode === 'fow-hide' || drawingMode === 'fow-reveal') {
            return {
                id: 'preview',
                type: 'rectangle',
                points: [drawingStartPos, endGridPos],
                style: {
                    stroke: drawingMode === 'fow-hide' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
                    strokeWidth: 2,
                    fill: drawingMode === 'fow-hide' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
                    dashed: true
                }
            };
        }

        if (drawingMode === 'zone-rect' || drawingMode === 'zone-circle') {
            return {
                id: 'preview',
                type: drawingMode === 'zone-rect' ? 'rectangle' : 'circle',
                points: [drawingStartPos, endGridPos],
                style: {
                    stroke: 'rgba(147, 51, 234, 0.8)', // Purple for vision zones
                    strokeWidth: 2,
                    fill: 'rgba(147, 51, 234, 0.2)',
                    dashed: true
                }
            };
        }

        if (!isDrawableShapeMode(drawingMode)) {
            return null;
        }

        return {
            id: 'preview',
            type: drawingMode,
            points: [drawingStartPos, endGridPos],
            style: {
                stroke: '#3b82f6',
                strokeWidth: 2,
                fill: 'rgba(59, 130, 246, 0.2)',
                dashed: true
            }
        };
    };

    const getPreviewFreehand = (): FreehandPath | null => {
        if (freehandPoints.length < 2) return null;
        let color = '#ef4444';
        let width = 3;
        if (drawingMode === 'fow-hide') { color = 'rgba(0,0,0,0.5)'; width = 20; }
        else if (drawingMode === 'fow-reveal') { color = 'rgba(255,255,255,0.5)'; width = 20; }

        return {
            id: 'preview-free',
            points: freehandPoints,
            color,
            width
        };
    };

    // --- Mouse Wheel Zoom ---
    const handleWheel = (e: React.WheelEvent) => {
        // Don't zoom if Alt is pressed (reserved for draggable panels)
        if (e.altKey) return;
        e.preventDefault();

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Mouse position relative to container
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (contextMenu) return; // Lock map movement/zoom while context menu is open

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = Math.min(3, Math.max(0.25, zoom * zoomFactor));

        // Adjust pan to zoom toward cursor position
        const zoomRatio = newZoom / zoom;
        const newPanX = mouseX - zoomRatio * (mouseX - panOffset.x);
        const newPanY = mouseY - zoomRatio * (mouseY - panOffset.y);

        setZoom(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
        onZoomChange?.(newZoom);
    };

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden bg-stone-950 select-none ${className}`}
            style={{
                width: '100%',
                height: '100%'
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseDown={(e) => handleMouseDown(e)}
            onWheel={handleWheel}
            onContextMenu={(e) => {
                e.preventDefault();
                setIsPanning(false);

                // If we were dragging, don't show the context menu
                if (hasDragged.current) {
                    hasDragged.current = false;
                    return;
                }

                if (targeting) {
                    onTargetSelect?.([]); // Right-click cancels targeting
                    return;
                }

                // Check if we clicked a token
                const pos = getClampedPos(e.clientX, e.clientY);
                const gridPos = getGridPosition(pos.x, pos.y);
                const clickedToken = (tokens || []).find(t =>
                    gridPos.col >= t.position.col &&
                    gridPos.col < t.position.col + t.size &&
                    gridPos.row >= t.position.row &&
                    gridPos.row < t.position.row + t.size
                );

                if (clickedToken) {
                    if (clickedToken.combatantId) {
                        onTokenClick?.(clickedToken.id); // Select the clicked token to sync UI
                    }
                    setContextMenu({ x: e.clientX, y: e.clientY, tokenId: clickedToken.id, combatantId: clickedToken.combatantId });
                } else {
                    setContextMenu(null);
                }
            }}
        >
            {/* The base grid */}
            <div
                className="relative origin-top-left"
                style={{
                    width: Math.max(1, width),
                    height: Math.max(1, height),
                    transform: `translate(${Number.isFinite(panOffset.x) ? panOffset.x : 0}px, ${Number.isFinite(panOffset.y) ? panOffset.y : 0}px) scale(${Number.isFinite(zoom) ? zoom : 1})`,
                    cursor: isPanning ? 'grabbing' : (drawingMode !== 'select' ? 'crosshair' : 'default')
                }}
            >
                {(width <= 0 || height <= 0) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50 text-stone-500 font-cinzel text-xs">
                        Initializing Tactical Grid...
                    </div>
                )}
                <BattleMapCanvas
                    mapState={mapState}
                    width={width}
                    height={height}
                    previewShape={getPreviewShape()}
                    previewFreehandPath={getPreviewFreehand()}
                    reachableCells={movementOverlay}
                    targetingOverlay={targeting ? targetingOverlay : null}
                    hoveredAction={hoveredAction}
                    hoveredGridPos={hoveredGridPos}
                    activeCombatantPos={(tokens || []).find(t => t.combatantId === activeCombatantId)?.position}
                    activeCombatantConditions={activeCombatantConditions}
                    movementRemaining={movementRemaining}
                    measurementStart={measurementStart}
                    measurementCurrent={measurementCurrent}
                />

                {/* Measurement Line */}
                {measurementStart && measurementCurrent && (
                    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible" style={{ zIndex: 100 }}>
                        <line
                            x1={measurementStart.col * mapState.cellSizePx + mapState.cellSizePx / 2}
                            y1={measurementStart.row * mapState.cellSizePx + mapState.cellSizePx / 2}
                            x2={measurementCurrent.col * mapState.cellSizePx + mapState.cellSizePx / 2}
                            y2={measurementCurrent.row * mapState.cellSizePx + mapState.cellSizePx / 2}
                            stroke="#fbbf24"
                            strokeWidth="3"
                            strokeDasharray="8 4"
                        />
                        <g transform={`translate(${measurementCurrent.col * mapState.cellSizePx}, ${measurementCurrent.row * mapState.cellSizePx})`}>
                            <rect x="-10" y="-35" width="60" height="25" rx="4" fill="rgba(0,0,0,0.8)" />
                            <text x="20" y="-18" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                                {Math.round(Math.sqrt(Math.pow(measurementCurrent.col - measurementStart.col, 2) + Math.pow(measurementCurrent.row - measurementStart.row, 2)) * 5)}ft
                            </text>
                        </g>
                    </svg>
                )}

                {/* Tokens Layer */}
                <div className="absolute inset-0 z-40 pointer-events-none">
                    {(tokens || []).map(token => {
                        const isDragging = token.id === draggingTokenId;

                        // Calculate visual position
                        let dragStyle: React.CSSProperties = {};
                        if (isDragging) {
                            dragStyle = {
                                left: `${currentDragPos.x - dragOffset.x}px`,
                                top: `${currentDragPos.y - dragOffset.y}px`,
                                zIndex: 50,
                                opacity: 0.9,
                                pointerEvents: 'none'
                            };
                        }

                        return (
                            <React.Fragment key={token.id}>
                                {/* Ghost preview shown only when dragging this specific token */}
                                {isDragging && (
                                    <div
                                        className="absolute opacity-30 pointer-events-none transition-all duration-150 border-2 border-dashed border-white/50 rounded-full"
                                        style={{
                                            left: `${Math.round((currentDragPos.x - dragOffset.x) / mapState.cellSizePx) * mapState.cellSizePx}px`,
                                            top: `${Math.round((currentDragPos.y - dragOffset.y) / mapState.cellSizePx) * mapState.cellSizePx}px`,
                                            width: `${token.size * mapState.cellSizePx}px`,
                                            height: `${token.size * mapState.cellSizePx}px`,
                                            zIndex: 10
                                        }}
                                    />
                                )}
                                <div className="pointer-events-auto">
                                    <Token
                                        token={token}
                                        combatant={combatants.find(c => c.id === token.combatantId)}
                                        cellSize={mapState.cellSizePx}
                                        isActive={token.combatantId === activeCombatantId || token.id === selectedTokenId}
                                        isAffected={targetingOverlay?.affectedCombatantIds.includes(token.combatantId)}
                                        movementRemaining={token.combatantId === activeCombatantId ? movementRemaining : undefined}
                                        movementMax={token.combatantId === activeCombatantId ? movementMax : undefined}
                                        onClick={() => onTokenClick?.(token.id)}
                                        isDragging={isDragging}
                                        style={dragStyle}
                                        onMouseDown={(e) => handleMouseDown(e, token)}
                                        onMouseEnter={(e) => {
                                            if (!draggingTokenId && !isPanning) {
                                                setHoveredTokenId(token.id);
                                                setTooltipPos({ x: e.clientX, y: e.clientY });
                                            }
                                        }}
                                        onMouseLeave={() => setHoveredTokenId(null)}
                                        onConditionHover={onConditionHover}
                                        onConditionLeave={onConditionLeave}
                                    />
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>

                <AmbientOverlay
                    width={width}
                    height={height}
                    type={mapState.backgroundColor.toLowerCase().includes('064e3b') ? 'sparks' : 'ash'}
                />

                {/* Custom Navigator Overlays (Room Tags, etc) */}
                {children}
            </div>

            {/* ═══ LAYER 3: FLOATING CONTROLS (DM & SHARED) ═══ */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-4 pointer-events-none">
                <DraggablePanel label="Map Tools" className="flex flex-col gap-4">
                    {/* Zoom Controls */}
                    <div className="flex flex-col bg-stone-900/90 backdrop-blur border border-stone-800 rounded-lg shadow-xl overflow-hidden shadow-black/50 pointer-events-auto">
                        <button
                            onClick={() => setZoom(Math.min(3, zoom * 1.2))}
                            className="p-2.5 hover:bg-stone-800 text-stone-400 hover:text-gold transition-colors border-b border-stone-800"
                            title="Zoom In"
                        >
                            <ZoomIn size={18} />
                        </button>
                        <button
                            onClick={() => setZoom(Math.max(0.25, zoom / 1.2))}
                            className="p-2.5 hover:bg-stone-800 text-stone-400 hover:text-gold transition-colors border-b border-stone-800"
                            title="Zoom Out"
                        >
                            <ZoomOut size={18} />
                        </button>
                        <button
                            onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
                            className="p-2.5 hover:bg-stone-800 text-stone-400 hover:text-gold transition-colors border-b border-stone-800"
                            title="Reset View"
                        >
                            <Maximize size={18} />
                        </button>
                        <div className="p-2.5 bg-stone-950/40 text-[10px] font-bold text-stone-500 text-center border-b border-stone-800">
                            {Math.round(zoom * 100)}%
                        </div>
                    </div>

                    {/* Grid Resizing Controls - DM Only */}
                    {onResizeGrid && (
                        <div className="flex flex-col bg-stone-900/90 backdrop-blur border border-stone-800 rounded-lg shadow-xl overflow-hidden shadow-black/50 pointer-events-auto">
                            <div className="p-2 bg-stone-950/40 text-[9px] font-black text-stone-500 uppercase tracking-tighter text-center border-b border-stone-800">
                                Grid Editor
                            </div>

                            {/* 4-Way Controls */}
                            <div className="p-3 grid grid-cols-3 gap-2 items-center">
                                {/* Top row */}
                                <div />
                                <div className="flex flex-col items-center gap-1">
                                    <button onClick={() => onResizeGrid('top', 1)} className="p-1 hover:bg-stone-800 text-green-500 rounded" title="Add Row Above">
                                        <Plus size={12} />
                                    </button>
                                    <ArrowUp size={14} className="text-stone-600" />
                                    <button onClick={() => onResizeGrid('top', -1)} className="p-1 hover:bg-stone-800 text-red-500 rounded" title="Remove Row Above">
                                        <Minus size={12} />
                                    </button>
                                </div>
                                <div />

                                {/* Middle row */}
                                <div className="flex items-center gap-1">
                                    <button onClick={() => onResizeGrid('left', 1)} className="p-1 hover:bg-stone-800 text-green-500 rounded" title="Add Column Left">
                                        <Plus size={12} />
                                    </button>
                                    <ArrowLeft size={14} className="text-stone-600" />
                                    <button onClick={() => onResizeGrid('left', -1)} className="p-1 hover:bg-stone-800 text-red-500 rounded" title="Remove Column Left">
                                        <Minus size={12} />
                                    </button>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1 bg-stone-950/40 rounded border border-stone-800">
                                    <span className="text-[10px] font-mono text-gold leading-none">{mapState.gridWidth}</span>
                                    <span className="text-[8px] text-stone-600 font-bold">x</span>
                                    <span className="text-[10px] font-mono text-gold leading-none">{mapState.gridHeight}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => onResizeGrid('right', -1)} className="p-1 hover:bg-stone-800 text-red-500 rounded" title="Remove Column Right">
                                        <Minus size={12} />
                                    </button>
                                    <ArrowRight size={14} className="text-stone-600" />
                                    <button onClick={() => onResizeGrid('right', 1)} className="p-1 hover:bg-stone-800 text-green-500 rounded" title="Add Column Right">
                                        <Plus size={12} />
                                    </button>
                                </div>

                                {/* Bottom row */}
                                <div />
                                <div className="flex flex-col items-center gap-1">
                                    <button onClick={() => onResizeGrid('bottom', -1)} className="p-1 hover:bg-stone-800 text-red-500 rounded" title="Remove Row Below">
                                        <Minus size={12} />
                                    </button>
                                    <ArrowDown size={14} className="text-stone-600" />
                                    <button onClick={() => onResizeGrid('bottom', 1)} className="p-1 hover:bg-stone-800 text-green-500 rounded" title="Add Row Below">
                                        <Plus size={12} />
                                    </button>
                                </div>
                                <div />
                            </div>
                        </div>
                    )}

                    <div
                        className="bg-stone-900/90 backdrop-blur border border-stone-800 rounded-lg p-2.5 shadow-lg group cursor-help transition-all hover:bg-stone-800/95 pointer-events-auto"
                        title="Measurement Tool: Shift + Drag to measure distance"
                    >
                        <Ruler size={18} className="text-stone-400 group-hover:text-gold transition-colors" />
                    </div>
                </DraggablePanel>
            </div>

            {/* Context Menu */}
            {contextMenu && contextMenu.tokenId && (
                <TokenContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    tokenId={contextMenu.tokenId}
                    onClose={() => setContextMenu(null)}
                    onApplyCondition={(cond) => {
                        if (contextMenu.combatantId) {
                            onApplyCondition?.(contextMenu.combatantId, cond);
                        }
                    }}
                    onMarkDead={() => {
                        if (contextMenu.combatantId) {
                            onMarkDead?.(contextMenu.combatantId);
                        }
                    }}
                    onRevive={() => {
                        if (contextMenu.combatantId) {
                            onRevive?.(contextMenu.combatantId);
                        }
                    }}
                    onRemove={() => {
                        onTokenRemove?.(contextMenu.tokenId);
                    }}
                    onUpdate={(updates) => {
                        onTokenUpdate?.(contextMenu.tokenId, updates);
                    }}
                    onActionClick={(action) => {
                        if (contextMenu.combatantId) {
                            onActionClick?.(contextMenu.combatantId, action);
                        }
                    }}
                    onViewStatBlock={() => {
                        if (contextMenu.combatantId) {
                            onViewStatBlock?.(contextMenu.combatantId);
                        }
                    }}
                    onConditionHover={onConditionHover}
                    onConditionLeave={onConditionLeave}
                    combatant={(combatants || []).find(c => c.id === contextMenu.combatantId)}
                />
            )}

            {/* Token Hover Tooltip */}
            {hoveredTokenId && !contextMenu && !draggingTokenId && (
                (() => {
                    const token = tokens.find(t => t.id === hoveredTokenId);
                    const combatant = combatants?.find(c => c.id === token?.combatantId);
                    if (token && combatant) {
                        return (
                            <TokenTooltip
                                token={token}
                                combatant={combatant}
                                x={tooltipPos.x}
                                y={tooltipPos.y}
                            />
                        );
                    }
                    return null;
                })()
            )}
        </div>
    );
};
