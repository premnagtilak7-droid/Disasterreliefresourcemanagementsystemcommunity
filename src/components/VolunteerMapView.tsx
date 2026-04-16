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
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { 
  subscribeToPendingAlerts, 
  resolveAlert, 
  calculateDistance,
  AlertWithId 
} from '@/lib/alerts';
import { playVolunteerAlarm, stopVolunteerAlarm, isAlarmActive } from '@/lib/audio';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle, Libraries } from '@react-google-maps/api';
import { toast } from 'sonner';
import { MissionSummary } from './MissionSummary';
import { LeafletMap } from './LeafletMap';

// Define libraries outside component to prevent re-renders
const libraries: Libraries = ['places', 'geometry'];

const RADIUS_KM = 2; // 2km radius for nearby alerts

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060,
};

interface VolunteerMapViewProps {
  userId?: string;
}

export function VolunteerMapView({ userId }: VolunteerMapViewProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [alerts, setAlerts] = useState<AlertWithId[]>([]);
  const [nearbyAlerts, setNearbyAlerts] = useState<AlertWithId[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertWithId | null>(null);
  const [isResolving, setIsResolving] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeMission, setActiveMission] = useState<AlertWithId | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [useLeaflet, setUseLeaflet] = useState(true); // Default to Leaflet (free, no API key needed)
  const [alarmActive, setAlarmActive] = useState(false);
  const [newAlertIds, setNewAlertIds] = useState<string[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const previousAlertIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Initialize beep audio
  useEffect(() => {
    // Create a beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0;
    
    audioRef.current = new Audio();
    
    return () => {
      audioContext.close();
    };
  }, []);

  // Only load Google Maps if we have an API key
  const hasApiKey = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: hasApiKey ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY : 'DUMMY_KEY',
    libraries,
    skipGoogleMapsApiJs: !hasApiKey, // Skip loading Google Maps API if no key
  });

  // Get user's current location with live tracking using watchPosition
  useEffect(() => {
    if (navigator.geolocation) {
      // Initial position
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

      // Live tracking with watchPosition
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Watch location error:', error);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    } else {
      setLocationError('Geolocation not supported. Using default location.');
      setUserLocation(defaultCenter);
    }

    // Cleanup watchPosition on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Play beep sound function
  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  }, []);

  // Subscribe to pending alerts from Firestore with alarm notification
  useEffect(() => {
    const unsubscribe = subscribeToPendingAlerts((fetchedAlerts) => {
      // Check for new alerts
      const currentIds = new Set(fetchedAlerts.map(a => a.id));
      const newAlerts = fetchedAlerts.filter(alert => !previousAlertIdsRef.current.has(alert.id));
      
      // Only notify if this isn't the initial load and there are new alerts
      if (previousAlertIdsRef.current.size > 0 && newAlerts.length > 0) {
        const nearbyNewAlerts: string[] = [];
        
        newAlerts.forEach(alert => {
          // CRITICAL alerts or alerts within 2km trigger the alarm
          const isCritical = alert.priority === 'CRITICAL' || alert.isCritical || alert.bypassRadius;
          
          if (isCritical || (userLocation && alert.latitude && alert.longitude)) {
            let shouldTrigger = isCritical;
            
            if (!shouldTrigger && userLocation && alert.latitude && alert.longitude) {
              const distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                alert.latitude,
                alert.longitude
              );
              shouldTrigger = distance <= RADIUS_KM;
            }
            
            if (shouldTrigger) {
              nearbyNewAlerts.push(alert.id);
            }
          }
        });
        
        // If there are nearby new alerts, trigger continuous alarm
        if (nearbyNewAlerts.length > 0) {
          setNewAlertIds(prev => [...prev, ...nearbyNewAlerts]);
          setAlarmActive(true);
          playVolunteerAlarm();
          
          toast.error(
            <div className="flex flex-col gap-2">
              <span className="font-bold">NEW EMERGENCY ALERT!</span>
              <span>{nearbyNewAlerts.length} new SOS{nearbyNewAlerts.length > 1 ? 's' : ''} detected</span>
              <span className="text-xs">Click Acknowledge to silence alarm</span>
            </div>,
            {
              duration: Infinity,
              icon: '🚨',
            }
          );
        }
      }
      
      previousAlertIdsRef.current = currentIds;
      setAlerts(fetchedAlerts);
    });

    return () => {
      unsubscribe();
      // Stop alarm when component unmounts
      if (isAlarmActive()) {
        stopVolunteerAlarm();
      }
    };
  }, [userLocation]);

  // Filter alerts within 2km radius (CRITICAL alerts bypass radius filter)
  useEffect(() => {
    if (userLocation && alerts.length > 0) {
      const nearby = alerts.filter((alert) => {
        // CRITICAL alerts bypass the 2km radius filter - show to everyone
        if (alert.priority === 'CRITICAL' || alert.isCritical || alert.bypassRadius || alert.isAnonymous) {
          return alert.latitude && alert.longitude;
        }
        
        // Normal alerts: check 2km radius
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
      
      // Sort: CRITICAL alerts first
      nearby.sort((a, b) => {
        const aIsCritical = a.priority === 'CRITICAL' || a.isCritical;
        const bIsCritical = b.priority === 'CRITICAL' || b.isCritical;
        if (aIsCritical && !bIsCritical) return -1;
        if (!aIsCritical && bIsCritical) return 1;
        return 0;
      });
      
      setNearbyAlerts(nearby);
    } else {
      setNearbyAlerts([]);
    }
  }, [userLocation, alerts]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    // Wait for map to be fully loaded before showing content
    google.maps.event.addListenerOnce(map, 'idle', () => {
      setMapReady(true);
    });
  }, []);

  // Stop alarm and acknowledge alerts
  const handleAcknowledgeAlarm = () => {
    stopVolunteerAlarm();
    setAlarmActive(false);
    setNewAlertIds([]);
    toast.dismiss(); // Dismiss alarm toasts
    toast.success('Alarm acknowledged. Review alerts below.');
  };

  const handleStartMission = (alert: AlertWithId) => {
    // Stop alarm when starting a mission
    if (alarmActive) {
      stopVolunteerAlarm();
      setAlarmActive(false);
      setNewAlertIds([]);
      toast.dismiss();
    }
    setActiveMission(alert);
    setSelectedAlert(null);
  };

  const handleMissionResolved = () => {
    setActiveMission(null);
    setSelectedAlert(null);
  };

  const handleResolveAlert = async (alertId: string) => {
    setIsResolving(alertId);
    try {
      await resolveAlert(alertId, userId);
      setSelectedAlert(null);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      alert('Failed to resolve alert. Please try again.');
    } finally {
      setIsResolving(null);
    }
  };

  // Check if we should use Leaflet fallback
  const shouldUseLeaflet = !hasApiKey || loadError || useLeaflet;

  // If using Leaflet, only need userLocation (not Google Maps isLoaded)
  if (!shouldUseLeaflet && !isLoaded) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-muted-foreground">Detecting your location...</p>
        </div>
      </div>
    );
  }

  // If there's an active mission, show mission summary
  if (activeMission) {
    return (
      <MissionSummary
        alert={activeMission}
        volunteerId={userId || 'anonymous'}
        volunteerName="Volunteer"
        volunteerLocation={userLocation}
        onClose={() => setActiveMission(null)}
        onResolved={handleMissionResolved}
      />
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

      {/* Alarm Active Banner */}
      {alarmActive && (
        <Card className="border-red-500 bg-red-100 dark:bg-red-950 animate-pulse">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 animate-bounce" />
              <div>
                <p className="text-red-800 dark:text-red-200 font-bold">EMERGENCY ALERT - ALARM ACTIVE</p>
                <p className="text-red-700 dark:text-red-300 text-sm">
                  {newAlertIds.length} new alert{newAlertIds.length > 1 ? 's' : ''} detected nearby
                </p>
              </div>
            </div>
            <Button 
              onClick={handleAcknowledgeAlarm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Acknowledge Alarm
            </Button>
          </CardContent>
        </Card>
      )}

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Live Alert Map
                </CardTitle>
                <CardDescription>
                  Red markers indicate pending SOS alerts
                </CardDescription>
              </div>
              {shouldUseLeaflet ? (
                hasApiKey && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setUseLeaflet(false)}
                    className="text-xs"
                  >
                    Use Google Maps
                  </Button>
                )
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setUseLeaflet(true)}
                  className="text-xs"
                >
                  Use Free Map
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="relative">
            {shouldUseLeaflet ? (
              /* Leaflet Map (Free fallback - no API key needed) */
              <LeafletMap
                userLocation={userLocation}
                alerts={nearbyAlerts}
                selectedAlert={selectedAlert}
                onSelectAlert={setSelectedAlert}
                onClosePopup={() => setSelectedAlert(null)}
                onStartMission={handleStartMission}
                radiusKm={RADIUS_KM}
              />
            ) : (
              /* Google Maps */
              <>
                {/* Loading overlay until map is ready */}
                {!mapReady && (
                  <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Initializing map...</p>
                    </div>
                  </div>
                )}
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={userLocation}
                  zoom={14}
                  onLoad={onMapLoad}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    zoomControl: true,
                  }}
                >
              {/* 2km Radius Circle around volunteer location */}
              <Circle
                center={userLocation}
                radius={RADIUS_KM * 1000} // Convert km to meters
                options={{
                  fillColor: '#3B82F6',
                  fillOpacity: 0.1,
                  strokeColor: '#3B82F6',
                  strokeOpacity: 0.5,
                  strokeWeight: 2,
                }}
              />

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
                    {selectedAlert.photoURL && (
                      <img src={selectedAlert.photoURL} alt="Scene" className="w-full h-16 object-cover mt-2 rounded" />
                    )}
                    <div className="mt-2 flex gap-2">
                      {selectedAlert.phone && (
                        <a
                          href={`tel:${selectedAlert.phone}`}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Call
                        </a>
                      )}
                      <button
                        onClick={() => handleStartMission(selectedAlert)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Start Mission
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
                </GoogleMap>
              </>
            )}
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

                    const isCritical = alert.priority === 'CRITICAL' || alert.isCritical || alert.isAnonymous;

                    return (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isCritical
                            ? 'bg-red-100 border-red-400 dark:bg-red-950/50 dark:border-red-700 animate-pulse'
                            : selectedAlert?.id === alert.id
                              ? 'bg-red-50 border-red-200'
                              : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isCritical && (
                                <Badge className="text-xs bg-red-600 text-white animate-pulse">
                                  CRITICAL
                                </Badge>
                              )}
                              <Badge variant="destructive" className="text-xs">
                                {alert.emergencyType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {distance}km away
                              </span>
                              {alert.isAnonymous && (
                                <Badge variant="outline" className="text-xs">
                                  Anonymous SOS
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <UserIcon className="h-3 w-3" />
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
