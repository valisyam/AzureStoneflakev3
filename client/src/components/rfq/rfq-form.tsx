import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getAuthToken } from "@/lib/queryClient";
import SimpleFileUpload from "./simple-file-upload-fixed";

import { Check, Factory } from "lucide-react";


const rfqSchema = z.object({
  projectName: z.string().min(1, "Project name is required").default(""),
  material: z.string().min(1, "Material is required").default(""),
  materialGrade: z.string().optional().default(""),
  finishing: z.string().optional().default(""),
  tolerance: z.string().min(1, "Tolerance is required").default(""),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  notes: z.string().optional().default(""),
  manufacturingProcess: z.string().optional().default(""),
  manufacturingSubprocess: z.string().optional().default(""),
  internationalManufacturingOk: z.boolean().default(false),
});

type RFQFormData = z.infer<typeof rfqSchema>;

interface RFQFormProps {
  onSuccess?: () => void;
}

// Material options with their grades
const materialOptions = {
  aluminum: {
    label: "Aluminum",
    grades: ["6061-T6", "6063-T5", "7075-T6", "A380", "2024-T3", "5052-H32", "Other"]
  },
  steel: {
    label: "Steel",
    grades: ["1018", "1045", "4140", "4340", "A36", "304 SS", "316 SS", "17-4 PH", "Other"]
  },
  brass: {
    label: "Brass", 
    grades: ["C360", "C260", "C464", "Other"]
  },
  copper: {
    label: "Copper",
    grades: ["C101", "C110", "Other"]
  },
  titanium: {
    label: "Titanium",
    grades: ["Grade 2", "Grade 5 (Ti-6Al-4V)", "Other"]
  },
  plastic: {
    label: "Plastic",
    grades: ["ABS", "PLA", "PETG", "Nylon", "Polycarbonate", "Acetal (POM)", "PEEK", "Other"]
  },
  other: {
    label: "Other",
    grades: ["Other"]
  }
};

const finishingOptions = [
  "As Machined",
  "Black Oxide",
  "Powder Coating",
  "Anodizing (Clear)",
  "Anodizing (Black)",
  "Anodizing (Color)",
  "Zinc Plating",
  "Nickel Plating",
  "Chrome Plating",
  "Passivation",
  "Bead Blasting",
  "Tumbling",
  "Painting",
  "Cerakote",
  "Heat Treatment",
  "Other"
];

// Manufacturing process options with subcategories
const manufacturingProcessOptions = {
  cnc_machining: {
    label: "CNC Machining",
    subcategories: ["3-Axis Milling", "4-Axis Milling", "5-Axis Milling", "CNC Turning", "Swiss Machining", "Multi-Axis Turning"]
  },
  casting: {
    label: "Casting", 
    subcategories: ["Sand Casting", "Die Casting", "Investment Casting", "Gravity Casting", "Pressure Die Casting", "Shell Molding"]
  },
  forging: {
    label: "Forging",
    subcategories: ["Hot Forging", "Cold Forging", "Warm Forging", "Open Die Forging", "Closed Die Forging", "Upset Forging"]
  },
  sheet_metal: {
    label: "Sheet Metal Fabrication",
    subcategories: ["Laser Cutting", "Plasma Cutting", "Waterjet Cutting", "Punching", "Bending", "Stamping", "Welding"]
  },
  additive_manufacturing: {
    label: "3D Printing",
    subcategories: ["FDM/FFF", "SLA/SLP", "SLS", "DMLS/SLM", "PolyJet", "Multi Jet Fusion", "Binder Jetting"]
  },
  injection_molding: {
    label: "Plastic Injection Molding",
    subcategories: ["Thermoplastic Injection", "Thermoset Injection", "Insert Molding", "Overmolding", "Two-Shot Molding", "Gas Assist Molding"]
  },
  recommendation: {
    label: "I need a recommendation",
    subcategories: ["Recommend based on my specifications"]
  },
  no_preference: {
    label: "No preference - any suitable process",
    subcategories: ["Any process that meets requirements"]
  }
};

