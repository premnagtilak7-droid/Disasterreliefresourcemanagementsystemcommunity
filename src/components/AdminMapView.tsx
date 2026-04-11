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
  Loader2,
  RefreshCw
} from 'lucide-react';
import { 
  subscribeToPendingAlerts, 
  resolveAlert, 
  AlertWithId 
} from '@/lib/alerts';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060,
};

export function AdminMapView() {
  const [alerts, setAlerts] = useState<AlertWithId[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertWithId | null>(null);
  const [isResolving, setIsResolving] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  // Subscribe to all pending alerts from Firestore (real-time)
  useEffect(() => {
    const unsubscribe = subscribeToPendingAlerts((fetchedAlerts) => {
      setAlerts(fetchedAlerts);
      
      // Center map on first alert if available
      if (fetchedAlerts.length > 0 && fetchedAlerts[0].latitude && fetchedAlerts[0].longitude) {
        setMapCenter({
          lat: fetchedAlerts[0].latitude,
          lng: fetchedAlerts[0].longitude,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleResolveAlert = async (alertId: string) => {
    setIsResolving(alertId);
    try {
      await resolveAlert(alertId);
      setSelectedAlert(null);
      // The real-time subscription will automatically update the alerts list
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
            <p className="text-sm text-red-500 mt-2">
              Add VITE_GOOGLE_MAPS_API_KEY to your environment variables.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Admin Map Overview</h1>
          <p className="text-muted-foreground">
            All pending SOS alerts across the system (Real-time updates)
          </p>
        </div>
        <Badge variant={alerts.length > 0 ? "destructive" : "secondary"} className="text-sm">
          {alerts.length} pending alert{alerts.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Google Map */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              All Pending Alerts
            </CardTitle>
            <CardDescription>
              Click on red markers to view details and resolve
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={12}
              onLoad={onMapLoad}
              options={{
                streetViewControl: false,
                mapTypeControl: true,
              }}
            >
              {/* Alert markers (red) */}
              {alerts.map((alert) => (
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
                  <div className="p-2 min-w-56">
                    <h3 className="font-semibold text-red-600 text-base">{selectedAlert.emergencyType}</h3>
                    <div className="mt-2 space-y-1 text-sm">
                      <p><strong>Name:</strong> {selectedAlert.name}</p>
                      <p><strong>Phone:</strong> {selectedAlert.phone}</p>
                      <p><strong>Location:</strong> {selectedAlert.location}</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{selectedAlert.description}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleResolveAlert(selectedAlert.id)}
                        disabled={isResolving === selectedAlert.id}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {isResolving === selectedAlert.id ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Resolving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Mark Resolved
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                All Pending Alerts
              </CardTitle>
              <CardDescription>
                Real-time list from Firestore
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No pending alerts</p>
                  <p className="text-sm">All requests have been resolved</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAlert?.id === alert.id
                          ? 'bg-red-50 border-red-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setSelectedAlert(alert);
                        if (alert.latitude && alert.longitude) {
                          setMapCenter({ lat: alert.latitude, lng: alert.longitude });
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Badge variant="destructive" className="text-xs mb-2">
                            {alert.emergencyType || 'Emergency'}
                          </Badge>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-3 w-3" />
                              <span className="font-medium">{alert.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{alert.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{alert.location}</span>
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
