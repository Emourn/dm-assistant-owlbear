import { X, Keyboard, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: Props) {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const shortcuts = [
        { key: 'Ctrl + K', desc: 'Global Rules Search (Spells, Items, Monsters)', global: true },
        { key: 'N', desc: 'Advance to Next Turn', combat: true },
        { key: 'U', desc: 'Undo Last Action / Damage', combat: true },
        { key: 'Ctrl + Z', desc: 'Undo Last Action / Damage', combat: true },
        { key: 'D', desc: 'Toggle 3D Dice Roller', combat: true },
        { key: 'H', desc: 'Quick-focus HP Input', combat: true },
        { key: 'L', desc: 'Expand/Collapse Combat Log', combat: true },
        { key: 'ESC', desc: 'Cancel Targeting / Close Modals', global: true },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div
                className="bg-modal border border-stone-700/50 rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative text-parchment"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute inset-0 bg-stone-950/60 pointer-events-none" /> {/* Text contrast layer */}

                <div className="flex justify-between items-center p-4 border-b border-stone-800 bg-obsidian/40 backdrop-blur-sm relative z-10">
                    <div className="flex items-center gap-2">
                        <Keyboard size={20} className="text-gold" />
                        <h2 className="font-cinzel text-xl text-engraved-gold">Keyboard Shortcuts</h2>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 relative z-10 space-y-6">
                    <div>
                        <h3 className="text-xs font-cinzel font-bold text-stone-500 tracking-wider mb-3 uppercase">Global Commands</h3>
                        <div className="space-y-2 text-sm">
                            {shortcuts.filter(s => s.global).map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-stone-300 drop-shadow-sm">{s.desc}</span>
                                    <kbd className="px-2 py-1 bg-stone-800 border border-stone-700 rounded text-gold font-mono text-xs">{s.key}</kbd>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-cinzel font-bold text-stone-500 tracking-wider mb-3 uppercase flex items-center gap-2">
                            Combat Mode Only
                            <span className="h-px bg-stone-800 flex-1" />
                        </h3>
                        <div className="space-y-2 text-sm">
                            {shortcuts.filter(s => s.combat).map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-stone-400 drop-shadow-sm flex items-center gap-2">
                                        <ArrowRight size={12} className="text-stone-700" />
                                        {s.desc}
                                    </span>
                                    <kbd className="px-2 py-1 bg-stone-800/80 border border-stone-700/50 rounded text-stone-300 font-mono text-xs">{s.key}</kbd>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-center p-4 border-t border-stone-800 bg-obsidian/40 backdrop-blur-sm relative z-10">
                    <button onClick={onClose} className="px-6 py-2 rounded text-sm font-bold bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors shadow-lg shadow-black/20">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
