import { cachedFetch } from "./cache";

// ---------------------------------------------------------------------------
// Request timeout wrapper — prevents infinite hanging
// ---------------------------------------------------------------------------
function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Normalizers — map profiles(*) → named field expected by pages
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
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
    limit: p.get("limit") ? Number(p.get("limit")) : null,
    sortBy: p.get("sortBy"),
    category: p.get("category"),
    location: p.get("location"),
    search: p.get("search"),
    workerId: p.get("workerId"),
  };
}

function applyFilters(query: any, params: ReturnType<typeof parseParams>) {
  if (params.category) query = query.eq("category", params.category);
  if (params.location) query = query.ilike("location", `%${params.location}%`);
  if (params.search) query = query.ilike("title", `%${params.search}%`);
  if (params.workerId) query = query.eq("worker_id", params.workerId);
  if (params.sortBy === "rating") query = query.order("rating", { ascending: false });
  if (params.limit) query = query.limit(params.limit);
  return query;
}

function splitPath(url: string): { pathname: string; params: ReturnType<typeof parseParams> } {
  const [pathname, qs = ""] = url.split("?");
  return { pathname: pathname.replace(/\/$/, ""), params: parseParams(qs) };
}

function throwIfError(error: any) {
  if (error) throw new Error(error.message ?? JSON.stringify(error));
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

async function get(url: string): Promise<any> {
  const { pathname, params } = splitPath(url);
  const seg = pathname.split("/").filter(Boolean);

  // --- /services ---
  if (seg[0] === "services" && seg.length === 1) {
    let q = supabase.from("services").select("*, profiles(*)");
    q = applyFilters(q, params);
    q = q.order("is_boosted", { ascending: false }).order("created_at", { ascending: false });
    const { data, error } = await q;
    throwIfError(error);
    return { services: (data ?? []).map(normalizeService) };
  }

  // --- /services/:id/reviews ---
  if (seg[0] === "services" && seg[2] === "reviews") {
    let q = supabase.from("reviews").select("*, profiles(*)").eq("service_id", seg[1]);
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return (data ?? []).map(normalizeReview);
  }

  // --- /services/:id ---
  if (seg[0] === "services" && seg.length === 2) {
    const { data, error } = await supabase
      .from("services")
      .select("*, profiles(*), reviews(*)")
      .eq("id", seg[1])
      .single();
    throwIfError(error);
    return normalizeService(data);
  }

  // --- /jobs ---
  if (seg[0] === "jobs" && seg.length === 1) {
    let q = supabase.from("jobs").select("*, profiles(*)");
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return { jobs: (data ?? []).map(normalizeJob) };
  }

  // --- /jobs/:id ---
  if (seg[0] === "jobs" && seg.length === 2) {
    const { data, error } = await supabase
      .from("jobs")
      .select("*, profiles(*), applications(*)")
      .eq("id", seg[1])
      .single();
    throwIfError(error);
    return normalizeJob(data);
  }

  // --- /marketplace ---
  if (seg[0] === "marketplace" && seg.length === 1) {
    let q = supabase.from("marketplace_items").select("*, profiles(*)");
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return { items: (data ?? []).map(normalizeItem) };
  }

  // --- /marketplace/:id ---
  if (seg[0] === "marketplace" && seg.length === 2) {
    const { data, error } = await supabase
      .from("marketplace_items")
      .select("*, profiles(*)")
      .eq("id", seg[1])
      .single();
    throwIfError(error);
    return normalizeItem(data);
  }

  // --- /users/me/stats ---
  if (seg[0] === "users" && seg[1] === "me" && seg[2] === "stats") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("profiles")
      .select("rating, jobs_completed")
      .eq("id", user.id)
      .single();
    throwIfError(error);
    return data;
  }

  // --- /users/:id/reviews ---
  if (seg[0] === "users" && seg[2] === "reviews") {
    let q = supabase.from("reviews").select("*, profiles(*)").eq("worker_id", seg[1]);
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return data ?? [];
  }

  // --- /users ---
  if (seg[0] === "users" && seg.length === 1) {
    let q = supabase.from("profiles").select("*");
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return { users: data ?? [] };
  }

  // --- /users/:id ---
  if (seg[0] === "users" && seg.length === 2) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", seg[1])
      .single();
    throwIfError(error);
    return data;
  }

  // --- /conversations/:id/messages ---
  if (seg[0] === "conversations" && seg[2] === "messages") {
    let q = supabase.from("messages").select("*").eq("conversation_id", seg[1]);
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return data ?? [];
  }

  // --- /conversations ---
  if (seg[0] === "conversations" && seg.length === 1) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("conversations")
      .select("*, user1:profiles!conversations_user1_id_fkey(*), user2:profiles!conversations_user2_id_fkey(*), messages(*)")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });
    throwIfError(error);
    return data ?? [];
  }

  // --- /notifications ---
  if (seg[0] === "notifications" && seg.length === 1) {
    let q = supabase.from("notifications").select("*");
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return data ?? [];
  }

  // --- /emergency/workers ---
  if (seg[0] === "emergency" && seg[1] === "workers") {
    let q = supabase.from("emergency_services").select("*").eq("available", true);
    q = applyFilters(q, params);
    const { data, error } = await q;
    throwIfError(error);
    return { workers: data ?? [] };
  }

  // --- /admin/stats ---
  if (seg[0] === "admin" && seg[1] === "stats") {
    const [profiles, services, jobs] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("services").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }),
    ]);
    return {
      totalUsers: profiles.count ?? 0,
      totalServices: services.count ?? 0,
      totalJobs: jobs.count ?? 0,
    };
  }

  // --- /admin/users ---
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
// POST
// ---------------------------------------------------------------------------

