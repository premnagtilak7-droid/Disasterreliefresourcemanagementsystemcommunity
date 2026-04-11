import React, { useState } from 'react';
import { User } from './AuthSystem';
import { AdminDashboard } from './dashboards/AdminDashboard';
import { VolunteerDashboard } from './dashboards/VolunteerDashboard';
import { VictimDashboard } from './dashboards/VictimDashboard';
import { Header } from './Header';
import { Chatbot } from './Chatbot';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState('dashboard');

  const renderDashboard = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard user={user} activeView={activeView} setActiveView={setActiveView} />;
      case 'volunteer':
        return <VolunteerDashboard user={user} activeView={activeView} setActiveView={setActiveView} />;
      case 'victim':
        return <VictimDashboard user={user} activeView={activeView} setActiveView={setActiveView} />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={onLogout} activeView={activeView} setActiveView={setActiveView} />
      <main className="pt-16">
        {renderDashboard()}
      </main>
      <Chatbot user={user} onNavigate={setActiveView} />
    </div>
  );
}
