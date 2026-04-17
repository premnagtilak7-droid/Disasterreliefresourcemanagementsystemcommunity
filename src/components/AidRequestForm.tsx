import React, { useState, useRef, useEffect } from 'react';
import { User } from './AuthSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  AlertTriangle, 
  MapPin, 
  Phone, 
  Users, 
  Package,
  Heart,
  Home,
  Zap,
  CheckCircle,
  Camera,
  Upload,
  Loader2,
  X,
  Siren
} from 'lucide-react';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { analyzeBase64Photo, VisionAnalysis, isGeminiConfigured, analyzeEmergencyDispatch, EmergencyDispatchResult } from '@/lib/gemini';
import { toast } from 'sonner';

interface AidRequestFormProps {
  user: User;
}

const aidTypes = [
  { id: 'food', label: 'Food & Water', icon: Package, description: 'Emergency food supplies and clean water' },
  { id: 'medical', label: 'Medical Aid', icon: Heart, description: 'Medical supplies and healthcare assistance' },
  { id: 'shelter', label: 'Shelter', icon: Home, description: 'Temporary housing and shelter materials' },
  { id: 'emergency', label: 'Emergency Rescue', icon: AlertTriangle, description: 'Immediate rescue and evacuation' },
];

const priorityLevels = [
  { value: 'low', label: 'Low Priority', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium Priority', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High Priority', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical Emergency', color: 'bg-red-100 text-red-800' },
];

export function AidRequestForm({ user }: AidRequestFormProps) {
  const [formData, setFormData] = useState({
    aidType: '',
    priority: '',
    description: '',
    peopleCount: '',
    location: '',
    contactPhone: '',
    hasDisabilities: false,
    hasChildren: false,
    hasElderly: false,
    additionalNeeds: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressedBase64, setCompressedBase64] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [instantAnalysis, setInstantAnalysis] = useState<VisionAnalysis | null>(null);
  const [emergencyDispatch, setEmergencyDispatch] = useState<EmergencyDispatchResult | null>(null);
  const [autoCallCountdown, setAutoCallCountdown] = useState<number | null>(null);
  const [showAutoCallModal, setShowAutoCallModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Get emergency number based on recommended action
  const getEmergencyNumber = (action: string): string => {
    switch (action) {
      case 'call_101': return '101';
      case 'call_102': return '102';
      case 'call_100': return '100';
      default: return '112';
    }
  };

  // Start 2-second countdown then auto-trigger dialer
  const startAutoCallCountdown = (emergencyNumber: string) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    setAutoCallCountdown(2);
    setShowAutoCallModal(true);
    
    countdownRef.current = setInterval(() => {
      setAutoCallCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          // Auto-trigger the dialer
          window.location.href = `tel:${emergencyNumber}`;
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cancel auto-call
  const cancelAutoCall = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setAutoCallCountdown(null);
    setShowAutoCallModal(false);
    toast.info('Auto-call cancelled');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);
  
  // Check if Gemini API key is configured
  const geminiConfigured = isGeminiConfigured();

  // Compress image using canvas for faster Gemini analysis
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 800; // Max dimension
          let { width, height } = img;
          
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Get compressed base64 (JPEG at 70% quality)
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(base64.split(',')[1]); // Remove data:image/jpeg;base64, prefix
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setInstantAnalysis(null);
      setEmergencyDispatch(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Compress and analyze with Gemini IMMEDIATELY (before Firebase upload)
      try {
        setIsAnalyzing(true);
        toast.loading('AI Emergency Dispatcher analyzing photo...');
        
        const compressed = await compressImage(file);
        setCompressedBase64(compressed);
        
        // Run both analyses in parallel - pass description text for context priority
        const [basicAnalysis, dispatchAnalysis] = await Promise.all([
          analyzeBase64Photo(compressed),
          analyzeEmergencyDispatch(compressed, formData.description) // Pass user's text description
        ]);
        
        setInstantAnalysis(basicAnalysis);
        setEmergencyDispatch(dispatchAnalysis);
        toast.dismiss();
        
        if (basicAnalysis.description?.includes('API key not configured')) {
          toast.warning('AI analysis unavailable - photo will still be uploaded');
        } else if (basicAnalysis.isFalseAlarm) {
          toast.error(`False Alarm Detected: ${basicAnalysis.falseAlarmReason || 'Not a disaster image'}`);
        } else if (dispatchAnalysis.severity_score >= 7 && dispatchAnalysis.recommended_action !== 'none') {
          // Severity >= 7: Start 2-second auto-call countdown
          const emergencyNumber = getEmergencyNumber(dispatchAnalysis.recommended_action);
          toast.error(`CRITICAL: ${dispatchAnalysis.hazard_type} - Auto-calling ${dispatchAnalysis.authority_assigned} in 2s!`, {
            duration: 5000,
          });
          startAutoCallCountdown(emergencyNumber);
        } else if (dispatchAnalysis.status_level === 'monitoring') {
          toast.warning(`${dispatchAnalysis.hazard_type} detected - Severity ${dispatchAnalysis.severity_score}/10`);
        } else {
          toast.success(`AI Analysis: ${dispatchAnalysis.hazard_type} - Severity ${dispatchAnalysis.severity_score}/10`);
        }
      } catch (error) {
        console.error('Analysis error:', error);
        toast.error('Could not analyze photo');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setCompressedBase64(null);
    setInstantAnalysis(null);
    setEmergencyDispatch(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const uploadPhoto = async (alertId: string): Promise<string | null> => {
    if (!photoFile) return null;
    
    try {
      setIsUploadingPhoto(true);
      const storageRef = ref(storage, `alerts/${alertId}/${Date.now()}_${photoFile.name}`);
      await uploadBytes(storageRef, photoFile);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Photo upload error:', error);
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // RELAXED VALIDATION: Only Phone Number and Location are required
    if (!formData.contactPhone.trim()) {
      toast.error('Phone Number is required.');
      return;
    }
    if (!formData.location.trim()) {
      toast.error('Location is required.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      toast.loading('Submitting request...');
      
      // CONDITIONAL BASE64 LOGIC: Only process photo if it exists
      let imageUrl: string | null = null;
      if (compressedBase64) {
        // Use the already-compressed base64 string (smaller, faster)
        imageUrl = `data:image/jpeg;base64,${compressedBase64}`;
      }
      
      // Build special circumstances object
      const specialCircumstances = {
        hasDisabilities: formData.hasDisabilities,
        hasChildren: formData.hasChildren,
        hasElderly: formData.hasElderly,
        additionalNeeds: formData.additionalNeeds || null,
      };
      
      // DIRECT FIRESTORE WRITE to 'emergency_alerts' collection (unified collection)
      const alertData = {
        // User identification for filtering
        userId: user.id,
        name: user.name,
        phone: formData.contactPhone,
        // Location data with coordinates for 2km radius filtering
        location: formData.location,
        latitude: coordinates?.latitude || null,
        longitude: coordinates?.longitude || null,
        // Request details
        description: formData.description || null,
        imageUrl: imageUrl,
        photoURL: imageUrl, // Also store as photoURL for compatibility
        specialCircumstances: specialCircumstances,
        // Status for workflow
        status: 'pending',
        createdAt: serverTimestamp(),
        // Additional fields for context
        emergencyType: formData.aidType || 'General',
        priority: formData.priority || 'medium',
        peopleCount: formData.peopleCount ? parseInt(formData.peopleCount) : 1,
        visionAnalysis: instantAnalysis ? {
          severity: instantAnalysis.severity,
          primaryNeed: instantAnalysis.primaryNeed,
          description: instantAnalysis.description,
          isFalseAlarm: instantAnalysis.isFalseAlarm,
        } : null,
        // Emergency Dispatcher Analysis
        emergencyDispatch: emergencyDispatch ? {
          hazard_type: emergencyDispatch.hazard_type,
          severity_score: emergencyDispatch.severity_score,
          recommended_action: emergencyDispatch.recommended_action,
          status_level: emergencyDispatch.status_level,
          visual_evidence_summary: emergencyDispatch.visual_evidence_summary,
          equipment_needed: emergencyDispatch.equipment_needed,
          authority_assigned: emergencyDispatch.authority_assigned,
        } : null,
      };
      
      await addDoc(collection(db, 'emergency_alerts'), alertData);
      
      toast.dismiss();
      setIsSubmitted(true);
      toast.success('Request submitted successfully!');
    } catch (error) {
      // DEBUGGING: Log the full error for permissions debugging
      console.error('Firestore Error:', error);
      toast.dismiss();
      toast.error("Failed to submit request. Check console for details.");
    } finally {
      // UI FEEDBACK: Always clear submitting state, even on error
      setIsSubmitting(false);
    }
  };

  const handleLocationDetect = () => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ latitude, longitude });
          setFormData(prev => ({ 
            ...prev, 
            location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` 
          }));
          setLocationLoading(false);
        },
        (error) => {
          console.log('Location detection failed:', error);
          setLocationLoading(false);
          alert('Could not detect your location. Please enter it manually.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-semibold text-green-800">Request Submitted Successfully</h2>
              <p className="text-green-700">
                Your aid request has been received and assigned reference number <strong>REQ-{Date.now().toString().slice(-6)}</strong>
              </p>
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>What happens next:</strong><br />
                  • Our team will review your request within 30 minutes<br />
                  • You'll receive an SMS with your case worker's contact<br />
                  • Emergency response team will be dispatched if needed<br />
                  • Track your request status in the dashboard
                </p>
              </div>
              <Button onClick={() => setIsSubmitted(false)} className="w-full">
                Submit Another Request
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Auto-Call Modal - Severity >= 7 */}
      {showAutoCallModal && emergencyDispatch && emergencyDispatch.severity_score >= 7 && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm border-red-500 border-4 bg-white dark:bg-slate-900">
            <CardHeader className="bg-red-600 text-white rounded-t-lg">
              <div className="flex items-center gap-2">
                <Siren className="h-6 w-6 animate-bounce" />
                <CardTitle>CRITICAL EMERGENCY</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Countdown */}
              {autoCallCountdown !== null && (
                <div className="text-center py-4 bg-red-100 dark:bg-red-900/50 rounded-lg border-2 border-red-500 animate-pulse">
                  <p className="text-sm text-red-700 font-medium">AUTO-CALLING IN</p>
                  <p className="text-6xl font-bold text-red-600">{autoCallCountdown}</p>
                </div>
              )}

              <div className="text-center space-y-2">
                <Badge className="bg-red-600 text-lg px-4 py-1">{emergencyDispatch.hazard_type}</Badge>
                <p className="text-2xl font-bold">Severity: {emergencyDispatch.severity_score}/10</p>
                <p className="text-sm text-muted-foreground">{emergencyDispatch.visual_evidence_summary}</p>
              </div>

              <a href={`tel:${getEmergencyNumber(emergencyDispatch.recommended_action)}`} className="block">
                <Button className="w-full h-14 text-lg bg-red-600 hover:bg-red-700">
                  <Phone className="h-5 w-5 mr-2" />
                  CALL NOW: {getEmergencyNumber(emergencyDispatch.recommended_action)}
                </Button>
              </a>

              {autoCallCountdown !== null && (
                <Button variant="outline" className="w-full" onClick={cancelAutoCall}>
                  Cancel Auto-Call
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold mb-2">Request Emergency Aid</h1>
        <p className="text-muted-foreground">
          Fill out this form to request assistance. Our emergency response team will be notified immediately.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          For life-threatening emergencies, call 911 immediately. This form is for non-critical aid requests.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Type of Assistance Needed</CardTitle>
            <CardDescription>Select the primary type of aid you require</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aidTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.aidType === type.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, aidType: type.id }))}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className="h-6 w-6 text-blue-600 mt-1" />
                      <div>
                        <h3 className="font-medium">{type.label}</h3>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Level</CardTitle>
            <CardDescription>How urgent is your request?</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority level" />
              </SelectTrigger>
              <SelectContent>
                {priorityLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div className="flex items-center space-x-2">
                      <Badge className={level.color}>{level.label}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>Provide specific information about your needs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="peopleCount">Number of People Affected</Label>
                <Input
                  id="peopleCount"
                  type="number"
                  placeholder="e.g., 4"
                  value={formData.peopleCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, peopleCount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Contact Phone Number</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Your Current Location</Label>
              <div className="flex space-x-2">
                <Input
                  id="location"
                  placeholder="Enter address or coordinates"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  required
                />
                <Button type="button" variant="outline" onClick={handleLocationDetect} disabled={locationLoading}>
                  <MapPin className={`h-4 w-4 mr-1 ${locationLoading ? 'animate-pulse' : ''}`} />
                  {locationLoading ? 'Detecting...' : 'Detect GPS'}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your situation and specific needs..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Photo Upload Card */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Upload Disaster Photo
            </CardTitle>
            <CardDescription>
              Upload a photo of your situation. AI will analyze it to prioritize your request.
            </CardDescription>
            {!geminiConfigured && (
              <Alert className="mt-3 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  AI analysis unavailable - VITE_GEMINI_API_KEY not configured. Photos will still be uploaded but won&apos;t be analyzed.
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {photoPreview ? (
              <div className="space-y-3">
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className={`w-full h-48 object-cover rounded-lg border ${
                      instantAnalysis?.isFalseAlarm ? 'border-red-500 border-2' : ''
                    }`}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={removePhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {isAnalyzing ? (
                    <Badge className="absolute bottom-2 left-2 bg-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Analyzing...
                    </Badge>
                  ) : instantAnalysis?.isFalseAlarm ? (
                    <Badge className="absolute bottom-2 left-2 bg-red-600">
                      False Alarm
                    </Badge>
                  ) : instantAnalysis ? (
                    <Badge className="absolute bottom-2 left-2 bg-green-600">
                      Verified - Severity {instantAnalysis.severity}/10
                    </Badge>
                  ) : (
                    <Badge className="absolute bottom-2 left-2 bg-gray-600">
                      Photo Ready
                    </Badge>
                  )}
                </div>
                
                {/* AI Emergency Dispatcher Results */}
                {emergencyDispatch && (
                  <div className={`p-4 rounded-lg border-2 ${
                    emergencyDispatch.status_level === 'critical' 
                      ? 'bg-red-50 dark:bg-red-950/50 border-red-500' 
                      : emergencyDispatch.status_level === 'monitoring'
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400'
                        : 'bg-green-50 dark:bg-green-950/50 border-green-400'
                  }`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-5 w-5 ${
                          emergencyDispatch.status_level === 'critical' ? 'text-red-600' : 
                          emergencyDispatch.status_level === 'monitoring' ? 'text-amber-600' : 'text-green-600'
                        }`} />
                        <span className="font-semibold">Emergency Dispatcher AI</span>
                      </div>
                      <Badge className={
                        emergencyDispatch.status_level === 'critical' ? 'bg-red-600' : 
                        emergencyDispatch.status_level === 'monitoring' ? 'bg-amber-500' : 'bg-green-600'
                      }>
                        {emergencyDispatch.status_level.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Hazard & Severity */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border">
                        <p className="text-xs text-muted-foreground">Hazard Type</p>
                        <p className="font-semibold">{emergencyDispatch.hazard_type}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded border">
                        <p className="text-xs text-muted-foreground">Severity Score</p>
                        <p className="font-semibold">{emergencyDispatch.severity_score}/10</p>
                      </div>
                    </div>

                    {/* Visual Evidence */}
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Visual Evidence</p>
                      <p className="text-sm">{emergencyDispatch.visual_evidence_summary}</p>
                    </div>

                    {/* Recommended Action */}
                    {emergencyDispatch.recommended_action !== 'none' && (
                      <div className={`p-3 rounded-lg mb-3 ${
                        emergencyDispatch.status_level === 'critical' 
                          ? 'bg-red-100 dark:bg-red-900/50' 
                          : 'bg-amber-100 dark:bg-amber-900/50'
                      }`}>
                        <p className="text-xs font-medium mb-1">RECOMMENDED ACTION</p>
                        <div className="flex items-center gap-2">
                          <Phone className="h-5 w-5" />
                          <span className="font-bold text-lg">
                            Call {emergencyDispatch.recommended_action.replace('call_', '')} - {emergencyDispatch.authority_assigned}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Equipment Needed */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Equipment Checklist for First Responder</p>
                      <div className="flex flex-wrap gap-1">
                        {emergencyDispatch.equipment_needed.map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Secondary Risks */}
                    {emergencyDispatch.secondary_risks && emergencyDispatch.secondary_risks.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Secondary Risks Detected</p>
                        <div className="flex flex-wrap gap-1">
                          {emergencyDispatch.secondary_risks.map((risk, idx) => (
                            <Badge key={idx} variant="destructive" className="text-xs">
                              {risk}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Basic Analysis Fallback (if dispatch failed but basic worked) */}
                {instantAnalysis && !emergencyDispatch && (
                  <div className={`p-3 rounded-lg ${
                    instantAnalysis.isFalseAlarm 
                      ? 'bg-red-100 dark:bg-red-950 border border-red-300' 
                      : 'bg-green-100 dark:bg-green-950 border border-green-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {instantAnalysis.isFalseAlarm ? (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      <span className={`font-medium text-sm ${
                        instantAnalysis.isFalseAlarm ? 'text-red-700' : 'text-green-700'
                      }`}>
                        AI Analysis Result
                      </span>
                    </div>
                    {instantAnalysis.isFalseAlarm ? (
                      <p className="text-sm text-red-600">
                        {instantAnalysis.falseAlarmReason || 'This does not appear to be a disaster photo.'}
                      </p>
                    ) : (
                      <div className="text-sm text-green-700 space-y-1">
                        <p><strong>Severity:</strong> {instantAnalysis.severity}/10</p>
                        <p><strong>Primary Need:</strong> {instantAnalysis.primaryNeed}</p>
                        <p><strong>Description:</strong> {instantAnalysis.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-8 w-8 text-blue-600" />
                  <span>Take Photo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-green-600" />
                  <span>Upload Image</span>
                </Button>
              </div>
            )}

            {isUploadingPhoto && (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading photo...</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Special Circumstances</CardTitle>
            <CardDescription>Help us prioritize and prepare appropriate assistance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasDisabilities"
                  checked={formData.hasDisabilities}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasDisabilities: checked as boolean }))}
                />
                <Label htmlFor="hasDisabilities">People with disabilities present</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasChildren"
                  checked={formData.hasChildren}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasChildren: checked as boolean }))}
                />
                <Label htmlFor="hasChildren">Children (under 18) present</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasElderly"
                  checked={formData.hasElderly}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasElderly: checked as boolean }))}
                />
                <Label htmlFor="hasElderly">Elderly (over 65) present</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="additionalNeeds">Additional Needs or Medical Conditions</Label>
              <Textarea
                id="additionalNeeds"
                placeholder="Any medical conditions, allergies, or special requirements..."
                value={formData.additionalNeeds}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalNeeds: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex space-x-4">
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Submit Aid Request
              </>
            )}
          </Button>
          <Button type="button" variant="outline">
            Save as Draft
          </Button>
        </div>
      </form>
    </div>
  );
}