export default function RFQForm({ onSuccess }: RFQFormProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedManufacturingProcess, setSelectedManufacturingProcess] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const form = useForm<RFQFormData>({
    resolver: zodResolver(rfqSchema),
    mode: "onChange",
    defaultValues: {
      projectName: "",
      material: "",
      materialGrade: "",
      finishing: "",
      tolerance: "",
      quantity: 1,
      notes: "",
      manufacturingProcess: "",
      manufacturingSubprocess: "",
      internationalManufacturingOk: false,
    },
  });

  const createRfqMutation = useMutation({
    mutationFn: async (data: RFQFormData) => {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      // First create the RFQ
      const rfqResponse = await apiRequest("POST", "/api/rfqs", data);
      const rfq = await rfqResponse.json();

      // Then upload files if any are selected
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        formData.append('linkedToType', 'rfq');
        formData.append('linkedToId', rfq.id);
        
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`File upload failed: ${response.statusText}`);
        }
      }

      return rfq;
    },
    onSuccess: (rfq) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rfqs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Reset form and files
      form.reset();
      setSelectedFiles([]);
      setSelectedMaterial("");
      
      // Call success callback immediately to redirect to success page
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to submit RFQ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RFQFormData) => {
    createRfqMutation.mutate(data);
  };

  // File handling
  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };







  return (
    <Card className="rounded-2xl shadow-none border-0 bg-gradient-to-br from-teal-50/60 via-blue-50/40 to-slate-50/50 backdrop-blur-sm">
      <CardHeader className="text-center pb-6 bg-gradient-to-br from-white/60 to-teal-50/30 rounded-t-2xl border-b border-teal-100/40">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg ring-4 ring-teal-100/50">
          <Factory className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-700 bg-clip-text text-transparent">
          Submit Request for Quote
        </CardTitle>
        <p className="text-gray-700 mt-3 text-lg font-medium">Upload your files and specifications to get a custom manufacturing quote</p>
      </CardHeader>
      <CardContent className="space-y-8 bg-gradient-to-br from-white/70 via-teal-50/20 to-blue-50/30 rounded-b-2xl backdrop-blur-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Project Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Enter quantity"

                        value={field.value || 1}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseInt(value) : 1);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Material and Grade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="material"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedMaterial(value);
                      form.setValue("materialGrade", "");
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(materialOptions).map(([key, option]) => (
                          <SelectItem key={key} value={key}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="materialGrade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material Grade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedMaterial}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedMaterial ? "Select grade" : "Select material first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedMaterial && materialOptions[selectedMaterial as keyof typeof materialOptions]?.grades.map((grade) => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tolerance and Finishing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="tolerance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tolerance</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tolerance" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard (±0.005")</SelectItem>
                        <SelectItem value="tight">Tight (±0.002")</SelectItem>
                        <SelectItem value="precision">Precision (±0.001")</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="finishing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Finishing</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select finishing (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {finishingOptions.map((finish) => (
                          <SelectItem key={finish} value={finish}>{finish}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Manufacturing Process Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="manufacturingProcess"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturing Process</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedManufacturingProcess(value);
                      // Reset subprocess when process changes
                      form.setValue("manufacturingSubprocess", "");
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select manufacturing process" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(manufacturingProcessOptions).map(([key, option]) => (
                          <SelectItem key={key} value={key}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="manufacturingSubprocess"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific Process</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedManufacturingProcess}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedManufacturingProcess ? "Select specific process" : "Select process first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedManufacturingProcess && manufacturingProcessOptions[selectedManufacturingProcess as keyof typeof manufacturingProcessOptions]?.subcategories.map((subprocess) => (
                          <SelectItem key={subprocess} value={subprocess}>{subprocess}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* International Manufacturing Preference */}
            <FormField
              control={form.control}
              name="internationalManufacturingOk"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I'm open to international manufacturing
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* File Upload Section */}
            <SimpleFileUpload
              selectedFiles={selectedFiles}
              onFilesChange={handleFilesChange}
            />

            {/* Additional Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Any special requirements or notes for this project..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-gradient-to-r from-teal-primary to-teal-600 text-white px-8 py-3 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
                disabled={createRfqMutation.isPending}
              >
                {createRfqMutation.isPending ? "Submitting..." : "Submit RFQ"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}