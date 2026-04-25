import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Search, Zap, Home as HomeIcon, Briefcase, Truck, UtensilsCrossed,
  GraduationCap, ShoppingBag, Heart, Monitor, Star, MapPin,
  CheckCircle, Award, ArrowRight, Users, TrendingUp, Shield,
  ChevronRight, Sparkles, Clock
} from "lucide-react";
import { api } from "@/lib/api";
import { ServiceCard } from "@/components/ServiceCard";
import { formatMK } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const CATS = [
  { name: "Home Services", icon: HomeIcon, href: "/services?category=Home+%26+Property+Services", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  { name: "Find Work", icon: Briefcase, href: "/jobs", color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { name: "Transport", icon: Truck, href: "/services?category=Transport+%26+Delivery", color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" },
  { name: "Food & Needs", icon: UtensilsCrossed, href: "/services?category=Food+%26+Daily+Needs", color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
  { name: "Education", icon: GraduationCap, href: "/services?category=Education+%26+Skills", color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
  { name: "Marketplace", icon: ShoppingBag, href: "/marketplace", color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" },
  { name: "Health", icon: Heart, href: "/services?category=Health+%26+Personal+Support", color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  { name: "Digital", icon: Monitor, href: "/services?category=Digital+%26+Online+Services", color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" },
  { name: "Emergency", icon: Zap, href: "/emergency", color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" },
];

const CITIES = ["All Malawi", "Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Kasungu", "Mangochi", "Dedza"];

const TESTIMONIALS = [
  { name: "Chifundo Phiri", city: "Lilongwe", text: "Found a plumber in 10 minutes. BlinkBuy saved my home when a pipe burst!", rating: 5, avatar: "C" },
  { name: "Thandiwe Banda", city: "Blantyre", text: "As a caterer, I get 5–8 bookings every week. Finally a platform built for Malawi.", rating: 5, avatar: "T" },
  { name: "Joseph Tembo", city: "Mzuzu", text: "Unemployed for 6 months. Posted my carpentry skills — got 3 jobs in a week!", rating: 5, avatar: "J" },
];

const TAGS = ["Plumber", "Electrician", "Tutor", "House Cleaner", "Driver", "Catering", "Painter", "Carpenter"];

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All Malawi");
  const [services, setServices] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sData, wData] = await Promise.all([
          api.get("/services?limit=8&sortBy=rating"),
          api.get("/users?role=worker&limit=6&sortBy=rating"),
        ]);
        setServices(sData.services || []);
        setWorkers(wData.users || []);
      } catch (e: any) {
        console.error(e);
        toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
      } finally { setServicesLoading(false); }
    })();
  }, []);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleInputBlur = () => {
    // Delay so click on suggestion fires first
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setShowSuggestions(false);
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
        {/* gradient blobs */}
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

          {/* Search */}
          <form onSubmit={doSearch} className="bg-white rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl max-w-2xl mx-auto">
            <div className="flex-1 flex items-center gap-2 px-3 relative">
              <Search size={15} className="text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={handleQueryChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                placeholder="Search plumber, tutor, electrician..."
                className="flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none bg-transparent"
                autoComplete="off"
              />
              {/* Suggestions dropdown */}
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
            className="flex items-center gap-2 bg-white text-red-700 font-black px-6 py-2.5 rounded-xl shadow-lg hover:bg-red-50 transition-all text-sm uppercase tracking-wide pulse-emergency">
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

        {/* ─── SERVICES ─── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black">Top Rated Services</h2>
              <p className="text-xs text-muted-foreground">Trusted by thousands of customers</p>
            </div>
            <Link href="/services" className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all font-medium">View all <ArrowRight size={14} /></Link>
          </div>

          {servicesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card border border-card-border rounded-xl p-4 animate-pulse h-52" />
              ))}
            </div>
          ) : services.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {services.map(s => <ServiceCard key={s.id} service={s} />)}
            </div>
          ) : (
            <div className="bg-card border border-card-border rounded-xl p-10 text-center">
              <p className="text-muted-foreground text-sm mb-3">No services listed yet — be the first!</p>
              <Link href="/register" className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all">Register as a Worker</Link>
            </div>
          )}
        </section>

        {/* ─── TOP WORKERS ─── */}
        {workers.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black">Top Workers</h2>
                <p className="text-xs text-muted-foreground">Verified & highly rated professionals</p>
              </div>
              <Link href="/services" className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all font-medium">See all <ArrowRight size={14} /></Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {workers.map(w => (
                <Link key={w.id} href={`/profile/${w.id}`}
                  className="bg-card border border-card-border rounded-xl p-4 text-center hover:border-primary hover:shadow-md transition-all group">
                  <div className="relative w-14 h-14 mx-auto mb-2">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xl font-black text-primary border-2 border-primary/10">
                      {w.profilePhoto
                        ? <img src={w.profilePhoto} alt={w.name} className="w-full h-full object-cover rounded-full" />
                        : w.name?.charAt(0)}
                    </div>
                    {w.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
                  </div>
                  <div className="text-xs font-bold truncate flex items-center justify-center gap-1">
                    {w.name?.split(" ")[0]}
                    {w.isVerified && <CheckCircle size={11} className="text-primary shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{w.location}</div>
                  {w.rating > 0 && (
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold">{w.rating?.toFixed(1)}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── HOW IT WORKS ─── */}
        <section className="mb-10 bg-gradient-to-br from-[hsl(215,55%,12%)] to-[hsl(215,45%,20%)] rounded-2xl p-6 md:p-8 text-white">
          <h2 className="text-xl font-black text-center mb-2">How BlinkBuy Works</h2>
          <p className="text-white/60 text-sm text-center mb-8">Three simple steps to get things done</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* connector lines on desktop */}
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

        {/* ─── TESTIMONIALS ─── */}
        <section className="mb-10">
          <h2 className="text-xl font-black text-center mb-2">What Malawians Say</h2>
          <p className="text-muted-foreground text-sm text-center mb-6">Real stories from real users</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-5 relative">
                <div className="text-4xl text-primary/10 font-black absolute top-3 right-4 leading-none">"</div>
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(s => <Star key={s} size={12} className="fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary">{t.avatar}</div>
                  <div>
                    <div className="text-sm font-bold">{t.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={9} />{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── DUAL CTA ─── */}
        <section className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative overflow-hidden bg-primary rounded-2xl p-6 text-white">
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4"><Shield size={22} /></div>
                <h3 className="text-lg font-black mb-2">Are You a Worker?</h3>
                <p className="text-sm opacity-75 mb-5 leading-relaxed">List your services for free. Get hired by thousands of customers across all 28 districts.</p>
                <Link href="/register" className="inline-flex items-center gap-2 bg-white text-primary rounded-xl px-5 py-2.5 text-sm font-black hover:opacity-90 transition-all">
                  Start Earning <ArrowRight size={14} />
                </Link>
              </div>
            </div>
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
          </div>
        </section>

        {/* ─── FEATURED INFO ─── */}
        <section className="mb-10 border border-amber-200 dark:border-amber-800/60 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-900" />
            <span className="font-black text-amber-900 text-sm">Boost Your Visibility — Get Featured</span>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 p-5">
            <div className="flex flex-wrap gap-6 mb-3">
              {[
                { title: "Featured Listing", price: "MK 5,000 / month", desc: "Top search placement · 5× more views" },
                { title: "Verified Badge ✓", price: "MK 10,000 / month", desc: "Trusted worker badge · Customer confidence" },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3">
                  <CheckCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-black text-amber-900 dark:text-amber-100 text-sm">{item.title} — {item.price}</div>
                    <div className="text-xs text-amber-700 dark:text-amber-300">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-amber-100 dark:bg-amber-900/30 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              Pay via <strong>Airtel Money 0999626944</strong> or <strong>TNM Mpamba 0888712272</strong> · Send proof &amp; we'll activate within 1 hour
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
