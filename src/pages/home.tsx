import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Search, Zap, Home as HomeIcon, Briefcase, Truck, UtensilsCrossed,
  GraduationCap, ShoppingBag, Heart, Monitor, Star, MapPin,
  CheckCircle, ArrowRight, Users, Shield,
  Sparkles, Clock, Package, BookOpen, MessageCircle,
  X, Send, MessageSquare, TrendingUp, Tag, ChevronRight
} from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { ServiceCard } from "@/components/ServiceCard";
import { formatMK } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// ─── STATIC DATA ────────────────────────────────────────────────────────────

const CATS = [
  { name: "Home Services", icon: HomeIcon, href: "/services?category=Home+%26+Property+Services", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  { name: "Find Work", icon: Briefcase, href: "/jobs", color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { name: "Transport", icon: Truck, href: "/services?category=Transport+%26+Delivery", color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" },
  { name: "Food & Needs", icon: UtensilsCrossed, href: "/services?category=Food+%26+Daily+Needs", color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
  { name: "Education", icon: GraduationCap, href: "/education", color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
  { name: "Marketplace", icon: ShoppingBag, href: "/marketplace", color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" },
  { name: "Health", icon: Heart, href: "/services?category=Health+%26+Personal+Support", color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  { name: "Digital", icon: Monitor, href: "/services?category=Digital+%26+Online+Services", color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" },
  { name: "Emergency", icon: Zap, href: "/emergency", color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" },
];

const CITIES = ["All Malawi", "Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Kasungu", "Mangochi", "Dedza"];
const TAGS = ["Plumber", "Electrician", "Tutor", "House Cleaner", "Driver", "Catering", "Painter", "Carpenter"];

// ─── HELPERS ────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── TESTIMONIALS MODAL ──────────────────────────────────────────────────────

function TestimonialsModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
    // Real-time subscription
    const channel = supabase
      .channel("public_testimonials_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "public_testimonials" }, (payload) => {
        setComments(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchComments() {
    setLoading(true);
    const { data } = await supabase
      .from("public_testimonials")
      .select("*")
      .order("created_at", { ascending: false });
    setComments(data ?? []);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data: profile } = await supabase.from("profiles").select("name, profile_photo").eq("id", session.user.id).single();
      const { error } = await supabase.from("public_testimonials").insert({
        user_id: session.user.id,
        user_name: profile?.name ?? session.user.email?.split("@")[0] ?? "User",
        avatar_url: profile?.profile_photo ?? null,
        comment: comment.trim(),
        rating,
      });
      if (error) throw new Error(error.message);
      setComment("");
      setRating(5);
      toast({ title: "Thank you!", description: "Your review was posted." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-card-border">
          <div>
            <h2 className="font-black text-lg">💬 What People Are Saying</h2>
            <p className="text-xs text-muted-foreground">Real reviews from real Malawians</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-muted rounded-xl p-4 animate-pulse h-20" />
            ))
          ) : comments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No reviews yet — be the first to share your experience!
            </div>
          ) : comments.map(c => (
            <div key={c.id} className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0 overflow-hidden">
                  {c.avatar_url
                    ? <img src={c.avatar_url} alt={c.user_name} className="w-full h-full object-cover" />
                    : c.user_name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm truncate">{c.user_name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(c.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mt-0.5 mb-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={11} className={s <= c.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.comment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input or login prompt */}
        <div className="p-4 border-t border-card-border">
          {user ? (
            <div className="space-y-3">
              {/* Star picker */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Your rating:</span>
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                    <Star size={18} className={s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"} />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your experience with BlinkBuyMW..."
                className="w-full bg-muted rounded-xl p-3 text-sm resize-none h-20 outline-none placeholder:text-muted-foreground text-foreground"
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !comment.trim()}
                className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
              >
                <Send size={14} />
                {submitting ? "Posting..." : "Post Review"}
              </button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground mb-3">Want to share your experience?</p>
              <Link href="/login" onClick={onClose} className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2 text-sm font-bold hover:opacity-90 transition-all">
                Login to leave a review
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BOOST MODAL ─────────────────────────────────────────────────────────────

function BoostModal({ onClose }: { onClose: () => void }) {
  const plans = [
    {
      icon: "⭐",
      title: "Featured Listing",
      price: "MK 5,000/month",
      desc: "Top search placement · 5× more views · Highlighted card border",
      highlight: false,
    },
    {
      icon: "✅",
      title: "Verified Badge",
      price: "MK 10,000/month",
      desc: "Blue verified tick · Customer trust · Priority ranking across all sections",
      highlight: true,
    },
    {
      icon: "📌",
      title: "Stay at Top",
      price: "MK 3,000/month",
      desc: "Your listing pinned above others · Maximum daily exposure",
      highlight: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Amber gradient header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-400 p-5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-amber-300/30" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-amber-600/20" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-900 hover:bg-amber-600/30 transition-colors">
            <X size={15} />
          </button>
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-amber-600/20 rounded-full px-3 py-1 text-xs font-bold text-amber-900 mb-2">
              <Sparkles size={11} /> Boost Your Visibility
            </div>
            <h2 className="font-black text-xl text-amber-950">Get Seen. Get Hired.</h2>
            <p className="text-amber-800 text-sm">Stand out from the crowd on BlinkBuyMW</p>
          </div>
        </div>

        {/* Plans */}
        <div className="p-5 space-y-3">
          {plans.map(plan => (
            <div key={plan.title} className={`rounded-xl border p-4 flex items-start gap-3 ${plan.highlight ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-card-border bg-card"}`}>
              <span className="text-2xl shrink-0">{plan.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-black text-sm">{plan.title}</span>
                  <span className={`text-xs font-black ${plan.highlight ? "text-amber-600" : "text-primary"}`}>{plan.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">{plan.desc}</p>
              </div>
            </div>
          ))}

          {/* Payment info */}
          <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground">
            <p className="font-bold text-foreground mb-1">How to pay</p>
            <p>Pay via <strong>Airtel Money</strong> or <strong>TNM Mpamba</strong> to <strong>0999626944</strong></p>
            <p className="mt-1 text-xs">Send payment screenshot on WhatsApp and we'll activate within 1 hour.</p>
          </div>

          {/* WhatsApp CTA */}
          <a
            href="https://wa.me/265999626944?text=Hi%20BlinkBuyMW%2C%20I%20want%20to%20boost%20my%20visibility"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Chat on WhatsApp to Boost
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── ACTIVITY FEED ───────────────────────────────────────────────────────────

function ActivityFeed({ jobs, services, marketItems }: { jobs: any[]; services: any[]; marketItems: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const feedItems = [
    ...jobs.map(j => ({ id: `job-${j.id}`, icon: "💼", title: j.title, tag: "Job", time: j.created_at, href: `/jobs/${j.id}` })),
    ...services.map(s => ({ id: `svc-${s.id}`, icon: "🔧", title: s.title, tag: "Service", time: s.created_at, href: `/services/${s.id}` })),
    ...marketItems.map(m => ({ id: `mkt-${m.id}`, icon: "🛍️", title: m.title, tag: "Market", time: m.created_at, href: `/marketplace/${m.id}` })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 12);

  if (feedItems.length === 0) return null;

  // Duplicate for seamless loop
  const doubled = [...feedItems, ...feedItems];

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-black">⚡ Just Added on BlinkBuyMW</h2>
          <p className="text-xs text-muted-foreground">Live activity across the platform</p>
        </div>
      </div>
      <div
        className="overflow-hidden relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          ref={scrollRef}
          className="flex gap-3"
          style={{
            animation: paused ? "none" : "scrollFeed 30s linear infinite",
            width: "max-content",
          }}
        >
          {doubled.map((item, idx) => (
            <Link
              key={`${item.id}-${idx}`}
              href={item.href}
              className="flex items-center gap-2 bg-card border border-card-border rounded-full px-4 py-2.5 text-sm whitespace-nowrap hover:border-primary hover:shadow-md transition-all shrink-0"
            >
              <span>{item.icon}</span>
              <span className="font-medium text-foreground max-w-[140px] truncate">{item.title}</span>
              <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">{item.tag}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(item.time)}</span>
            </Link>
          ))}
        </div>
        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
      <style>{`
        @keyframes scrollFeed {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

// ─── MAIN HOME COMPONENT ─────────────────────────────────────────────────────

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All Malawi");

  // Data states
  const [services, setServices] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [marketItems, setMarketItems] = useState<any[]>([]);
  const [eduResources, setEduResources] = useState<any[]>([]);

  // Loading states
  const [servicesLoading, setServicesLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [eduLoading, setEduLoading] = useState(true);

  // Modals
  const [showTestimonials, setShowTestimonials] = useState(false);
  const [showBoost, setShowBoost] = useState(false);

  // Search suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch services
    api.get("/services?limit=8&sortBy=created_at")
      .then(d => setServices(d.services ?? []))
      .catch(e => toast({ title: "Failed to load services", description: e.message, variant: "destructive" }))
      .finally(() => setServicesLoading(false));

    // Fetch jobs
    api.get("/jobs?limit=6&sortBy=created_at")
      .then(d => setJobs(d.jobs ?? []))
      .catch(() => {})
      .finally(() => setJobsLoading(false));

    // Fetch marketplace items
    supabase.from("marketplace_items").select("*").order("created_at", { ascending: false }).limit(6)
      .then(({ data }) => setMarketItems(data ?? []))
      .catch(() => {})
      .finally(() => setMarketLoading(false));

    // Fetch education resources
    supabase.from("otechy_resources").select("*").order("created_at", { ascending: false }).limit(4)
      .then(({ data }) => setEduResources(data ?? []))
      .catch(() => {})
      .finally(() => setEduLoading(false));
  }, []);

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.get(`/services?search=${encodeURIComponent(q)}&limit=5`);
        setSuggestions(data.services || []);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 300);
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    fetchSuggestions(e.target.value);
  };

  const handleSuggestionClick = (title: string) => {
    setShowSuggestions(false);
    setQuery(title);
    setLocation(`/services?search=${encodeURIComponent(title)}`);
  };

  const doSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (query) p.set("search", query);
    if (city !== "All Malawi") p.set("location", city);
    setLocation(`/services?${p.toString()}`);
  };

  return (
    <div className="w-full">
      {/* ─── HERO ─── */}
      <section className="relative bg-[hsl(215,55%,12%)] text-white overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[hsl(210,100%,50%)] opacity-10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-[hsl(210,100%,40%)] opacity-10 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-xs text-white/80 mb-5 border border-white/10">
            <Sparkles size={12} className="text-yellow-400" />
            Malawi's #1 Local Services Marketplace
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-5 leading-[1.1] tracking-tight">
            Find Any Service.<br />
            <span className="text-[hsl(210,100%,72%)]">Anywhere in Malawi.</span>
          </h1>
          <p className="text-white/65 text-base md:text-lg mb-9 max-w-xl mx-auto leading-relaxed">
            Connect with trusted local workers or list your skills and earn daily. 100% free to join.
          </p>

          <form onSubmit={doSearch} className="bg-white rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl max-w-2xl mx-auto">
            <div className="flex-1 flex items-center gap-2 px-3 relative">
              <Search size={15} className="text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={handleQueryChange}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => e.key === "Escape" && setShowSuggestions(false)}
                placeholder="Search plumber, tutor, electrician..."
                className="flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none bg-transparent"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => handleSuggestionClick(s.title)}
                      className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2 border-b border-border last:border-0"
                    >
                      <Search size={12} className="text-muted-foreground shrink-0" />
                      <span className="truncate">{s.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <select value={city} onChange={e => setCity(e.target.value)}
                className="text-sm text-foreground bg-background px-3 outline-none border-l border-border sm:w-32">
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <button type="submit"
                className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all whitespace-nowrap">
                Search
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {TAGS.map(tag => (
              <button key={tag} onClick={() => setLocation(`/services?search=${tag}`)}
                className="text-xs text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full px-3 py-1 transition-all border border-white/10">
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EMERGENCY STRIP ─── */}
      <section className="bg-gradient-to-r from-red-700 to-red-600 py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-white text-center sm:text-left">
            <p className="font-black text-base flex items-center gap-2 justify-center sm:justify-start"><Zap size={16} />Need Help Right Now?</p>
            <p className="text-sm text-red-100">Available 24/7 · Get a worker in minutes</p>
          </div>
          <Link href="/emergency"
            className="flex items-center gap-2 bg-white text-red-700 font-black px-6 py-2.5 rounded-xl shadow-lg hover:bg-red-50 transition-all text-sm uppercase tracking-wide">
            <Zap size={14} /> Emergency Help
          </Link>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">

        {/* ─── STATS ─── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
          {[
            { v: "2,000+", l: "Registered Workers", i: Users, c: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
            { v: "15,000+", l: "Services Completed", i: CheckCircle, c: "text-green-600 bg-green-50 dark:bg-green-900/20" },
            { v: "28", l: "Cities Covered", i: MapPin, c: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
            { v: "4.8/5", l: "Average Rating", i: Star, c: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
          ].map(s => (
            <div key={s.l} className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.c} flex items-center justify-center shrink-0`}>
                <s.i size={18} />
              </div>
              <div>
                <div className="text-xl font-black text-foreground">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            </div>
          ))}
        </section>

        {/* ─── CATEGORIES ─── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">Browse by Category</h2>
            <Link href="/services" className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all font-medium">See all <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {CATS.map(cat => (
              <Link key={cat.name} href={cat.href}
                className="group flex flex-col items-center gap-2 p-3 bg-card border border-card-border rounded-xl hover:border-primary hover:shadow-md transition-all cursor-pointer">
                <div className={`w-11 h-11 rounded-xl ${cat.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <cat.icon size={18} />
                </div>
                <span className="text-xs font-semibold text-center leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── ACTIVITY FEED ─── */}
        <ActivityFeed jobs={jobs} services={services} marketItems={marketItems} />

        {/* ─── TRENDING SERVICES ─── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black">🔥 Trending Services</h2>
                  <span className="text-[10px] font-black bg-red-500 text-white rounded-full px-2 py-0.5 uppercase tracking-wide animate-pulse">Live</span>
                </div>
                <p className="text-xs text-muted-foreground">Freshest services posted on BlinkBuyMW</p>
              </div>
            </div>
            <Link href="/services" className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all font-medium">View All Services <ArrowRight size={14} /></Link>
          </div>

          {servicesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-card border border-card-border rounded-xl p-4 animate-pulse h-52" />)}
            </div>
          ) : services.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {services.map(s => <ServiceCard key={s.id} service={s} />)}
            </div>
          ) : (
            <div className="bg-card border border-card-border rounded-xl p-10 text-center">
              <p className="text-muted-foreground text-sm mb-3">No services yet — be the first!</p>
              <Link href="/register" className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all">Register as a Worker</Link>
            </div>
          )}
        </section>

        {/* ─── TRENDING JOBS ─── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black">💼 Trending Jobs</h2>
              <p className="text-xs text-muted-foreground">Latest job opportunities in Malawi</p>
            </div>
            <Link href="/jobs" className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all font-medium">View All Jobs <ArrowRight size={14} /></Link>
          </div>

          {jobsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <div key={i} className="bg-card border border-card-border rounded-xl p-4 animate-pulse h-36" />)}
            </div>
          ) : jobs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map(job => (
                <Link key={job.id} href={`/jobs/${job.id}`}
                  className="bg-card border border-card-border rounded-xl p-4 hover:border-primary hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">{job.title}</h3>
                    {job.job_type && (
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap">
                        {job.job_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    {job.location && (
                      <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(job.created_at)}</span>
                  </div>
                  {job.budget && (
                    <div className="text-sm font-black text-green-600">{formatMK(job.budget)}</div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-card-border rounded-xl p-10 text-center">
              <p className="text-muted-foreground text-sm mb-3">No jobs posted yet.</p>
              <Link href="/post-job" className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all">Post a Job</Link>
            </div>
          )}
        </section>

        {/* ─── HOT IN MARKETPLACE ─── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black">🛍️ Hot in Marketplace</h2>
              <p className="text-xs text-muted-foreground">Latest goods for sale near you</p>
            </div>
            <Link href="/marketplace" className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all font-medium">Browse Marketplace <ArrowRight size={14} /></Link>
          </div>

          {marketLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="bg-card border border-card-border rounded-xl animate-pulse h-40" />)}
            </div>
          ) : marketItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {marketItems.map(item => (
                <Link key={item.id} href={`/marketplace/${item.id}`}
                  className="bg-card border border-card-border rounded-xl overflow-hidden hover:border-primary hover:shadow-md transition-all group">
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      : <Package size={28} className="text-muted-foreground" />}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold truncate">{item.title}</p>
                    <p className="text-xs font-black text-green-600 mt-0.5">{formatMK(item.price)}</p>
                    {item.location && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5 truncate"><MapPin size={9} />{item.location}</p>}
                    {item.category && (
                      <span className="text-[10px] bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300 rounded-full px-1.5 py-0.5 mt-1 inline-block font-medium">
                        {item.category}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-card-border rounded-xl p-10 text-center">
              <p className="text-muted-foreground text-sm mb-3">No marketplace items yet.</p>
              <Link href="/marketplace" className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all">Browse Marketplace</Link>
            </div>
          )}
        </section>

        {/* ─── LATEST IN EDUCATION ─── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black">📚 Latest in Education</h2>
              <p className="text-xs text-muted-foreground">Study materials, books & scholarships</p>
            </div>
            <Link href="/education" className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all font-medium">Explore Education <ArrowRight size={14} /></Link>
          </div>

          {eduLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-card border border-card-border rounded-xl p-4 animate-pulse h-32" />)}
            </div>
          ) : eduResources.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {eduResources.map(r => (
                <Link key={r.id} href="/education"
                  className="bg-card border border-card-border rounded-xl p-4 hover:border-primary hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center mb-3">
                    <BookOpen size={18} />
                  </div>
                  <h3 className="text-sm font-bold leading-tight mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">{r.title}</h3>
                  <div className="flex items-center justify-between gap-2">
                    {r.type && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full px-2 py-0.5 font-medium">{r.type}</span>
                    )}
                    <span className="text-xs font-black text-green-600">
                      {r.price ? formatMK(r.price) : "Free"}
                    </span>
                  </div>
                  {(r.subject ?? r.category) && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Tag size={9} />{r.subject ?? r.category}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-card-border rounded-xl p-10 text-center">
              <p className="text-muted-foreground text-sm mb-3">No resources yet.</p>
              <Link href="/education" className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all">Explore Education</Link>
            </div>
          )}
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="mb-10 bg-gradient-to-br from-[hsl(215,55%,12%)] to-[hsl(215,45%,20%)] rounded-2xl p-6 md:p-8 text-white">
          <h2 className="text-xl font-black text-center mb-2">How BlinkBuy Works</h2>
          <p className="text-white/60 text-sm text-center mb-8">Three simple steps to get things done</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-0.5 bg-white/10" />
            {[
              { step: "01", title: "Search or Post", desc: "Search for services or post a job with your requirements and budget.", icon: Search },
              { step: "02", title: "Connect & Chat", desc: "Get matched with verified workers. Chat, WhatsApp, or call directly.", icon: Users },
              { step: "03", title: "Done & Rated", desc: "Job completed. Leave a review and build a trusted reputation.", icon: CheckCircle },
            ].map(item => (
              <div key={item.step} className="text-center relative">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon size={24} className="text-white" />
                </div>
                <div className="text-xs font-black text-white/30 tracking-widest mb-1">{item.step}</div>
                <h3 className="font-black text-white mb-1">{item.title}</h3>
                <p className="text-sm text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── DUAL CTA ─── */}
        <section className="mb-10">
          <div className="relative overflow-hidden bg-[hsl(215,55%,12%)] rounded-2xl p-6 text-white border border-white/5">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4"><Briefcase size={22} /></div>
              <h3 className="text-lg font-black mb-2">Need Something Done?</h3>
              <p className="text-sm opacity-75 mb-5 leading-relaxed">Post a job free. Get quotes from verified local workers — same day or emergency response.</p>
              <Link href="/post-job" className="inline-flex items-center gap-2 bg-[hsl(210,100%,56%)] text-white rounded-xl px-5 py-2.5 text-sm font-black hover:opacity-90 transition-all">
                Post a Job <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── 3 ACTION BUTTONS ─── */}
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Button 1: Testimonials */}
            <button
              onClick={() => setShowTestimonials(true)}
              className="group bg-card border border-card-border rounded-2xl p-5 text-left hover:border-primary hover:shadow-lg transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <MessageSquare size={20} />
              </div>
              <h3 className="font-black text-sm mb-1">💬 What Are People Saying?</h3>
              <p className="text-xs text-muted-foreground">Read real reviews from Malawians using BlinkBuyMW every day.</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium">
                Read reviews <ChevronRight size={13} />
              </div>
            </button>

            {/* Button 2: Boost */}
            <button
              onClick={() => setShowBoost(true)}
              className="group bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-5 text-left hover:shadow-lg hover:border-amber-400 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-400/30 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <TrendingUp size={20} />
              </div>
              <h3 className="font-black text-sm mb-1 text-amber-900 dark:text-amber-100">🚀 Boost Your Visibility</h3>
              <p className="text-xs text-amber-700 dark:text-amber-300">Get featured, earn a verified badge, and stay at the top.</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-amber-700 dark:text-amber-400 font-medium">
                See boost plans <ChevronRight size={13} />
              </div>
            </button>

            {/* Button 3: WhatsApp */}
            <a
              href="https://wa.me/265999626944"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-700/40 rounded-2xl p-5 hover:shadow-lg hover:border-green-400 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-green-500 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <h3 className="font-black text-sm mb-1 text-green-800 dark:text-green-200">Chat With Us</h3>
              <p className="text-xs text-green-700 dark:text-green-400">Questions? Issues? We reply fast on WhatsApp.</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-green-700 dark:text-green-400 font-medium">
                Open WhatsApp <ChevronRight size={13} />
              </div>
            </a>
          </div>
        </section>

      </div>

      {/* ─── MODALS ─── */}
      {showTestimonials && <TestimonialsModal onClose={() => setShowTestimonials(false)} />}
      {showBoost && <BoostModal onClose={() => setShowBoost(false)} />}
    </div>
  );
}
