import React from 'react';
import { Combatant } from '../../types/combat';
import { MapToken } from '../../types/battleMap';
import { Heart, Shield, Zap, Skull, Activity } from 'lucide-react';

interface TokenTooltipProps {
    combatant: Combatant;
    token: MapToken;
    x: number;
    y: number;
}

export const TokenTooltip: React.FC<TokenTooltipProps> = ({
    combatant,
    token,
    x,
    y
}) => {
    const hpPercent = (combatant.currentHp / combatant.maxHp) * 100;

    return (
        <div
            className="fixed z-[150] pointer-events-none animate-in fade-in zoom-in duration-200"
            style={{ left: x + 20, top: y - 10 }}
        >
            <div className="bg-stone-950/95 backdrop-blur-md border border-stone-800 rounded-lg shadow-2xl overflow-hidden w-64">
                {/* Header */}
                <div className="px-4 py-2 bg-stone-900/50 border-b border-stone-800 flex justify-between items-center">
                    <div>
                        <h4 className="text-sm font-cinzel font-bold text-parchment leading-tight truncate max-w-[160px]">
                            {token.name}
                        </h4>
                        <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">
                            {token.faction} • Size {token.size}
                        </p>
                    </div>
                    {combatant.isDead && <Skull size={18} className="text-blood animate-pulse" />}
                </div>

                {/* Stats Grid */}
                <div className="p-4 flex flex-col gap-3">
                    {/* HP Bar Section */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-stone-400 flex items-center gap-1">
                                <Heart size={10} className="text-blood" /> Vitality
                            </span>
                            <span className={hpPercent > 50 ? 'text-green-500' : hpPercent > 20 ? 'text-orange-500' : 'text-red-500'}>
                                {combatant.currentHp} / {combatant.maxHp}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                            <div
                                className={`h-full transition-all duration-700 ease-out ${hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-orange-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${hpPercent}%` }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-stone-900/40 rounded border border-stone-800/50 p-2 flex items-center gap-2">
                            <Shield size={14} className="text-blue-400" />
                            <div>
                                <p className="text-[8px] text-stone-500 uppercase font-black leading-none">Defense</p>
                                <p className="text-xs font-bold text-parchment">AC {combatant.ac || 10}</p>
                            </div>
                        </div>
                        <div className="bg-stone-900/40 rounded border border-stone-800/50 p-2 flex items-center gap-2">
                            <Zap size={14} className="text-gold" />
                            <div>
                                <p className="text-[8px] text-stone-500 uppercase font-black leading-none">Initiative</p>
                                <p className="text-xs font-bold text-parchment">+{combatant.initiativeMod || 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* Conditions */}
                    {combatant.conditions && combatant.conditions.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1 text-[9px] font-bold text-stone-500 uppercase">
                                <Activity size={10} /> Active Afflictions
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {combatant.conditions.map(cond => (
                                    <span
                                        key={cond.id}
                                        className="bg-blood/10 border border-blood/30 text-blood text-[9px] px-1.5 py-0.5 rounded font-bold"
                                    >
                                        {cond.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Elevation */}
                {token.elevation > 0 && (
                    <div className="px-4 py-1.5 bg-blue-900/10 border-t border-stone-800 flex justify-between items-center text-[10px]">
                        <span className="text-blue-400 font-bold uppercase tracking-tighter">Altitude</span>
                        <span className="text-parchment font-mono">{token.elevation} ft</span>
                    </div>
                )}
            </div>
        </div>
    );
};
