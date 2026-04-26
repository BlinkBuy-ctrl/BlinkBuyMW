import { Link } from "wouter";
import { MapPin, Star, MessageCircle, CheckCircle, Award, Zap } from "lucide-react";
import { formatMK } from "@/lib/auth";

interface Worker {
  id: string; name: string; profilePhoto?: string;
  isVerified?: boolean; isTrusted?: boolean; isBoosted?: boolean; badge?: string;
  whatsapp?: string; phone?: string; isOnline?: boolean;
}
interface Service {
  id: string; title: string; description?: string;
  category?: string; priceType?: string;
  price?: number; priceDisplay?: string;
  location: string; rating?: number; reviewCount?: number;
  isFeatured?: boolean; isOnline?: boolean; worker?: Worker;
}

const AVATAR_COLORS = [
  "from-blue-400 to-blue-600", "from-purple-400 to-purple-600",
  "from-green-400 to-green-600", "from-orange-400 to-orange-600",
  "from-pink-400 to-pink-600", "from-teal-400 to-teal-600",
];

function colorFor(name: string) {
  const i = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

export function ServiceCard({ service }: { service: Service }) {
  const w = service.worker;
  const avatarGrad = colorFor(w?.name || "");

  return (
    <div className={`group bg-card border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${service.isFeatured ? "border-primary/40 shadow-primary/5 shadow-md" : "border-card-border"}`}>
      {service.isFeatured && (
        <div className="bg-gradient-to-r from-primary to-[hsl(210,100%,45%)] text-primary-foreground text-xs font-black px-3 py-1 text-center tracking-wide uppercase">
          ⭐ Featured Listing
        </div>
      )}

      <div className="p-4">
        {/* Worker row */}
        {w && (
          <div className="flex items-center gap-2 mb-3">
            <div className="relative shrink-0">
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-sm font-black text-white overflow-hidden`}>
                {w.profilePhoto
                  ? <img src={w.profilePhoto} alt={w.name} className="w-full h-full object-cover" />
                  : w.name?.charAt(0)}
              </div>
              {(w.isOnline || service.isOnline) && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold truncate">{w.name}</span>
                {w.isBoosted && <span title="Boosted">⚡</span>}
                {w.isVerified && <CheckCircle size={11} className="text-primary shrink-0" />}
                {w.isTrusted && <Award size={11} className="text-amber-500 shrink-0" />}
                {w.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">{w.badge}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin size={9} /><span className="truncate">{service.location}</span>
              </div>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${service.isOnline ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
              {service.isOnline ? "Online" : "Offline"}
            </span>
          </div>
        )}

        {/* Title */}
        <Link href={`/services/${service.id}`}>
          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2 leading-snug">
            {service.title}
          </h3>
        </Link>

        {/* Description */}
        {service.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{service.description}</p>
        )}

        {/* Rating */}
        {(service.rating ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={10} className={s <= Math.round(service.rating!) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"} />
              ))}
            </div>
            <span className="text-xs font-semibold">{service.rating?.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({service.reviewCount || 0})</span>
          </div>
        )}

        {/* Price + CTA */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-border/50">
          <div>
            <div className="text-xs text-muted-foreground">From</div>
            <div className="text-sm font-black text-primary">
              {service.priceDisplay || formatMK(service.price)}
            </div>
          </div>
          <div className="flex gap-1.5">
            {w?.whatsapp && (
              <a href={`https://wa.me/265${w.whatsapp.replace(/^0/, "")}`}
                target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-all"
                title="WhatsApp" onClick={e => e.stopPropagation()}>
                <MessageCircle size={13} />
              </a>
            )}
            <Link href={`/services/${service.id}`}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all">
              Book
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
