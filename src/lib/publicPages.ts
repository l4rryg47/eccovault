import {
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  CircleHelp,
  Code2,
  Cookie,
  CreditCard,
  FileBadge,
  FileText,
  HeartHandshake,
  Landmark,
  LockKeyhole,
  Newspaper,
  Scale,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

export type PublicPageLayout =
  | "consumer"
  | "business"
  | "cards"
  | "company"
  | "process"
  | "product"
  | "wealth"
  | "protection"
  | "people"
  | "media"
  | "journal"
  | "legal"
  | "policy"
  | "compliance"
  | "support"
  | "security"
  | "status"
  | "developer";

export type PublicPage = {
  path: string;
  title: string;
  eyebrow: string;
  summary: string;
  image: string;
  imageAlt: string;
  highlights: string[];
  sections: { title: string; body: string }[];
  stats?: { value: string; label: string }[];
  actions?: string[];
  icon: typeof Landmark;
  layout: PublicPageLayout;
};

const imageBase = "?auto=format&fit=crop&w=1200&q=80";

export const publicPages: PublicPage[] = [
  {
    path: "/personal",
    title: "Personal Banking",
    eyebrow: "Personal",
    summary: "A calmer home for everyday money: checking, savings, transfers, cards, and spending clarity in one place.",
    image: `https://images.unsplash.com/photo-1554224155-6726b3ff858f${imageBase}`,
    imageAlt: "A person reviewing personal finances at a desk",
    highlights: ["No monthly maintenance fees", "Instant domestic transfers", "Savings goals built into every account"],
    sections: [
      { title: "Daily banking", body: "Use Eccovault for direct deposit, bill payments, card spending, and simple account organization without jumping between disconnected tools." },
      { title: "Money visibility", body: "Balance snapshots, transaction history, and category insights help you understand where money is going before decisions become stressful." },
      { title: "Practical savings", body: "Create separate goals for travel, emergencies, rent, school, or major purchases while keeping your funds easy to track." },
    ],
    stats: [{ value: "$0", label: "monthly fees" }, { value: "24/7", label: "account access" }, { value: "4.9", label: "customer rating" }],
    actions: ["Open a checking account", "Build a savings goal", "Track spending in real time"],
    icon: WalletCards,
    layout: "consumer",
  },
  {
    path: "/business",
    title: "Business Banking",
    eyebrow: "Business",
    summary: "Accounts, team cards, and cash-flow workflows for founders, operators, contractors, and growing teams.",
    image: `https://images.unsplash.com/photo-1556761175-b413da4baf72${imageBase}`,
    imageAlt: "Business team reviewing financial work together",
    highlights: ["Dedicated business accounts", "Team card controls", "Clean cash-flow visibility"],
    sections: [
      { title: "Separate operating money", body: "Keep business income, expenses, payroll, subscriptions, and taxes organized away from personal spending." },
      { title: "Control team spend", body: "Issue cards for staff or contractors, set clear limits, and monitor activity before small expenses become accounting puzzles." },
      { title: "Move faster", body: "Use one dashboard for deposits, transfers, balances, cards, and finance tasks that usually live in separate systems." },
    ],
    stats: [{ value: "10 min", label: "to apply" }, { value: "Real-time", label: "activity alerts" }, { value: "Team", label: "card controls" }],
    actions: ["Separate business finances", "Issue employee cards", "Review activity from one dashboard"],
    icon: BriefcaseBusiness,
    layout: "business",
  },
  {
    path: "/cards",
    title: "Eccovault Cards",
    eyebrow: "Cards",
    summary: "Physical and virtual cards with instant controls, visibility, limits, and safer online payments.",
    image: `https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1${imageBase}`,
    imageAlt: "A payment card being used for a purchase",
    highlights: ["Freeze or unfreeze cards instantly", "Set spend limits by card", "Create virtual cards for online payments"],
    sections: [
      { title: "Spend with context", body: "Every card purchase lands with merchant, time, and account details so you can recognize activity quickly." },
      { title: "Safer online checkout", body: "Use virtual cards for subscriptions, trials, and online purchases where you want more control." },
      { title: "Instant response", body: "Freeze a card the moment something looks wrong, then unfreeze it when everything checks out." },
    ],
    stats: [{ value: "Instant", label: "card freeze" }, { value: "Virtual", label: "online cards" }, { value: "Limit", label: "per card" }],
    actions: ["Create a virtual card", "Manage card limits", "Monitor transactions instantly"],
    icon: CreditCard,
    layout: "cards",
  },
  {
    path: "/about",
    title: "About Eccovault",
    eyebrow: "Company",
    summary: "Eccovault exists to make modern banking feel clear, fast, and trustworthy without burying people in complexity.",
    image: `https://images.unsplash.com/photo-1497366754035-f200968a6e72${imageBase}`,
    imageAlt: "A modern office space with natural light",
    highlights: ["Digital-first financial tools", "Human support when it matters", "Security at the center of every workflow"],
    sections: [
      { title: "Our mission", body: "We build banking that helps people understand their money sooner, move it safely, and plan with confidence." },
      { title: "Our standard", body: "Every product decision is measured against clarity, speed, trust, and whether it reduces unnecessary financial friction." },
      { title: "Our promise", body: "Eccovault combines modern software with careful operational discipline so customers get convenience without losing confidence." },
    ],
    stats: [{ value: "2M+", label: "customers served" }, { value: "150+", label: "countries supported" }, { value: "24/7", label: "security monitoring" }],
    actions: ["Meet our mission", "Explore our values", "Learn how we protect customers"],
    icon: Building2,
    layout: "company",
  },
  {
    path: "/how-it-works",
    title: "How Eccovault Works",
    eyebrow: "Overview",
    summary: "Create your account, verify securely, fund it, then manage spending, savings, transfers, cards, and investments from one dashboard.",
    image: `https://images.unsplash.com/photo-1551836022-d5d88e9218df${imageBase}`,
    imageAlt: "People mapping out a digital product workflow",
    highlights: ["Create your account in minutes", "Verify and fund securely", "Spend, save, transfer, and invest from one place"],
    sections: [
      { title: "Apply online", body: "Start with your basic profile, contact information, and secure credentials. Eccovault guides you through the account setup flow." },
      { title: "Verify and fund", body: "Complete identity checks, connect a funding source, and move money into your first Eccovault account." },
      { title: "Use your dashboard", body: "Manage balances, transfers, card settings, savings goals, and investment views from one signed-in experience." },
    ],
    stats: [{ value: "1", label: "profile" }, { value: "2", label: "verify" }, { value: "3", label: "start banking" }],
    actions: ["Create your profile", "Connect your first funding source", "Start using Eccovault tools"],
    icon: CircleHelp,
    layout: "process",
  },
  {
    path: "/personal-banking",
    title: "Personal Banking",
    eyebrow: "Product",
    summary: "A full personal account experience with checking, savings, statements, transfers, and everyday account management.",
    image: `https://images.unsplash.com/photo-1563013544-824ae1b704d3${imageBase}`,
    imageAlt: "A mobile banking app being used on a phone",
    highlights: ["Checking and savings in one experience", "Fast transfers between accounts", "Simple statements and transaction history"],
    sections: [
      { title: "Checking", body: "Use your account for payroll, bills, card purchases, and transfers while keeping balance details easy to read." },
      { title: "Savings", body: "Create goal-based savings buckets and see progress without needing a separate money app." },
      { title: "Records", body: "Search transactions, review statements, and keep account details available when you need documentation." },
    ],
    stats: [{ value: "2-in-1", label: "checking and savings" }, { value: "Search", label: "transaction records" }, { value: "Fast", label: "internal transfers" }],
    icon: Banknote,
    layout: "product",
  },
  {
    path: "/business-banking",
    title: "Business Banking",
    eyebrow: "Product",
    summary: "Financial operations for businesses that need clean accounts, card controls, and simpler reporting.",
    image: `https://images.unsplash.com/photo-1553877522-43269d4ea984${imageBase}`,
    imageAlt: "A small business team working around laptops",
    highlights: ["Business account organization", "Card access for team spending", "Clear reporting for daily operations"],
    sections: [
      { title: "Operating accounts", body: "Organize incoming revenue, recurring expenses, taxes, and owner draws with a cleaner account structure." },
      { title: "Team access", body: "Give the right people spending tools while maintaining central visibility and control." },
      { title: "Business records", body: "Export transaction history and review payment activity in formats your team can act on." },
    ],
    stats: [{ value: "Multi-user", label: "access planning" }, { value: "Export", label: "records" }, { value: "Card", label: "controls" }],
    icon: BadgeDollarSign,
    layout: "business",
  },
  {
    path: "/investments",
    title: "Investments",
    eyebrow: "Product",
    summary: "A long-term investing view connected to the rest of your financial life.",
    image: `https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3${imageBase}`,
    imageAlt: "Financial charts displayed on a trading screen",
    highlights: ["Portfolio visibility", "Fractional investing support", "Simple performance snapshots"],
    sections: [
      { title: "Start small", body: "Fractional investing lets customers begin with amounts that fit their budget and build consistency over time." },
      { title: "Understand performance", body: "See portfolio movement, allocation, and long-term progress without losing sight of cash needs." },
      { title: "Keep planning connected", body: "View investment activity alongside savings goals and everyday account balances." },
    ],
    stats: [{ value: "$1", label: "minimum start" }, { value: "Auto", label: "portfolio views" }, { value: "Long-term", label: "planning" }],
    icon: TrendingUp,
    layout: "wealth",
  },
  {
    path: "/insurance",
    title: "Insurance",
    eyebrow: "Product",
    summary: "Protection planning for customers who want important coverage information organized with their money.",
    image: `https://images.unsplash.com/photo-1450101499163-c8848c66ca85${imageBase}`,
    imageAlt: "Hands reviewing important financial documents",
    highlights: ["Coverage discovery", "Policy organization", "Guidance for major life events"],
    sections: [
      { title: "Know what is covered", body: "Keep coverage categories, renewal timing, and policy documents easier to find." },
      { title: "Plan around milestones", body: "Review protection needs when buying a home, growing a family, traveling, or building a business." },
      { title: "Reduce surprises", body: "Organized policy details help customers make decisions before an unexpected event creates pressure." },
    ],
    stats: [{ value: "Home", label: "life events" }, { value: "Policy", label: "organization" }, { value: "Guide", label: "coverage options" }],
    icon: ShieldCheck,
    layout: "protection",
  },
  {
    path: "/careers",
    title: "Careers",
    eyebrow: "Company",
    summary: "Join the teams building a financial product that respects customers' time, attention, and trust.",
    image: `https://images.unsplash.com/photo-1521737711867-e3b97375f902${imageBase}`,
    imageAlt: "A collaborative team in a workplace",
    highlights: ["Product-minded teams", "Customer-first operations", "Remote-friendly collaboration"],
    sections: [
      { title: "Product and engineering", body: "Build secure, high-quality banking interfaces, internal tools, and customer workflows." },
      { title: "Operations and support", body: "Help customers resolve account questions with patience, accuracy, and care." },
      { title: "Risk and compliance", body: "Strengthen the policies and controls that let modern financial products scale responsibly." },
    ],
    stats: [{ value: "Hybrid", label: "collaboration" }, { value: "Impact", label: "focused work" }, { value: "Growth", label: "career paths" }],
    icon: Users,
    layout: "people",
  },
  {
    path: "/press",
    title: "Press",
    eyebrow: "Company",
    summary: "Company announcements, media resources, and story material for journalists, partners, and industry observers.",
    image: `https://images.unsplash.com/photo-1504711434969-e33886168f5c${imageBase}`,
    imageAlt: "Newspapers and press materials on a table",
    highlights: ["Latest announcements", "Brand resources", "Media contact information"],
    sections: [
      { title: "Newsroom", body: "Find product announcements, company milestones, leadership updates, and market commentary." },
      { title: "Media kit", body: "Access approved company descriptions, brand assets, executive information, and product screenshots." },
      { title: "Press contact", body: "Reach the communications team for interviews, statements, and background information." },
    ],
    stats: [{ value: "2026", label: "media kit" }, { value: "Brand", label: "assets" }, { value: "Press", label: "inquiries" }],
    icon: Newspaper,
    layout: "media",
  },
  {
    path: "/blog",
    title: "Blog",
    eyebrow: "Company",
    summary: "Practical articles about money habits, online security, product updates, and modern banking decisions.",
    image: `https://images.unsplash.com/photo-1499750310107-5fef28a66643${imageBase}`,
    imageAlt: "A notebook and laptop used for writing",
    highlights: ["Money guides", "Security education", "Product news and releases"],
    sections: [
      { title: "Money basics", body: "Clear explainers on budgeting, saving, credit, transfers, and account organization." },
      { title: "Security notes", body: "Guidance on spotting scams, protecting credentials, and using account controls effectively." },
      { title: "Product updates", body: "Release notes and behind-the-scenes context for new Eccovault features." },
    ],
    stats: [{ value: "Guides", label: "money education" }, { value: "Notes", label: "security" }, { value: "Updates", label: "product" }],
    icon: FileText,
    layout: "journal",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy",
    eyebrow: "Legal",
    summary: "How Eccovault handles personal information, account data, privacy choices, service providers, and security practices.",
    image: `https://images.unsplash.com/photo-1563986768609-322da13575f3${imageBase}`,
    imageAlt: "A person using secure technology on a laptop",
    highlights: ["Data collection overview", "Customer privacy controls", "Retention and protection practices"],
    sections: [
      { title: "Information we use", body: "We use information needed to provide accounts, prevent fraud, verify identity, improve products, and support customers." },
      { title: "Customer choices", body: "Customers can review profile details, communication preferences, and privacy-related account settings." },
      { title: "Protection practices", body: "Access controls, encryption, monitoring, and vendor review processes help protect sensitive information." },
    ],
    stats: [{ value: "Private", label: "by design" }, { value: "Secure", label: "data handling" }, { value: "Clear", label: "choices" }],
    icon: LockKeyhole,
    layout: "policy",
  },
  {
    path: "/terms-of-service",
    title: "Terms of Service",
    eyebrow: "Legal",
    summary: "The rules that govern access to Eccovault products, account responsibilities, digital services, and acceptable use.",
    image: `https://images.unsplash.com/photo-1589829545856-d10d557cf95f${imageBase}`,
    imageAlt: "Legal documents and a gavel on a desk",
    highlights: ["Account responsibilities", "Service availability", "Acceptable product use"],
    sections: [
      { title: "Using Eccovault", body: "Customers are responsible for accurate account information, credential security, and lawful use of services." },
      { title: "Service terms", body: "Availability, maintenance, supported features, and product eligibility can vary by account type and region." },
      { title: "Disputes and updates", body: "Terms may be updated as products evolve; important changes are communicated through appropriate channels." },
    ],
    stats: [{ value: "Terms", label: "customer duties" }, { value: "Use", label: "standards" }, { value: "Notice", label: "updates" }],
    icon: Scale,
    layout: "legal",
  },
  {
    path: "/cookie-policy",
    title: "Cookie Policy",
    eyebrow: "Legal",
    summary: "How cookies and similar technologies support secure sessions, preferences, analytics, and service quality.",
    image: `https://images.unsplash.com/photo-1551288049-bebda4e38f71${imageBase}`,
    imageAlt: "Analytics charts on a laptop screen",
    highlights: ["Essential cookies", "Preference controls", "Analytics and measurement"],
    sections: [
      { title: "Essential technology", body: "Some cookies are needed for login, fraud prevention, account security, and core site functionality." },
      { title: "Preferences", body: "Preference tools remember settings such as region, display choices, and communication options." },
      { title: "Measurement", body: "Analytics help us understand feature usage and improve performance without changing account balances or private financial decisions." },
    ],
    stats: [{ value: "Session", label: "security" }, { value: "Choice", label: "controls" }, { value: "Measure", label: "quality" }],
    icon: Cookie,
    layout: "policy",
  },
  {
    path: "/licenses",
    title: "Licenses",
    eyebrow: "Legal",
    summary: "Regulatory, partner, and licensing information related to Eccovault Financial services.",
    image: `https://images.unsplash.com/photo-1554224154-26032ffc0d07${imageBase}`,
    imageAlt: "Financial paperwork and a calculator",
    highlights: ["Banking partner disclosures", "NMLS information", "State and regional notices"],
    sections: [
      { title: "Banking relationships", body: "Eccovault works with regulated banking partners and service providers to deliver eligible financial products." },
      { title: "Licensing details", body: "Licensing and registration information is made available so customers can understand applicable oversight." },
      { title: "Regional notices", body: "Some services are subject to local requirements, disclosures, or availability limitations." },
    ],
    stats: [{ value: "NMLS", label: "#1234567" }, { value: "FDIC", label: "insured partners" }, { value: "State", label: "notices" }],
    icon: FileBadge,
    layout: "compliance",
  },
  {
    path: "/help-center",
    title: "Help Center",
    eyebrow: "Support",
    summary: "Self-service guidance for account access, deposits, transfers, cards, security, and support conversations.",
    image: `https://images.unsplash.com/photo-1556745757-8d76bdb6984b${imageBase}`,
    imageAlt: "Customer support specialists working at computers",
    highlights: ["Account help", "Transfer guidance", "Card and payment support"],
    sections: [
      { title: "Account access", body: "Find help for login issues, profile updates, verification, account settings, and recovery steps." },
      { title: "Money movement", body: "Review guidance for deposits, transfers, payment timing, transaction details, and failed activity." },
      { title: "Cards and security", body: "Learn how to freeze a card, report suspicious activity, update card settings, and protect credentials." },
    ],
    stats: [{ value: "24/7", label: "resources" }, { value: "Fast", label: "answers" }, { value: "Secure", label: "support" }],
    icon: HeartHandshake,
    layout: "support",
  },
  {
    path: "/security",
    title: "Security",
    eyebrow: "Support",
    summary: "The practices, controls, and monitoring systems that help protect Eccovault accounts and customer information.",
    image: `https://images.unsplash.com/photo-1516321318423-f06f85e504b3${imageBase}`,
    imageAlt: "Security technology displayed on a laptop",
    highlights: ["Encryption and secure sessions", "Fraud monitoring", "Card and account controls"],
    sections: [
      { title: "Account protection", body: "Secure authentication, session controls, and suspicious activity checks help protect access." },
      { title: "Transaction monitoring", body: "Systems review patterns that can indicate fraud, unusual activity, or account compromise." },
      { title: "Customer controls", body: "Customers can update passwords, manage sessions, freeze cards, and contact support when something looks wrong." },
    ],
    stats: [{ value: "256-bit", label: "encryption" }, { value: "SOC 2", label: "aligned controls" }, { value: "Real-time", label: "monitoring" }],
    icon: ShieldCheck,
    layout: "security",
  },
  {
    path: "/status",
    title: "Status",
    eyebrow: "Support",
    summary: "Current service health for Eccovault banking, cards, transfers, authentication, messaging, and support operations.",
    image: `https://images.unsplash.com/photo-1551288049-bebda4e38f71${imageBase}`,
    imageAlt: "Operational dashboards on a screen",
    highlights: ["Core banking systems", "Card processing", "Support availability"],
    sections: [
      { title: "Core banking", body: "Account balances, transaction history, dashboard access, deposits, and internal account features." },
      { title: "Payments and cards", body: "Card authorization, virtual cards, card settings, transfer rails, and payment updates." },
      { title: "Support systems", body: "Help center access, support messaging, notification delivery, and customer communications." },
    ],
    stats: [{ value: "99.98%", label: "monthly uptime" }, { value: "Live", label: "system checks" }, { value: "Updated", label: "continuously" }],
    icon: ChartNoAxesCombined,
    layout: "status",
  },
  {
    path: "/api-docs",
    title: "API Docs",
    eyebrow: "Support",
    summary: "Developer documentation for integrating account, transaction, card, support, and webhook workflows with Eccovault.",
    image: `https://images.unsplash.com/photo-1515879218367-8466d910aaa4${imageBase}`,
    imageAlt: "Developer code shown on a workstation",
    highlights: ["Authentication patterns", "Account and transaction endpoints", "Webhook event guidance"],
    sections: [
      { title: "Authentication", body: "Use scoped access, secure token handling, and environment separation for test and production integrations." },
      { title: "Core resources", body: "Model accounts, balances, transactions, cards, support messages, and customer-facing events." },
      { title: "Webhooks", body: "Subscribe to activity events, verify signatures, retry failed deliveries, and reconcile event order safely." },
    ],
    stats: [{ value: "REST", label: "resources" }, { value: "Webhook", label: "events" }, { value: "Sandbox", label: "testing" }],
    icon: Code2,
    layout: "developer",
  },
];

export const footerLinks = {
  Product: [
    { label: "Personal Banking", href: "/personal-banking" },
    { label: "Business Banking", href: "/business-banking" },
    { label: "Cards", href: "/cards" },
    { label: "Investments", href: "/investments" },
    { label: "Insurance", href: "/insurance" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
    { label: "Blog", href: "/blog" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
    { label: "Cookie Policy", href: "/cookie-policy" },
    { label: "Licenses", href: "/licenses" },
  ],
  Support: [
    { label: "Help Center", href: "/help-center" },
    { label: "Security", href: "/security" },
    { label: "Status", href: "/status" },
    { label: "API Docs", href: "/api-docs" },
  ],
};

