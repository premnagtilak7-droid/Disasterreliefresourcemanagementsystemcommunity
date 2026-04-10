import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  Download, 
  Filter, 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign,
  Calendar
} from 'lucide-react';

const donationData = [
  { month: 'Jan', amount: 45000, donors: 120 },
  { month: 'Feb', amount: 52000, donors: 135 },
  { month: 'Mar', amount: 48000, donors: 128 },
  { month: 'Apr', amount: 61000, donors: 156 },
  { month: 'May', amount: 55000, donors: 142 },
  { month: 'Jun', amount: 67000, donors: 178 },
];

const resourceDistribution = [
  { name: 'Medical Supplies', value: 35, color: '#3b82f6' },
  { name: 'Food & Water', value: 28, color: '#10b981' },
  { name: 'Shelter Materials', value: 20, color: '#f59e0b' },
  { name: 'Clothing', value: 12, color: '#ef4444' },
  { name: 'Other', value: 5, color: '#8b5cf6' },
];

const responseTime = [
  { day: 'Mon', emergency: 45, normal: 120 },
  { day: 'Tue', emergency: 38, normal: 98 },
  { day: 'Wed', emergency: 52, normal: 145 },
  { day: 'Thu', emergency: 41, normal: 110 },
  { day: 'Fri', emergency: 35, normal: 95 },
  { day: 'Sat', emergency: 42, normal: 125 },
  { day: 'Sun', emergency: 48, normal: 115 },
];

const volunteerActivity = [
  { time: '6 AM', active: 45 },
  { time: '9 AM', active: 89 },
  { time: '12 PM', active: 156 },
  { time: '3 PM', active: 178 },
  { time: '6 PM', active: 134 },
  { time: '9 PM', active: 67 },
];

export function AnalyticsView() {
  const [timeRange, setTimeRange] = useState('last30days');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">Last 7 days</SelectItem>
              <SelectItem value="last30days">Last 30 days</SelectItem>
              <SelectItem value="last90days">Last 90 days</SelectItem>
              <SelectItem value="lastyear">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-green-600">+2.1% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42 min</div>
            <p className="text-xs text-green-600">-8 min improvement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resource Efficiency</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.5%</div>
            <p className="text-xs text-orange-600">+1.2% optimization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Beneficiary</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$127</div>
            <p className="text-xs text-green-600">-$15 reduction</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donation Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Donation Trends</CardTitle>
            <CardDescription>Monthly donation amounts and donor count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={donationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    fill="#3b82f6"
                    fillOpacity={0.1}
                  />
                  <Bar yAxisId="right" dataKey="donors" fill="#10b981" opacity={0.7} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Resource Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Distribution</CardTitle>
            <CardDescription>Breakdown of aid categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resourceDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {resourceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Response Time Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Response Time Analysis</CardTitle>
            <CardDescription>Emergency vs normal request handling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={responseTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="emergency" fill="#ef4444" name="Emergency (min)" />
                  <Bar dataKey="normal" fill="#3b82f6" name="Normal (min)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volunteer Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Volunteer Activity Pattern</CardTitle>
            <CardDescription>Active volunteers throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volunteerActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="active" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Key metrics overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Requests Completed</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="default">156</Badge>
                  <span className="text-sm text-green-600">+23%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Volunteers</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">189</Badge>
                  <span className="text-sm text-blue-600">+12%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Resources Distributed</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">2.4k</Badge>
                  <span className="text-sm text-green-600">+18%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Beneficiaries Served</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="default">1.2k</Badge>
                  <span className="text-sm text-green-600">+31%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}