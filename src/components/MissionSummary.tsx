import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { 
  MapPin, 
  Phone, 
  User, 
  AlertTriangle,
  CheckCircle,
  Navigation,
  Clock,
  Camera,
  ArrowLeft,
  Loader2,
  Package,
  Shield,
  Send,
  MessageCircle,
  Bot
} from 'lucide-react';
import { AlertWithId, completeAndArchiveMission } from '@/lib/alerts';
import { analyzeMissionPhoto, MissionTriageResult, sendChatMessage, ChatMessage, isGeminiConfigured } from '@/lib/gemini';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker, Libraries } from '@react-google-maps/api';

import { toast } from 'sonner';

const libraries: Libraries = ['places', 'geometry', 'directions'];

interface MissionSummaryProps {
  alert: AlertWithId;
  volunteerId: string;
  volunteerName: string;
  volunteerLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onResolved: () => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
};

// Chat message interface for Firestore
interface FirestoreChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'volunteer' | 'victim';
  message: string;
  timestamp: Timestamp;
}

export function MissionSummary({ 
  alert, 
  volunteerId, 
  volunteerName,
  volunteerLocation, 
  onClose,
  onResolved 
}: MissionSummaryProps) {
  // ALL hooks must be called before any conditional returns (React rules of hooks)
  const [isResolving, setIsResolving] = useState(false);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // AI Triage State
  const [aiTriage, setAiTriage] = useState<MissionTriageResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<FirestoreChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // AI Chatbot State
  const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>([]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Check API key on mount
  useEffect(() => {
    setApiKeyMissing(!isGeminiConfigured());
  }, []);

  // Get imageUrl from either photoURL or imageUrl field (from alerts collection)
  // Use optional chaining to safely access nested properties
  const imageUrl = alert?.photoURL || (alert as unknown as { imageUrl?: string })?.imageUrl || null;

  // Analyze photo with AI when mission starts
  useEffect(() => {
    async function analyzePhoto() {
      // Use optional chaining for safe access
      const photoUrl = alert?.photoURL || (alert as unknown as { imageUrl?: string })?.imageUrl;
      
      // Set loading complete once we've checked for the photo
      setIsLoading(false);
      
      // Check if we have an imageUrl that's a base64 string (Data URI format)
      if (photoUrl && photoUrl.startsWith('data:image')) {
        setIsAnalyzing(true);
        try {
          // Extract base64 data from Data URI
          const base64Data = photoUrl.split(',')[1];
          const triage = await analyzeMissionPhoto(base64Data);
          setAiTriage(triage);
        } catch (error) {
          console.error('Failed to analyze photo:', error);
        } finally {
          setIsAnalyzing(false);
        }
      }
    }
    
    if (alert?.id) {
      analyzePhoto();
    } else {
      // No alert, still mark loading as complete
      setIsLoading(false);
    }
  }, [alert?.id, alert?.photoURL]);

  // Subscribe to real-time chat messages
  useEffect(() => {
    if (!alert?.id) return;
    
      const chatRef = collection(db, 'emergency_alerts', alert.id, 'messages');
    const q = query(chatRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: FirestoreChatMessage[] = [];
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() } as FirestoreChatMessage);
      });
      setChatMessages(messages);
      
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [alert?.id]);

  // Send chat message to victim
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !alert?.id) return;
    
    setIsSendingMessage(true);
    try {
    const chatRef = collection(db, 'emergency_alerts', alert.id, 'messages');
      await addDoc(chatRef, {
        senderId: volunteerId,
        senderName: volunteerName,
        senderRole: 'volunteer',
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle AI chatbot message
  const handleAiChat = async () => {
    if (!aiChatInput.trim()) return;
    
    const userMessage = aiChatInput.trim();
    setAiChatInput('');
    setAiChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAiResponding(true);

    try {
      const response = await sendChatMessage(userMessage, aiChatMessages, {
        location: alert?.location || 'Unknown',
        emergencyType: alert?.emergencyType || 'General',
        description: alert?.description || '',
      });
      setAiChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('AI chat error:', error);
      setAiChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. For emergencies, call 112.' 
      }]);
    } finally {
      setIsAiResponding(false);
    }
  };

  // Calculate directions when map is loaded
  useEffect(() => {
    if (isLoaded && volunteerLocation && alert?.latitude && alert?.longitude) {
      const directionsService = new google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: volunteerLocation,
          destination: { lat: alert.latitude, lng: alert.longitude },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
          }
        }
      );
    }
  }, [isLoaded, volunteerLocation, alert?.latitude, alert?.longitude]);

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      // Use the centralized function to complete and archive the mission
      await completeAndArchiveMission(alert.id, volunteerId, volunteerName);
      toast.success('Mission completed! Added to your rescue history.');
      onResolved();
    } catch (error) {
      console.error('Error resolving mission:', error);
      toast.error('Failed to complete mission. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleCall = () => {
    if (alert?.phone) {
      window.location.href = `tel:${alert.phone}`;
    }
  };

  const handleNavigate = () => {
    if (alert?.latitude && alert?.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`,
        '_blank'
      );
    }
  };

  // Loading guard - show spinner if alert data is incomplete or still loading (AFTER all hooks)
  if (!alert || !alert?.id || isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <div className="text-center">
            <p className="font-medium text-lg">Syncing Mission Data...</p>
            <p className="text-sm text-muted-foreground mt-1">Fetching alert details from Firestore</p>
          </div>
        </div>
      </div>
    );
  }

  // API Key warning banner (shown after loading)
  const ApiKeyWarning = apiKeyMissing ? (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-5 w-5" />
        <p className="font-medium">AI Analysis Unavailable</p>
      </div>
      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
        VITE_GEMINI_API_KEY is not configured. Add it to your environment variables to enable AI-powered disaster triage.
      </p>
    </div>
  ) : null;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* API Key Warning */}
      {ApiKeyWarning}
      
      {/* Header with Back Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={onClose}
          className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back to Map</span>
        </Button>
        <Badge variant="destructive" className="text-lg px-4 py-1">
          Active Mission
        </Badge>
      </div>

      {/* Victim Info Card */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
            <User className="h-5 w-5" />
            Victim Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">{alert?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Number</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">{alert?.phone || 'Not provided'}</p>
                {alert?.phone && (
                  <Button size="sm" variant="outline" onClick={handleCall}>
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Emergency Type</p>
              <Badge variant="secondary">{alert?.emergencyType || 'General'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location Address</p>
              <p className="text-sm">{alert?.location || 'Location not specified'}</p>
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-white dark:bg-slate-900 rounded-lg border">
            <div>
              <p className="text-sm text-muted-foreground">GPS Latitude</p>
              <p className="text-lg font-mono font-semibold text-blue-600">
                {alert?.latitude?.toFixed(6) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">GPS Longitude</p>
              <p className="text-lg font-mono font-semibold text-blue-600">
                {alert?.longitude?.toFixed(6) || 'N/A'}
              </p>
            </div>
          </div>
          
          {alert?.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm bg-white dark:bg-slate-900 p-3 rounded-lg border">
                {alert.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo & AI Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Disaster Photo & AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Base64 image rendered as Data URI */}
          {imageUrl ? (
            <div className="relative">
              <img 
                src={imageUrl} 
                alt="Disaster scene photo from victim" 
                className="w-full max-h-72 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700"
              />
              {imageUrl.startsWith('data:image') && (
                <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                  Base64 Photo
                </Badge>
              )}
            </div>
          ) : (
            <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg border flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-40" />
                <p className="font-medium">No photo provided</p>
                <p className="text-sm">The victim did not upload an image</p>
              </div>
            </div>
          )}
            {alert?.visionAnalysis && (
              <div className={`grid grid-cols-2 gap-4 p-4 rounded-lg ${
                alert.visionAnalysis?.isFalseAlarm 
                  ? 'bg-red-50 dark:bg-red-950/30 border border-red-300' 
                  : 'bg-blue-50 dark:bg-blue-950/30'
              }`}>
                {alert.visionAnalysis?.isFalseAlarm ? (
                  <div className="col-span-2 text-center py-4">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-lg font-bold text-red-600">Possible False Alarm</p>
                    <p className="text-sm text-red-500">
                      {alert.visionAnalysis?.falseAlarmReason || 'AI detected this may not be a real disaster'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">AI Severity Score</p>
                      <p className="text-2xl font-bold text-red-600">
                        {alert.visionAnalysis?.severity}/10
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Primary Need</p>
                      <Badge variant="destructive">
                        {alert.visionAnalysis?.primaryNeed}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">AI Analysis</p>
                      <p className="text-sm">{alert.visionAnalysis?.description}</p>
                    </div>
                    {alert.visionAnalysis?.urgentDetails && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Urgent Details</p>
                        <p className="text-sm text-red-600 font-medium">
                          {alert.visionAnalysis.urgentDetails}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Tactical Guidance - Equipment Checklist */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <Package className="h-5 w-5" />
            AI Tactical Guidance
          </CardTitle>
          <CardDescription>Required Equipment Checklist based on visual triage from Gemini 1.5 Flash</CardDescription>
        </CardHeader>
        <CardContent>
          {isAnalyzing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
              <span>Analyzing situation...</span>
            </div>
          ) : aiTriage ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Severity</p>
                  <p className="text-2xl font-bold text-red-600">{aiTriage?.severity ?? 'N/A'}/10</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Primary Need</p>
                  <Badge variant="destructive">{aiTriage?.primaryNeed ?? 'Unknown'}</Badge>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Est. Time</p>
                  <p className="font-medium">{aiTriage?.estimatedTimeToResolve ?? 'Unknown'}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Situation</p>
                <p className="text-sm">{aiTriage?.description ?? 'No description available'}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-blue-200">
                <p className="text-base font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Required Equipment Checklist
                </p>
                <div className="flex flex-wrap gap-2">
                  {(aiTriage?.requiredEquipment ?? []).length > 0 ? (
                    (aiTriage?.requiredEquipment ?? []).map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1">
                        {item}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Standard emergency kit recommended</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Safety Warnings
                </p>
                <ul className="space-y-1">
                  {(aiTriage?.safetyWarnings ?? []).map((warning, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>No photo available for AI analysis</p>
              <p className="text-sm mt-1">Bring standard emergency kit</p>
            </div>
          )}
          </CardContent>
        </Card>

        {/* Victim-Volunteer Chat */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat with Victim
          </CardTitle>
          <CardDescription>Real-time communication with the person in need</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg bg-muted/30">
            <div className="h-48 p-3 overflow-y-auto" ref={chatContainerRef}>
              {chatMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Send a message to coordinate with the victim</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.senderRole === 'volunteer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.senderRole === 'volunteer' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white dark:bg-slate-800 border'
                      }`}>
                        <p className="text-xs opacity-70 mb-1">{msg.senderName}</p>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
)}
            </div>
            <div className="p-3 border-t flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isSendingMessage}
              />
              <Button 
                size="icon" 
                onClick={handleSendMessage}
                disabled={isSendingMessage || !newMessage.trim()}
              >
                {isSendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Disaster Assistant */}
      <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
              <Bot className="h-5 w-5" />
              AI Disaster Assistant
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAiChat(!showAiChat)}
            >
              {showAiChat ? 'Minimize' : 'Expand'}
            </Button>
          </div>
          <CardDescription>Get safety advice and guidance from AI</CardDescription>
        </CardHeader>
        {showAiChat && (
          <CardContent>
            <div className="border rounded-lg bg-white dark:bg-slate-900">
              <ScrollArea className="h-48 p-3">
                {aiChatMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">AI Assistant Ready</p>
                    <p className="text-xs">Ask for safety tips, first aid guidance, or coordination help</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aiChatMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] rounded-lg px-3 py-2 ${
                          msg.role === 'user' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-muted border'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isAiResponding && (
                      <div className="flex justify-start">
                        <div className="bg-muted border rounded-lg px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
              <div className="p-3 border-t flex gap-2">
                <Input
                  placeholder="Ask the AI assistant..."
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAiChat()}
                  disabled={isAiResponding}
                />
                <Button 
                  size="icon" 
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={handleAiChat}
                  disabled={isAiResponding || !aiChatInput.trim()}
                >
                  {isAiResponding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Map & Directions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Route to Victim
          </CardTitle>
          <CardDescription>
            {directions?.routes[0]?.legs[0]?.distance?.text} - 
            Approx. {directions?.routes[0]?.legs[0]?.duration?.text}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError && (
            <div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-lg">
              <p className="text-red-500">Error loading map</p>
            </div>
          )}
          
          {!isLoaded && !loadError && (
            <div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
          
          {isLoaded && !loadError && alert.latitude && alert.longitude && (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={{ lat: alert.latitude, lng: alert.longitude }}
              zoom={14}
            >
              {directions && <DirectionsRenderer directions={directions} />}
              {!directions && (
                <>
                  {volunteerLocation && (
                    <Marker
                      position={volunteerLocation}
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                      }}
                    />
                  )}
                  <Marker
                    position={{ lat: alert.latitude, lng: alert.longitude }}
                    icon={{
                      url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    }}
                  />
                </>
              )}
            </GoogleMap>
          )}

          <Button 
            className="w-full" 
            variant="outline"
            onClick={handleNavigate}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Open in Google Maps
          </Button>
        </CardContent>
      </Card>

      {/* Start Mission - Primary Action */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-300">
            <Navigation className="h-5 w-5" />
            Start Mission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Get turn-by-turn navigation to the victim&apos;s location using Google Maps.
          </p>
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
            onClick={handleNavigate}
            disabled={!alert.latitude || !alert.longitude}
          >
            <Navigation className="h-5 w-5 mr-2" />
            Start Navigation to Victim
          </Button>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={handleCall}
          disabled={!alert.phone}
        >
          <Phone className="h-4 w-4 mr-2" />
          Call Victim
        </Button>
        <Button 
          className="flex-1 bg-green-600 hover:bg-green-700"
          onClick={handleResolve}
          disabled={isResolving}
        >
          {isResolving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Completing...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Mission
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
