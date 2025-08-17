import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';

const verificationSchema = z.object({
  verificationCode: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits'),
});

type VerificationFormData = z.infer<typeof verificationSchema>;

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  // Get email from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // If no email in URL, redirect back to register
      setLocation('/register');
    }
  }, [setLocation]);

  const form = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      verificationCode: '',
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: VerificationFormData) => {
      // Get role from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const role = urlParams.get('role') || 'customer';
      const res = await apiRequest('POST', '/api/auth/verify-email', { 
        email, 
        role,
        ...data 
      });
      return res.json();
    },
    onSuccess: () => {
      setIsVerified(true);
      toast({
        title: "Email verified successfully!",
        description: "You can now sign in to your account.",
      });
      // Redirect to login after 3 seconds
      setTimeout(() => {
        setLocation('/');
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid or expired verification code. Please try again or request a new code.",
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest('POST', '/api/auth/resend-verification', { email });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification code sent!",
        description: "Check your email for the new verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resend code",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VerificationFormData) => {
    verifyMutation.mutate(data);
  };

  const handleResendCode = () => {
    if (!email) {
      toast({
        title: "Email not found",
        description: "Please go back and register again",
        variant: "destructive",
      });
      return;
    }
    setIsResending(true);
    resendMutation.mutate(email);
    setTimeout(() => setIsResending(false), 30000); // 30 second cooldown
  };

  // Show success state if verified
  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Email Verified!</h2>
            <p className="text-gray-600 mb-6">
              Your email has been successfully verified. You can now sign in to your S-Hub account using:
            </p>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">Email:</p>
              <p className="font-semibold text-teal-700">{email}</p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              You'll be redirected to the login page in a few seconds...
            </p>
            <Button
              onClick={() => setLocation('/')}
              className="w-full h-12 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-semibold rounded-xl"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-6 bg-gradient-to-br from-white/90 to-teal-50/50 rounded-t-2xl">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-blue-700 bg-clip-text text-transparent">
            Verify Your Email
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Enter the 6-digit code sent to <br />
            <span className="font-semibold text-teal-700">{email}</span>
          </p>
        </CardHeader>
        
        <CardContent className="p-6 bg-gradient-to-br from-white/70 via-teal-50/20 to-blue-50/30 rounded-b-2xl backdrop-blur-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="verificationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Verification Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="h-12 border-gray-300 focus:border-teal-500 focus:ring-teal-500 rounded-xl text-center text-2xl font-mono tracking-widest"
                        onChange={(e) => {
                          // Only allow numbers
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={verifyMutation.isPending}
                  className="w-full h-12 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {verifyMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Verify Email</span>
                    </div>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendCode}
                  disabled={isResending || resendMutation.isPending}
                  className="w-full h-12 border-teal-200 text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  {isResending ? "Please wait (30s)..." : resendMutation.isPending ? "Sending..." : "Resend Code"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation('/register')}
                  className="w-full h-12 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Register
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}