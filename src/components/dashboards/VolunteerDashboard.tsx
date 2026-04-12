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
  Settings,
  Loader2,
  Phone
} from 'lucide-react';
import { VolunteerMapView } from '../VolunteerMapView';
import { VolunteerSettings } from '../VolunteerSettings';
import { RescueHistory } from '../RescueHistory';
import { getResolvedCountByVolunteer, subscribeToPendingAlerts, markAlertAsSolved, AlertWithId } from '@/lib/alerts';
import { toast } from 'sonner';

interface VolunteerDashboardProps {
  user: User;
  activeView: string;
  setActiveView: (view: string) => void;
}

export function VolunteerDashboard({ user, activeView, setActiveView }: VolunteerDashboardProps) {
  const [peopleHelped, setPeopleHelped] = useState(0);
  const [pendingNearby, setPendingNearby] = useState(0);
  const [pendingAlerts, setPendingAlerts] = useState<AlertWithId[]>([]);
  const [isResolving, setIsResolving] = useState<string | null>(null);

  // Fetch real volunteer stats
  useEffect(() => {
    async function fetchStats() {
      const resolvedCount = await getResolvedCountByVolunteer(user.id);
      setPeopleHelped(resolvedCount);
    }
    fetchStats();
  }, [user.id]);

  // Subscribe to pending alerts in real-time
  useEffect(() => {
    const unsubscribe = subscribeToPendingAlerts((alerts) => {
      setPendingNearby(alerts.length);
      setPendingAlerts(alerts);
    });
    return () => unsubscribe();
  }, []);

  // Handle marking an alert as solved
  const handleMarkAsSolved = async (alertId: string) => {
    setIsResolving(alertId);
    try {
      await markAlertAsSolved(alertId, user.id);
      toast.success('Alert marked as solved!');
    } catch (error) {
      console.error('Failed to mark alert as solved:', error);
      toast.error('Failed to mark as solved. Please try again.');
    } finally {
      setIsResolving(null);
    }
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Pending Aid Requests</h1>
            <p className="text-muted-foreground">View and manage alerts requiring assistance</p>
          </div>
          <Badge variant="outline" className="text-sm">
            {pendingAlerts.length} pending
          </Badge>
        </div>

        {pendingAlerts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium">All Clear!</h3>
              <p className="text-muted-foreground mt-2">
                No pending alerts at the moment
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingAlerts.map((alert) => (
              <Card key={alert.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg">{alert.emergencyType || 'Aid'} Request</CardTitle>
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                        Pending
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">#{alert.id.slice(0, 8)}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-sm text-muted-foreground">{alert.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">{alert.phone || 'N/A'}</p>
                        {alert.phone && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(`tel:${alert.phone}`)}
                          >
                            <Phone className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.latitude && alert.longitude 
                          ? `${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}`
                          : alert.location || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground">{alert.description || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleMarkAsSolved(alert.id)}
                      disabled={isResolving === alert.id}
                    >
                      {isResolving === alert.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Resolving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Resolved
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (alert.latitude && alert.longitude) {
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`,
                            '_blank'
                          );
                        }
                      }}
                      disabled={!alert.latitude || !alert.longitude}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Navigate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => setActiveView('map')}>
          <MapPin className="h-4 w-4 mr-2" />
          Open Map View
        </Button>
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
