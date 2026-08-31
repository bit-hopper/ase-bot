export interface FacetLike {
  features: Array<{ $type?: string; did?: string }>;
}

export interface PostRecordLike {
  text: string;
  facets?: FacetLike[];
}

const MENTION_FEATURE_TYPE = "app.bsky.richtext.facet#mention";

/** §11.2 — "Do not parse @asebot as a raw string. Always use facets." */
export function mentionsBotDid(record: PostRecordLike, botDid: string): boolean {
  if (!record.facets) return false;
  return record.facets.some((facet) => facet.features.some((feature) => feature.$type === MENTION_FEATURE_TYPE && feature.did === botDid));
}
