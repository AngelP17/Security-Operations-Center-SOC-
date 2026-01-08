import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase-config';

// Role types for RBAC
export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    createdAt: Date;
    lastLogin: Date;
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>;
    logout: () => Promise<void>;
    isAdmin: boolean;
    isAnalyst: boolean;
    canWrite: boolean;
    canDelete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch user profile from Firestore
    const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                return userDoc.data() as UserProfile;
            }
            return null;
        } catch (err) {
            console.error('Error fetching user profile:', err);
            return null;
        }
    };

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                const profile = await fetchUserProfile(firebaseUser.uid);
                setUserProfile(profile);

                // Update last login
                if (profile) {
                    await setDoc(doc(db, 'users', firebaseUser.uid), {
                        ...profile,
                        lastLogin: new Date()
                    }, { merge: true });
                }
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Login with email/password
    const login = async (email: string, password: string) => {
        setError(null);
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            setError(err.message || 'Login failed');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Register new user
    const register = async (
        email: string,
        password: string,
        displayName: string,
        role: UserRole = 'viewer'
    ) => {
        setError(null);
        setLoading(true);
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Create user profile in Firestore
            const userProfile: UserProfile = {
                uid: result.user.uid,
                email,
                displayName,
                role,
                createdAt: new Date(),
                lastLogin: new Date()
            };

            await setDoc(doc(db, 'users', result.user.uid), userProfile);
            setUserProfile(userProfile);
        } catch (err: any) {
            setError(err.message || 'Registration failed');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Logout
    const logout = async () => {
        try {
            await signOut(auth);
            setUserProfile(null);
        } catch (err: any) {
            setError(err.message || 'Logout failed');
        }
    };

    // Role-based permissions
    const isAdmin = userProfile?.role === 'admin';
    const isAnalyst = userProfile?.role === 'analyst';
    const canWrite = isAdmin || isAnalyst;
    const canDelete = isAdmin;

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
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
