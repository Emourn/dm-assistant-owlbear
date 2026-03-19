import { Character } from '../../../../types/character';
import { Check, Hexagon } from 'lucide-react';

interface Props {
    draft: Character;
    onUpdate: (updates: Partial<Character>) => void;
}

export function SkillsStep({ draft, onUpdate }: Props) {
    const skills = draft.skills;

    const handleToggleProficiency = (name: string) => {
        const newSkills = skills.map(s =>
            s.name === name ? { ...s, proficient: !s.proficient } : s
        );
        onUpdate({ skills: newSkills });
    };

    const handleToggleExpertise = (name: string) => {
        const newSkills = skills.map(s =>
            s.name === name ? { ...s, expertise: !s.expertise } : s
        );
        onUpdate({ skills: newSkills });
    };

    const proficientCount = skills.filter(s => s.proficient).length;

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-stone-900/30 border border-stone-800 p-6 rounded-xl space-y-2">
                <h3 className="text-xl font-cinzel font-bold text-parchment">SKILL PROFICIENCIES</h3>
                <p className="text-sm text-stone-400">
                    Review and refine your skills. You have already acquired some from your class and background.
                </p>
                <div className="pt-2">
                    <span className="text-xs font-bold text-gold uppercase tracking-widest bg-gold/10 border border-gold/20 px-3 py-1 rounded-full">
                        {proficientCount} PROFICIENT SKILLS
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {skills.map(skill => {
                    const mod = Math.floor(((draft.abilityScores[skill.stat as keyof typeof draft.abilityScores] || 10) - 10) / 2);
                    const profBonus = draft.proficiencyBonus || 2;
                    const total = mod + (skill.proficient ? profBonus : 0) + (skill.expertise ? profBonus : 0) + (skill.bonus || 0);

                    return (
                        <div
                            key={skill.name}
                            className={`p-3 rounded-lg border transition-all duration-200 flex flex-col gap-2 ${skill.proficient
                                ? 'bg-blood/5 border-blood/30 shadow-[inset_0_0_10px_rgba(139,0,0,0.1)]'
                                : 'bg-stone-900/20 border-stone-800 hover:border-stone-700'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        onClick={() => handleToggleProficiency(skill.name)}
                                        className={`w-4 h-4 rounded-sm border cursor-pointer flex items-center justify-center transition-colors ${skill.proficient ? 'bg-blood border-blood' : 'border-stone-700 bg-stone-950'
                                            }`}
                                    >
                                        {skill.proficient && <Check size={12} className="text-white" />}
                                    </div>
                                    <span className={`text-sm font-bold ${skill.proficient ? 'text-parchment' : 'text-stone-500'}`}>
                                        {skill.name}
                                    </span>
                                </div>
                                <div className={`text-xs font-bold font-cinzel ${skill.proficient ? 'text-gold' : 'text-stone-600'}`}>
                                    {total >= 0 ? `+${total}` : total}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-1 pt-2 border-t border-stone-800/50">
                                <span className="text-[9px] uppercase font-bold text-stone-600 tracking-tighter">
                                    {skill.stat} BASE
                                </span>

                                {skill.proficient && (
                                    <button
                                        onClick={() => handleToggleExpertise(skill.name)}
                                        className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-tighter transition-colors ${skill.expertise ? 'text-gold' : 'text-stone-700 hover:text-stone-500'
                                            }`}
                                    >
                                        <Hexagon size={10} fill={skill.expertise ? 'currentColor' : 'none'} />
                                        Expertise
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
