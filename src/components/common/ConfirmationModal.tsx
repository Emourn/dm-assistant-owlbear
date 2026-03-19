import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDangerous = false,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
            <div className="bg-stone-900 border border-stone-700/80 w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Decorative Top Accent */}
                <div className={`absolute top-0 left-0 w-full h-1 ${isDangerous ? 'bg-red-500' : 'bg-gold'}`} />

                <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`p-3 rounded-full shrink-0 ${isDangerous ? 'bg-red-950/50 text-red-500 border border-red-900/50' : 'bg-gold/10 text-gold border border-gold/20'}`}>
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-cinzel font-bold text-parchment leading-tight mb-2">{title}</h2>
                            <p className="text-sm text-stone-400 leading-relaxed">{message}</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-stone-800">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors border border-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                            }}
                            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all focus:outline-none focus:ring-2 shadow-lg ${isDangerous
                                    ? 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500 shadow-red-900/20'
                                    : 'bg-gold hover:bg-yellow-500 text-stone-900 focus:ring-gold shadow-gold/20'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
