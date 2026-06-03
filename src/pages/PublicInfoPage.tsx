import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronRight, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicPage, PublicPageLayout } from "@/lib/publicPages";

type PublicInfoPageProps = {
  page: PublicPage;
};

const layoutStyles: Record<PublicPageLayout, { shell: string; hero: string; image: string; panel: string }> = {
  consumer: {
    shell: "bg-gradient-hero",
    hero: "md:grid-cols-[0.95fr_1.05fr]",
    image: "aspect-[4/3] rounded-tl-[4rem]",
    panel: "bg-gradient-card",
  },
  business: {
    shell: "bg-background",
    hero: "md:grid-cols-[1.1fr_0.9fr]",
    image: "aspect-[5/4] rounded-br-[4rem]",
    panel: "bg-muted/30",
  },
  cards: {
    shell: "bg-gradient-hero",
    hero: "md:grid-cols-[0.9fr_1.1fr]",
    image: "aspect-[16/10] rounded",
    panel: "bg-primary/10",
  },
  company: {
    shell: "bg-background",
    hero: "md:grid-cols-[1fr_1fr]",
    image: "aspect-[3/4] rounded-t-[5rem]",
    panel: "bg-gradient-card",
  },
  process: {
    shell: "bg-muted/20",
    hero: "md:grid-cols-[1.05fr_0.95fr]",
    image: "aspect-[4/3] rounded-bl-[4rem]",
    panel: "bg-background",
  },
  product: {
    shell: "bg-gradient-hero",
    hero: "md:grid-cols-[1fr_1fr]",
    image: "aspect-[4/3] rounded-r-[4rem]",
    panel: "bg-gradient-card",
  },
  wealth: {
    shell: "bg-background",
    hero: "md:grid-cols-[0.9fr_1.1fr]",
    image: "aspect-[16/9] rounded-tl-[4rem] rounded-br-[4rem]",
    panel: "bg-primary/5",
  },
  protection: {
    shell: "bg-muted/20",
    hero: "md:grid-cols-[1.1fr_0.9fr]",
    image: "aspect-[1/1] rounded-full",
    panel: "bg-background",
  },
  people: {
    shell: "bg-background",
    hero: "md:grid-cols-[0.95fr_1.05fr]",
    image: "aspect-[16/10] rounded-b-[4rem]",
    panel: "bg-gradient-card",
  },
  media: {
    shell: "bg-gradient-hero",
    hero: "md:grid-cols-[1.15fr_0.85fr]",
    image: "aspect-[4/5] rounded-tr-[4rem]",
    panel: "bg-background/80",
  },
  journal: {
    shell: "bg-background",
    hero: "md:grid-cols-[0.85fr_1.15fr]",
    image: "aspect-[16/9] rounded-t-[3rem]",
    panel: "bg-muted/30",
  },
  legal: {
    shell: "bg-muted/20",
    hero: "md:grid-cols-[1.05fr_0.95fr]",
    image: "aspect-[4/3] rounded",
    panel: "bg-background",
  },
  policy: {
    shell: "bg-gradient-hero",
    hero: "md:grid-cols-[0.95fr_1.05fr]",
    image: "aspect-[5/4] rounded-l-[4rem]",
    panel: "bg-gradient-card",
  },
  compliance: {
    shell: "bg-background",
    hero: "md:grid-cols-[1fr_1fr]",
    image: "aspect-[4/3] rounded-tr-[4rem] rounded-bl-[4rem]",
    panel: "bg-muted/30",
  },
  support: {
    shell: "bg-muted/20",
    hero: "md:grid-cols-[1.1fr_0.9fr]",
    image: "aspect-[16/10] rounded",
    panel: "bg-background",
  },
  security: {
    shell: "bg-background",
    hero: "md:grid-cols-[0.9fr_1.1fr]",
    image: "aspect-[4/3] rounded-br-[4rem]",
    panel: "bg-primary/5",
  },
  status: {
    shell: "bg-gradient-hero",
    hero: "md:grid-cols-[1fr_1fr]",
    image: "aspect-[16/10] rounded-bl-[4rem]",
    panel: "bg-background/80",
  },
  developer: {
    shell: "bg-background",
    hero: "md:grid-cols-[1fr_1fr]",
    image: "aspect-[4/3] rounded-tl-[4rem]",
    panel: "bg-[#07111f]",
  },
};

