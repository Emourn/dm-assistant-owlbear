import { useState } from 'react';
import { Character } from '../../../../types/character';
import { Sword, Check, Search } from 'lucide-react';
import { FiveEToolsModal } from '../../../common/FiveEToolsModal';
import { ChoiceWizardModal } from '../../../common/ChoiceWizardModal';
import { buildClassWizard, ImportWizardData } from '../../../../engine/importWizardBuilder';
import { getHitDie, getClassSpellcastingAbility, calculateMaxHP } from '../../../../engine/rulesEngine';
import { resolveAllChoices } from '../../../../engine/rulesChoiceEngine';
import { automateCharacter } from '../../../../engine/characterAutomation';

interface Props {
    draft: Character;
    onUpdate: (updates: Partial<Character>) => void;
}

const SAVE_KEY_MAP: Record<string, keyof Character['abilityScores']> = {
    str: 'str',
    strength: 'str',
    dex: 'dex',
    dexterity: 'dex',
    con: 'con',
    constitution: 'con',
    int: 'int',
    intelligence: 'int',
    wis: 'wis',
    wisdom: 'wis',
    cha: 'cha',
    charisma: 'cha'
};

export function ClassStep({ draft, onUpdate }: Props) {
    const [isSearching, setIsSearching] = useState(false);
    const [wizardData, setWizardData] = useState<ImportWizardData | null>(null);

    const handleSelectClass = (cls: { name: string; source?: string; savesRaw?: string[] }) => {
        setWizardData(buildClassWizard(cls));
        setIsSearching(false);
    };

    const handleWizardComplete = async (selections: Record<string, unknown[]>) => {
        if (!wizardData) return;
        const cls = wizardData.originalData as { name: string; savesRaw?: string[] };

        // Use the centralized resolver to apply all choices (skills, eq, features)
        const updatedCharacter = await resolveAllChoices(draft, selections, cls, 'class');

        const dieSize = getHitDie(cls.name);
        const spellAbility = getClassSpellcastingAbility(cls.name);
        const automatedCharacter = await automateCharacter({
            ...updatedCharacter,
            className: cls.name,
            hitDice: `1d${dieSize}`,
            maxHp: calculateMaxHP({ ...updatedCharacter, level: 1, hitDice: `1d${dieSize}` }),
            currentHp: calculateMaxHP({ ...updatedCharacter, level: 1, hitDice: `1d${dieSize}` }),
            spellcastingAbility: spellAbility,
            savingThrows: cls.savesRaw
                ? cls.savesRaw
                    .map((s: string) => SAVE_KEY_MAP[s.toLowerCase().trim()])
                    .filter((s): s is keyof Character['abilityScores'] => Boolean(s))
                : []
        });

        onUpdate({
            ...automatedCharacter,
            className: cls.name
        });

        setWizardData(null);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-stone-800 rounded-full flex items-center justify-center mx-auto border-2 border-stone-700">
                    <Sword size={40} className="text-stone-500" />
                </div>

                {draft.className ? (
                    <div className="space-y-2">
                        <h3 className="text-2xl font-cinzel font-bold text-gold">{draft.className}</h3>
                        <p className="text-stone-400 text-sm max-w-md mx-auto">
                            The {draft.className} path determines your combat style, saving throws, and primary abilities.
                        </p>
                        <button
                            onClick={() => setIsSearching(true)}
                            className="text-stone-500 hover:text-gold text-xs font-bold uppercase tracking-widest transition-colors mt-4"
                        >
                            Change Class
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h3 className="text-xl font-cinzel font-bold text-parchment">DEFINE YOUR CALLING</h3>
                        <p className="text-stone-400 text-sm max-w-md mx-auto">
                            Your class represents your vocation and training. It defines how you interact with the world and combat.
                        </p>
                        <button
                            onClick={() => setIsSearching(true)}
                            className="bg-gold text-stone-950 px-8 py-3 rounded-lg font-cinzel font-bold tracking-widest hover:bg-gold-light transition-all shadow-lg flex items-center gap-2 mx-auto"
                        >
                            <Search size={18} />
                            BROWSE CLASSES
                        </button>
                    </div>
                )}
            </div>

            {/* Class Details Preview */}
            {draft.className && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-stone-900/30 border border-stone-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-gold mb-2">
                            <Check size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Hit Die</span>
                        </div>
                        <p className="text-parchment font-bold">{draft.hitDice}</p>
                    </div>
                    <div className="bg-stone-900/30 border border-stone-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-gold mb-2">
                            <Check size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Primary Stat</span>
                        </div>
                        <p className="text-parchment font-bold uppercase">{draft.spellcastingAbility || 'STRENGTH/DEXTERITY'}</p>
                    </div>
                    <div className="bg-stone-900/30 border border-stone-800 p-4 rounded-lg md:col-span-2">
                        <div className="flex items-center gap-2 text-gold mb-2">
                            <Check size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Saving Throws</span>
                        </div>
                        <div className="flex gap-2">
                            {draft.savingThrows.map(s => (
                                <span key={s} className="bg-stone-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-stone-300">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <FiveEToolsModal
                isOpen={isSearching}
                onClose={() => setIsSearching(false)}
                initialCategory="Classes"
                fixedCategory={true}
                onImport={(item) => handleSelectClass(item)}
            />

            {wizardData && (
                <ChoiceWizardModal
                    title={wizardData.title}
                    steps={wizardData.steps}
                    characterLanguages={draft.languages}
                    characterSkills={draft.skills}
                    onComplete={handleWizardComplete}
                    onCancel={() => setWizardData(null)}
                />
            )}
        </div>
    );
}
