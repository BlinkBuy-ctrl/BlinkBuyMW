import { useState, useEffect, useCallback, memo } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { usePWA } from "@/hooks/usePWA";
import { getLanguage, setLanguage } from "@/lib/auth";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { supabase } from "@/lib/supabase";
import {
  Home, Briefcase, Truck, UtensilsCrossed, GraduationCap,
  ShoppingBag, Heart, Monitor, Zap, MessageCircle, Bell,
  User, LogOut, Settings, Sun, Moon, Menu, X, Shield,
  ChevronDown, Plus, LayoutDashboard, Download
} from "lucide-react";

const NAV = [
  { label: "Home",        href: "/services?category=Home+%26+Property+Services", icon: Home },
  { label: "Find Work",   href: "/jobs",                                           icon: Briefcase },
  { label: "Transport",   href: "/services?category=Transport+%26+Delivery",       icon: Truck },
  { label: "Food",        href: "/services?category=Food+%26+Daily+Needs",         icon: UtensilsCrossed },
  { label: "Education",   href: "/education",                                       icon: GraduationCap },
  { label: "Marketplace", href: "/marketplace",                                    icon: ShoppingBag },
  { label: "Health",      href: "/services?category=Health+%26+Personal+Support",  icon: Heart },
  { label: "Digital",     href: "/services?category=Digital+%26+Online+Services",  icon: Monitor },
  { label: "Emergency",   href: "/emergency",                                       icon: Zap },
];

const BOTTOM_NAV = [
  { label: "Home",     href: "/",          icon: Home },
  { label: "Services", href: "/services",  icon: ShoppingBag },
  { label: "Jobs",     href: "/jobs",      icon: Briefcase },
  { label: "Messages", href: "/messages",  icon: MessageCircle },
  { label: "Profile",  href: "/dashboard", icon: User },
];

