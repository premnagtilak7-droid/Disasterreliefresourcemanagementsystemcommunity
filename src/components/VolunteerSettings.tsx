import React, { useState, useEffect } from 'react';
import { User } from './AuthSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { MapPin, Phone, CheckCircle, ToggleLeft, Loader2, User as UserIcon, Mail, Save } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startVolunteerTracking } from '@/lib/geolocation';
import { toast } from 'sonner';

interface VolunteerSettingsProps {
  user: User;
}

export function VolunteerSettings({ user }: VolunteerSettingsProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  let untrackFunction: (() => void) | null = null;

  // Load current settings
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setPhoneNumber(data.phoneNumber || '');
          setIsAvailable(data.availableForRescue || false);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [user.id]);

  // Handle availability toggle
  const handleToggleAvailability = async () => {
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      const newStatus = !isAvailable;
      
      await updateDoc(userRef, {
        availableForRescue: newStatus,
      });

      setIsAvailable(newStatus);

      if (newStatus) {
        // Start location tracking
        if (untrackFunction) untrackFunction();
        untrackFunction = startVolunteerTracking(user.id);
        setTrackingActive(true);
        toast.success('You are now available for rescue. Location tracking active.');
      } else {
        // Stop location tracking
        if (untrackFunction) {
          untrackFunction();
          untrackFunction = null;
        }
        setTrackingActive(false);
        toast.success('You are now offline.');
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle phone number save
  const handleSavePhone = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        phoneNumber: phoneNumber.trim(),
      });
      toast.success('Phone number saved successfully');
    } catch (error) {
      console.error('Error saving phone number:', error);
      toast.error('Failed to save phone number');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Volunteer Settings</h1>
        <p className="text-muted-foreground">Manage your rescue availability and contact information</p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Your Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span>{user.name}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone Number Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>Your phone number is used to contact you for rescue requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isSaving}
              />
              <Button onClick={handleSavePhone} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
          {phoneNumber && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Phone number set: {phoneNumber}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Availability Toggle Card */}
      <Card className={isAvailable ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Rescue Availability
          </CardTitle>
          <CardDescription>
            {isAvailable
              ? 'You are currently available. Your location is being tracked every 5 minutes.'
              : 'Go online to receive rescue requests in your area.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div>
                <p className="font-medium">{isAvailable ? 'Online' : 'Offline'}</p>
                <p className="text-sm text-muted-foreground">
                  {trackingActive ? 'GPS tracking active' : 'GPS tracking inactive'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleToggleAvailability}
              disabled={isSaving || isLoading || !phoneNumber}
              variant={isAvailable ? 'destructive' : 'default'}
              size="lg"
            >
              <ToggleLeft className="h-4 w-4 mr-2" />
              {isAvailable ? 'Go Offline' : 'Go Online'}
            </Button>
          </div>
          {!phoneNumber && (
            <div className="text-sm text-orange-600 bg-orange-50 dark:bg-orange-950/30 p-3 rounded">
              Please add a phone number before going online.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={isAvailable ? 'default' : 'secondary'}>
                {isAvailable ? 'Available' : 'Offline'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Phone</p>
              <Badge variant="outline">{phoneNumber || 'Not set'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
