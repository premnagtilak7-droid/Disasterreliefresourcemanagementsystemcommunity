import React, { useState, useEffect } from 'react';
import { User } from '../AuthSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Package,
  MapPin,
  Phone,
  Heart,
  Loader2
} from 'lucide-react';
import { AidRequestForm } from '../AidRequestForm';
import { submitEmergencySOS, subscribeToPendingAlerts, AlertWithId } from '@/lib/alerts';

interface VictimDashboardProps {
  user: User;
  activeView: string;
  setActiveView: (view: string) => void;
}

export function VictimDashboard({ user, activeView, setActiveView }: VictimDashboardProps) {
  const [isSOSLoading, setIsSOSLoading] = useState(false);
  const [userAlerts, setUserAlerts] = useState<AlertWithId[]>([]);

  // Subscribe to user's alerts
  useEffect(() => {
    const unsubscribe = subscribeToPendingAlerts((alerts) => {
      // Filter alerts by current user (would need userId in alerts)
      setUserAlerts(alerts);
    });
    return () => unsubscribe();
  }, []);

  const handleEmergencySOS = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsSOSLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          await submitEmergencySOS(user.id, user.name, latitude, longitude);
          alert('Emergency SOS sent! Help is on the way.');
        } catch (error) {
          console.error('SOS Error:', error);
          alert('Failed to send SOS. Please try again.');
        } finally {
          setIsSOSLoading(false);
        }
      },
      (error) => {
        console.error('Location error:', error);
        alert('Could not get your location. Please enable GPS and try again.');
        setIsSOSLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (activeView === 'request') {
    return <AidRequestForm user={user} />;
  }

  if (activeView === 'status') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Aid Request Status</h1>
          <p className="text-muted-foreground">Track your assistance requests and their progress</p>
        </div>

        <div className="space-y-4">
          {userAlerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium">No Active Requests</h3>
                <p className="text-muted-foreground mt-2">You have no pending aid requests.</p>
                <Button className="mt-4" onClick={() => setActiveView('request')}>
                  Submit New Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            userAlerts.map((alert) => (
              <Card key={alert.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg">{alert.emergencyType} Request</CardTitle>
                      <Badge variant={
                        alert.status === 'resolved' ? 'default' :
                        alert.status === 'acknowledged' ? 'secondary' : 'outline'
                      }>
                        {alert.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">#{alert.id.slice(0, 8)}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{alert.location}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  if (activeView === 'resources') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Emergency Resources</h1>
          <p className="text-muted-foreground">Contact emergency services and support</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <Phone className="h-8 w-8 text-red-600 mx-auto" />
              <h3 className="font-medium">Emergency Services</h3>
              <p className="text-2xl font-bold text-red-600">911</p>
              <p className="text-sm text-muted-foreground">Police, Fire, Medical Emergency</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto" />
              <h3 className="font-medium">Disaster Relief Hotline</h3>
              <p className="text-2xl font-bold text-orange-600">1-800-RELIEF-1</p>
              <p className="text-sm text-muted-foreground">Aid coordination and support</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="h-10 w-10 text-blue-600 mx-auto mb-3" />
            <h3 className="font-medium mb-2">Find Nearby Help</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use the map view to locate volunteers and resources in your area
            </p>
            <Button onClick={() => setActiveView('dashboard')}>
              Back to Dashboard
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
          Access emergency assistance and track your aid requests
        </p>
      </div>

      {/* Emergency SOS Button */}
      <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
        <CardHeader>
          <CardTitle className="text-red-800 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* One-Tap Emergency SOS */}
          <Button 
            className="w-full h-20 bg-red-600 hover:bg-red-700 text-white text-xl font-bold shadow-lg"
            onClick={handleEmergencySOS}
            disabled={isSOSLoading}
          >
            {isSOSLoading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Sending SOS...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                <span>EMERGENCY SOS</span>
              </div>
            )}
          </Button>
          <p className="text-xs text-red-700 dark:text-red-400 text-center">
            One tap to send your location and request immediate help
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" className="h-14 border-red-300">
              <div className="flex flex-col items-center">
                <Phone className="h-5 w-5 mb-1" />
                <span>Emergency Call</span>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-14 border-red-300"
              onClick={() => setActiveView('request')}
            >
              <div className="flex flex-col items-center">
                <Package className="h-5 w-5 mb-1" />
                <span>Detailed Request</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Requests Status */}
      <Card>
        <CardHeader>
          <CardTitle>Your Aid Requests</CardTitle>
          <CardDescription>Current status of your assistance requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userAlerts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No active requests</p>
              </div>
            ) : (
              userAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {alert.status === 'resolved' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <p className="font-medium">{alert.emergencyType} Request</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {alert.status}
                      </p>
                    </div>
                  </div>
                  <Badge variant={alert.status === 'resolved' ? 'default' : 'secondary'}>
                    #{alert.id.slice(0, 6)}
                  </Badge>
                </div>
              ))
            )}
          </div>
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => setActiveView('status')}
          >
            View All Requests
          </Button>
        </CardContent>
      </Card>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <Package className="h-8 w-8 text-blue-600" />
              <h3 className="font-medium">Request Supplies</h3>
              <p className="text-sm text-muted-foreground">Food, water, medical supplies</p>
              <Button size="sm" onClick={() => setActiveView('request')}>
                Request Aid
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <MapPin className="h-8 w-8 text-green-600" />
              <h3 className="font-medium">Find Resources</h3>
              <p className="text-sm text-muted-foreground">Shelters, distribution centers</p>
              <Button size="sm" variant="outline" onClick={() => setActiveView('resources')}>
                View Resources
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <Heart className="h-8 w-8 text-purple-600" />
              <h3 className="font-medium">Support Groups</h3>
              <p className="text-sm text-muted-foreground">Community assistance</p>
              <Button size="sm" variant="outline">
                Connect
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
