import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  CheckCircle, 
  MapPin, 
  Phone, 
  User,
  Calendar,
  Camera,
  Award,
  Clock
} from 'lucide-react';
import { subscribeToRescueHistory, RescueHistoryItem } from '@/lib/alerts';

interface RescueHistoryProps {
  volunteerId: string;
}

export function RescueHistory({ volunteerId }: RescueHistoryProps) {
  const [history, setHistory] = useState<RescueHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToRescueHistory(volunteerId, (items) => {
      setHistory(items);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [volunteerId]);

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'Unknown';
    const ts = timestamp as { seconds: number };
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading rescue history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Rescue History</h1>
          <p className="text-muted-foreground">
            Your professional rescue portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6 text-yellow-500" />
          <span className="text-2xl font-bold">{history.length}</span>
          <span className="text-muted-foreground">Rescues</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{history.length}</p>
            <p className="text-sm text-muted-foreground">Total Rescues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <User className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{history.length}</p>
            <p className="text-sm text-muted-foreground">People Helped</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Camera className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {history.filter(h => h.photoURL).length}
            </p>
            <p className="text-sm text-muted-foreground">Photo Documented</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {history.length > 0 ? 'Active' : 'Ready'}
            </p>
            <p className="text-sm text-muted-foreground">Status</p>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Rescues Yet</h3>
            <p className="text-muted-foreground">
              Complete your first mission to start building your rescue portfolio
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((item, index) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="flex">
                {item.photoURL && (
                  <div className="w-32 h-32 flex-shrink-0">
                    <img 
                      src={item.photoURL} 
                      alt="Rescue scene" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{history.length - index}</Badge>
                      <Badge variant="outline">{item.emergencyType || 'General'}</Badge>
                      <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(item.resolvedAt)}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{item.location}</span>
                    </div>
                    {item.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{item.phone}</span>
                      </div>
                    )}
                  </div>

                  {item.visionAnalysis && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-sm">
                      <span className="font-medium">AI Analysis:</span> Severity {item.visionAnalysis.severity}/10 - {item.visionAnalysis.primaryNeed}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
