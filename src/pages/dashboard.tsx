import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Briefcase, Star, MessageCircle, Bell, Plus, Eye, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatMK } from "@/lib/auth";
import { ServiceCard } from "@/components/ServiceCard";

export default function DashboardPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<any>(null);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLocation("/login"); return; }
    let mounted = true;

    const load = async () => {
      try {
        const [statsData, servicesData] = await Promise.all([
          api.get("/users/me/stats").catch(() => ({})),
          api.get(`/services?workerId=${user.id}&limit=10`),
        ]);
        if (mounted) { setStats(statsData); setMyServices(servicesData.services || []); }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user, authLoading]);

  // Show spinner while auth is resolving — prevents premature redirect
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome back, {profile?.name?.split(" ")[0] || "there"}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/post-service" className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all flex items-center gap-1.5">
            <Plus size={14} /> New Service
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Views", value: stats?.totalViews || 0, icon: Eye, color: "text-blue-600" },
          { label: "Jobs Completed", value: stats?.jobs_completed || profile?.jobs_completed || 0, icon: CheckCircle, color: "text-green-600" },
          { label: "Avg Rating", value: (stats?.rating || profile?.rating || 0).toFixed(1), icon: Star, color: "text-amber-600" },
          { label: "Active Services", value: myServices.length, icon: Briefcase, color: "text-purple-600" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-card-border rounded-xl p-4">
            <s.icon size={18} className={`${s.color} mb-2`} />
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Profile completion reminder */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="font-bold text-sm mb-1">Complete your profile to get more bookings</div>
          <p className="text-xs text-muted-foreground">A complete profile with photo and bio gets 3x more views</p>
        </div>
        <Link href="/settings" className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-all whitespace-nowrap">
          Update Profile
        </Link>
      </div>

      {/* My services */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black">My Services</h2>
          <Link href="/post-service" className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus size={12} /> Add Service
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-4 animate-pulse h-36" />
            ))}
          </div>
        ) : myServices.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl p-8 text-center">
            <Briefcase size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <h3 className="font-bold mb-1">No services listed yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start earning by listing your skills</p>
            <Link href="/post-service" className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
              Post Your First Service
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myServices.map(s => <ServiceCard key={s.id} service={s} />)}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Messages", href: "/messages", icon: MessageCircle },
          { label: "Notifications", href: "/notifications", icon: Bell },
          { label: "Browse Jobs", href: "/jobs", icon: Briefcase },
          { label: "My Profile", href: `/profile/${user.id}`, icon: Eye },
        ].map(l => (
          <Link key={l.label} href={l.href} className="bg-card border border-card-border rounded-xl p-4 text-center hover:border-primary hover:shadow-md transition-all">
            <l.icon size={20} className="text-primary mx-auto mb-2" />
            <div className="text-sm font-semibold">{l.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
