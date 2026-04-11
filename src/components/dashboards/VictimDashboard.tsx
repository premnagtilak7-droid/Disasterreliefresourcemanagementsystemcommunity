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
  Loader2,
  PhoneOff,
  Navigation
} from 'lucide-react';
import { AidRequestForm } from '../AidRequestForm';
import { submitEmergencySOS, subscribeToPendingAlerts, AlertWithId } from '@/lib/alerts';
import { subscribeToNearbyVolunteers, getCurrentLocation, NearbyVolunteer, getCityFromCoordinates } from '@/lib/geolocation';
import { toast } from 'sonner';

interface VictimDashboardProps {
  user: User;
  activeView: string;
  setActiveView: (view: string) => void;
}

export function VictimDashboard({ user, activeView, setActiveView }: VictimDashboardProps) {
  const [isSOSLoading, setIsSOSLoading] = useState(false);
  const [userAlerts, setUserAlerts] = useState<AlertWithId[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyVolunteers, setNearbyVolunteers] = useState<NearbyVolunteer[]>([]);
  const [cityName, setCityName] = useState<string>('Your Location');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Get current location and nearby volunteers
  useEffect(() => {
    async function initializeLocation() {
      setIsLoadingLocation(true);
      try {
        const location = await getCurrentLocation();
        setUserLocation({ lat: location.latitude, lng: location.longitude });
        
        // Get city name for localization
        const city = await getCityFromCoordinates(location.latitude, location.longitude);
        setCityName(city);
      } catch (error) {
        console.error('Location error:', error);
        setCityName('Unable to detect location');
      } finally {
        setIsLoadingLocation(false);
      }
    }
    initializeLocation();
  }, []);

  // Subscribe to nearby volunteers when location is available
  useEffect(() => {
    if (!userLocation) return;

    const unsubscribe = subscribeToNearbyVolunteers(
      userLocation.lat,
      userLocation.lng,
      2, // 2km radius
      (volunteers) => {
        setNearbyVolunteers(volunteers);
      }
    );

    return () => unsubscribe();
  }, [userLocation]);

  // Subscribe to user's alerts
  useEffect(() => {
    const unsubscribe = subscribeToPendingAlerts((alerts) => {
      setUserAlerts(alerts);
    });
    return () => unsubscribe();
  }, []);

  const handleEmergencySOS = async () => {
    if (!userLocation) {
      alert('Please enable location services');
      return;
    }

    setIsSOSLoading(true);
    
    try {
      await submitEmergencySOS(user.id, user.name, userLocation.lat, userLocation.lng);
      
      // Route to nearest volunteer or helpline
      if (nearbyVolunteers.length > 0) {
        const closestVolunteer = nearbyVolunteers[0];
        toast.loading('Connecting to nearest volunteer...');
        // Call the volunteer
        window.open(`tel:${closestVolunteer.phoneNumber}`);
      } else {
        toast.loading('Connecting to national helpline...');
        // Call national helpline
        window.open('tel:112');
      }
    } catch (error) {
      console.error('SOS Error:', error);
      alert('Failed to send SOS. Please try again.');
    } finally {
      setIsSOSLoading(false);
    }
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
          <p className="text-muted-foreground">Contact emergency services and support - {cityName}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Emergency Services */}
          <Card className="border-red-200">
            <CardContent className="p-6 text-center space-y-3">
              <PhoneOff className="h-8 w-8 text-red-600 mx-auto" />
              <h3 className="font-medium">Emergency Services</h3>
              <p className="text-2xl font-bold text-red-600">112</p>
              <p className="text-sm text-muted-foreground">Police, Fire, Medical Emergency</p>
              <Button 
                className="w-full mt-2"
                onClick={() => window.open('tel:112')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            </CardContent>
          </Card>

          {/* Ambulance */}
          <Card className="border-orange-200">
            <CardContent className="p-6 text-center space-y-3">
              <Heart className="h-8 w-8 text-orange-600 mx-auto" />
              <h3 className="font-medium">Ambulance Service</h3>
              <p className="text-2xl font-bold text-orange-600">102</p>
              <p className="text-sm text-muted-foreground">Medical Emergency & Ambulance</p>
              <Button 
                className="w-full mt-2"
                variant="outline"
                onClick={() => window.open('tel:102')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            </CardContent>
          </Card>

          {/* Women's Helpline */}
          <Card className="border-pink-200">
            <CardContent className="p-6 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-pink-600 mx-auto" />
              <h3 className="font-medium">Women's Helpline</h3>
              <p className="text-2xl font-bold text-pink-600">1091</p>
              <p className="text-sm text-muted-foreground">Women in Distress Support</p>
              <Button 
                className="w-full mt-2"
                variant="outline"
                onClick={() => window.open('tel:1091')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            </CardContent>
          </Card>

          {/* NDMA - National Disaster Management */}
          <Card className="border-blue-200">
            <CardContent className="p-6 text-center space-y-3">
              <Navigation className="h-8 w-8 text-blue-600 mx-auto" />
              <h3 className="font-medium">NDMA Helpline</h3>
              <p className="text-2xl font-bold text-blue-600">011-26701728</p>
              <p className="text-sm text-muted-foreground">Disaster Relief Coordination</p>
              <Button 
                className="w-full mt-2"
                variant="outline"
                onClick={() => window.open('tel:+91-11-26701728')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
          <CardHeader>
            <CardTitle>Quick Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="text-blue-600 font-bold">1.</div>
              <p className="text-sm">Always enable your location for emergency services to find you faster</p>
            </div>
            <div className="flex gap-3">
              <div className="text-blue-600 font-bold">2.</div>
              <p className="text-sm">Keep your phone charged during emergencies</p>
            </div>
            <div className="flex gap-3">
              <div className="text-blue-600 font-bold">3.</div>
              <p className="text-sm">Update your emergency contact information in Settings</p>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full"
          variant="outline"
          onClick={() => setActiveView('dashboard')}
        >
          Back to Dashboard
        </Button>
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
          <CardDescription className="text-xs text-red-600 dark:text-red-300">
            Current location: {cityName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dynamic Hero Button - Closest Volunteer or Helpline */}
          <Button 
            className="w-full h-20 bg-red-600 hover:bg-red-700 text-white text-xl font-bold shadow-lg animate-pulse"
            onClick={handleEmergencySOS}
            disabled={isSOSLoading || isLoadingLocation}
          >
            {isSOSLoading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Connecting...</span>
              </div>
            ) : nearbyVolunteers.length > 0 ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <PhoneOff className="h-6 w-6" />
                  <span>CALL NEAREST VOLUNTEER</span>
                </div>
                <div className="text-xs font-normal">
                  {nearbyVolunteers[0].name} ({Math.round(nearbyVolunteers[0].distance)}m away)
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <PhoneOff className="h-6 w-6" />
                  <span>CALL NATIONAL HELPLINE (112)</span>
                </div>
                <div className="text-xs font-normal">No volunteers nearby</div>
              </div>
            )}
          </Button>
          
          {/* Nearby Rescuers List */}
          {nearbyVolunteers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Nearby Rescuers (Top 5)</p>
              <div className="space-y-2">
                {nearbyVolunteers.slice(0, 5).map((volunteer) => (
                  <div key={volunteer.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-slate-950/50">
                    <div className="flex-1">
                      <p className="font-medium">{volunteer.name}</p>
                      <p className="text-xs text-muted-foreground">{Math.round(volunteer.distance)}m away</p>
                    </div>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        toast.loading('Redirecting to dialer...');
                        window.open(`tel:${volunteer.phoneNumber}`);
                      }}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t">
            <Button variant="outline" className="h-12 border-red-300">
              <PhoneOff className="h-5 w-5 mr-2" />
              Quick SOS
            </Button>
            <Button 
              variant="outline" 
              className="h-12 border-red-300"
              onClick={() => setActiveView('request')}
            >
              <Package className="h-5 w-5 mr-2" />
              Detailed Request
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
