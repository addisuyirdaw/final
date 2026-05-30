import React, { useState } from 'react';
import { Mail, ArrowLeft, Link2, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export function ForgotPassword() {
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resetUrl, setResetUrl] = useState(null);
    const [devNote, setDevNote] = useState(null);
    const [sent, setSent] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setResetUrl(null);
        setDevNote(null);

        try {
            const API_BASE = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://dbu-student-portal-2.onrender.com/api" : "http://localhost:5000/api")).replace(/\/api$/, "");
            const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier }),
            });

            const data = await response.json();

            if (data.success) {
                setSent(true);
                toast.success('Request processed!');
                if (data.resetUrl) {
                    setResetUrl(data.resetUrl);
                    setDevNote(data.devNote);
                }
            } else {
                toast.error(data.message || 'Error sending reset email');
            }
        } catch (error) {
            toast.error('Server connection failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-lg"
            >
                <div className="text-center">
                    <Link to="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Login
                    </Link>
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h2>
                    <p className="text-gray-600">
                        Enter your email or student username and we'll help you reset your password.
                    </p>
                </div>

                {!sent ? (
                    <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                                Email or Username
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    id="identifier"
                                    name="identifier"
                                    type="text"
                                    required
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="Enter email or username (e.g. dbu12345678)"
                                />
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Sending...
                                </div>
                            ) : (
                                "Send Reset Link"
                            )}
                        </motion.button>
                    </form>
                ) : (
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            {/* Success banner */}
                            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-green-800">Request sent successfully</p>
                                    <p className="text-xs text-green-700 mt-1">
                                        If an email was delivered, it may take a few minutes to arrive.
                                        <strong> Check your Spam / Junk folder</strong> as well.
                                    </p>
                                </div>
                            </div>

                            {/* Dev-mode direct link */}
                            {resetUrl && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-3"
                                >
                                    <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                                        <AlertTriangle className="w-4 h-4" />
                                        Email not received? Use the direct link below:
                                    </div>
                                    {devNote && (
                                        <p className="text-xs text-amber-700 italic">{devNote}</p>
                                    )}
                                    <a
                                        href={resetUrl}
                                        className="flex items-center gap-2 w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-colors text-center justify-center"
                                    >
                                        <Link2 className="w-4 h-4" />
                                        Click Here to Reset Your Password
                                    </a>
                                    <p className="text-xs text-amber-600 break-all">
                                        {resetUrl}
                                    </p>
                                    <p className="text-xs text-red-600 font-medium">
                                        ⏰ This link expires in <strong>10 minutes</strong>.
                                    </p>
                                </motion.div>
                            )}

                            <button
                                onClick={() => { setSent(false); setIdentifier(''); setResetUrl(null); }}
                                className="w-full py-2.5 px-4 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                Try a different email / username
                            </button>

                            <Link
                                to="/login"
                                className="block text-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
                            >
                                ← Back to Login
                            </Link>
                        </motion.div>
                    </AnimatePresence>
                )}
            </motion.div>
        </div>
    );
}
