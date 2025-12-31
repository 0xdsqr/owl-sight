import { StorageBrowser } from "../storage/storage-browser"

export function S3Tab(props: { profile: string; region: string }) {
  return (
    <StorageBrowser
      provider="s3"
      profile={props.profile}
      region={props.region}
      accentColor="#ff9900"
    />
  )
}
