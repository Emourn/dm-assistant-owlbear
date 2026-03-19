import React, { useState, useRef, useEffect } from 'react';
import { getTooltip, TooltipData } from '../../engine/tooltipEngine';
import { Book, Info } from 'lucide-react';

interface RulesTooltipProps {
    term: string;
    children: React.ReactNode;
    className?: string;
    showIcon?: boolean;
}

/**
 * A deluxe rules tooltip component that provides D&D 2024 PHB context
 * for any given game term.
 */
export const RulesTooltip: React.FC<RulesTooltipProps> = ({
    term,
    children,
    className = "",
    showIcon = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<TooltipData | null>(null);
    const triggerRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (term) {
            setData(getTooltip(term));
        }
    }, [term]);

    useEffect(() => {
        if (isOpen && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();

            let top = triggerRect.bottom + window.scrollY + 8;
            let left = triggerRect.left + window.scrollX;

            // Flip if going off bottom of screen
            if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
                top = triggerRect.top + window.scrollY - tooltipRect.height - 8;
            }

            // Adjust if going off right of screen
            if (left + tooltipRect.width > window.innerWidth + window.scrollX - 20) {
                left = window.innerWidth + window.scrollX - tooltipRect.width - 20;
            }

            setPosition({ top, left });
        }
    }, [isOpen]);

    if (!data) return <span className={className}>{children}</span>;

    return (
        <span
            ref={triggerRef}
            className={`relative inline-flex items-center gap-1 group cursor-help transition-all duration-200 ${className}`}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            onTouchStart={() => setIsOpen(!isOpen)}
        >
            <span className="border-b border-dotted border-gold/40 group-hover:border-gold animate-in fade-in">
                {children}
            </span>

            {showIcon && (
                <Info size={12} className="text-gold/60 group-hover:text-gold" />
            )}

            {/* Tooltip Content - Client-side Portal behavior approximated with fixed position */}
            {isOpen && (
                <div
                    ref={tooltipRef}
                    style={{
                        position: 'fixed',
                        top: position.top - window.scrollY,
                        left: position.left - window.scrollX,
                        zIndex: 9999
                    }}
                    className="w-64 glass-panel p-4 rounded-lg shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200 pointer-events-none"
                >
                    <div className="flex justify-between items-start mb-2 border-b border-gold/20 pb-1">
                        <h4 className="text-gold font-cinzel text-sm uppercase tracking-wider">{data.term}</h4>
                        <div className="flex items-center gap-1 text-[10px] bg-gold/10 text-gold-light px-1.5 py-0.5 rounded border border-gold/20">
                            <Book size={10} />
                            <span>{data.ruleRef}</span>
                        </div>
                    </div>

                    <p className="text-xs text-parchment leading-relaxed mb-2">
                        {data.definition}
                    </p>

                    {data.details && (
                        <div className="text-[10px] text-parchment-muted italic bg-black/30 p-2 rounded border border-white/5">
                            {data.details}
                        </div>
                    )}

                    {data.category && (
                        <div className="mt-2 text-[9px] uppercase tracking-widest text-gold/40 text-right">
                            {data.category}
                        </div>
                    )}
                </div>
            )}
        </span>
    );
};
