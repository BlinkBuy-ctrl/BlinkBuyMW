import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { MapPin, Clock, Briefcase, DollarSign, Users, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatMK } from "@/lib/auth";

export default function JobDetailPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [, setLocation] = useLocation();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get(`/jobs/${id}`);
        setJob(data.job || data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const handleApply = async () => {
    if (!user) { setLocation("/login"); return; }
    setApplying(true);
    try {
      await api.post(`/jobs/${id}/apply`, { coverLetter, proposedRate: Number(proposedRate) });
      setApplied(true);
      setShowApply(false);
    } catch (e: any) {
      alert(e.message || "Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-6 bg-muted rounded w-2/3" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-4 bg-muted rounded" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold mb-2">Job not found</h2>
        <Link href="/jobs" className="text-primary hover:underline">Browse all jobs</Link>
      </div>
    );
  }

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  const isWorker = user && (profile?.role === "worker" || profile?.role === "both");

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-all">
        <ArrowLeft size={14} /> Back to Jobs
      </Link>

      <div className="space-y-4">
        {/* Header */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-black">{job.title}</h1>
                {job.isUrgent && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-semibold">Urgent</span>}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><MapPin size={11} />{job.location}</div>
                <div className="flex items-center gap-1"><Briefcase size={11} />{job.type || "Any type"}</div>
                <div className="flex items-center gap-1"><Clock size={11} />{getTimeAgo(job.createdAt)}</div>
                <div className="flex items-center gap-1"><Users size={11} />{job.applicationCount || 0} applicants</div>
              </div>
            </div>
            {job.budget && (
              <div className="text-right shrink-0">
                <div className="text-xs text-muted-foreground">Budget</div>
                <div className="text-lg font-black text-primary">{formatMK(job.budget)}</div>
              </div>
            )}
          </div>

          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p className="whitespace-pre-wrap">{job.description}</p>
          </div>

          {job.skills && job.skills.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-muted-foreground mb-2">Required Skills</div>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((s: string) => (
                  <span key={s} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Posted by */}
        {job.customer && (
          <div className="bg-card border border-card-border rounded-xl p-4">
            <h3 className="text-sm font-bold mb-3">Posted by</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {job.customer.name?.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-sm flex items-center gap-1">
                  {job.customer.name}
                  {job.customer.isVerified && <CheckCircle size={12} className="text-primary" />}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} />{job.customer.location}</div>
              </div>
            </div>
          </div>
        )}

        {/* Apply section */}
        {applied ? (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600 shrink-0" />
            <div>
              <div className="font-semibold text-green-800 dark:text-green-200">Application Submitted!</div>
              <div className="text-sm text-green-700 dark:text-green-300">The customer will review your application and get back to you.</div>
            </div>
          </div>
        ) : isWorker ? (
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h3 className="text-sm font-bold mb-3">Apply for this Job</h3>
            {!showApply ? (
              <button
                onClick={() => setShowApply(true)}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
              >
                Apply Now
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Cover Letter *</label>
                  <textarea
                    value={coverLetter}
                    onChange={e => setCoverLetter(e.target.value)}
                    placeholder="Introduce yourself and explain why you're the best fit..."
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Your Proposed Rate (MK) — optional</label>
                  <input
                    type="number"
                    value={proposedRate}
                    onChange={e => setProposedRate(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowApply(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-all">Cancel</button>
                  <button
                    onClick={handleApply}
                    disabled={applying || !coverLetter.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {applying ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : !user ? (
          <div className="bg-card border border-card-border rounded-xl p-5 text-center">
            <p className="text-sm text-muted-foreground mb-3">You need to be logged in as a worker to apply</p>
            <Link href="/login" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all inline-block">
              Login to Apply
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
