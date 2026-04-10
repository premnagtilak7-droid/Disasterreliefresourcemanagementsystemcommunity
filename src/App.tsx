import React, { useState } from 'react';
import { AuthSystem, User } from './components/AuthSystem';
import { Dashboard } from './components/Dashboard';
import { ThemeProvider } from './components/ThemeProvider';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <ThemeProvider>
      {!user ? (
        <AuthSystem onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </ThemeProvider>
  );
}