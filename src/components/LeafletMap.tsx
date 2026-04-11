import React, { useEffect, useRef, useState } from 'react';
import { AlertWithId } from '@/lib/alerts';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Phone, Navigation, X } from 'lucide-react';

interface LeafletMapProps {
  userLocation: { lat: number; lng: number };
  alerts: AlertWithId[];
  onSelectAlert: (alert: AlertWithId) => void;
  selectedAlert: AlertWithId | null;
  onClosePopup: () => void;
  onStartMission: (alert: AlertWithId) => void;
  radiusKm?: number;
}

declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

export function LeafletMap({
  userLocation,
  alerts,
  onSelectAlert,
  selectedAlert,
  onClosePopup,
  onStartMission,
  radiusKm = 2,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Leaflet CSS and JS
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.L) {
      // Add Leaflet CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Add Leaflet JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setIsLoaded(true);
      document.body.appendChild(script);
    } else if (window.L) {
      setIsLoaded(true);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

    const L = window.L;
    
    // Create map
    const map = L.map(mapContainerRef.current).setView(
      [userLocation.lat, userLocation.lng],
      14
    );

    // Add OpenStreetMap tiles (free, no API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    // Add user location marker (blue)
    const userIcon = L.divIcon({
      html: `<div style="background: #2563eb; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon,
    }).addTo(map);

    // Add radius circle
    circleRef.current = L.circle([userLocation.lat, userLocation.lng], {
      radius: radiusKm * 1000,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      weight: 2,
    }).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isLoaded, userLocation.lat, userLocation.lng, radiusKm]);

  // Update user location
  useEffect(() => {
    if (!mapRef.current || !userMarkerRef.current || !circleRef.current) return;
    
    userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    circleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
  }, [userLocation]);

  // Update alert markers
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const L = window.L;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add alert markers (red)
    alerts.forEach((alert) => {
      if (!alert.latitude || !alert.longitude) return;

      const alertIcon = L.divIcon({
        html: `<div style="background: #dc2626; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
          <div style="background: white; width: 8px; height: 8px; border-radius: 50%;"></div>
        </div>`,
        className: 'alert-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([alert.latitude, alert.longitude], {
        icon: alertIcon,
      }).addTo(mapRef.current!);

      marker.on('click', () => onSelectAlert(alert));
      markersRef.current.push(marker);
    });
  }, [isLoaded, alerts, onSelectAlert]);

  if (!isLoaded) {
    return (
      <div className="w-full h-[500px] bg-muted animate-pulse flex items-center justify-center rounded-lg">
        <span className="text-muted-foreground">Loading map...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        className="w-full h-[500px] rounded-lg"
        style={{ zIndex: 1 }}
      />
      
      {/* Custom popup for selected alert */}
      {selectedAlert && selectedAlert.latitude && selectedAlert.longitude && (
        <div 
          className="absolute bg-background border rounded-lg shadow-lg p-4 z-50 min-w-64"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <button 
            onClick={onClosePopup}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          
          <h3 className="font-semibold text-red-600 pr-6">{selectedAlert.emergencyType}</h3>
          <p className="text-sm mt-1">{selectedAlert.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{selectedAlert.description}</p>
          
          {selectedAlert.photoURL && (
            <img 
              src={selectedAlert.photoURL} 
              alt="Scene" 
              className="w-full h-24 object-cover mt-2 rounded" 
            />
          )}
          
          {selectedAlert.visionAnalysis && !selectedAlert.visionAnalysis.isFalseAlarm && (
            <Badge variant="outline" className="mt-2">
              Severity: {selectedAlert.visionAnalysis.severity}/10
            </Badge>
          )}
          
          <div className="mt-3 flex gap-2">
            {selectedAlert.phone && (
              <a
                href={`tel:${selectedAlert.phone}`}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                <Phone className="h-3 w-3" />
                Call
              </a>
            )}
            <Button
              size="sm"
              onClick={() => onStartMission(selectedAlert)}
              className="bg-green-600 hover:bg-green-700 text-xs"
            >
              <Navigation className="h-3 w-3 mr-1" />
              Start Mission
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
