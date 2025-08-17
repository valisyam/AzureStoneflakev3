import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Eye, FileText, Download, Upload, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { File } from '@shared/schema';

interface QualityCheckManagerProps {
  orderId: string;
  orderStatus: string;
}

export default function QualityCheckManager({ orderId, orderStatus }: QualityCheckManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
      return response.json() as File[];
    },
  });

  // Upload files mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      console.log('Starting quality check upload for order:', orderId);
      console.log('Files to upload:', Array.from(files).map(f => f.name));
      
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('qualityCheck', file);
        console.log('Added file to FormData:', file.name, 'size:', file.size);
      });
      
      const token = localStorage.getItem('stoneflake_token');
      console.log('Using token:', token ? 'Present' : 'Missing');
      
      try {
        const response = await apiRequest('PATCH', `/api/orders/${orderId}/quality-check`, formData);
        const result = await response.json();
        console.log('Upload success:', result);
        return result;
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'quality-check-files'] });
      setUploadFiles(null);
      setIsUploading(false);
      toast({
        title: "Files uploaded successfully",
        description: "Quality check files have been uploaded",
      });
    },
    onError: () => {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "Failed to upload quality check files",
        variant: "destructive",
      });
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/admin/orders/${orderId}/quality-check-files/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('stoneflake_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'quality-check-files'] });
      toast({
        title: "File deleted",
        description: "Quality check file has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete quality check file",
        variant: "destructive",
      });
    },
  });

  const handleUpload = useCallback(() => {
    if (!uploadFiles) return;
    setIsUploading(true);
    uploadMutation.mutate(uploadFiles);
  }, [uploadFiles, uploadMutation]);

  const handleDelete = useCallback((fileId: string, fileName: string) => {
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
      deleteMutation.mutate(fileId);
    }
  }, [deleteMutation]);

  const handleViewFile = useCallback((file: File) => {
    setSelectedFile(file);
    setShowFileViewer(true);
  }, []);

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

  if (orderStatus !== 'quality_check') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Quality Check File Management</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
            {files.length > 0 && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  Upload quality check files
                </span>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => setUploadFiles(e.target.files)}
                  className="hidden"
                />
              </Label>
              <p className="text-xs text-gray-500">
                Supports PDF, Excel, and Image files
              </p>
            </div>
            
            {uploadFiles && (
              <div className="mt-4 space-y-2">
                <div className="text-sm text-gray-600">
                  Selected: {Array.from(uploadFiles).map(f => f.name).join(', ')}
                </div>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={handleUpload} 
                    disabled={isUploading}
                    size="sm"
                  >
                    {isUploading ? 'Uploading...' : 'Upload Files'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setUploadFiles(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Files List */}
        {isLoading ? (
          <div className="text-center py-4">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No quality check files uploaded yet
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Uploaded Files ({files.length})</h4>
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
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(file.id, file.fileName)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
      </CardContent>
    </Card>
  );
}