import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Plus, Package, X, ImagePlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const CATEGORIES = ["Electronics", "Clothing", "Food", "Furniture", "Tools", "Vehicles", "Farm Produce", "Books", "Phones", "Other"];
const CITIES = ["Balaka","Blantyre","Chikwawa","Chiradzulu","Chitipa","Dedza","Dowa","Karonga","Kasungu","Likoma","Lilongwe","Machinga","Mangochi","Mchinji","Mulanje","Mwanza","Mzimba","Neno","Nkhata Bay","Nkhotakota","Nsanje","Ntcheu","Ntchisi","Phalombe","Rumphi","Salima","Thyolo","Zomba"];
const CONDITIONS = ["New", "Like New", "Good", "Fair", "For Parts"];

export default function PostItemPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", description: "", category: CATEGORIES[0],
    price: "", location: "Lilongwe", condition: "Good",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 2 - images.length;
    if (remaining <= 0) return;
    const allowed = files.slice(0, remaining);
    const newImages = [...images, ...allowed];
    setImages(newImages);
    const newPreviews = allowed.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of images) {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("marketplace-images")
        .upload(path, file, { contentType: file.type });
      if (error) throw new Error("Image upload failed: " + error.message);
      const { data } = supabase.storage.from("marketplace-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setLocation("/login"); return; }
    setLoading(true); setError("");
    try {
      const imageUrls = await uploadImages();
      const { error } = await supabase.from("marketplace_items").insert({
        title: form.title,
        description: form.description,
        category: form.category,
        price: form.price ? Number(form.price) : null,
        location: form.location,
        condition: form.condition,
        images: imageUrls,
        seller_id: user.id,
      });
      if (error) throw new Error(error.message);
      await supabase.from("notifications").insert({
        type: "new_listing",
        message: `Someone just listed: ${form.title} in ${form.location}`,
        target: "all",
        created_at: new Date().toISOString(),
      });
      setLocation("/marketplace");
    } catch (e: any) {
      setError(e.message || "Failed to post item");
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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Package size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Sell an Item</h1>
          <p className="text-muted-foreground text-sm">List your item on the BlinkBuy marketplace</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

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

          {/* Image upload — max 2 */}
          <div>
            <label className="text-xs font-medium mb-2 block">
              Photos (max 2) — {images.length}/2
            </label>
            <div className="flex gap-3 flex-wrap">
              {previews.map((src, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {images.length < 2 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-all"
                >
                  <ImagePlus size={20} />
                  <span className="text-xs">Add Photo</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-1">Upload up to 2 photos of your item</p>
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
          {loading
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><Plus size={16} /> List for Sale</>
          }
        </button>
      </form>
    </div>
  );
}
