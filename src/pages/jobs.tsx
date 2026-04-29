import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, MapPin, Clock, Briefcase, DollarSign, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatMK } from "@/lib/auth";

const CITIES = ["All Locations", "Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Kasungu", "Mangochi", "Dedza"];
const JOB_TYPES = ["All Types", "Full-time", "Part-time", "Contract", "Freelance", "One-time Task"];

export default function JobsPage() {
  const { user, profile } = useAuth();
  const [, setLocation] = useLocation();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loc, setLoc] = useState("All Locations");
  const [jobType, setJobType] = useState("All Types");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Reset page to 1 whenever filters change (not when page itself changes)
  const isFirstRender = useRef(true);
  const prevFilters = useRef({ search, loc, jobType });

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const prev = prevFilters.current;
    if (prev.search !== search || prev.loc !== loc || prev.jobType !== jobType) {
      prevFilters.current = { search, loc, jobType };
      setPage(1);
    }
  }, [search, loc, jobType]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const qp = new URLSearchParams();
        if (search) qp.set("search", search);
        if (loc !== "All Locations") qp.set("location", loc);
        if (jobType !== "All Types") qp.set("type", jobType);
        qp.set("page", String(page));
        qp.set("limit", "10");
        const data = await api.get(`/jobs?${qp.toString()}`);
        if (mounted) {
          setJobs(data.jobs || []);
          setTotal(data.total || 0);
        }
      } catch (e) {
        console.error(e);
        if (mounted) {
          setJobs([]);
          setTotal(0);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [search, loc, jobType, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    // useEffect re-triggers automatically via state deps
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground mb-1">Find Work</h1>
          <p className="text-muted-foreground text-sm">Browse jobs posted by customers across Malawi</p>
        </div>
        {user && (profile?.role === "customer" || profile?.role === "both" || profile?.role === "admin") && (
          <Link
            href="/post-job"
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
          >
            + Post a Job
          </Link>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="bg-card border border-card-border rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-2">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="flex-1 text-sm outline-none bg-transparent"
            />
          </div>
          <select
            value={loc}
            onChange={e => setLoc(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none sm:w-36"
          >
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select
            value={jobType}
            onChange={e => setJobType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none sm:w-36"
          >
            {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
          >
            Search
          </button>
        </div>
      </form>

      {/* Job list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-3" />
              <div className="h-3 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase size={48} className="text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-lg font-bold mb-1">No jobs found</h3>
          <p className="text-muted-foreground text-sm mb-4">Be the first to post a job!</p>
          {user && (
            <Link
              href="/post-job"
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
            >
              Post a Job
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <div className="bg-card border border-card-border rounded-xl p-5 hover:border-primary hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground">{job.title}</h3>
                      {job.isUrgent && (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{job.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><MapPin size={11} />{job.location}</div>
                      <div className="flex items-center gap-1"><Briefcase size={11} />{job.type || "Any type"}</div>
                      {job.budget && (
                        <div className="flex items-center gap-1 text-primary font-semibold">
                          <DollarSign size={11} />{formatMK(job.budget)}
                        </div>
                      )}
                      <div className="flex items-center gap-1"><Clock size={11} />{getTimeAgo(job.createdAt)}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">{job.applicationCount || 0} applicants</div>
                    <ChevronRight size={16} className="text-muted-foreground mt-2 ml-auto" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {total > 10 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / 10)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 10)}
            className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}