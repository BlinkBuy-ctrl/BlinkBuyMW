import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const CITIES = ["Balaka","Blantyre","Chikwawa","Chiradzulu","Chitipa","Dedza","Dowa","Karonga","Kasungu","Likoma","Lilongwe","Machinga","Mangochi","Mchinji","Mulanje","Mwanza","Mzimba","Neno","Nkhata Bay","Nkhotakota","Nsanje","Ntcheu","Ntchisi","Phalombe","Rumphi","Salima","Thyolo","Zomba"];
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "One-time Task"];

// Maps timeout/network errors to user-friendly messages
function friendlyError(msg: string): string {
  if (msg.includes("timed out"))      return "Connection timed out. Please check your internet and try again.";
  if (msg.includes("Not authenticated")) return "Your session expired. Please log in again.";
  if (msg.includes("permission denied")) return "You don't have permission to post jobs. Please contact support.";
  if (msg.includes("network") || msg.includes("fetch")) return "Network error. Please check your connection.";
  return msg || "Something went wrong. Please try again.";
}

export default function PostJobPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "Lilongwe",
    type: "One-time Task",
    budget: "",
    skills: "",
    isUrgent: false,
  });

  const set = (key: string, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setLocation("/login"); return; }

    setLoading(true);
    setError("");

    // Local timeout — if api.post somehow leaks past withTimeout, this catches it
    const localTimer = setTimeout(() => {
      setLoading(false);
      setError("Request took too long. Please try again.");
    }, 9000);

    try {
      const { isUrgent, ...rest } = form;
      const payload = {
        ...rest,
        is_urgent: isUrgent,
        budget: form.budget ? Number(form.budget) : undefined,
        skills: form.skills ? form.skills.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      await api.post("/jobs", payload);
      clearTimeout(localTimer);
      setLocation("/jobs");
    } catch (e: any) {
      clearTimeout(localTimer);
      setError(friendlyError(e?.message ?? ""));
    } finally {
      // Always unblock the button — no infinite spin
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
      <h1 className="text-2xl font-black mb-2">Post a Job</h1>
      <p className="text-muted-foreground text-sm mb-6">Describe what you need and get applications from skilled workers</p>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold">Job Details</h2>

          <div>
            <label className="text-xs font-medium mb-1 block">Job Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              required
              placeholder="e.g. Need a plumber to fix burst pipe urgently"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Description *</label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              required
              rows={5}
              placeholder="Describe the job in detail — what needs to be done, when, special requirements..."
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Required Skills (comma-separated)</label>
            <input
              type="text"
              value={form.skills}
              onChange={e => set("skills", e.target.value)}
              placeholder="e.g. plumbing, soldering, pipe fitting"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold">Location & Budget</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Job Type</label>
              <select
                value={form.type}
                onChange={e => set("type", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Budget (MK) — optional</label>
              <input
                type="number"
                value={form.budget}
                onChange={e => set("budget", e.target.value)}
                placeholder="e.g. 15000"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
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
              onClick={() => set("isUrgent", !form.isUrgent)}
              className={`w-12 h-6 rounded-full transition-all ${form.isUrgent ? "bg-red-500" : "bg-muted"} relative cursor-pointer`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${form.isUrgent ? "left-6" : "left-0.5"}`} />
            </div>
            <div>
              <div className="text-sm font-medium text-red-600">Mark as Urgent</div>
              <div className="text-xs text-muted-foreground">Urgent jobs get 2x more visibility</div>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Posting...</span>
            </>
          ) : (
            <><Plus size={16} /> Post Job</>
          )}
        </button>
      </form>
    </div>
  );
}
