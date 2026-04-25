import { Link } from "wouter";
import { ArrowLeft, Info, Globe, MessageCircle, Mail, Code2 } from "lucide-react";

const TEAM = [
  { name: "Peter Mlandula", title: "Lead Developer & Founder" },
  { name: "Theodora Liva", title: "Developer & Marketing" },
  { name: "Elisha Mkango", title: "Developer & Tester" },
  { name: "Elijah Mkango", title: "Developer & Creative Design" },
];

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-black mx-auto mb-3 shadow"
      style={{ background: `hsl(${hue}, 55%, 45%)` }}
    >
      {initials}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 hover:bg-muted rounded-lg transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <Info size={20} className="text-primary" />
          <h1 className="text-2xl font-black">About Us</h1>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-primary rounded-2xl p-8 text-center text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)"
        }} />
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 shadow">
            <span className="text-3xl font-black">B</span>
          </div>
          <h2 className="text-3xl font-black mb-2">BlinkBuy Malawi</h2>
          <p className="text-primary-foreground/80 text-sm mb-6">Malawi's #1 Local Services Marketplace</p>
          <a
            href="https://otechy.tiiny.site"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-primary font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-all shadow"
          >
            <Globe size={15} />
            Visit Our Website
          </a>
        </div>
      </div>

      {/* Mission */}
      <div className="bg-card border border-card-border rounded-2xl p-6">
        <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-wide">Our Mission</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          BlinkBuy Malawi is Malawi's #1 local services marketplace — connecting skilled workers with people who need help across all 28 districts. Whether you need a plumber, electrician, tutor, caterer, or any other service, BlinkBuy makes it easy to find trusted, verified workers near you.
        </p>
      </div>

      {/* Team */}
      <div>
        <h3 className="text-lg font-black mb-1">Meet the Team</h3>
        <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
          <Code2 size={12} />
          Passionate programmers who have just graduated from Zingwangwa Secondary School
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TEAM.map(member => (
            <div
              key={member.name}
              className="bg-card border border-card-border rounded-xl p-4 text-center hover:shadow-md transition-all"
            >
              <Avatar name={member.name} />
              <div className="font-bold text-sm leading-tight">{member.name}</div>
              <div className="text-xs text-muted-foreground mt-1 leading-snug">{member.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-card border border-card-border rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-primary uppercase tracking-wide">Contact Us</h3>
        <a
          href="https://wa.me/265999626944"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-all"
        >
          <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle size={16} className="text-green-600" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">WhatsApp</div>
            <div className="text-sm font-semibold">0999626944</div>
          </div>
        </a>
        <a
          href="mailto:otechy8@gmail.com"
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-all"
        >
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail size={16} className="text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="text-sm font-semibold">otechy8@gmail.com</div>
          </div>
        </a>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-2">
        Built with ❤️ in Malawi by <strong>Otechy</strong> · © {new Date().getFullYear()}
      </p>
    </div>
  );
}
