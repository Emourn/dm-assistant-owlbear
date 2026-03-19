import React from 'react';
import conditionsData from '../../data/dnd5e/conditions.json';

interface ConditionTooltipProps {
    conditionName: string;
    x: number;
    y: number;
}

export const ConditionTooltip: React.FC<ConditionTooltipProps> = ({
    conditionName,
    x,
    y
}) => {
    const nameLower = conditionName.toLowerCase();
    const [finalX, setFinalX] = React.useState(x + 15);

    React.useEffect(() => {
        const tooltipWidth = 320; // Matches the w-80 class (80 * 4px)
        const padding = 20;
        const rightEdge = x + 15 + tooltipWidth + padding;

        if (rightEdge > window.innerWidth) {
            // Flip to left side
            setFinalX(x - tooltipWidth - 15);
        } else {
            setFinalX(x + 15);
        }
    }, [x]);

    // Find rich data in conditions.json
    const cond = conditionsData.find(c => c.name.toLowerCase() === nameLower) as any;

    if (!cond) {
        // Fallback for custom or unknown conditions
        return (
            <div
                className="fixed z-[200] pointer-events-none animate-in fade-in zoom-in duration-150"
                style={{ left: finalX, top: y - 10 }}
            >
                <div className="bg-stone-900/95 backdrop-blur-md border border-stone-700 rounded shadow-2xl p-3 w-64">
                    <h4 className="text-xs font-black uppercase text-parchment tracking-widest border-b border-stone-800 pb-1 mb-2">
                        {conditionName}
                    </h4>
                    <p className="text-[10px] text-stone-400 italic">No detailed information available.</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed z-[200] pointer-events-none animate-in fade-in zoom-in duration-150"
            style={{ left: finalX, top: y - 10 }}
        >
            <div className="bg-stone-900/95 backdrop-blur-md border border-stone-700 rounded shadow-2xl overflow-hidden w-80 p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${cond.type === 'buff' ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-blood shadow-[0_0_8px_rgba(153,27,27,0.5)]'}`} />
                        <h4 className="text-[11px] font-black uppercase text-parchment tracking-[0.2em]">
                            {cond.name}
                        </h4>
                    </div>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${cond.type === 'buff' ? 'text-cyan-400 border-cyan-900/50 bg-cyan-900/20' : 'text-blood border-red-950/50 bg-red-950/20'} uppercase`}>
                        {cond.type}
                    </span>
                </div>

                {cond.coaching?.instruction && (
                    <div className="space-y-1">
                        <h5 className="text-[8px] text-gold font-black uppercase tracking-widest flex items-center gap-1.5">
                            <span className="opacity-50">DM INSTRUCTION</span>
                        </h5>
                        <p className="text-[11px] text-parchment leading-relaxed font-bold">
                            {cond.coaching.instruction}
                        </p>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="p-2.5 rounded bg-stone-950/50 border border-stone-800/50 space-y-1.5">
                        <h5 className="text-[8px] text-cyan-400 font-black uppercase tracking-widest">Rules & Maths</h5>
                        <p className="text-[10px] text-stone-300 leading-relaxed">
                            {cond.coaching?.maths || cond.description}
                        </p>
                    </div>

                    {cond.coaching?.save && (
                        <div className="p-2.5 rounded bg-stone-950/50 border border-stone-800/50 space-y-1.5">
                            <h5 className="text-[8px] text-blood font-black uppercase tracking-widest">Ending the Effect</h5>
                            <p className="text-[10px] text-stone-300 leading-relaxed font-medium">
                                {cond.coaching.save}
                            </p>
                        </div>
                    )}
                </div>

                <p className="text-[9px] text-stone-500 italic leading-snug opacity-60">
                    {cond.flavor}
                </p>
            </div>
        </div>
    );
};
