import React, { useState, useEffect } from 'react';
import { User } from '../AuthSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Users, 
  CheckCircle, 
  MapPin,
  AlertTriangle,
  Calendar,
  Award,
  Settings
} from 'lucide-react';
import { VolunteerMapView } from '../VolunteerMapView';
import { VolunteerSettings } from '../VolunteerSettings';
import { RescueHistory } from '../RescueHistory';
import { getResolvedCountByVolunteer, subscribeToPendingAlerts } from '@/lib/alerts';

interface VolunteerDashboardProps {
  user: User;
  activeView: string;
  setActiveView: (view: string) => void;
}

export function VolunteerDashboard({ user, activeView, setActiveView }: VolunteerDashboardProps) {
  const [peopleHelped, setPeopleHelped] = useState(0);
  const [pendingNearby, setPendingNearby] = useState(0);

  // Fetch real volunteer stats
  useEffect(() => {
    async function fetchStats() {
      const resolvedCount = await getResolvedCountByVolunteer(user.id);
      setPeopleHelped(resolvedCount);
    }
    fetchStats();
  }, [user.id]);

  // Subscribe to pending alerts count
  useEffect(() => {
    const unsubscribe = subscribeToPendingAlerts((alerts) => {
      setPendingNearby(alerts.length);
    });
    return () => unsubscribe();
  }, []);

  if (activeView === 'settings') {
    return <VolunteerSettings user={user} />;
  }

  if (activeView === 'history') {
    return <RescueHistory volunteerId={user.id} />;
  }

  if (activeView === 'map') {
    return <VolunteerMapView userId={user.id} />;
  }

  if (activeView === 'tasks') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-2">My Tasks</h1>
          <p className="text-muted-foreground">View pending alerts requiring assistance</p>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-medium">View Alerts on Map</h3>
            <p className="text-muted-foreground mt-2 mb-4">
              Open the map view to see pending alerts within 2km of your location
            </p>
            <Button onClick={() => setActiveView('map')}>
              Open Map View
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeView === 'assignments') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-2">My Assignments</h1>
          <p className="text-muted-foreground">Your volunteer activity summary</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-3xl font-bold">{peopleHelped}</h3>
              <p className="text-muted-foreground">People Helped</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
              <h3 className="text-3xl font-bold">{pendingNearby}</h3>
              <p className="text-muted-foreground">Pending Alerts Nearby</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-blue-500" />
            <p className="text-muted-foreground">
              View the map to respond to alerts in your area
            </p>
            <Button className="mt-4" onClick={() => setActiveView('map')}>
              Open Map
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Welcome, {user.name}</h1>
        <p className="text-muted-foreground">
          Ready to make a difference in disaster relief operations
        </p>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">People Helped</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{peopleHelped}</div>
            <p className="text-xs text-muted-foreground">Alerts resolved by you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Nearby</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingNearby}</div>
            <p className="text-xs text-muted-foreground">Alerts needing help</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">Ready to help</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Respond to alerts in your area</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingNearby > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/30 border-orange-200">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                  <div>
                    <p className="font-medium">{pendingNearby} alerts need attention</p>
                    <p className="text-sm text-muted-foreground">Open the map to respond</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
              <p>No pending alerts in your area</p>
            </div>
          )}
          <Button className="w-full mt-4" onClick={() => setActiveView('map')}>
            <MapPin className="h-4 w-4 mr-2" />
            Open Map View
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <MapPin className="h-8 w-8 text-blue-600" />
              <h3 className="font-medium">Field Map</h3>
              <p className="text-sm text-muted-foreground">View operational areas</p>
              <Button size="sm" onClick={() => setActiveView('map')}>
                Open Map
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <Award className="h-8 w-8 text-yellow-600" />
              <h3 className="font-medium">Rescue History</h3>
              <p className="text-sm text-muted-foreground">Your portfolio</p>
              <Button size="sm" variant="outline" onClick={() => setActiveView('history')}>
                View History
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <Settings className="h-8 w-8 text-gray-600" />
              <h3 className="font-medium">Settings</h3>
              <p className="text-sm text-muted-foreground">Manage your profile</p>
              <Button size="sm" variant="outline" onClick={() => setActiveView('settings')}>
                Manage Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
