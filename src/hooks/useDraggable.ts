import { useState, useRef, useCallback, useEffect } from 'react';

interface DraggablePosition {
    x: number;
    y: number;
}

interface UseDraggableOptions {
    /** Initial position (defaults to 0,0 — use CSS for initial placement) */
    initialPosition?: DraggablePosition;
    /** Whether Alt key must be held to drag (default: true) */
    requireAlt?: boolean;
}

interface UseDraggableReturn {
    /** Ref to attach to the draggable element */
    dragRef: React.RefObject<HTMLDivElement | null>;
    /** Current offset from original position */
    offset: DraggablePosition;
    /** Whether currently being dragged */
    isDragging: boolean;
    /** Reset position to original */
    resetPosition: () => void;
    /** Style object to apply (transform + cursor) */
    dragStyle: React.CSSProperties;
    /** Props to spread onto the container div */
    dragProps: {
        onMouseDown: (e: React.MouseEvent) => void;
    };
}

/**
 * Hook to make any panel draggable via Alt+drag.
 * Returns a ref, offset, and event handlers.
 */
export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
    const { initialPosition = { x: 0, y: 0 }, requireAlt = true } = options;

    const [offset, setOffset] = useState<DraggablePosition>(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<HTMLDivElement | null>(null);
    const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (requireAlt && !e.altKey) return;
        if (e.button !== 0) return; // Left click only

        e.preventDefault();
        e.stopPropagation();

        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            startX: offset.x,
            startY: offset.y
        };
        setIsDragging(true);
    }, [requireAlt, offset]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStartRef.current) return;

            const dx = e.clientX - dragStartRef.current.mouseX;
            const dy = e.clientY - dragStartRef.current.mouseY;

            setOffset({
                x: dragStartRef.current.startX + dx,
                y: dragStartRef.current.startY + dy
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragStartRef.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const resetPosition = useCallback(() => {
        setOffset(initialPosition);
    }, [initialPosition]);

    const dragStyle: React.CSSProperties = {
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        cursor: isDragging ? 'grabbing' : undefined,
        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        userSelect: isDragging ? 'none' : undefined
    };

    return {
        dragRef,
        offset,
        isDragging,
        resetPosition,
        dragStyle,
        dragProps: {
            onMouseDown: handleMouseDown
        }
    };
}
