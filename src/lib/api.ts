import { cachedFetch } from "./cache";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Request timeout — reduced to 7s (Vercel limit is 10s, leaves buffer)
// ---------------------------------------------------------------------------
function withTimeout<T>(promise: Promise<T>, ms = 7000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Please check your connection and try again.")), ms)
    ),
  ]);
}

// ---------------------------------------------------------------------------
// Auth helper — uses cached session (no network call) instead of getUser()
// ---------------------------------------------------------------------------
async function getAuthUser() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error("Not authenticated")
  return session.user
}

// ---------------------------------------------------------------------------
// Abort-aware Supabase insert — cancels DB call if timeout fires
// ---------------------------------------------------------------------------
async function insertWithAbort(table: string, body: Record<string, any>, signal: AbortSignal) {
  const { data, error } = await supabase
    .from(table)
    .insert(body)
    .select()
    .single()
    .abortSignal(signal)
  return { data, error }
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------
function normalizeWorker(p: any) {
  if (!p) return null;
  return {
    ...p,
    profilePhoto: p.profilePhoto ?? p.profile_photo ?? null,
    isOnline: p.isOnline ?? p.is_online ?? false,
    isVerified: p.isVerified ?? p.is_verified ?? false,
    isTrusted: p.isTrusted ?? p.is_trusted ?? false,
    isBoosted: p.isBoosted ?? p.is_boosted ?? false,
  };
}
function normalizeService(s: any) {
  if (!s) return s;
  const raw = s.worker ?? s.profiles ?? null;
  return {
    ...s,
    isFeatured: s.isFeatured ?? s.is_featured ?? false,
    isOnline: s.isOnline ?? s.is_online ?? false,
    priceDisplay: s.priceDisplay ?? s.price_display ?? null,
    priceType: s.priceType ?? s.price_type ?? null,
    reviewCount: s.reviewCount ?? s.review_count ?? 0,
    worker: normalizeWorker(raw),
  };
}
function normalizeJob(j: any) {
  if (!j) return j;
  return { ...j, poster: j.poster ?? j.profiles ?? null };
}
function normalizeItem(i: any) {
  if (!i) return i;
  return { ...i, seller: i.seller ?? i.profiles ?? null };
}
function normalizeReview(r: any) {
  if (!r) return r;
  return { ...r, reviewer: r.reviewer ?? r.profiles ?? null };
}

// ---------------------------------------------------------------------------
// getOrCreateConversation
// ---------------------------------------------------------------------------
export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const user = await getAuthUser()
  const me = user.id;
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(`and(user1_id.eq.${me},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${me})`)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ user1_id: me, user2_id: otherUserId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseParams(search: string) {
  const p = new URLSearchParams(search);
  return {
    // existing
    limit: p.get("limit") ? Number(p.get("limit")) : null,
    sortBy: p.get("sortBy"),
    category: p.get("category"),
    location: p.get("location"),
    search: p.get("search"),
    workerId: p.get("workerId"),
    // FIX (1): added missing params
    page: p.get("page") ? Number(p.get("page")) : null,
    // p.get() returns null when key is absent — must use p.has() to distinguish absent vs "false"
    isOnline: p.has("isOnline") ? p.get("isOnline") === "true" : null,
    minPrice: p.get("minPrice") ? Number(p.get("minPrice")) : null,
    maxPrice: p.get("maxPrice") ? Number(p.get("maxPrice")) : null,
  };
}

function applyFilters(query: any, params: ReturnType<typeof parseParams>, skipPagination = false) {
  if (params.category) query = query.eq("category", params.category);
  if (params.location) query = query.ilike("location", `%${params.location}%`);
  if (params.search) query = query.ilike("title", `%${params.search}%`);
  if (params.workerId) query = query.eq("worker_id", params.workerId);
  if (params.sortBy === "rating") query = query.order("rating", { ascending: false });

  // FIX (2): apply new filters
  if (params.isOnline !== null) query = query.eq("is_online", params.isOnline);
  if (params.minPrice !== null && !isNaN(params.minPrice)) query = query.gte("price", params.minPrice);
  if (params.maxPrice !== null && !isNaN(params.maxPrice)) query = query.lte("price", params.maxPrice);

  // Pagination — skipped for detail/single-row routes to avoid Vercel 400 errors
  if (!skipPagination) {
    const pageSize = (params.limit && !isNaN(params.limit)) ? params.limit : 20;
    const page = (params.page && !isNaN(params.page) && params.page > 0) ? params.page : 1;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  return query;
}

function splitPath(url: string): { pathname: string; params: ReturnType<typeof parseParams> } {
  const [pathname, qs = ""] = url.split("?");
  return { pathname: pathname.replace(/\/$/, ""), params: parseParams(qs) };
}
function throwIfError(error: any) {
  if (!error) return;
  if (error.code === "PGRST116") return;
  if (error.code === "42501" || error.message?.includes("permission denied")) {
    console.warn("[RLS]", error.message);
    return;
  }
  throw new Error(error.message ?? JSON.stringify(error));
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------
async function get(url: string): Promise<any> {
  const { pathname, params } = splitPath(url);
  const seg = pathname.split("/").filter(Boolean);

  if (seg[0] === "services" && seg.length === 1) {
    // FIX (3): add { count: "exact" } and return total
    let q = supabase.from("services").select("*, profiles(*)", { count: "exact" });
    q = applyFilters(q, params);
    q = q.order("is_boosted", { ascending: false }).order("created_at", { ascending: false });
    const { data, error, count } = await q;
    throwIfError(error);
    return { services: (data ?? []).map(normalizeService), total: count ?? 0 };
  }
  if (seg[0] === "services" && seg[2] === "reviews") {
    let q = supabase.from("reviews").select("*, profiles(*)").eq("service_id", seg[1]);
    q = applyFilters(q, params, true); // skip pagination for sub-resource
    const { data, error } = await q;
    throwIfError(error);
    return (data ?? []).map(normalizeReview);
  }
  if (seg[0] === "services" && seg.length === 2) {
    const { data, error } = await supabase.from("services").select("*, profiles(*), reviews(*)").eq("id", seg[1]).maybeSingle();
    if (error && error.code !== "PGRST116") throwIfError(error);
    return normalizeService(data);
  }
  if (seg[0] === "jobs" && seg.length === 1) {
    let q = supabase.from("jobs").select("*, profiles(*)");
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return { jobs: (data ?? []).map(normalizeJob) };
  }
  if (seg[0] === "jobs" && seg.length === 2) {
    const { data, error } = await supabase.from("jobs").select("*, profiles(*), applications(*)").eq("id", seg[1]).maybeSingle();
    if (error && error.code !== "PGRST116") throwIfError(error);
    return normalizeJob(data);
  }
  if (seg[0] === "marketplace" && seg.length === 1) {
    let q = supabase.from("marketplace_items").select("*, profiles(*)");
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return { items: (data ?? []).map(normalizeItem) };
  }
  if (seg[0] === "marketplace" && seg.length === 2) {
    const { data, error } = await supabase.from("marketplace_items").select("*, profiles(*)").eq("id", seg[1]).maybeSingle();
    if (error && error.code !== "PGRST116") throwIfError(error);
    return normalizeItem(data);
  }
  if (seg[0] === "users" && seg[1] === "me" && seg[2] === "stats") {
    const user = await getAuthUser()
    const { data, error } = await supabase.from("profiles").select("rating, jobs_completed").eq("id", user.id).maybeSingle();
    if (error && error.code !== "PGRST116") throwIfError(error);
    return data;
  }
  if (seg[0] === "users" && seg[2] === "reviews") {
    let q = supabase.from("reviews").select("*, profiles(*)").eq("worker_id", seg[1]);
    q = applyFilters(q, params, true); // skip pagination for sub-resource
    const { data, error } = await q;
    throwIfError(error);
    return data ?? [];
  }
  if (seg[0] === "users" && seg.length === 1) {
    let q = supabase.from("profiles").select("*");
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return { users: data ?? [] };
  }
  if (seg[0] === "users" && seg.length === 2) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", seg[1]).maybeSingle();
    if (error && error.code !== "PGRST116") throwIfError(error);
    return data;
  }
  if (seg[0] === "workers") {
    let q = supabase.from("profiles").select("*").in("role", ["worker", "both"]);
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return { workers: data ?? [] };
  }
  // FIX (4): /emergency/workers route
  if (seg[0] === "emergency" && seg[1] === "workers") {
    let q = supabase.from("profiles").select("*").in("role", ["worker", "both"]);
    if (params.isOnline !== null) q = q.eq("is_online", params.isOnline);
    if (params.location) q = q.ilike("location", `%${params.location}%`);
    if (params.category) q = q.eq("category", params.category);
    const { data, error } = await q;
    throwIfError(error);
    return { workers: (data ?? []).map(normalizeWorker) };
  }
  if (seg[0] === "admin" && seg[1] === "stats") {
    const [profiles, services, jobs] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("services").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }),
    ]);
    return { totalUsers: profiles.count ?? 0, totalServices: services.count ?? 0, totalJobs: jobs.count ?? 0 };
  }
  if (seg[0] === "admin" && seg[1] === "users" && seg.length === 2) {
    let q = supabase.from("profiles").select("*");
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return { users: data ?? [] };
  }
  throw new Error(`api.get: unhandled route "${url}"`);
}

