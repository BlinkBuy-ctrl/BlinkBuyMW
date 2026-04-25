import { Link } from "wouter";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-8xl font-black text-primary/10 mb-4">404</div>
      <h1 className="text-2xl font-black text-foreground mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-6 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3">
        <button onClick={() => history.back()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-all">
          <ArrowLeft size={15} /> Go Back
        </button>
        <Link href="/" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all">
          <Home size={15} /> Home
        </Link>
      </div>
    </div>
  );
}
