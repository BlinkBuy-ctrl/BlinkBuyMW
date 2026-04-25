import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingBag, MapPin, Tag, ChevronRight, MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatMK } from "@/lib/auth";

const CATEGORIES = ["All Categories", "Electronics", "Clothing", "Food", "Furniture", "Tools", "Vehicles", "Farm Produce", "Other"];
const CITIES = ["All Locations", "Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Kasungu", "Mangochi", "Dedza"];

export default function MarketplacePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [loc, setLoc] = useState("All Locations");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      if (search) qp.set("search", search);
      if (category !== "All Categories") qp.set("category", category);
      if (loc !== "All Locations") qp.set("location", loc);
      qp.set("page", String(page));
      qp.set("limit", "12");

      const data = await api.get(`/marketplace?${qp.toString()}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [search, category, loc, page]);

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

      {/* Search */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-2">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="flex-1 text-sm outline-none bg-transparent"
            />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none sm:w-40">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={loc} onChange={e => setLoc(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none sm:w-36">
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
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
                    {item.isFeatured && (
                      <span className="inline-block bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full mt-1">Featured</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {total > 12 && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-40">Previous</button>
              <span className="px-4 py-2 text-sm text-muted-foreground">Page {page} of {Math.ceil(total / 12)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 12)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
