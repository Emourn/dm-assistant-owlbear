import { X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel" }: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-modal border border-stone-700/50 rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative text-parchment">
                <div className="absolute inset-0 bg-stone-950/60 pointer-events-none" /> {/* Text contrast layer */}
                <div className="flex justify-between items-center p-4 border-b border-stone-800 bg-obsidian/40 backdrop-blur-sm relative z-10">
                    <h2 className="font-cinzel text-xl text-engraved-gold">{title}</h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 relative z-10">
                    <p className="text-stone-300 drop-shadow-sm font-medium">
                        {message}
                    </p>
                </div>

                <div className="flex justify-end gap-3 p-4 border-t border-stone-800 bg-obsidian/40 backdrop-blur-sm relative z-10">
                    <button onClick={onClose} className="px-4 py-2 rounded text-sm font-bold text-stone-300 hover:text-white transition-colors">
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-6 py-2 rounded text-sm font-bold bg-blood text-white hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
