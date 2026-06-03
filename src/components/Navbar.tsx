import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, REAUTH_GRACE_MS } from "@/contexts/AuthContext";

const navLinks = [
  { label: "Personal", href: "/personal" },
  { label: "Business", href: "/business" },
  { label: "Cards", href: "/cards" },
  { label: "About", href: "/about" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate  = useNavigate();
  const { user, lastVerified, lock } = useAuth();

  // ── Decide what the "Sign In" button does ─────────────────
  //
  // Three cases:
  //
  // 1. No session            → go to /auth normally (new login / signup)
  // 2. Session + within grace period → go straight to /dashboard (no lock)
  // 3. Session + grace expired (or never verified) → navigate to /dashboard
  //    AND trigger the lock so ReauthModal appears on top of it

  const handleSignIn = () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const withinGrace =
      lastVerified !== null &&
      Date.now() - lastVerified < REAUTH_GRACE_MS;

    if (withinGrace) {
      // Still within the 1-minute window — go straight in
      navigate("/dashboard");
    } else {
      // Grace expired or first return after session restore —
      // navigate to dashboard then immediately show the lock overlay
      navigate("/dashboard");
      lock();
    }
  };

  // Label changes depending on session state
  const signInLabel  = user ? "Go to Dashboard" : "Sign In";
  const signInIcon   = user ? <LayoutDashboard size={14} /> : null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-[linear-gradient(90deg,#ffffff_0%,#e2e8f0_100%)] text-black backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Eccovault logo" className="h-10 w-auto md:h-12" />
          <span className="sr-only">Eccovault</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link key={link.label} to={link.href}
              className="text-sm text-black transition-colors hover:text-black">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignIn}
            className="flex items-center gap-1.5 text-black"
          >
            {signInIcon}
            {signInLabel}
          </Button>
          {!user && (
            <Button variant="hero" size="sm" onClick={() => navigate("/register")} className="text-black">
              Get Started
            </Button>
          )}
        </div>

        <button className="text-black md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border/50 bg-background md:hidden"
          >
            <div className="container flex flex-col gap-4 py-6">
              {navLinks.map((link) => (
                <Link key={link.label} to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-black transition-colors hover:text-black">
                  {link.label}
                </Link>
              ))}
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-black" onClick={handleSignIn}>
                  {signInIcon}{signInLabel}
                </Button>
                {!user && (
                  <Button variant="hero" size="sm" className="flex-1 text-black" onClick={() => navigate("/register")}>
                    Get Started
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;

