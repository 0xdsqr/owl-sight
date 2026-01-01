import type { DashboardData } from "../../providers/cloudflare/client"
import { StorageBrowser } from "../storage/storage-browser"

export function CloudflareR2(props: { data: DashboardData }) {
  // Get account ID from bucket data or env
  const accountId = () => props.data.r2Buckets[0]?.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID ?? ""
  
  // R2 S3 API credentials (separate from Cloudflare API token)
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  // Convert bucket data for the storage browser
  const bucketList = () => props.data.r2Buckets.map(b => ({
    name: b.bucketName,
    size: b.storageBytes,
    objectCount: b.objectCount,
  }))

  return (
    <StorageBrowser
      provider="r2"
      accountId={accountId()}
      accessKeyId={accessKeyId}
      secretAccessKey={secretAccessKey}
      bucketList={bucketList()}
      accentColor="#f38020"
    />
  )
}
