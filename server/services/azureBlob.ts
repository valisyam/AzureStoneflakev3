import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import { Response } from 'express';

class AzureBlobService {
  private containerClient: ContainerClient | null = null;

  /**
   * Get the container client, initializing if necessary
   */
  private getContainerClient(): ContainerClient {
    if (this.containerClient) {
      return this.containerClient;
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_BLOB_CONTAINER;

    if (!connectionString) {
      const error = 'AZURE_STORAGE_CONNECTION_STRING environment variable is required';
      console.error('❌ Azure Blob Configuration Error:', error);
      throw new Error(error);
    }

    if (!containerName) {
      const error = 'AZURE_BLOB_CONTAINER environment variable is required';
      console.error('❌ Azure Blob Configuration Error:', error);
      throw new Error(error);
    }

    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      this.containerClient = blobServiceClient.getContainerClient(containerName);
      console.log('✅ Azure Blob Storage initialized for container:', containerName);
      return this.containerClient;
    } catch (error) {
      console.error('❌ Failed to initialize Azure Blob Storage:', error);
      throw new Error('Failed to initialize Azure Blob Storage connection');
    }
  }

  /**
   * Upload a buffer to Azure Blob Storage
   */
  async uploadBuffer(blobName: string, buffer: Buffer, contentType: string): Promise<string> {
    try {
      const containerClient = this.getContainerClient();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const uploadResponse = await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
      });

      console.log('✅ File uploaded to Azure Blob:', blobName, 'RequestId:', uploadResponse.requestId);
      return blobName;
    } catch (error) {
      console.error('❌ Failed to upload file to Azure Blob:', blobName, error);
      throw new Error(`Failed to upload file to Azure Blob Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream a blob to HTTP response
   */
  async streamToResponse(blobName: string, res: Response): Promise<void> {
    try {
      const containerClient = this.getContainerClient();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Get blob properties to set appropriate headers
      const properties = await blockBlobClient.getProperties();
      
      // Set content type header
      if (properties.contentType) {
        res.setHeader('Content-Type', properties.contentType);
      }

      // Set content length if available
      if (properties.contentLength) {
        res.setHeader('Content-Length', properties.contentLength);
      }

      // Set cache headers for better performance
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // Stream the blob directly to the response
      const downloadResponse = await blockBlobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('Failed to get readable stream from blob');
      }

      downloadResponse.readableStreamBody.pipe(res);
      
      console.log('✅ File streamed from Azure Blob:', blobName);
    } catch (error) {
      console.error('❌ Failed to stream file from Azure Blob:', blobName, error);
      
      if (error instanceof Error && error.name === 'RestError') {
        // Handle specific Azure Storage errors
        const azureError = error as any;
        if (azureError.statusCode === 404) {
          res.status(404).json({ message: 'File not found' });
          return;
        }
      }
      
      res.status(500).json({ message: 'Failed to retrieve file from storage' });
    }
  }

  /**
   * Check if a blob exists
   */
  async blobExists(blobName: string): Promise<boolean> {
    try {
      const containerClient = this.getContainerClient();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      const exists = await blockBlobClient.exists();
      return exists;
    } catch (error) {
      console.error('❌ Failed to check blob existence:', blobName, error);
      return false;
    }
  }

  /**
   * Delete a blob
   */
  async deleteBlob(blobName: string): Promise<boolean> {
    try {
      const containerClient = this.getContainerClient();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.delete();
      console.log('✅ File deleted from Azure Blob:', blobName);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete file from Azure Blob:', blobName, error);
      return false;
    }
  }

  /**
   * Generate blob name with appropriate prefix based on file context
   */
  generateBlobName(linkedToType: string, linkedToId: string, originalFileName: string): string {
    // Sanitize the original filename
    const sanitizedName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const uniqueId = Math.round(Math.random() * 1E9);
    const fileName = `${timestamp}-${uniqueId}-${sanitizedName}`;

    // Map linkedToType to appropriate blob prefix
    switch (linkedToType) {
      case 'purchase_order':
      case 'invoice':
        return `invoices/${linkedToId}/${fileName}`;
      case 'quality_check':
        return `qc/${linkedToId}/${fileName}`;
      case 'rfq':
        return `rfqs/${linkedToId}/${fileName}`;
      case 'quote':
        return `quotes/${linkedToId}/${fileName}`;
      case 'message':
      case 'chat':
        return `messages/${linkedToId}/${fileName}`;
      default:
        return `files/${linkedToType}/${linkedToId}/${fileName}`;
    }
  }
}

// Export a singleton instance
export const azureBlobService = new AzureBlobService();