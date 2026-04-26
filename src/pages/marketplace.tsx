import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, ShoppingBag, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatMK } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const CATEGORIES = ["All Categories", "Electronics", "Clothing", "Food", "Furniture", "Tools", "Vehicles", "Farm Produce", "Books", "Phones", "Other"];
const CITIES = ["Balaka","Blantyre","Chikwawa","Chiradzulu","Chitipa","Dedza","Dowa","Karonga","Kasungu","Likoma","Lilongwe","Machinga","Mangochi","Mchinji","Mulanje","Mwanza","Mzimba","Neno","Nkhata Bay","Nkhotakota","Nsanje","Ntcheu","Ntchisi","Phalombe","Rumphi","Salima","Thyolo","Zomba"];

export default function MarketplacePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [loc, setLoc] = useState("");
  const [locSearch, setLocSearch] = useState("");
  const [showLocDropdown, setShowLocDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 12;

  const filteredCities = CITIES.filter(c =>
    c.toLowerCase().includes(locSearch.toLowerCase())
  );

  const fetchItems = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("marketplace_items")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (search) query = query.ilike("title", `%${search}%`);
      if (category !== "All Categories") query = query.eq("category", category);
      if (loc) query = query.eq("location", loc);

      const { data, count, error } = await query;
      if (error) throw error;
      setItems(data || []);
      setTotal(count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("marketplace_items")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
        if (search) query = query.ilike("title", `%${search}%`);
        if (category !== "All Categories") query = query.eq("category", category);
        if (loc) query = query.eq("location", loc);
        const { data, count, error } = await query;
        if (error) throw error;
        if (mounted) { setItems(data || []); setTotal(count || 0); }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [search, category, loc, page]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground mb-1">Marketplace</h1>
          <p className="text-muted-foreground text-sm">Buy and sell goods across Malawi</p>
        </div>
        {user && (
          <Link href="/post-item" className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
            + Sell Something
          </Link>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-2">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              type="text" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search items..."
              className="flex-1 text-sm outline-none bg-transparent"
            />
          </div>

          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none sm:w-44">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>

          {/* Searchable district dropdown */}
          <div className="relative sm:w-44">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-background text-sm cursor-pointer"
              onClick={() => setShowLocDropdown(!showLocDropdown)}
            >
              <MapPin size={13} className="text-muted-foreground shrink-0" />
              <span className={loc ? "text-foreground" : "text-muted-foreground"}>
                {loc || "All Districts"}
              </span>
            </div>
            {showLocDropdown && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-2 border-b border-border">
                  <input
                    type="text" value={locSearch}
                    onChange={e => setLocSearch(e.target.value)}
                    placeholder="Search district..."
                    className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-xs outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <button
                    onClick={() => { setLoc(""); setLocSearch(""); setShowLocDropdown(false); setPage(1); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-all text-muted-foreground"
                  >
                    All Districts
                  </button>
                  {filteredCities.map(c => (
                    <button key={c}
                      onClick={() => { setLoc(c); setLocSearch(""); setShowLocDropdown(false); setPage(1); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-all ${loc === c ? "text-primary font-semibold" : "text-foreground"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {loc && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtering by:</span>
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              {loc}
              <button onClick={() => setLoc("")} className="hover:text-destructive ml-1">×</button>
            </span>
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag size={48} className="text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-lg font-bold mb-1">No items found</h3>
          <p className="text-muted-foreground text-sm">Be the first to sell something!</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">{total} item{total !== 1 ? "s" : ""} found</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {items.map(item => (
              <Link key={item.id} href={`/marketplace/${item.id}`}>
                <div className="bg-card border border-card-border rounded-xl overflow-hidden card-hover cursor-pointer">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag size={32} className="text-muted-foreground opacity-30" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-xs font-bold line-clamp-2 mb-1">{item.title}</h3>
                    <div className="text-sm font-black text-primary">{formatMK(item.price)}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin size={9} />{item.location}
                    </div>
                    {item.is_featured && (
                      <span className="inline-block bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full mt-1">⭐ Featured</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {total > PAGE_SIZE && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-40">Previous</button>
              <span className="px-4 py-2 text-sm text-muted-foreground">Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}

      {/* Click away for district dropdown */}
      {showLocDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowLocDropdown(false)} />}
    </div>
  );
}
