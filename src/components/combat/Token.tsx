import { useState, useEffect, useRef } from 'react';
import { MapToken } from '../../types/battleMap';
import conditionsData from '../../data/dnd5e/conditions.json';

interface TokenProps {
    token: MapToken;
    combatant?: import('../../types/combat').Combatant;
    cellSize: number;
    isActive?: boolean;
    isAffected?: boolean;
    onClick?: () => void;
    onMouseDown?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
    movementRemaining?: number;
    movementMax?: number;
    className?: string;
    style?: React.CSSProperties;
    isDragging?: boolean;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onConditionHover?: (name: string, e: React.MouseEvent) => void;
    onConditionLeave?: () => void;
}

export const Token: React.FC<TokenProps> = ({
    token,
    combatant,
    cellSize,
    isActive = false,
    isAffected = false,
    onClick,
    onMouseDown,
    onPointerDown,
    movementRemaining,
    movementMax,
    className = "",
    style = {},
    isDragging = false,
    onMouseEnter,
    onMouseLeave,
    onConditionHover,
    onConditionLeave
}) => {
    interface Particle {
        id: number;
        x: number;
        y: number;
        vx: number;
        vy: number;
        life: number;
        color: string;
        size: number;
    }

    const [animState, setAnimState] = useState<'none' | 'damage' | 'heal'>('none');
    const [particles, setParticles] = useState<Particle[]>([]);
    const prevHpRef = useRef<number | undefined>(combatant?.currentHp);

    useEffect(() => {
        if (combatant?.currentHp === undefined) return;
        const prevHp = prevHpRef.current;
        const currHp = combatant.currentHp;

        if (prevHp !== undefined && currHp !== prevHp) {
            const isDamage = currHp < prevHp;
            setAnimState(isDamage ? 'damage' : 'heal');

            // Spawn particles
            const count = isDamage ? 8 : 6;
            const newParticles: Particle[] = [];
            for (let i = 0; i < count; i++) {
                newParticles.push({
                    id: Math.random(),
                    x: 50, // center %
                    y: 50,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8,
                    life: 1.0,
                    color: isDamage ? '#991b1b' : '#4ade80',
                    size: Math.random() * 4 + 2
                });
            }
            setParticles(prev => [...prev, ...newParticles]);

            const timer = setTimeout(() => {
                setAnimState('none');
            }, 600);

            prevHpRef.current = currHp;
            return () => clearTimeout(timer);
        }

        prevHpRef.current = currHp;
    }, [combatant?.currentHp]);

    // Particle animation loop
    useEffect(() => {
        if (particles.length === 0) return;

        const interval = setInterval(() => {
            setParticles(prev => prev
                .map(p => ({
                    ...p,
                    x: p.x + p.vx,
                    y: p.y + p.vy,
                    life: p.life - 0.05
                }))
                .filter(p => p.life > 0)
            );
        }, 30);

        return () => clearInterval(interval);
    }, [particles.length]);

    // Calculate pixel position based on grid coordinates
    const left = token.position.col * cellSize;
    const top = token.position.row * cellSize;
    const size = token.size * cellSize;

    // Faction colors
    const colors: Record<MapToken['faction'], string> = {
        player: 'bg-blue-600 border-blue-400 text-white shadow-blue-500/20',
        enemy: 'bg-red-700 border-red-500 text-white shadow-red-500/20',
        neutral: 'bg-stone-600 border-stone-400 text-white shadow-stone-500/20',
        ally: 'bg-green-600 border-green-400 text-white shadow-green-500/20'
    };

    const factionStyle = colors[token.faction] || colors.neutral;

    let animClass = '';
    if (animState === 'damage') {
        animClass = 'animate-[shake_0.5s_ease-in-out] ring-4 ring-blood shadow-[0_0_30px_rgba(220,38,38,1)] z-50';
    } else if (animState === 'heal') {
        animClass = 'animate-[heal-glow_0.6s_ease-out] ring-4 ring-green-400 shadow-[0_0_30px_rgba(74,222,128,1)] z-50';
    }

    return (
        <div
            className={`absolute flex items-center justify-center rounded-full border-2 cursor-pointer select-none shadow-xl 
                ${factionStyle} 
                ${isActive && animState === 'none' ? 'ring-4 ring-gold scale-105 z-10 shadow-[0_0_20px_rgba(255,215,0,0.6)] animate-[token-pulse_2s_infinite]' : animState === 'none' ? 'hover:scale-110 active:scale-95 z-0' : ''} 
                ${isAffected && animState === 'none' ? 'animate-pulse ring-4 ring-red-500 shadow-[0_0_25px_rgba(239,68,68,0.9)] z-20' : ''} 
                ${isDragging ? 'transition-none opacity-90 scale-110 z-[100]' : 'transition-[left,top,transform] duration-500 ease-out'}
                ${animClass}
                ${className}`}
            style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${size}px`,
                height: `${size}px`,
                transform: isDragging
                    ? `translate3d(0, 0, 0)`
                    : (token.elevation > 0 ? `translateY(-${Math.min(20, token.elevation / 2)}px)` : undefined),
                boxShadow: isDragging
                    ? `0 20px 40px rgba(0,0,0,0.4)`
                    : (token.elevation > 0 ? `0 ${Math.min(30, token.elevation)}px ${Math.min(40, token.elevation * 1.5)}px rgba(0,0,0,0.6)` : undefined),
                ...style
            }}
            onClick={onClick}
            onMouseDown={onMouseDown}
            onPointerDown={onPointerDown}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            title={`${token.name} (${token.faction})`}
        >
            {/* Active/Targeted Indicator Rings (Floating outside) */}
            {isActive && animState === 'none' && (
                <div className="absolute inset-[-4px] rounded-full border-2 border-gold/50 animate-[token-pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] pointer-events-none" />
            )}
            {isAffected && animState === 'none' && (
                <div className="absolute inset-[-6px] rounded-full border-2 border-blood/60 animate-ping pointer-events-none" />
            )}

            {/* Particles */}
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute pointer-events-none rounded-full"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        backgroundColor: p.color,
                        opacity: p.life,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 100
                    }}
                />
            ))}

            {/* Movement Progress Ring */}
            {movementMax !== undefined && movementRemaining !== undefined && movementMax > 0 && (
                <svg
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 pointer-events-none overflow-visible"
                    width="125%"
                    height="125%"
                    viewBox="0 0 100 100"
                >
                    <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth="4"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke={movementRemaining > 0 ? "rgba(34, 197, 94, 0.8)" : "rgba(239, 68, 68, 0.8)"}
                        strokeWidth="4"
                        strokeDasharray={Math.PI * 92}
                        strokeDashoffset={Math.PI * 92 * (1 - movementRemaining / movementMax)}
                        className="transition-all duration-500 ease-out"
                        strokeLinecap="round"
                    />
                </svg>
            )}

            {combatant?.portraitUrl ? (
                <div className="absolute inset-[2px] rounded-full overflow-hidden bg-stone-900 pointer-events-none origin-center transform scale-[0.98]">
                    <img
                        src={combatant.portraitUrl}
                        alt={token.name}
                        className="w-full h-full object-cover scale-[1.15] -translate-y-[5%]"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                    <span
                        className="hidden font-bold font-cinzel leading-none pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-900"
                        style={{ fontSize: `${size * 0.4}px` }}
                    >
                        {token.label || token.name.substring(0, 2).toUpperCase()}
                    </span>
                </div>
            ) : (
                <span
                    className="font-bold font-cinzel leading-none pointer-events-none"
                    style={{ fontSize: `${size * 0.4}px` }}
                >
                    {token.label || token.name.substring(0, 2).toUpperCase()}
                </span>
            )}

            {/* Condition Badge Tray (Top Right) */}
            {combatant && combatant.conditions && combatant.conditions.length > 0 && (
                <div className="absolute -top-1 -right-1 flex gap-0.5 pointer-events-none">
                    {combatant.conditions.slice(0, 3).map((cond, i) => {
                        const name = cond.name.toLowerCase();
                        let bgColor = '#ef4444'; // default condition red
                        let label = cond.name.charAt(0);
                        let isBuff = false;

                        // Identify if it's a buff from data or name matching
                        const conditionData = (conditionsData as any[]).find(c => c.name.toLowerCase() === name);
                        if (conditionData?.type === 'buff') {
                            isBuff = true;
                            bgColor = '#22d3ee'; // cyan for buffs
                        }

                        // Specific Aesthetic overrides
                        if (name.includes('dead')) { bgColor = '#000000'; label = '💀'; }
                        else if (name.includes('stun')) { bgColor = '#eab308'; label = '⚡'; }
                        else if (name.includes('poison')) { bgColor = '#22c55e'; label = '🧪'; }
                        else if (name.includes('blind')) { bgColor = '#6b7280'; label = '👁️'; }
                        else if (name.includes('charm')) { bgColor = '#ec4899'; label = '❤️'; }
                        else if (name.includes('fright')) { bgColor = '#a855f7'; label = '👻'; }
                        else if (name.includes('grapp')) { bgColor = '#f97316'; label = '⛓️'; }
                        else if (name.includes('incap')) { bgColor = '#64748b'; label = '✖️'; }
                        else if (name.includes('invis')) { bgColor = '#3b82f6'; label = '🌫️'; }
                        else if (name.includes('paralyz')) { bgColor = '#facc15'; label = '🔒'; }
                        else if (name.includes('petrif')) { bgColor = '#78716c'; label = '🗿'; }
                        else if (name.includes('prone')) { bgColor = '#7c2d12'; label = '⬇️'; }
                        else if (name.includes('restrain')) { bgColor = '#ea580c'; label = '🕸️'; }
                        else if (name.includes('unconsc')) { bgColor = '#1e3a8a'; label = '💤'; }
                        else if (name.includes('bless')) { bgColor = '#fbbf24'; label = '✨'; }
                        else if (name.includes('bardic')) { bgColor = '#ec4899'; label = '🎵'; }
                        else if (name.includes('faith')) { bgColor = '#3b82f6'; label = '🛡️'; }
                        else if (name.includes('haste')) { bgColor = '#22d3ee'; label = '🏃'; }
                        else if (name.includes('heroism')) { bgColor = '#ef4444'; label = '🛡️'; }
                        else if (name.includes('enlarge')) { bgColor = '#f97316'; label = '↗️'; }
                        else if (name.includes('guidan')) { bgColor = '#22c55e'; label = '🧭'; }
                        else if (name.includes('resist')) { bgColor = '#10b981'; label = '🛡️'; }

                        return (
                            <div
                                key={cond.id}
                                className={`w-4 h-4 rounded-full border border-stone-900 shadow-sm flex items-center justify-center overflow-hidden transition-all duration-300
                                    ${isBuff ? 'ring-2 ring-cyan-400/30' : ''}
                                `}
                                style={{
                                    backgroundColor: bgColor,
                                    zIndex: 10 - i,
                                    transform: `translateX(${i * -6}px)`,
                                    boxShadow: isBuff ? '0 0 8px rgba(34, 211, 238, 0.4)' : undefined
                                }}
                                title={cond.name}
                                onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    onConditionHover?.(cond.name, e);
                                }}
                                onMouseLeave={(e) => {
                                    e.stopPropagation();
                                    onConditionLeave?.();
                                }}
                            >
                                <span className={`text-[8px] leading-none ${isBuff ? 'text-stone-950 font-black' : 'text-white'}`}>
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                    {combatant.conditions.length > 3 && (
                        <div
                            className="w-3.5 h-3.5 rounded-full bg-stone-700 border border-stone-900 text-[6px] text-white flex items-center justify-center font-bold"
                            style={{ transform: `translateX(-18px)` }}
                        >
                            +{combatant.conditions.length - 3}
                        </div>
                    )}
                </div>
            )}

            {/* Health Bar */}
            {token.showHealthBar !== false && combatant && (
                <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 w-[120%] h-1.5 bg-stone-900 border border-stone-800 rounded-full overflow-hidden shadow-sm"
                    title={`${combatant.currentHp}/${combatant.maxHp} HP`}
                >
                    <div
                        className={`h-full transition-all duration-500 ${(combatant.currentHp / combatant.maxHp) > 0.5 ? 'bg-green-500' :
                            (combatant.currentHp / combatant.maxHp) > 0.2 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                        style={{ width: `${(combatant.currentHp / combatant.maxHp) * 100}%` }}
                    />
                </div>
            )}

            {/* Name Label */}
            {token.showNameLabel !== false && (
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-950/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-bold text-parchment border border-stone-800 shadow-lg pointer-events-none">
                    {token.name}
                </div>
            )}

            {/* Elevation indicator if > 0 */}
            {token.elevation > 0 && (
                <div className="absolute -bottom-1 -right-2 bg-stone-900 border border-gold/50 text-gold text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xl flex items-center gap-1 z-30">
                    <span className="opacity-70 text-[6px]">▲</span>
                    {token.elevation}ft
                </div>
            )}
        </div>
    );
};
