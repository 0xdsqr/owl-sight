// src/providers/storage/s3-client.ts
// Unified S3-compatible storage client for both R2 and AWS S3

import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  HeadObjectCommand,
  type _Object,
} from "@aws-sdk/client-s3"
import { Readable } from "stream"

// ============================================================================
// Types
// ============================================================================

export interface StorageConfig {
  type: "r2" | "s3"
  // R2 config
  accountId?: string
  accessKeyId?: string
  secretAccessKey?: string
  // S3 config
  profile?: string
  region?: string
}

export interface StorageObject {
  key: string
  size: number
  lastModified?: Date
  isDirectory: boolean
  etag?: string
}

export interface BucketInfo {
  name: string
  creationDate?: Date
  region?: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

// ============================================================================
// Client Factory
// ============================================================================

export function createStorageClient(config: StorageConfig): S3Client {
  if (config.type === "r2") {
    if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error("R2 requires accountId, accessKeyId, and secretAccessKey")
    }
    return new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  } else {
    // AWS S3
    return new S3Client({
      region: config.region ?? "us-east-1",
      // Uses default credential chain (env vars, ~/.aws/credentials, etc.)
    })
  }
}

// ============================================================================
// Bucket Operations
// ============================================================================

export async function listBuckets(client: S3Client): Promise<BucketInfo[]> {
  const response = await client.send(new ListBucketsCommand({}))
  return (response.Buckets ?? []).map((bucket) => ({
    name: bucket.Name ?? "",
    creationDate: bucket.CreationDate,
  }))
}

export async function createBucket(
  client: S3Client,
  bucketName: string,
  region?: string
): Promise<void> {
  await client.send(
    new CreateBucketCommand({
      Bucket: bucketName,
      CreateBucketConfiguration: region ? { LocationConstraint: region as any } : undefined,
    })
  )
}

export async function deleteBucket(
  client: S3Client,
  bucketName: string
): Promise<void> {
  await client.send(new DeleteBucketCommand({ Bucket: bucketName }))
}

// ============================================================================
// Object Operations
// ============================================================================

export async function listObjects(
  client: S3Client,
  bucket: string,
  prefix: string = "",
  delimiter: string = "/"
): Promise<{ objects: StorageObject[]; prefixes: string[] }> {
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: delimiter,
      MaxKeys: 1000,
    })
  )

  const objects: StorageObject[] = (response.Contents ?? []).map((obj) => ({
    key: obj.Key ?? "",
    size: obj.Size ?? 0,
    lastModified: obj.LastModified,
    isDirectory: false,
    etag: obj.ETag,
  }))

  // Common prefixes represent "directories"
  const prefixes = (response.CommonPrefixes ?? []).map((p) => p.Prefix ?? "")

  // Add directory entries for prefixes
  const directories: StorageObject[] = prefixes.map((p) => ({
    key: p,
    size: 0,
    isDirectory: true,
  }))

  return {
    objects: [...directories, ...objects],
    prefixes,
  }
}

export async function getObjectMetadata(
  client: S3Client,
  bucket: string,
  key: string
): Promise<{ size: number; lastModified?: Date; contentType?: string }> {
  const response = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: key })
  )
  return {
    size: response.ContentLength ?? 0,
    lastModified: response.LastModified,
    contentType: response.ContentType,
  }
}

export async function downloadObject(
  client: S3Client,
  bucket: string,
  key: string,
  destinationPath: string
): Promise<void> {
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  )

  if (!response.Body) {
    throw new Error("No body in response")
  }

  // Convert body to bytes and write with Bun
  const body = response.Body as Readable
  const chunks: Uint8Array[] = []
  
  await new Promise<void>((resolve, reject) => {
    body.on("data", (chunk: Uint8Array) => chunks.push(chunk))
    body.on("error", reject)
    body.on("end", resolve)
  })

  const data = new Uint8Array(Buffer.concat(chunks))
  await Bun.write(destinationPath, data)
}

export async function getObjectAsBuffer(
  client: S3Client,
  bucket: string,
  key: string
): Promise<Buffer> {
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  )

  if (!response.Body) {
    throw new Error("No body in response")
  }

  const body = response.Body as Readable
  const chunks: Uint8Array[] = []

  return new Promise((resolve, reject) => {
    body.on("data", (chunk: Uint8Array) => chunks.push(chunk))
    body.on("error", reject)
    body.on("end", () => resolve(Buffer.concat(chunks)))
  })
}

export async function uploadObject(
  client: S3Client,
  bucket: string,
  key: string,
  sourcePath: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  const file = Bun.file(sourcePath)
  const fileSize = file.size
  const fileData = await file.arrayBuffer()

  // Upload with Bun file data
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: new Uint8Array(fileData),
      ContentLength: fileSize,
    })
  )

  onProgress?.({
    loaded: fileSize,
    total: fileSize,
    percentage: 100,
  })
}

export async function uploadBuffer(
  client: S3Client,
  bucket: string,
  key: string,
  data: Buffer | string,
  contentType?: string
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: typeof data === "string" ? Buffer.from(data) : data,
      ContentType: contentType,
    })
  )
}

export async function deleteObject(
  client: S3Client,
  bucket: string,
  key: string
): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

export async function deleteObjects(
  client: S3Client,
  bucket: string,
  keys: string[]
): Promise<{ deleted: string[]; errors: string[] }> {
  if (keys.length === 0) return { deleted: [], errors: [] }

  const response = await client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: false,
      },
    })
  )

  return {
    deleted: (response.Deleted ?? []).map((d) => d.Key ?? ""),
    errors: (response.Errors ?? []).map((e) => `${e.Key}: ${e.Message}`),
  }
}

// ============================================================================
// Directory-like Operations (prefix-based)
// ============================================================================

export async function createFolder(
  client: S3Client,
  bucket: string,
  folderPath: string
): Promise<void> {
  // S3/R2 doesn't have real folders, create a zero-byte object with trailing slash
  const key = folderPath.endsWith("/") ? folderPath : `${folderPath}/`
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: "",
    })
  )
}

export async function deleteFolder(
  client: S3Client,
  bucket: string,
  folderPath: string
): Promise<{ deleted: number; errors: string[] }> {
  // List all objects with this prefix and delete them
  const prefix = folderPath.endsWith("/") ? folderPath : `${folderPath}/`

  let continuationToken: string | undefined
  let totalDeleted = 0
  const allErrors: string[] = []

  do {
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )

    const keys = (listResponse.Contents ?? [])
      .map((obj) => obj.Key)
      .filter((k): k is string => !!k)

    if (keys.length > 0) {
      const { deleted, errors } = await deleteObjects(client, bucket, keys)
      totalDeleted += deleted.length
      allErrors.push(...errors)
    }

    continuationToken = listResponse.NextContinuationToken
  } while (continuationToken)

  return { deleted: totalDeleted, errors: allErrors }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getFileName(key: string): string {
  if (key.endsWith("/")) {
    // It's a directory, remove trailing slash and get last part
    const parts = key.slice(0, -1).split("/")
    return parts[parts.length - 1] ?? key
  }
  const parts = key.split("/")
  return parts[parts.length - 1] ?? key
}

export function getParentPrefix(prefix: string): string {
  if (!prefix || prefix === "/") return ""
  // Remove trailing slash if present
  const clean = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix
  const lastSlash = clean.lastIndexOf("/")
  if (lastSlash === -1) return ""
  return clean.slice(0, lastSlash + 1)
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TB`
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${bytes} B`
}
