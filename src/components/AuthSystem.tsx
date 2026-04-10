import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ThemeToggle } from './ThemeToggle';
import { UserCheck, Shield, Heart, Users, Eye, EyeOff } from 'lucide-react';
import { roleDescriptions } from './constants/uiConstants';

export type UserRole = 'admin' | 'donor' | 'volunteer' | 'victim';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthSystemProps {
  onLogin: (user: User) => void;
}

const roleIcons = {
  admin: Shield,
  donor: Heart,
  volunteer: Users,
  victim: UserCheck,
};

export function AuthSystem({ onLogin }: AuthSystemProps) {
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInRole, setSignInRole] = useState<UserRole>('victim');
  
  // Sign Up Form State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState<UserRole>('victim');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const mockUser: User = {
      id: `user_${Date.now()}`,
      name: signInEmail.split('@')[0] || 'User',
      email: signInEmail,
      role: signInRole,
    };
    
    onLogin(mockUser);
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpPassword !== signUpConfirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockUser: User = {
      id: `user_${Date.now()}`,
      name: signUpName,
      email: signUpEmail,
      role: signUpRole,
    };
    
    onLogin(mockUser);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-700/30 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md shadow-2xl border-border/50 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Disaster Relief Portal</CardTitle>
          <CardDescription className="text-center">
            Secure access to emergency management system
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin" className="text-sm">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-sm">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                      className="w-full pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-role">Role</Label>
                  <Select value={signInRole} onValueChange={(value: UserRole) => setSignInRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(roleIcons) as UserRole[]).map((role) => {
                        const Icon = roleIcons[role];
                        return (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="capitalize">{role}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                  <div className="flex items-start gap-2">
                    {React.createElement(roleIcons[signInRole], { 
                      className: "h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" 
                    })}
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {roleDescriptions[signInRole]}
                    </p>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      className="w-full pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-role">Role</Label>
                  <Select value={signUpRole} onValueChange={(value: UserRole) => setSignUpRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(roleIcons) as UserRole[]).map((role) => {
                        const Icon = roleIcons[role];
                        return (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="capitalize">{role}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                  <div className="flex items-start gap-2">
                    {React.createElement(roleIcons[signUpRole], { 
                      className: "h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" 
                    })}
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {roleDescriptions[signUpRole]}
                    </p>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-500 dark:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              {activeTab === 'signin' ? 
                'Demo system: Use any email and password to access the platform.' :
                'Join the disaster relief network. All roles available for demo purposes.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}