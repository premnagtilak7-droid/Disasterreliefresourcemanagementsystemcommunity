import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Search,
  Filter,
  UserPlus,
  MessageSquare,
  Phone
} from 'lucide-react';

const mockVolunteers = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '(555) 123-4567',
    status: 'active',
    location: 'Zone A - Sector 3',
    skills: ['Medical', 'Translation'],
    hoursThisWeek: 24,
    assignedTasks: 3,
    completedTasks: 15,
    joinDate: '2024-01-15',
    lastActive: '5 min ago'
  },
  {
    id: 2,
    name: 'Michael Chen',
    email: 'mike.chen@email.com',
    phone: '(555) 234-5678',
    status: 'available',
    location: 'Zone B - Sector 1',
    skills: ['Logistics', 'Heavy Lifting'],
    hoursThisWeek: 18,
    assignedTasks: 2,
    completedTasks: 23,
    joinDate: '2024-02-01',
    lastActive: '2 hours ago'
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '(555) 345-6789',
    status: 'off_duty',
    location: 'Zone C - Sector 2',
    skills: ['Child Care', 'Cooking'],
    hoursThisWeek: 0,
    assignedTasks: 0,
    completedTasks: 8,
    joinDate: '2024-03-10',
    lastActive: '1 day ago'
  },
];

const statusColors = {
  active: 'bg-green-100 text-green-800',
  available: 'bg-blue-100 text-blue-800',
  off_duty: 'bg-gray-100 text-gray-800',
  busy: 'bg-yellow-100 text-yellow-800',
};

export function VolunteerManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVolunteer, setSelectedVolunteer] = useState<typeof mockVolunteers[0] | null>(null);

  const filteredVolunteers = mockVolunteers.filter(volunteer => {
    const matchesSearch = volunteer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         volunteer.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = statusFilter === 'all' || volunteer.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Volunteer Management</h1>
          <p className="text-muted-foreground">
            Manage volunteer assignments and track performance
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Volunteer
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">245</p>
                <p className="text-sm text-muted-foreground">Total Volunteers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">189</p>
                <p className="text-sm text-muted-foreground">Active Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-sm text-muted-foreground">Hours This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Need Assignment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volunteer List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Volunteers</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search volunteers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="off_duty">Off Duty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredVolunteers.map((volunteer) => (
                <div
                  key={volunteer.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedVolunteer?.id === volunteer.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedVolunteer(volunteer)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          {volunteer.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{volunteer.name}</h3>
                          <Badge className={statusColors[volunteer.status as keyof typeof statusColors]}>
                            {volunteer.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{volunteer.email}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {volunteer.location}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {volunteer.hoursThisWeek}h this week
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {volunteer.skills.map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{volunteer.assignedTasks} tasks</p>
                      <p className="text-xs text-muted-foreground">{volunteer.lastActive}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Volunteer Details */}
        <div className="space-y-4">
          {selectedVolunteer ? (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {selectedVolunteer.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{selectedVolunteer.name}</CardTitle>
                    <CardDescription>Volunteer since {new Date(selectedVolunteer.joinDate).toLocaleDateString()}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <p className="text-sm text-muted-foreground">{selectedVolunteer.email}</p>
                    <p className="text-sm text-muted-foreground">{selectedVolunteer.phone}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Performance</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <p className="text-lg font-bold text-blue-600">{selectedVolunteer.completedTasks}</p>
                        <p className="text-xs text-blue-600">Completed</p>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <p className="text-lg font-bold text-orange-600">{selectedVolunteer.assignedTasks}</p>
                        <p className="text-xs text-orange-600">Assigned</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedVolunteer.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full" size="sm">
                      Assign Task
                    </Button>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select a Volunteer</CardTitle>
                <CardDescription>Click on any volunteer to view details and manage assignments</CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full text-left justify-start" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Assignment
                </Button>
                <Button variant="outline" className="w-full text-left justify-start" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Broadcast
                </Button>
                <Button variant="outline" className="w-full text-left justify-start" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Shifts
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}