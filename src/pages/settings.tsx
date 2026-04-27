import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Save, Upload, Download, BookOpen, X, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { getLanguage, setLanguage } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const CITIES = ["Balaka","Blantyre","Chikwawa","Chiradzulu","Chitipa","Dedza","Dowa","Karonga","Kasungu","Likoma","Lilongwe","Machinga","Mangochi","Mchinji","Mulanje","Mwanza","Mzimba","Neno","Nkhata Bay","Nkhotakota","Nsanje","Ntcheu","Ntchisi","Phalombe","Rumphi","Salima","Thyolo","Zomba"];

const TUTORIAL_STEPS = [
  { icon: "👤", title: "Create Your Account", desc: "Sign up once — your account lets you both book services AND offer your own skills. No need to choose." },
  { icon: "🔍", title: "Browse Services", desc: "Search for services by category or district. Find plumbers, tutors, transport, food, digital services and more across all 28 districts." },
  { icon: "📅", title: "Book a Service", desc: "Press Book on any service. Describe what you need — you'll be connected directly to the worker via chat." },
  { icon: "💬", title: "Chat & Confirm", desc: "Use the built-in chat to discuss details, share your location, agree on price, and confirm the job." },
  { icon: "💳", title: "Pay & Review", desc: "Pay via Airtel Money (0999626944) or TNM Mpamba (0888712272). Send payment proof in chat. Leave a review after!" },
];

