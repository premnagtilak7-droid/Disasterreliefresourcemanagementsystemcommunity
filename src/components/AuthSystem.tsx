import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { ThemeToggle } from './ThemeToggle';
import { UserCheck, Shield, Users, Eye, EyeOff, AlertTriangle, Loader2, Upload, Camera, CheckCircle, XCircle, FileText } from 'lucide-react';
import { roleDescriptions } from './constants/uiConstants';
import { registerUser, loginUser, signInWithGoogle, resetPassword, signInAnonymouslyForEmergency } from '@/lib/users';
import { verifyVolunteerDocument, VolunteerVerificationResult } from '@/lib/gemini';
import { toast } from 'sonner';
import { PanicForm } from './PanicForm';

export type UserRole = 'admin' | 'volunteer' | 'victim';

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
  volunteer: Users,
  victim: UserCheck,
};

export function AuthSystem({ onLogin }: AuthSystemProps) {
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isPanicMode, setIsPanicMode] = useState(false);
  const [panicUserId, setPanicUserId] = useState<string | null>(null);
  const [isStartingPanic, setIsStartingPanic] = useState(false);
  
  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  // Sign Up Form State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState<UserRole>('victim');
  
  // Volunteer Document Verification State
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [documentFileName, setDocumentFileName] = useState<string>('');
  const [documentFileType, setDocumentFileType] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VolunteerVerificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle document file selection for volunteer verification
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, etc.)');
      return;
    }

    // Store file metadata for stricter validation
    setDocumentFileName(file.name);
    setDocumentFileType(file.type);
    
    // Convert to Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setDocumentImage(base64String);
      setVerificationResult(null); // Reset any previous verification
    };
    reader.readAsDataURL(file);
  };

  // Verify the uploaded document with strict validation
  const handleVerifyDocument = async () => {
    if (!documentImage) {
      toast.error('Please upload a document first');
      return;
    }

    setIsVerifying(true);
    
    // Pass file metadata for stricter validation
    const result = await verifyVolunteerDocument(documentImage, documentFileName, documentFileType);
    setVerificationResult(result);
    
    if (result.isVerified) {
      toast.success('Document verified successfully!');
    } else {
      toast.error(result.rejectionReason || 'Please upload a valid Government ID card photo, not a poster or banner image.');
    }
    
    setIsVerifying(false);
  };

  // Reset document verification when role changes
  const handleRoleChange = (value: UserRole) => {
    setSignUpRole(value);
    if (value !== 'volunteer') {
      setDocumentImage(null);
      setVerificationResult(null);
    }
  };

  const handleEmergencySOS = async () => {
    setIsStartingPanic(true);
    try {
      const userData = await signInAnonymouslyForEmergency();
      setPanicUserId(userData.uid);
      setIsPanicMode(true);
      toast.success('Emergency mode activated');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start emergency mode';
      toast.error(errorMessage);
    } finally {
      setIsStartingPanic(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const userData = await loginUser(signInEmail, signInPassword);
      
      const user: User = {
        id: userData.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      };
      
      onLogin(user);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (roleForNewUser: UserRole = 'victim') => {
    setIsLoading(true);
    
    try {
      const userData = await signInWithGoogle(roleForNewUser);
      
      const user: User = {
        id: userData.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      };
      
      toast.success('Signed in with Google');
      onLogin(user);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await resetPassword(resetEmail);
      toast.success('Password reset email sent! Check your inbox.');
      setShowResetPassword(false);
      setResetEmail('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpPassword !== signUpConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (signUpPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const userData = await registerUser(
        signUpEmail,
        signUpPassword,
        signUpName,
        signUpRole
      );
      
      const user: User = {
        id: userData.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      };
      
      toast.success('Account created successfully!');
      onLogin(user);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show Panic Form if in emergency mode
  if (isPanicMode && panicUserId) {
    return (
      <PanicForm 
        userId={panicUserId}
        onBack={() => {
          setIsPanicMode(false);
          setPanicUserId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-700/30 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Emergency SOS Button - Fixed at top */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={handleEmergencySOS}
          disabled={isStartingPanic}
          className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg animate-pulse hover:animate-none"
          size="lg"
        >
          {isStartingPanic ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 mr-2" />
              EMERGENCY SOS
            </>
          )}
        </Button>
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
                
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0 text-blue-600 dark:text-blue-400"
                    onClick={() => setShowResetPassword(true)}
                  >
                    Forgot password?
                  </Button>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleGoogleSignIn('victim')}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
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
                  <Select value={signUpRole} onValueChange={handleRoleChange}>
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

                {/* Volunteer Document Verification Section */}
                {signUpRole === 'volunteer' && (
                  <div className="space-y-3 p-4 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-600" />
                      <Label className="text-amber-800 dark:text-amber-300 font-medium">
                        Identity Verification (Required)
                      </Label>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Upload a Government ID or NGO/First Responder Certificate for verification
                    </p>

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleDocumentSelect}
                      className="hidden"
                    />

                    {/* Document preview or upload button */}
                    {documentImage ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <img 
                            src={documentImage} 
                            alt="Document preview" 
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setDocumentImage(null);
                              setVerificationResult(null);
                            }}
                          >
                            Change
                          </Button>
                        </div>

                        {/* Verification status */}
                        {verificationResult ? (
                          <div className={`p-3 rounded-lg border ${
                            verificationResult.isVerified 
                              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              {verificationResult.isVerified ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                              <span className={`font-medium ${
                                verificationResult.isVerified ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                              }`}>
                                {verificationResult.isVerified ? 'Verified' : 'Not Verified'}
                              </span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {Math.round(verificationResult.confidence_score * 100)}% confidence
                              </Badge>
                            </div>
                            {verificationResult.isVerified ? (
                              <div className="space-y-1 text-sm">
                                <p className="text-green-700 dark:text-green-400">
                                  <strong>Name:</strong> {verificationResult.name}
                                </p>
                                <p className="text-green-700 dark:text-green-400">
                                  <strong>Document:</strong> {verificationResult.documentType}
                                </p>
                                <p className="text-green-700 dark:text-green-400">
                                  <strong>Status:</strong> {verificationResult.expiryStatus === 'valid' ? 'Valid' : 'Expired'}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-red-600 dark:text-red-400">
                                {verificationResult.rejectionReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Button
                            type="button"
                            onClick={handleVerifyDocument}
                            disabled={isVerifying}
                            className="w-full bg-amber-600 hover:bg-amber-700"
                          >
                            {isVerifying ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verifying Document...
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Verify Document
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload ID
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            // Use file input with capture for camera
                            if (fileInputRef.current) {
                              fileInputRef.current.setAttribute('capture', 'environment');
                              fileInputRef.current.click();
                              fileInputRef.current.removeAttribute('capture');
                            }
                          }}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Take Photo
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-500 dark:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700" 
                  disabled={isLoading || (signUpRole === 'volunteer' && !verificationResult?.isVerified)}
                >
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
                
                {signUpRole === 'volunteer' && !verificationResult?.isVerified && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                    Document verification required to create volunteer account
                  </p>
                )}

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleGoogleSignIn(signUpRole)}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign up with Google as {signUpRole}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              {activeTab === 'signin' ? 
                'Sign in with your registered email and password.' :
                'Register to join the disaster relief network.'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>
                Enter your email address and we will send you a link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowResetPassword(false);
                      setResetEmail('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
