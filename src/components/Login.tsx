import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Eye, EyeOff, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export function Login() {
    const { login, register, error, loading } = useAuth();
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        try {
            if (isRegisterMode) {
                if (!displayName.trim()) {
                    setLocalError('Display name is required');
                    return;
                }
                await register(email, password, displayName, 'viewer');
            } else {
                await login(email, password);
            }
        } catch (err: any) {
            setLocalError(err.message || 'Authentication failed');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">SOC Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-1">Enterprise Security Operations Center</p>
                </div>

                {/* Form Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                    <h2 className="text-lg font-semibold text-white mb-6">
                        {isRegisterMode ? 'Create Account' : 'Welcome Back'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegisterMode && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@company.com"
                                required
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 pr-10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error Display */}
                        {(error || localError) && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{localError || error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isRegisterMode ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                                    {isRegisterMode ? 'Create Account' : 'Sign In'}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => {
                                setIsRegisterMode(!isRegisterMode);
                                setLocalError(null);
                            }}
                            className="text-sm text-slate-400 hover:text-emerald-400 transition"
                        >
                            {isRegisterMode
                                ? 'Already have an account? Sign in'
                                : "Don't have an account? Create one"}
                        </button>
                    </div>
                </div>

                {/* Role Info */}
                <div className="mt-6 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 text-center mb-2">Role-Based Access Control</p>
                    <div className="flex justify-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-slate-400">Admin</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="text-slate-400">Analyst</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                            <span className="text-slate-400">Viewer</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