export default function SettingsPage() {
  const { user, profile, setProfile, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<"en" | "ny">(getLanguage());
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deferredPromptRef = useRef<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showIosInstall, setShowIosInstall] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const [form, setForm] = useState({
    name: profile?.name || "",
    phone: profile?.phone || "",
    whatsapp: profile?.whatsapp || "",
    location: profile?.location || "Lilongwe",
    bio: profile?.bio || "",
    profile_photo: profile?.profile_photo || "",
  });

  // Sync form when profile loads async
  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        phone: profile.phone || "",
        whatsapp: profile.whatsapp || "",
        location: profile.location || "Lilongwe",
        bio: profile.bio || "",
        profile_photo: profile.profile_photo || "",
      });
    }
  }, [profile]);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setPhotoUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("profiles").upload(path, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from("profiles").getPublicUrl(path);
      set("profile_photo", data.publicUrl);
      await supabase.from("profiles").update({ profile_photo: data.publicUrl }).eq("id", user.id);
      toast({ title: "Photo updated! ✓" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true); setError(""); setSuccess(false);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: form.name,
          phone: form.phone,
          whatsapp: form.whatsapp,
          location: form.location,
          bio: form.bio,
        })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      setProfile({ ...profile, ...form });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  const handleInstallApp = async () => {
    if (isInStandaloneMode) {
      toast({ title: "Already installed!", description: "BlinkBuy is running as an app." });
      return;
    }
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      await deferredPromptRef.current.userChoice;
      deferredPromptRef.current = null;
      setCanInstall(false);
    } else if (isIos) {
      setShowIosInstall(true);
    } else {
      toast({ title: "How to install", description: "Open browser menu → 'Add to Home Screen' or 'Install App'." });
    }
  };

  const handleLangChange = (l: "en" | "ny") => {
    if (l === "ny") {
      toast({ title: "Chichewa — Coming Soon!", description: "Chichewa translation is not yet available." });
      return;
    }
    setLang(l); setLanguage(l);
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
      <h1 className="text-2xl font-black mb-6">Settings</h1>

      {/* iOS Install Modal */}
      {showIosInstall && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4" onClick={() => setShowIosInstall(false)}>
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-base mb-3">Install BlinkBuy on iPhone</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                Tap the <strong className="text-foreground mx-1">Share</strong> button at the bottom of Safari
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                Scroll down and tap <strong className="text-foreground mx-1">Add to Home Screen</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                Tap <strong className="text-foreground mx-1">Add</strong> — BlinkBuy appears on your home screen
              </li>
            </ol>
            <button onClick={() => setShowIosInstall(false)} className="w-full mt-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Got it</button>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowTutorial(false)}>
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-base">How to Use BlinkBuy</h3>
              <button onClick={() => setShowTutorial(false)} className="p-1 hover:bg-muted rounded-lg transition-all">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex gap-1 mb-5">
              {TUTORIAL_STEPS.map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= tutorialStep ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>

            <div className="text-center mb-6">
              <div className="text-5xl mb-3">{TUTORIAL_STEPS[tutorialStep].icon}</div>
              <h4 className="font-black text-lg mb-2">{TUTORIAL_STEPS[tutorialStep].title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{TUTORIAL_STEPS[tutorialStep].desc}</p>
            </div>

            <div className="flex gap-3">
              {tutorialStep > 0 && (
                <button onClick={() => setTutorialStep(s => s - 1)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-all">
                  Back
                </button>
              )}
              {tutorialStep < TUTORIAL_STEPS.length - 1 ? (
                <button onClick={() => setTutorialStep(s => s + 1)}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1">
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={() => { setShowTutorial(false); setTutorialStep(0); }}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all">
                  Done 🎉
                </button>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">Step {tutorialStep + 1} of {TUTORIAL_STEPS.length}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-4">
          Profile updated successfully! ✓
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Profile photo */}
      <div className="bg-card border border-card-border rounded-xl p-5 mb-4">
        <h2 className="text-sm font-bold mb-4">Profile Photo</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-black text-primary overflow-hidden">
            {form.profile_photo ? (
              <img src={form.profile_photo} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              profile?.name?.charAt(0) || user.email?.charAt(0)
            )}
          </div>
          <div className="flex-1">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoUploading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-all disabled:opacity-50">
              {photoUploading ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Upload size={14} />}
              {photoUploading ? "Uploading..." : "Upload Photo"}
            </button>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP · max 5MB</p>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-card border border-card-border rounded-xl p-5 mb-4">
        <h2 className="text-sm font-bold mb-4">Personal Information</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1 block">Full Name</label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                placeholder="0999123456"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">WhatsApp Number</label>
              <input type="tel" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)}
                placeholder="0999123456"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Location</label>
            <select value={form.location} onChange={e => set("location", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring">
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Bio / About You</label>
            <textarea value={form.bio} onChange={e => set("bio", e.target.value)}
              placeholder="Tell customers about yourself and your skills..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>
      </div>

      {/* App settings */}
      <div className="bg-card border border-card-border rounded-xl p-5 mb-4">
        <h2 className="text-sm font-bold mb-4">App Settings</h2>

        {/* Dark mode */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium text-foreground">Dark Mode</div>
            <div className="text-xs text-muted-foreground">Switch between light and dark theme</div>
          </div>
          <button onClick={toggleTheme}
            className={`w-12 h-6 rounded-full transition-all relative ${theme === "dark" ? "bg-primary" : "bg-muted"}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${theme === "dark" ? "left-6" : "left-0.5"}`} />
          </button>
        </div>

        {/* Language */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium text-foreground">Language</div>
            <div className="text-xs text-muted-foreground">English or Chichewa</div>
          </div>
          <div className="flex rounded-lg border border-input overflow-hidden">
            <button onClick={() => handleLangChange("en")}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${lang === "en" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>
              English
            </button>
            <button onClick={() => handleLangChange("ny")}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${lang === "ny" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>
              Chichewa
            </button>
          </div>
        </div>

        {/* Tutorial */}
        <div className="flex items-center justify-between mb-4 pt-3 border-t border-border">
          <div>
            <div className="text-sm font-medium text-foreground">How to Use BlinkBuy</div>
            <div className="text-xs text-muted-foreground">Step-by-step app tutorial</div>
          </div>
          <button onClick={() => { setTutorialStep(0); setShowTutorial(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary text-primary text-xs font-semibold hover:bg-primary/10 transition-all">
            <BookOpen size={13} /> Tutorial
          </button>
        </div>

        {/* Install */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <div className="text-sm font-medium text-foreground">Install App</div>
            <div className="text-xs text-muted-foreground">Add BlinkBuy to your home screen</div>
          </div>
          <button onClick={handleInstallApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all">
            <Download size={13} /> Install
          </button>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
        <h2 className="text-sm font-bold mb-3">Account Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-foreground">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account Type</span>
            <span className="font-medium text-foreground capitalize">Book & Offer Services</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Verified</span>
            <span className={profile?.is_verified ? "text-green-600 font-medium" : "text-muted-foreground"}>
              {profile?.is_verified ? "✓ Verified" : "Not yet — MK 10,000/mo"}
            </span>
          </div>
          {profile?.badge && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Badge</span>
              <span className="font-medium text-amber-600">🏅 {profile?.badge}</span>
            </div>
          )}
        </div>
      </div>

      <button onClick={handleSave} disabled={loading}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        {loading
          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <><Save size={16} /> Save Changes</>
        }
      </button>
    </div>
  );
}
