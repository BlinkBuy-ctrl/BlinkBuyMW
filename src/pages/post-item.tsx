import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Package } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const CATEGORIES = ["Electronics", "Clothing", "Food", "Furniture", "Tools", "Vehicles", "Farm Produce", "Books", "Phones", "Other"];
const CITIES = ["Balaka","Blantyre","Chikwawa","Chiradzulu","Chitipa","Dedza","Dowa","Karonga","Kasungu","Likoma","Lilongwe","Machinga","Mangochi","Mchinji","Mulanje","Mwanza","Mzimba","Neno","Nkhata Bay","Nkhotakota","Nsanje","Ntcheu","Ntchisi","Phalombe","Rumphi","Salima","Thyolo","Zomba"];
const CONDITIONS = ["New", "Like New", "Good", "Fair", "For Parts"];

export default function PostItemPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", category: CATEGORIES[0],
    price: "", location: "Lilongwe", condition: "Good",
    images: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setLocation("/login"); return; }
    setLoading(true); setError("");
    try {
      const payload = {
        ...form,
        price: form.price ? Number(form.price) : undefined,
        images: form.images ? form.images.split("\n").map(s => s.trim()).filter(Boolean) : [],
      };
      await api.post("/marketplace", payload);
      setLocation("/marketplace");
    } catch (e: any) { setError(e.message || "Failed to post item"); }
    finally { setLoading(false); }
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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Package size={18} className="text-primary" /></div>
        <div>
          <h1 className="text-2xl font-black">Sell an Item</h1>
          <p className="text-muted-foreground text-sm">List your item on the BlinkBuy marketplace</p>
        </div>
      </div>

      {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold">Item Details</h2>
          <div>
            <label className="text-xs font-medium mb-1 block">Item Title *</label>
            <input type="text" value={form.title} onChange={e => set("title", e.target.value)} required
              placeholder="e.g. Samsung Galaxy A53 — Excellent Condition"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Condition</label>
              <select value={form.condition} onChange={e => set("condition", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring">
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Description *</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} required rows={4}
              placeholder="Describe the item — condition, age, reason for selling, any defects..."
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Image URLs (one per line)</label>
            <textarea value={form.images} onChange={e => set("images", e.target.value)} rows={3}
              placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none font-mono text-xs" />
            <p className="text-xs text-muted-foreground mt-1">Paste direct image URLs (e.g. from Google Photos, Imgur)</p>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold">Price & Location</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Price (MK) *</label>
              <input type="number" value={form.price} onChange={e => set("price", e.target.value)} required
                placeholder="e.g. 120000"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Location *</label>
              <select value={form.location} onChange={e => set("location", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring">
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus size={16} /> List for Sale</>}
        </button>
      </form>
    </div>
  );
}
