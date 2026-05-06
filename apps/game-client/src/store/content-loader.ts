import type { ContentPack } from '@tss/schema'

export type ContentPackManifestEntry = {
  packId: string
  version: string
  name: string
  summary: string
  href: string
}

export type ContentPackManifest = {
  defaultPackId?: string
  packs: ContentPackManifestEntry[]
}

const manifestUrl = '/content-packs/manifest.json'

export async function loadContentPackManifest(): Promise<ContentPackManifest> {
  return fetchJson<ContentPackManifest>(manifestUrl)
}

export async function loadContentPack(entry: ContentPackManifestEntry): Promise<ContentPack> {
  return fetchJson<ContentPack>(entry.href)
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`)
  return response.json() as Promise<T>
}
