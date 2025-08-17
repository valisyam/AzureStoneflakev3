import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ThemeDemo() {
  const backgroundOptions = [
    {
      name: "Current: Industrial Subtle",
      className: "bg-industrial-subtle",
      description: "Very subtle gradients with hint of teal accents"
    },
    {
      name: "Industrial Pattern", 
      className: "bg-industrial-pattern",
      description: "Diagonal pattern with professional look"
    },
    {
      name: "Manufacturing Grid",
      className: "bg-manufacturing-grid", 
      description: "Technical grid pattern like blueprint paper"
    },
    {
      name: "Plain Gray (Original)",
      className: "bg-gray-50",
      description: "Simple solid background"
    }
  ];

  const applyTheme = (className: string) => {
    // Update the main body background
    document.body.className = className;
    
    // Update all main containers
    const containers = document.querySelectorAll('[class*="min-h-screen"]');
    containers.forEach(container => {
      container.className = container.className.replace(/bg-\S+/, className);
    });
  };

  return (
    <Card className="max-w-2xl mx-auto mb-8">
      <CardHeader>
        <CardTitle>Background Theme Options</CardTitle>
        <p className="text-sm text-gray-600">
          Choose a background theme that fits your manufacturing business
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {backgroundOptions.map((option, index) => (
          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">{option.name}</h4>
              <p className="text-sm text-gray-500">{option.description}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => applyTheme(option.className)}
            >
              Preview
            </Button>
          </div>
        ))}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Manufacturing Industry Considerations</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Industrial Subtle:</strong> Professional without distraction - recommended for customer portals</li>
            <li>• <strong>Industrial Pattern:</strong> Technical feel that manufacturing teams recognize</li>
            <li>• <strong>Manufacturing Grid:</strong> Blueprint-style for engineering-focused users</li>
            <li>• <strong>Plain Gray:</strong> Maximum focus on content, minimal styling</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}