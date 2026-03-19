import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Info, BookOpen } from 'lucide-react';

interface MetricTooltipProps {
    title: string;
    description: string;
    coaching: string;
    math?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
    title,
    description,
    coaching,
    math,
    icon = <HelpCircle size={14} />,
    children
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

    const handleMouseEnter = () => {
        if (triggerRef.current) {
            setTriggerRect(triggerRef.current.getBoundingClientRect());
            setIsOpen(true);
        }
    };

    const handleMouseLeave = () => {
        setIsOpen(false);
    };

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
        const top = triggerRect.top - 10;

        // Boundaries
        const maxW = window.innerWidth;
        const ttW = 288; // w-72 matches 72*4

        if (left - ttW / 2 < 10) {
            left = ttW / 2 + 10;
        } else if (left + ttW / 2 > maxW - 10) {
            left = maxW - ttW / 2 - 10;
        }

        tooltipStyle = { left: `${left}px`, top: `${top}px`, transform: `translate(-50%, -100%)` };
    }

    return (
        <div
            ref={triggerRef}
            className="inline-flex items-center gap-1.5 cursor-help"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}

            {isOpen && createPortal(
                <div
                    style={tooltipStyle}
                    className="fixed z-[99999] pointer-events-none"
                >
                    <div className="bg-stone-900 border border-stone-700 rounded-lg shadow-2xl overflow-hidden w-72 animate-in fade-in zoom-in duration-150">
                        <div className="bg-stone-950 p-3 border-b border-stone-800 flex items-center gap-2">
                            <span className="text-gold">{icon}</span>
                            <h4 className="text-[10px] font-black uppercase text-parchment tracking-widest">{title}</h4>
                        </div>

                        <div className="p-4 space-y-4 text-left whitespace-normal">
                            <div className="space-y-1">
                                <h5 className="text-[8px] text-stone-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                    <Info size={10} /> How it Works
                                </h5>
                                <p className="text-[11px] text-parchment leading-relaxed line-clamp-none whitespace-normal break-words">
                                    {description}
                                </p>
                            </div>

                            {math && (
                                <div className="p-2.5 rounded bg-stone-950/50 border border-stone-800/50 space-y-1">
                                    <h5 className="text-[8px] text-cyan-400 font-black uppercase tracking-widest">The Maths</h5>
                                    <p className="text-[10px] font-mono text-cyan-200/70 leading-relaxed whitespace-normal break-words">
                                        {math}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <h5 className="text-[8px] text-gold font-black uppercase tracking-widest flex items-center gap-1.5">
                                    <BookOpen size={10} /> DM Coaching
                                </h5>
                                <p className="text-[11px] text-parchment font-bold leading-relaxed border-l-2 border-gold/30 pl-2 whitespace-normal break-words">
                                    {coaching}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
