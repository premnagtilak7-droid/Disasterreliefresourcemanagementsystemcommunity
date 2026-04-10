import React from 'react';
import { User } from '../AuthSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Package,
  MapPin,
  Phone,
  MessageSquare,
  Heart
} from 'lucide-react';
import { AidRequestForm } from '../AidRequestForm';
import { mockAidRequests, mockAvailableResources } from '../constants/mockData';

interface VictimDashboardProps {
  user: User;
  activeView: string;
  setActiveView: (view: string) => void;
}

export function VictimDashboard({ user, activeView, setActiveView }: VictimDashboardProps) {
  if (activeView === 'request') {
    return <AidRequestForm user={user} />;
  }

  if (activeView === 'status') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Aid Request Status</h1>
          <p className="text-muted-foreground">Track your assistance requests and their progress</p>
        </div>

        <div className="space-y-4">
          {mockAidRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-lg">{request.type} Request</CardTitle>
                    <Badge variant={
                      request.status === 'completed' ? 'default' :
                      request.status === 'in_progress' ? 'secondary' : 'outline'
                    }>
                      {request.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant={
                      request.priority === 'high' ? 'destructive' :
                      request.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {request.priority} priority
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">#{request.id}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium">Submitted</p>
                    <p className="text-sm text-muted-foreground">{request.submitted}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Assigned Team</p>
                    <p className="text-sm text-muted-foreground">{request.assignedTeam}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {request.status === 'completed' ? 'Completed' : 'Expected Response'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {request.status === 'completed' ? request.completedDate : request.estimatedResponse}
                    </p>
                  </div>
                </div>
                
                {request.status === 'in_progress' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">75%</span>
                    </div>
                    <Progress value={75} />
                  </div>
                )}

                <div className="flex space-x-2 mt-4">
                  <Button size="sm" variant="outline">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Message Team
                  </Button>
                  <Button size="sm" variant="outline">
                    <MapPin className="h-4 w-4 mr-1" />
                    Track Location
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeView === 'resources') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Available Resources</h1>
          <p className="text-muted-foreground">Find nearby assistance centers and emergency contacts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockAvailableResources.map((resource, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h3 className="font-medium">{resource.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {resource.location || resource.contact}
                    </p>
                  </div>
                  <Badge variant={resource.available ? 'default' : 'destructive'}>
                    {resource.available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
                <div className="flex space-x-2 mt-3">
                  <Button size="sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    Directions
                  </Button>
                  <Button size="sm" variant="outline">
                    <Phone className="h-4 w-4 mr-1" />
                    Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Welcome, {user.name}</h1>
        <p className="text-muted-foreground">
          Access emergency assistance and track your aid requests
        </p>
      </div>

      {/* Emergency Actions */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button className="h-16 bg-red-600 hover:bg-red-700">
              <div className="flex flex-col items-center">
                <Phone className="h-5 w-5 mb-1" />
                <span>Emergency Call</span>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 border-red-300"
              onClick={() => setActiveView('request')}
            >
              <div className="flex flex-col items-center">
                <AlertTriangle className="h-5 w-5 mb-1" />
                <span>Request Immediate Aid</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Requests Status */}
      <Card>
        <CardHeader>
          <CardTitle>Your Aid Requests</CardTitle>
          <CardDescription>Current status of your assistance requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockAidRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {request.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-orange-600" />
                  )}
                  <div>
                    <p className="font-medium">{request.type} Request</p>
                    <p className="text-sm text-muted-foreground">
                      {request.status === 'completed' ? 'Completed' : 'In Progress'}
                    </p>
                  </div>
                </div>
                <Badge variant={request.status === 'completed' ? 'default' : 'secondary'}>
                  #{request.id}
                </Badge>
              </div>
            ))}
          </div>
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => setActiveView('status')}
          >
            View All Requests
          </Button>
        </CardContent>
      </Card>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <Package className="h-8 w-8 text-blue-600" />
              <h3 className="font-medium">Request Supplies</h3>
              <p className="text-sm text-muted-foreground">Food, water, medical supplies</p>
              <Button size="sm" onClick={() => setActiveView('request')}>
                Request Aid
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <MapPin className="h-8 w-8 text-green-600" />
              <h3 className="font-medium">Find Resources</h3>
              <p className="text-sm text-muted-foreground">Shelters, distribution centers</p>
              <Button size="sm" variant="outline" onClick={() => setActiveView('resources')}>
                View Resources
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <Heart className="h-8 w-8 text-purple-600" />
              <h3 className="font-medium">Support Groups</h3>
              <p className="text-sm text-muted-foreground">Community assistance</p>
              <Button size="sm" variant="outline">
                Connect
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}