const NavItem = memo(({ n, active }: { n: typeof NAV[0]; active: boolean }) => (
  <Link
    href={n.href}
    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
      active ? "text-white bg-white/15" : "text-white/70 hover:text-white hover:bg-white/10"
    }`}
  >
    <n.icon size={12} />
    {n.label}
  </Link>
));

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isInstallable, install } = usePWA();
  const [, setLocation] = useLocation();
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const [uMenu, setUMenu] = useState(false);
  const [lang, setLang] = useState<"en" | "ny">(getLanguage());
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [counts, setCounts] = useState({ notifications: 0, messages: 0 });

  // ── Gated: only fetch unread counts once auth is fully resolved ──
  useEffect(() => {
    if (isLoading || !user) return;
    let cancelled = false;

    const fetchUnread = async () => {
      try {
        const convRes = await supabase
          .from("conversations")
          .select("id")
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        const convIds = convRes.data?.map((c: any) => c.id) ?? [];

        const [{ count: nc }, { count: mc }] = await Promise.all([
          supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("read", false),
          convIds.length > 0
            ? supabase
                .from("messages")
                .select("*", { count: "exact", head: true })
                .neq("sender_id", user.id)
                .in("conversation_id", convIds)
                .eq("read", false)
            : Promise.resolve({ count: 0 }),
        ]);

        if (!cancelled) setCounts({ notifications: nc ?? 0, messages: mc ?? 0 });
      } catch { /* non-fatal */ }
    };

    fetchUnread();
    return () => { cancelled = true; };
  }, [user, isLoading]);

  // Reset badges when navigating to relevant pages
  useEffect(() => {
    if (loc.startsWith("/messages"))      setCounts(p => ({ ...p, messages: 0 }));
    if (loc.startsWith("/notifications")) setCounts(p => ({ ...p, notifications: 0 }));
  }, [loc]);

  // Realtime — pass null while auth is still loading to prevent premature subscription
  useRealtimeNotifications(isLoading ? null : user?.id, setCounts);

  // PWA install banner after 10s
  useEffect(() => {
    if (!isInstallable) return;
    if (sessionStorage.getItem("pwa_banner_dismissed")) return;
    const t = setTimeout(() => setShowInstallBanner(true), 10_000);
    return () => clearTimeout(t);
  }, [isInstallable]);

  // Page fade on route change
  useEffect(() => {
    setPageVisible(false);
    const t = setTimeout(() => setPageVisible(true), 80);
    setOpen(false);
    setUMenu(false);
    return () => clearTimeout(t);
  }, [loc]);

  const toggleLang = useCallback(() => {
    const n = lang === "en" ? "ny" : "en";
    setLang(n);
    setLanguage(n);
  }, [lang]);

  const doLogout = useCallback(() => {
    logout();
    setLocation("/");
    setUMenu(false);
  }, [logout, setLocation]);

  const dismissBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem("pwa_banner_dismissed", "1");
  };

  const avatarLetter = profile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?";
  const avatarPhoto  = profile?.profilePhoto ?? profile?.profile_photo ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 z-[60] md:bottom-4 md:left-auto md:right-4 md:w-80">
          <div className="bg-[hsl(215,55%,12%)] border border-white/10 rounded-2xl p-4 shadow-2xl flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-sm">B</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">Install BlinkBuy</p>
              <p className="text-white/50 text-xs mt-0.5">Add to home screen for faster access & offline use</p>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={async () => { await install(); setShowInstallBanner(false); }}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                >
                  <Download size={12} /> Install App
                </button>
                <button onClick={dismissBanner} className="text-white/40 hover:text-white text-xs px-2 transition-all">
                  Not now
                </button>
              </div>
            </div>
            <button onClick={dismissBanner} className="text-white/30 hover:text-white transition-all p-1">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[hsl(215,55%,12%)] text-white shadow-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(210,100%,60%)] to-[hsl(210,100%,45%)] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-150 active:scale-95">
                <span className="text-white font-black text-sm">B</span>
              </div>
              <span className="font-black text-lg tracking-tight">BlinkBuy</span>
            </Link>

            <nav className="hidden lg:flex items-center">
              {NAV.map(n => {
                const active = loc === n.href || loc.startsWith(n.href.split("?")[0]);
                return <NavItem key={n.href} n={n} active={active} />;
              })}
            </nav>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleLang}
                className="hidden sm:flex text-xs text-white/60 hover:text-white border border-white/15 rounded-lg px-2 py-1 transition-all hover:bg-white/10 active:scale-95"
              >
                {lang === "en" ? "EN" : "NY"}
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95"
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              {user ? (
                <>
                  <Link href="/messages" className="hidden sm:flex relative p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95">
                    <MessageCircle size={15} />
                    {counts.messages > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-0.5">
                        {counts.messages > 99 ? "99+" : counts.messages}
                      </span>
                    )}
                  </Link>
                  <Link href="/notifications" className="hidden sm:flex relative p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95">
                    <Bell size={15} />
                    {counts.notifications > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-0.5">
                        {counts.notifications > 99 ? "99+" : counts.notifications}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/post-service"
                    className="hidden sm:flex items-center gap-1 bg-[hsl(210,100%,56%)] hover:bg-[hsl(210,100%,50%)] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                  >
                    <Plus size={13} /> Post
                  </Link>

                  <div className="relative">
                    <button
                      onClick={() => setUMenu(!uMenu)}
                      className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-xl px-2.5 py-1.5 transition-all border border-white/10 active:scale-95"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(210,100%,60%)] to-[hsl(210,100%,40%)] flex items-center justify-center text-xs font-black text-white overflow-hidden">
                        {avatarPhoto ? (
                          <img src={avatarPhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          avatarLetter
                        )}
                      </div>
                      <span className="text-xs hidden sm:block max-w-[80px] truncate font-medium">
                        {profile?.name?.split(" ")[0] || user.email?.split("@")[0]}
                      </span>
                      <ChevronDown size={11} className={`transition-transform duration-150 ${uMenu ? "rotate-180" : ""}`} />
                    </button>

                    {uMenu && (
                      <div className="absolute right-0 top-full mt-1.5 w-48 bg-card border border-border rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-3 py-2 border-b border-border mb-1">
                          <div className="text-xs font-black truncate text-foreground">{profile?.name || user.email}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </div>
                        {[
                          { href: `/profile/${user.id}`, icon: User,           label: "My Profile" },
                          { href: "/dashboard",          icon: LayoutDashboard, label: "Dashboard" },
                          { href: "/settings",           icon: Settings,        label: "Settings" },
                          { href: "/about",              icon: null,            label: "ℹ️ About Us" },
                        ].map(item => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-all"
                            onClick={() => setUMenu(false)}
                          >
                            {item.icon ? <item.icon size={13} className="text-foreground" /> : null}
                            {item.label}
                          </Link>
                        ))}
                        {(profile?.role === "admin" || user.email === "otechy8@gmail.com") && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-2 px-3 py-2 text-xs text-primary font-semibold hover:bg-muted transition-all"
                            onClick={() => setUMenu(false)}
                          >
                            <Shield size={13} className="text-primary" /> Admin Panel
                          </Link>
                        )}
                        <div className="border-t border-border mt-1 pt-1">
                          <button
                            onClick={doLogout}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-muted transition-all"
                          >
                            <LogOut size={13} /> Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <Link href="/login" className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-lg transition-all hover:bg-white/10">
                    Login
                  </Link>
                  <Link href="/register" className="text-xs bg-[hsl(210,100%,56%)] hover:bg-[hsl(210,100%,50%)] text-white px-3 py-1.5 rounded-lg transition-all font-bold active:scale-95">
                    Register
                  </Link>
                </div>
              )}

              <button
                onClick={() => setOpen(!open)}
                className="lg:hidden p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95"
              >
                {open ? <X size={17} /> : <Menu size={17} />}
              </button>
            </div>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-white/10 bg-[hsl(215,50%,10%)] animate-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 grid grid-cols-3 gap-1.5">
              {NAV.map(n => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs text-white/65 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                  onClick={() => setOpen(false)}
                >
                  <n.icon size={16} />
                  <span className="text-center leading-tight">{n.label}</span>
                </Link>
              ))}
            </div>
            {user && (
              <div className="border-t border-white/10 px-4 py-2.5 flex gap-4 flex-wrap">
                <Link href="/messages"           className="flex items-center gap-1.5 text-xs text-white/65 hover:text-white" onClick={() => setOpen(false)}><MessageCircle size={13} /> Messages</Link>
                <Link href="/notifications"      className="flex items-center gap-1.5 text-xs text-white/65 hover:text-white" onClick={() => setOpen(false)}><Bell size={13} /> Alerts</Link>
                <Link href="/dashboard"          className="flex items-center gap-1.5 text-xs text-white/65 hover:text-white" onClick={() => setOpen(false)}><LayoutDashboard size={13} /> Dashboard</Link>
                <Link href={`/profile/${user.id}`} className="flex items-center gap-1.5 text-xs text-white/65 hover:text-white" onClick={() => setOpen(false)}><User size={13} /> Profile</Link>
                <Link href="/settings"           className="flex items-center gap-1.5 text-xs text-white/65 hover:text-white" onClick={() => setOpen(false)}><Settings size={13} /> Settings</Link>
              </div>
            )}
          </div>
        )}
      </header>

      <main
        className="flex-1 pb-16 lg:pb-0"
        style={{ opacity: pageVisible ? 1 : 0, transition: "opacity 120ms ease" }}
      >
        {children}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[hsl(215,55%,10%)] border-t border-white/10 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-14 px-1">
          {BOTTOM_NAV.map(n => {
            const active = loc === n.href || (n.href !== "/" && loc.startsWith(n.href));
            const badge  = n.href === "/messages" ? counts.messages : n.href === "/notifications" ? counts.notifications : 0;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-150 active:scale-90 min-w-0 flex-1 ${
                  active ? "text-blue-400" : "text-white/40 hover:text-white/70"
                }`}
              >
                <div className="relative">
                  <n.icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium whitespace-nowrap leading-none">{n.label}</span>
                {active && <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />}
              </Link>
            );
          })}
          {user && (
            <Link
              href="/post-service"
              className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all active:scale-90 text-white/40 hover:text-white/70 min-w-0 flex-1"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center -mt-1">
                <Plus size={15} />
              </div>
              <span className="text-[10px] font-medium whitespace-nowrap leading-none">Post</span>
            </Link>
          )}
        </div>
      </nav>

      {/* FOOTER (desktop only) */}
      <footer className="hidden lg:block bg-[hsl(215,55%,8%)] text-white/70 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(210,100%,60%)] to-[hsl(210,100%,45%)] flex items-center justify-center">
                  <span className="text-white font-black text-sm">B</span>
                </div>
                <span className="font-black text-white text-lg">BlinkBuy Malawi</span>
              </div>
              <p className="text-xs text-white/45 leading-relaxed mb-4">
                Your trusted local services marketplace. Connecting Malawians since 2026.
              </p>
              <a href="https://wa.me/265999626944" target="_blank" rel="noopener noreferrer"
                className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg transition-all">
                WhatsApp Us
              </a>
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Services</h4>
              <div className="space-y-2 text-xs">
                {[["Browse Services","/services"],["Find Work","/jobs"],["Marketplace","/marketplace"],["Emergency Help","/emergency"]].map(([l,h]) => (
                  <Link key={h} href={h} className="block text-white/50 hover:text-white transition-all">{l}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Account</h4>
              <div className="space-y-2 text-xs">
                {[["Register Free","/register"],["Sign In","/login"],["Dashboard","/dashboard"],["Post a Service","/post-service"],["Post a Job","/post-job"]].map(([l,h]) => (
                  <Link key={h} href={h} className="block text-white/50 hover:text-white transition-all">{l}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Payments</h4>
              <div className="text-xs text-white/50 space-y-2">
                <p className="text-white/30">Pay for featured listings & verification via:</p>
                <div className="bg-white/5 rounded-lg p-2.5 space-y-1">
                  <p>Airtel Money: <strong className="text-white">0999626944</strong></p>
                  <p>TNM Mpamba: <strong className="text-white">0888712272</strong></p>
                </div>
                <p>Featured: <strong className="text-white/70">MK 5,000/mo</strong></p>
                <p>Verified: <strong className="text-white/70">MK 10,000/mo</strong></p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/30 text-center sm:text-left">
              Powered by <span className="text-[hsl(210,100%,65%)] font-bold">O-techy</span> · Built for Malawi. Your Ideas To Reality.
            </p>
            <p className="text-xs text-white/20">© 2026 BlinkBuy Malawi. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {uMenu && <div className="fixed inset-0 z-40" onClick={() => setUMenu(false)} />}
    </div>
  );
}
