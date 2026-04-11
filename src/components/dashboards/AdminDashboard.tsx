import React, { useState, useEffect } from 'react';
import { User } from '../AuthSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { 
  Users, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  MapPin,
  Heart
} from 'lucide-react';
import { AnalyticsView } from '../AnalyticsView';
import { AdminMapView } from '../AdminMapView';
import { VolunteerManagement } from '../VolunteerManagement';
import { InventoryManagement } from '../InventoryManagement';
import { getPendingAlertsCount, getActiveVolunteersCount, subscribeToPendingAlerts, AlertWithId } from '@/lib/alerts';
import { getTotalUserCount, getUserCountByRole } from '@/lib/users';

interface AdminDashboardProps {
  user: User;
  activeView: string;
  setActiveView: (view: string) => void;
}

export function AdminDashboard({ user, activeView, setActiveView }: AdminDashboardProps) {
  const [pendingRequests, setPendingRequests] = useState(0);
  const [activeVolunteers, setActiveVolunteers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial counts
  useEffect(() => {
    async function fetchStats() {
      try {
        const [volunteersCount, usersCount] = await Promise.all([
          getActiveVolunteersCount(),
          getTotalUserCount(),
        ]);
        setActiveVolunteers(volunteersCount);
        setTotalUsers(usersCount);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Subscribe to real-time pending alerts count
  useEffect(() => {
    const unsubscribe = subscribeToPendingAlerts((alerts: AlertWithId[]) => {
      setPendingRequests(alerts.length);
    });

    return () => unsubscribe();
  }, []);

  if (activeView === 'analytics') {
    return <AnalyticsView />;
  }

  if (activeView === 'map') {
    return <AdminMapView userId={user.id} />;
  }

  if (activeView === 'volunteers') {
    return <VolunteerManagement />;
  }

  if (activeView === 'inventory') {
    return <InventoryManagement />;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage relief operations and monitor system-wide activities
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Volunteers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : activeVolunteers}
            </div>
            <p className="text-xs text-muted-foreground">
              from Firestore
            </p>
            <Progress value={activeVolunteers > 0 ? 100 : 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : totalUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {isLoading ? '...' : pendingRequests}
            </div>
            <p className="text-xs text-muted-foreground">
              Live from Firestore
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">
              Real-time sync active
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Stats */}
        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>Real-time system statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full mt-2 bg-green-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">Firebase Connected</p>
                  <p className="text-xs text-muted-foreground">Real-time sync active</p>
                </div>
                <Badge variant="default" className="text-xs">active</Badge>
              </div>
              <div className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${pendingRequests > 0 ? 'bg-orange-500' : 'bg-green-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{pendingRequests} Pending Alerts</p>
                  <p className="text-xs text-muted-foreground">Awaiting response</p>
                </div>
                <Badge variant={pendingRequests > 0 ? "destructive" : "secondary"} className="text-xs">
                  {pendingRequests > 0 ? 'urgent' : 'clear'}
                </Badge>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full mt-2 bg-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{activeVolunteers} Active Volunteers</p>
                  <p className="text-xs text-muted-foreground">Ready to respond</p>
                </div>
                <Badge variant="secondary" className="text-xs">info</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => setActiveView('volunteers')}
              >
                <Users className="h-5 w-5" />
                <span className="text-sm">Manage Volunteers</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => setActiveView('inventory')}
              >
                <Package className="h-5 w-5" />
                <span className="text-sm">Check Inventory</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => setActiveView('analytics')}
              >
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm">View Analytics</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => setActiveView('map')}
              >
                <MapPin className="h-5 w-5" />
                <span className="text-sm">Map Overview</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Critical Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div>
                <p className="font-medium">Low Medical Supplies</p>
                <p className="text-sm text-muted-foreground">Antibiotics running low in Zone-B warehouse</p>
              </div>
              <Button size="sm" variant="destructive">
                Action Required
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div>
                <p className="font-medium">Weather Alert</p>
                <p className="text-sm text-muted-foreground">Severe storm expected in operational area</p>
              </div>
              <Button size="sm" variant="destructive">
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
