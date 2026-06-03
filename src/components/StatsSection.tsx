import { motion } from "framer-motion";

const stats = [
  { value: "2M+", label: "Active Users" },
  { value: "$18B", label: "Assets Managed" },
  { value: "150+", label: "Countries" },
  { value: "4.9★", label: "App Store Rating" },
];

const StatsSection = () => {
  return (
    <section className="border-y border-border/30 bg-muted/30 py-16 md:py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 gap-8 md:grid-cols-4"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <p className="font-display text-3xl font-bold text-gradient md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default StatsSection;
