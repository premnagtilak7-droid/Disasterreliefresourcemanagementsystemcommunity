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

  // Subscribe to Firebase Auth state changes to persist login across refreshes
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch their full profile from Firestore
        const userDoc = await getUserByUid(firebaseUser.uid);
        if (userDoc) {
          setUser({
            id: userDoc.uid,
            email: userDoc.email,
            name: userDoc.name,
            role: userDoc.role,
            photoURL: userDoc.photoURL,
          });
        } else {
          // User exists in Auth but not in Firestore (edge case)
          setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        <Toaster position="top-right" />
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
