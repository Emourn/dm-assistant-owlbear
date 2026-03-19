import { Character, StatBlock } from '../../../types/character';
import { InlineModifierToggle } from '../../common/InlineModifierToggle';
import { getAbilityModifier, getEffectiveAbilityScore, getSkillTotal } from '../../../engine/statCalculations';
import { validateSkillSelection, getSkillAllowance } from '../../../engine/rulesChoiceEngine';
import { RulesTooltip } from '../../common/RulesTooltip';

interface Props {
    data: Character;
    onChange: (field: keyof Character, value: any) => void;
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const STAT_NAMES: (keyof StatBlock)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function StatsTab({ data, onChange, addToast }: Props) {

    const handleStatChange = (stat: keyof StatBlock, val: number) => {
        onChange('abilityScores', { ...data.abilityScores, [stat]: val });
    };

    const handleSaveToggle = (stat: keyof StatBlock) => {
        const saves = new Set(data.savingThrows);
        if (saves.has(stat)) saves.delete(stat);
        else saves.add(stat);
        onChange('savingThrows', Array.from(saves));
    };

    const handleSkillToggle = (index: number, field: 'proficient' | 'expertise') => {
        const skill = data.skills[index];
        if (field === 'proficient') {
            const validation = validateSkillSelection(data, skill.name, skill.proficient);
            if (!validation.allowed) {
                if (addToast) addToast(validation.reason || 'Selection blocked', 'error');
                return;
            }
        }

        const newSkills = [...data.skills];
        newSkills[index] = { ...newSkills[index], [field]: !newSkills[index][field] };

        // If newly proficient via manual toggle, mark as Manual source
        if (field === 'proficient' && newSkills[index].proficient && !newSkills[index].source) {
            newSkills[index].source = 'Manual';
        }

        // Expertise requires proficiency
        if (field === 'expertise' && newSkills[index].expertise) {
            newSkills[index].proficient = true;
        }
        if (field === 'proficient' && !newSkills[index].proficient) {
            newSkills[index].expertise = false;
        }

        onChange('skills', newSkills);
    };

    const getBonusFromFeats = (stat: keyof StatBlock) => {
        let bonus = 0;
        for (const feat of data.feats || []) {
            if (feat.abilityScoreBonuses && feat.abilityScoreBonuses[stat]) {
                bonus += feat.abilityScoreBonuses[stat];
            }
        }
        return bonus;
    };

    const allowance = getSkillAllowance(data);
    const chosenCount = data.skills.filter(s => s.proficient && (!s.source || s.source === 'Class' || s.source === 'Manual')).length;

    const getSaveTotalLocally = (stat: keyof StatBlock) => {
        let tot = getAbilityModifier(getEffectiveAbilityScore(data, stat));
        const baseProf = Math.ceil(data.level / 4) + 1;
        if (data.savingThrows.includes(stat)) tot += baseProf;
        return tot + (data.customOverrides?.modifiers?.[`${stat}Save`] || 0);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
            {/* 1. Ability Scores (Left Column) */}
            <div className="lg:col-span-2 space-y-4">
                <h3 className="font-cinzel text-gold text-xl border-b border-stone-700/50 pb-2 mb-4 drop-shadow-sm flex items-center justify-between">
                    Abilities
                </h3>
                <div className="flex flex-col gap-3">
                    {STAT_NAMES.map(stat => (
                        <div key={stat} className="relative bg-stone-900/40 border border-stone-800/80 rounded-lg p-2 flex flex-col items-center justify-center group hover:bg-stone-800/60 transition-colors shadow-inner overflow-hidden">

                            {/* Feat Bonus Indicator */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {getBonusFromFeats(stat) > 0 && (
                                    <span className="text-[9px] text-gold font-bold px-1 bg-stone-900 rounded-sm">+{getBonusFromFeats(stat)}</span>
                                )}
                            </div>

                            {/* Stat Name */}
                            <div className="flex items-center gap-1 mb-1 relative z-10 w-full justify-center">
                                <RulesTooltip term={stat}>
                                    <span className="text-[11px] text-stone-400 font-bold uppercase tracking-widest">{stat}</span>
                                </RulesTooltip>
                            </div>

                            {/* Main Input (Base Score) */}
                            <div className="relative z-10 flex items-center justify-center w-full mb-1">
                                <input
                                    type="number" min="1" max="30"
                                    value={data.abilityScores[stat]}
                                    onChange={e => handleStatChange(stat, parseInt(e.target.value) || 10)}
                                    className={`w-14 bg-transparent text-center text-3xl font-cinzel font-bold focus:outline-none focus:text-gold hover:text-stone-300 transition-colors ${getBonusFromFeats(stat) > 0 ? 'text-gold' : 'text-parchment'}`}
                                    title={getBonusFromFeats(stat) > 0 ? `Base: ${data.abilityScores[stat]}, Effective: ${getEffectiveAbilityScore(data, stat)}` : 'Base Score'}
                                />
                            </div>

                            {/* Modifier (Large, Prominent) */}
                            <div className="text-sm font-bold bg-stone-900/80 px-4 py-0.5 rounded-full border border-stone-700/50 text-stone-300 shadow-sm relative z-10 group-hover:border-gold/50 group-hover:text-gold transition-colors" title="Modifier">
                                {getAbilityModifier(getEffectiveAbilityScore(data, stat)) >= 0 ? '+' : ''}{getAbilityModifier(getEffectiveAbilityScore(data, stat))}
                            </div>

                            {/* Saving Throw Pill (Integrated at bottom) */}
                            <div className="mt-2 w-full flex items-center justify-between bg-stone-950/50 rounded flex-row px-2 py-1 border border-stone-800/50 group-hover:border-stone-700 transition-colors">
                                <button
                                    onClick={() => handleSaveToggle(stat)}
                                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${data.savingThrows.includes(stat)
                                        ? 'bg-gold shadow-[0_0_5px_rgba(217,119,6,0.6)]'
                                        : 'bg-stone-800 border border-stone-600 hover:border-gold'
                                        }`}
                                    title="Saving Throw Proficiency"
                                />
                                <div className="flex items-center gap-1">
                                    <RulesTooltip term="Saving Throw">
                                        <span className="text-[10px] text-stone-500 font-bold uppercase">Save</span>
                                    </RulesTooltip>
                                    <span className="text-xs font-bold text-parchment">
                                        {getSaveTotalLocally(stat) >= 0 ? '+' : ''}{getSaveTotalLocally(stat)}
                                    </span>
                                </div>
                            </div>

                            {/* Override Toggle (Hidden until hover) */}
                            <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <InlineModifierToggle field={`${stat}Save`} modifiers={data.customOverrides?.modifiers} onChange={(m) => onChange('customOverrides', { ...data.customOverrides, modifiers: m })} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Skills (Middle Column) */}
            <div className="lg:col-span-10 space-y-4">
                <h3 className="font-cinzel text-gold text-xl border-b border-stone-700/50 pb-2 mb-4 drop-shadow-sm flex items-center justify-between">
                    <span>Skills</span>
                    <span className="text-[10px] uppercase tracking-tighter bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-lg text-stone-500 font-bold flex items-center gap-2">
                        <span className="opacity-60">Class Choices:</span>
                        <span className={`text-sm ${chosenCount >= allowance ? 'text-gold' : 'text-stone-300'}`}>{chosenCount}</span>
                        <span className="opacity-40">/</span>
                        <span>{allowance}</span>
                    </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                    {data.skills.map((skill, idx) => (
                        <div key={skill.name} className="flex items-center bg-transparent border-b border-stone-800/50 py-1 hover:bg-stone-800/30 transition-colors group">

                            {/* Pips (Proficient / Expertise) */}
                            <div className="flex items-center gap-1.5 mr-3">
                                <button
                                    onClick={() => handleSkillToggle(idx, 'proficient')}
                                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${skill.proficient ? 'bg-gold shadow-[0_0_5px_rgba(217,119,6,0.6)]' : 'bg-stone-800 border-2 border-stone-700 hover:border-gold/50'
                                        }`}
                                    title="Proficiency"
                                />
                                <button
                                    onClick={() => handleSkillToggle(idx, 'expertise')}
                                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${skill.expertise ? 'bg-arcane-light shadow-[0_0_5px_rgba(96,165,250,0.6)]' : 'bg-stone-800 border-2 border-stone-700 hover:border-arcane-light/50'
                                        }`}
                                    title="Expertise"
                                />
                            </div>

                            <span className="text-[10px] text-stone-500 w-7 inline-block uppercase font-bold tracking-wider">{skill.stat}</span>
                            <span className="flex-1 text-xs text-stone-300 group-hover:text-parchment truncate flex items-center gap-1.5 transition-colors">
                                <RulesTooltip term={skill.name}>
                                    {skill.name}
                                </RulesTooltip>
                                {skill.proficient && skill.source && (
                                    <span className="text-[9px] text-stone-500 font-normal italic opacity-60">
                                        ({skill.source})
                                    </span>
                                )}
                            </span>

                            <span className="flex items-center gap-1">
                                <span className={`text-sm font-bold w-6 text-right ${skill.proficient || skill.expertise ? 'text-parchment' : 'text-stone-500'}`}>
                                    {getSkillTotal(data, skill.name) >= 0 ? '+' : ''}{getSkillTotal(data, skill.name)}
                                </span>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                    <InlineModifierToggle field={skill.name} modifiers={data.customOverrides?.modifiers} onChange={(m) => onChange('customOverrides', { ...data.customOverrides, modifiers: m })} />
                                </div>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Passives & Senses (Right Column) */}
            <div className="lg:col-span-3 space-y-6">
                <div className="space-y-4">
                    <h3 className="font-cinzel text-gold text-lg border-b border-stone-700 pb-1">Passives</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center bg-stone-800/50 border border-stone-700 rounded p-2">
                            <span className="text-sm text-parchment-muted">Passive Perception</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-parchment">{10 + getSkillTotal(data, 'Perception') + (data.customOverrides?.modifiers?.passivePerception || 0)}</span>
                                <InlineModifierToggle field="passivePerception" modifiers={data.customOverrides?.modifiers} onChange={(m) => onChange('customOverrides', { ...data.customOverrides, modifiers: m })} />
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-stone-800/50 border border-stone-700 rounded p-2">
                            <span className="text-sm text-parchment-muted">Passive Investigation</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-parchment">{10 + getSkillTotal(data, 'Investigation') + (data.customOverrides?.modifiers?.passiveInvestigation || 0)}</span>
                                <InlineModifierToggle field="passiveInvestigation" modifiers={data.customOverrides?.modifiers} onChange={(m) => onChange('customOverrides', { ...data.customOverrides, modifiers: m })} />
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-stone-800/50 border border-stone-700 rounded p-2">
                            <span className="text-sm text-parchment-muted">Passive Insight</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-parchment">{10 + getSkillTotal(data, 'Insight') + (data.customOverrides?.modifiers?.passiveInsight || 0)}</span>
                                <InlineModifierToggle field="passiveInsight" modifiers={data.customOverrides?.modifiers} onChange={(m) => onChange('customOverrides', { ...data.customOverrides, modifiers: m })} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-cinzel text-gold text-lg border-b border-stone-700 pb-1">Senses & Proficiencies</h3>

                    <div className="space-y-1">
                        <label className="text-xs text-stone-400 uppercase font-semibold">Senses</label>
                        <input type="text" value={data.senses} onChange={e => onChange('senses', e.target.value)} className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-parchment focus:border-gold outline-none text-sm" placeholder="Darkvision 60ft" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-stone-400 uppercase font-semibold">Languages</label>
                        <input type="text" value={data.languages} onChange={e => onChange('languages', e.target.value)} className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-parchment focus:border-gold outline-none text-sm" placeholder="Common, Elvish" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-stone-400 uppercase font-semibold">Other Proficiencies</label>
                        <textarea value={data.proficiencies} onChange={e => onChange('proficiencies', e.target.value)} className="w-full h-20 bg-stone-900 border border-stone-700 rounded px-3 py-2 text-parchment text-sm resize-none focus:border-gold outline-none" placeholder="Light Armor, Simple Weapons, Thieves' Tools" />
                    </div>
                </div>
            </div>
        </div>
    );
}
