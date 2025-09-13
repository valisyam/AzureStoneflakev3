import { BlobServiceClient, ContainerClient, BlockBlobClient, BlobDownloadResponseParsed } from '@azure/storage-blob';
import { Response } from 'express';

// Environment variables for Azure Blob Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_BLOB_CONTAINER = process.env.AZURE_BLOB_CONTAINER || 'app-files';

if (!AZURE_STORAGE_CONNECTION_STRING) {
  console.warn('⚠️ AZURE_STORAGE_CONNECTION_STRING not configured. File uploads will fail.');
}

let containerClient: ContainerClient | null = null;

/**
 * Get the Azure Blob Container Client
 * Initializes the container if it doesn't exist
 */
export async function getContainerClient(): Promise<ContainerClient> {
  if (!containerClient) {
    if (!AZURE_STORAGE_CONNECTION_STRING) {
      throw new Error('Azure Storage connection string not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    containerClient = blobServiceClient.getContainerClient(AZURE_BLOB_CONTAINER);

    // Ensure container exists
    try {
      await containerClient.createIfNotExists({
        access: 'blob' // Allow public read access to blobs
      });
      console.log(`📦 Azure Blob container '${AZURE_BLOB_CONTAINER}' ready`);
    } catch (error) {
      console.error('❌ Failed to initialize Azure Blob container:', error);
      throw error;
    }
  }

  return containerClient;
}

/**
 * Upload a buffer to Azure Blob Storage
 * @param blobName - The name/path of the blob (e.g., "invoices/po123/file.pdf")
 * @param buffer - The file buffer to upload
 * @param contentType - The MIME type of the file
 * @returns Promise<string> - The blob name on success
 */
export async function uploadBuffer(blobName: string, buffer: Buffer, contentType: string): Promise<string> {
  try {
    const container = await getContainerClient();
    const blockBlobClient: BlockBlobClient = container.getBlockBlobClient(blobName);

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType
      }
    });

    console.log(`✅ Uploaded blob: ${blobName} (${buffer.length} bytes)`);
    return blobName;
  } catch (error) {
    console.error(`❌ Failed to upload blob ${blobName}:`, error);
    throw error;
  }
}

/**
 * Stream a blob directly to HTTP response
 * @param blobName - The name/path of the blob
 * @param res - Express response object
 * @returns Promise<boolean> - true if successful, false if blob not found
 */
export async function streamToResponse(blobName: string, res: Response): Promise<boolean> {
  try {
    const container = await getContainerClient();
    const blockBlobClient: BlockBlobClient = container.getBlockBlobClient(blobName);

    // Check if blob exists
    const exists = await blockBlobClient.exists();
    if (!exists) {
      return false;
    }

    // Get blob properties for content type
    const properties = await blockBlobClient.getProperties();
    
    // Set response headers
    if (properties.contentType) {
      res.setHeader('Content-Type', properties.contentType);
    }
    if (properties.contentLength) {
      res.setHeader('Content-Length', properties.contentLength);
    }

    // Stream the blob to response
    const downloadResponse: BlobDownloadResponseParsed = await blockBlobClient.download();
    
    if (downloadResponse.readableStreamBody) {
      downloadResponse.readableStreamBody.pipe(res);
      console.log(`📁 Streamed blob: ${blobName}`);
      return true;
    } else {
      console.error(`❌ No readable stream for blob: ${blobName}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to stream blob ${blobName}:`, error);
    return false;
  }
}

/**
 * Generate a safe unique blob name
 * @param originalName - Original filename
 * @returns string - Safe filename with timestamp and UUID prefix
 */
export function generateSafeBlobName(originalName: string): string {
  // Sanitize the original filename
  const sanitized = originalName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .toLowerCase();

  // Generate timestamp and random suffix for uniqueness
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return `${timestamp}-${randomSuffix}-${sanitized}`;
}