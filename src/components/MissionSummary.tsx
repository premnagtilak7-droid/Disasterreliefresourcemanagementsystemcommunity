import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  MapPin, 
  Phone, 
  User, 
  AlertTriangle,
  CheckCircle,
  Navigation,
  Clock,
  Camera,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { AlertWithId } from '@/lib/alerts';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker, Libraries } from '@react-google-maps/api';
import { doc, updateDoc, addDoc, collection, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

const libraries: Libraries = ['places', 'geometry', 'directions'];

interface MissionSummaryProps {
  alert: AlertWithId;
  volunteerId: string;
  volunteerName: string;
  volunteerLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onResolved: () => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
};

export function MissionSummary({ 
  alert, 
  volunteerId, 
  volunteerName,
  volunteerLocation, 
  onClose,
  onResolved 
}: MissionSummaryProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Calculate directions when map is loaded
  useEffect(() => {
    if (isLoaded && volunteerLocation && alert.latitude && alert.longitude) {
      const directionsService = new google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: volunteerLocation,
          destination: { lat: alert.latitude, lng: alert.longitude },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
          }
        }
      );
    }
  }, [isLoaded, volunteerLocation, alert.latitude, alert.longitude]);

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      // 1. Update alert status to resolved
      const alertRef = doc(db, 'alerts', alert.id);
      await updateDoc(alertRef, {
        status: 'resolved',
        resolverId: volunteerId,
        resolverName: volunteerName,
        resolvedAt: serverTimestamp(),
      });

      // 2. Move to rescue history collection
      await addDoc(collection(db, 'rescueHistory'), {
        ...alert,
        status: 'resolved',
        resolverId: volunteerId,
        resolverName: volunteerName,
        resolvedAt: serverTimestamp(),
        originalAlertId: alert.id,
      });

      toast.success('Mission completed! Added to your rescue history.');
      onResolved();
    } catch (error) {
      console.error('Error resolving mission:', error);
      toast.error('Failed to complete mission. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleCall = () => {
    if (alert.phone) {
      window.location.href = `tel:${alert.phone}`;
    }
  };

  const handleNavigate = () => {
    if (alert.latitude && alert.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`,
        '_blank'
      );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Map
        </Button>
        <Badge variant="destructive" className="text-lg px-4 py-1">
          Active Mission
        </Badge>
      </div>

      {/* Victim Info Card */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
            <User className="h-5 w-5" />
            Victim Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">{alert.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Number</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">{alert.phone || 'Not provided'}</p>
                {alert.phone && (
                  <Button size="sm" variant="outline" onClick={handleCall}>
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Emergency Type</p>
              <Badge variant="secondary">{alert.emergencyType || 'General'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="text-sm">{alert.location}</p>
            </div>
          </div>
          
          {alert.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm bg-white dark:bg-slate-900 p-3 rounded-lg border">
                {alert.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo & AI Analysis */}
      {alert.photoURL && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Disaster Photo & AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <img 
              src={alert.photoURL} 
              alt="Disaster scene" 
              className="w-full max-h-64 object-cover rounded-lg border"
            />
            {alert.visionAnalysis && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">AI Severity Score</p>
                  <p className="text-2xl font-bold text-red-600">
                    {alert.visionAnalysis.severity}/10
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Primary Need</p>
                  <Badge variant="destructive">
                    {alert.visionAnalysis.primaryNeed}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">AI Analysis</p>
                  <p className="text-sm">{alert.visionAnalysis.description}</p>
                </div>
                {alert.visionAnalysis.urgentDetails && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Urgent Details</p>
                    <p className="text-sm text-red-600 font-medium">
                      {alert.visionAnalysis.urgentDetails}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Map & Directions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Route to Victim
          </CardTitle>
          <CardDescription>
            {directions?.routes[0]?.legs[0]?.distance?.text} - 
            Approx. {directions?.routes[0]?.legs[0]?.duration?.text}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError && (
            <div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-lg">
              <p className="text-red-500">Error loading map</p>
            </div>
          )}
          
          {!isLoaded && !loadError && (
            <div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
          
          {isLoaded && !loadError && alert.latitude && alert.longitude && (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={{ lat: alert.latitude, lng: alert.longitude }}
              zoom={14}
            >
              {directions && <DirectionsRenderer directions={directions} />}
              {!directions && (
                <>
                  {volunteerLocation && (
                    <Marker
                      position={volunteerLocation}
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                      }}
                    />
                  )}
                  <Marker
                    position={{ lat: alert.latitude, lng: alert.longitude }}
                    icon={{
                      url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    }}
                  />
                </>
              )}
            </GoogleMap>
          )}

          <Button 
            className="w-full" 
            variant="outline"
            onClick={handleNavigate}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Open in Google Maps
          </Button>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={handleCall}
          disabled={!alert.phone}
        >
          <Phone className="h-4 w-4 mr-2" />
          Call Victim
        </Button>
        <Button 
          className="flex-1 bg-green-600 hover:bg-green-700"
          onClick={handleResolve}
          disabled={isResolving}
        >
          {isResolving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Completing...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Mission
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
