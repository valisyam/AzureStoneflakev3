import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Package, Truck, Wrench, Sparkles, Shield, PackageX, Factory, Hammer, Ship, Plane, FileText, Zap, Star } from "lucide-react";
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

interface OrderTrackingDisplayProps {
  currentStatus: OrderStatus;
  projectName: string;
  orderDate: string;
  estimatedCompletion?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  invoiceUrl?: string;
}

export default function OrderTrackingDisplay({ 
  currentStatus, 
  projectName, 
  orderDate, 
  estimatedCompletion,
  trackingNumber,
  shippingCarrier,
  invoiceUrl
}: OrderTrackingDisplayProps) {
  const [animationPhase, setAnimationPhase] = useState(0);
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const [sparkles, setSparkles] = useState<Array<{id: number, x: number, y: number}>>([]);

  // Animated progress and sparkle effects
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 1000);

    // Create sparkles for completed stages
    const newSparkles = [];
    for (let i = 0; i < getCurrentStageIndex(); i++) {
      if (Math.random() > 0.7) {
        newSparkles.push({
          id: Math.random(),
          x: Math.random() * 100,
          y: Math.random() * 100
        });
      }
    }
    setSparkles(newSparkles);

    return () => clearInterval(interval);
  }, [currentStatus]);

  const stages = [
    { key: "pending", label: "Order Confirmed", icon: CheckCircle },
    { key: "material_procurement", label: "Material Procurement", icon: Package },
    { key: "manufacturing", label: "Manufacturing", icon: Factory },
    { key: "finishing", label: "Finishing", icon: Sparkles },
    { key: "quality_check", label: "Quality Check", icon: Shield },
    { key: "packing", label: "Packing", icon: PackageX },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle },
  ];

  const getCurrentStageIndex = () => {
    return stages.findIndex(stage => stage.key === currentStatus);
  };

  const currentStageIndex = getCurrentStageIndex();

  const getStageStatus = (index: number) => {
    if (index < currentStageIndex) return "completed";
    if (index === currentStageIndex) return "current";
    return "upcoming";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "current":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "upcoming":
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-teal-50 opacity-60"></div>
      
      <Card className="relative bg-white/90 backdrop-blur-sm shadow-2xl rounded-3xl border-0 overflow-hidden">
        {/* Header with 3D Gradient */}
        <CardHeader className="pb-6 bg-gradient-to-r from-gray-900 via-gray-800 to-teal-900 text-white relative">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-purple-600/20"></div>
          <div className="relative z-10">
            <CardTitle className="text-2xl font-bold tracking-tight flex items-center">
              <Factory className="h-6 w-6 mr-3 text-teal-300" />
              {projectName} Manufacturing Journey
            </CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-teal-300" />
                <span className="text-sm text-gray-200">
                  Started: {new Date(orderDate).toLocaleDateString()}
                </span>
              </div>
              {estimatedCompletion && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-300" />
                  <span className="text-sm text-gray-200">
                    Est. Delivery: {new Date(estimatedCompletion).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          {/* 3D Timeline */}
          <div className="relative">
            {/* Main timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-200 via-teal-300 to-gray-200 shadow-lg rounded-full"></div>
            
            <div className="space-y-8">
              {stages.map((stage, index) => {
                const isCompleted = index <= currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const IconComponent = stage.icon;

                return (
                  <div 
                    key={stage.key} 
                    className={`relative flex items-center transition-all duration-700 ease-out transform
                      ${isCurrent ? 'scale-105' : ''}
                      ${isCompleted ? 'opacity-100' : 'opacity-60'}
                    `}
                    style={{
                      animationDelay: `${index * 150}ms`,
                    }}
                  >
                    {/* 3D Stage Icon with Special Shipping Animation */}
                    <div className={`
                      relative z-10 flex items-center justify-center w-16 h-16 rounded-2xl
                      shadow-2xl transform transition-all duration-500 hover:scale-110 hover:rotate-3
                      ${isCompleted 
                        ? 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg' 
                        : 'bg-gradient-to-br from-gray-200 to-gray-300 shadow-md'
                      }
                      ${isCurrent ? 'animate-pulse ring-4 ring-offset-2 ring-teal-300' : ''}
                    `}>
                      {/* Inner glow */}
                      {isCompleted && (
                        <div className="absolute inset-1 rounded-xl bg-white/20 backdrop-blur-sm"></div>
                      )}
                      
                      {/* Special shipping animation for shipped status */}
                      {stage.key === 'shipped' && isCurrent ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <div className="shipping-animation">
                            <Truck className="transport-icon truck h-7 w-7 text-white" />
                            <Ship className="transport-icon ship h-7 w-7 text-white" />
                            <Plane className="transport-icon plane h-7 w-7 text-white" />
                          </div>
                        </div>
                      ) : (
                        <IconComponent className={`
                          h-7 w-7 relative z-10 transition-all duration-300
                          ${isCompleted ? 'text-white' : 'text-gray-500'}
                          ${isCurrent ? 'animate-bounce' : ''}
                        `} />
                      )}
                      
                      {/* Completion checkmark */}
                      {isCompleted && !isCurrent && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Stage Content with Transportation Animation */}
                    <div className={`
                      ml-6 flex-1 p-6 rounded-2xl transition-all duration-500 transform relative overflow-hidden
                      ${isCompleted 
                        ? 'bg-teal-50 border-l-4 border-l-teal-500 shadow-lg hover:shadow-xl translate-x-0' 
                        : isCurrent && stage.key === 'shipped'
                        ? 'border-l-4 border-l-orange-400 shadow-md translate-x-0 animate-shipped-bg'
                        : isCurrent 
                        ? 'bg-teal-50 border-l-4 border-l-teal-400 shadow-md translate-x-0'
                        : 'bg-gray-50 border-l-4 border-gray-200 shadow-sm translate-x-2'
                      }
                      ${isCurrent && stage.key !== 'shipped' ? 'ring-2 ring-teal-200 ring-offset-2 animate-pulse' : ''}
                    `}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className={`
                            text-xl font-bold transition-colors duration-300
                            ${isCompleted ? 'text-teal-700' : isCurrent ? 'text-teal-600' : 'text-gray-500'}
                          `}>
                            {stage.label}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {stage.key === 'shipped' && isCurrent ? 
                              '🚚 ➜ 🚢 ➜ ✈️ In transit...' :
                              isCurrent ? 'In progress...' : 
                              isCompleted ? 'Successfully completed' : 
                              stage.key === 'delivered' ? '' : 'Waiting to start'}
                          </p>
                          

                        </div>
                        
                        {/* Status Badge */}
                        <div className="flex flex-col items-end space-y-2">
                          {(isCompleted || isCurrent) && (
                            <Badge className={`
                              px-4 py-2 text-sm font-semibold rounded-full shadow-md transform transition-transform hover:scale-105
                              ${isCurrent && stage.key === 'shipped'
                                ? 'bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white animate-gradient-x' 
                                : isCurrent
                                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white animate-pulse'
                                : 'bg-gradient-to-r from-teal-600 to-teal-700 text-white'
                              }
                            `}>
                              {isCurrent && stage.key === 'shipped' ? 'In Transit' : isCurrent ? 'In Progress' : 'Completed'}
                            </Badge>
                          )}
                          
                          {/* Progress bar for current stage */}
                          {isCurrent && (
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full animate-pulse transform transition-all duration-1000"></div>
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
            <div className="mt-8 p-6 bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-2xl shadow-xl transform hover:scale-102 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform duration-300">
                    <Truck className="h-6 w-6 text-white animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-teal-800">
                      {shippingCarrier ? `${shippingCarrier} Tracking` : 'Package Tracking'}
                    </h4>
                    <p className="text-sm text-teal-600">Track your shipment in real-time</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-teal-600 mb-1">Tracking Number</p>
                  <div className="bg-white px-4 py-2 rounded-lg border-2 border-teal-200 shadow-inner transform hover:scale-105 transition-transform duration-200">
                    <span className="text-lg font-mono font-bold text-teal-800">{trackingNumber}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Display - Show when status is packing or later and invoice exists */}
          {invoiceUrl && (currentStatus === 'packing' || currentStatus === 'shipped' || currentStatus === 'delivered') && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl shadow-xl transform hover:scale-102 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform duration-300">
                    <FileText className="h-6 w-6 text-white animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-blue-800">Invoice Available</h4>
                    <p className="text-sm text-blue-600">Your order invoice is ready for download</p>
                  </div>
                </div>
                <div className="text-right">
                  <Button 
                    onClick={() => window.open(invoiceUrl, '_blank')}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-lg transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Invoice
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}