const renderSpecialPanel = (page: PublicPage) => {
  const Icon = page.icon;

  if (page.layout === "developer") {
    return (
      <div className="rounded border border-primary/20 bg-[#07111f] p-5 font-mono text-sm text-slate-100 shadow-card">
        <p className="text-primary">GET /v1/accounts/:id</p>
        <div className="mt-4 space-y-2 text-slate-300">
          <p>{`{`}</p>
          <p className="pl-4">"balance": "$24,620.44",</p>
          <p className="pl-4">"status": "active",</p>
          <p className="pl-4">"webhooks": ["transaction.created"]</p>
          <p>{`}`}</p>
        </div>
      </div>
    );
  }

  if (page.layout === "status") {
    return (
      <div className="rounded border border-border/50 bg-background/90 p-5 shadow-card">
        {["Core banking", "Cards", "Transfers", "Support"].map((item) => (
          <div key={item} className="flex items-center justify-between border-b border-border/30 py-3 last:border-b-0">
            <span className="text-sm text-foreground">{item}</span>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Operational</span>
          </div>
        ))}
      </div>
    );
  }

  if (page.layout === "support") {
    return (
      <div className="rounded border border-border/50 bg-background p-5 shadow-card">
        <div className="flex items-center gap-3 rounded border border-border/40 bg-muted/40 px-4 py-3 text-muted-foreground">
          <Search size={18} />
          Search help articles, cards, transfers, security
        </div>
        <div className="mt-4 grid gap-3">
          {page.sections.map((section) => (
            <div key={section.title} className="flex items-center justify-between rounded border border-border/30 p-3">
              <span className="text-sm font-medium text-foreground">{section.title}</span>
              <ChevronRight size={16} className="text-primary" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded border border-border/50 p-6 shadow-card", layoutStyles[page.layout].panel)}>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon size={28} />
      </div>
      <div className="space-y-4">
        {page.highlights.map((highlight) => (
          <div key={highlight} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={18} />
            <p className="text-sm leading-relaxed text-muted-foreground">{highlight}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const renderDetailSection = (page: PublicPage) => {
  if (page.layout === "process") {
    return (
      <section className="border-b border-border/30 bg-background py-16">
        <div className="container">
          <div className="relative grid gap-5 md:grid-cols-3">
            {page.sections.map((section, index) => (
              <div key={section.title} className="rounded border border-border/40 bg-gradient-card p-6">
                <p className="font-display text-5xl font-bold text-primary/30">0{index + 1}</p>
                <h2 className="mt-6 font-display text-xl font-semibold text-foreground">{section.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (["legal", "policy", "compliance"].includes(page.layout)) {
    return (
      <section className="border-b border-border/30 bg-background py-16">
        <div className="container grid gap-8 lg:grid-cols-[0.32fr_0.68fr]">
          <aside className="rounded border border-border/40 bg-muted/20 p-5">
            <p className="text-sm font-semibold text-primary">Document sections</p>
            <div className="mt-4 space-y-2">
              {page.sections.map((section) => (
                <a key={section.title} href={`#${section.title}`} className="block rounded px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-foreground">
                  {section.title}
                </a>
              ))}
            </div>
          </aside>
          <div className="space-y-5">
            {page.sections.map((section) => (
              <article key={section.title} id={section.title} className="rounded border border-border/40 bg-gradient-card p-6">
                <h2 className="font-display text-2xl font-semibold text-foreground">{section.title}</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{section.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (["media", "journal", "people"].includes(page.layout)) {
    return (
      <section className="border-b border-border/30 bg-background py-16">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded border border-border/40 bg-gradient-card p-8">
              <p className="text-sm font-semibold text-primary">{page.eyebrow}</p>
              <h2 className="mt-4 font-display text-3xl font-bold text-foreground">{page.sections[0].title}</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">{page.sections[0].body}</p>
            </article>
            <div className="grid gap-6">
              {page.sections.slice(1).map((section) => (
                <article key={section.title} className="rounded border border-border/40 bg-muted/20 p-6">
                  <h3 className="font-display text-xl font-semibold text-foreground">{section.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-border/30 bg-background py-16">
      <div className="container">
        <div className="grid gap-6 md:grid-cols-3">
          {page.sections.map((section, index) => (
            <article
              key={section.title}
              className={cn(
                "rounded border border-border/40 p-6",
                index === 1 ? "bg-gradient-card shadow-card" : "bg-muted/20",
              )}
            >
              <p className="text-sm font-semibold text-primary">0{index + 1}</p>
              <h2 className="mt-4 font-display text-xl font-semibold text-foreground">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

const PublicInfoPage = ({ page }: PublicInfoPageProps) => {
  const Icon = page.icon;
  const styles = layoutStyles[page.layout];
  const imageFirst = ["consumer", "cards", "wealth", "people", "journal", "policy", "security"].includes(page.layout);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <section className={cn("relative overflow-hidden border-b border-border/30", styles.shell)}>
          <div className="pointer-events-none absolute inset-0 bg-glow" />
          <div className={cn("container relative grid min-h-[72vh] items-center gap-10 py-20 md:py-28", styles.hero)}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className={cn(imageFirst && "md:order-2")}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
                <Icon size={15} />
                {page.eyebrow}
              </div>
              <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight md:text-6xl">
                {page.title}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {page.summary}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="hero" size="lg" className="gap-2">
                  <Link to="/register">
                    Open Free Account <ArrowRight size={18} />
                  </Link>
                </Button>
                <Button asChild variant="heroOutline" size="lg">
                  <Link to="/how-it-works">See How It Works</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.12 }}
              className="relative"
            >
              <div className={cn("overflow-hidden border border-border/50 shadow-card", styles.image)}>
                <img src={page.image} alt={page.imageAlt} className="h-full w-full object-cover" />
              </div>
              <div className="absolute -bottom-8 left-4 right-4 md:left-auto md:right-6 md:w-[78%]">
                {renderSpecialPanel(page)}
              </div>
            </motion.div>
          </div>
        </section>

        {page.stats && (
          <section className="border-b border-border/30 bg-muted/20 py-12">
            <div className="container grid gap-4 md:grid-cols-3">
              {page.stats.map((stat) => (
                <div key={`${stat.value}-${stat.label}`} className="rounded border border-border/40 bg-background p-5 text-center">
                  <p className="font-display text-3xl font-bold text-gradient">{stat.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {renderDetailSection(page)}

        {page.actions && (
          <section className="bg-background py-16">
            <div className="container">
              <div className="grid gap-5 md:grid-cols-3">
                {page.actions.map((action, index) => (
                  <div key={action} className="group rounded border border-border/40 bg-gradient-card p-5 transition-all hover:border-primary/40 hover:shadow-card">
                    <p className="text-sm font-semibold text-primary">Action {index + 1}</p>
                    <p className="mt-2 font-display text-lg font-semibold text-foreground">{action}</p>
                    <ArrowRight className="mt-5 text-primary transition-transform group-hover:translate-x-1" size={18} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PublicInfoPage;