async function post(url: string, body: Record<string, any> = {}): Promise<any> {
  const { pathname } = splitPath(url);
  const seg = pathname.split("/").filter(Boolean);

  // --- /services ---
  if (seg[0] === "services" && seg.length === 1) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("services")
      .insert({ ...body, worker_id: user.id })
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  // --- /services/:id/book ---
  if (seg[0] === "services" && seg[2] === "book") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("bookings")
      .insert({ service_id: seg[1], customer_id: user.id, ...body })
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  // --- /jobs ---
  if (seg[0] === "jobs" && seg.length === 1) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("jobs")
      .insert({ ...body, poster_id: user.id })
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  // --- /jobs/:id/apply ---
  if (seg[0] === "jobs" && seg[2] === "apply") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("applications")
      .insert({ job_id: seg[1], applicant_id: user.id, ...body })
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  // --- /marketplace ---
  if (seg[0] === "marketplace" && seg.length === 1) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("marketplace_items")
      .insert({ ...body, seller_id: user.id })
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  // --- /conversations/:id/messages ---
  if (seg[0] === "conversations" && seg[2] === "messages") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: seg[1], sender_id: user.id, ...body })
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  // --- /emergency/alert ---
  if (seg[0] === "emergency" && seg[1] === "alert") {
    const { data, error } = await supabase.from("emergency_requests").insert(body).select().single();
    throwIfError(error);
    return data;
  }

  // --- /notifications/mark-all-read ---
  if (seg[0] === "notifications" && seg[1] === "mark-all-read") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .select();
    throwIfError(error);
    return data;
  }

  throw new Error(`api.post: unhandled route "${url}"`);
}

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

async function put(url: string, body: Record<string, any> = {}): Promise<any> {
  const { pathname } = splitPath(url);
  const seg = pathname.split("/").filter(Boolean);

  // --- /users/:id ---
  if (seg[0] === "users" && seg.length === 2) {
    const ALLOWED = ["name", "bio", "location", "phone", "whatsapp", "role", "profile_photo", "is_online"];
    const remapped: Record<string, any> = {};
    for (const [k, v] of Object.entries(body)) {
      const key = k === "profilePhoto" ? "profile_photo" : k === "isOnline" ? "is_online" : k;
      if (ALLOWED.includes(key)) remapped[key] = v;
    }
    const { data, error } = await supabase
      .from("profiles")
      .update(remapped)
      .eq("id", seg[1])
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  // --- /notifications/:id/read ---
  if (seg[0] === "notifications" && seg[2] === "read") {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", seg[1])
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  // --- /admin/users/:id ---
  if (seg[0] === "admin" && seg[1] === "users" && seg.length === 3) {
    const { data, error } = await supabase
      .from("profiles")
      .update(body)
      .eq("id", seg[2])
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  // --- /admin/services/:id ---
  if (seg[0] === "admin" && seg[1] === "services" && seg.length === 3) {
    const { data, error } = await supabase
      .from("services")
      .update(body)
      .eq("id", seg[2])
      .select()
      .single();
    throwIfError(error);
    return data;
  }

  throw new Error(`api.put: unhandled route "${url}"`);
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

async function del(url: string): Promise<any> {
  const { pathname } = splitPath(url);
  const seg = pathname.split("/").filter(Boolean);

  // --- /admin/users/:id ---
  if (seg[0] === "admin" && seg[1] === "users" && seg.length === 3) {
    const { error } = await supabase.from("profiles").delete().eq("id", seg[2]);
    throwIfError(error);
    return { success: true };
  }

  throw new Error(`api.delete: unhandled route "${url}"`);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const api = {
  get: (url: string) => withTimeout(get(url)),
  post: (url: string, body?: any) => withTimeout(post(url, body)),
  put: (url: string, body?: any) => withTimeout(put(url, body)),
  delete: (url: string) => withTimeout(del(url)),
};

// ---------------------------------------------------------------------------
// Cached GET wrapper — for list endpoints that don't change often
// Cache key = URL, TTL = 2 minutes for lists
// ---------------------------------------------------------------------------
async function getCached(url: string): Promise<any> {
  return cachedFetch(url, () => get(url), 2 * 60 * 1000);
}

export { getCached };
