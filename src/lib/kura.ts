// Tiny typed client for the kura public REST API.

export interface KuraEnv {
  KURA_BASE_URL?: string;
  KURA_PROJECT?: string;
  KURA_TOKEN?: string;
}

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
  floor_plan?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  prefecture_slug?: string | null;
  layout?: string;
  akiyahopper_id?: string | null;
  published_at: string;
}

interface KuraListResponse<T> {
  data: T[];
  meta: { count: number; limit: number; offset: number };
}

// Overrides let the demo flow on kuracms.com point this frontend at a visitor's
// own sandbox project. Once `?project=demo-xxx&token=kr_live_...` is in the URL,
// we stash it in localStorage so the visitor can browse without re-passing the
// params on every navigation.
function client(env: KuraEnv, override?: { project?: string; token?: string; group?: string }) {
  const base = env.KURA_BASE_URL ?? "https://kuracms.com";
  const project = override?.project || env.KURA_PROJECT || "property";
  const token = override?.token || env.KURA_TOKEN || "";
  return {
    base,
    project,
    group: override?.group,
    headers: { Authorization: `Bearer ${token}` },
  };
}

export async function fetchListings(
  env: KuraEnv,
  query: Record<string, string | number> = {},
  override?: { project?: string; token?: string; group?: string },
): Promise<Listing[]> {
  const c = client(env, override);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== "" && v != null) qs.set(k, String(v));
  }
  if (c.group) qs.set("group", c.group);
  const url = `${c.base}/api/v1/${c.project}/listing${qs.size ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: c.headers });
  if (!res.ok) throw new Error(`kura ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as KuraListResponse<Listing>;
  return body.data.map((l) => resolveMedia(l, c.base));
}

export async function fetchListing(
  env: KuraEnv,
  slug: string,
  override?: { project?: string; token?: string; group?: string },
): Promise<Listing | null> {
  const c = client(env, override);
  const qs = c.group ? `?group=${encodeURIComponent(c.group)}` : "";
  const url = `${c.base}/api/v1/${c.project}/listing/${encodeURIComponent(slug)}${qs}`;
  const res = await fetch(url, { headers: c.headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`kura ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { data: Listing };
  return resolveMedia(body.data, c.base);
}

// Read override from a URL or a cookie value. URL wins on first navigation,
// then we persist it in the cookie so subsequent requests carry it through.
// `group` is a separate URL parameter (always taken fresh from the URL, never
// from the cookie) so previewing one group doesn't trap the visitor there.
export function readDemoOverride(
  url: URL,
  cookieHeader: string | undefined,
): { project?: string; token?: string; group?: string } | undefined {
  const groupParam = url.searchParams.get("group") || undefined;
  const fromUrl = {
    project: url.searchParams.get("project") || undefined,
    token: url.searchParams.get("token") || undefined,
    group: groupParam,
  };
  if (fromUrl.project && fromUrl.token) return fromUrl;
  if (!cookieHeader) return groupParam ? { group: groupParam } : undefined;
  const m = cookieHeader.match(/kura_demo_preview=([^;]+)/);
  if (!m) return groupParam ? { group: groupParam } : undefined;
  try {
    const parsed = JSON.parse(decodeURIComponent(m[1])) as { project?: string; token?: string };
    return parsed.project && parsed.token
      ? { ...parsed, group: groupParam }
      : groupParam
        ? { group: groupParam }
        : undefined;
  } catch {
    return groupParam ? { group: groupParam } : undefined;
  }
}

export function serializeDemoOverride(over: { project?: string; token?: string }): string {
  return JSON.stringify({ project: over.project, token: over.token });
}

// kura stores /media/{key} as the image field value. We need absolute URLs
// for the frontend (could be served from a different origin).
// kura's coordinates field comes through as { lat, lon }; flatten it to
// latitude/longitude for the map page.
function resolveMedia(l: Listing, base: string): Listing {
  const fix = (v: string | null | undefined): string | null | undefined => {
    if (!v) return v;
    if (v.startsWith("/media/")) return base + v;
    return v;
  };
  const geo = (l as unknown as { location_geo?: { lat?: number; lon?: number } }).location_geo;
  return {
    ...l,
    hero_image: fix(l.hero_image),
    photo_2: fix(l.photo_2),
    photo_3: fix(l.photo_3),
    floor_plan: fix(l.floor_plan),
    latitude: l.latitude ?? geo?.lat ?? null,
    longitude: l.longitude ?? geo?.lon ?? null,
  };
}

export function formatJpy(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "JPY" }).format(n);
}

export function statusLabel(s: Listing["status"]): string {
  return { available: "Available", under_offer: "Under Offer", sold: "Sold" }[s] ?? s;
}

// Prefecture labels are derived from the listings themselves so the filter
// dropdown always matches the live data.
export function prefectureLabel(slug?: string | null): string {
  if (!slug) return "";
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
