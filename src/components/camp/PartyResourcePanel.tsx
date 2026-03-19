import { Character, Feature, Resource } from '../../types/character';
import { Heart, Zap, Sparkles } from 'lucide-react';

interface Props {
    character: Character;
    onShortRest: () => void;
    onLongRest: () => void;
}

export function PartyResourcePanel({ character, onShortRest, onLongRest }: Props) {
    const hpPercent = Math.max(0, Math.min(100, (character.currentHp / character.maxHp) * 100));

    // hit dice
    const match = character.hitDice.match(/^(\d+)d\d+/i);
    const hdRemaining = match ? parseInt(match[1]) : character.level || 1;
    const maxHd = character.level || 1;

    // features
    const trackableFeatures = character.features.filter((f: Feature) => f.hasUses);

    // resources
    const trackableResources = character.resources;

    // spell slots
    const hasSpellSlots = character.spellSlots.some((s: { max: number }) => s.max > 0);

    return (
        <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-4 flex flex-col h-full relative overflow-hidden transition-all hover:border-gold/50">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-cinzel text-gold text-lg leading-tight truncate w-32" title={character.name}>{character.name}</h3>
                    <div className="text-xs text-stone-400 capitalize">
                        Lv{character.level} {character.className}
                    </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                    <button onClick={onShortRest} className="text-[10px] uppercase font-bold tracking-wider bg-stone-700/50 hover:bg-stone-600 border border-stone-600 text-parchment rounded px-2 py-1 transition-colors">
                        Short Rest
                    </button>
                    <button onClick={onLongRest} className="text-[10px] uppercase font-bold tracking-wider bg-stone-700/50 hover:bg-stone-600 border border-stone-600 text-parchment rounded px-2 py-1 transition-colors">
                        Long Rest
                    </button>
                </div>
            </div>

            {/* HP */}
            <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-stone-400 font-bold uppercase flex items-center gap-1.5"><Heart size={12} className="text-blood" /> HP</span>
                    <span className="text-parchment font-bold">
                        {character.currentHp} / {character.maxHp}
                        {character.tempHp > 0 && <span className="text-blue-400 ml-1">(+{character.tempHp})</span>}
                    </span>
                </div>
                <div className="h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-700">
                    <div className={`h-full transition-all duration-300 ${hpPercent > 50 ? 'bg-green-600' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-blood'}`} style={{ width: `${hpPercent}%` }} />
                </div>
            </div>

            {/* Content: Hit Dice + Spells + Features */}
            <div className="space-y-4 flex-1">
                {/* Hit Dice */}
                <div>
                    <div className="text-[10px] text-stone-400 font-bold uppercase mb-1.5 flex justify-between">
                        <span>Hit Dice</span>
                        <span>{hdRemaining} / {maxHd}</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        {Array.from({ length: maxHd }).map((_, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rotate-45 border transition-colors ${i < hdRemaining ? 'bg-blood border-blood-light/50 shadow-[0_0_5px_rgba(220,38,38,0.5)]' : 'bg-stone-900 border-stone-700'}`} />
                        ))}
                    </div>
                </div>

                {/* Spell Slots */}
                {hasSpellSlots && (
                    <div>
                        <div className="text-[10px] text-stone-400 font-bold uppercase mb-1.5 flex items-center gap-1.5"><Sparkles size={10} className="text-arcane-light" /> Spell Slots</div>
                        <div className="space-y-2 bg-stone-900/50 p-2.5 rounded border border-stone-700/50">
                            {character.spellSlots.map((slot: { max: number, current: number }, level: number) => {
                                if (level === 0 || slot.max === 0) return null;
                                return (
                                    <div key={level} className="flex items-center gap-2">
                                        <div className="text-[10px] text-stone-500 w-4 font-bold">L{level}</div>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {Array.from({ length: slot.max }).map((_, i) => (
                                                <div key={i} className={`w-2.5 h-2.5 rounded-full border transition-colors ${i < slot.current ? 'bg-arcane-light border-arcane shadow-[0_0_5px_rgba(192,132,252,0.5)]' : 'bg-stone-800 border-stone-600'}`} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Features & Resources */}
                {(trackableFeatures.length > 0 || trackableResources.length > 0) && (
                    <div>
                        <div className="text-[10px] text-stone-400 font-bold uppercase mb-1.5 flex items-center gap-1.5"><Zap size={10} className="text-gold" /> Abilities & Limits</div>
                        <div className="space-y-1.5">
                            {trackableFeatures.map((f: Feature) => (
                                <div key={f.id} className="flex justify-between items-center text-xs bg-stone-900 px-2.5 py-1.5 rounded border border-stone-700/50 hover:border-stone-600 transition-colors">
                                    <span className="text-parchment truncate w-[140px]" title={f.name}>{f.name}</span>
                                    <span className={`font-bold ${f.usesCurrent === 0 ? 'text-blood' : 'text-stone-400'}`}>{f.usesCurrent} / {f.usesMax}</span>
                                </div>
                            ))}
                            {trackableResources.map((r: Resource) => (
                                <div key={r.id} className="flex justify-between items-center text-xs bg-stone-900 px-2.5 py-1.5 rounded border border-stone-700/50 hover:border-stone-600 transition-colors">
                                    <span className="text-parchment truncate w-[140px]" title={r.name}>{r.name}</span>
                                    <span className={`font-bold ${r.current === 0 ? 'text-blood' : 'text-stone-400'}`}>{r.current} / {r.max}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
