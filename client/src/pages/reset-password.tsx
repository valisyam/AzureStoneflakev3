import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Link } from 'wouter';

const resetPasswordSchema = z.object({
  resetCode: z.string().min(6, 'Reset code must be 6 digits').max(6, 'Reset code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetComplete, setResetComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get parameters from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const roleParam = urlParams.get('role');
    const codeParam = urlParams.get('code');
    
    if (emailParam) setEmail(emailParam);
    if (roleParam) setRole(roleParam);
    if (codeParam) setResetCode(codeParam);
    
    if (!emailParam || !roleParam) {
      // If missing required params, redirect to forgot password
      setLocation('/forgot-password');
    }
  }, [setLocation]);

  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      resetCode: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Update form with URL code if present
  useEffect(() => {
    if (resetCode) {
      form.setValue('resetCode', resetCode);
    }
  }, [resetCode, form]);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const res = await apiRequest('POST', '/api/auth/reset-password', {
        email,
        role,
        resetCode: data.resetCode,
        newPassword: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      setResetComplete(true);
      toast({
        title: 'Password reset successful!',
        description: 'You can now sign in with your new password.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Reset failed',
        description: error.message || 'Failed to reset password. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ResetPasswordData) => {
    resetPasswordMutation.mutate(data);
  };

  if (resetComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Password Reset Complete</CardTitle>
            <CardDescription>
              Your password has been successfully reset. You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">
                Continue to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Reset Password</CardTitle>
          <CardDescription>
            Enter the verification code from your email and choose a new password.
          </CardDescription>
          {email && (
            <p className="text-sm text-gray-600 mt-2">
              Resetting password for: <span className="font-medium">{email}</span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="resetCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter new password (min 8 characters)"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Link href="/forgot-password">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to forgot password
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}