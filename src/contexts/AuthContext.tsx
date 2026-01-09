import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Role types for RBAC
export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface UserProfile {
    username: string;
    displayName: string;
    role: UserRole;
}

interface AuthContextType {
    user: UserProfile | null;
    userProfile: UserProfile | null;
    loading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string, displayName: string, role?: UserRole) => Promise<void>;
    logout: () => Promise<void>;
    isAdmin: boolean;
    isAnalyst: boolean;
    canWrite: boolean;
    canDelete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check if user is already logged in on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/me', {
                credentials: 'include'
            });
            if (response.ok) {
                const userData = await response.json();
                const profile: UserProfile = {
                    username: userData.username,
                    displayName: userData.display_name || userData.username,
                    role: userData.role as UserRole
                };
                setUser(profile);
            } else {
                setUser(null);
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Login with username/password via Flask backend
    const login = async (username: string, password: string) => {
        setError(null);
        setLoading(true);
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            const profile: UserProfile = {
                username: data.user.username,
                displayName: data.user.display_name || data.user.username,
                role: data.user.role as UserRole
            };
            setUser(profile);
        } catch (err: any) {
            const errorMessage = err.message || 'Login failed';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Register new user (placeholder - Flask backend doesn't have registration endpoint)
    const register = async (
        username: string,
        password: string,
        displayName: string,
        role: UserRole = 'viewer'
    ) => {
        setError(null);
        setError('Registration is not available. Please contact an administrator.');
        throw new Error('Registration is not available');
    };

    // Logout
    const logout = async () => {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            setUser(null);
        } catch (err: any) {
            setError(err.message || 'Logout failed');
        }
    };

    // Role-based permissions
    const isAdmin = user?.role === 'admin';
    const isAnalyst = user?.role === 'analyst';
    const canWrite = isAdmin || isAnalyst;
    const canDelete = isAdmin;

    return (
        <AuthContext.Provider value={{
            user,
            userProfile: user,
            loading,
            error,
            login,
            register,
            logout,
            isAdmin,
            isAnalyst,
            canWrite,
            canDelete
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
