import { Check, Cog, Truck } from "lucide-react";

interface OrderTimelineProps {
  status: string;
  estimatedCompletion?: Date | null;
}

export default function OrderTimeline({ status, estimatedCompletion }: OrderTimelineProps) {
  const steps = [
    { key: "pending", label: "Order\nReceived", icon: Check },
    { key: "approved", label: "Quote\nApproved", icon: Check },
    { key: "in_production", label: "In\nProduction", icon: Cog },
    { key: "shipped", label: "Shipped", icon: Truck },
  ];

  const getStepStatus = (stepKey: string) => {
    const stepOrder = ["pending", "approved", "in_production", "shipped"];
    const currentIndex = stepOrder.indexOf(status);
    const stepIndex = stepOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "upcoming";
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
        <span>Order Progress</span>
        {estimatedCompletion && (
          <span>Estimated Completion: {new Date(estimatedCompletion).toLocaleDateString()}</span>
        )}
      </div>
      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const stepStatus = getStepStatus(step.key);
            const IconComponent = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    stepStatus === "completed"
                      ? "bg-green-500"
                      : stepStatus === "current"
                      ? "bg-yellow-500"
                      : "bg-gray-300"
                  }`}
                >
                  <IconComponent
                    className={`text-sm h-4 w-4 ${
                      stepStatus === "upcoming" ? "text-gray-500" : "text-white"
                    }`}
                  />
                </div>
                <span className="text-xs text-gray-600 mt-2 text-center whitespace-pre-line">
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-4 h-1 ${
                      stepStatus === "completed" ? "bg-green-500" : 
                      stepStatus === "current" ? "bg-yellow-500" : "bg-gray-300"
                    }`}
                    style={{
                      left: `${(index + 1) * 25}%`,
                      width: "25%",
                      transform: "translateX(-50%)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
