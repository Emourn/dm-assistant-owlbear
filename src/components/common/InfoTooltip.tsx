import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { lookupByName } from '../../engine/fiveEToolsParser';
import { useAltKey } from '../../hooks/useAltKey';

// Simple markdown-style parser for bold and lists
function renderMarkdownText(text: string): ReactNode[] {
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
        // Handle list items
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const content = line.trim().substring(2);
            return (
                <div key={lineIndex} className="flex gap-2 mt-1">
                    <span className="text-gold">•</span>
                    <span>{renderInlineMarkdown(content)}</span>
                </div>
            );
        }

        // Render normal line with a break
        return (
            <span key={lineIndex}>
                {renderInlineMarkdown(line)}
                {lineIndex < lines.length - 1 && <br />}
            </span>
        );
    });
}

function renderInlineMarkdown(text: string): ReactNode[] {
    // Split by **text** and *text* or _text_ for bold/italic parsing
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_)/g);

    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold text-parchment">{part.slice(2, -2)}</strong>;
        }
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
            return <em key={index} className="italic text-stone-300">{part.slice(1, -1)}</em>;
        }
        return <span key={index}>{part}</span>;
    });
}

export function getSourceBadgeColor(source: string) {
    if (!source) return 'bg-stone-800 text-stone-500 border-stone-700';
    const s = source.toLowerCase();
    if (s.includes('phb') || s.includes('core')) return 'bg-red-900/30 text-red-400 border-red-800/50';
    if (s.includes('tce') || s.includes('tasha')) return 'bg-blue-900/30 text-blue-400 border-blue-800/50';
    if (s.includes('xge') || s.includes('xanathar')) return 'bg-purple-900/30 text-purple-400 border-purple-800/50';
    if (s.includes('mm') || s.includes('monster')) return 'bg-orange-900/30 text-orange-400 border-orange-800/50';
    if (s.includes('hb') || s.includes('homebrew') || s.includes('wiki')) return 'bg-teal-900/30 text-teal-400 border-teal-800/50';
    if (s.includes('dmg')) return 'bg-indigo-900/30 text-indigo-400 border-indigo-800/50';
    return 'bg-stone-800 text-stone-400 border-stone-700';
}

interface Props {
    query: string;
    label?: string; // Optional label to display alongside the icon
}

export function InfoTooltip({ query, label }: Props) {
    const [info, setInfo] = useState<{ name: string, description: string, source?: string } | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

    const altPressed = useAltKey();
    const isHoveredRef = useRef(false);

    const fetchInfo = async () => {
        if (hasFetched || loading) return;
        setLoading(true);
        try {
            const result = await lookupByName(query);
            if (result) setInfo(result);
        } catch (e) {
            console.error("Failed to fetch tooltip info", e);
        } finally {
            setLoading(false);
            setHasFetched(true);
        }
    };

    const handleMouseEnter = () => {
        isHoveredRef.current = true;
        if (triggerRef.current) {
            setTriggerRect(triggerRef.current.getBoundingClientRect());
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsOpen(true);
            fetchInfo();
        }, 300); // 300ms hover delay so we don't spam popups on quick mouse passes
    };

    const handleMouseLeave = () => {
        isHoveredRef.current = false;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Return if they are holding alt, effectively ignoring the leave event.
        if (altPressed) return;
        setIsOpen(false);
    };

    // Close when Alt is released IF we are no longer hovering
    useEffect(() => {
        if (!altPressed && !isHoveredRef.current) {
            setIsOpen(false);
        }
    }, [altPressed]);

    // Update position on scroll/resize if open
    useEffect(() => {
        if (!isOpen) return;
        const updatePosition = () => {
            if (triggerRef.current) {
                setTriggerRect(triggerRef.current.getBoundingClientRect());
            }
        };
        window.addEventListener('scroll', updatePosition, true); // true for capture phase to catch all scrolls
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    let tooltipStyle = {};
    if (triggerRect) {
        let left = triggerRect.left + triggerRect.width / 2;
        const top = triggerRect.top - 10;

        // Boundaries
        const maxW = window.innerWidth;
        const ttW = window.innerWidth < 768 ? 288 : 384; // 72 or 96 tailwind w

        if (left - ttW / 2 < 10) {
            left = ttW / 2 + 10;
        } else if (left + ttW / 2 > maxW - 10) {
            left = maxW - ttW / 2 - 10;
        }

        tooltipStyle = { left: `${left}px`, top: `${top}px`, transform: `translate(-50%, -100%)` };
    }

    return (
        <div ref={triggerRef} className="relative inline-flex items-center gap-1.5" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {label && <span>{label}</span>}
            <Info size={14} className="text-stone-500 hover:text-gold cursor-help transition-colors shrink-0" />

            {isOpen && createPortal(
                <div
                    ref={tooltipRef}
                    style={tooltipStyle}
                    className={`fixed z-[99999] w-72 md:w-96 bg-stone-900 border rounded shadow-2xl p-3 text-sm animate-in fade-in duration-200 
                        ${altPressed ? 'pointer-events-auto shadow-gold/10' : 'pointer-events-none'}
                        ${(info?.description?.length || 0) > 300 ? 'border-arcane shadow-[0_0_15px_rgba(79,70,229,0.15)] shadow-arcane/20' : 'border-stone-600'}
                    `}
                    onMouseEnter={() => { isHoveredRef.current = true; }}
                    onMouseLeave={handleMouseLeave}
                >
                    {loading ? (
                        <div className="animate-pulse flex space-x-4">
                            <div className="flex-1 space-y-4 py-1">
                                <div className="h-4 bg-stone-700 rounded w-3/4"></div>
                                <div className="space-y-2">
                                    <div className="h-3 bg-stone-800 rounded"></div>
                                    <div className="h-3 bg-stone-800 rounded w-5/6"></div>
                                </div>
                            </div>
                        </div>
                    ) : info ? (
                        <div className="space-y-2">
                            <div className="font-bold text-gold border-b border-stone-700 pb-1 flex justify-between items-center">
                                <span>{info.name}</span>
                                {info.source && <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded border ${getSourceBadgeColor(info.source)}`}>{info.source}</span>}
                            </div>
                            <div className="text-stone-300 max-h-[300px] overflow-y-auto custom-scrollbar text-[11px] leading-relaxed pr-1">
                                {renderMarkdownText(info.description)}
                            </div>
                        </div>
                    ) : (
                        <div className="text-stone-500 italic text-xs text-center py-2">No data available.</div>
                    )}
                    <div className={`mt-2 text-[9px] uppercase tracking-wider text-center pt-1 border-t border-stone-800 transition-colors ${altPressed ? 'text-gold' : 'text-stone-600'}`}>
                        Hold [ALT] to interact & scroll
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
