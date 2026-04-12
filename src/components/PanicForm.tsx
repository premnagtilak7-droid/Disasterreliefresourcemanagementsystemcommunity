import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { MapPin, Camera, Loader2, AlertTriangle, CheckCircle, Phone } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface PanicFormProps {
  userId: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

export function PanicForm({ userId, onSuccess, onBack }: PanicFormProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-get location on mount
  useEffect(() => {
    handleGetLocation();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsGettingLocation(false);
        toast.success('Location captured!');
      },
      (error) => {
        console.error('Location error:', error);
        setLocationError('Could not get location. Please enable GPS.');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleStartCamera = async () => {
    setIsTakingPhoto(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Could not access camera');
      setIsTakingPhoto(false);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      setPhoto(imageData);
    }

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsTakingPhoto(false);
    toast.success('Photo captured!');
  };

  const handleCancelCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsTakingPhoto(false);
  };

  const handleSubmitSOS = async () => {
    if (!location) {
      toast.error('Location is required for emergency SOS');
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit to emergency_alerts with CRITICAL priority
      await addDoc(collection(db, 'emergency_alerts'), {
        userId,
        name: 'Anonymous Emergency',
        phone: null,
        location: `${location.lat}, ${location.lng}`,
        latitude: location.lat,
        longitude: location.lng,
        description: 'CRITICAL EMERGENCY - Anonymous SOS',
        imageUrl: photo,
        photoURL: photo,
        emergencyType: 'CRITICAL SOS',
        status: 'pending',
        priority: 'CRITICAL',
        isAnonymous: true,
        isCritical: true,
        bypassRadius: true, // Flag to show to all volunteers
        createdAt: serverTimestamp(),
      });

      setIsSubmitted(true);
      toast.success('Emergency SOS sent! Help is on the way.');
      
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error) {
      console.error('Failed to submit SOS:', error);
      toast.error('Failed to send SOS. Please try again or call 112.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">SOS Sent!</h2>
              <p className="text-muted-foreground">
                Your emergency alert has been broadcast to all nearby volunteers.
                Stay calm and stay where you are if it is safe.
              </p>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Need immediate help?</p>
              <a 
                href="tel:112" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
              >
                <Phone className="h-5 w-5" />
                Call 112
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-950 dark:via-orange-950 dark:to-yellow-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 dark:border-red-800">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-700 dark:text-red-400">Emergency SOS</CardTitle>
          <CardDescription>
            Send your location immediately. Help will be dispatched.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Location Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Location
              </span>
              {location && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Captured
                </span>
              )}
            </div>
            
            {locationError && (
              <p className="text-sm text-red-600">{locationError}</p>
            )}
            
            {!location ? (
              <Button 
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="w-full h-16 text-lg bg-blue-600 hover:bg-blue-700"
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin className="h-5 w-5 mr-2" />
                    Send My Location
                  </>
                )}
              </Button>
            ) : (
              <div className="p-3 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-mono text-green-700 dark:text-green-400">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>

          {/* Photo Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-2">
                <Camera className="h-5 w-5 text-purple-600" />
                Photo (Optional)
              </span>
              {photo && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Captured
                </span>
              )}
            </div>

            {isTakingPhoto ? (
              <div className="space-y-3">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full rounded-lg bg-black"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCapturePhoto}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Capture
                  </Button>
                  <Button 
                    onClick={handleCancelCamera}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : photo ? (
              <div className="space-y-2">
                <img 
                  src={photo} 
                  alt="Captured" 
                  className="w-full rounded-lg"
                />
                <Button 
                  onClick={() => setPhoto(null)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Retake Photo
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleStartCamera}
                variant="outline"
                className="w-full h-14"
              >
                <Camera className="h-5 w-5 mr-2" />
                Snap Photo
              </Button>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Submit Button */}
          <Button 
            onClick={handleSubmitSOS}
            disabled={!location || isSubmitting}
            className="w-full h-20 text-xl bg-red-600 hover:bg-red-700 animate-pulse disabled:animate-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                Sending SOS...
              </>
            ) : (
              <>
                <AlertTriangle className="h-6 w-6 mr-2" />
                SEND EMERGENCY SOS
              </>
            )}
          </Button>

          {/* Back Link */}
          {onBack && (
            <Button 
              onClick={onBack}
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              Back to Login
            </Button>
          )}

          {/* Emergency Call */}
          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground mb-2">For immediate help, call:</p>
            <a 
              href="tel:112" 
              className="inline-flex items-center gap-2 text-red-600 font-bold text-lg hover:underline"
            >
              <Phone className="h-5 w-5" />
              112 (Emergency)
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
