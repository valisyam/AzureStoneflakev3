import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, X, FileText, Download, Eye, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { File } from '@shared/schema';

interface QualityCheckApprovalProps {
  orderId: string;
  currentStatus: string;
  order?: any; // We need order data to check approval status
}

export default function QualityCheckApproval({ orderId, currentStatus, order }: QualityCheckApprovalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalDecision, setApprovalDecision] = useState<boolean | null>(null);

  // Fetch quality check files
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['/api/orders', orderId, 'quality-check-files'],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/quality-check-files`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('stoneflake_token')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch quality check files');
      }
      return response.json();
    },
    enabled: currentStatus === 'quality_check' || 
             currentStatus === 'packing' || 
             currentStatus === 'shipped' || 
             currentStatus === 'delivered' ||
             (order?.qualityCheckStatus && order.qualityCheckStatus !== 'pending'),
  });

  // Approval mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ approved, notes }: { approved: boolean; notes?: string }) => {
      const response = await fetch(`/api/orders/${orderId}/approve-quality-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('stoneflake_token')}`,
        },
        body: JSON.stringify({ approved, notes }),
      });
      if (!response.ok) {
        throw new Error('Approval failed');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setShowApprovalModal(false);
      setApprovalNotes('');
      setApprovalDecision(null);
      toast({
        title: variables.approved ? "Quality check approved" : "Revision requested",
        description: variables.approved 
          ? "The quality check has been approved. Your order will proceed to packing."
          : "We've notified the team about your revision request.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit approval. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleApproval = (approved: boolean) => {
    setApprovalDecision(approved);
    setShowApprovalModal(true);
  };

  const handleSubmitApproval = () => {
    if (approvalDecision !== null) {
      approvalMutation.mutate({
        approved: approvalDecision,
        notes: approvalNotes.trim() || undefined,
      });
    }
  };

  const handleViewFile = (file: File) => {
    setSelectedFile(file);
    setShowFileViewer(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'excel':
        return <FileText className="h-5 w-5 text-green-500" />;
      case 'image':
        return <FileText className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  // Only show quality check section if we're in quality_check status OR if there are approved/rejected files to show
  const shouldShowQualityCheck = currentStatus === 'quality_check' || 
                                (order?.qualityCheckStatus && order.qualityCheckStatus !== 'pending') ||
                                (currentStatus === 'packing' || currentStatus === 'shipped' || currentStatus === 'delivered');

  if (!shouldShowQualityCheck) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading quality check files...</div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Quality Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-gray-500 mb-2">
              Quality check files will appear here when ready for your review
            </div>
            <Badge variant="outline">Waiting for quality inspection</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {currentStatus === 'quality_check' && (!order?.qualityCheckStatus || order.qualityCheckStatus === 'pending') 
                ? 'Quality Check - Approval Required'
                : 'Quality Check'}
            </div>
            {currentStatus === 'quality_check' && (!order?.qualityCheckStatus || order.qualityCheckStatus === 'pending') ? (
              <Badge className="bg-orange-100 text-orange-800">Action Required</Badge>
            ) : order?.qualityCheckStatus === 'approved' ? (
              <Badge className="bg-green-100 text-green-800">Approved</Badge>
            ) : order?.qualityCheckStatus === 'needs_revision' ? (
              <Badge className="bg-orange-100 text-orange-800">Revision Requested</Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStatus === 'quality_check' && (!order?.qualityCheckStatus || order.qualityCheckStatus === 'pending') && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-800 font-medium mb-2">
                Your order has completed quality inspection. Please review the files below and approve or request revisions.
              </p>
              <p className="text-orange-700 text-sm">
                Your order will proceed to packing once you approve the quality check.
              </p>
            </div>
          )}

          {/* Files List */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Quality Check Files ({files.length})</h4>
            <div className="grid gap-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.fileType)}
                    <div>
                      <div className="font-medium text-sm">{file.fileName}</div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(file.fileSize)} • {file.fileType.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewFile(file)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <a href={file.fileUrl} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Approval Actions or Status */}
          <div className="pt-4 border-t">
            {order?.qualityCheckStatus === 'approved' ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Quality Check Approved</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Approved on {new Date(order.customerApprovedAt!).toLocaleDateString()} at{' '}
                  {new Date(order.customerApprovedAt!).toLocaleTimeString()}
                </p>
                {currentStatus === 'quality_check' ? (
                  <p className="text-sm text-gray-600 mt-2">
                    Your order is now ready to move to the packing stage.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mt-2">
                    Quality check was approved and your order has proceeded in the manufacturing process.
                  </p>
                )}
              </div>
            ) : order?.qualityCheckStatus === 'needs_revision' ? (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Revision Requested</span>
                </div>
                <p className="text-sm text-orange-600 mt-1">
                  Requested on {new Date(order.customerApprovedAt!).toLocaleDateString()} at{' '}
                  {new Date(order.customerApprovedAt!).toLocaleTimeString()}
                </p>
                {order.qualityCheckNotes && (
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Notes:</strong> {order.qualityCheckNotes}
                  </p>
                )}
              </div>
            ) : currentStatus === 'quality_check' && (!order?.qualityCheckStatus || order.qualityCheckStatus === 'pending') ? (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleApproval(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={approvalMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Quality Check
                </Button>
                <Button
                  onClick={() => handleApproval(false)}
                  variant="outline"
                  className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                  disabled={approvalMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Request Revisions
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approvalDecision ? 'Approve Quality Check' : 'Request Revisions'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              {approvalDecision 
                ? 'Your order will proceed to packing once approved.'
                : 'Please describe what revisions are needed.'}
            </div>
            <div>
              <Label htmlFor="notes">
                {approvalDecision ? 'Comments (optional)' : 'Revision Details'}
              </Label>
              <Textarea
                id="notes"
                placeholder={approvalDecision 
                  ? 'Any additional comments...'
                  : 'Please describe what needs to be revised...'}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSubmitApproval}
                className={approvalDecision ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
                disabled={approvalMutation.isPending || (!approvalDecision && !approvalNotes.trim())}
              >
                {approvalMutation.isPending ? 'Submitting...' : 'Submit'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowApprovalModal(false)}
                disabled={approvalMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Viewer Modal */}
      <Dialog open={showFileViewer} onOpenChange={setShowFileViewer}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFile && getFileIcon(selectedFile.fileType)}
              {selectedFile?.fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {selectedFile?.fileType === 'image' ? (
              <img 
                src={selectedFile.fileUrl} 
                alt={selectedFile.fileName}
                className="max-w-full h-auto"
              />
            ) : selectedFile?.fileType === 'pdf' ? (
              <iframe
                src={selectedFile.fileUrl}
                className="w-full h-[60vh]"
                title={selectedFile.fileName}
              />
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <p className="text-gray-600">Preview not available for this file type</p>
                <Button className="mt-4" asChild>
                  <a href={selectedFile?.fileUrl} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}