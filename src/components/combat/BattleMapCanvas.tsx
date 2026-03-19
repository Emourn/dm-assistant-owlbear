import React, { useRef, useEffect } from 'react';
import { BattleMapState, MapShape, FreehandPath, GridPosition, TargetingOverlay } from '../../types/battleMap';
import { CombatAction } from '../../types/combat';
import { parseActionRange } from '../../engine/targetingEngine';

interface BattleMapCanvasProps {
    mapState: BattleMapState;
    width: number;
    height: number;
    className?: string;
    previewShape?: MapShape | null;
    previewFreehandPath?: FreehandPath | null;
    reachableCells?: GridPosition[] | null;
    targetingOverlay?: TargetingOverlay | null;
    hoveredAction?: CombatAction | null;
    hoveredGridPos?: GridPosition | null;
    activeCombatantPos?: GridPosition;
    activeCombatantConditions?: string[];
    movementRemaining?: number;
    measurementStart?: GridPosition | null;
    measurementCurrent?: GridPosition | null;
    isPlayerView?: boolean;
}

const AOE_COLOR_MAP: Record<string, { stroke: string, fill: string, glow: string }> = {
    fire: { stroke: 'rgba(239, 68, 68, 0.8)', fill: 'rgba(239, 68, 68, 0.2)', glow: 'rgba(239, 68, 68, 0.5)' },
    cold: { stroke: 'rgba(59, 130, 246, 0.8)', fill: 'rgba(59, 130, 246, 0.2)', glow: 'rgba(59, 130, 246, 0.5)' },
    lightning: { stroke: 'rgba(168, 85, 247, 0.8)', fill: 'rgba(168, 85, 247, 0.2)', glow: 'rgba(168, 85, 247, 0.5)' },
    thunder: { stroke: 'rgba(107, 114, 128, 0.8)', fill: 'rgba(107, 114, 128, 0.2)', glow: 'rgba(107, 114, 128, 0.5)' },
    acid: { stroke: 'rgba(34, 197, 94, 0.8)', fill: 'rgba(34, 197, 94, 0.2)', glow: 'rgba(34, 197, 94, 0.5)' },
    poison: { stroke: 'rgba(22, 163, 74, 0.8)', fill: 'rgba(22, 163, 74, 0.2)', glow: 'rgba(22, 163, 74, 0.5)' },
    radiant: { stroke: 'rgba(253, 224, 71, 0.8)', fill: 'rgba(253, 224, 71, 0.2)', glow: 'rgba(253, 224, 71, 0.5)' },
    necrotic: { stroke: 'rgba(88, 28, 135, 0.8)', fill: 'rgba(88, 28, 135, 0.2)', glow: 'rgba(88, 28, 135, 0.5)' },
    force: { stroke: 'rgba(219, 39, 119, 0.8)', fill: 'rgba(219, 39, 119, 0.2)', glow: 'rgba(219, 39, 119, 0.5)' },
    psychic: { stroke: 'rgba(244, 114, 182, 0.8)', fill: 'rgba(244, 114, 182, 0.2)', glow: 'rgba(244, 114, 182, 0.5)' },
    slashing: { stroke: 'rgba(148, 163, 184, 0.8)', fill: 'rgba(148, 163, 184, 0.2)', glow: 'rgba(148, 163, 184, 0.5)' },
    piercing: { stroke: 'rgba(148, 163, 184, 0.8)', fill: 'rgba(148, 163, 184, 0.2)', glow: 'rgba(148, 163, 184, 0.5)' },
    bludgeoning: { stroke: 'rgba(148, 163, 184, 0.8)', fill: 'rgba(148, 163, 184, 0.2)', glow: 'rgba(148, 163, 184, 0.5)' },
    default: { stroke: 'rgba(239, 68, 68, 0.6)', fill: 'rgba(239, 68, 68, 0.1)', glow: 'rgba(239, 68, 68, 0.3)' }
};

