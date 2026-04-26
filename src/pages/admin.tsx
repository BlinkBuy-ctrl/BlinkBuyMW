import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Users, Briefcase, Shield, CheckCircle, Award, Trash2, Eye, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin, formatMK } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type Tab = "overview" | "users" | "services" | "reports";

export default function AdminPage() {
  const { user, profile, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !isAdmin(profile)) { setLocation("/"); return; }
    loadData();
  }, [isLoading, user, profile, tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === "overview") {
        const [{ count: totalUsers }, { count: totalServices }, { count: totalJobs }] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("services").select("*", { count: "exact", head: true }),
          supabase.from("jobs").select("*", { count: "exact", head: true }),
        ]);
        setStats({ totalUsers, totalServices, totalJobs });
      } else if (tab === "users") {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        setUsers(data || []);
      } else if (tab === "services") {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        setServices(data || []);
      }
    } catch (e) {
      toast({ title: "Failed to load data", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const verifyUser = async (userId: string, is_verified: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified })
      .eq("id", userId);
    if (error) { toast({ title: "Action failed", variant: "destructive" }); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified } : u));
    toast({ title: is_verified ? "User verified ✓" : "Verification removed" });
  };

  const featureService = async (serviceId: string, is_featured: boolean) => {
    const { error } = await supabase
      .from("services")
      .update({ is_featured })
      .eq("id", serviceId);
    if (error) { toast({ title: "Action failed", variant: "destructive" }); return; }
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, is_featured } : s));
    toast({ title: is_featured ? "Service featured ⭐" : "Service unfeatured" });
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) { toast({ title: "Delete failed", variant: "destructive" }); return; }
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast({ title: "User deleted" });
  };

  const assignBadge = async (userId: string, badge: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ badge, badge_assigned_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) { toast({ title: "Failed to assign badge", variant: "destructive" }); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, badge } : u));
    toast({ title: `Badge "${badge}" assigned 🏅` });
  };

  const toggleBoost = async (userId: string, currentBoosted: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_boosted: !currentBoosted, boosted_at: !currentBoosted ? new Date().toISOString() : null })
      .eq("id", userId);
    if (error) { toast({ title: "Failed to update boost", variant: "destructive" }); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_boosted: !currentBoosted } : u));
    toast({ title: currentBoosted ? "Boost removed" : "User boosted to top ⚡" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin(profile)) return null;

  const tabs: { id: Tab; label: string; icon: React.ComponentType<any> }[] = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "users", label: "Users", icon: Users },
    { id: "services", label: "Services", icon: Briefcase },
    { id: "reports", label: "Reports", icon: Shield },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-primary" />
            <h1 className="text-2xl font-black">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground text-sm">BlinkBuy platform management</p>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          <div className="font-semibold">{profile?.name || user.email}</div>
          <div>Administrator</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t.id ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      ) : (
        <>
          {/* Overview */}
          {tab === "overview" && stats && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Total Users", value: stats.totalUsers || 0, icon: Users, color: "text-blue-600" },
                  { label: "Total Services", value: stats.totalServices || 0, icon: Briefcase, color: "text-green-600" },
                  { label: "Total Jobs", value: stats.totalJobs || 0, icon: Briefcase, color: "text-purple-600" },
                ].map(stat => (
                  <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                    <div className={`${stat.color} mb-2`}><stat.icon size={20} /></div>
                    <div className="text-2xl font-black">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-2">Payment Instructions</h3>
                <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  <p>To feature a worker: collect MK 5,000 via Airtel Money (0999626944) or TNM Mpamba (0888712272)</p>
                  <p>To verify a worker: collect MK 10,000 via same numbers</p>
                  <p>After payment confirmation, use the "Users" tab to mark them as verified/featured</p>
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {tab === "users" && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-bold">All Users ({users.length})</h2>
              </div>
              {users.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No users found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Name</th>
                        <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Role</th>
                        <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Location</th>
                        <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-muted/50 transition-all">
                          <td className="px-4 py-3">
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                            {u.badge && <div className="text-xs text-amber-600 font-semibold mt-0.5">🏅 {u.badge}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full capitalize">{u.role}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{u.location}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              {u.is_verified && <span className="flex items-center gap-0.5 text-xs text-primary"><CheckCircle size={11} /> Verified</span>}
                              {u.is_boosted && <span className="flex items-center gap-0.5 text-xs text-amber-600"><TrendingUp size={11} /> Boosted</span>}
                              {!u.is_verified && !u.is_boosted && <span className="text-xs text-muted-foreground">Standard</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/profile/${u.id}`} className="p-1 hover:bg-muted rounded transition-all">
                                <Eye size={14} className="text-muted-foreground" />
                              </Link>
                              <button
                                onClick={() => verifyUser(u.id, !u.is_verified)}
                                className={`p-1 rounded transition-all ${u.is_verified ? "hover:bg-red-100 text-red-500" : "hover:bg-green-100 text-green-600"}`}
                                title={u.is_verified ? "Remove verification" : "Verify user"}
                              >
                                <CheckCircle size={14} />
                              </button>
                              {/* Badge dropdown */}
                              <select
                                defaultValue=""
                                onChange={e => { if (e.target.value) assignBadge(u.id, e.target.value); e.target.value = ""; }}
                                className="text-xs border border-input rounded px-1 py-0.5 bg-background cursor-pointer"
                                title="Assign badge"
                              >
                                <option value="" disabled>🏅 Badge</option>
                                <option value="Verified">✅ Verified</option>
                                <option value="Top Seller">🏆 Top Seller</option>
                                <option value="Trusted">🛡️ Trusted</option>
                                <option value="Featured">⭐ Featured</option>
                              </select>
                              {/* Boost button */}
                              <button
                                onClick={() => toggleBoost(u.id, u.is_boosted)}
                                className={`px-2 py-0.5 rounded transition-all text-xs font-semibold ${u.is_boosted ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "hover:bg-amber-100 text-muted-foreground hover:text-amber-700"}`}
                                title={u.is_boosted ? "Remove boost" : "Boost to top"}
                              >
                                {u.is_boosted ? "⚡ Boosted" : "⚡ Boost"}
                              </button>
                              {u.role !== "admin" && (
                                <button onClick={() => deleteUser(u.id)} className="p-1 hover:bg-red-100 text-red-500 rounded transition-all">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Services */}
          {tab === "services" && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-bold">All Services ({services.length})</h2>
              </div>
              {services.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No services found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Title</th>
                        <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Category</th>
                        <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Price</th>
                        <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-2 font-semibold text-xs text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {services.map(s => (
                        <tr key={s.id} className="hover:bg-muted/50 transition-all">
                          <td className="px-4 py-3">
                            <div className="font-medium max-w-48 truncate">{s.title}</div>
                            <div className="text-xs text-muted-foreground">{s.location}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{s.category}</td>
                          <td className="px-4 py-3 font-semibold text-primary">{s.price_display || formatMK(s.price)}</td>
                          <td className="px-4 py-3">
                            {s.is_featured && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">⭐ Featured</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Link href={`/services/${s.id}`} className="p-1 hover:bg-muted rounded transition-all">
                                <Eye size={14} className="text-muted-foreground" />
                              </Link>
                              <button
                                onClick={() => featureService(s.id, !s.is_featured)}
                                className={`text-xs px-2 py-1 rounded transition-all ${s.is_featured ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-muted hover:bg-amber-100 text-muted-foreground hover:text-amber-700"}`}
                              >
                                {s.is_featured ? "Unfeature" : "⭐ Feature"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Reports */}
          {tab === "reports" && (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Shield size={48} className="text-muted-foreground mx-auto mb-3 opacity-30" />
              <h3 className="font-bold mb-1">User Reports</h3>
              <p className="text-muted-foreground text-sm">User reports and moderation queue will appear here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
