import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CloudUpload, FileText, X, Eye } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/authUtils";

interface UploadedFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

interface FileUploadProps {
  linkedToType: string;
  linkedToId: string;
  onFilesUploaded: (files: UploadedFile[]) => void;
}

export default function FileUpload({ linkedToType, linkedToId, onFilesUploaded }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('linkedToType', linkedToType);
      formData.append('linkedToId', linkedToId);

      const token = getAuthToken();
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      return await res.json() as UploadedFile[];
    },
    onSuccess: (files) => {
      setUploadedFiles(prev => [...prev, ...files]);
      onFilesUploaded(files);
      toast({
        title: "Files uploaded successfully",
        description: `${files.length} file(s) uploaded`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    uploadMutation.mutate(acceptedFiles);
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/step': ['.step', '.stp'],
      'model/step': ['.step', '.stp'],
      'application/sla': ['.step', '.stp'],
      'application/x-step': ['.step', '.stp'],
      'application/vnd.step': ['.step', '.stp'],
      'application/octet-stream': ['.step', '.stp'],
      'text/plain': ['.step', '.stp'], // Sometimes STEP files are detected as text
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
          isDragActive
            ? "border-teal-primary bg-teal-50"
            : "border-gray-300 hover:border-teal-primary"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <CloudUpload className="text-4xl text-gray-400 mb-4 h-12 w-12" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            {isDragActive ? "Drop files here" : "Drag & drop your files here"}
          </p>
          <p className="text-gray-500 mb-4">Support for STEP (.step, .stp) and PDF files</p>
          <Button 
            type="button" 
            className="bg-teal-primary text-white hover:bg-teal-700"
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? "Uploading..." : "Browse Files"}
          </Button>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          {uploadedFiles.map((file, index) => (
            <Card key={index} className="bg-gray-50 rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="text-teal-primary text-xl mr-3 h-5 w-5" />
                    <div>
                      <p className="font-medium text-gray-900">{file.fileName}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.fileSize)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-teal-primary hover:text-teal-700"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
