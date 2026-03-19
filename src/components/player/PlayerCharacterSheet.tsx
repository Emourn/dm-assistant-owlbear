/**
 * Player Character Sheet — Read-only view of the player's character
 * 
 * Shows ability scores, HP, AC, spell slots, inventory, conditions.
 * Editing is disabled unless the DM toggles canEditSheet.
 */

import { useMemo } from 'react';
import { Heart, Shield, Footprints, Zap, Swords, Star, Package, AlertTriangle } from 'lucide-react';
import type { Character } from '../../types/character';

interface PlayerCharacterSheetProps {
    character: Character | null;
    canEdit: boolean;
}

const ABILITY_LABELS: Record<string, string> = {
    str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA'
};

function abilityModifier(score: number): string {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function PlayerCharacterSheet({ character, canEdit }: PlayerCharacterSheetProps) {
    const usedSpellSlots = useMemo(() => {
        if (!character?.spellSlots) return 0;
        return character.spellSlots.reduce((sum, slot) => sum + (slot.max - slot.current), 0);
    }, [character?.spellSlots]);

    if (!character) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 p-6">
                <AlertTriangle className="w-10 h-10 mb-3 text-stone-600" />
                <p className="text-sm text-center">
                    No character assigned yet.<br />
                    <span className="text-stone-600">Wait for the DM to assign your character.</span>
                </p>
            </div>
        );
    }

    const hpPercent = character.maxHp > 0 ? (character.currentHp / character.maxHp) * 100 : 0;
    const hpColor = hpPercent > 60 ? 'bg-emerald-500' : hpPercent > 30 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="h-full overflow-y-auto p-4 space-y-4">
            {/* Header */}
            <div className="text-center">
                {character.portraitUrl && (
                    <img
                        src={character.portraitUrl}
                        alt={character.name}
                        className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-amber-500/50 object-cover"
                    />
                )}
                <h2 className="text-xl font-bold text-stone-100">{character.name}</h2>
                <p className="text-stone-400 text-sm">
                    Level {character.level} {character.race} {character.className}
                    {character.subclass ? ` (${character.subclass})` : ''}
                </p>
                {!canEdit && (
                    <p className="text-stone-600 text-[10px] mt-1 uppercase tracking-wider">
                        🔒 View Only
                    </p>
                )}
            </div>

            {/* HP Bar */}
            <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-400" />
                        <span className="text-stone-300 text-sm font-medium">Hit Points</span>
                    </div>
                    <span className="text-stone-200 font-mono text-sm">
                        {character.currentHp}/{character.maxHp}
                        {character.tempHp > 0 && (
                            <span className="text-blue-400 ml-1">(+{character.tempHp})</span>
                        )}
                    </span>
                </div>
                <div className="h-3 bg-stone-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${hpColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, hpPercent)}%` }}
                    />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-stone-800/50 rounded-lg p-3 text-center border border-stone-700/30">
                    <Shield className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-stone-100">{character.ac}</div>
                    <div className="text-[10px] text-stone-500 uppercase">AC</div>
                </div>
                <div className="bg-stone-800/50 rounded-lg p-3 text-center border border-stone-700/30">
                    <Footprints className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-stone-100">{character.speed}</div>
                    <div className="text-[10px] text-stone-500 uppercase">Speed</div>
                </div>
                <div className="bg-stone-800/50 rounded-lg p-3 text-center border border-stone-700/30">
                    <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-stone-100">
                        +{character.initiativeMod || 0}
                    </div>
                    <div className="text-[10px] text-stone-500 uppercase">Initiative</div>
                </div>
            </div>

            {/* Ability Scores */}
            {character.abilityScores && (
                <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                    <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">
                        Ability Scores
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.entries(character.abilityScores).map(([key, score]) => (
                            <div key={key} className="text-center bg-stone-900/50 rounded-lg py-2">
                                <div className="text-[10px] text-stone-500 uppercase">{ABILITY_LABELS[key] || key}</div>
                                <div className="text-lg font-bold text-stone-200">{score}</div>
                                <div className="text-xs text-amber-400 font-mono">{abilityModifier(score)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Spell Slots */}
            {character.spellSlots && character.spellSlots.some(s => s.max > 0) && (
                <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                    <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">
                        <Star className="w-3 h-3 inline mr-1 text-purple-400" />
                        Spell Slots {usedSpellSlots > 0 && `(${usedSpellSlots} used)`}
                    </h3>
                    <div className="grid grid-cols-5 gap-1.5">
                        {character.spellSlots.map((slot, idx) => {
                            if (slot.max === 0) return null;
                            return (
                                <div key={idx} className="text-center bg-stone-900/50 rounded py-1.5">
                                    <div className="text-[10px] text-stone-500">{idx === 0 ? 'C' : idx}</div>
                                    <div className={`text-sm font-mono ${
                                        slot.current === 0 ? 'text-red-400' : 'text-purple-300'
                                    }`}>
                                        {slot.current}/{slot.max}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Conditions */}
            {character.conditions && character.conditions.length > 0 && (
                <div className="bg-red-900/20 rounded-xl p-3 border border-red-700/30">
                    <h3 className="text-red-400 text-xs font-medium uppercase tracking-wider mb-2">
                        Active Conditions
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                        {character.conditions.map((cond: any, idx: number) => (
                            <span
                                key={idx}
                                className="bg-red-800/30 text-red-300 text-xs px-2 py-1 rounded-full"
                            >
                                {typeof cond === 'string' ? cond : cond.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Inventory (compact) */}
            {character.inventory && character.inventory.length > 0 && (
                <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                    <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-2">
                        <Package className="w-3 h-3 inline mr-1" />
                        Inventory ({character.inventory.length})
                    </h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {character.inventory.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-xs text-stone-300">
                                <span>{item.name}</span>
                                <span className="text-stone-500">x{item.quantity}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Proficiency & Saving Throws */}
            <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-700/30">
                <div className="flex items-center gap-2 text-sm">
                    <Swords className="w-3 h-3 text-amber-400" />
                    <span className="text-stone-400">Proficiency Bonus:</span>
                    <span className="text-stone-200 font-mono">+{character.proficiencyBonus}</span>
                </div>
            </div>
        </div>
    );
}
