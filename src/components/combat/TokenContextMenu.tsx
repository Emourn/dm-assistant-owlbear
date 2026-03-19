import React from 'react';
import { Shield, Skull, LogOut, Zap, Swords, HeartPulse, X, Sparkles, Brain, Eye, User, Dice5 } from 'lucide-react';
import { MapToken } from '../../types/battleMap';
import { Combatant, CombatAction } from '../../types/combat';
import { getPlayerCombatActions, getMonsterCombatActions } from '../../engine/combatActions';
import { useCharacterStore } from '../../store/characterStore';
import { useCombatStore } from '../../store/combatStore';
import conditionsData from '../../data/dnd5e/conditions.json';

interface TokenContextMenuProps {
    x: number;
    y: number;
    tokenId: string;
    combatant?: Combatant;
    onClose: () => void;
    onApplyCondition: (conditionId: string) => void;
    onMarkDead: () => void;
    onRevive: () => void;
    onRemove: () => void;
    onUpdate: (updates: Partial<MapToken>) => void;
    onActionClick?: (action: CombatAction) => void;
    onConditionHover?: (name: string, e: React.MouseEvent) => void;
    onConditionLeave?: () => void;
    onViewStatBlock?: () => void;
}

export const TokenContextMenu: React.FC<TokenContextMenuProps> = ({
    x,
    y,
    tokenId,
    combatant,
    onClose,
    onApplyCondition,
    onMarkDead,
    onRevive,
    onRemove,
    onUpdate,
    onActionClick,
    onConditionHover,
    onConditionLeave,
    onViewStatBlock
}) => {
    const characters = useCharacterStore(s => s.characters);
    const activeEncounter = useCombatStore(s => s.activeEncounter);

    // Get the LIVE token from the store, not the stale prop
    const liveToken = activeEncounter?.battleMap?.tokens.find(t => t.id === tokenId);

    // If token was removed while menu is open, close it
    React.useEffect(() => {
        if (!liveToken) {
            onClose();
        }
    }, [liveToken, onClose]);

    const actions = React.useMemo(() => {
        if (!combatant) return [];
        if (combatant.type === 'player') {
            const char = characters.find(c => c.id === combatant.sourceId);
            return char ? getPlayerCombatActions(char) : [];
        }
        return getMonsterCombatActions(combatant.monsterData);
    }, [combatant, characters]);

    // Group relevant quick actions
    const quickActions = actions.filter(a =>
        ['action', 'bonus', 'reaction'].includes(a.economy) &&
        ['Attacks', 'Spells', 'Actions', 'Standard', 'Bonus', 'Reactions'].includes(a.category)
    ).slice(0, 14);

    const isDead = combatant?.isDead || (combatant && combatant.currentHp <= 0);

    if (!liveToken) return null;

    const conditions = conditionsData.filter(c => c.type === 'condition');
    const buffs = conditionsData.filter(c => c.type === 'buff');

    return (
        <div
            className="fixed z-[100] w-64 bg-stone-950 border border-stone-800 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-100"
            style={{ left: x, top: y }}
        >
            <div className="px-3 py-2 bg-stone-900 border-b border-stone-800 flex justify-between items-center">
                <div className="flex items-center gap-2 max-w-[180px]">
                    <div className={`w-2 h-2 shrink-0 rounded-full ${liveToken.faction === 'player' ? 'bg-arcane' :
                        liveToken.faction === 'enemy' ? 'bg-blood' :
                            liveToken.faction === 'ally' ? 'bg-green-500' : 'bg-stone-500'
                        }`} />
                    <p className="text-[10px] font-black uppercase text-stone-300 tracking-widest truncate">{liveToken.name}</p>
                </div>
                <button onClick={onClose} className="text-stone-500 hover:text-white p-0.5 rounded hover:bg-stone-800 transition-colors">
                    <X size={12} />
                </button>
            </div>

            <div className="p-1 max-h-[500px] overflow-y-auto custom-scrollbar">
                {/* Buffs Section */}
                <div className="px-3 py-1 text-[9px] font-bold text-cyan-500 uppercase flex items-center gap-1.5 mt-1">
                    <Sparkles size={10} /> Apply Buff
                </div>
                <div className="grid grid-cols-2 gap-0.5 mb-2">
                    {buffs.slice(0, 6).map(b => {
                        const condId = b.name.toLowerCase();
                        const isActive = combatant?.conditions.some(c => c.id === condId);
                        return (
                            <button
                                key={b.name}
                                onClick={() => { onApplyCondition(condId); onClose(); }}
                                onMouseEnter={(e) => onConditionHover?.(b.name, e)}
                                onMouseLeave={onConditionLeave}
                                className={`text-left px-2 py-1 text-[10px] rounded transition-colors flex items-center gap-1.5 group ${isActive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-parchment hover:bg-stone-800'}`}
                            >
                                <Sparkles size={10} className={`${isActive ? 'text-cyan-400' : 'text-cyan-500/50 group-hover:text-cyan-400'}`} /> {b.name}
                            </button>
                        );
                    })}
                </div>

                {combatant?.type === 'monster' && combatant.monsterData && (
                    <>
                        <div className="h-px bg-stone-800/50 my-1 mx-2" />
                        <button
                            onClick={() => { onViewStatBlock?.(); onClose(); }}
                            className="w-full text-left px-3 py-1.5 text-[10px] text-amber-500 hover:bg-amber-500/10 rounded flex items-center gap-2 transition-colors uppercase font-black tracking-tighter"
                        >
                            <Eye size={12} /> View Stat Block
                        </button>
                    </>
                )}

                <div className="h-px bg-stone-800/50 my-1 mx-2" />

                {/* Conditions Section */}
                <div className="px-3 py-1 text-[9px] font-bold text-blood uppercase flex items-center gap-1.5">
                    <Skull size={10} /> Apply Condition
                </div>
                <div className="grid grid-cols-2 gap-0.5 mb-2">
                    {conditions.slice(0, 14).map(c => {
                        const condId = c.name.toLowerCase();
                        const isActive = combatant?.conditions.some(cond => cond.id === condId);
                        return (
                            <button
                                key={c.name}
                                onClick={() => { onApplyCondition(condId); onClose(); }}
                                onMouseEnter={(e) => onConditionHover?.(c.name, e)}
                                onMouseLeave={onConditionLeave}
                                className={`text-left px-2 py-1 text-[10px] rounded transition-colors flex items-center gap-1.5 group ${isActive ? 'bg-blood/10 text-blood border border-blood/30' : 'text-parchment hover:bg-stone-800'}`}
                            >
                                <Zap size={10} className={`${isActive ? 'text-gold' : 'text-gold/50 group-hover:text-gold'}`} /> {c.name}
                            </button>
                        );
                    })}
                </div>

                <div className="h-px bg-stone-800 my-1" />

                {isDead ? (
                    <button
                        onClick={() => { onMarkDead(); onClose(); }} // Wait, MarkDead logic might be inverted if it's already dead, but the parent uses onRevive separately
                        className="w-full text-left px-3 py-1.5 text-xs text-blood hover:bg-blood/10 rounded flex items-center gap-2 transition-colors"
                    >
                        <Skull size={14} /> Mark as Dead
                    </button> // Fallback if isDead check fails
                ) : (
                    <button
                        onClick={() => { onMarkDead(); onClose(); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-blood hover:bg-blood/10 rounded flex items-center gap-2 transition-colors"
                    >
                        <Skull size={14} /> Mark as Dead
                    </button>
                )}

                {isDead && (
                    <button
                        onClick={() => { onRevive(); onClose(); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-green-500 hover:bg-green-500/10 rounded flex items-center gap-2 transition-colors font-bold"
                    >
                        <HeartPulse size={14} /> Revive Combatant
                    </button>
                )}

                <div className="h-px bg-stone-800 my-1" />

                <div className="px-3 py-1 text-[9px] font-bold text-stone-600 uppercase">Change Faction</div>
                <div className="grid grid-cols-2 gap-0.5">
                    {(['player', 'enemy', 'ally', 'neutral'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => { onUpdate({ faction: f }); onClose(); }}
                            className={`text-left px-2 py-1 text-[10px] capitalize hover:bg-stone-800 rounded flex items-center gap-1.5 ${liveToken.faction === f ? 'text-gold' : 'text-stone-400'}`}
                        >
                            <Shield size={10} /> {f}
                        </button>
                    ))}
                </div>

                <div className="h-px bg-stone-800 my-1" />

                <button
                    onClick={() => { onRemove(); onClose(); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-stone-500 hover:text-white hover:bg-blood/20 rounded flex items-center gap-2 transition-colors uppercase font-bold tracking-tighter"
                >
                    <LogOut size={14} /> Remove Token
                </button>

                {!isDead && (
                    <>
                        <div className="h-px bg-stone-800 my-1 font-black" />
                        <div className="px-3 py-1 text-[9px] font-black text-amber-500 uppercase flex items-center gap-1.5" title="For traps, environmental effects, or standalone resistance rolls.">
                            <Dice5 size={10} className="text-amber-500" /> Environmental Saves
                        </div>
                        <div className="grid grid-cols-3 gap-1 px-1.5 py-1">
                            {[
                                { id: 'str', name: 'Strength', icon: <Shield size={10} />, color: 'text-orange-500' },
                                { id: 'dex', name: 'Dexterity', icon: <Zap size={10} />, color: 'text-yellow-500' },
                                { id: 'con', name: 'Constitution', icon: <HeartPulse size={10} />, color: 'text-red-500' },
                                { id: 'int', name: 'Intelligence', icon: <Brain size={10} />, color: 'text-blue-500' },
                                { id: 'wis', name: 'Wisdom', icon: <Eye size={10} />, color: 'text-green-500' },
                                { id: 'cha', name: 'Charisma', icon: <User size={10} />, color: 'text-purple-500' }
                            ].map(save => (
                                <button
                                    key={save.id}
                                    onClick={() => {
                                        if (onActionClick) {
                                            onActionClick({
                                                id: `save-${save.id}`,
                                                name: `${save.name} Save`,
                                                actionType: 'saving-throw',
                                                saveAbility: save.id,
                                                economy: 'free',
                                                range: 'Self',
                                                category: 'Standard'
                                            } as any);
                                        }
                                        onClose();
                                    }}
                                    className="bg-stone-900 border border-stone-800 hover:border-amber-500/50 p-1.5 rounded flex flex-col items-center justify-center gap-1 transition-all group"
                                    title={`Roll a ${save.name} Saving Throw`}
                                >
                                    <span className={`${save.color} opacity-70 group-hover:opacity-100`}>{save.icon}</span>
                                    <span className="text-[8px] font-black text-stone-400 group-hover:text-parchment uppercase tracking-tighter">{save.id}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {quickActions.length > 0 && !isDead && (
                    <>
                        <div className="h-px bg-stone-800 my-1" />
                        <div className="px-3 py-1 text-[9px] font-bold text-stone-500 uppercase flex items-center gap-1">
                            <Swords size={10} /> Actions
                        </div>
                        <div className="grid grid-cols-2 gap-1 px-1 py-1">
                            {quickActions.map(action => (
                                <button
                                    key={action.id}
                                    onClick={() => { onActionClick?.(action); onClose(); }}
                                    className="text-left px-2 py-1 text-[9px] text-parchment bg-stone-900 border border-stone-800 hover:border-gold/50 rounded transition-all flex flex-col gap-0.5 group"
                                >
                                    <div className="flex items-center gap-1 truncate w-full">
                                        <span className="opacity-70 group-hover:opacity-100">{action.icon}</span>
                                        <span className="truncate group-hover:text-gold">{action.name}</span>
                                    </div>
                                    <span className={`text-[7px] font-black uppercase opacity-60 ${action.economy === 'action' ? 'text-gold' :
                                        action.economy === 'bonus' ? 'text-arcane' : 'text-blood'
                                        }`}>
                                        {action.economy === 'action' ? 'Action' : action.economy === 'bonus' ? 'Bonus' : 'Reaction'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                <div className="h-px bg-stone-800 my-1" />

                <div className="px-3 py-1 text-[9px] font-bold text-stone-600 uppercase">Auras & Display</div>
                <div className="px-2 py-1 flex flex-col gap-1.5">
                    <div className="flex gap-1">
                        <button
                            onClick={() => { onUpdate({ showNameLabel: !liveToken.showNameLabel }); onClose(); }}
                            className={`flex-1 px-2 py-1 text-[9px] rounded border transition-all flex items-center justify-center gap-1 ${liveToken.showNameLabel !== false ? 'bg-gold/10 border-gold/30 text-gold' : 'bg-stone-900 border-stone-800 text-stone-500'}`}
                        >
                            <span className="text-[10px]">Name</span>
                        </button>
                        <button
                            onClick={() => { onUpdate({ showHealthBar: !liveToken.showHealthBar }); onClose(); }}
                            className={`flex-1 px-2 py-1 text-[9px] rounded border transition-all flex items-center justify-center gap-1 ${liveToken.showHealthBar !== false ? 'bg-arcane/10 border-arcane/30 text-arcane' : 'bg-stone-900 border-stone-800 text-stone-500'}`}
                        >
                            <span className="text-[10px]">HP Bar</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                        {[
                            { r: 10, c: '#3b82f6', n: '10ft Blue' },
                            { r: 30, c: '#ef4444', n: '30ft Red' },
                            { r: 10, c: '#eab308', n: '10ft Gold' },
                            { r: 30, c: '#22c55e', n: '30ft Green' }
                        ].map(preset => {
                            const isActive = liveToken.auras?.some(a => a.radiusFt === preset.r && a.color === preset.c);
                            return (
                                <button
                                    key={`${preset.r}-${preset.c}`}
                                    onClick={() => {
                                        let newAuras = liveToken.auras || [];
                                        if (isActive) {
                                            newAuras = newAuras.filter(a => !(a.radiusFt === preset.r && a.color === preset.c));
                                        } else {
                                            newAuras = [...newAuras, {
                                                id: crypto.randomUUID(),
                                                name: preset.n,
                                                radiusFt: preset.r,
                                                color: preset.c,
                                                opacity: 0.3
                                            }];
                                        }
                                        onUpdate({ auras: newAuras });
                                        onClose();
                                    }}
                                    className={`h-7 rounded border flex items-center justify-center transition-all ${isActive ? 'bg-stone-800 border-gold shadow-[0_0_8px_rgba(255,215,0,0.3)]' : 'bg-stone-900 border-stone-800 hover:border-stone-600'}`}
                                    title={`Toggle ${preset.n}`}
                                >
                                    <div className="w-3 h-3 rounded-full border-2" style={{ backgroundColor: `${preset.c}44`, borderColor: preset.c }} />
                                    <span className="text-[8px] ml-1 font-mono">{preset.r}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
