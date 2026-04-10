import React from 'react';
import { User } from '../AuthSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Heart, 
  DollarSign, 
  Users, 
  TrendingUp,
  Gift,
  Target,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { mockDonations, mockActiveProjects } from '../constants/mockData';

interface DonorDashboardProps {
  user: User;
  activeView: string;
  setActiveView: (view: string) => void;
}

export function DonorDashboard({ user, activeView, setActiveView }: DonorDashboardProps) {
  const totalDonated = mockDonations.reduce((sum, donation) => sum + donation.amount, 0);
  const thisYearDonations = mockDonations.filter(d => d.date.startsWith('2024')).length;

  if (activeView === 'donations') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-2">My Donations</h1>
          <p className="text-muted-foreground">Track your contribution history and impact</p>
        </div>

        <div className="space-y-4">
          {mockDonations.map((donation) => (
            <Card key={donation.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium">{donation.project}</h3>
                      <Badge variant={donation.status === 'delivered' ? 'default' : 'secondary'}>
                        {donation.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Donated on {new Date(donation.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                      Impact: {donation.impact}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">${donation.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">#{donation.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeView === 'projects') {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Relief Projects</h1>
          <p className="text-muted-foreground">Support ongoing disaster relief initiatives</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mockActiveProjects.map((project) => (
            <Card key={project.id} className="relative">
              {project.urgency === 'high' && (
                <div className="absolute top-4 right-4">
                  <Badge variant="destructive">Urgent</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>
                  {project.donors} donors • {project.daysLeft} days left
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">
                        ${project.raised.toLocaleString()} / ${project.goal.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={(project.raised / project.goal) * 100} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((project.raised / project.goal) * 100)}% funded
                    </p>
                  </div>
                  <Button className="w-full">
                    <Heart className="h-4 w-4 mr-2" />
                    Donate Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeView === 'impact') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Impact Report</h1>
          <p className="text-muted-foreground">See the difference your donations have made</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">350</p>
              <p className="text-sm text-muted-foreground">Families Helped</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Gift className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">1,245</p>
              <p className="text-sm text-muted-foreground">Relief Packages</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">12</p>
              <p className="text-sm text-muted-foreground">Months of Aid</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Impact Story</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <p className="font-medium">Emergency Food Relief</p>
                  <p className="text-sm text-muted-foreground">
                    Your $5,000 donation provided emergency food supplies to 250 families for one week during the recent crisis.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <p className="font-medium">Medical Supply Drive</p>
                  <p className="text-sm text-muted-foreground">
                    Your $2,500 contribution helped assemble and distribute 100 medical emergency kits to affected areas.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Welcome back, {user.name}</h1>
        <p className="text-muted-foreground">
          Thank you for your continued support in disaster relief efforts
        </p>
      </div>

      {/* Donation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDonated.toLocaleString()}</div>
            <p className="text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1 inline" />
              +15% this year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Donations This Year</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisYearDonations}</div>
            <p className="text-xs text-muted-foreground">
              Across {thisYearDonations} projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impact Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9.2/10</div>
            <p className="text-xs text-green-600">
              Excellent impact rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Donate */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Donate</CardTitle>
          <CardDescription>Make a quick donation to urgent relief efforts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[50, 100, 250, 500].map((amount) => (
              <Button key={amount} variant="outline" className="h-16">
                <div className="text-center">
                  <p className="text-lg font-bold">${amount}</p>
                  <p className="text-xs text-muted-foreground">
                    {amount === 50 ? '10 meals' : 
                     amount === 100 ? '20 meals' :
                     amount === 250 ? '1 family/week' : '2 families/week'}
                  </p>
                </div>
              </Button>
            ))}
          </div>
          <Button className="w-full mt-4">
            <Heart className="h-4 w-4 mr-2" />
            Custom Amount
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Donations</CardTitle>
          <CardDescription>Your latest contributions and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockDonations.slice(0, 2).map((donation) => (
              <div key={donation.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{donation.project}</p>
                  <p className="text-sm text-muted-foreground">{donation.impact}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${donation.amount.toLocaleString()}</p>
                  <Badge variant={donation.status === 'delivered' ? 'default' : 'secondary'}>
                    {donation.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4" onClick={() => setActiveView('donations')}>
            View All Donations
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}