import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ManualQuoteForm from "@/components/admin/manual-quote-form";
import ManualOrderForm from "@/components/admin/manual-order-form";
import { Quote, Package, Plus } from "lucide-react";

export default function ManualCreationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Manual Creation</h1>
          </div>
          <p className="text-gray-600">
            Create quotes and orders manually for customers. Search and select customers by name, company, email, or customer ID.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Quote className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Manual Quotes</h3>
                  <p className="text-gray-600 text-sm">
                    Create quotes directly for customers without requiring an RFQ submission
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Manual Orders</h3>
                  <p className="text-gray-600 text-sm">
                    Create orders directly for customers with full project specifications
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Creation Forms */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <CardTitle className="text-xl text-gray-800">Create New</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="quote" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
                <TabsTrigger 
                  value="quote" 
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                >
                  <Quote className="h-4 w-4" />
                  <span>Create Quote</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="order"
                  className="flex items-center space-x-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-b-2 data-[state=active]:border-green-500"
                >
                  <Package className="h-4 w-4" />
                  <span>Create Order</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="quote" className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Manual Quote</h3>
                  <p className="text-gray-600 text-sm">
                    Generate a quote for a customer without requiring them to submit an RFQ first. 
                    The system will automatically create a placeholder RFQ and associate the quote with it.
                  </p>
                </div>
                <ManualQuoteForm />
              </TabsContent>
              
              <TabsContent value="order" className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Manual Order</h3>
                  <p className="text-gray-600 text-sm">
                    Create a complete order for a customer with full project specifications. 
                    This will automatically create the necessary RFQ and immediately proceed to order creation.
                  </p>
                </div>
                <ManualOrderForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}