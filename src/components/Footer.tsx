import { Link } from "react-router-dom";
import { footerLinks } from "@/lib/publicPages";

const Footer = () => {
  return (
    <footer className="border-t border-border/30 bg-background py-16">
      <div className="container">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-1">
            <Link to="/" className="font-display text-xl font-bold text-foreground">
              Eccovault<span className="text-primary">.</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Banking built for the modern world.
            </p>
          </div>
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 text-sm font-semibold text-foreground">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 md:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Eccovault Financial, Inc. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            FDIC Insured · Equal Housing Lender · NMLS #1234567
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