export const BattleMapCanvas: React.FC<BattleMapCanvasProps> = ({
    mapState,
    width,
    height,
    className = "",
    previewShape,
    previewFreehandPath,
    reachableCells,
    targetingOverlay,
    hoveredAction,
    hoveredGridPos,
    activeCombatantPos,
    activeCombatantConditions = [],
    movementRemaining = 0,
    measurementStart,
    measurementCurrent,
    isPlayerView = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();
    const dashOffsetRef = useRef(0);
    const bgImageRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        if (mapState.backgroundImageUrl) {
            const img = new window.Image();
            img.onload = () => {
                bgImageRef.current = img;
            };
            img.src = mapState.backgroundImageUrl;
        } else {
            bgImageRef.current = null;
        }
    }, [mapState.backgroundImageUrl]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || width <= 0 || height <= 0) return;

        try {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Trace logging for debugging black screen in production-like environments
            if (width < 10 || height < 10) {
                console.warn('[BattleMapCanvas] Rendering with suspiciously small dimensions:', { width, height, cellSize: mapState.cellSizePx });
            }

            // Reset transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            // Clear main canvas
            ctx.fillStyle = mapState.backgroundColor || '#111827';
            ctx.fillRect(0, 0, width, height);

            const cellSize = Math.max(1, mapState.cellSizePx || 40);
            const gridWidth = mapState.gridWidth || 1;
            const gridHeight = mapState.gridHeight || 1;

            if (!Number.isFinite(cellSize) || !Number.isFinite(gridWidth) || !Number.isFinite(gridHeight)) return;
            if (cellSize <= 0 || gridWidth <= 0 || gridHeight <= 0) return;
            if (gridWidth > 1000 || gridHeight > 1000) return; // Basic safety limit

            // Draw Background Image
            if (bgImageRef.current && bgImageRef.current.complete) {
                const offset = mapState.backgroundOffset || { x: 0, y: 0 };
                const scaleX = mapState.backgroundScaleX || 1.0;
                const scaleY = mapState.backgroundScaleY || 1.0;

                // Image draws relative to grid dimensions to preserve saved map compatibility
                const imgWidth = (mapState.gridWidth * cellSize) * scaleX;
                const imgHeight = (mapState.gridHeight * cellSize) * scaleY;

                ctx.drawImage(
                    bgImageRef.current,
                    offset.x,
                    offset.y,
                    imgWidth,
                    imgHeight
                );
            }

            // --- GRID RENDERING ---
            ctx.strokeStyle = mapState.gridColor || 'rgba(75, 85, 99, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= gridWidth * cellSize; x += cellSize) {
                ctx.moveTo(x, 0); ctx.lineTo(x, gridHeight * cellSize);
            }
            for (let y = 0; y <= gridHeight * cellSize; y += cellSize) {
                ctx.moveTo(0, y); ctx.lineTo(gridWidth * cellSize, y);
            }
            ctx.stroke();

            // --- MOVEMENT RANGE ---
            if (reachableCells && reachableCells.length > 0) {
                ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
                reachableCells.forEach(cell => {
                    ctx.fillRect(cell.col * cellSize, cell.row * cellSize, cellSize, cellSize);
                });
                ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
                ctx.lineWidth = 1;
                reachableCells.forEach(cell => {
                    ctx.strokeRect(cell.col * cellSize, cell.row * cellSize, cellSize, cellSize);
                });
            }

            // --- VISION ZONES ---
            if (mapState.visionZones && mapState.visionZones.length > 0) {
                mapState.visionZones.forEach(zone => {
                    ctx.strokeStyle = zone.color || 'rgba(147, 51, 234, 0.5)'; // Default purple stroke
                    ctx.lineWidth = 2;
                    ctx.fillStyle = 'rgba(147, 51, 234, 0.15)'; // Very faint purple fill
                    ctx.setLineDash([8, 4]); // Dashed to indicate it's an immaterial zone

                    ctx.beginPath();
                    if (zone.type === 'rectangle' && zone.widthFt !== undefined && zone.heightFt !== undefined) {
                        const wPx = (zone.widthFt / 5) * cellSize;
                        const hPx = (zone.heightFt / 5) * cellSize;
                        ctx.rect(zone.position.col * cellSize, zone.position.row * cellSize, wPx, hPx);
                    } else if (zone.type === 'circle' && zone.radiusFt !== undefined) {
                        const cx = zone.position.col * cellSize + cellSize / 2;
                        const cy = zone.position.row * cellSize + cellSize / 2;
                        const rPx = (zone.radiusFt / 5) * cellSize;
                        ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
                    }
                    ctx.fill();
                    ctx.stroke();

                    // Label (optional, based on weather/light)
                    if (zone.lightLevel || zone.weatherEffect) {
                        const cx = zone.position.col * cellSize + (zone.type === 'circle' ? cellSize / 2 : 0);
                        const cy = zone.position.row * cellSize + (zone.type === 'circle' ? cellSize / 2 : 0);
                        
                        ctx.fillStyle = zone.color || 'rgba(147, 51, 234, 0.8)';
                        ctx.font = 'bold 10px Inter, sans-serif';
                        ctx.textAlign = 'left';
                        const label = [
                            zone.lightLevel && zone.lightLevel !== 'bright' ? zone.lightLevel.replace('-', ' ') : '',
                            zone.weatherEffect && zone.weatherEffect !== 'none' ? zone.weatherEffect : ''
                        ].filter(Boolean).join(' | ');

                        if (label) {
                            ctx.fillText(label.toUpperCase(), cx + 4, cy + 12);
                        }
                    }
                });
                ctx.setLineDash([]); // Reset dash
            }

            // --- SHAPES & TERRAIN ---
            const drawShape = (ctx: CanvasRenderingContext2D, shape: MapShape, offsetCellSize: number) => {
                ctx.strokeStyle = shape.style.stroke;
                ctx.lineWidth = shape.style.strokeWidth;
                ctx.fillStyle = shape.style.fill;
                ctx.setLineDash(shape.style.dashed ? [5, 5] : []);

                if (shape.type === 'rectangle' && shape.points.length >= 2) {
                    const x1 = shape.points[0].col * offsetCellSize;
                    const y1 = shape.points[0].row * offsetCellSize;
                    const x2 = shape.points[1].col * offsetCellSize;
                    const y2 = shape.points[1].row * offsetCellSize;
                    ctx.beginPath();
                    ctx.rect(x1, y1, x2 - x1, y2 - y1);
                    ctx.fill();
                    ctx.stroke();
                } else if (shape.type === 'circle' && shape.points.length >= 2) {
                    const x1 = shape.points[0].col * offsetCellSize + offsetCellSize / 2;
                    const y1 = shape.points[0].row * offsetCellSize + offsetCellSize / 2;
                    const x2 = shape.points[1].col * offsetCellSize + offsetCellSize / 2;
                    const y2 = shape.points[1].row * offsetCellSize + offsetCellSize / 2;
                    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    ctx.beginPath();
                    ctx.arc(x1, y1, radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                } else if (shape.type === 'line' && shape.points.length >= 2) {
                    ctx.beginPath();
                    ctx.moveTo(shape.points[0].col * offsetCellSize + offsetCellSize / 2, shape.points[0].row * offsetCellSize + offsetCellSize / 2);
                    ctx.lineTo(shape.points[1].col * offsetCellSize + offsetCellSize / 2, shape.points[1].row * offsetCellSize + offsetCellSize / 2);
                    ctx.stroke();
                }
            };

            (mapState.shapes || []).forEach(shape => drawShape(ctx, shape, cellSize));

            // --- FREEHAND ---
            ctx.setLineDash([]);
            (mapState.freehandPaths || []).forEach(path => {
                ctx.strokeStyle = path.color;
                ctx.lineWidth = path.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                if (path.points.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(path.points[0].x, path.points[0].y);
                    for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
                    ctx.stroke();
                }
            });
            ctx.stroke();

            // --- TOKEN AURAS ---
            (mapState.tokens || []).forEach(token => {
                if (token.auras && token.auras.length > 0) {
                    const centerX = token.position.col * cellSize + (token.size * cellSize) / 2;
                    const centerY = token.position.row * cellSize + (token.size * cellSize) / 2;

                    token.auras.forEach(aura => {
                        const radiusPx = (aura.radiusFt / 5) * cellSize;

                        // Draw fill
                        ctx.beginPath();
                        ctx.fillStyle = aura.color;
                        ctx.globalAlpha = aura.opacity * 0.3; // Fill is softer
                        ctx.arc(centerX, centerY, radiusPx, 0, Math.PI * 2);
                        ctx.fill();

                        // Draw ring
                        ctx.beginPath();
                        ctx.strokeStyle = aura.color;
                        ctx.lineWidth = 2;
                        ctx.globalAlpha = aura.opacity;
                        ctx.setLineDash([10, 5]); // Soft dashed ring for auras
                        ctx.arc(centerX, centerY, radiusPx, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.setLineDash([]);

                        // Add subtle glow
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = aura.color;
                        ctx.stroke();
                        ctx.shadowBlur = 0;

                        ctx.globalAlpha = 1.0;
                    });
                }
            });

            // --- FOG OF WAR & VISION RENDERING ---
            // Create an off-screen canvas for the fog mask
            const fogCanvas = document.createElement('canvas');
            fogCanvas.width = width;
            fogCanvas.height = height;
            const fogCtx = fogCanvas.getContext('2d');

            if (fogCtx) {
                // 1. Initial Fog State: Semi-Transparent for DM, Fully Opaque Black for Players
                fogCtx.fillStyle = isPlayerView ? 'rgba(0, 0, 0, 1.0)' : 'rgba(0, 0, 0, 0.4)';
                fogCtx.fillRect(0, 0, width, height);

                // 2. Clear Revealed Areas using destination-out
                fogCtx.globalCompositeOperation = 'destination-out';

                // 2a. Apply DM Manual Reveal Shapes (White) ALWAYS
                (mapState.fogOfWar || []).forEach(fow => {
                    if (fow.style.fill === 'white') {
                        fogCtx.fillStyle = 'rgba(255, 255, 255, 1.0)';
                        drawShape(fogCtx, fow, cellSize);
                    }
                });
                
                (mapState.fogOfWarFreehand || []).forEach(path => {
                    if (path.color === 'white') {
                        fogCtx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
                        fogCtx.lineWidth = path.width;
                        fogCtx.lineCap = 'round';
                        fogCtx.lineJoin = 'round';
                        if (path.points.length > 1) {
                            fogCtx.beginPath();
                            fogCtx.moveTo(path.points[0].x, path.points[0].y);
                            for (let i = 1; i < path.points.length; i++) fogCtx.lineTo(path.points[i].x, path.points[i].y);
                            fogCtx.stroke();
                        }
                    }
                });

                // 2b. Apply Dynamic token vision cutouts IF active
                if (mapState.visibleCells && isPlayerView && mapState.visibleCells.length > 0) {
                    fogCtx.fillStyle = 'rgba(255, 255, 255, 1.0)';
                    fogCtx.filter = 'blur(10px)'; // Optional: soft edge blur
                    mapState.visibleCells.forEach(cellKey => {
                        const [c, r] = cellKey.split(',').map(Number);
                        // Draw a slightly larger rect to overlap edges nicely with blur
                        fogCtx.fillRect(c * cellSize - 5, r * cellSize - 5, cellSize + 10, cellSize + 10);
                    });
                    fogCtx.filter = 'none';
                }

                // 3. Re-apply DM Manual Hide Shapes (Black) by switching back to source-over
                // This ensures DM hides OVERRIDE dynamically revealed areas or manual reveals!
                fogCtx.globalCompositeOperation = 'source-over';
                (mapState.fogOfWar || []).forEach(fow => {
                    if (fow.style.fill === 'black') {
                        fogCtx.fillStyle = isPlayerView ? 'rgba(0, 0, 0, 1.0)' : 'rgba(0, 0, 0, 0.8)';
                        const origStroke = fow.style.stroke;
                        // Avoid drawing strokes on the fog mask
                        fow.style.stroke = 'none';
                        drawShape(fogCtx, fow, cellSize);
                        fow.style.stroke = origStroke;
                    }
                });
                
                (mapState.fogOfWarFreehand || []).forEach(path => {
                    if (path.color === 'black') {
                        fogCtx.strokeStyle = isPlayerView ? 'rgba(0, 0, 0, 1.0)' : 'rgba(0, 0, 0, 0.8)';
                        fogCtx.lineWidth = path.width;
                        fogCtx.lineCap = 'round';
                        fogCtx.lineJoin = 'round';
                        if (path.points.length > 1) {
                            fogCtx.beginPath();
                            fogCtx.moveTo(path.points[0].x, path.points[0].y);
                            for (let i = 1; i < path.points.length; i++) fogCtx.lineTo(path.points[i].x, path.points[i].y);
                            fogCtx.stroke();
                        }
                    }
                });

                // 4. Draw the fog overlay onto the main canvas
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(fogCanvas, 0, 0);
            }

            // --- PREVIEWS ---
            if (previewShape) {
                ctx.strokeStyle = previewShape.style.stroke;
                ctx.lineWidth = previewShape.style.strokeWidth;
                ctx.setLineDash([5, 5]);
                drawShape(ctx, previewShape, cellSize);
            }

            if (previewFreehandPath && previewFreehandPath.points.length > 1) {
                ctx.setLineDash([]);
                ctx.strokeStyle = previewFreehandPath.color;
                ctx.lineWidth = previewFreehandPath.width;
                ctx.beginPath();
                ctx.moveTo(previewFreehandPath.points[0].x, previewFreehandPath.points[0].y);
                for (let i = 1; i < previewFreehandPath.points.length; i++) ctx.lineTo(previewFreehandPath.points[i].x, previewFreehandPath.points[i].y);
                ctx.stroke();
            }

            // --- TARGETING OVERLAY ---
            if (targetingOverlay) {
                const { originPosition, targetPosition, rangeFt, radiusFt, type, affectedCells } = targetingOverlay;
                if (rangeFt > 0) {
                    ctx.beginPath(); ctx.setLineDash([5, 5]);
                    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)'; ctx.lineWidth = 1;
                    const originX = originPosition.col * cellSize + cellSize / 2;
                    const originY = originPosition.row * cellSize + cellSize / 2;
                    const rangePx = (rangeFt / 5) * cellSize;
                    ctx.arc(originX, originY, rangePx, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
                }
                ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
                affectedCells.forEach(cell => ctx.fillRect(cell.col * cellSize, cell.row * cellSize, cellSize, cellSize));

                if (targetPosition) {
                    const targetX = (targetPosition?.col || 0) * cellSize + cellSize / 2;
                    const targetY = (targetPosition?.row || 0) * cellSize + cellSize / 2;
                    const originX = (originPosition?.col || 0) * cellSize + cellSize / 2;
                    const originY = (originPosition?.row || 0) * cellSize + cellSize / 2;
                    const radiusPx = ((radiusFt || 0) / 5) * cellSize;

                    if (isNaN(targetX) || isNaN(targetY) || isNaN(originX) || isNaN(originY) || isNaN(radiusPx)) return;

                    const damageType = (targetingOverlay.damageType || hoveredAction?.damageType || "").toLowerCase();
                    const colors = AOE_COLOR_MAP[damageType] || AOE_COLOR_MAP.default;

                    ctx.setLineDash([]); ctx.strokeStyle = colors.stroke; ctx.lineWidth = 2; ctx.fillStyle = colors.fill;
                    ctx.shadowBlur = 15; ctx.shadowColor = colors.glow;

                    if (type === 'circle') {
                        const centerX = rangeFt === 0 ? originX : targetX;
                        const centerY = rangeFt === 0 ? originY : targetY;
                        ctx.beginPath(); ctx.arc(centerX, centerY, radiusPx, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    } else if (type === 'cone') {
                        const lengthPx = radiusFt / 5 * cellSize;
                        const angle = Math.atan2(targetY - originY, targetX - originX);
                        const halfAngle = Math.atan(0.5);
                        ctx.beginPath(); ctx.moveTo(originX, originY);
                        ctx.arc(originX, originY, lengthPx, angle - halfAngle, angle + halfAngle);
                        ctx.closePath(); ctx.fill(); ctx.stroke();
                    } else if (type === 'line') {
                        const lengthPx = radiusFt / 5 * cellSize;
                        const angle = Math.atan2(targetY - originY, targetX - originX);
                        const endX = originX + Math.cos(angle) * lengthPx;
                        const endY = originY + Math.sin(angle) * lengthPx;
                        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(endX, endY);
                        ctx.lineWidth = cellSize; ctx.lineCap = 'round'; ctx.stroke();
                        ctx.lineCap = 'butt'; ctx.lineWidth = 2;
                    } else if (type === 'cube') {
                        ctx.beginPath();
                        if (rangeFt === 0) {
                            const angle = Math.atan2(targetY - originY, targetX - originX);
                            let cubeX = originX, cubeY = originY;
                            if (angle > -Math.PI / 4 && angle <= Math.PI / 4) { cubeX = originX; cubeY = originY - radiusPx / 2; }
                            else if (angle > Math.PI / 4 && angle <= 3 * Math.PI / 4) { cubeX = originX - radiusPx / 2; cubeY = originY; }
                            else if (angle > -3 * Math.PI / 4 && angle <= -Math.PI / 4) { cubeX = originX - radiusPx / 2; cubeY = originY - radiusPx; }
                            else { cubeX = originX - radiusPx; cubeY = originY - radiusPx / 2; }
                            ctx.rect(cubeX, cubeY, radiusPx, radiusPx);
                        } else {
                            ctx.rect(targetX - radiusPx / 2, targetY - radiusPx / 2, radiusPx, radiusPx);
                        }
                        ctx.fill(); ctx.stroke();
                    }
                    ctx.shadowBlur = 0;
                }
            }

            // --- ACTION HOVER RANGE ---
            if (hoveredAction && !targetingOverlay && activeCombatantPos) {
                const rangeStr = (hoveredAction.range || "").toLowerCase();
                const reachFt = hoveredAction.reach || 0;
                const info = parseActionRange(hoveredAction);
                let normalRangeFt = info.rangeFt;
                let longRangeFt = 0;

                if (rangeStr.includes('/')) {
                    const parts = rangeStr.match(/(\d+)\s*\/\s*(\d+)/);
                    if (parts) { normalRangeFt = parseInt(parts[1], 10); longRangeFt = parseInt(parts[2], 10); }
                }

                if (!activeCombatantPos) return;

                const originX = (activeCombatantPos.col || 0) * cellSize + cellSize / 2;
                const originY = (activeCombatantPos.row || 0) * cellSize + cellSize / 2;

                const drawRangeCircle = (ft: number, color: string, isDashed: boolean, opacity: number, label?: string) => {
                    const rangePx = (ft / 5) * cellSize;
                    ctx.beginPath();
                    if (isDashed) ctx.setLineDash([8, 4]); else ctx.setLineDash([]);
                    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = opacity;
                    ctx.arc(originX, originY, rangePx, 0, Math.PI * 2);
                    ctx.stroke();
                    if (ft === normalRangeFt || ft === reachFt) {
                        ctx.shadowBlur = 10; ctx.shadowColor = color; ctx.stroke(); ctx.shadowBlur = 0;
                    }
                    if (label && ft > 0) {
                        ctx.globalAlpha = 0.7; ctx.fillStyle = color; ctx.font = 'bold 10px Inter, sans-serif';
                        ctx.fillText(`${label} (${ft}ft)`, originX + 5, originY - rangePx - 5);
                    }
                };

                if (longRangeFt > 0) drawRangeCircle(longRangeFt, 'rgba(255, 69, 0, 0.6)', true, 0.6, 'Long');
                if (normalRangeFt > 0) drawRangeCircle(normalRangeFt, reachFt > 0 ? 'rgba(255, 215, 0, 0.6)' : 'rgba(255, 215, 0, 0.9)', true, 0.9, reachFt > 0 ? 'Thrown' : 'Range');
                if (reachFt > 0) drawRangeCircle(reachFt, 'rgba(0, 191, 255, 0.9)', false, 0.9, 'Reach');
                ctx.globalAlpha = 1.0; ctx.setLineDash([]);
            }

            // --- MANUAL MEASUREMENT (Shift+Drag) ---
            if (measurementStart && measurementCurrent) {
                const sPos = measurementStart, cPos = measurementCurrent;
                const startX = sPos.col * cellSize + cellSize / 2, startY = sPos.row * cellSize + cellSize / 2;
                const endX = cPos.col * cellSize + cellSize / 2, endY = cPos.row * cellSize + cellSize / 2;
                const distFt = Math.max(Math.abs(cPos.col - sPos.col), Math.abs(cPos.row - sPos.row)) * 5;

                ctx.save(); ctx.beginPath(); ctx.setLineDash([10, 5]);
                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
                ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
                ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();

                // Draw end circle
                ctx.beginPath(); ctx.setLineDash([]); ctx.arc(endX, endY, 4, 0, Math.PI * 2); ctx.fillStyle = '#fbbf24'; ctx.fill();

                // Distance text
                ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 14px Inter, sans-serif'; ctx.textAlign = 'center';
                ctx.strokeStyle = 'black'; ctx.lineWidth = 4; ctx.strokeText(`${distFt} ft`, endX, endY - 20);
                ctx.fillText(`${distFt} ft`, endX, endY - 20); ctx.restore();
            }

            // --- MOVEMENT PATH ---
            if (hoveredGridPos && activeCombatantPos && !targetingOverlay && !measurementStart) {
                const hPos = hoveredGridPos, aPos = activeCombatantPos;
                if (hPos.col !== aPos.col || hPos.row !== aPos.row) {
                    const startX = aPos.col * cellSize + cellSize / 2, startY = aPos.row * cellSize + cellSize / 2;
                    const endX = hPos.col * cellSize + cellSize / 2, endY = hPos.row * cellSize + cellSize / 2;
                    const distFt = Math.max(Math.abs(hPos.col - aPos.col), Math.abs(hPos.row - aPos.row)) * 5;
                    const hasZeroSpeed = activeCombatantConditions.some(c => ['Grappled', 'Restrained', 'Paralyzed', 'Petrified', 'Stunned', 'Unconscious'].includes(c));
                    const isValid = distFt <= movementRemaining && !hasZeroSpeed;

                    ctx.save(); ctx.beginPath(); ctx.setLineDash([8, 4]); ctx.lineDashOffset = -dashOffsetRef.current;
                    ctx.strokeStyle = isValid ? 'rgba(255, 255, 255, 0.6)' : 'rgba(239, 68, 68, 0.8)';
                    ctx.lineWidth = 2; ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
                    ctx.fillStyle = isValid ? 'white' : '#ef4444'; ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center';
                    ctx.strokeStyle = 'black'; ctx.lineWidth = 3; ctx.strokeText(`${distFt} ft`, endX, endY - 15);
                    ctx.fillText(`${distFt} ft`, endX, endY - 15); ctx.restore();
                }
            }
        } catch (err) {
            console.error('[BattleMapCanvas] Critical error during render cycle:', err);
        }
    }, [mapState, width, height, previewShape, previewFreehandPath, reachableCells, targetingOverlay, hoveredAction, activeCombatantPos, hoveredGridPos, measurementStart, measurementCurrent, activeCombatantConditions, movementRemaining, isPlayerView]);

    useEffect(() => {
        const animate = () => {
            dashOffsetRef.current = (dashOffsetRef.current + 0.3) % 20;
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animationFrameRef.current = requestAnimationFrame(animate);
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, []);

    if (width <= 0 || height <= 0) return null;

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={`shadow-2xl rounded-lg border border-gray-700 ${className}`}
            style={{ imageRendering: 'pixelated' }}
        />
    );
};
