import { supabase } from "./supabase";

const LANG_KEY = "blinkbuy_lang";
const THEME_KEY = "blinkbuy_theme";

// Keep user interface for compatibility
export interface StoredUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  role: "customer" | "worker" | "both" | "admin";
  location?: string;
  profilePhoto?: string;
  bio?: string;
  isOnline?: boolean;
  isVerified?: boolean;
  isTrusted?: boolean;
  rating?: number;
  reviewCount?: number;
  jobsCompleted?: number;
  profileStrength?: number;
}

export function isAdmin(user: any): boolean {
  if (!user) return false;
  return user.role === "admin" || user.email === "otechy8@gmail.com";
}

/**
 * Sign in with Google via Supabase OAuth.
 * The user will be redirected to Google, then back to `redirectTo`.
 *
 * Prerequisites in Supabase dashboard:
 *  1. Auth → Providers → Google → toggle ON
 *  2. Paste your Google OAuth Client ID and Secret
 *  3. Add your app's redirect URL to the Google Cloud Console
 *     (e.g. https://your-project-ref.supabase.co/auth/v1/callback)
 */
export async function signInWithGoogle(): Promise<void> {
  // Change this URL to your production domain when deploying:
  const redirectTo = `${window.location.origin}/`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        // Optional: force account picker so users can switch Google accounts
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw new Error(error.message || "Google sign-in failed. Please try again.");
  }
  // On success Supabase redirects the browser automatically — no further action needed here.
}

export function getLanguage(): "en" | "ny" {
  return (localStorage.getItem(LANG_KEY) as "en" | "ny") || "en";
}

export function setLanguage(lang: "en" | "ny") {
  localStorage.setItem(LANG_KEY, lang);
}

export function getTheme(): "light" | "dark" {
  return (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light";
}

export function setTheme(theme: "light" | "dark") {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function formatMK(amount: number | null | undefined): string {
  if (!amount) return "Negotiable";
  return `MK ${amount.toLocaleString()}`;
}

export const TRANSLATIONS: Record<string, Record<"en" | "ny", string>> = {
  "Home": { en: "Home", ny: "Kwathu" },
  "Find Work": { en: "Find Work", ny: "Peza Ntchito" },
  "Marketplace": { en: "Marketplace", ny: "Msika" },
  "Messages": { en: "Messages", ny: "Mauthenga" },
  "Login": { en: "Login", ny: "Lowani" },
  "Register": { en: "Register", ny: "Lembani" },
  "Search services...": { en: "Search services...", ny: "Sakani ntchito..." },
  "Get Help Now": { en: "Get Help Now", ny: "Thandizani Tsopano" },
  "Book": { en: "Book", ny: "Bookani" },
  "Apply": { en: "Apply", ny: "Yankani" },
  "Price": { en: "Price", ny: "Ngongole" },
  "Location": { en: "Location", ny: "Malo" },
  "Hello": { en: "Hello", ny: "Moni" },
  "Available": { en: "Available", ny: "Adyera" },
  "Offline": { en: "Offline", ny: "Palibe Intaneti" },
};

export function t(key: string, lang: "en" | "ny" = "en"): string {
  return TRANSLATIONS[key]?.[lang] || key;
}
