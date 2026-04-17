import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert'; // Used for verification result alerts
import { Progress } from './ui/progress';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Loader2,
  FileText,
  Shield,
  User,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { verifyVolunteerDocument, VolunteerVerificationResult } from '@/lib/gemini';
import { toast } from 'sonner';

interface VolunteerVerificationProps {
  onVerificationComplete: (result: VolunteerVerificationResult) => void;
  onSkip?: () => void;
}

export function VolunteerVerification({ onVerificationComplete, onSkip }: VolunteerVerificationProps) {
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VolunteerVerificationResult | null>(null);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be under 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setDocumentImage(reader.result as string);
      setVerificationResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = () => {
    if (!documentImage) {
      toast.error('Please upload a document image first');
      return;
    }

    setIsVerifying(true);
    setVerificationProgress(50);

    // Synchronous verification - no API call
    const result = verifyVolunteerDocument(documentImage);
    setVerificationProgress(100);
    setVerificationResult(result);
    
    if (result.isVerified) {
      toast.success('Document verified successfully!');
    } else {
      toast.error(result.rejectionReason || 'Please upload a clear photo of your ID card or certificate in good lighting.');
    }
    
    setIsVerifying(false);
  };

  const handleRetry = () => {
    setDocumentImage(null);
    setVerificationResult(null);
    setVerificationProgress(0);
  };

  const handleComplete = () => {
    if (verificationResult) {
      onVerificationComplete(verificationResult);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50/30 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-700/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-blue-200 dark:border-blue-800">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-blue-800 dark:text-blue-300">
            Volunteer Verification
          </CardTitle>
          <CardDescription>
            Upload your Government ID or Rescue Certificate for identity verification
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Document Preview */}
          {documentImage ? (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border-2 border-blue-200 dark:border-blue-800">
                <img 
                  src={documentImage} 
                  alt="Document preview" 
                  className="w-full max-h-64 object-contain bg-slate-100 dark:bg-slate-800"
                />
                {!verificationResult && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRetry}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Change
                  </Button>
                )}
              </div>

              {/* Verification Progress */}
              {isVerifying && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Analyzing document...</span>
                    <span className="font-medium">{verificationProgress}%</span>
                  </div>
                  <Progress value={verificationProgress} className="h-2" />
                </div>
              )}

              {/* Verification Result */}
              {verificationResult && (
                <div className="space-y-4">
                  {verificationResult.isVerified ? (
                    <Alert className="border-green-300 bg-green-50 dark:bg-green-950/30">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <AlertTitle className="text-green-800 dark:text-green-300">
                        Verification Successful
                      </AlertTitle>
                      <AlertDescription className="text-green-700 dark:text-green-400">
                        Your document has been verified. You are authorized for volunteer duty.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-red-300 bg-red-50 dark:bg-red-950/30">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <AlertTitle className="text-red-800 dark:text-red-300">
                        Verification Failed
                      </AlertTitle>
                      <AlertDescription className="text-red-700 dark:text-red-400">
                        {verificationResult.rejectionReason || 'Document could not be verified'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Extracted Data */}
                  <Card className="bg-slate-50 dark:bg-slate-800/50">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Name
                        </span>
                        <span className="font-medium">{verificationResult.name || 'Not detected'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Document Type
                        </span>
                        <span className="font-medium">{verificationResult.documentType}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Expiry Status
                        </span>
                        <Badge 
                          variant={verificationResult.expiryStatus === 'valid' ? 'default' : 'destructive'}
                          className={verificationResult.expiryStatus === 'valid' ? 'bg-green-600' : ''}
                        >
                          {verificationResult.expiryStatus === 'valid' ? 'Valid' : 
                           verificationResult.expiryStatus === 'expired' ? 'Expired' : 'Not Found'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Confidence
                        </span>
                        <Badge variant="outline">
                          {Math.round(verificationResult.confidence_score * 100)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            /* Upload Buttons */
            <div className="space-y-4">
              <div className="border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-blue-400 mb-4" />
                <p className="text-muted-foreground mb-4">
                  Upload a clear photo of your Government ID or Rescue Certificate
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </Button>
                </div>
              </div>

              {/* Accepted Documents */}
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Accepted Documents:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Government-issued Photo ID (Drivers License, Passport)</li>
                  <li>First Responder Certificates (EMT, Firefighter, Paramedic)</li>
                  <li>NGO Official ID (Red Cross, FEMA)</li>
                  <li>Medical Professional License</li>
                </ul>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {documentImage && !verificationResult && (
              <Button 
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full bg-blue-600 hover:bg-blue-700"
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

            {verificationResult && (
              <>
                {verificationResult.isVerified ? (
                  <Button 
                    onClick={handleComplete}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Continue as Verified Volunteer
                  </Button>
                ) : (
                  <Button 
                    onClick={handleRetry}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Different Document
                  </Button>
                )}
              </>
            )}

            {onSkip && (
              <Button 
                variant="ghost" 
                onClick={onSkip}
                className="w-full text-muted-foreground"
              >
                Skip Verification (Limited Access)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
