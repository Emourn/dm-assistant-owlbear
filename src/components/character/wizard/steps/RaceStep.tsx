import { useState } from 'react';
import { Character } from '../../../../types/character';
import { Search, User as UserIcon, Check } from 'lucide-react';
import { FiveEToolsModal } from '../../../common/FiveEToolsModal';
import { ChoiceWizardModal } from '../../../common/ChoiceWizardModal';
import { buildRaceWizard } from '../../../../engine/importWizardBuilder';
import { resolveAllChoices } from '../../../../engine/rulesChoiceEngine';
import { automateCharacter } from '../../../../engine/characterAutomation';

interface Props {
    draft: Character;
    onUpdate: (updates: Partial<Character>) => void;
}

export function RaceStep({ draft, onUpdate }: Props) {
    const [isSearching, setIsSearching] = useState(false);
    const [wizardData, setWizardData] = useState<any>(null);

    const handleSelectRace = (race: any) => {
        setWizardData(buildRaceWizard(race));
        setIsSearching(false);
    };

    const handleWizardComplete = async (selections: Record<string, any[]>) => {
        const race = wizardData.originalData;

        // Use the centralized resolver to apply all traits and choices
        const updatedCharacter = await resolveAllChoices(draft, selections, race, 'race');
        const automatedCharacter = await automateCharacter({
            ...updatedCharacter,
            race: race.name
        });

        onUpdate({
            ...automatedCharacter,
            race: race.name
        });

        setWizardData(null);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-stone-800 rounded-full flex items-center justify-center mx-auto border-2 border-stone-700">
                    <UserIcon size={40} className="text-stone-500" />
                </div>

                {draft.race ? (
                    <div className="space-y-2">
                        <h3 className="text-2xl font-cinzel font-bold text-gold">{draft.race}</h3>
                        <p className="text-stone-400 text-sm max-w-md mx-auto">
                            You have selected the {draft.race} species. This provides your base movement, senses, and innate traits.
                        </p>
                        <button
                            onClick={() => setIsSearching(true)}
                            className="text-stone-500 hover:text-gold text-xs font-bold uppercase tracking-widest transition-colors mt-4"
                        >
                            Change Species
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h3 className="text-xl font-cinzel font-bold text-parchment">CHOOSE YOUR SPECIES</h3>
                        <p className="text-stone-400 text-sm max-w-md mx-auto">
                            Your species determines your base traits, movement, senses, and innate abilities under the 2024 rules.
                        </p>
                        <button
                            onClick={() => setIsSearching(true)}
                            className="bg-gold text-stone-950 px-8 py-3 rounded-lg font-cinzel font-bold tracking-widest hover:bg-gold-light transition-all shadow-lg flex items-center gap-2 mx-auto"
                        >
                            <Search size={18} />
                            BROWSE SPECIES
                        </button>
                    </div>
                )}
            </div>

            {/* Racial Traits Preview (if selected) */}
            {draft.race && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-stone-900/30 border border-stone-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-gold mb-2">
                            <Check size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Base Speed</span>
                        </div>
                        <p className="text-parchment font-bold">{draft.speed}</p>
                    </div>
                    <div className="bg-stone-900/30 border border-stone-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-gold mb-2">
                            <Check size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Languages</span>
                        </div>
                        <p className="text-parchment text-sm">{draft.languages || 'Common'}</p>
                    </div>
                </div>
            )}

            <FiveEToolsModal
                isOpen={isSearching}
                onClose={() => setIsSearching(false)}
                initialCategory="Races"
                fixedCategory={true}
                onImport={(item) => handleSelectRace(item)}
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
