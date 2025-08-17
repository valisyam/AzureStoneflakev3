import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { setAuthToken } from "@/lib/queryClient";
import { AuthResponse, LoginRequest, RegisterRequest } from "@/types";
import { useLocation, Link } from "wouter";
import {
  Box,
  FileText,
  Users,
  Shield,
  Cog,
  Factory,
  Zap,
  CheckCircle,
  Globe,
  Award,
  Eye,
  EyeOff,
  User,
  Truck,
} from "lucide-react";
import stoneflakeLogo from "@assets/Stoneflake_LOGO_EmblemTeal_Transparent-01_1753899395053.png";
import { AdminPasswordReset } from "./admin-password-reset";

type UserRole = "customer" | "supplier";

export default function Landing() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [userRole, setUserRole] = useState<UserRole>("customer");
  const [loginData, setLoginData] = useState<LoginRequest>({
    email: "",
    password: "",
  });
  const [registerData, setRegisterData] = useState<RegisterRequest>({
    email: "",
    password: "",
    name: "",
    company: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);
  const [passwordResetUserId, setPasswordResetUserId] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await apiRequest("POST", "/api/auth/login", {
        ...data,
        role: userRole,
      });
      return (await res.json()) as AuthResponse;
    },
    onSuccess: (data) => {
      if (data.requiresPasswordReset) {
        setRequiresPasswordReset(true);
        setPasswordResetUserId(data.userId || "");
        toast({
          title: "Password Reset Required",
          description: "Please set a new password to continue.",
        });
      } else {
        setAuthToken(data.token);
        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in.",
        });
        window.location.reload();
      }
    },
    onError: (error: any) => {
      if (error.message?.includes("verify your email")) {
        toast({
          title: "Email verification required",
          description: "Please verify your email before signing in.",
          variant: "destructive",
        });
        setLocation("/verify-email");
      } else {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.requiresVerification) {
        toast({
          title: "Registration successful!",
          description: "Please check your email for a verification code.",
        });
        setLocation(
          `/verify-email?email=${encodeURIComponent(registerData.email)}&role=${userRole}`,
        );
      } else {
        // Admin users are auto-verified
        setAuthToken(data.token);
        toast({
          title: "Welcome to S-Hub!",
          description: "Your admin account has been created successfully.",
        });
        window.location.reload();
      }
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ ...loginData, role: userRole });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password length
    if (registerData.password.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }

    // Validate password match
    if (registerData.password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordError("");

    // Add role to registration data
    const registrationData = {
      ...registerData,
      role: userRole,
    };

    registerMutation.mutate(registrationData);
  };

  // Handle password reset flow for admin-created accounts
  const handlePasswordResetSuccess = (token: string, user: any) => {
    setAuthToken(token);
    setRequiresPasswordReset(false);
    setPasswordResetUserId("");
    toast({
      title: "Welcome!",
      description: "Your password has been updated and you are now logged in.",
    });
    window.location.reload();
  };

  if (requiresPasswordReset && passwordResetUserId) {
    return (
      <AdminPasswordReset
        userId={passwordResetUserId}
        onSuccess={handlePasswordResetSuccess}
      />
    );
  }

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-all duration-700 ${
        userRole === "customer"
          ? "bg-gradient-to-br from-white via-blue-50 via-green-50 to-teal-100"
          : "bg-gradient-to-br from-purple-50 via-indigo-100 via-blue-100 to-purple-200"
      }`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-20 left-10 w-32 h-32 rounded-full blur-xl animate-pulse transition-colors duration-700 ${
            userRole === "customer"
              ? "bg-gradient-to-r from-teal-200/40 to-blue-200/40"
              : "bg-gradient-to-r from-purple-300/60 to-indigo-300/60"
          }`}
        ></div>
        <div
          className={`absolute top-40 right-20 w-24 h-24 rounded-full blur-xl animate-pulse transition-colors duration-700 ${
            userRole === "customer"
              ? "bg-gradient-to-r from-blue-200/40 to-green-200/40"
              : "bg-gradient-to-r from-indigo-300/60 to-purple-300/60"
          }`}
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className={`absolute bottom-20 left-1/4 w-40 h-40 rounded-full blur-xl animate-pulse transition-colors duration-700 ${
            userRole === "customer"
              ? "bg-gradient-to-r from-green-200/30 to-teal-200/30"
              : "bg-gradient-to-r from-blue-300/50 to-purple-300/50"
          }`}
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className={`absolute bottom-40 right-10 w-28 h-28 rounded-full blur-xl animate-pulse transition-colors duration-700 ${
            userRole === "customer"
              ? "bg-gradient-to-r from-teal-200/40 to-blue-200/40"
              : "bg-gradient-to-r from-purple-200/60 to-blue-300/60"
          }`}
          style={{ animationDelay: "0.5s" }}
        ></div>
      </div>

      {/* Header */}
      <header className="backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-24">
            <div
              className={`inline-flex items-center justify-center p-4 rounded-2xl shadow-lg transition-all duration-500 ${
                userRole === "customer"
                  ? "bg-gradient-to-r from-teal-100/80 to-blue-100/80 border border-teal-200/50"
                  : "bg-gradient-to-r from-blue-100/80 to-slate-100/80 border border-blue-200/50"
              } backdrop-blur-md`}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={stoneflakeLogo}
                  alt="Stoneflake"
                  className="h-12 w-12"
                />
                <div className="flex flex-col text-left">
                  <h1
                    className={`text-2xl font-bold transition-colors duration-500 ${
                      userRole === "customer"
                        ? "bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent"
                        : "bg-gradient-to-r from-blue-800 to-slate-700 bg-clip-text text-transparent"
                    }`}
                  >
                    S-Hub
                  </h1>
                  <p className="text-sm text-gray-600">by Stoneflake</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-6rem)] relative z-10">
        {/* Left side - Hero content */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-8">
          <div className="max-w-xl">
            <div className="text-center lg:text-left">
              {userRole === "customer" ? (
                <>
                  <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                    Custom Part Manufacturing
                    <span className="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent block leading-normal">
                      Digitized & Streamlined
                    </span>
                  </h1>
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                    Transform your manufacturing workflow with our comprehensive
                    digital platform. Submit RFQs, receive professional quotes,
                    and track production. All in one seamless experience.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                    Join Our Manufacturing
                    <span className="bg-gradient-to-r from-blue-800 to-slate-700 bg-clip-text text-transparent block leading-normal">
                      Supplier Network
                    </span>
                  </h1>
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                    Expand your business reach and connect with customers
                    worldwide. Access new opportunities, streamline operations,
                    and grow your manufacturing capabilities.
                  </p>
                </>
              )}
            </div>

            {/* Enhanced Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {userRole === "customer" ? (
                <>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 text-center lg:text-left hover:transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl flex items-center justify-center mb-3 mx-auto lg:mx-0 shadow-lg">
                      <Factory className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-base">
                      Custom Manufacturing
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Precision machining and fabrication for complex custom
                      parts
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 text-center lg:text-left hover:transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3 mx-auto lg:mx-0 shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-base">
                      Professional Quotes
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Detailed manufacturing quotes with transparent pricing
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 text-center lg:text-left hover:transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-slate-600 rounded-xl flex items-center justify-center mb-3 mx-auto lg:mx-0 shadow-lg">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-base">
                      Fast Turnaround
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Streamlined production with efficient delivery timelines
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 text-center lg:text-left hover:transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-3 mx-auto lg:mx-0 shadow-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-base">
                      Quality Assurance
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Rigorous quality control at every manufacturing stage
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 text-center lg:text-left hover:transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3 mx-auto lg:mx-0 shadow-lg">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-base">
                      Global Shipping
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Worldwide delivery with comprehensive tracking
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 text-center lg:text-left hover:transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3 mx-auto lg:mx-0 shadow-lg">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-base">
                      Industry Standards
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      ISO compliant processes and certified materials
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 text-center lg:text-left hover:transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-slate-600 rounded-xl flex items-center justify-center mb-3 mx-auto lg:mx-0 shadow-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-base">
                      Expand Customer Base
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Connect with manufacturers worldwide seeking quality
                      suppliers
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 text-center lg:text-left hover:transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-blue-700 rounded-xl flex items-center justify-center mb-3 mx-auto lg:mx-0 shadow-lg">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-base">
                      Streamlined Operations
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Digital workflow management and automated order processing
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 text-center lg:text-left hover:transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-700 to-slate-700 rounded-xl flex items-center justify-center mb-3 mx-auto lg:mx-0 shadow-lg">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-base">
                      Global Market Access
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Reach international customers and scale your business
                      globally
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 text-center lg:text-left hover:transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3 mx-auto lg:mx-0 shadow-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-base">
                      Quality Certification
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Showcase your capabilities and earn trusted supplier
                      status
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 text-center lg:text-left hover:transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl flex items-center justify-center mb-3 mx-auto lg:mx-0 shadow-lg">
                      <Factory className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-base">
                      Advanced Manufacturing
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Access to cutting-edge projects and emerging technologies
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 text-center lg:text-left hover:transform hover:scale-105 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-3 mx-auto lg:mx-0 shadow-lg">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-base">
                      Revenue Growth
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Consistent order flow and competitive pricing
                      opportunities
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Value Proposition */}
            <div
              className={`rounded-2xl p-4 border shadow-sm transition-all duration-500 ${
                userRole === "customer"
                  ? "bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200/50"
                  : "bg-gradient-to-r from-blue-50 to-slate-50 border-blue-200/50"
              }`}
            >
              <h3 className="font-bold text-gray-900 mb-2 text-base">
                {userRole === "customer"
                  ? "Why Choose S-Hub?"
                  : "Why Join Our Network?"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {userRole === "customer" ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                      <span className="text-gray-700">
                        End-to-end manufacturing solutions
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                      <span className="text-gray-700">
                        Advanced material capabilities
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                      <span className="text-gray-700">
                        Real-time production tracking
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                      <span className="text-gray-700">
                        Dedicated customer support
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <span className="text-gray-700">
                        Verified customer network
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <span className="text-gray-700">
                        Secure payment processing
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <span className="text-gray-700">
                        Digital contract management
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <span className="text-gray-700">
                        Business growth analytics
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth forms */}
        <div className="flex-1 flex items-center justify-center p-6">
          <Card
            className={`w-full max-w-md shadow-2xl backdrop-blur-md border-white/20 transition-all duration-500 ${
              userRole === "customer"
                ? "bg-white/95"
                : "bg-gradient-to-br from-blue-50/95 to-slate-50/95"
            }`}
          >
            <CardHeader className="text-center pb-6">
              {/* Role Selection Tabs */}
              <div
                className={`flex rounded-xl p-1 shadow-inner transition-all duration-500 mb-6 ${
                  userRole === "customer" ? "bg-teal-50/80" : "bg-blue-50/80"
                }`}
              >
                <button
                  onClick={() => setUserRole("customer")}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                    userRole === "customer"
                      ? "bg-white shadow-md text-teal-700 transform scale-105"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Customer</span>
                </button>
                <button
                  onClick={() => setUserRole("supplier")}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                    userRole === "supplier"
                      ? "bg-white shadow-md text-blue-700 transform scale-105"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  <span>Supplier</span>
                </button>
              </div>

              <CardTitle
                className={`text-2xl font-bold transition-colors duration-500 ${
                  userRole === "customer"
                    ? "bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-blue-800 to-slate-800 bg-clip-text text-transparent"
                }`}
              >
                Welcome to S-Hub
              </CardTitle>
              <CardDescription
                className={`text-base transition-colors duration-500 ${
                  userRole === "customer" ? "text-gray-600" : "text-blue-700"
                }`}
              >
                {userRole === "customer"
                  ? "Access your manufacturing dashboard or create your account"
                  : "Join our supplier network and grow your business"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList
                  className={`grid w-full grid-cols-2 transition-colors duration-500 ${
                    userRole === "customer" ? "bg-teal-50/80" : "bg-blue-50/80"
                  }`}
                >
                  <TabsTrigger
                    value="login"
                    className={`transition-colors duration-500 ${
                      userRole === "customer"
                        ? "data-[state=active]:bg-teal-600 data-[state=active]:text-white"
                        : "data-[state=active]:bg-blue-700 data-[state=active]:text-white"
                    }`}
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className={`transition-colors duration-500 ${
                      userRole === "customer"
                        ? "data-[state=active]:bg-teal-600 data-[state=active]:text-white"
                        : "data-[state=active]:bg-blue-700 data-[state=active]:text-white"
                    }`}
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginData.email}
                        onChange={(e) =>
                          setLoginData({ ...loginData, email: e.target.value })
                        }
                        required
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            password: e.target.value,
                          })
                        }
                        required
                        className="h-10"
                      />
                    </div>
                    <Button
                      type="submit"
                      className={`w-full h-10 transition-colors duration-500 ${
                        userRole === "customer"
                          ? "bg-teal-600 hover:bg-teal-700 text-white"
                          : "bg-blue-700 hover:bg-blue-800 text-white"
                      }`}
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </Button>

                    <div className="text-center mt-4">
                      <Link href="/forgot-password">
                        <Button
                          variant="link"
                          className="text-sm text-slate-600 hover:text-slate-800"
                        >
                          Forgot password?
                        </Button>
                      </Link>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="register-name">Full Name</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Enter your name"
                        value={registerData.name}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            name: e.target.value,
                          })
                        }
                        required
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-company">Company</Label>
                      <Input
                        id="register-company"
                        type="text"
                        placeholder="Enter your company name"
                        value={registerData.company}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            company: e.target.value,
                          })
                        }
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Enter your email"
                        value={registerData.email}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            email: e.target.value,
                          })
                        }
                        required
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password (min 8 characters)"
                        value={registerData.password}
                        onChange={(e) => {
                          setRegisterData({
                            ...registerData,
                            password: e.target.value,
                          });
                          setPasswordError("");
                        }}
                        required
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">
                        Re-enter Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setPasswordError("");
                          }}
                          required
                          className="h-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                      {passwordError && (
                        <p className="text-red-500 text-sm mt-1">
                          {passwordError}
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      className={`w-full h-10 transition-colors duration-500 ${
                        userRole === "customer"
                          ? "bg-teal-600 hover:bg-teal-700 text-white"
                          : "bg-blue-700 hover:bg-blue-800 text-white"
                      }`}
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending
                        ? "Creating account..."
                        : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
