import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { MapPin, Star, CheckCircle, Award, MessageCircle, Phone, ArrowLeft } from "lucide-react";
import { api, getOrCreateConversation } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatMK } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function ServiceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [service, setService] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingMsg, setBookingMsg] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);

  const handleMessage = async () => {
    if (!user) { setLocation("/login"); return; }
    if (!service?.worker?.id) return;
    setMsgLoading(true);
    try {
      const convId = await getOrCreateConversation(service.worker.id);
      setLocation(`/messages?conv=${convId}`);
    } catch (e: any) {
      alert(e.message || "Failed to open conversation");
    } finally { setMsgLoading(false); }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [svcData, rvData] = await Promise.all([
          api.get(`/services/${id}`),
          api.get(`/services/${id}/reviews`),
        ]);
        const svc = svcData.service || svcData;
        // Ensure worker.id is always available (Supabase may return profiles nested)
        if (svc && svc.worker && !svc.worker.id && svc.profiles?.id) {
          svc.worker = { ...svc.worker, id: svc.profiles.id };
        }
        setService(svc);
        setReviews(Array.isArray(rvData) ? rvData : (rvData.reviews || []));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const handleBook = async () => {
    if (!user) { setLocation("/login"); return; }
    if (!service?.worker?.id) return;
    setBookingLoading(true);
    try {
      // Save booking to DB
      const { error } = await supabase
        .from("bookings")
        .insert({
          service_id: id,
          user_id: user.id,
          message: bookingMsg,
          status: "pending",
        });
      if (error) throw new Error(error.message);

      setShowBooking(false);

      // Open chat with the worker immediately
      const convId = await getOrCreateConversation(service.worker.id);
      // Send booking message into the chat
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        content: `📅 Booking Request: ${bookingMsg || "I would like to book your service."}`,
      });
      setLocation(`/messages?conv=${convId}`);
    } catch (e: any) {
      alert(e.message || "Failed to send booking");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold mb-2">Service not found</h2>
        <Link href="/services" className="text-primary hover:underline">Browse all services</Link>
      </div>
    );
  }

  const worker = service.worker;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/services" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-all">
        <ArrowLeft size={14} /> Back to Services
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-card border border-card-border rounded-xl p-5">
            {service.is_featured && (
              <span className="inline-flex bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full mb-3">
                ⭐ Featured
              </span>
            )}
            <h1 className="text-xl font-black text-foreground mb-2">{service.title}</h1>
            <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1"><MapPin size={13} />{service.location}</div>
              {service.category && <span className="bg-muted px-2 py-0.5 rounded-full text-xs">{service.category}</span>}
              {service.is_online && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Available Now</span>}
            </div>
            {service.rating > 0 && (
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={14} className={s <= Math.round(service.rating) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"} />
                ))}
                <span className="text-sm font-semibold">{service.rating?.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({service.review_count || reviews.length} reviews)</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
          </div>

          {service.tags && service.tags.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-bold mb-2">Skills & Tags</h3>
              <div className="flex flex-wrap gap-2">
                {service.tags.map((tag: string) => (
                  <span key={tag} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card border border-card-border rounded-xl p-5">
            <h3 className="text-base font-bold mb-4">Reviews ({reviews.length})</h3>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet. Be the first to book!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {review.reviewer?.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{review.reviewer?.name || "Anonymous"}</div>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={10} className={s <= review.rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"} />
                          ))}
                        </div>
                      </div>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-card-border rounded-xl p-5 sticky top-20">
            <div className="text-2xl font-black text-primary mb-1">
              {service.price_display || formatMK(service.price)}
            </div>
            <div className="text-xs text-muted-foreground mb-4">
              {service.price_type === "hourly" ? "per hour" :
               service.price_type === "daily" ? "per day" :
               service.price_type === "negotiable" ? "Negotiable" : "fixed price"}
            </div>

            <button
              onClick={() => { if (!user) { setLocation("/login"); } else setShowBooking(true); }}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all mb-3"
            >
              📅 Book This Service
            </button>

            <button
              onClick={handleMessage}
              disabled={msgLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all mb-2 disabled:opacity-60"
            >
              <MessageCircle size={15} /> {msgLoading ? "Opening..." : `Message ${worker?.name?.split(" ")[0] || "Worker"}`}
            </button>

            {worker?.whatsapp && (
              <a
                href={`https://wa.me/265${worker.whatsapp.replace(/^0/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 transition-all mb-2"
              >
                <MessageCircle size={15} /> Chat on WhatsApp
              </a>
            )}
            {worker?.phone && (
              <a
                href={`tel:${worker.phone}`}
                className="w-full flex items-center justify-center gap-2 border border-border py-2.5 rounded-xl text-sm hover:bg-muted transition-all"
              >
                <Phone size={15} /> Call {worker?.name?.split(" ")[0]}
              </a>
            )}
          </div>

          {worker && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h3 className="text-sm font-bold mb-3">About the Worker</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary overflow-hidden">
                    {worker.profile_photo
                      ? <img src={worker.profile_photo} alt={worker.name} className="w-full h-full object-cover" />
                      : worker.name?.charAt(0)
                    }
                  </div>
                  {worker.is_online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-1">
                    {worker.name}
                    {worker.is_verified && <CheckCircle size={13} className="text-primary" />}
                    {worker.badge && <span className="text-xs text-amber-600">🏅 {worker.badge}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} />{worker.location}</div>
                </div>
              </div>
              {worker.bio && <p className="text-xs text-muted-foreground mb-3">{worker.bio}</p>}
              {worker.jobs_completed > 0 && (
                <div className="text-xs text-muted-foreground mb-3">{worker.jobs_completed} jobs completed</div>
              )}
              <Link
                href={`/profile/${worker.id}`}
                className="w-full block text-center text-sm text-primary border border-primary/30 py-2 rounded-lg hover:bg-primary/5 transition-all"
              >
                View Full Profile
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Booking modal */}
      {showBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setShowBooking(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-black mb-1">Book Service</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Describe your needs to <strong>{worker?.name}</strong> — you'll be taken to chat with them directly.
            </p>
            <textarea
              value={bookingMsg}
              onChange={e => setBookingMsg(e.target.value)}
              placeholder="Describe what you need, when, and any specific requirements..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowBooking(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-all">Cancel</button>
              <button
                onClick={handleBook}
                disabled={bookingLoading || !bookingMsg.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {bookingLoading ? "Sending..." : "Send & Open Chat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
