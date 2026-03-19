import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAltKey } from '../../hooks/useAltKey';

interface Props {
    content: ReactNode;
    children: ReactNode;
    className?: string;
    disabled?: boolean;
}

/**
 * A lightweight hover tooltip that supports Alt-key persistence for scrolling.
 * Unlike InfoTooltip, this accepts pre-rendered content rather than fetching from 5e.tools.
 * Use this for inline tooltips on HeroCards, skills, items, spells, etc.
 */
export function HoverTooltip({ content, children, className = '', disabled = false }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const isHoveredRef = useRef(false);
    const altPressed = useAltKey();

    const handleMouseEnter = () => {
        if (disabled) return;
        isHoveredRef.current = true;
        if (triggerRef.current) {
            setTriggerRect(triggerRef.current.getBoundingClientRect());
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsOpen(true), 250);
    };

    const handleMouseLeave = () => {
        isHoveredRef.current = false;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (altPressed) return;
        setIsOpen(false);
    };

    // Close when Alt is released IF not hovering
    useEffect(() => {
        if (!altPressed && !isHoveredRef.current) {
            setIsOpen(false);
        }
    }, [altPressed]);

    // Update position on scroll/resize
    useEffect(() => {
        if (!isOpen) return;
        const updatePosition = () => {
            if (triggerRef.current) {
                setTriggerRect(triggerRef.current.getBoundingClientRect());
            }
        };
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    let tooltipStyle: React.CSSProperties = {};
    if (triggerRect) {
        let left = triggerRect.left + triggerRect.width / 2;
        let top = triggerRect.top - 8;
        const ttW = 320;

        if (left - ttW / 2 < 10) left = ttW / 2 + 10;
        else if (left + ttW / 2 > window.innerWidth - 10) left = window.innerWidth - ttW / 2 - 10;

        // If tooltip would go above viewport, show below instead
        if (top < 200) {
            top = triggerRect.bottom + 8;
            tooltipStyle = { left: `${left}px`, top: `${top}px`, transform: 'translateX(-50%)' };
        } else {
            tooltipStyle = { left: `${left}px`, top: `${top}px`, transform: 'translate(-50%, -100%)' };
        }
    }

    return (
        <div
            ref={triggerRef}
            className={`inline-flex ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {isOpen && content && createPortal(
                <div
                    style={tooltipStyle}
                    className={`fixed z-[99999] w-80 bg-stone-900 border rounded-lg shadow-2xl p-3 text-xs animate-in fade-in duration-150
                        ${altPressed ? 'pointer-events-auto shadow-gold/10 border-gold/30' : 'pointer-events-none border-stone-600'}
                    `}
                    onMouseEnter={() => { isHoveredRef.current = true; }}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                        {content}
                    </div>
                    <div className={`mt-2 text-[8px] uppercase tracking-wider text-center pt-1 border-t border-stone-800 transition-colors ${altPressed ? 'text-gold' : 'text-stone-600'}`}>
                        Hold [ALT] to interact & scroll
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
