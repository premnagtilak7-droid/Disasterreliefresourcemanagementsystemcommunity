import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  MapPin, 
  Navigation, 
  AlertTriangle,
  CheckCircle,
  Phone,
  User,
  Loader2
} from 'lucide-react';
import { 
  subscribeToPendingAlerts, 
  resolveAlert, 
  calculateDistance,
  AlertWithId 
} from '@/lib/alerts';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

const RADIUS_KM = 2; // 2km radius for nearby alerts

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060,
};

export function VolunteerMapView() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [alerts, setAlerts] = useState<AlertWithId[]>([]);
  const [nearbyAlerts, setNearbyAlerts] = useState<AlertWithId[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertWithId | null>(null);
  const [isResolving, setIsResolving] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Location error:', error);
          setLocationError('Could not get your location. Using default location.');
          setUserLocation(defaultCenter);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError('Geolocation not supported. Using default location.');
      setUserLocation(defaultCenter);
    }
  }, []);

  // Subscribe to pending alerts from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToPendingAlerts((fetchedAlerts) => {
      setAlerts(fetchedAlerts);
    });

    return () => unsubscribe();
  }, []);

  // Filter alerts within 2km radius
  useEffect(() => {
    if (userLocation && alerts.length > 0) {
      const nearby = alerts.filter((alert) => {
        if (alert.latitude && alert.longitude) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            alert.latitude,
            alert.longitude
          );
          return distance <= RADIUS_KM;
        }
        return false;
      });
      setNearbyAlerts(nearby);
    } else {
      setNearbyAlerts([]);
    }
  }, [userLocation, alerts]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleResolveAlert = async (alertId: string) => {
    setIsResolving(alertId);
    try {
      await resolveAlert(alertId);
      setSelectedAlert(null);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      alert('Failed to resolve alert. Please try again.');
    } finally {
      setIsResolving(null);
    }
  };

  if (loadError) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800">Map Failed to Load</h3>
            <p className="text-red-600">Please check your Google Maps API key configuration.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoaded || !userLocation) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-muted-foreground">Loading map and detecting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Volunteer Map View</h1>
          <p className="text-muted-foreground">
            Showing pending alerts within {RADIUS_KM}km of your location
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {nearbyAlerts.length} alert{nearbyAlerts.length !== 1 ? 's' : ''} nearby
        </Badge>
      </div>

      {locationError && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800 text-sm">{locationError}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Google Map */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Live Alert Map
            </CardTitle>
            <CardDescription>
              Red markers indicate pending SOS alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={userLocation}
              zoom={14}
              onLoad={onMapLoad}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
              }}
            >
              {/* User location marker (blue) */}
              <Marker
                position={userLocation}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#3B82F6',
                  fillOpacity: 1,
                  strokeColor: '#1D4ED8',
                  strokeWeight: 3,
                }}
                title="Your Location"
              />

              {/* Alert markers (red) */}
              {nearbyAlerts.map((alert) => (
                alert.latitude && alert.longitude && (
                  <Marker
                    key={alert.id}
                    position={{ lat: alert.latitude, lng: alert.longitude }}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 12,
                      fillColor: '#EF4444',
                      fillOpacity: 1,
                      strokeColor: '#B91C1C',
                      strokeWeight: 2,
                    }}
                    onClick={() => setSelectedAlert(alert)}
                  />
                )
              ))}

              {/* Info window for selected alert */}
              {selectedAlert && selectedAlert.latitude && selectedAlert.longitude && (
                <InfoWindow
                  position={{ lat: selectedAlert.latitude, lng: selectedAlert.longitude }}
                  onCloseClick={() => setSelectedAlert(null)}
                >
                  <div className="p-2 min-w-48">
                    <h3 className="font-semibold text-red-600">{selectedAlert.emergencyType}</h3>
                    <p className="text-sm mt-1">{selectedAlert.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{selectedAlert.description}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleResolveAlert(selectedAlert.id)}
                        disabled={isResolving === selectedAlert.id}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {isResolving === selectedAlert.id ? 'Resolving...' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </CardContent>
        </Card>

        {/* Nearby Alerts List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Pending Alerts
              </CardTitle>
              <CardDescription>
                Alerts within {RADIUS_KM}km requiring assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nearbyAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No pending alerts in your area</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {nearbyAlerts.map((alert) => {
                    const distance = alert.latitude && alert.longitude && userLocation
                      ? calculateDistance(
                          userLocation.lat,
                          userLocation.lng,
                          alert.latitude,
                          alert.longitude
                        ).toFixed(2)
                      : 'N/A';

                    return (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAlert?.id === alert.id
                            ? 'bg-red-50 border-red-200'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-xs">
                                {alert.emergencyType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {distance}km away
                              </span>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-3 w-3" />
                                <span>{alert.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{alert.phone}</span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {alert.description}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (alert.latitude && alert.longitude) {
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`,
                                  '_blank'
                                );
                              }
                            }}
                          >
                            <Navigation className="h-3 w-3 mr-1" />
                            Navigate
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolveAlert(alert.id);
                            }}
                            disabled={isResolving === alert.id}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {isResolving === alert.id ? 'Resolving...' : 'Resolve'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
