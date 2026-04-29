import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Zap, Phone, MessageCircle, MapPin, Clock, CheckCircle, AlertTriangle, Shield, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const EMERGENCY_CATEGORIES = [
  { label: "Plumbing Emergency",   icon: "🔧", desc: "Burst pipe, no water, blocked drain" },
  { label: "Electrical Emergency", icon: "⚡", desc: "Power outage, sparks, broken switch" },
  { label: "Medical Transport",    icon: "🚑", desc: "Urgent hospital transport needed" },
  { label: "Security/Guard",       icon: "🛡️", desc: "Home security, night guard needed" },
  { label: "Locksmith",            icon: "🔑", desc: "Locked out of home or car" },
  { label: "Generator Repair",     icon: "🔌", desc: "Generator not starting" },
  { label: "Roof Leak",            icon: "🏠", desc: "Emergency roof repair" },
  { label: "Other Emergency",      icon: "🆘", desc: "Any other urgent help needed" },
];

const CITIES = ["Balaka","Blantyre","Chikwawa","Chiradzulu","Chitipa","Dedza","Dowa","Karonga","Kasungu","Likoma","Lilongwe","Machinga","Mangochi","Mchinji","Mulanje","Mwanza","Mzimba","Neno","Nkhata Bay","Nkhotakota","Nsanje","Ntcheu","Ntchisi","Phalombe","Rumphi","Salima","Thyolo","Zomba"];

function friendlyError(msg: string): string {
  if (msg.includes("row-level security") || msg.includes("violates"))
    return "You must be logged in to send an emergency alert.";
  if (msg.includes("timed out"))
    return "Connection timed out. Please try again or call us directly.";
  if (msg.includes("Not authenticated"))
    return "Please log in to send an alert.";
  return msg || "Failed to send alert. Please call us directly.";
}

export default function EmergencyPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [location, setLocation2] = useState(CITIES[10]); // Lilongwe default
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [description, setDescription] = useState("");
  const [alertError, setAlertError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get("/emergency/workers");
        const allWorkers = data.workers || [];
        const available247 = allWorkers.filter((w: any) =>
          w.availability === "24/7" || w.is_247 === true || w.available_247 === true || w.isAvailable247 === true
        );
        setWorkers(available247.length > 0 ? available247 : allWorkers);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredWorkers = selectedCategory
    ? workers.filter((w: any) => {
        const cat = selectedCategory.toLowerCase();
        const spec = (w.specialization || w.category || w.skills?.join(" ") || "").toLowerCase();
        const name = (w.name || "").toLowerCase();
        return spec.includes(cat.split(" ")[0]) || name.includes(cat.split(" ")[0]) || spec.includes("general") || spec === "";
      })
    : workers;

  const handleSendAlert = async () => {
    if (!selectedCategory) return;

    // FIX: gate on auth BEFORE attempting insert
    if (!user) {
      setLocation("/login");
      return;
    }

    setSending(true);
    setAlertError("");

    const localTimer = setTimeout(() => {
      setSending(false);
      setAlertError("Request timed out. Please call us directly at 0999626944.");
    }, 9000);

    try {
      await api.post("/emergency/alert", {
        type: selectedCategory,
        location,
        description,
        // FIX: explicitly pass user_id so RLS WITH CHECK passes even if session header lags
        user_id: user.id,
      });
      clearTimeout(localTimer);
      setSent(true);
    } catch (e: any) {
      clearTimeout(localTimer);
      setAlertError(friendlyError(e?.message ?? ""));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-red-600 text-white rounded-2xl p-6 mb-6 text-center">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
          <Zap size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-black mb-1">Emergency Help</h1>
        <p className="text-red-100 text-sm">Get immediate assistance from available workers near you</p>
        <div className="mt-3 flex justify-center gap-4 text-sm text-red-100">
          <span className="flex items-center gap-1"><Clock size={13} /> Available 24/7</span>
          <span className="flex items-center gap-1"><MapPin size={13} /> Across Malawi</span>
        </div>
      </div>

      {/* Direct contact */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <a href="tel:+265999626944" className="flex items-center justify-center gap-2 bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 transition-all">
          <Phone size={18} /> Call Us Now
        </a>
        <a href="https://wa.me/265999626944" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all">
          <MessageCircle size={18} /> WhatsApp
        </a>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <h2 className="text-lg font-black mb-3">What type of emergency?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EMERGENCY_CATEGORIES.map(cat => (
            <button
              key={cat.label}
              onClick={() => { setSelectedCategory(cat.label); setAlertError(""); setSent(false); }}
              className={`p-3 rounded-xl border text-left transition-all ${selectedCategory === cat.label ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-border bg-card hover:border-red-300"}`}
            >
              <div className="text-2xl mb-1">{cat.icon}</div>
              <div className="text-xs font-bold">{cat.label}</div>
              <div className="text-xs text-muted-foreground">{cat.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Alert form */}
      {selectedCategory && (
        <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
          <h3 className="font-bold mb-3">Send Emergency Alert</h3>

          {/* FIX: show login nudge inline instead of silent RLS crash */}
          {!user && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl px-4 py-3 mb-3 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>You need to <button onClick={() => setLocation("/login")} className="underline font-semibold">log in</button> to send an alert. Or call us directly.</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Your Location *</label>
              <select
                value={location}
                onChange={e => setLocation2(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none"
              >
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Describe the emergency</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Be as specific as possible about your situation..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none resize-none"
              />
            </div>

            {/* FIX: inline error banner — no more alert() */}
            {alertError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{alertError}</span>
              </div>
            )}

            {sent ? (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <div>
                  <div className="font-semibold text-green-800 dark:text-green-200">Alert Sent!</div>
                  <div className="text-sm text-green-700 dark:text-green-300">Available workers near you are being notified. They will contact you shortly.</div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSendAlert}
                disabled={sending || !user}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Sending...</span></>
                ) : (
                  <><Zap size={16} /> Send Emergency Alert</>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Workers list */}
      <div>
        <h2 className="text-lg font-black mb-3">
          {selectedCategory ? `${selectedCategory} Workers` : "Available Workers Now"}
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <span className="font-semibold text-amber-800 dark:text-amber-200 text-sm">No workers currently online</span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">Please call us directly at <strong>0999626944</strong> and we'll find someone for you immediately.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWorkers.map(worker => (
              <div key={worker.id} className="bg-card border border-card-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary">
                      {worker.name?.charAt(0)}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{worker.name}</span>
                      {worker.isVerified && <CheckCircle size={12} className="text-primary" />}
                      <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">Online</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <MapPin size={10} />{worker.location}
                      <span>•</span>
                      <span>{worker.specialization || "General Services"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {worker.whatsapp && (
                      <a href={`https://wa.me/265${worker.whatsapp.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all">
                        <MessageCircle size={14} />
                      </a>
                    )}
                    {worker.phone && (
                      <a href={`tel:${worker.phone}`} className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all">
                        <Phone size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Safety reminder */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
        <Shield size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-1">Safety First</div>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            All workers on BlinkBuy are registered and reviewed. However, always verify identity before allowing access to your home. If this is a life-threatening emergency, call emergency services at <strong>998</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
