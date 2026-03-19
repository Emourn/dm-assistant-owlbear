import { useState, useEffect } from 'react';
import { Character, StatBlock } from '../../../../types/character';
import { Zap, RotateCcw, Dice6, LayoutGrid, Calculator, ChevronUp, ChevronDown } from 'lucide-react';
import {
    STANDARD_ARRAY,
    POINT_BUY_BUDGET,
    getPointBuyCost,
    roll4d6DropLowest
} from '../../../../engine/rulesEngine';

interface Props {
    draft: Character;
    onUpdate: (updates: Partial<Character>) => void;
}

type GenerationMethod = 'array' | 'pointbuy' | 'roll';

const STAT_NAMES: (keyof StatBlock)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function AbilityScoreStep({ draft, onUpdate }: Props) {
    const [method, setMethod] = useState<GenerationMethod>('array');
    const [baseScores, setBaseScores] = useState<StatBlock>({
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
    });
    const [assignedArray, setAssignedArray] = useState<Record<keyof StatBlock, number | null>>({
        str: null, dex: null, con: null, int: null, wis: null, cha: null
    });
    const [rolledScores, setRolledScores] = useState<number[]>([]);

    // Update draft whenever base scores change
    useEffect(() => {
        const finalScores: StatBlock = { ...draft.abilityScores };
        STAT_NAMES.forEach(stat => {
            if (method === 'array' || method === 'roll') {
                finalScores[stat] = assignedArray[stat] || 8;
            } else {
                finalScores[stat] = baseScores[stat];
            }
        });

        const changed = STAT_NAMES.some(stat => finalScores[stat] !== draft.abilityScores[stat]);
        if (changed) {
            onUpdate({ abilityScores: finalScores });
        }
    }, [assignedArray, baseScores, draft.abilityScores, method, onUpdate]);

    const handlePointBuyChange = (stat: keyof StatBlock, delta: number) => {
        const current = baseScores[stat];
        const next = current + delta;
        if (next < 8 || next > 15) return;

        // Check budget
        const currentCost = getPointBuyCost(current);
        const nextCost = getPointBuyCost(next);
        const costDiff = nextCost - currentCost;

        const totalSpent = STAT_NAMES.reduce((sum, s) => sum + getPointBuyCost(baseScores[s]), 0);
        if (totalSpent + costDiff > POINT_BUY_BUDGET) return;

        setBaseScores(prev => ({ ...prev, [stat]: next }));
    };

    const handleRollScores = () => {
        const rolls = Array.from({ length: 6 }, () => roll4d6DropLowest());
        setRolledScores(rolls.sort((a, b) => b - a));
        // Reset assigned for the new rolls
        setAssignedArray({ str: null, dex: null, con: null, int: null, wis: null, cha: null });
    };

    const handleAssign = (stat: keyof StatBlock, val: number) => {
        setAssignedArray(prev => ({ ...prev, [stat]: val }));
    };

    const pointsSpent = STAT_NAMES.reduce((sum, s) => sum + getPointBuyCost(baseScores[s]), 0);

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            {/* Method Toggle */}
            <div className="flex p-1 bg-stone-900 border border-stone-800 rounded-xl max-w-md mx-auto">
                <button
                    onClick={() => setMethod('array')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${method === 'array' ? 'bg-stone-800 text-gold border border-stone-700' : 'text-stone-500 hover:text-stone-300'
                        }`}
                >
                    <LayoutGrid size={14} />
                    STANDARD ARRAY
                </button>
                <button
                    onClick={() => setMethod('pointbuy')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${method === 'pointbuy' ? 'bg-stone-800 text-gold border border-stone-700' : 'text-stone-500 hover:text-stone-300'
                        }`}
                >
                    <Calculator size={14} />
                    POINT BUY
                </button>
                <button
                    onClick={() => setMethod('roll')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${method === 'roll' ? 'bg-stone-800 text-gold border border-stone-700' : 'text-stone-500 hover:text-stone-300'
                        }`}
                >
                    <Dice6 size={14} />
                    ROLL DICE
                </button>
            </div>

            {/* Point Buy Budget Bar */}
            {method === 'pointbuy' && (
                <div className="max-w-md mx-auto space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                        <span className="text-stone-500">Point Buy Budget</span>
                        <span className={pointsSpent >= POINT_BUY_BUDGET ? 'text-blood' : 'text-gold'}>
                            {pointsSpent} / {POINT_BUY_BUDGET} Points
                        </span>
                    </div>
                    <div className="h-1.5 bg-stone-900 border border-stone-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blood transition-all duration-300"
                            style={{ width: `${(pointsSpent / POINT_BUY_BUDGET) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Main Generation Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Score Controls */}
                <div className="space-y-4">
                    {STAT_NAMES.map(stat => {
                        const total = draft.abilityScores[stat];
                        const mod = Math.floor((total - 10) / 2);
                        const assignedValue = (method === 'array' || method === 'roll') ? assignedArray[stat] : baseScores[stat];

                        return (
                            <div key={stat} className="bg-stone-900/50 border border-stone-800 rounded-xl p-4 flex items-center justify-between group hover:border-stone-700 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-stone-950 border border-stone-800 rounded-lg flex flex-col items-center justify-center">
                                        <span className="text-[10px] font-bold text-stone-600 uppercase leading-none mb-1">{stat}</span>
                                        <span className="text-xl font-cinzel font-bold text-white leading-none">{total}</span>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-parchment uppercase tracking-wide">
                                            {stat === 'str' ? 'Strength' : stat === 'dex' ? 'Dexterity' : stat === 'con' ? 'Constitution' : stat === 'int' ? 'Intelligence' : stat === 'wis' ? 'Wisdom' : 'Charisma'}
                                        </div>
                                        <div className="text-[10px] text-stone-500 font-bold">Modifier: <span className="text-gold">{mod >= 0 ? '+' : ''}{mod}</span></div>
                                    </div>
                                </div>

                                {/* Controls based on method */}
                                <div className="flex items-center gap-3">
                                    {method === 'pointbuy' ? (
                                        <div className="flex items-center bg-stone-950/50 rounded-lg border border-stone-800 p-1">
                                            <button
                                                onClick={() => handlePointBuyChange(stat, -1)}
                                                className="p-1.5 hover:text-white text-stone-600 transition-colors"
                                            >
                                                <ChevronDown size={18} />
                                            </button>
                                            <div className="w-8 text-center font-bold text-sm text-parchment">
                                                {baseScores[stat]}
                                            </div>
                                            <button
                                                onClick={() => handlePointBuyChange(stat, 1)}
                                                className="p-1.5 hover:text-white text-stone-600 transition-colors"
                                            >
                                                <ChevronUp size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <select
                                            value={assignedValue || ''}
                                            onChange={(e) => handleAssign(stat, parseInt(e.target.value))}
                                            className="bg-stone-950 border border-stone-800 text-parchment text-sm font-bold rounded-lg px-3 py-2 outline-none focus:border-gold transition-colors"
                                        >
                                            <option value="">Choose...</option>
                                            {(method === 'array' ? STANDARD_ARRAY : rolledScores).map((v, i) => (
                                                <option key={i} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Helper / Tooltip Area */}
                <div className="bg-stone-900/30 border border-stone-800 rounded-xl p-6 space-y-6">
                    <h4 className="font-cinzel text-lg font-bold text-gold flex items-center gap-2">
                        <Zap size={18} />
                        How it works
                    </h4>

                    {method === 'array' && (
                        <div className="space-y-4">
                            <p className="text-sm text-stone-400 leading-relaxed">
                                The **Standard Array** is the most balanced method. You are given six fixed values ({STANDARD_ARRAY.join(', ')}) and you assign each one to a different ability score.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {STANDARD_ARRAY.map(v => {
                                    const isUsed = Object.values(assignedArray).includes(v);
                                    return (
                                        <div key={v} className={`w-10 h-10 rounded border flex items-center justify-center font-bold font-cinzel ${isUsed ? 'bg-blood/20 border-blood/40 text-blood' : 'bg-stone-900 border-stone-700 text-stone-500'
                                            }`}>
                                            {v}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {method === 'pointbuy' && (
                        <div className="space-y-4">
                            <p className="text-sm text-stone-400 leading-relaxed">
                                **Point Buy** lets you customize your abilities with a budget of {POINT_BUY_BUDGET} points. All scores start at 8. Increasing a score beyond 13 costs more points.
                            </p>
                            <table className="w-full text-[10px] text-stone-500 font-bold border-t border-stone-800">
                                <thead>
                                    <tr className="border-b border-stone-800">
                                        <th className="py-2 text-left">SCORE</th>
                                        <th className="py-2 text-right">COST</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[8, 9, 10, 11, 12, 13, 14, 15].map(v => (
                                        <tr key={v} className="border-b border-stone-800/30">
                                            <td className="py-2">{v}</td>
                                            <td className="py-2 text-right">{getPointBuyCost(v)} pts</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {method === 'roll' && (
                        <div className="space-y-4">
                            <p className="text-sm text-stone-400 leading-relaxed">
                                **Dice Rolling** is for the daring. Roll 4d6 and drop the lowest die for each score. Results are unpredictable but can lead to very powerful (or very weak) heroes.
                            </p>
                            <button
                                onClick={handleRollScores}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg font-bold text-xs uppercase tracking-widest transition-all"
                            >
                                <Dice6 size={18} />
                                ROLL FOR POWER
                            </button>

                            {rolledScores.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {rolledScores.map((v, i) => {
                                        const isUsed = Object.values(assignedArray).includes(v);
                                        return (
                                            <div key={i} className={`w-10 h-10 rounded border flex items-center justify-center font-bold font-cinzel ${isUsed ? 'bg-blood/20 border-blood/40 text-blood' : 'bg-stone-900 border-stone-700 text-stone-500'
                                                }`}>
                                                {v}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-4 border-t border-stone-800">
                        <button
                            onClick={() => {
                                setBaseScores({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
                                setAssignedArray({ str: null, dex: null, con: null, int: null, wis: null, cha: null });
                            }}
                            className="text-[10px] text-stone-600 hover:text-gold font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
                        >
                            <RotateCcw size={12} />
                            Reset All Scores
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