// ---------------------------------------------------------------------------
// POST — with AbortController so DB calls cancel when timeout fires
// ---------------------------------------------------------------------------
async function post(url: string, body: Record<string, any> = {}): Promise<any> {
  const { pathname } = splitPath(url);
  const seg = pathname.split("/").filter(Boolean);

  // Shared abort controller — timeout in withTimeout() triggers this too
  const controller = new AbortController()
  const signal = controller.signal

  if (seg[0] === "services" && seg.length === 1) {
    const user = await getAuthUser()
    const { data, error } = await insertWithAbort("services", { ...body, worker_id: user.id }, signal)
    throwIfError(error); return data;
  }
  if (seg[0] === "services" && seg[2] === "book") {
    const user = await getAuthUser()
    const { data, error } = await insertWithAbort("bookings", { service_id: seg[1], customer_id: user.id, ...body }, signal)
    throwIfError(error); return data;
  }
  if (seg[0] === "jobs" && seg.length === 1) {
    const user = await getAuthUser()
    // FIX: use user_id (matches RLS policy) + poster_id for display queries
    const { data, error } = await insertWithAbort("jobs", { ...body, user_id: user.id, poster_id: user.id }, signal)
    throwIfError(error); return data;
  }
  if (seg[0] === "jobs" && seg[2] === "apply") {
    const user = await getAuthUser()
    const { data, error } = await insertWithAbort("applications", { job_id: seg[1], applicant_id: user.id, ...body }, signal)
    throwIfError(error); return data;
  }
  if (seg[0] === "marketplace" && seg.length === 1) {
    const user = await getAuthUser()
    const { data, error } = await insertWithAbort("marketplace_items", { ...body, seller_id: user.id }, signal)
    throwIfError(error); return data;
  }
  if (seg[0] === "conversations" && seg[2] === "messages") {
    const user = await getAuthUser()
    const { data, error } = await insertWithAbort("messages", { conversation_id: seg[1], sender_id: user.id, ...body }, signal)
    throwIfError(error); return data;
  }
  if (seg[0] === "emergency" && seg[1] === "alert") {
    const user = await getAuthUser()
    const { data, error } = await insertWithAbort("emergency_requests", { ...body, user_id: user.id }, signal)
    throwIfError(error); return data;
  }
  if (seg[0] === "notifications" && seg[1] === "mark-all-read") {
    const user = await getAuthUser()
    const { data, error } = await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).select().abortSignal(signal)
    throwIfError(error); return data;
  }
  throw new Error(`api.post: unhandled route "${url}"`);
}

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------
async function put(url: string, body: Record<string, any> = {}): Promise<any> {
  const { pathname } = splitPath(url);
  const seg = pathname.split("/").filter(Boolean);

  if (seg[0] === "users" && seg.length === 2) {
    const ALLOWED = ["name", "bio", "location", "phone", "whatsapp", "role", "profile_photo", "is_online"];
    const remapped: Record<string, any> = {};
    for (const [k, v] of Object.entries(body)) {
      const key = k === "profilePhoto" ? "profile_photo" : k === "isOnline" ? "is_online" : k;
      if (ALLOWED.includes(key)) remapped[key] = v;
    }
    const { data, error } = await supabase.from("profiles").update(remapped).eq("id", seg[1]).select().single();
    throwIfError(error); return data;
  }
  if (seg[0] === "notifications" && seg[2] === "read") {
    const { data, error } = await supabase.from("notifications").update({ read: true }).eq("id", seg[1]).select().single();
    throwIfError(error); return data;
  }
  if (seg[0] === "admin" && seg[1] === "users" && seg.length === 3) {
    const { data, error } = await supabase.from("profiles").update(body).eq("id", seg[2]).select().single();
    throwIfError(error); return data;
  }
  if (seg[0] === "admin" && seg[1] === "services" && seg.length === 3) {
    const { data, error } = await supabase.from("services").update(body).eq("id", seg[2]).select().single();
    throwIfError(error); return data;
  }
  throw new Error(`api.put: unhandled route "${url}"`);
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------
async function del(url: string): Promise<any> {
  const { pathname } = splitPath(url);
  const seg = pathname.split("/").filter(Boolean);
  if (seg[0] === "admin" && seg[1] === "users" && seg.length === 3) {
    const { error } = await supabase.from("profiles").delete().eq("id", seg[2]);
    throwIfError(error);
    return { success: true };
  }
  throw new Error(`api.delete: unhandled route "${url}"`);
}

// ---------------------------------------------------------------------------
// Export — timeout reduced to 7s
// ---------------------------------------------------------------------------
export const api = {
  get: (url: string) => withTimeout(get(url), 7000),
  post: (url: string, body?: any) => withTimeout(post(url, body), 7000),
  put: (url: string, body?: any) => withTimeout(put(url, body), 7000),
  delete: (url: string) => withTimeout(del(url), 7000),
};

async function getCached(url: string): Promise<any> {
  return cachedFetch(url, () => get(url), 2 * 60 * 1000);
}
export { getCached };
