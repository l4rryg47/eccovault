import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-hero pt-16">
      {/* Glow effect */}
      <div className="pointer-events-none absolute inset-0 bg-glow" />

      <div className="container relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary"
        >
          <Zap size={14} />
          Banking reimagined for the digital age
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-4xl font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl"
        >
          Your money deserves{" "}
          <span className="text-gradient">a smarter home</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
        >
          Open an account in minutes. Send, spend, save, and invest — all from one
          beautifully designed platform. No hidden fees, ever.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <Button asChild variant="hero" size="lg" className="gap-2 px-8 text-base">
            <Link to="/register">
              Open Your Account <ArrowRight size={18} />
            </Link>
          </Button>
          <Button asChild variant="heroOutline" size="lg" className="px-8 text-base">
            <Link to="/how-it-works">See How It Works</Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-16 flex items-center gap-6 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            FDIC Insured
          </div>
          <div className="h-4 w-px bg-border" />
          <span>256-bit encryption</span>
          <div className="h-4 w-px bg-border" />
          <span>SOC 2 Certified</span>
        </motion.div>

        {/* Floating card mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-16 w-full max-w-3xl"
        >
          <div className="animate-float rounded border border-border/50 bg-gradient-card p-6 shadow-card backdrop-blur-sm md:p-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="mt-1 font-display text-4xl font-bold text-foreground md:text-5xl">
                  $124,563<span className="text-primary">.82</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  +12.4%
                </span>
                <span className="text-xs text-muted-foreground">this month</span>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { label: "Checking", amount: "$45,230.50" },
                { label: "Savings", amount: "$67,100.00" },
                { label: "Investment", amount: "$12,233.32" },
              ].map((account) => (
                <div
                  key={account.label}
                  className="rounded border border-border/30 bg-muted/30 p-4"
                >
                  <p className="text-xs text-muted-foreground">{account.label}</p>
                  <p className="mt-1 font-display text-sm font-semibold text-foreground md:text-base">
                    {account.amount}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
