import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Camera, Loader2, AlertTriangle, CheckCircle, Phone, MessageSquare, User, X, Siren } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { analyzeEmergencyDispatch, EmergencyDispatchResult } from '@/lib/gemini';

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
  const [assignedVolunteer, setAssignedVolunteer] = useState<string | null>(null);
  
  // New form fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [helpMessage, setHelpMessage] = useState('');
  
  // Emergency Dispatcher AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<EmergencyDispatchResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play confirmation chirp sound when SOS is successfully sent
  const playConfirmationChirp = () => {
    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      
      // Resume audio context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Create a confirmation chirp (2-second ascending tone)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Chirp pattern: ascending frequency
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.3);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.4);
      oscillator.frequency.linearRampToValueAtTime(1000, audioContext.currentTime + 0.7);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.8);
      oscillator.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 1.1);
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.5);
      gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 1.5);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 2);
    } catch (error) {
      console.error('Failed to play confirmation sound:', error);
    }
  };

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

  const handleCapturePhoto = async () => {
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
      setDispatchResult(null);
      setAnalysisError(null);
      
      // Run AI analysis on captured photo
      toast.success('Photo captured! Analyzing...');
      await analyzePhotoWithAI(imageData);
    }

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsTakingPhoto(false);
  };

  const handleCancelCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsTakingPhoto(false);
  };

  // Handle file selection (converts to Base64) and triggers AI analysis
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setPhoto(base64String);
      setDispatchResult(null);
      setAnalysisError(null);
      toast.success('Photo captured! Analyzing...');
      
      // Run Emergency Dispatcher AI analysis
      await analyzePhotoWithAI(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Analyze photo with Emergency Dispatcher AI
  const analyzePhotoWithAI = async (base64Image: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      console.log('[v0] Starting Emergency Dispatcher AI analysis...');
      const result = await analyzeEmergencyDispatch(base64Image);
      
      // Log full AI response to console for debugging
      console.log('[v0] Emergency Dispatcher AI Response:', JSON.stringify(result, null, 2));
      
      setDispatchResult(result);
      
      // Show popup modal if critical hazard detected
      if (result.status_level === 'critical' && result.recommended_action !== 'none') {
        console.log('[v0] CRITICAL HAZARD DETECTED - Showing emergency modal');
        setShowEmergencyModal(true);
        toast.error(`CRITICAL: ${result.hazard_type} detected! Severity ${result.severity_score}/10`);
      } else if (result.status_level === 'monitoring') {
        toast.warning(`${result.hazard_type} detected - Severity ${result.severity_score}/10`);
      } else {
        toast.success(`Analysis complete: ${result.hazard_type} - Severity ${result.severity_score}/10`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze photo';
      console.error('[v0] Emergency Dispatcher AI Error:', error);
      setAnalysisError(errorMessage);
      toast.error('AI analysis failed: ' + errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Find nearest volunteer
  const findNearestVolunteer = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const volunteersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'volunteer')
      );
      const snapshot = await getDocs(volunteersQuery);
      
      if (snapshot.empty) return null;
      
      let nearestVolunteer: string | null = null;
      let nearestDistance = Infinity;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.latitude && data.longitude && data.name) {
          const distance = calculateDistance(lat, lng, data.latitude, data.longitude);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestVolunteer = data.name;
          }
        }
      });
      
      return nearestVolunteer || 'Nearby Volunteer';
    } catch {
      return 'Volunteer Team';
    }
  };

  // Haversine formula for distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSubmitSOS = async () => {
    if (!location) {
      toast.error('Location is required for emergency SOS');
      return;
    }

    if (!phoneNumber.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Find nearest volunteer for confirmation
      const volunteerName = await findNearestVolunteer(location.lat, location.lng);
      
      // Submit to emergency_alerts with CRITICAL priority
      // Photo is stored as Base64 in imageUrl field
      await addDoc(collection(db, 'emergency_alerts'), {
        userId,
        name: 'Emergency Victim',
        phone: phoneNumber.trim(),
        location: `${location.lat}, ${location.lng}`,
        latitude: location.lat,
        longitude: location.lng,
        description: helpMessage.trim() || 'CRITICAL EMERGENCY - SOS Alert',
        helpMessage: helpMessage.trim(),
        imageUrl: photo, // Base64 string stored here
        photoURL: photo, // Also stored for compatibility
        emergencyType: 'CRITICAL SOS',
        status: 'pending',
        priority: 'CRITICAL',
        isAnonymous: false,
        isCritical: true,
        bypassRadius: true, // Flag to show to all volunteers
        createdAt: serverTimestamp(),
      });

      setAssignedVolunteer(volunteerName);
      setIsSubmitted(true);
      
      // Play confirmation chirp so victim knows SOS was sent
      playConfirmationChirp();
      
      toast.success('Emergency SOS sent! Help is on the way.');
      
      if (onSuccess) {
        setTimeout(onSuccess, 3000);
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
        <Card className="w-full max-w-md text-center border-green-200 dark:border-green-800">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">Help is on the way!</h2>
              {assignedVolunteer && (
                <div className="p-4 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                    <User className="h-5 w-5" />
                    <span className="font-semibold">{assignedVolunteer}</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    is being notified of your emergency
                  </p>
                </div>
              )}
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

  // Get emergency number based on recommended action
  const getEmergencyNumber = (action: string): string => {
    switch (action) {
      case 'call_101': return '101';
      case 'call_102': return '102';
      case 'call_100': return '100';
      default: return '112';
    }
  };

  const getEmergencyLabel = (action: string): string => {
    switch (action) {
      case 'call_101': return 'Fire Department (101)';
      case 'call_102': return 'Ambulance (102)';
      case 'call_100': return 'Police (100)';
      default: return 'Emergency (112)';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50/50 to-yellow-50/30 dark:from-red-950 dark:via-orange-950 dark:to-yellow-950 flex items-center justify-center p-4">
      {/* Emergency Call Modal */}
      {showEmergencyModal && dispatchResult && dispatchResult.recommended_action !== 'none' && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm border-red-500 border-2 bg-white dark:bg-slate-900 animate-pulse">
            <CardHeader className="bg-red-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Siren className="h-6 w-6 animate-bounce" />
                  <CardTitle>AI DETECTED CRITICAL HAZARD</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowEmergencyModal(false)}
                  className="text-white hover:bg-red-700"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <Badge className="bg-red-600 text-lg px-4 py-1">
                  {dispatchResult.hazard_type}
                </Badge>
                <p className="text-2xl font-bold">
                  Severity: {dispatchResult.severity_score}/10
                </p>
                <p className="text-muted-foreground">
                  {dispatchResult.visual_evidence_summary}
                </p>
              </div>
              
              <div className="bg-red-50 dark:bg-red-950/50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-700 dark:text-red-300 mb-2 font-medium">
                  Recommended: Call {dispatchResult.authority_assigned}
                </p>
              </div>

              <a
                href={`tel:${getEmergencyNumber(dispatchResult.recommended_action)}`}
                className="block w-full"
              >
                <Button 
                  className="w-full h-16 text-xl bg-red-600 hover:bg-red-700 animate-pulse"
                >
                  <Phone className="h-6 w-6 mr-3" />
                  CALL {getEmergencyLabel(dispatchResult.recommended_action)}
                </Button>
              </a>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowEmergencyModal(false)}
              >
                I&apos;ll call manually later
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="w-full max-w-md border-red-200 dark:border-red-800">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-700 dark:text-red-400">Emergency SOS</CardTitle>
          <CardDescription>
            Send your location immediately. Help will be dispatched.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-5">
          {/* Location Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                Location
              </Label>
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
            
            {isGettingLocation ? (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-400">Getting Location...</span>
              </div>
            ) : location ? (
              <div className="p-3 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-mono text-green-700 dark:text-green-400">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              </div>
            ) : (
              <Button 
                onClick={handleGetLocation}
                variant="outline"
                className="w-full"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Get My Location
              </Button>
            )}
          </div>

          {/* Phone Number Field - Required */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="font-medium flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-600" />
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full"
              required
            />
          </div>

          {/* Help Message Field */}
          <div className="space-y-2">
            <Label htmlFor="helpMessage" className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              Help Message
            </Label>
            <Textarea
              id="helpMessage"
              placeholder="Describe your emergency situation..."
              value={helpMessage}
              onChange={(e) => setHelpMessage(e.target.value)}
              className="w-full min-h-[80px] resize-none"
            />
          </div>

          {/* Photo Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-purple-600" />
                Photo (Optional)
              </Label>
              {photo && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Captured
                </span>
              )}
            </div>

            {/* Hidden file input for fallback */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {isTakingPhoto ? (
              <div className="space-y-3">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full rounded-lg bg-black aspect-video object-cover"
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
              <div className="space-y-3">
                {/* Render Base64 photo as Data URI */}
                <img 
                  src={photo} 
                  alt="Captured disaster photo" 
                  className="w-full rounded-lg max-h-48 object-cover"
                />
                
                {/* AI Analysis Loading */}
                {isAnalyzing && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-700 dark:text-blue-400">
                      Emergency Dispatcher AI analyzing...
                    </span>
                  </div>
                )}

                {/* AI Analysis Error */}
                {analysisError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-300">
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                      AI Analysis Error:
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      {analysisError}
                    </p>
                  </div>
                )}

                {/* AI Dispatch Result */}
                {dispatchResult && !isAnalyzing && (
                  <div className={`p-3 rounded-lg border-2 ${
                    dispatchResult.status_level === 'critical' 
                      ? 'bg-red-50 dark:bg-red-950/50 border-red-500' 
                      : dispatchResult.status_level === 'monitoring'
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400'
                        : 'bg-green-50 dark:bg-green-950/50 border-green-400'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">AI Dispatcher</span>
                      <Badge className={
                        dispatchResult.status_level === 'critical' ? 'bg-red-600' : 
                        dispatchResult.status_level === 'monitoring' ? 'bg-amber-500' : 'bg-green-600'
                      }>
                        {dispatchResult.status_level.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><strong>Hazard:</strong> {dispatchResult.hazard_type}</p>
                      <p><strong>Severity:</strong> {dispatchResult.severity_score}/10</p>
                      <p className="text-muted-foreground text-xs">{dispatchResult.visual_evidence_summary}</p>
                    </div>
                    
                    {/* Call Button for Critical */}
                    {dispatchResult.status_level === 'critical' && dispatchResult.recommended_action !== 'none' && (
                      <Button 
                        className="w-full mt-2 bg-red-600 hover:bg-red-700"
                        onClick={() => setShowEmergencyModal(true)}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call {dispatchResult.authority_assigned}
                      </Button>
                    )}
                  </div>
                )}

                <Button 
                  onClick={() => {
                    setPhoto(null);
                    setDispatchResult(null);
                    setAnalysisError(null);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Retake Photo
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => {
                  // Try camera API first, fallback to file input
                  if (navigator.mediaDevices?.getUserMedia) {
                    handleStartCamera();
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                variant="outline"
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Snap Photo
              </Button>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Submit Button */}
          <Button 
            onClick={handleSubmitSOS}
            disabled={!location || !phoneNumber.trim() || isSubmitting}
            className="w-full h-14 text-lg bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Sending Help...
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 mr-2" />
                SEND EMERGENCY SOS
              </>
            )}
          </Button>

          {/* No back button - Panic mode is locked until SOS is sent */}

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
