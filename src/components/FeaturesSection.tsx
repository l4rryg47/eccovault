import { motion } from "framer-motion";
import {
  CreditCard,
  Send,
  PiggyBank,
  TrendingUp,
  Globe,
  Lock,
} from "lucide-react";

const features = [
  {
    icon: CreditCard,
    title: "Smart Cards",
    description:
      "Virtual and physical cards with instant controls, spending limits, and real-time notifications.",
  },
  {
    icon: Send,
    title: "Instant Transfers",
    description:
      "Send money globally in seconds — no wire fees, no waiting. Free domestic transfers, always.",
  },
  {
    icon: PiggyBank,
    title: "High-Yield Savings",
    description:
      "Earn 4.5% APY with no minimum balance. Your money works harder while you sleep.",
  },
  {
    icon: TrendingUp,
    title: "Smart Investing",
    description:
      "Automated portfolios, fractional shares, and crypto — invest from $1 with zero commissions.",
  },
  {
    icon: Globe,
    title: "Multi-Currency",
    description:
      "Hold and exchange 30+ currencies at interbank rates. Travel the world without conversion worries.",
  },
  {
    icon: Lock,
    title: "Bank-Grade Security",
    description:
      "Biometric authentication, real-time fraud monitoring, and instant card freeze at your fingertips.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  return (
    <section className="relative border-t border-border/30 bg-background py-24 md:py-32">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="font-display text-3xl font-bold md:text-5xl">
            Everything you need,{" "}
            <span className="text-gradient">nothing you don't</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            A full suite of banking tools designed for the way you actually live and
            spend.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group rounded border border-border/40 bg-gradient-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-card"
            >
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary/20">
                <feature.icon size={24} />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
