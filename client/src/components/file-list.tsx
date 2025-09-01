import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, File, FileImage, FileText, FileSpreadsheet, Box } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


interface FileData {
  id: string;
  fileName: string;
  fileUrl: string;

  fileSize: number;
  fileType: 'step' | 'pdf' | 'excel' | 'image';
  uploadedAt: string;
}

interface FileListProps {
  files: FileData[];
  title?: string;
  className?: string;
}

const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'step':
      return <Box className="h-5 w-5 text-blue-600" />;
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-600" />;
    case 'excel':
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    case 'image':
      return <FileImage className="h-5 w-5 text-purple-600" />;
    default:
      return <File className="h-5 w-5 text-gray-600" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function FileList({ files, title = "Files", className = "" }: FileListProps) {
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);

  const handleDownload = async (file: FileData) => {
    try {
      const response = await fetch(`/api/files/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = file.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handlePreview = (file: FileData) => {
    setSelectedFile(file);
  };

  if (!files || files.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No files uploaded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <File className="h-5 w-5 mr-2" />
          {title} ({files.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getFileIcon(file.fileType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.fileName}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {file.fileType.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(file.fileSize)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Status for STEP files */}
                {file.fileType === 'step' && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    Uploaded
                  </Badge>
                )}
                
                {/* Download button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownload(file)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}