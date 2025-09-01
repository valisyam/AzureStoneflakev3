import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, DollarSign } from 'lucide-react';
import { extractDisplayId } from '@shared/utils';
import SupplierLayout from '../../components/layout/SupplierLayout';

export default function SupplierQuotes() {
  const { data: quotes = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/supplier/quotes'],
  });

  if (isLoading) {
    return (
      <SupplierLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </SupplierLayout>
    );
  }

  return (
    <SupplierLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Quotes</h1>
          <p className="text-gray-600">Track your submitted quotes and their status.</p>
        </div>

        {/* Quotes List */}
        <div className="space-y-4">
          {quotes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes yet</h3>
                <p className="text-gray-500 text-center max-w-md">
                  You haven't submitted any quotes yet. Check your RFQs to find opportunities to quote on.
                </p>
              </CardContent>
            </Card>
          ) : (
            quotes.map((quote: any) => (
              <Card key={quote.id} className="border-blue-200 hover:border-blue-300 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Quote {quote.sqteNumber || extractDisplayId(quote.rfq || {})}</CardTitle>
                    <Badge variant={quote.status === 'accepted' ? 'default' : quote.status === 'pending' ? 'secondary' : 'secondary'}>
                      {quote.status === 'not_selected' || quote.status === 'rejected' ? 'Not Selected' : quote.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">Amount: ${quote.price}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600">Submitted: {new Date(quote.submittedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600">RFQ: {quote.sqteNumber || extractDisplayId(quote.rfq || {})}</span>
                    </div>
                  </div>
                  
                  {/* Show admin feedback for not selected quotes */}
                  {(quote.status === 'not_selected' || quote.status === 'rejected') && quote.adminFeedback && (
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <h4 className="text-sm font-medium text-orange-800 mb-1">Feedback from Admin</h4>
                      <p className="text-sm text-orange-700">{quote.adminFeedback}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </SupplierLayout>
  );
}