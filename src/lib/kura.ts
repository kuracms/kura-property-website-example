// Tiny typed client for the kura public REST API.
// Configured via Cloudflare env at runtime (Astro on Workers).

export interface KuraEnv {
  KURA_BASE_URL?: string;
  KURA_PROJECT?: string;
  KURA_TOKEN?: string;
}

export type Prefecture =
  | "hokkaido"
  | "hiroshima"
  | "yamaguchi"
  | "kyoto"
  | "oita"
  | "hyogo"
  | "tottori"
  | "nagano";

export interface Listing {
  id: string;
  slug: string;
  title: string;
  location: string;
  price_jpy: number;
  square_meters?: number;
  land_area_sqm?: number;
  bedrooms?: number;
  build_year?: number;
  status: "available" | "under_offer" | "sold";
  description?: string;
  hero_image?: string | null;
  photo_2?: string | null;
  photo_3?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  prefecture?: Prefecture | null;
  layout?: string;
  published_at: string;
}

interface KuraListResponse<T> {
  data: T[];
  meta: { count: number; limit: number; offset: number };
}

function client(env: KuraEnv) {
  const base = env.KURA_BASE_URL ?? "https://kuracms.com";
  const project = env.KURA_PROJECT ?? "property";
  const token = env.KURA_TOKEN ?? "";
  return { base, project, headers: { Authorization: `Bearer ${token}` } };
}

export async function fetchListings(
  env: KuraEnv,
  query: Record<string, string | number> = {},
): Promise<Listing[]> {
  const c = client(env);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== "" && v != null) qs.set(k, String(v));
  }
  const url = `${c.base}/api/v1/${c.project}/listing${qs.size ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: c.headers });
  if (!res.ok) throw new Error(`kura ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as KuraListResponse<Listing>;
  return body.data;
}

export async function fetchListing(env: KuraEnv, slug: string): Promise<Listing | null> {
  const c = client(env);
  const url = `${c.base}/api/v1/${c.project}/listing/${encodeURIComponent(slug)}`;
  const res = await fetch(url, { headers: c.headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`kura ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { data: Listing };
  return body.data;
}

export function formatJpy(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "JPY" }).format(n);
}

export function statusLabel(s: Listing["status"]): string {
  return { available: "Available", under_offer: "Under Offer", sold: "Sold" }[s] ?? s;
}

export const PREFECTURES: { value: Prefecture; label: string }[] = [
  { value: "hokkaido", label: "Hokkaido" },
  { value: "hiroshima", label: "Hiroshima" },
  { value: "hyogo", label: "Hyogo" },
  { value: "kyoto", label: "Kyoto" },
  { value: "nagano", label: "Nagano" },
  { value: "oita", label: "Oita" },
  { value: "tottori", label: "Tottori" },
  { value: "yamaguchi", label: "Yamaguchi" },
];

export function prefectureLabel(p?: Prefecture | null): string {
  if (!p) return "";
  return PREFECTURES.find((x) => x.value === p)?.label ?? p;
}
