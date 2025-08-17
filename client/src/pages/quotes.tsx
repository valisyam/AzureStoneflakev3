import { CustomerLayout } from "@/components/layout/CustomerLayout";
import QuotesList from "@/components/customer/quotes-list";

export default function Quotes() {
  return (
    <CustomerLayout>
      <main className="px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Your Quotes</h2>
          <p className="text-gray-600 mt-2">View and download quotes for your submitted RFQs</p>
        </div>

        <QuotesList />
      </main>
    </CustomerLayout>
  );
}