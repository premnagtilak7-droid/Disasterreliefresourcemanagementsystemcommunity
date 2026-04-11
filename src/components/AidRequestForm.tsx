import React, { useState, useRef } from 'react';
import { User } from './AuthSystem';
import { submitSOS } from '@/lib/alerts';
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
  X
} from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { analyzeAndUpdateAlert, analyzeBase64Photo, VisionAnalysis } from '@/lib/gemini';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Compress and analyze with Gemini IMMEDIATELY (before Firebase upload)
      try {
        setIsAnalyzing(true);
        toast.loading('AI analyzing photo...');
        
        const compressed = await compressImage(file);
        setCompressedBase64(compressed);
        
        // Instant Gemini analysis with compressed image
        const analysis = await analyzeBase64Photo(compressed);
        setInstantAnalysis(analysis);
        toast.dismiss();
        
        if (analysis.description?.includes('API key not configured')) {
          toast.warning('AI analysis unavailable - photo will still be uploaded');
        } else if (analysis.isFalseAlarm) {
          toast.error(`False Alarm Detected: ${analysis.falseAlarmReason || 'Not a disaster image'}`);
        } else if (analysis.description === 'Unable to analyze photo') {
          toast.warning('AI could not analyze photo - manual review needed');
        } else {
          toast.success(`AI Analysis: Severity ${analysis.severity}/10 - ${analysis.primaryNeed}`);
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
    
    // Block submission if false alarm detected
    if (instantAnalysis?.isFalseAlarm) {
      toast.error('Cannot submit: Image detected as false alarm. Please upload a real disaster photo.');
      return;
    }
    
    setIsSubmitting(true);
    const tempAlertId = `alert_${Date.now()}`;
    
    try {
      // Start photo upload in background (don't await yet)
      let photoUploadPromise: Promise<string | null> = Promise.resolve(null);
      if (photoFile) {
        toast.loading('Submitting request...');
        photoUploadPromise = uploadPhoto(tempAlertId);
      }
      
      // Submit SOS alert immediately with instant analysis data
      const alertId = await submitSOS({
        name: user.name,
        phone: formData.contactPhone,
        location: formData.location,
        emergencyType: formData.aidType,
        description: formData.description,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        photoURL: null, // Will update after upload completes
        // Include instant analysis in the alert
        visionAnalysis: instantAnalysis ? {
          severity: instantAnalysis.severity,
          primaryNeed: instantAnalysis.primaryNeed,
          description: instantAnalysis.description,
          isFalseAlarm: instantAnalysis.isFalseAlarm,
        } : undefined,
      });
      
      // Now wait for photo upload to complete in background
      const photoURL = await photoUploadPromise;
      
      // Update alert with photo URL if upload succeeded
      if (alertId && photoURL) {
        await analyzeAndUpdateAlert(alertId, photoURL);
      }
      
      toast.dismiss();
      setIsSubmitted(true);
      toast.success('Request submitted successfully!');
    } catch (error) {
      console.error("Failed to submit SOS:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
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
                  required
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
                required
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
                
                {/* AI Analysis Results */}
                {instantAnalysis && (
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
