import { WizardStep } from '../components/common/ChoiceWizardModal';
import { detectChoices, choicesToWizardSteps } from './rulesChoiceEngine';
import { is2024Source } from './fiveEToolsParser';

export interface ImportWizardData {
    title: string;
    steps: WizardStep[];
    originalData: any; // Keep the full object to process later
    type: 'race' | 'class' | 'background' | 'subclass';
}

export function buildRaceWizard(race: any): ImportWizardData {
    const is2024 = is2024Source(race.source);
    const choices = detectChoices(race, is2024, 'race');
    const steps = choicesToWizardSteps(choices);

    return { title: `Import ${race.name}`, steps, originalData: race, type: 'race' };
}

export function buildClassWizard(cls: any): ImportWizardData {
    const is2024 = is2024Source(cls.source);
    const choices = detectChoices(cls, is2024, 'class');
    const steps = choicesToWizardSteps(choices);

    // Add final flavor customization step
    steps.push({
        id: `flavor_customization`,
        title: `Item Customization & Flavor`,
        description: `If your starting equipment includes a customizable item (like a book of lore, an arcane focus, or a holy symbol), describe what it looks like or what it's about here. This will be added to your character notes.`,
        type: 'text',
        textPlaceholder: "For example: My arcane focus is a smooth, glowing blue crystal on a leather necklace. My book of lore is about ancient dragons.",
        options: [],
        maxChoices: 0
    });

    return { title: `Import ${cls.name}`, steps, originalData: cls, type: 'class' };
}

export function buildBackgroundWizard(bg: any): ImportWizardData {
    const is2024 = is2024Source(bg.source);
    const choices = detectChoices(bg, is2024, 'background');
    const steps = choicesToWizardSteps(choices);

    // Add final flavor customization step
    steps.push({
        id: `flavor_customization`,
        title: `Item Customization & Flavor`,
        description: `If your background includes a customizable item, describe it here. This will be added to your character notes.`,
        type: 'text',
        textPlaceholder: "For example: The trinket from my background is a small silver spoon with a wolf engraved on it.",
        options: [],
        maxChoices: 0
    });

    return { title: `Import ${bg.name}`, steps, originalData: bg, type: 'background' };
}
