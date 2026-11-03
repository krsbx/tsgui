import type { ReleaseListResponse } from "./types.ts";

export async function getReleases(owner: string, repo: string) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases`
  );

  if (!res.ok) throw new Error("Failed to fetch releases");

  const json = (await res.json()) as ReleaseListResponse;

  return json;
}
