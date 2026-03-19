import { Users, Plus } from 'lucide-react';
import { useCharacterStore } from '../store/characterStore';
import { useCampaignStore } from '../store/campaignStore';
// import { useNavigate } from 'react-router-dom';
import { CharacterCard } from '../components/character/CharacterCard';
import { useState } from 'react';
import { CharacterForm } from '../components/character/CharacterForm';
import { CharacterCreatorWizard } from '../components/character/wizard/CharacterCreatorWizard';
import { PdfImportModal } from '../components/character/PdfImportModal';
import { FileUp } from 'lucide-react';
import { Character } from '../types/character';

export function Characters() {
    const allCharacters = useCharacterStore((state) => state.characters);
    const campaigns = useCampaignStore((state) => state.campaigns);
    const activeCampaignId = useCampaignStore((state) => state.activeCampaignId);

    const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

    // Filter characters to only those in the active campaign
    const displayCharacters = activeCampaign
        ? allCharacters.filter(c => activeCampaign.partyIds.includes(c.id))
        : allCharacters;

    const [isCreating, setIsCreating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [importedData, setImportedData] = useState<Partial<Character> | null>(null);
    const [updatingCharId, setUpdatingCharId] = useState<string | null>(null);

    // const navigate = useNavigate();

    if (isCreating) {
        return <CharacterCreatorWizard onClose={() => setIsCreating(false)} />;
    }

    if (selectedCharId || importedData) {
        return (
            <CharacterForm
                characterId={selectedCharId}
                initialData={importedData || undefined}
                onClose={() => {
                    setIsCreating(false);
                    setSelectedCharId(null);
                    setImportedData(null);
                }}
            />
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
            <header className="flex items-center justify-between border-b border-stone-700/50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-stone-800 rounded-md shadow-inner border border-stone-700/50">
                        <Users size={24} className="text-gold" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-cinzel font-bold text-parchment">Characters</h1>
                        <p className="text-sm text-parchment-muted">
                            {activeCampaign ? `Manage the party for ${activeCampaign.title}` : 'Manage your characters'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImporting(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600 rounded-md font-medium transition-colors shadow-sm text-sm"
                    >
                        <FileUp size={16} /> Import PDF
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-gold border border-stone-600 rounded-md font-medium transition-colors shadow-sm text-sm"
                    >
                        <Plus size={16} /> New Character
                    </button>
                </div>
            </header>

            {isImporting && (
                <PdfImportModal
                    onClose={() => {
                        setIsImporting(false);
                        setUpdatingCharId(null);
                    }}
                    onImportSuccess={(data) => {
                        setIsImporting(false);
                        if (updatingCharId) {
                            // Update existing character
                            useCharacterStore.getState().updateCharacter(updatingCharId, data);
                            setUpdatingCharId(null);
                        } else {
                            // New character import flow
                            setImportedData(data);
                        }
                    }}
                />
            )}

            {displayCharacters.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
                    <Users size={48} className="text-stone-600 mb-4" />
                    <h3 className="font-cinzel text-xl text-parchment mb-2">Party is empty</h3>
                    <p className="text-parchment-muted max-w-md">
                        {activeCampaign
                            ? `There are no characters assigned to ${activeCampaign.title}. Add them from the Campaign Dashboard.`
                            : "You haven't created any characters yet. Use the buttons above to start your legend."
                        }
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {displayCharacters.map((char) => (
                        <CharacterCard
                            key={char.id}
                            character={char}
                            onClick={(id) => setSelectedCharId(id)}
                            onUpdateClick={(id) => {
                                setUpdatingCharId(id);
                                setIsImporting(true);
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
