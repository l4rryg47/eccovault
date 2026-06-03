import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useSupportModal } from "@/components/SupportContactModal";

const CTASection = () => {
  const { openSupport } = useSupportModal();

  return (
    <section className="relative overflow-hidden bg-background py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="container relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="mx-auto max-w-3xl font-display text-3xl font-bold md:text-5xl">
            Ready to take control of your{" "}
            <span className="text-gradient">financial future</span>?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Join over 2 million people who trust Eccovault with their money. Open your
            account in under 5 minutes.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild variant="hero" size="lg" className="gap-2 px-10 text-base">
              <Link to="/register">
                Open Free Account <ArrowRight size={18} />
              </Link>
            </Button>
            <Button
              variant="heroOutline"
              size="lg"
              className="px-10 text-base"
              onClick={() => openSupport({ subject: "Talk to Sales" })}
            >
              Talk to Sales
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            No minimum deposit · No monthly fees · Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;

