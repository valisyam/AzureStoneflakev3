import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Package, Truck, Sparkles, Shield, PackageX, Factory, FileText, Zap, Star, Rocket } from "lucide-react";
import { useState, useEffect } from "react";

type OrderStatus = 
  | "pending"
  | "material_procurement"
  | "manufacturing"
  | "finishing"
  | "quality_check"
  | "packing"
  | "shipped"
  | "delivered";

interface InteractiveOrderTrackingProps {
  currentStatus: OrderStatus;
  projectName: string;
  orderDate: string;
  estimatedCompletion?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  invoiceUrl?: string;
}

export default function InteractiveOrderTracking({ 
  currentStatus, 
  projectName, 
  orderDate, 
  estimatedCompletion,
  trackingNumber,
  shippingCarrier,
  invoiceUrl
}: InteractiveOrderTrackingProps) {
  const [animationPhase, setAnimationPhase] = useState(0);
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const [floatingParticles, setFloatingParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);

  const stages = [
    { key: "pending", label: "Order Confirmed", icon: CheckCircle, color: "from-green-400 to-green-600", bgColor: "bg-green-500" },
    { key: "material_procurement", label: "Material Procurement", icon: Package, color: "from-blue-400 to-blue-600", bgColor: "bg-blue-500" },
    { key: "manufacturing", label: "Manufacturing", icon: Factory, color: "from-purple-400 to-purple-600", bgColor: "bg-purple-500" },
    { key: "finishing", label: "Finishing", icon: Sparkles, color: "from-yellow-400 to-orange-500", bgColor: "bg-orange-500" },
    { key: "quality_check", label: "Quality Check", icon: Shield, color: "from-cyan-400 to-cyan-600", bgColor: "bg-cyan-500" },
    { key: "packing", label: "Packing", icon: PackageX, color: "from-indigo-400 to-indigo-600", bgColor: "bg-indigo-500" },
    { key: "shipped", label: "Shipped", icon: Truck, color: "from-teal-400 to-teal-600", bgColor: "bg-teal-500" },
    { key: "delivered", label: "Delivered", icon: Rocket, color: "from-emerald-400 to-emerald-600", bgColor: "bg-emerald-500" },
  ];

  const getCurrentStageIndex = () => {
    return stages.findIndex(stage => stage.key === currentStatus);
  };

  const currentStageIndex = getCurrentStageIndex();

  // Advanced animation effects
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 8);
    }, 800);

    // Create floating particles
    const particles = [];
    for (let i = 0; i < 15; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2000
      });
    }
    setFloatingParticles(particles);

    return () => clearInterval(interval);
  }, []);

  const getStageStatus = (index: number) => {
    if (index < currentStageIndex) return "completed";
    if (index === currentStageIndex) return "current";
    return "upcoming";
  };

  return (
    <div className="relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {floatingParticles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-teal-300/30 rounded-full animate-ping"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}ms`,
              animationDuration: '3s'
            }}
          />
        ))}
      </div>

      <Card className="relative bg-gradient-to-br from-slate-50 via-white to-teal-50/50 shadow-2xl rounded-3xl border-0 overflow-hidden backdrop-blur-sm">
        {/* Dynamic Header */}
        <CardHeader className="pb-8 bg-gradient-to-r from-gray-900 via-slate-800 to-teal-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-purple-600/20 animate-pulse"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse"></div>
          
          <div className="relative z-10">
            <CardTitle className="text-3xl font-bold tracking-tight flex items-center mb-4">
              <div className="relative">
                <Factory className="h-8 w-8 mr-4 text-teal-300 animate-bounce" />
                <Star className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 animate-spin" />
              </div>
              {projectName} Manufacturing Journey
            </CardTitle>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Clock className="h-5 w-5 text-teal-300" />
                <div>
                  <p className="text-xs text-gray-300">Started</p>
                  <p className="text-sm font-semibold">{new Date(orderDate).toLocaleDateString()}</p>
                </div>
              </div>
              {estimatedCompletion && (
                <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <Rocket className="h-5 w-5 text-green-300 animate-pulse" />
                  <div>
                    <p className="text-xs text-gray-300">Est. Delivery</p>
                    <p className="text-sm font-semibold">{new Date(estimatedCompletion).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          {/* Interactive 3D Timeline */}
          <div className="relative">
            {/* Animated progress line */}
            <div className="absolute left-12 top-0 w-1 h-full bg-gradient-to-b from-gray-200 to-gray-300 rounded-full shadow-inner"></div>
            <div 
              className="absolute left-12 top-0 w-1 bg-gradient-to-b from-teal-400 via-emerald-500 to-green-500 rounded-full shadow-lg transition-all duration-1000 ease-out"
              style={{ 
                height: `${((currentStageIndex + 1) / stages.length) * 100}%`,
                boxShadow: '0 0 20px rgba(20, 184, 166, 0.5)'
              }}
            >
              {/* Animated progress indicator */}
              <div className="absolute -top-2 -left-2 w-5 h-5 bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full animate-pulse shadow-xl">
                <div className="absolute inset-1 bg-white rounded-full"></div>
              </div>
            </div>
            
            <div className="space-y-6">
              {stages.map((stage, index) => {
                const status = getStageStatus(index);
                const isCompleted = status === "completed";
                const isCurrent = status === "current";
                const IconComponent = stage.icon;
                const isHovered = hoveredStage === index;

                return (
                  <div 
                    key={stage.key} 
                    className={`relative flex items-center group cursor-pointer transition-all duration-500 transform hover:scale-105
                      ${isCurrent ? 'animate-pulse' : ''}
                    `}
                    onMouseEnter={() => setHoveredStage(index)}
                    onMouseLeave={() => setHoveredStage(null)}
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    {/* 3D Interactive Stage Icon */}
                    <div className={`
                      relative z-10 flex items-center justify-center w-24 h-24 rounded-2xl
                      shadow-2xl transform transition-all duration-700 hover:rotate-12 hover:scale-110
                      ${isCompleted || isCurrent
                        ? `bg-gradient-to-br ${stage.color} shadow-xl` 
                        : 'bg-gradient-to-br from-gray-300 to-gray-400 shadow-md'
                      }
                      ${isCurrent ? 'ring-4 ring-offset-4 ring-teal-400/50 animate-bounce' : ''}
                      ${isHovered ? 'shadow-3xl' : ''}
                    `}>
                      {/* Sparkle effects for completed stages */}
                      {isCompleted && (
                        <>
                          <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
                          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                        </>
                      )}
                      
                      {/* Icon with special animations */}
                      <IconComponent className={`
                        h-10 w-10 text-white transition-all duration-300
                        ${isCurrent ? 'animate-spin' : ''}
                        ${isHovered ? 'scale-125' : ''}
                        ${stage.key === 'shipped' && isCurrent ? 'animate-bounce' : ''}
                      `} />
                      
                      {/* Status indicator */}
                      {isCompleted && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Stage Information */}
                    <div className={`ml-8 flex-1 transition-all duration-500 transform
                      ${isHovered ? 'translate-x-2' : ''}
                    `}>
                      <div className={`
                        p-6 rounded-2xl transition-all duration-500 backdrop-blur-sm
                        ${isCompleted 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg' 
                          : isCurrent 
                            ? 'bg-gradient-to-r from-blue-50 to-teal-50 border-2 border-teal-300 shadow-xl animate-pulse'
                            : 'bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200'
                        }
                        ${isHovered ? 'shadow-2xl scale-105' : ''}
                      `}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className={`text-lg font-bold mb-2 transition-colors duration-300
                              ${isCompleted ? 'text-green-800' : isCurrent ? 'text-teal-800' : 'text-gray-600'}
                            `}>
                              {stage.label}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <Badge className={`
                                px-3 py-1 text-sm font-semibold rounded-full border-0 shadow-md
                                ${isCompleted 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                                  : isCurrent 
                                    ? 'bg-gradient-to-r from-blue-500 to-teal-600 text-white animate-pulse'
                                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                                }
                              `}>
                                {isCompleted ? '✓ Complete' : isCurrent ? '⚡ In Progress' : '⏳ Waiting'}
                              </Badge>
                              
                              {/* Fun interactive elements */}
                              {isCurrent && (
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Interactive hover effects */}
                          {isHovered && (
                            <div className="text-right">
                              <Zap className="h-6 w-6 text-yellow-500 animate-spin" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enhanced Tracking Display */}
          {trackingNumber && (currentStatus === 'shipped' || currentStatus === 'delivered') && (
            <div className="mt-12 p-8 bg-gradient-to-r from-teal-50 via-blue-50 to-purple-50 border-2 border-teal-200 rounded-3xl shadow-2xl transform hover:scale-[1.02] transition-all duration-500 relative overflow-hidden">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400/10 to-purple-400/10 animate-pulse"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center space-x-6 mb-4 md:mb-0">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl transform hover:rotate-12 transition-transform duration-300">
                      <Truck className="h-8 w-8 text-white animate-bounce" />
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-teal-800 mb-2">
                      {shippingCarrier ? `${shippingCarrier} Tracking` : 'Package Tracking'}
                    </h4>
                    <p className="text-teal-600 font-medium">Your order is on its way!</p>
                  </div>
                </div>
                
                <div className="text-center md:text-right">
                  <p className="text-sm text-teal-600 mb-2 font-semibold">Tracking Number</p>
                  <div className="bg-white/80 backdrop-blur-sm px-6 py-4 rounded-2xl border-2 border-teal-200 shadow-xl transform hover:scale-105 transition-all duration-300">
                    <span className="text-xl font-mono font-bold text-teal-800 tracking-wider">{trackingNumber}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Display */}
          {invoiceUrl && (currentStatus === 'packing' || currentStatus === 'shipped' || currentStatus === 'delivered') && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-xl transform hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform duration-300">
                    <FileText className="h-6 w-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-blue-800">Invoice Ready</h4>
                    <p className="text-sm text-blue-600">Your order invoice is available</p>
                  </div>
                </div>
                <Button 
                  onClick={() => window.open(invoiceUrl, '_blank')}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Invoice
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}