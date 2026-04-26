import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { Search, Filter, MapPin, Star, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { api } from "@/lib/api";
import { ServiceCard } from "@/components/ServiceCard";
import { formatMK } from "@/lib/auth";

const CATEGORIES = [
  "All Categories",
  "Home & Property Services",
  "Jobs & Work Skills",
  "Transport & Delivery",
  "Food & Daily Needs",
  "Education & Skills",
  "Marketplace",
  "Health & Personal Support",
  "Digital & Online Services",
  "Emergency & Quick Help",
];

const CITIES = ["All Locations","Balaka","Blantyre","Chikwawa","Chiradzulu","Chitipa","Dedza","Dowa","Karonga","Kasungu","Likoma","Lilongwe","Machinga","Mangochi","Mchinji","Mulanje","Mwanza","Mzimba","Neno","Nkhata Bay","Nkhotakota","Nsanje","Ntcheu","Ntchisi","Phalombe","Rumphi","Salima","Thyolo","Zomba"];

const PRICE_RANGES = [
  { label: "Any Price", min: 0, max: 0 },
  { label: "Under MK 5,000", min: 0, max: 5000 },
  { label: "MK 5,000 – 20,000", min: 5000, max: 20000 },
  { label: "MK 20,000 – 50,000", min: 20000, max: 50000 },
  { label: "MK 50,000+", min: 50000, max: 0 },
];

export default function ServicesPage() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState(params.get("search") || "");
  const [category, setCategory] = useState(params.get("category") || "All Categories");
  const [location, setLocation] = useState(params.get("location") || "All Locations");
  const [priceRange, setPriceRange] = useState(0);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  const fetchServices = async () => {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      if (search) qp.set("search", search);
      if (category !== "All Categories") qp.set("category", category);
      if (location !== "All Locations") qp.set("location", location);
      if (onlineOnly) qp.set("isOnline", "true");
      if (priceRange > 0) {
        const range = PRICE_RANGES[priceRange];
        if (range.min) qp.set("minPrice", String(range.min));
        if (range.max) qp.set("maxPrice", String(range.max));
      }
      qp.set("sortBy", sortBy);
      qp.set("page", String(page));
      qp.set("limit", "12");

      const data = await api.get(`/services?${qp.toString()}`);
      setServices(data.services || []);
      setTotal(data.total || 0);
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
        const qp = new URLSearchParams();
        if (search) qp.set("search", search);
        if (category !== "All Categories") qp.set("category", category);
        if (location !== "All Locations") qp.set("location", location);
        if (onlineOnly) qp.set("isOnline", "true");
        if (priceRange > 0) {
          const range = PRICE_RANGES[priceRange];
          if (range.min) qp.set("minPrice", String(range.min));
          if (range.max) qp.set("maxPrice", String(range.max));
        }
        qp.set("sortBy", sortBy);
        qp.set("page", String(page));
        qp.set("limit", "12");
        const data = await api.get(`/services?${qp.toString()}`);
        if (mounted) { setServices(data.services || []); setTotal(data.total || 0); }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [search, category, location, priceRange, onlineOnly, sortBy, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchServices();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground mb-1">Browse Services</h1>
        <p className="text-muted-foreground text-sm">Find skilled workers across Malawi</p>
      </div>

      {/* Search + filters */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="flex-1 flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-2">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search services..."
              className="flex-1 text-sm outline-none bg-transparent"
            />
            {search && <button type="button" onClick={() => setSearch("")}><X size={14} className="text-muted-foreground" /></button>}
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none sm:w-48"
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none sm:w-36"
          >
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-all"
          >
            <SlidersHorizontal size={13} /> Filters
          </button>

          {showFilters && (
            <>
              <select
                value={priceRange}
                onChange={e => setPriceRange(Number(e.target.value))}
                className="text-xs px-3 py-1.5 rounded-lg border border-input bg-background outline-none"
              >
                {PRICE_RANGES.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
              </select>

              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlineOnly}
                  onChange={e => setOnlineOnly(e.target.checked)}
                  className="rounded"
                />
                Online Now Only
              </label>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{total} results</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-input bg-background outline-none"
            >
              <option value="newest">Newest</option>
              <option value="rating">Top Rated</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-4 animate-pulse">
              <div className="h-10 bg-muted rounded-lg mb-3" />
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-3/4 mb-4" />
              <div className="h-8 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16">
          <Search size={48} className="text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-lg font-bold mb-1">No services found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {services.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>

          {total > 12 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-all disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / 12)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / 12)}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-all disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
