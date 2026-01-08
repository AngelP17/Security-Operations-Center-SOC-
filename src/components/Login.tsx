import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, User, AlertTriangle, Fingerprint, Activity, Terminal } from 'lucide-react';

export function Login() {
    const { login, register, error: authError, loading } = useAuth();
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isRegisterMode) {
                await register(email, password, displayName, 'viewer');
            } else {
                await login(email, password);
            }
        } catch {
            // Error handled by AuthContext
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-zinc-200 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05)_0%,transparent_50%)]"></div>
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px'
                    }}
                ></div>
            </div>

            {/* Scan Line Animation */}
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-[scan_3s_linear_infinite] pointer-events-none z-0"></div>

            {/* Decorative HUD Elements */}
            <div className="absolute top-8 left-8 text-emerald-900/40 text-xs font-mono hidden md:block select-none">
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-900/40 rounded-full animate-pulse"></div> SYSTEM.READY</div>
                <div>ENCRYPTION: ACTIVE</div>
                <div>NODE: US-EAST-1A</div>
            </div>

            <div className="absolute bottom-8 right-8 text-emerald-900/40 text-xs font-mono text-right hidden md:block select-none">
                <div>SOC.VERSION: 2.1.0</div>
                <div>AUTH.PROTO: OAUTH2</div>
            </div>

            <div className="w-full max-w-md z-10 relative">
                {/* Main Card */}
                <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl overflow-hidden relative">
                    {/* Header */}
                    <div className="p-8 pb-6 text-center border-b border-zinc-800 bg-black/30 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        <div className="w-16 h-16 bg-zinc-800 rounded-xl border border-zinc-700 mx-auto flex items-center justify-center mb-5 shadow-lg shadow-emerald-900/20 group-hover:border-emerald-500/50 group-hover:scale-105 transition-all duration-300">
                            <Shield className="w-8 h-8 text-emerald-500" />
                        </div>

                        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">SOC Access Control</h1>
                        <p className="text-xs font-mono text-emerald-500/80 uppercase tracking-widest flex items-center justify-center gap-2">
                            <Activity className="w-3 h-3" /> Security Operations Center
                        </p>
                    </div>

                    {/* Form */}
                    <div className="p-8 pt-6">
                        <form onSubmit={handleSubmit} className="space-y-5">

                            {isRegisterMode && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase ml-1">Display Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                                        <input
                                            type="text"
                                            className="w-full bg-black border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                                            placeholder="Agent Name"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase ml-1">Identity</label>
                                <div className="relative group">
                                    <Terminal className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        type="email"
                                        className="w-full bg-black border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                                        placeholder="agent@soc.internal"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase ml-1">Credentials</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        type="password"
                                        className="w-full bg-black border border-zinc-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {authError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-sm text-red-200 animate-in fade-in slide-in-from-top-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                    <span className="font-mono text-xs">{authError}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-500/20 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Fingerprint className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        {isRegisterMode ? 'Register Identity' : 'Authenticate Access'}
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsRegisterMode(!isRegisterMode);
                                    // Reset error when switching modes
                                }}
                                className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors font-mono"
                            >
                                {isRegisterMode ? 'Already have access? Initialize Login' : 'Need clearance? Request Access'}
                            </button>
                        </div>
                    </div>

                    {/* Footer Status Bar */}
                    <div className="bg-black p-3 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-600 font-mono">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            SECURE_CONNECTION
                        </div>
                        <div>ID: {Math.floor(Math.random() * 9000) + 1000}-X</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
