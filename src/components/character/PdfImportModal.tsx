import { useState, useRef } from 'react';
import { FileUp, X, Loader2, FileDown, ShieldCheck, Sparkles } from 'lucide-react';
import { extractCharacterFromPdf } from '../../engine/pdfExtractor';
import { Character } from '../../types/character';

interface PdfImportModalProps {
    onClose: () => void;
    onImportSuccess: (extractedData: Partial<Character>) => void;
}

export function PdfImportModal({ onClose, onImportSuccess }: PdfImportModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressText, setProgressText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (file.type !== 'application/pdf') {
            setError("Please upload a valid PDF file.");
            return;
        }

        setIsProcessing(true);
        setProgressText('Reading PDF file...');
        setError(null);

        try {
            const data = await extractCharacterFromPdf(file, setProgressText);
            onImportSuccess(data);
        } catch (err: any) {
            console.error("PDF Parsing Error:", err);
            setError(`Failed to parse the PDF. Error: ${err?.message || JSON.stringify(err)}`);
        } finally {
            setIsProcessing(false);
            setProgressText(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-stone-900 border border-stone-700/50 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(217,119,6,0.16),_transparent_45%),linear-gradient(180deg,rgba(28,25,23,0.96),rgba(17,24,39,0.92))]">
                    <div>
                        <h2 className="text-xl font-cinzel font-bold text-parchment flex items-center gap-2">
                            <FileDown size={20} className="text-gold" />
                            Intelligent Sheet Import
                        </h2>
                        <p className="mt-1 text-sm text-stone-400">
                            Optimized for D&D Beyond character PDFs with 2024 automation and source tagging.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-fuchsia-200">
                                <ShieldCheck size={12} />
                                D&D Beyond
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-200">
                                <Sparkles size={12} />
                                2024 Ready
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-stone-800 rounded-md text-stone-500 hover:text-stone-300 transition-colors"
                        disabled={isProcessing}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 text-red-200 rounded text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => !isProcessing && fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
                            ${isDragging ? 'border-gold bg-gold/5' : 'border-stone-700 hover:border-stone-500 hover:bg-stone-800/30'}
                            ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
                        `}
                    >
                        <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    handleFile(e.target.files[0]);
                                }
                            }}
                        />

                        {isProcessing ? (
                            <>
                                <Loader2 size={48} className="text-gold animate-spin mb-4" />
                                <p className="text-parchment font-medium min-h-6">{progressText || 'Extracting Character Data...'}</p>
                                <p className="text-stone-500 text-sm mt-2">This happens locally in your browser.</p>
                            </>
                        ) : (
                            <>
                                <div className="p-4 bg-stone-800 rounded-full mb-4 shadow-sm border border-stone-700/50">
                                    <FileUp size={32} className="text-stone-400" />
                                </div>
                                <p className="text-parchment font-medium mb-1">Click to upload or drag & drop</p>
                                <p className="text-stone-500 text-sm">Accepts fillable PDFs, especially D&D Beyond sheets and 2024-era exports.</p>
                            </>
                        )}
                        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
                            <div className="rounded-md border border-stone-800 bg-stone-900/90 p-4 shadow-inner">
                                <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold mb-2">Privacy</div>
                                <p className="text-sm text-stone-400">Parsing happens locally in your browser. Your sheet is not uploaded to a server.</p>
                            </div>
                            <div className="rounded-md border border-stone-800 bg-stone-900/90 p-4 shadow-inner">
                                <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold mb-2">Automation</div>
                                <p className="text-sm text-stone-400">The importer rebuilds derived stats, spellcasting, resources, and key 2024 rules data.</p>
                            </div>
                            <div className="rounded-md border border-stone-800 bg-stone-900/90 p-4 shadow-inner">
                                <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold mb-2">Compatibility</div>
                                <p className="text-sm text-stone-400">Works with fillable PDFs. Flat scans and image-only exports still won’t contain sheet fields to read.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
