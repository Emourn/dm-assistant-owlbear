import { Move } from 'lucide-react';

interface TurnEconomyHUDProps {
    hasAction: boolean;
    hasBonusAction: boolean;
    hasReaction: boolean;
    extraActions?: number;
    hasHasteAction?: boolean;
    movementRemaining: number;
    movementTotal: number;
    className?: string;
}

export function TurnEconomyHUD({
    hasAction,
    hasBonusAction,
    hasReaction,
    extraActions = 0,
    hasHasteAction = false,
    movementRemaining,
    movementTotal,
    className = ""
}: TurnEconomyHUDProps) {
    const movePercent = Math.max(0, Math.min(100, (movementRemaining / (movementTotal || 1)) * 100));

    return (
        <div className={`p-4 bg-stone-900/80 backdrop-blur-md border border-stone-800 rounded-2xl shadow-2xl flex flex-col gap-3 min-w-[160px] animate-in slide-in-from-left-4 fade-in duration-500 ${className}`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest leading-none">Turn Economy</span>
                </div>
                <div className="flex gap-2">
                    {/* Action Dots */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-1">
                            <div className={`w-3.5 h-3.5 rounded-full border shadow-sm transition-all duration-500 ${hasAction ? 'bg-gold border-gold shadow-[0_0_8px_rgba(255,215,0,0.5)]' : 'bg-stone-800 border-stone-700'}`} />
                            {hasHasteAction && (
                                <div className="w-3.5 h-3.5 rounded-full border border-cyan-400 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-pulse" title="Haste Action" />
                            )}
                            {extraActions > 0 && Array.from({ length: extraActions }).map((_, i) => (
                                <div key={i} className="w-3.5 h-3.5 rounded-full border border-orange-500 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" title="Extra Action" />
                            ))}
                        </div>
                        <span className="text-[8px] font-black text-stone-600 uppercase tracking-tighter">ACT</span>
                    </div>
                    {/* Bonus Dot */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-3.5 h-3.5 rounded-full border shadow-sm transition-all duration-500 ${hasBonusAction ? 'bg-arcane border-arcane shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-stone-800 border-stone-700'}`} />
                        <span className="text-[8px] font-black text-stone-600 uppercase tracking-tighter">BNS</span>
                    </div>
                    {/* Reaction Dot */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-3.5 h-3.5 rounded-full border shadow-sm transition-all duration-500 ${hasReaction ? 'bg-blood border-blood shadow-[0_0_8px_rgba(220,38,38,0.5)]' : 'bg-stone-800 border-stone-700'}`} />
                        <span className="text-[8px] font-black text-stone-600 uppercase tracking-tighter">RCT</span>
                    </div>
                </div>
            </div>

            {/* Movement Bar */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Move size={10} /> Movement
                    </span>
                    <span className="text-xs font-mono font-bold text-parchment">
                        {movementRemaining}<span className="text-stone-600 text-[10px]">/{movementTotal}ft</span>
                    </span>
                </div>
                <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800/50 p-0.5">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${movementRemaining > 0 ? 'bg-indigo-500' : 'bg-stone-800'}`}
                        style={{ width: `${movePercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
