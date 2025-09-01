import { CustomerLayout } from "@/components/layout/CustomerLayout";
import RFQForm from "@/components/rfq/rfq-form";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Factory, FileText, Zap } from "lucide-react";

export default function RFQSubmit() {
  const [, setLocation] = useLocation();
  
  const handleSuccess = () => {
    setLocation("/rfq/success");
  };

  return (
    <CustomerLayout>
      <main className="px-6 py-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-teal-600 hover:text-teal-700 text-sm font-medium transition-all duration-300 group backdrop-blur-sm bg-white/70 px-4 py-2 rounded-lg border border-teal-100/50 hover:bg-white/90 hover:border-teal-200">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
        </div>

        <div className="backdrop-blur-sm bg-gradient-to-br from-white/90 via-white/85 to-white/80 rounded-3xl border border-teal-200/30 shadow-2xl shadow-teal-200/40 p-6">
          <RFQForm onSuccess={handleSuccess} />
        </div>
      </main>
    </CustomerLayout>
  );
}
