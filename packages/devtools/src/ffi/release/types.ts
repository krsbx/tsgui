/**
 * GitHub Releases API — generic TypeScript types
 *
 * Derived from: GET /repos/{owner}/{repo}/releases
 * Response shape: Release[]
 *
 * Notes:
 * - Timestamps are ISO 8601 strings (e.g. "2026-11-01T15:24:59Z").
 * - `upload_url` is a Hypermedia template (RFC 6570) and contains
 *   a `{?name,label}` placeholder.
 * - `digest` follows the `<algo>:<hex>` format (e.g. "sha256:...").
 */

/** ISO 8601 timestamp string (UTC, trailing `Z`). */
export type ISODateString = string;

/** Hypermedia template (RFC 6570) e.g. `https://...{?name,label}`. */
export type HypermediaTemplate = string;

/** A digest in the form `<algorithm>:<hex>` (e.g. `sha256:abc123...`). */
export type DigestString = string;

/** Type of GitHub account. */
export type UserType = "User" | "Bot" | "Organization" | "Mannequin";

/** How the user is shown in the UI. */
export type UserViewType = "public" | "private";

/**
 * A GitHub user / bot / organization.
 * Matches the `author` and `uploader` objects in the Releases payload.
 */
export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  /** Legacy Gravatar id; usually an empty string. */
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: HypermediaTemplate;
  gists_url: HypermediaTemplate;
  starred_url: HypermediaTemplate;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: HypermediaTemplate;
  received_events_url: string;
  type: UserType;
  user_view_type: UserViewType;
  site_admin: boolean;
}

/** Lifecycle state of a release asset upload. */
export type AssetState = "open" | "uploader" | "uploaded";

/** A single downloadable asset attached to a release. */
export interface ReleaseAsset {
  url: string;
  id: number;
  node_id: string;
  name: string;
  /** Short human label for the asset; usually an empty string. */
  label: string;
  /** User (or bot) that uploaded the asset. `null` if unauthenticated. */
  uploader: GitHubUser | null;
  /** MIME content type, e.g. `application/zip`, `application/x-gtar`. */
  content_type: string;
  state: AssetState;
  /** Asset size in bytes. */
  size: number;
  /** Integrity digest in the form `<algo>:<hex>`. May be absent on older assets. */
  digest?: DigestString;
  download_count: number;
  created_at: ISODateString;
  updated_at: ISODateString;
  /** Direct, browser-facing download URL (stable, no auth needed). */
  browser_download_url: string;
}

/** A GitHub release. Top-level item of the releases list response. */
export interface Release {
  url: string;
  assets_url: string;
  /** Hypermedia upload template, contains `{?name,label}`. */
  upload_url: HypermediaTemplate;
  html_url: string;
  id: number;
  /** Author of the release (usually the user/bot that created it). */
  author: GitHubUser;
  node_id: string;
  /** Git tag the release points at, e.g. `SDL3_ttf-3.2.2`. */
  tag_name: string;
  /** Branch / commit-ish the tag was created on. */
  target_commitish: string;
  /** Display name of the release. */
  name: string;
  /** Whether the release is still a draft (not publicly visible). */
  draft: boolean;
  /** Whether the release is immutable (cannot be edited). */
  immutable: boolean;
  /** Whether the release is marked as a prerelease. */
  prerelease: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  published_at: ISODateString;
  assets: ReleaseAsset[];
  /** URL to download the source tarball for this tag. */
  tarball_url: string;
  /** URL to download the source zipball for this tag. */
  zipball_url: string;
  /** Markdown body of the release notes. */
  body: string;
}

/** Convenience alias for the full releases-list response. */
export type ReleaseListResponse = Release[];

/** Single-release response (e.g. GET /releases/latest). */
export type ReleaseResponse = Release;
