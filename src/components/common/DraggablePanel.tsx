import React, { useState, useEffect } from 'react';
import { Move } from 'lucide-react';
import { useDraggable } from '../../hooks/useDraggable';

interface DraggablePanelProps {
    children: React.ReactNode;
    className?: string;
    zIndex?: number;
    label?: string;
}

/**
 * Alt+drag wrapper for any floating panel.
 * Allows users to reposition UI elements by holding Alt and dragging with left-click.
 */
export function DraggablePanel({
    children,
    className = '',
    zIndex = 20,
    label = ''
}: DraggablePanelProps) {
    const { dragStyle, dragProps, isDragging } = useDraggable();
    const [altHeld, setAltHeld] = useState(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltHeld(true); };
        const up = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltHeld(false); };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, []);

    return (
        <div
            className={`pointer-events-auto ${className}`}
            style={{ ...dragStyle, zIndex }}
            {...dragProps}
        >
            {/* Alt-drag indicator */}
            {altHeld && !isDragging && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gold/90 text-stone-950 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5 pointer-events-none animate-in fade-in duration-150 whitespace-nowrap z-50">
                    <Move size={8} /> drag {label}
                </div>
            )}
            {children}
        </div>
    );
}
