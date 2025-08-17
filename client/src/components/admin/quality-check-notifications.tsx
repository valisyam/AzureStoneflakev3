import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Link } from 'wouter';

interface QualityCheckNotification {
  orderId: string;
  orderNumber: string;
  projectName: string;
  customerName: string;
  qualityCheckStatus: 'pending' | 'approved' | 'needs_revision';
  customerApprovedAt: string | null;
  qualityCheckNotes: string | null;
  orderStatus: string;
}

export default function QualityCheckNotifications() {
  const [, setLocation] = useLocation();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/admin/quality-check-notifications'],
    queryFn: async () => {
      const response = await fetch('/api/admin/quality-check-notifications', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('stoneflake_token')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch quality check notifications');
      }
      return response.json();
    },
  });

  const pendingApprovals = notifications.filter(n => n.qualityCheckStatus === 'pending' && n.orderStatus === 'quality_check');
  const recentApprovals = notifications.filter(n => n.qualityCheckStatus === 'approved' && n.customerApprovedAt);
  const needsRevision = notifications.filter(n => n.qualityCheckStatus === 'needs_revision');

  const handleViewOrder = (orderId: string) => {
    // Admin uses tabs, so we just stay on the same page
    // The admin will need to check the Active Orders tab
  };

  const handleMoveToPacking = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('stoneflake_token')}`,
        },
        body: JSON.stringify({ status: 'packing' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update order status');
      }
      
      // Refresh notifications after successful status update
      window.location.reload();
    } catch (error) {
      console.error('Error moving order to packing:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Quality Check Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">Loading notifications...</div>
        </CardContent>
      </Card>
    );
  }

  const totalNotifications = pendingApprovals.length + recentApprovals.length + needsRevision.length;
  const hasApprovals = recentApprovals.length > 0;
  const hasRevisions = needsRevision.length > 0;

  return (
    <Link to="/admin/quality-checks">
      <Card className="rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-6">
        <div className="flex items-center">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <CheckCircle className="h-6 w-6 text-orange-500" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Quality Checks</p>
            <p className="text-2xl font-bold text-gray-900">{totalNotifications}</p>
            {totalNotifications > 0 && (
              <div className="flex gap-1 mt-1">
                {hasApprovals && (
                  <span className="text-xs text-green-600 font-medium">
                    {recentApprovals.length} ready
                  </span>
                )}
                {hasRevisions && (
                  <span className="text-xs text-red-600 font-medium">
                    {needsRevision.length} need revision
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}