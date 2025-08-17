import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CloudUpload, FileText, X, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


interface SimpleFileUploadProps {
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
}

export default function SimpleFileUpload({ 
  selectedFiles, 
  onFilesChange
}: SimpleFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File selection event triggered');
    const files = event.target.files;
    if (files) {
      console.log('Files from input:', files);
      const fileArray = Array.from(files);
      console.log('Processing files:', fileArray.map(f => f.name));
      
      // Validate files (STEP and PDF only)
      const validFiles = fileArray.filter(file => {
        const isStep = file.name.toLowerCase().endsWith('.step') || file.name.toLowerCase().endsWith('.stp');
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        return isStep || isPdf;
      });

      if (validFiles.length !== fileArray.length) {
        toast({
          title: "Invalid files detected",
          description: "Only STEP and PDF files are allowed",
          variant: "destructive",
        });
      }

      onFilesChange([...selectedFiles, ...validFiles]);

      // No conversion needed - removed 3D preview functionality
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <CloudUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">Upload your files</p>
        <p className="text-sm text-gray-500">
          Click to select STEP and PDF files or drag and drop them here
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Supported formats: .step, .stp, .pdf
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".step,.stp,.pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          {selectedFiles.map((file, index) => {
            const isStepFile = file.name.toLowerCase().endsWith('.step') || file.name.toLowerCase().endsWith('.stp');
            const isPdfFile = file.name.toLowerCase().endsWith('.pdf');
            
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">Ready</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}