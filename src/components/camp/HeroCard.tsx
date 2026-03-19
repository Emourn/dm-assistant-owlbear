import { useState } from 'react';
import { Character, Skill, Feature, Resource } from '../../types/character';
import { useCharacterStore } from '../../store/characterStore';
import { getArmorClassBreakdown, getInitiative, getAbilityModifier, getEffectiveAbilityScore, getProficiencyBonus, getSkillTotal, getPassiveScore, getXpRequiredForNextLevel } from '../../engine/statCalculations';
import { Heart, Shield, Zap, Footprints, ChevronDown, ChevronUp, Minus, Plus, Sparkles, ArrowUp } from 'lucide-react';
import { HoverTooltip } from '../common/HoverTooltip';
import { ABILITY_DESCRIPTIONS, SKILL_DESCRIPTIONS } from '../../data/dnd5e/tooltipDescriptions';

interface Props {
    character: Character;
    onShortRest: () => void;
    onLongRest: () => void;
}

const STAT_KEYS: (keyof Character['abilityScores'])[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function HeroCard({ character, onShortRest, onLongRest }: Props) {
    const { updateCharacter } = useCharacterStore();
    const [expandedSection, setExpandedSection] = useState<'skills' | 'actions' | 'gear' | 'spells' | 'racial' | null>(null);
    const [hpDelta, setHpDelta] = useState<string>('');
    const [showHpInput, setShowHpInput] = useState(false);
    const [xpDelta, setXpDelta] = useState<string>('');
    const [showXpInput, setShowXpInput] = useState(false);

    const hpPercent = Math.max(0, Math.min(100, (character.currentHp / character.maxHp) * 100));
    const isLowHp = hpPercent < 25;
    const isCritical = hpPercent < 10;
    const profBonus = getProficiencyBonus(character);
    const acBreakdown = getArmorClassBreakdown(character);

    // Hit dice
    const hdMatch = character.hitDice.match(/^(\d+)d(\d+)/i);
    const hdRemaining = hdMatch ? parseInt(hdMatch[1]) : character.level || 1;
    const maxHd = character.level || 1;

    // Spell slots
    const hasSpellSlots = character.spellSlots.some(s => s.max > 0);
    const allSlotsTapped = hasSpellSlots && character.spellSlots.every(s => s.max === 0 || s.current === 0);
    const hasSpells = character.spells.length > 0;

    // Concentration
    const concentratingSpell = character.conditions.find(c => c.name.toLowerCase().includes('concentrat'));

    // Equipment analysis
    const equippedItems = character.inventory.filter(i => i.isEquipped);
    const totalWeight = character.inventory.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const attunedCount = character.inventory.filter(i => i.isAttuned).length;

    // Removed unused grouping constants

    // Level-up check
    const xpForNextLevel = getXpRequiredForNextLevel(character.level);
    const currentXp = character.experience || 0;
    const readyToLevelUp = currentXp >= xpForNextLevel && character.level < 20;

    // Contextual rest hint
    const needsShortRest = hpPercent < 50 || character.features.some(f => f.hasUses && (f.usesCurrent || 0) === 0 && f.resetOn === 'short');
    const needsLongRest = allSlotsTapped || hpPercent < 25 || character.features.some(f => f.hasUses && (f.usesCurrent || 0) === 0 && f.resetOn === 'long');

    // Racial traits
    const racialTraits = character.racialTraits || [];

    // Smart currency - only show non-zero
    const currencies = character.currencies || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    const nonZeroCurrencies = Object.entries(currencies).filter(([, v]) => v > 0);
    const totalGpEquivalent = currencies.pp * 10 + currencies.gp + currencies.ep * 0.5 + currencies.sp * 0.1 + currencies.cp * 0.01;

    // HP adjustment
    const applyHpDelta = () => {
        const val = parseInt(hpDelta);
        if (isNaN(val)) return;
        const newHp = Math.max(0, Math.min(character.maxHp, character.currentHp + val));
        updateCharacter(character.id, { currentHp: newHp });
        setHpDelta('');
        setShowHpInput(false);
    };

    const applyXpDelta = () => {
        const val = parseInt(xpDelta);
        if (isNaN(val)) return;
        const newXp = Math.max(0, (character.experience || 0) + val);
        updateCharacter(character.id, { experience: newXp });
        setXpDelta('');
        setShowXpInput(false);
    };

    const toggleSection = (section: 'skills' | 'actions' | 'gear' | 'spells' | 'racial') => {
        setExpandedSection(prev => prev === section ? null : section);
    };

    // Tooltip renderers
    const renderAbilityTooltip = (stat: keyof Character['abilityScores']) => {
        const desc = ABILITY_DESCRIPTIONS[stat];
        if (!desc) return null;
        const score = getEffectiveAbilityScore(character, stat);
        const mod = getAbilityModifier(score);
        const isSaveProf = character.savingThrows?.includes(stat);
        const saveMod = mod + (isSaveProf ? profBonus : 0);
        return (
            <div className="space-y-2 text-stone-300">
                <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">{desc.name} ({score})</div>
                <p className="leading-relaxed">{desc.description}</p>
                <div className="bg-stone-800/50 rounded p-2 space-y-1">
                    <div className="text-[10px] text-stone-500 uppercase font-bold">Saving Throws</div>
                    <div className="text-stone-400">{desc.saves}</div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`font-bold ${isSaveProf ? 'text-gold' : 'text-stone-500'}`}>
                            {isSaveProf ? '● Proficient' : '○ Not proficient'}
                        </span>
                        <span className="text-parchment font-mono font-bold">{saveMod >= 0 ? '+' : ''}{saveMod}</span>
                    </div>
                </div>
                {desc.skills.length > 0 && (
                    <div className="text-[10px] text-stone-500">
                        <span className="uppercase font-bold">Related Skills:</span> {desc.skills.join(', ')}
                    </div>
                )}
            </div>
        );
    };

    const renderSkillTooltip = (skill: Skill) => {
        const desc = SKILL_DESCRIPTIONS[skill.name];
        const total = getSkillTotal(character, skill.name);
        if (!desc) return <div className="text-stone-400">{skill.name}: {total >= 0 ? '+' : ''}{total}</div>;
        return (
            <div className="space-y-2 text-stone-300">
                <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1 flex justify-between items-center">
                    <span>{skill.name}</span>
                    <span className="font-mono text-parchment">{total >= 0 ? '+' : ''}{total}</span>
                </div>
                <p className="leading-relaxed">{desc.description}</p>
                <div className="bg-stone-800/50 rounded p-2 text-stone-400">
                    <div className="text-[10px] text-gold uppercase font-bold mb-1">📋 When to use</div>
                    {desc.whenToUse}
                </div>
                <div className="text-[10px] text-stone-500 bg-stone-800/30 rounded p-2 font-mono">{desc.exampleDC}</div>
                <div className="flex items-center gap-2 text-[10px]">
                    <span className={skill.proficient ? 'text-gold' : 'text-stone-600'}>{skill.proficient ? '● Proficient' : '○ Not proficient'}</span>
                    {skill.expertise && <span className="text-arcane-light">◆ Expertise</span>}
                    <span className="text-stone-600">· {skill.stat.toUpperCase()} based</span>
                </div>
            </div>
        );
    };

    const renderItemTooltip = (item: any) => (
        <div className="space-y-1.5 text-stone-300">
            <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">{item.name}</div>
            <div className="flex gap-3 text-[10px] text-stone-500">
                <span className="capitalize">{item.type}</span>
                {item.weight > 0 && <span>{item.weight} lb</span>}
                {item.quantity > 1 && <span>×{item.quantity}</span>}
                {item.isEquipped && <span className="text-gold">Equipped</span>}
                {item.isAttuned && <span className="text-arcane-light">Attuned</span>}
            </div>
            {item.damage && <div className="text-blood-light text-xs">⚔ Damage: {item.damage}</div>}
            {item.acBonus && <div className="text-xs text-stone-400">🛡 AC: {item.acBonus}</div>}
            {item.description && <p className="text-[11px] text-stone-400 leading-relaxed">{item.description}</p>}
        </div>
    );

    const renderFeatureTooltip = (feature: Feature) => (
        <div className="space-y-1.5 text-stone-300">
            <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">{feature.name}</div>
            {feature.source && <div className="text-[10px] text-stone-500">{feature.source}</div>}
            {feature.description && <p className="text-[11px] leading-relaxed">{feature.description}</p>}
            {feature.hasUses && (
                <div className="text-[10px] text-stone-500 bg-stone-800/50 rounded p-1.5 mt-1">
                    Uses: {feature.usesCurrent || 0}/{feature.usesMax || 0}
                    {feature.resetOn && <span className="ml-2">(Resets on {feature.resetOn} rest)</span>}
                </div>
            )}
        </div>
    );

    const renderSpellTooltip = (spell: any) => (
        <div className="space-y-1.5 text-stone-300">
            <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">{spell.name}</div>
            <div className="flex flex-wrap gap-2 text-[10px] text-stone-500">
                <span>{spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}</span>
                {spell.school && <span>{spell.school}</span>}
                {spell.concentration && <span className="text-arcane-light">Concentration</span>}
                {spell.ritual && <span className="text-veil">Ritual</span>}
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-stone-400">
                {spell.castingTime && <div><strong className="text-stone-500">Cast:</strong> {spell.castingTime}</div>}
                {spell.range && <div><strong className="text-stone-500">Range:</strong> {spell.range}</div>}
                {spell.duration && <div><strong className="text-stone-500">Duration:</strong> {spell.duration}</div>}
                {spell.components && <div><strong className="text-stone-500">Comp:</strong> {[spell.components.v && 'V', spell.components.s && 'S', spell.components.m && 'M'].filter(Boolean).join(', ')}</div>}
            </div>
            {spell.description && <p className="text-[11px] leading-relaxed mt-1">{spell.description}</p>}
        </div>
    );

    const renderACTooltip = () => (
        <div className="space-y-1.5 text-stone-300">
            <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">Armor Class Breakdown</div>
            {!acBreakdown.isOverridden ? (
                <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between"><span>Base ({acBreakdown.source})</span><span>{acBreakdown.base}</span></div>
                    <div className="flex justify-between"><span>DEX Modifier {acBreakdown.dexCap !== null && `(Max ${acBreakdown.dexCap})`}</span><span>+{acBreakdown.dexBonus}</span></div>
                    <div className="flex justify-between"><span>Shield</span><span>+{acBreakdown.shieldBonus}</span></div>
                    {acBreakdown.modifierBonus !== 0 && (
                        <div className="flex justify-between text-gold"><span>Modifiers</span><span>{acBreakdown.modifierBonus > 0 ? '+' : ''}{acBreakdown.modifierBonus}</span></div>
                    )}
                    <div className="border-t border-stone-700 pt-1 mt-1 flex justify-between font-bold text-parchment"><span>Total</span><span>{acBreakdown.total}</span></div>
                </div>
            ) : (
                <div className="text-gold italic">DM Override active</div>
            )}
            <div className="text-[10px] text-stone-500 mt-2">Armor Class determines what attack rolls need to match or exceed to hit you.</div>
        </div>
    );



    return (
        <div className={`bg-stone-800/80 border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-stone-900/50
            ${isCritical ? 'border-blood animate-pulse-slow' : isLowHp ? 'border-yellow-600/50' : concentratingSpell ? 'border-arcane/50 shadow-arcane/10' : 'border-stone-700 hover:border-gold/30'}`}>

            {/* Header: Name + Level + Class */}
            <div className="px-4 pt-3 pb-2 border-b border-stone-700/50">
                <div className="flex justify-between items-start gap-3">
                    {character.portraitUrl && (
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-gold/30 shadow-[0_0_8px_rgba(217,119,6,0.15)] bg-stone-900">
                            <img src={character.portraitUrl} alt={character.name} className="w-full h-full object-cover scale-[1.1] transition-transform duration-500 hover:scale-125" />
                        </div>
                    )}
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-cinzel text-gold text-lg leading-tight line-clamp-2" title={character.name}>{character.name}</h3>
                            {readyToLevelUp && (
                                <span className="flex items-center gap-0.5 text-[9px] bg-gold/20 text-gold border border-gold/40 rounded-full px-1.5 py-0.5 font-bold animate-pulse whitespace-nowrap">
                                    <ArrowUp size={10} /> Level Up!
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-stone-400 capitalize">
                            {character.race} {character.className}{character.subclass ? ` (${character.subclass})` : ''}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-xs text-stone-500 uppercase font-bold flex items-center justify-end gap-2">
                            <span>Lv {character.level}</span>
                            <div className="flex gap-1">
                                {showXpInput ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={xpDelta}
                                            onChange={e => setXpDelta(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && applyXpDelta()}
                                            className="w-10 bg-stone-900 border border-stone-700 rounded px-1 text-[10px] text-parchment"
                                            placeholder="+XP"
                                            autoFocus
                                        />
                                        <button type="button" onClick={applyXpDelta} className="text-green-500 text-[10px] font-bold">✓</button>
                                        <button type="button" onClick={() => setShowXpInput(false)} className="text-stone-600 text-[10px]">✕</button>
                                    </div>
                                ) : (
                                    <HoverTooltip content={
                                        <div className="space-y-1 text-stone-300">
                                            <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">Experience Points</div>
                                            <div className="font-mono text-[11px] bg-stone-800/50 rounded p-1.5 flex justify-between">
                                                <span>Current: {character.experience || 0}</span>
                                                <span>Next Lvl: {xpForNextLevel}</span>
                                            </div>
                                            {readyToLevelUp && <p className="text-gold font-bold text-[11px]">⬆ Ready to level up!</p>}
                                            <p className="text-[11px] italic text-stone-400">XP required varies by level in official 5e rules.</p>
                                        </div>
                                    }>
                                        <button type="button" onClick={() => setShowXpInput(true)} className="flex items-center gap-1 text-[9px] text-arcane hover:text-arcane-light transition-colors border border-stone-700 hover:border-arcane rounded px-1" title="Add XP">
                                            <Sparkles size={8} /> {character.experience || 0} / {xpForNextLevel} XP
                                        </button>
                                    </HoverTooltip>
                                )}
                            </div>
                        </div>
                        {character.playerName && <div className="text-[10px] text-stone-600 italic mt-0.5">{character.playerName}</div>}
                    </div>
                </div>
                {character.conditions.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                        {character.conditions.map(c => (
                            <span key={c.id} className="text-[9px] bg-blood/20 text-blood-light border border-blood/30 rounded px-1.5 py-0.5 uppercase font-bold truncate max-w-[100px]" title={c.name}>
                                {c.name}
                            </span>
                        ))}
                    </div>
                )}
                {concentratingSpell && (
                    <div className="text-[10px] text-arcane-light flex items-center gap-1 mt-1">
                        <Sparkles size={10} /> Concentrating
                    </div>
                )}
            </div>

            {/* HP Bar */}
            <div className="px-4 py-2 border-b border-stone-700/30">
                <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-stone-400 font-bold uppercase flex items-center gap-1"><Heart size={12} className="text-blood" /> HP</span>
                    <div className="flex items-center gap-2">
                        {showHpInput ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={hpDelta}
                                    onChange={e => setHpDelta(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && applyHpDelta()}
                                    className="w-12 bg-stone-900 border border-stone-700 rounded px-1 py-0.5 text-xs text-center text-parchment"
                                    placeholder="-5"
                                    autoFocus
                                />
                                <button type="button" onClick={applyHpDelta} className="text-green-500 text-[10px] font-bold">✓</button>
                                <button type="button" onClick={() => setShowHpInput(false)} className="text-stone-600 text-[10px]">✕</button>
                            </div>
                        ) : (
                            <>
                                <span className="text-parchment font-bold">
                                    {character.currentHp} / {character.maxHp}
                                    {character.tempHp > 0 && <span className="text-blue-400 ml-1">(+{character.tempHp})</span>}
                                </span>
                                <button type="button" onClick={() => setShowHpInput(true)} className="text-stone-600 hover:text-parchment transition-colors" title="Adjust HP">
                                    <Minus size={10} />/<Plus size={10} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-700">
                    <div className={`h-full transition-all duration-500 ${hpPercent > 50 ? 'bg-green-600' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-blood'}`} style={{ width: `${hpPercent}%` }} />
                </div>
            </div>

            {/* Core Combat Stats Row */}
            <div className="px-4 py-2 grid grid-cols-3 gap-2 border-b border-stone-700/30">
                <HoverTooltip content={renderACTooltip()}>
                    <div className="flex flex-col items-center cursor-help">
                        <Shield size={14} className="text-stone-500 mb-0.5" />
                        <span className="font-cinzel font-bold text-parchment text-lg leading-none">{acBreakdown.total}</span>
                        <span className="text-[9px] text-stone-500 uppercase">AC</span>
                    </div>
                </HoverTooltip>
                <HoverTooltip content={
                    <div className="space-y-1 text-stone-300">
                        <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">Initiative</div>
                        <p className="text-[11px]">Initiative determines the order of turns during combat.</p>
                        <div className="font-mono text-[11px] bg-stone-800/50 rounded p-1.5">DEX Modifier ({getAbilityModifier(getEffectiveAbilityScore(character, 'dex')) >= 0 ? '+' : ''}{getAbilityModifier(getEffectiveAbilityScore(character, 'dex'))}) + Modifiers = {getInitiative(character) >= 0 ? '+' : ''}{getInitiative(character)}</div>
                    </div>
                }>
                    <div className="flex flex-col items-center cursor-help">
                        <Zap size={14} className="text-gold-light mb-0.5" />
                        <span className="font-cinzel font-bold text-parchment text-lg leading-none">{getInitiative(character) >= 0 ? '+' : ''}{getInitiative(character)}</span>
                        <span className="text-[9px] text-stone-500 uppercase">Init</span>
                    </div>
                </HoverTooltip>
                <HoverTooltip content={
                    <div className="space-y-1 text-stone-300">
                        <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">Speed</div>
                        <p className="text-[11px]">Speed determines how far you can move on your turn during combat. Your movement can be split — you can move, attack, then move again.</p>
                    </div>
                }>
                    <div className="flex flex-col items-center justify-center cursor-help text-center">
                        <Footprints size={14} className="text-stone-500 mb-0.5" />
                        <span className={`font-cinzel font-bold text-parchment leading-tight ${String(character.speed || '').length > 8 ? 'text-sm' : 'text-lg'}`}>{character.speed || '30 ft'}</span>
                        <span className="text-[9px] text-stone-500 uppercase">Spd</span>
                    </div>
                </HoverTooltip>
            </div>

            {/* Ability Scores Row */}
            <div className="px-3 py-2 border-b border-stone-700/30">
                <div className="grid grid-cols-6 gap-1 text-center">
                    {STAT_KEYS.map(stat => {
                        const score = getEffectiveAbilityScore(character, stat);
                        const mod = getAbilityModifier(score);
                        const isSaveProf = character.savingThrows?.includes(stat);
                        return (
                            <HoverTooltip key={stat} content={renderAbilityTooltip(stat)}>
                                <div className="flex flex-col items-center cursor-help">
                                    <div className={`text-[9px] uppercase font-bold ${isSaveProf ? 'text-gold' : 'text-stone-500'}`}>{stat}</div>
                                    <div className="text-sm font-bold text-parchment">{score}</div>
                                    <div className={`text-[10px] ${mod >= 0 ? 'text-green-500' : 'text-blood'}`}>{mod >= 0 ? '+' : ''}{mod}</div>
                                </div>
                            </HoverTooltip>
                        );
                    })}
                </div>
            </div>

            {/* Quick Info Row */}
            <div className="px-4 py-1.5 border-b border-stone-700/30 flex justify-between text-[10px] text-stone-400">
                <HoverTooltip content={
                    <div className="space-y-1 text-stone-300">
                        <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">Proficiency Bonus</div>
                        <p className="text-[11px]">Added to attack rolls, saving throws, and skill checks where you are proficient. Determined by total character level.</p>
                        <div className="font-mono text-[11px] bg-stone-800/50 rounded p-1.5">Level {character.level} → +{profBonus}</div>
                    </div>
                }><span className="cursor-help">🎯 Prof: +{profBonus}</span></HoverTooltip>
                <HoverTooltip content={
                    <div className="space-y-1 text-stone-300">
                        <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">Currency</div>
                        <div className="font-mono text-[11px] bg-stone-800/50 rounded p-1.5 space-y-0.5">
                            {currencies.pp > 0 && <div className="flex justify-between"><span>Platinum</span><span>{currencies.pp} pp</span></div>}
                            {currencies.gp > 0 && <div className="flex justify-between"><span>Gold</span><span>{currencies.gp} gp</span></div>}
                            {currencies.ep > 0 && <div className="flex justify-between"><span>Electrum</span><span>{currencies.ep} ep</span></div>}
                            {currencies.sp > 0 && <div className="flex justify-between"><span>Silver</span><span>{currencies.sp} sp</span></div>}
                            {currencies.cp > 0 && <div className="flex justify-between"><span>Copper</span><span>{currencies.cp} cp</span></div>}
                            <div className="border-t border-stone-700 pt-1 mt-1 flex justify-between font-bold text-gold"><span>Total</span><span>≈ {totalGpEquivalent.toFixed(1)} gp</span></div>
                        </div>
                    </div>
                }><span className="cursor-help">💰 {nonZeroCurrencies.length > 0 ? nonZeroCurrencies.map(([k, v]) => `${v}${k}`).join(' ') : '0 gp'}</span></HoverTooltip>
                <HoverTooltip content={
                    <div className="space-y-1 text-stone-300">
                        <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">Encumbrance</div>
                        <p className="text-[11px]">Carrying capacity = STR × 15 = {(getEffectiveAbilityScore(character, 'str') * 15)} lbs. Encumbered at {(getEffectiveAbilityScore(character, 'str') * 5)} lbs (speed −10 ft). Heavily encumbered at {(getEffectiveAbilityScore(character, 'str') * 10)} lbs (speed −20 ft).</p>
                        <div className="font-mono text-[11px] bg-stone-800/50 rounded p-1.5">Current: {totalWeight.toFixed(1)} / {(getEffectiveAbilityScore(character, 'str') * 15)} lbs</div>
                    </div>
                }><span className="cursor-help">⚖ {totalWeight.toFixed(1)} lbs</span></HoverTooltip>
            </div>

            {/* Spell Slots & Hit Dice Pips */}
            <div className="px-4 py-2 border-b border-stone-700/30 space-y-1.5">
                {/* Hit Dice */}
                <div className="flex items-center justify-between">
                    <HoverTooltip content={
                        <div className="space-y-1 text-stone-300">
                            <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">Hit Dice</div>
                            <p className="text-[11px]">During a short rest, you can spend Hit Dice to recover HP. Roll the die + CON modifier per die spent. You regain half your total Hit Dice (minimum 1) on a long rest.</p>
                            <div className="font-mono text-[11px] bg-stone-800/50 rounded p-1.5">{character.hitDice} · Each heals 1d{hdMatch?.[2] || '?'} + CON mod</div>
                        </div>
                    }>
                        <span className="text-[10px] text-stone-500 font-bold uppercase cursor-help">Hit Dice</span>
                    </HoverTooltip>
                    <div className="flex gap-1 items-center">
                        {Array.from({ length: Math.min(maxHd, 20) }).map((_, i) => (
                            <div key={i} className={`w-2 h-2 rotate-45 border transition-colors ${i < hdRemaining ? 'bg-blood border-blood-light/50' : 'bg-stone-900 border-stone-700'}`} />
                        ))}
                        <span className="text-[10px] text-stone-500 ml-1">{hdRemaining}/{maxHd}</span>
                    </div>
                </div>

                {/* Spell Slots */}
                {hasSpellSlots && character.spellSlots.map((slot, level) => {
                    if (level === 0 || slot.max === 0) return null;
                    return (
                        <div key={level} className="flex items-center justify-between">
                            <span className="text-[10px] text-stone-500 font-bold">L{level}</span>
                            <div className="flex gap-1 items-center">
                                {Array.from({ length: slot.max }).map((_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                            const newSlots = [...character.spellSlots];
                                            if (i < slot.current) {
                                                newSlots[level] = { ...slot, current: slot.current - 1 };
                                            } else {
                                                newSlots[level] = { ...slot, current: Math.min(slot.max, slot.current + 1) };
                                            }
                                            updateCharacter(character.id, { spellSlots: newSlots });
                                        }}
                                        className={`w-2.5 h-2.5 rounded-full border transition-colors cursor-pointer ${i < slot.current ? 'bg-arcane-light border-arcane shadow-[0_0_4px_rgba(192,132,252,0.4)]' : 'bg-stone-800 border-stone-600 hover:border-arcane/50'}`}
                                        title={i < slot.current ? `Spend Level ${level} slot` : `Regain Level ${level} slot`}
                                    />
                                ))}
                                <span className="text-[10px] text-stone-500 ml-1">{slot.current}/{slot.max}</span>
                            </div>
                        </div>
                    );
                })}

                {/* Attuned Items Counter */}
                {attunedCount > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-stone-500 font-bold uppercase">Attuned</span>
                        <span className={`text-[10px] font-bold ${attunedCount >= 3 ? 'text-blood' : 'text-arcane-light'}`}>⚡ {attunedCount}/3</span>
                    </div>
                )}
            </div>

            {/* Rest Buttons — with contextual glow */}
            <div className="px-4 py-2 flex gap-2 border-b border-stone-700/30">
                <HoverTooltip content={
                    <div className="space-y-1 text-stone-300">
                        <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">Short Rest</div>
                        <p className="text-[11px]">A short rest is at least 1 hour long. During it, a character can spend Hit Dice to regain HP (roll each + CON modifier). Some class features recharge on a short rest.</p>
                    </div>
                }>
                    <button
                        type="button"
                        onClick={onShortRest}
                        className={`flex-1 text-[10px] uppercase font-bold tracking-wider border text-parchment rounded py-1.5 transition-all
                            ${needsShortRest ? 'bg-yellow-900/20 border-yellow-600/50 hover:bg-yellow-800/30 shadow-[0_0_6px_rgba(202,138,4,0.15)]' : 'bg-stone-700/30 hover:bg-stone-600/50 border-stone-600/50'}`}
                    >
                        Short Rest
                    </button>
                </HoverTooltip>
                <HoverTooltip content={
                    <div className="space-y-1 text-stone-300">
                        <div className="font-cinzel font-bold text-gold border-b border-stone-700 pb-1">Long Rest</div>
                        <p className="text-[11px]">A long rest is at least 8 hours. It restores all HP, all spell slots, half total Hit Dice (minimum 1), and resets all features. Exhaustion is reduced by 1.</p>
                    </div>
                }>
                    <button
                        type="button"
                        onClick={onLongRest}
                        className={`flex-1 text-[10px] uppercase font-bold tracking-wider border text-parchment rounded py-1.5 transition-all
                            ${needsLongRest ? 'bg-blue-900/20 border-blue-500/40 hover:bg-blue-800/30 shadow-[0_0_6px_rgba(59,130,246,0.15)]' : 'bg-stone-700/30 hover:bg-stone-600/50 border-stone-600/50'}`}
                    >
                        Long Rest
                    </button>
                </HoverTooltip>
            </div>

            {/* Expandable Drawers */}
            <div className="divide-y divide-stone-700/30">
                {/* Skills Drawer */}
                <DrawerToggle label="Skills" isOpen={expandedSection === 'skills'} onToggle={() => toggleSection('skills')} />
                {expandedSection === 'skills' && (
                    <div className="px-3 py-2 bg-stone-900/30 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                            {character.skills.map((skill: Skill) => {
                                const total = getSkillTotal(character, skill.name);
                                return (
                                    <HoverTooltip key={skill.name} content={renderSkillTooltip(skill)}>
                                        <div className="flex justify-between items-center text-[11px] py-0.5 cursor-help w-full gap-2">
                                            <span className={`${skill.proficient ? 'text-parchment' : 'text-stone-500'} pr-1 line-clamp-1`}>
                                                {skill.expertise ? '◆ ' : skill.proficient ? '● ' : ''}{skill.name}
                                            </span>
                                            <span className={`font-mono font-bold shrink-0 ${total >= 0 ? 'text-green-500' : 'text-blood'}`}>{total >= 0 ? '+' : ''}{total}</span>
                                        </div>
                                    </HoverTooltip>
                                );
                            })}
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-stone-800 text-[10px] text-stone-500 flex justify-between">
                            <span>Passive Perc: {getPassiveScore(character, 'Perception')}</span>
                            <span>Inv: {getPassiveScore(character, 'Investigation')}</span>
                            <span>Ins: {getPassiveScore(character, 'Insight')}</span>
                        </div>
                    </div>
                )}

                {/* Actions Drawer */}
                <DrawerToggle label="Actions & Features" isOpen={expandedSection === 'actions'} onToggle={() => toggleSection('actions')} />
                {expandedSection === 'actions' && (
                    <div className="px-3 py-2 bg-stone-900/30 animate-in fade-in slide-in-from-top-2 duration-200 space-y-1">
                        {/* Weapons */}
                        {equippedItems.filter(i => i.type === 'weapon').map(weapon => (
                            <HoverTooltip key={weapon.id} content={renderItemTooltip(weapon)}>
                                <div className="flex justify-between text-[11px] text-parchment cursor-help w-full gap-2 py-0.5">
                                    <span className="pr-1 line-clamp-2">⚔ {weapon.name}</span>
                                    <span className="text-stone-400 shrink-0">{weapon.damage || '—'}</span>
                                </div>
                            </HoverTooltip>
                        ))}
                        {/* Features with uses */}
                        {character.features.filter((f: Feature) => f.hasUses).map((f: Feature) => (
                            <HoverTooltip key={f.id} content={renderFeatureTooltip(f)}>
                                <div className="flex justify-between text-[11px] cursor-help w-full gap-2 py-0.5">
                                    <span className="text-parchment pr-1 line-clamp-2">✦ {f.name}</span>
                                    <span className={`font-bold shrink-0 ${(f.usesCurrent || 0) === 0 ? 'text-blood' : 'text-stone-400'}`}>{f.usesCurrent || 0}/{f.usesMax || 0}</span>
                                </div>
                            </HoverTooltip>
                        ))}
                        {/* Resources */}
                        {character.resources.map((r: Resource) => (
                            <div key={r.id} className="flex justify-between text-[11px] gap-2 py-0.5">
                                <span className="text-parchment pr-1 line-clamp-2">⚡ {r.name}</span>
                                <span className={`font-bold shrink-0 ${r.current === 0 ? 'text-blood' : 'text-stone-400'}`}>{r.current}/{r.max}</span>
                            </div>
                        ))}
                        {/* Cantrips */}
                        {character.spells.filter(s => s.level === 0).length > 0 && (
                            <div className="text-[11px] text-stone-400 pt-1 border-t border-stone-800 mt-1">
                                <span className="text-stone-500 uppercase text-[9px] font-bold">Cantrips: </span>
                                {character.spells.filter(s => s.level === 0).map((s, i) => (
                                    <HoverTooltip key={s.id || i} content={renderSpellTooltip(s)}>
                                        <span className="cursor-help hover:text-parchment transition-colors">{s.name}{i < character.spells.filter(sp => sp.level === 0).length - 1 ? ', ' : ''}</span>
                                    </HoverTooltip>
                                ))}
                            </div>
                        )}
                        {equippedItems.filter(i => i.type === 'weapon').length === 0 && character.features.filter((f: Feature) => f.hasUses).length === 0 && character.resources.length === 0 && (
                            <div className="text-[10px] text-stone-600 italic">No trackable actions</div>
                        )}
                    </div>
                )}

                {/* Racial Traits Drawer */}
                {racialTraits.length > 0 && (
                    <>
                        <DrawerToggle label={`Racial Traits (${racialTraits.length})`} isOpen={expandedSection === 'racial'} onToggle={() => toggleSection('racial')} />
                        {expandedSection === 'racial' && (
                            <div className="px-3 py-2 bg-stone-900/30 animate-in fade-in slide-in-from-top-2 duration-200 space-y-0.5">
                                {racialTraits.map((trait: Feature) => (
                                    <HoverTooltip key={trait.id} content={renderFeatureTooltip(trait)}>
                                        <div className="flex justify-between text-[11px] cursor-help w-full gap-2 py-0.5">
                                            <span className="text-parchment pr-1 line-clamp-2">🧬 {trait.name}</span>
                                            <span className="text-stone-600 text-[10px] shrink-0">{trait.source?.replace('Race: ', '') || ''}</span>
                                        </div>
                                    </HoverTooltip>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Spells Drawer */}
                {hasSpells && (
                    <>
                        <DrawerToggle label={`Spells (${character.spells.length})`} isOpen={expandedSection === 'spells'} onToggle={() => toggleSection('spells')} />
                        {expandedSection === 'spells' && (
                            <div className="px-3 py-2 bg-stone-900/30 animate-in fade-in slide-in-from-top-2 duration-200 space-y-0.5">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => {
                                    const levelSpells = character.spells.filter(s => s.level === level);
                                    if (levelSpells.length === 0) return null;
                                    return (
                                        <div key={level}>
                                            <div className="text-[9px] text-stone-600 uppercase font-bold mt-1">{level === 0 ? 'Cantrips' : `Level ${level}`}</div>
                                            {levelSpells.map(spell => (
                                                <HoverTooltip key={spell.id} content={renderSpellTooltip(spell)}>
                                                    <div className="flex justify-between text-[11px] cursor-help w-full gap-2 py-0.5">
                                                        <span className="text-parchment pr-1 line-clamp-2">
                                                            {spell.concentration ? '🔮 ' : '✨ '}{spell.name}
                                                        </span>
                                                        <span className="text-stone-500 text-[10px] shrink-0 text-right">{spell.school}</span>
                                                    </div>
                                                </HoverTooltip>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Gear Drawer — Clean List */}
                <DrawerToggle label={`Inventory (${character.inventory.length})`} isOpen={expandedSection === 'gear'} onToggle={() => toggleSection('gear')} />
                {expandedSection === 'gear' && (
                    <div className="px-3 py-2 bg-stone-900/30 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-48 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
                            {[...character.inventory]
                                .sort((a, b) => {
                                    // Sort: Equipped first, then by type, then alphabetical
                                    if (a.isEquipped && !b.isEquipped) return -1;
                                    if (!a.isEquipped && b.isEquipped) return 1;
                                    if (a.type !== b.type) return a.type.localeCompare(b.type);
                                    return a.name.localeCompare(b.name);
                                })
                                .map(item => (
                                    <HoverTooltip key={item.id} content={renderItemTooltip(item)}>
                                        <div className="flex justify-between items-center text-[11px] cursor-help w-full gap-2 py-0.5 group">
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.isEquipped ? 'bg-gold' : 'bg-stone-700/50 group-hover:bg-stone-600'}`} />
                                                <span className={`${item.isEquipped ? 'text-parchment font-medium' : 'text-stone-400 group-hover:text-stone-300'} truncate transition-colors`}>
                                                    {item.name}
                                                    {item.isAttuned && <span className="text-arcane ml-1" title="Attuned">⚡</span>}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-stone-500 font-mono">
                                                {item.damage && <span className="text-blood-light/70">{item.damage.split(' ')[0]}</span>}
                                                {item.acBonus && <span className="text-stone-400">AC+{item.acBonus}</span>}
                                                {item.quantity > 1 && <span>×{item.quantity}</span>}
                                            </div>
                                        </div>
                                    </HoverTooltip>
                                ))}
                            {character.inventory.length === 0 && (
                                <div className="text-[10px] text-stone-600 italic text-center py-2">Inventory empty</div>
                            )}
                        </div>

                        {/* Currency footer */}
                        <div className="flex justify-between items-center text-[10px] text-stone-500 pt-2 border-t border-stone-800/50 mt-1.5">
                            <span className="font-mono">{nonZeroCurrencies.map(([k, v]) => `${v}${k}`).join(' ') || 'No coin'}</span>
                            {totalGpEquivalent > 0 && <span className="text-gold/80 font-bold">≈ {totalGpEquivalent.toFixed(1)} gp</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DrawerToggle({ label, isOpen, onToggle }: { label: string; isOpen: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-between px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider text-stone-500 hover:text-parchment hover:bg-stone-800/30 transition-colors"
        >
            <span>{label}</span>
            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
    );
}
