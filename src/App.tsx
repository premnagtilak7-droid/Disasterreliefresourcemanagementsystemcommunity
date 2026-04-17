import React, { useState, useEffect } from 'react';
import { AuthSystem, User } from './components/AuthSystem';
import { Dashboard } from './components/Dashboard';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import { subscribeToAuthState, getUserByUid } from './lib/users';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for auth state changes to recover session on refresh
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in - recover their profile from Firestore
        try {
          const userDoc = await getUserByUid(firebaseUser.uid);
          if (userDoc) {
            setUser({
              id: userDoc.uid,
              name: userDoc.name,
              email: userDoc.email,
              role: userDoc.role,
            });
          } else {
            // User exists in Auth but not in Firestore (edge case)
            setUser(null);
          }
        } catch (error) {
          console.error('Failed to recover user session:', error);
          setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  // Show loading screen while recovering auth state
  if (isLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-700/30">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      {!user ? (
        <AuthSystem onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}
