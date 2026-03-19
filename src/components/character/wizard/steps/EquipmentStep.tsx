import { useState } from 'react';
import { Character, Item } from '../../../../types/character';
import { Shield, Package, Trash2, Plus } from 'lucide-react';
import { RulesSearchModal } from '../../../common/RulesSearchModal';

interface Props {
    draft: Character;
    onUpdate: (updates: Partial<Character>) => void;
}

export function EquipmentStep({ draft, onUpdate }: Props) {
    const [isSearching, setIsSearching] = useState(false);

    const handleAddItem = (item: any) => {
        const newItem: Item = {
            id: crypto.randomUUID(),
            name: item.name,
            quantity: 1,
            weight: item.weight || 0,
            isEquipped: false,
            isAttuned: false,
            description: item.description || '',
            type: item.type || 'gear'
        };

        onUpdate({
            inventory: [...draft.inventory, newItem]
        });
        setIsSearching(false);
    };

    const handleRemoveItem = (id: string) => {
        onUpdate({
            inventory: draft.inventory.filter(i => i.id !== id)
        });
    };

    const handleUpdateQuantity = (id: string, qty: number) => {
        onUpdate({
            inventory: draft.inventory.map(i => i.id === id ? { ...i, quantity: Math.max(1, qty) } : i)
        });
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-stone-900/30 border border-stone-800 p-6 rounded-xl flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-xl font-cinzel font-bold text-parchment uppercase tracking-wide">Starting Gear</h3>
                    <p className="text-sm text-stone-400">Add weapons, armor, and equipment to your inventory.</p>
                </div>
                <button
                    onClick={() => setIsSearching(true)}
                    className="bg-gold text-stone-950 px-6 py-2 rounded-lg font-cinzel font-bold tracking-widest hover:bg-gold-light transition-all flex items-center gap-2"
                >
                    <Plus size={18} />
                    ADD ITEM
                </button>
            </div>

            <div className="space-y-3">
                {draft.inventory.length === 0 ? (
                    <div className="py-12 border-2 border-dashed border-stone-800 rounded-xl flex flex-col items-center justify-center text-stone-600">
                        <Package size={48} className="mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">Inventory is empty</p>
                    </div>
                ) : (
                    draft.inventory.map(item => (
                        <div key={item.id} className="bg-stone-900/50 border border-stone-800 rounded-lg p-4 flex items-center justify-between group hover:border-stone-700 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-stone-950 border border-stone-800 rounded flex items-center justify-center text-stone-500">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-parchment">{item.name}</div>
                                    <div className="text-[10px] text-stone-500 uppercase font-bold tracking-tighter">
                                        {item.type} • {item.weight} lbs
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 bg-stone-950/50 border border-stone-800 rounded px-2 py-1">
                                    <span className="text-[10px] font-bold text-stone-600 uppercase">Qty</span>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
                                        className="w-10 bg-transparent text-center text-xs font-bold text-parchment outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="text-stone-700 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <RulesSearchModal
                isOpen={isSearching}
                onClose={() => setIsSearching(false)}
                title="Search Equipment"
                category="items"
                onSelect={handleAddItem}
            />
        </div>
    );
}
