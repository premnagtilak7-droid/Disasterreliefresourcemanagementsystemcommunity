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
import { analyzeAndUpdateAlert } from '@/lib/gemini';
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
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
    setIsSubmitting(true);
    
    try {
      // Generate a temporary alertId for photo upload
      const tempAlertId = `alert_${Date.now()}`;
      
      // Upload photo first if exists
      let photoURL: string | null = null;
      if (photoFile) {
        toast.loading('Uploading photo...');
        photoURL = await uploadPhoto(tempAlertId);
      }
      
      // Submit SOS alert to Firebase with GPS coordinates and photo
      const alertId = await submitSOS({
        name: user.name,
        phone: formData.contactPhone,
        location: formData.location,
        emergencyType: formData.aidType,
        description: formData.description,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        photoURL,
      });
      
      // If photo was uploaded, trigger Gemini Smart Vision analysis
      if (photoURL && alertId) {
        toast.loading('AI analyzing photo...');
        await analyzeAndUpdateAlert(alertId, photoURL);
        toast.success('Photo analyzed by AI');
      }
      
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit SOS:", error);
      alert("Failed to submit request. Please try again.");
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
              <div className="relative">
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  className="w-full h-48 object-cover rounded-lg border"
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
                <Badge className="absolute bottom-2 left-2 bg-green-600">
                  Photo Ready
                </Badge>
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
