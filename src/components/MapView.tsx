import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { 
  MapPin, 
  Navigation, 
  Filter, 
  Users, 
  Package, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Layers,
  Zap
} from 'lucide-react';

interface MapViewProps {
  role: 'admin' | 'volunteer' | 'victim' | 'donor';
}

const mockLocations = [
  {
    id: 1,
    type: 'volunteer',
    name: 'Relief Team Alpha',
    lat: 40.7128,
    lng: -74.0060,
    status: 'active',
    details: '5 volunteers, Medical supplies',
    timestamp: '2 min ago'
  },
  {
    id: 2,
    type: 'request',
    name: 'Emergency Aid Request',
    lat: 40.7589,
    lng: -73.9851,
    status: 'urgent',
    details: '50 families, Food and water needed',
    timestamp: '5 min ago'
  },
  {
    id: 3,
    type: 'warehouse',
    name: 'Distribution Center B',
    lat: 40.6892,
    lng: -74.0445,
    status: 'operational',
    details: 'Medical supplies, Food packages',
    timestamp: '1 hour ago'
  },
  {
    id: 4,
    type: 'completed',
    name: 'Relief Operation Complete',
    lat: 40.7505,
    lng: -73.9934,
    status: 'completed',
    details: '120 families served',
    timestamp: '3 hours ago'
  },
];

const statusColors = {
  active: 'bg-green-500',
  urgent: 'bg-red-500',
  operational: 'bg-blue-500',
  completed: 'bg-gray-500',
  pending: 'bg-yellow-500',
};

const typeIcons = {
  volunteer: Users,
  request: AlertTriangle,
  warehouse: Package,
  completed: CheckCircle,
};

export function MapView({ role }: MapViewProps) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<typeof mockLocations[0] | null>(null);

  useEffect(() => {
    // Request user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied');
        }
      );
    }
  }, []);

  const filteredLocations = mockLocations.filter(location => {
    const matchesFilter = filter === 'all' || location.type === filter || location.status === filter;
    const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.details.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Map Overview</h1>
          <p className="text-muted-foreground">
            Real-time locations and operational status
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Navigation className="h-4 w-4 mr-2" />
            My Location
          </Button>
          <Button variant="outline" size="sm">
            <Layers className="h-4 w-4 mr-2" />
            Layers
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Interactive Map</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="volunteer">Volunteers</SelectItem>
                    <SelectItem value="request">Requests</SelectItem>
                    <SelectItem value="warehouse">Warehouses</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mock Map Interface */}
            <div className="h-96 bg-slate-100 rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-green-100 to-blue-200">
                {/* Mock map grid */}
                <div className="absolute inset-0 opacity-20">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="border-b border-gray-300" style={{ height: '5%' }} />
                  ))}
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="absolute border-r border-gray-300 h-full" style={{ left: `${i * 5}%`, width: '1px' }} />
                  ))}
                </div>

                {/* Location markers */}
                {filteredLocations.map((location, index) => {
                  const Icon = typeIcons[location.type as keyof typeof typeIcons];
                  return (
                    <div
                      key={location.id}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                        selectedLocation?.id === location.id ? 'scale-125' : 'hover:scale-110'
                      } transition-transform`}
                      style={{
                        left: `${20 + (index * 15) % 60}%`,
                        top: `${30 + (index * 20) % 40}%`
                      }}
                      onClick={() => setSelectedLocation(location)}
                    >
                      <div className={`w-8 h-8 rounded-full ${statusColors[location.status as keyof typeof statusColors]} flex items-center justify-center shadow-lg`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className={`w-3 h-3 ${statusColors[location.status as keyof typeof statusColors]} rounded-full absolute -bottom-1 left-1/2 transform -translate-x-1/2 animate-pulse`} />
                    </div>
                  );
                })}

                {/* User location marker */}
                {userLocation && (
                  <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: '50%', top: '50%' }}
                  >
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                    <div className="w-12 h-12 border-2 border-blue-600 rounded-full absolute -top-3 -left-3 animate-ping opacity-30" />
                  </div>
                )}
              </div>

              {/* Map controls */}
              <div className="absolute top-4 right-4 space-y-2">
                <Button size="sm" variant="secondary" className="w-8 h-8 p-0">+</Button>
                <Button size="sm" variant="secondary" className="w-8 h-8 p-0">-</Button>
              </div>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg">
                <h4 className="text-sm font-medium mb-2">Legend</h4>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-xs">Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-xs">Urgent</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-xs">Operational</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full" />
                    <span className="text-xs">Completed</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Details */}
        <div className="space-y-4">
          {selectedLocation ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{selectedLocation.name}</CardTitle>
                  <Badge className={statusColors[selectedLocation.status as keyof typeof statusColors]}>
                    {selectedLocation.status}
                  </Badge>
                </div>
                <CardDescription>{selectedLocation.timestamp}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm">{selectedLocation.details}</p>
                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1">
                      <Navigation className="h-4 w-4 mr-1" />
                      Navigate
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Contact
                    </Button>
                  </div>
                  {role === 'admin' && (
                    <Button size="sm" variant="outline" className="w-full">
                      <Zap className="h-4 w-4 mr-1" />
                      Assign Task
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select a Location</CardTitle>
                <CardDescription>Click on any marker to view details</CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Location List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredLocations.map((location) => {
                  const Icon = typeIcons[location.type as keyof typeof typeIcons];
                  return (
                    <div
                      key={location.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedLocation?.id === location.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedLocation(location)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-full ${statusColors[location.status as keyof typeof statusColors]} flex items-center justify-center`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{location.name}</p>
                          <p className="text-xs text-muted-foreground">{location.details}</p>
                          <p className="text-xs text-muted-foreground">{location.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}