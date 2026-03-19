import { Action, ActionType } from '../../types/actions';
import { Sword, Zap, ShieldAlert, FastForward, ShieldOff, EyeOff, ShieldCheck, Clock, Sparkles, Handshake, Shield, Flame, Swords, HeartPulse, HeartCrack, Crosshair, HelpCircle } from 'lucide-react';
import { Character } from '../../types/character';
import { InfoTooltip } from '../common/InfoTooltip';
import { RulesTooltip } from '../common/RulesTooltip';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAltKey } from '../../hooks/useAltKey';

interface ActionButtonProps {
    action: Action;
    character: Character;
    disabled?: boolean;
    reason?: string;
    onClick: (action: Action) => void;
}

const getIcon = (iconName?: string) => {
    switch (iconName) {
        case 'sword': return <Sword size={16} />;
        case 'swords': return <Swords size={16} />;
        case 'zap': return <Zap size={16} />;
        case 'shield-alert': return <ShieldAlert size={16} />;
        case 'fast-forward': return <FastForward size={16} />;
        case 'shield-off': return <ShieldOff size={16} />;
        case 'eye-off': return <EyeOff size={16} />;
        case 'shield-check': return <ShieldCheck size={16} />;
        case 'clock': return <Clock size={16} />;
        case 'sparkles': return <Sparkles size={16} />;
        case 'handshake': return <Handshake size={16} />;
        case 'shield': return <Shield size={16} />;
        case 'flame': return <Flame size={16} />;
        case 'heart-crack': return <HeartCrack size={16} />;
        case 'heart': return <HeartPulse size={16} />;
        case 'crosshair': return <Crosshair size={16} />;
        default: return <HelpCircle size={16} />;
    }
};

const getTypeColors = (type: ActionType) => {
    switch (type) {
        case 'action':
            return 'border-blood text-blood bg-blood/10 hover:bg-blood/20';
        case 'bonus':
            return 'border-gold text-gold bg-gold/10 hover:bg-gold/20';
        case 'reaction':
            return 'border-arcane text-arcane bg-arcane/10 hover:bg-arcane/20';
        case 'free':
            return 'border-parchment text-parchment bg-parchment/10 hover:bg-parchment/20';
        case 'movement':
            return 'border-stone-400 text-stone-300 bg-stone-700/50 hover:bg-stone-600/50';
        default:
            return 'border-stone-600 text-stone-400 bg-stone-800 hover:bg-stone-700';
    }
};

export function ActionButton({ action, onClick, disabled, reason }: ActionButtonProps) {
    const colors = getTypeColors(action.type);
    const [isHovered, setIsHovered] = useState(false);
    const isHoveredRef = useRef(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

    const altPressed = useAltKey();

    const handleMouseEnter = () => {
        isHoveredRef.current = true;
        if (triggerRef.current) {
            setTriggerRect(triggerRef.current.getBoundingClientRect());
        }
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        isHoveredRef.current = false;
        if (altPressed) return;
        setIsHovered(false);
    };

    // Close when Alt is released IF we are no longer hovering
    useEffect(() => {
        if (!altPressed && !isHoveredRef.current) {
            setIsHovered(false);
        }
    }, [altPressed]);

    useEffect(() => {
        if (!isHovered) return;
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
    }, [isHovered]);

    let tooltipStyle = {};
    if (triggerRect) {
        let left = triggerRect.left + triggerRect.width / 2;
        let top = triggerRect.top - 8;

        const maxW = window.innerWidth;
        const ttW = 256; // 64 spaces = 256px

        let transformY = "translate(-50%, -100%)";

        // Flip to bottom if we are near the top of the screen (less than 200px from top)
        if (triggerRect.top < 200) {
            top = triggerRect.bottom + 8;
            transformY = "translate(-50%, 0%)";
        }

        // Horizontal boundaries
        if (left - ttW / 2 < 10) left = ttW / 2 + 10;
        else if (left + ttW / 2 > maxW - 10) left = maxW - ttW / 2 - 10;

        tooltipStyle = { left: `${left}px`, top: `${top}px`, transform: transformY };
    }

    return (
        <div
            ref={triggerRef}
            className="relative group"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={() => !disabled && onClick(action)}
                disabled={disabled}
                className={`
                    w-full flex items-center justify-start gap-3 px-3 py-2 rounded-md border 
                    transition-all text-sm font-medium
                    ${disabled ? 'opacity-50 cursor-not-allowed border-stone-700 bg-stone-800/50 text-stone-500 grayscale' : colors}
                `}
            >
                <div className="flex-shrink-0">
                    {getIcon(action.icon)}
                </div>
                <div className="flex flex-col items-start truncate overflow-hidden pr-6">
                    <span className="truncate w-full text-left">{action.name}</span>
                    <RulesTooltip term={action.type}>
                        <span className="text-[10px] uppercase opacity-70 tracking-wider font-sans cursor-help">{action.type}</span>
                    </RulesTooltip>
                </div>
            </button>

            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <InfoTooltip query={action.name} />
            </div>

            {/* Portal Tooltip */}
            {isHovered && createPortal(
                <div
                    style={tooltipStyle}
                    className={`fixed z-[99999] w-64 p-3 bg-stone-900 border border-stone-700 rounded-lg shadow-xl shadow-black/80 animate-in fade-in duration-100 text-sm ${altPressed ? 'pointer-events-auto border-gold/50 shadow-gold/10' : 'pointer-events-none'}`}
                    onMouseEnter={() => { isHoveredRef.current = true; }}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="font-bold text-parchment mb-1 border-b border-stone-700/50 pb-1 flex justify-between items-center">
                        <span>{action.name}</span>
                        <span className="text-xs font-normal opacity-70">{action.source}</span>
                    </div>
                    <div className="text-stone-300 text-xs mb-2 leading-relaxed max-h-[250px] overflow-y-auto custom-scrollbar">
                        {action.description}
                    </div>
                    {action.costs && action.costs.length > 0 && (
                        <div className="flex gap-2 flex-wrap mb-1">
                            {action.costs.map((c, i) => (
                                <span key={i} className="text-[10px] bg-stone-800 text-gold px-1.5 py-0.5 rounded border border-stone-700">Cost: {c.amount} {c.resource}</span>
                            ))}
                        </div>
                    )}
                    {disabled && reason && (
                        <div className="mt-2 text-xs text-blood font-semibold bg-blood/10 p-1.5 rounded border border-blood/20">
                            {reason}
                        </div>
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
