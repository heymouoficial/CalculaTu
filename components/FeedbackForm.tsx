import React, { useState } from 'react';
import { MessageSquare, X, Send, Star, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { BUILD_VERSION, BUILD_DATE } from '../config';

type FeedbackType = 'bug' | 'feature' | 'general';

interface FeedbackFormProps {
    onClose: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onClose }) => {
    const [type, setType] = useState<FeedbackType>('general');
    const [rating, setRating] = useState<number>(0);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim()) return;

        setIsSending(true);

        // Build feedback object
        const feedback = {
            type,
            rating,
            message: message.trim(),
            version: BUILD_VERSION,
            buildDate: BUILD_DATE,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href,
        };

        // For now, just log and save to localStorage (can be sent to backend later)
        console.log('[Feedback]', feedback);

        // Store feedback locally
        try {
            const existing = JSON.parse(localStorage.getItem('pending_feedback') || '[]');
            existing.push(feedback);
            localStorage.setItem('pending_feedback', JSON.stringify(existing));
        } catch {
            // ignore
        }

        // Simulate send delay
        await new Promise(r => setTimeout(r, 500));

        setIsSending(false);
        setSent(true);

        // Auto-close after success
        setTimeout(() => {
            onClose();
        }, 2000);
    };

    if (sent) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <ThumbsUp className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">¡Gracias!</h3>
                    <p className="text-gray-400">Tu feedback nos ayuda a mejorar CalculaTu.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#111] border border-white/10 rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Danos tu Feedback</h3>
                            <p className="text-xs text-gray-500">{BUILD_VERSION} • Beta</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Feedback Type */}
                <div className="mb-5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                        Tipo
                    </label>
                    <div className="flex gap-2">
                        {[
                            { value: 'general', label: '💬 General' },
                            { value: 'bug', label: '🐛 Bug' },
                            { value: 'feature', label: '✨ Idea' },
                        ].map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setType(opt.value as FeedbackType)}
                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${type === opt.value
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Rating */}
                <div className="mb-5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                        ¿Qué tan útil te parece? (Opcional)
                    </label>
                    <div className="flex gap-1 justify-center">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className={`p-2 transition-all ${star <= rating ? 'text-yellow-400 scale-110' : 'text-gray-600 hover:text-gray-400'
                                    }`}
                            >
                                <Star size={28} className={star <= rating ? 'fill-current' : ''} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message */}
                <div className="mb-5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                        Tu mensaje
                    </label>
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Cuéntanos qué piensas, qué podemos mejorar, o reporta un problema..."
                        rows={4}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
                    />
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || isSending}
                    className="w-full py-3 rounded-xl bg-purple-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSending ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        <>
                            <Send size={20} />
                            Enviar Feedback
                        </>
                    )}
                </button>

                {/* Version Info */}
                <p className="text-center text-xs text-gray-600 mt-4">
                    Versión {BUILD_VERSION} • {BUILD_DATE}
                </p>
            </div>
        </div>
    );
};

// Floating Feedback Button
export const FeedbackButton: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 left-4 z-40 w-12 h-12 rounded-full bg-purple-500/90 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center hover:bg-purple-400 transition-all active:scale-95"
                title="Enviar Feedback"
            >
                <MessageSquare size={22} />
            </button>

            {isOpen && <FeedbackForm onClose={() => setIsOpen(false)} />}
        </>
    );
};
