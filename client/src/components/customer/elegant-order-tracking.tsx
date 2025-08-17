import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Package, Truck, Sparkles, Shield, PackageX, Factory, FileText, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import QualityCheckApproval from "@/components/customer/quality-check-approval";

type OrderStatus = 
  | "pending"
  | "material_procurement"
  | "manufacturing"
  | "finishing"
  | "quality_check"
  | "packing"
  | "shipped"
  | "delivered";

interface ElegantOrderTrackingProps {
  currentStatus: OrderStatus;
  projectName: string;
  orderDate: string;
  estimatedCompletion?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  invoiceUrl?: string;
  orderId?: string;
  order?: any; // Full order data for quality check component
}

export default function ElegantOrderTracking({ 
  currentStatus, 
  projectName, 
  orderDate, 
  estimatedCompletion,
  trackingNumber,
  shippingCarrier,
  invoiceUrl,
  orderId,
  order
}: ElegantOrderTrackingProps) {
  const [progressWidth, setProgressWidth] = useState(0);

  // Remove unused query - quality check is now handled by QualityCheckApproval component

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

  // Smooth progress animation
  useEffect(() => {
    // If delivered, show 100% progress; otherwise show progress to current stage
    const targetWidth = currentStatus === "delivered" 
      ? 100 
      : ((currentStageIndex + 1) / stages.length) * 100;
    let currentWidth = 0;
    const increment = targetWidth / 30; // 30 frames animation
    
    const animate = () => {
      if (currentWidth < targetWidth) {
        currentWidth += increment;
        setProgressWidth(Math.min(currentWidth, targetWidth));
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [currentStageIndex, stages.length, currentStatus]);

  const getStageStatus = (index: number) => {
    if (index < currentStageIndex) return "completed";
    if (index === currentStageIndex) {
      // If we're at delivered stage, it should be completed, not current
      if (currentStatus === "delivered") return "completed";
      return "current";
    }
    return "upcoming";
  };

  return (
    <div className="w-full">
      <Card className="bg-white shadow-lg rounded-xl border border-gray-100 overflow-hidden">
        {/* Clean Header */}
        <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white pb-6">
          <CardTitle className="text-xl font-semibold flex items-center">
            <Factory className="h-5 w-5 mr-3 text-teal-300" />
            {projectName} - Manufacturing Progress
          </CardTitle>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 text-sm">
            <div className="flex items-center space-x-2 text-gray-300">
              <Clock className="h-4 w-4" />
              <span>Started: {new Date(orderDate).toLocaleDateString()}</span>
            </div>
            {estimatedCompletion && (
              <div className="flex items-center space-x-2 text-gray-300">
                <CheckCircle className="h-4 w-4" />
                <span>Est. Delivery: {new Date(estimatedCompletion).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Progress Overview */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Progress</span>
              <span className="text-sm font-medium text-gray-900">
                {currentStageIndex + 1} of {stages.length} stages complete
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressWidth}%` }}
              />
              <div 
                className="absolute top-0 h-full w-4 bg-white/40 rounded-full transition-all duration-1000"
                style={{ left: `${Math.max(0, progressWidth - 4)}%` }}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div 
              className="absolute left-6 top-0 w-0.5 bg-teal-500 transition-all duration-1000 ease-out"
              style={{ height: `${(currentStageIndex + 1) * 12.5}%` }}
            />
            
            <div className="space-y-6">
              {stages.map((stage, index) => {
                const status = getStageStatus(index);
                const isCompleted = status === "completed";
                const isCurrent = status === "current";
                const IconComponent = stage.icon;

                return (
                  <div 
                    key={stage.key} 
                    className={`relative flex items-start transition-all duration-500 ${
                      isCurrent ? 'transform scale-105' : ''
                    }`}
                  >
                    {/* Stage Icon */}
                    <div className={`
                      relative z-10 flex items-center justify-center w-12 h-12 rounded-full
                      border-4 bg-white shadow-md transition-all duration-500
                      ${isCompleted 
                        ? 'border-teal-500 text-teal-600' 
                        : isCurrent 
                          ? 'border-teal-400 text-teal-500 shadow-lg' 
                          : 'border-gray-300 text-gray-400'
                      }
                    `}>
                      <IconComponent className="h-5 w-5" />
                      
                      {/* Completion checkmark */}
                      {isCompleted && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </div>
                      )}
                      
                      {/* Current stage pulse */}
                      {isCurrent && (
                        <div className="absolute inset-0 rounded-full border-2 border-teal-400 animate-ping opacity-75" />
                      )}
                    </div>

                    {/* Stage Content */}
                    <div className="ml-6 flex-1 pb-6">
                      <div className={`
                        p-4 rounded-lg border transition-all duration-300
                        ${isCompleted 
                          ? 'bg-teal-50 border-teal-200' 
                          : isCurrent 
                            ? 'bg-blue-50 border-blue-200 shadow-sm' 
                            : 'bg-gray-50 border-gray-200'
                        }
                      `}>
                        <h3 className={`font-medium mb-1 ${
                          isCompleted ? 'text-teal-800' : isCurrent ? 'text-blue-800' : 'text-gray-600'
                        }`}>
                          {stage.label}
                        </h3>
                        
                        <div className="flex items-center">
                          <Badge className={`
                            text-xs font-medium border-0
                            ${isCompleted 
                              ? 'bg-teal-100 text-teal-700' 
                              : isCurrent 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-600'
                            }
                          `}>
                            {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                          </Badge>
                          
                          {/* Simple loading indicator for current stage */}
                          {isCurrent && (
                            <div className="ml-3 flex space-x-1">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
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

          {/* Tracking Information */}
          {trackingNumber && (currentStatus === 'shipped' || currentStatus === 'delivered') && (
            <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Truck className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {shippingCarrier ? `${shippingCarrier} Tracking` : 'Package Tracking'}
                    </h4>
                    <p className="text-sm text-gray-600">Track your shipment</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Tracking Number</p>
                  <p className="font-mono text-sm font-medium text-gray-900">{trackingNumber}</p>
                </div>
              </div>
            </div>
          )}



          {/* Quality Check Approval Component */}
          <QualityCheckApproval orderId={orderId || ''} currentStatus={currentStatus} order={order} />

          {/* Invoice */}
          {invoiceUrl && (currentStatus === 'packing' || currentStatus === 'shipped' || currentStatus === 'delivered') && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Invoice Available</h4>
                    <p className="text-sm text-blue-700">Download your order invoice</p>
                  </div>
                </div>
                <Button 
                  onClick={() => invoiceUrl && window.open(invoiceUrl, '_blank')}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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