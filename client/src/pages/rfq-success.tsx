import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, FileText, BarChart3 } from "lucide-react";

export default function RFQSuccess() {
  const [, setLocation] = useLocation();

  // Auto-redirect after 10 seconds if user doesn't take action
  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/");
    }, 10000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-0">
        <CardContent className="p-12 text-center">
          <div className="mb-8">
            <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Thank You for Submitting Your RFQ
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              We will review the details and get back to you with a quote as soon as possible.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/orders">
                <Button 
                  className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-lg"
                  size="lg"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  View Orders
                </Button>
              </Link>
              
              <Link href="/">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto border-teal-600 text-teal-600 hover:bg-teal-50 px-8 py-3 text-lg"
                  size="lg"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              You will be automatically redirected to the dashboard in 10 seconds
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}