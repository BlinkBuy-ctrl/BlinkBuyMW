import { useState } from "react";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const CATEGORIES = [
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

const CITIES = ["Balaka","Blantyre","Chikwawa","Chiradzulu","Chitipa","Dedza","Dowa","Karonga","Kasungu","Likoma","Lilongwe","Machinga","Mangochi","Mchinji","Mulanje","Mwanza","Mzimba","Neno","Nkhata Bay","Nkhotakota","Nsanje","Ntcheu","Ntchisi","Phalombe","Rumphi","Salima","Thyolo","Zomba"];
const PRICE_TYPES = ["fixed", "hourly", "daily", "negotiable"];

export default function PostServicePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0],
    location: "Lilongwe",
    priceType: "fixed",
    price: "",
    priceDisplay: "",
    tags: "",
    isOnline: true,
  });

  const set = (key: string, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setLocation("/login"); return; }
    setLoading(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        location: form.location,
        price_type: form.priceType,
        price: form.price ? Number(form.price) : undefined,
        price_display: form.priceDisplay,
        is_online: form.isOnline,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      };
      await api.post("/services", payload);
      setLocation("/dashboard");
    } catch (e: any) {
      setError(e.message || "Failed to post service");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) { setLocation("/login"); return null; }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-black mb-2">Post a Service</h1>
      <p className="text-muted-foreground text-sm mb-6">List your skills and start getting booked</p>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold">Service Details</h2>

          <div>
            <label className="text-xs font-medium mb-1 block">Service Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              required
              placeholder="e.g. Professional Plumbing Services"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Category *</label>
            <select
              value={form.category}
              onChange={e => set("category", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Description *</label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              required
              rows={4}
              placeholder="Describe what you offer, your experience, and what customers can expect..."
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Tags (comma-separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => set("tags", e.target.value)}
              placeholder="e.g. plumbing, repairs, maintenance"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold">Pricing & Location</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Price Type</label>
              <select
                value={form.priceType}
                onChange={e => set("priceType", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {PRICE_TYPES.map(p => <option key={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Price (MK)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => set("price", e.target.value)}
                placeholder={form.priceType === "negotiable" ? "Leave empty" : "e.g. 5000"}
                disabled={form.priceType === "negotiable"}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Price Display (optional)</label>
            <input
              type="text"
              value={form.priceDisplay}
              onChange={e => set("priceDisplay", e.target.value)}
              placeholder="e.g. MK 5,000 per hour or Starting from MK 10,000"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Location *</label>
            <select
              value={form.location}
              onChange={e => set("location", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set("isOnline", !form.isOnline)}
              className={`w-12 h-6 rounded-full transition-all ${form.isOnline ? "bg-primary" : "bg-muted"} relative cursor-pointer`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${form.isOnline ? "left-6" : "left-0.5"}`} />
            </div>
            <div>
              <div className="text-sm font-medium">Available Now</div>
              <div className="text-xs text-muted-foreground">Show as online and accepting bookings</div>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Plus size={16} /> Post Service</>
          )}
        </button>
      </form>
    </div>
  );
}
