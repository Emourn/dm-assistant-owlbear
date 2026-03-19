import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    addToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
        const id = crypto.randomUUID();
        const newToast = { id, message, type, duration };

        setToasts(prev => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {createPortal(
                <div className="fixed bottom-4 right-4 z-[100000] flex flex-col gap-2 pointer-events-none">
                    {toasts.map(toast => (
                        <ToastMessage key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
};

// --- Internal Component ---

const ToastMessage: React.FC<{ toast: Toast, onDismiss: () => void }> = ({ toast, onDismiss }) => {

    const getStyles = () => {
        const baseStyle = "bg-modal border bg-obsidian/40 backdrop-blur-md shadow-[0_5px_20px_rgba(0,0,0,0.8)]";

        switch (toast.type) {
            case 'success':
                return {
                    container: `${baseStyle} border-green-800/50 shadow-[inset_0_0_15px_rgba(34,197,94,0.1)]`,
                    icon: <CheckCircle className="text-green-500 w-5 h-5 flex-shrink-0 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                };
            case 'error':
                return {
                    container: `${baseStyle} border-red-800/50 shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]`,
                    icon: <XCircle className="text-blood w-5 h-5 flex-shrink-0 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                };
            case 'warning':
                return {
                    container: `${baseStyle} border-yellow-800/50 shadow-[inset_0_0_15px_rgba(234,179,8,0.1)]`,
                    icon: <AlertTriangle className="text-yellow-500 w-5 h-5 flex-shrink-0 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                };
            case 'info':
            default:
                return {
                    container: `${baseStyle} border-blue-800/50 shadow-[inset_0_0_15px_rgba(96,165,250,0.1)]`,
                    icon: <Info className="text-arcane-light w-5 h-5 flex-shrink-0 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                };
        }
    };

    const styles = getStyles();

    return (
        <div className={`pointer-events-auto flex items-start gap-3 p-4 pr-10 rounded-lg animate-in slide-in-from-right-8 fade-in duration-300 min-w-[300px] max-w-sm relative group ${styles.container}`}>
            <div className="absolute inset-0 bg-stone-950/70 rounded-lg pointer-events-none" /> {/* Darken texture */}
            <div className="relative z-10 flex items-start gap-3 w-full">
                {styles.icon}
                <div className="text-sm font-medium text-parchment leading-tight pt-0.5 drop-shadow-sm">
                    {toast.message}
                </div>
            </div>
            <button
                onClick={onDismiss}
                className="absolute top-4 right-3 text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-parchment"
            >
                <X size={14} />
            </button>
        </div>
    );
};
