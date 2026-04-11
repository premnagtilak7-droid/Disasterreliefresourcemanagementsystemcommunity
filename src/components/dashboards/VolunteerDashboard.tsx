import React from 'react';
import { User } from '../AuthSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  MapPin,
  AlertTriangle,
  Calendar,
  Star,
  Award
} from 'lucide-react';
import { VolunteerMapView } from '../VolunteerMapView';
import { mockVolunteerTasks, mockVolunteerAssignments } from '../constants/mockData';

interface VolunteerDashboardProps {
  user: User;
  activeView: string;
  setActiveView: (view: string) => void;
}

export function VolunteerDashboard({ user, activeView, setActiveView }: VolunteerDashboardProps) {
  if (activeView === 'map') {
    return <VolunteerMapView />;
  }

  if (activeView === 'tasks') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-2">My Tasks</h1>
          <p className="text-muted-foreground">Your assigned volunteer tasks and activities</p>
        </div>

        <div className="space-y-4">
          {mockVolunteerTasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium">{task.title}</h3>
                      <Badge variant={
                        task.priority === 'high' ? 'destructive' :
                        task.priority === 'medium' ? 'default' : 'secondary'
                      }>
                        {task.priority} priority
                      </Badge>
                      <Badge variant={
                        task.status === 'in_progress' ? 'default' : 'secondary'
                      }>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{task.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(task.scheduledTime).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{task.teamSize} volunteers</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button size="sm">
                      {task.status === 'assigned' ? 'Start Task' : 'Continue'}
                    </Button>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeView === 'assignments') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Leadership Assignments</h1>
          <p className="text-muted-foreground">Your team leadership and coordination roles</p>
        </div>

        <div className="space-y-4">
          {mockVolunteerAssignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium">{assignment.title}</h3>
                      <Badge variant={assignment.type === 'leadership' ? 'default' : 'secondary'}>
                        {assignment.type}
                      </Badge>
                      <Badge variant={assignment.status === 'active' ? 'default' : 'outline'}>
                        {assignment.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{assignment.area}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{assignment.volunteers} volunteers under your lead</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Since {new Date(assignment.startDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button size="sm">Manage Team</Button>
                    <Button size="sm" variant="outline">View Reports</Button>
                  </div>
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
          Ready to make a difference in disaster relief operations
        </p>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-green-600">+6 hours from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8</div>
            <p className="text-xs text-yellow-600">Excellent performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">People Helped</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-green-600">+31 this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Tasks</CardTitle>
          <CardDescription>Your scheduled activities and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockVolunteerTasks.slice(0, 2).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className={`h-5 w-5 ${
                    task.priority === 'high' ? 'text-red-500' : 
                    task.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{new Date(task.scheduledTime).toLocaleTimeString()}</p>
                  <Badge variant={task.status === 'in_progress' ? 'default' : 'secondary'}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4" onClick={() => setActiveView('tasks')}>
            View All Tasks
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <MapPin className="h-8 w-8 text-blue-600" />
              <h3 className="font-medium">Field Map</h3>
              <p className="text-sm text-muted-foreground">View operational areas</p>
              <Button size="sm" onClick={() => setActiveView('map')}>
                Open Map
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <Users className="h-8 w-8 text-green-600" />
              <h3 className="font-medium">Team Management</h3>
              <p className="text-sm text-muted-foreground">Coordinate with team</p>
              <Button size="sm" variant="outline" onClick={() => setActiveView('assignments')}>
                Manage Teams
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <Award className="h-8 w-8 text-purple-600" />
              <h3 className="font-medium">Training</h3>
              <p className="text-sm text-muted-foreground">Skill development</p>
              <Button size="sm" variant="outline">
                View Courses
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
