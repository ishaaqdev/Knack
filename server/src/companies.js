/**
 * The companies a trainee can aim at.
 *
 * Thirteen are real and three are invented. The real ones are here because
 * "a mid-size product company" is not something anyone applies to, and a
 * placement season is spent preparing for named firms with named processes. The
 * invented ones stay as the default because a fictional firm can be as good or
 * as awful as the exercise needs.
 *
 * Read this before trusting a number:
 *  - Headcount and revenue are rounded, from each company's own annual
 *    reporting, and tagged with the year they describe. They move every quarter.
 *  - `hiring` describes how the process usually runs for graduates. Companies
 *    change rounds, cut-offs and names without notice. The in-app copy says so.
 *  - `openings` are SIMULATED. Nobody outside a company knows its real vacancy
 *    count, and inventing one and presenting it as live would send a student to
 *    prepare for a job that does not exist. They scale with the company's size
 *    and give the exercise something to be about; the UI labels them as such.
 *  - Everyone the trainee meets at any of these companies is fictional.
 */

/* ------------------------------------------------------------- the data --- */

const COMPANY_DATA = [
  /* ---------------------------------------------------------- invented -- */
  {
    id: 'startup',
    name: 'Nexora',
    real: false,
    type: 'startup',
    kind: 'a 30-person product startup',
    tagline: 'Everyone is reachable, nothing is documented, and the roadmap changed on Tuesday.',
    hq: 'Bengaluru',
    founded: 2022,
    employees: 30,
    revenue: { label: '₹6 crore', note: 'annual recurring revenue', year: 'invented' },
    attrition: '25%',
    description:
      'Nexora sells scheduling software to small clinics and has found, slightly by accident, that it is good at it. Thirty people, one floor, a founder who answers messages at midnight. You will touch everything because there is nobody else to hand it to.',
    culture:
      'Fast and informal. Decisions get made in a thread. Titles mean little and ownership means a lot.',
    process: ['Short call with a founder', 'A small take-home or live task', 'Conversation with the team'],
    focus: ['Ownership', 'Breadth', 'Comfort with ambiguity', 'Speed of learning'],
    tips: [
      'Bring something you shipped that nobody asked for.',
      'Expect to be asked what you would do with no instructions at all.',
    ],
    entry: { swe: 'Founding-team Engineer Intern', data: 'Data Intern', product: 'Product Intern', qa: 'Quality and Release Intern', hr: 'People and Ops Intern' },
  },
  {
    id: 'product',
    name: 'Aether Systems',
    real: false,
    type: 'product',
    kind: 'a 900-person product company',
    tagline: 'Defined teams, real process, and a design review you have to get through.',
    hq: 'Pune',
    founded: 2011,
    employees: 900,
    revenue: { label: '₹310 crore', note: 'annual revenue', year: 'invented' },
    attrition: '16%',
    description:
      'Aether builds infrastructure monitoring tools used by mid-sized banks and logistics firms. Nine hundred people in product squads, a proper release process, and a design review that tends to find the thing you hoped nobody would.',
    culture: 'Structured and a bit slow to start, quick once a decision lands. Writing things down is respected.',
    process: ['Online coding round', 'Technical interview on a project', 'Managerial round', 'HR'],
    focus: ['Code quality', 'Explaining trade-offs', 'Working inside a process'],
    tips: ['Practise explaining a design decision out loud.', 'Know one project well enough to be pushed on it.'],
    entry: { swe: 'Software Engineer Intern', data: 'Data / ML Intern', product: 'Product Analyst Intern', qa: 'QA / DevOps Intern', hr: 'HR Intern' },
  },
  {
    id: 'service',
    name: 'Vantage Global',
    real: false,
    type: 'service',
    kind: 'a large IT services company',
    tagline: 'Clients, hierarchy, status calls, and a manager between you and every decision.',
    hq: 'Mumbai',
    founded: 1994,
    employees: 42000,
    revenue: { label: '₹21,000 crore', note: 'annual revenue', year: 'invented' },
    attrition: '14%',
    description:
      'Vantage delivers and maintains software for banks, insurers and retailers across a dozen countries. Most of the work happens for a client you may never meet, through a manager who does, on a status call that is always at 4 pm.',
    culture: 'Hierarchical and process-heavy. Communication is a skill they notice, because it is half the job.',
    process: ['Aptitude and communication test', 'Technical interview', 'HR and relocation discussion'],
    focus: ['Communication', 'Fundamentals', 'Being a dependable team member'],
    tips: ['Fundamentals first: OOP, DBMS, OS, networks.', 'Be clear about relocation and shifts before they ask.'],
    entry: { swe: 'Graduate Engineer Trainee', data: 'Analytics Trainee', product: 'Business Analyst Trainee', qa: 'Test Engineer Trainee', hr: 'HR Trainee' },
  },

  /* ------------------------------------------------------ IT services --- */
  {
    id: 'tcs',
    name: 'TCS',
    full: 'Tata Consultancy Services',
    real: true,
    type: 'service',
    kind: 'a very large IT services company',
    tagline: 'The largest hiring machine in Indian IT.',
    hq: 'Mumbai',
    founded: 1968,
    employees: 607000,
    revenue: { label: '₹2.55 lakh crore', usd: '≈ US$30 billion', note: 'revenue', year: 'FY2024-25' },
    description:
      'Part of the Tata Group and the biggest Indian IT services firm by headcount. It builds, runs and modernises technology for banks, retailers, manufacturers and governments, and it takes in graduates in very large batches every year.',
    culture:
      'Process-led and stable, with a strong training programme at the start. Communication and adaptability count for as much as raw technical skill.',
    process: [
      'National Qualifier Test (aptitude, reasoning, verbal, coding)',
      'Technical interview',
      'Managerial round',
      'HR round',
    ],
    focus: ['Aptitude speed', 'Programming basics', 'Communication', 'Willingness to relocate'],
    tips: [
      'Practise the aptitude section against a clock, not at your own pace.',
      'Be ready to explain one project and the basics of any language on your resume.',
      'Have a clear, calm answer on relocation and shifts.',
    ],
    entry: { swe: 'Assistant System Engineer (Ninja / Digital)', data: 'Data Engineer Trainee', product: 'Business Analyst Trainee', qa: 'Testing Associate', hr: 'HR Associate' },
  },
  {
    id: 'infosys',
    name: 'Infosys',
    real: true,
    type: 'service',
    kind: 'a very large IT services company',
    tagline: 'Famous for its Mysuru training campus.',
    hq: 'Bengaluru',
    founded: 1981,
    employees: 323000,
    revenue: { label: '₹1.63 lakh crore', usd: '≈ US$19 billion', note: 'revenue', year: 'FY2024-25' },
    description:
      'A global consulting and IT services company that grew out of a seven-person start in Pune. It hires graduates every year for systems and specialist roles, and trains them at a large residential campus before they join a project.',
    culture: 'Learning-oriented and fairly formal. Certification and structured upskilling are part of the rhythm.',
    process: [
      'Online assessment (reasoning, quantitative, verbal, pseudocode or programming)',
      'Technical interview',
      'HR interview',
    ],
    focus: ['Logical reasoning', 'Pseudocode and basics', 'Clear communication', 'Learning attitude'],
    tips: [
      'Pseudocode questions reward careful reading more than clever tricks.',
      'Higher-tier roles lean on stronger coding, so practise problems, not just theory.',
    ],
    entry: { swe: 'Systems Engineer', data: 'Data Analyst Trainee', product: 'Business Analyst', qa: 'Test Engineer', hr: 'HR Trainee' },
  },
  {
    id: 'wipro',
    name: 'Wipro',
    real: true,
    type: 'service',
    kind: 'a large IT services company',
    tagline: 'One of the older names, still hiring at scale.',
    hq: 'Bengaluru',
    founded: 1945,
    employees: 233000,
    revenue: { label: '₹0.89 lakh crore', usd: '≈ US$10.5 billion', note: 'IT services revenue', year: 'FY2024-25' },
    description:
      'A technology services and consulting company that began as a vegetable oil business and moved into computers in the 1980s. It runs a national talent hunt every year and places graduates into engineering, testing and support roles.',
    culture: 'Professional and client-focused, with a long-standing emphasis on values and ethics in its own materials.',
    process: [
      'National talent hunt assessment (aptitude, written communication, coding)',
      'Business or technical discussion',
      'HR round',
    ],
    focus: ['Written communication', 'Aptitude', 'Coding basics', 'Cultural fit'],
    tips: [
      'The written communication section is a filter. Practise a clear paragraph under time pressure.',
      'Be able to say why services work suits you without sounding like a fallback.',
    ],
    entry: { swe: 'Project Engineer', data: 'Analytics Trainee', product: 'Business Analyst', qa: 'Test Engineer', hr: 'HR Trainee' },
  },
  {
    id: 'hcltech',
    name: 'HCLTech',
    real: true,
    type: 'service',
    kind: 'a large IT services company',
    tagline: 'Engineering services and infrastructure, with a strong hardware heritage.',
    hq: 'Noida',
    founded: 1976,
    employees: 223000,
    revenue: { label: '₹1.17 lakh crore', usd: '≈ US$13.8 billion', note: 'revenue', year: 'FY2024-25' },
    description:
      'A global technology company with deep roots in engineering and R&D services, along with infrastructure and software work. It recruits engineers for a mix of software, embedded and support roles.',
    culture: 'Engineering-minded and pragmatic. More comfortable with hardware and systems work than most of its peers.',
    process: ['Online assessment', 'Technical interview', 'HR interview'],
    focus: ['Core fundamentals', 'Problem solving', 'Communication'],
    tips: [
      'If your branch is not CS, be ready to connect your core subjects to the role.',
      'Fundamentals questions are asked plainly. Know them plainly.',
    ],
    entry: { swe: 'Graduate Engineer Trainee', data: 'Data Engineer Trainee', product: 'Business Analyst', qa: 'Test Engineer', hr: 'HR Trainee' },
  },
  {
    id: 'techm',
    name: 'Tech Mahindra',
    real: true,
    type: 'service',
    kind: 'a large IT services company',
    tagline: 'Telecom roots, now broader.',
    hq: 'Pune',
    founded: 1986,
    employees: 148000,
    revenue: { label: '₹0.53 lakh crore', usd: '≈ US$6.2 billion', note: 'revenue', year: 'FY2024-25' },
    description:
      'Part of the Mahindra Group, built originally around telecommunications and still strong there, with a growing book in enterprise, engineering and digital services.',
    culture: 'Client-delivery focused, with a large telecom and network-heavy customer base.',
    process: ['Online assessment', 'Technical interview', 'HR interview'],
    focus: ['Aptitude', 'Programming basics', 'Networks and telecom awareness', 'Communication'],
    tips: ['Brush up networking basics if your resume mentions them.', 'Communication is tested early and often.'],
    entry: { swe: 'Software Engineer', data: 'Data Analyst Trainee', product: 'Business Analyst', qa: 'Test Engineer', hr: 'HR Trainee' },
  },
  {
    id: 'cognizant',
    name: 'Cognizant',
    real: true,
    type: 'service',
    kind: 'a very large IT services company',
    tagline: 'American headquarters, majority of its people in India.',
    hq: 'Teaneck, New Jersey',
    founded: 1994,
    employees: 347000,
    revenue: { label: 'US$19.7 billion', usd: '≈ ₹1.7 lakh crore', note: 'revenue', year: 'CY2024' },
    description:
      'A professional services company that grew quickly through offshore delivery, with a very large share of its workforce in India. It hires graduates through several tiers of campus programmes.',
    culture: 'Delivery-oriented and fast-moving, with clear tracks for newcomers and a lot of client interaction.',
    process: ['Online assessment (aptitude, communication, coding)', 'Technical and HR interview'],
    focus: ['Aptitude', 'Coding basics', 'Spoken communication'],
    tips: ['Spoken English is assessed directly, so rehearse speaking, not just writing.', 'Higher tiers expect stronger coding.'],
    entry: { swe: 'Programmer Analyst Trainee', data: 'Data Analyst Trainee', product: 'Business Analyst', qa: 'Test Analyst', hr: 'HR Trainee' },
  },
  {
    id: 'accenture',
    name: 'Accenture',
    real: true,
    type: 'service',
    kind: 'a very large consulting and IT services company',
    tagline: 'Consulting, technology and operations under one name.',
    hq: 'Dublin, Ireland',
    founded: 1989,
    employees: 779000,
    revenue: { label: 'US$69.7 billion', usd: '≈ ₹5.9 lakh crore', note: 'revenue', year: 'FY2025' },
    description:
      'One of the world\'s largest professional services firms, covering strategy, technology, operations and outsourcing. It has one of its biggest workforces in India and hires graduates in large batches.',
    culture: 'Consulting-flavoured: client-facing, deadline-driven, and heavy on teamwork and communication.',
    process: ['Cognitive and technical assessment', 'Communication assessment', 'Technical and HR interview'],
    focus: ['Cognitive ability', 'Communication', 'Teamwork', 'Adaptability'],
    tips: ['The communication assessment is spoken. Practise out loud.', 'Expect scenario questions about working with people.'],
    entry: { swe: 'Associate Software Engineer', data: 'Data Associate', product: 'Business Analyst Associate', qa: 'Quality Associate', hr: 'HR Associate' },
  },
  {
    id: 'capgemini',
    name: 'Capgemini',
    real: true,
    type: 'service',
    kind: 'a very large consulting and IT services company',
    tagline: 'French roots, very large Indian presence.',
    hq: 'Paris, France',
    founded: 1967,
    employees: 341000,
    revenue: { label: '€22.1 billion', usd: '≈ ₹2.0 lakh crore', note: 'revenue', year: 'CY2024' },
    description:
      'A consulting, technology and engineering group headquartered in France, with India as its largest base of people. It hires analysts and engineers through campus programmes.',
    culture: 'International and project-based, with a mix of consulting and engineering work.',
    process: ['Online assessment (including pseudocode and games-based aptitude)', 'Technical interview', 'HR interview'],
    focus: ['Pseudocode', 'Logical reasoning', 'Communication'],
    tips: ['Pseudocode is a real filter, so practise reading code and tracing it by hand.'],
    entry: { swe: 'Analyst', data: 'Data Analyst', product: 'Business Analyst', qa: 'Test Analyst', hr: 'HR Analyst' },
  },

  /* ---------------------------------------------------------- product --- */
  {
    id: 'zoho',
    name: 'Zoho',
    real: true,
    type: 'product',
    kind: 'a bootstrapped product company',
    tagline: 'Builds its own software and trains its own engineers.',
    hq: 'Chennai',
    founded: 1996,
    employees: 18000,
    revenue: { label: '₹8,700 crore', usd: '≈ US$1 billion', note: 'revenue, as reported', year: 'FY2023-24' },
    description:
      'A privately held software company that makes a very wide suite of business products and has never taken outside funding. It is known for hiring on programming ability rather than marks, and for running its own training school.',
    culture: 'Engineering-first and low on ceremony. Builds its own stack, values depth, and cares about product craft.',
    process: ['Several rounds of hands-on programming', 'Advanced problem solving', 'Technical interview', 'HR'],
    focus: ['Programming depth', 'Problem solving', 'Writing working code on your own', 'Product thinking'],
    tips: [
      'Practise writing complete programs from a blank file, without autocomplete.',
      'Marks matter far less than what you can actually build, so have something real to show.',
    ],
    entry: { swe: 'Member of Technical Staff', data: 'Data Engineer', product: 'Product Analyst', qa: 'QA Engineer', hr: 'HR Executive' },
  },
  {
    id: 'freshworks',
    name: 'Freshworks',
    real: true,
    type: 'product',
    kind: 'a listed SaaS product company',
    tagline: 'Customer-support software, started in Chennai.',
    hq: 'San Mateo, California (large Chennai base)',
    founded: 2010,
    employees: 4400,
    revenue: { label: 'US$720 million', usd: '≈ ₹6,100 crore', note: 'revenue', year: 'CY2024' },
    description:
      'A software-as-a-service company best known for customer support and IT service tools. Founded in Chennai, it is listed in the US and keeps a big engineering base in India.',
    culture: 'Product-led, with squads that own what they ship and a habit of measuring outcomes.',
    process: ['Coding assessment', 'Technical interviews', 'Hiring manager conversation', 'HR'],
    focus: ['Data structures', 'Clean code', 'Product sense', 'Ownership'],
    tips: ['Be ready to talk about the user, not just the code.', 'Practise explaining trade-offs as you code.'],
    entry: { swe: 'Software Development Engineer', data: 'Data Analyst', product: 'Associate Product Manager', qa: 'Software Development Engineer in Test', hr: 'Talent Associate' },
  },

  /* ---------------------------------------------------------- big tech -- */
  {
    id: 'amazon',
    name: 'Amazon',
    real: true,
    type: 'bigtech',
    kind: 'a global technology company',
    tagline: 'Famous for its written principles and its bar-raiser round.',
    hq: 'Seattle, Washington',
    founded: 1994,
    employees: 1556000,
    revenue: { label: 'US$638 billion', usd: '≈ ₹54 lakh crore', note: 'net sales', year: 'CY2024' },
    description:
      'The e-commerce and cloud company. Its engineering teams run retail, logistics, devices and one of the largest cloud platforms. Hiring leans heavily on a published set of leadership principles.',
    culture: 'Written, metric-driven and ownership-heavy. Decisions are argued in documents, and customer impact is the common currency.',
    process: [
      'Online assessment (coding and work simulation)',
      'Several technical interviews (data structures, problem solving)',
      'Behavioural questions throughout, tied to leadership principles',
    ],
    focus: ['Data structures and algorithms', 'Leadership principles', 'Ownership', 'Thinking aloud'],
    tips: [
      'Prepare six or seven real stories that each can answer more than one principle.',
      'Say your thinking while you code. Silence is the most common way to fail a good solution.',
    ],
    entry: { swe: 'Software Development Engineer (SDE I)', data: 'Data Engineer / Applied Scientist Intern', product: 'Business Analyst', qa: 'Quality Assurance Engineer', hr: 'HR Assistant' },
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    real: true,
    type: 'bigtech',
    kind: 'a global technology company',
    tagline: 'Software, cloud and a lot of developer tools.',
    hq: 'Redmond, Washington',
    founded: 1975,
    employees: 228000,
    revenue: { label: 'US$281.7 billion', usd: '≈ ₹24 lakh crore', note: 'revenue', year: 'FY2025' },
    description:
      'Makes operating systems, productivity software, a major cloud platform and developer tools. It has large engineering centres in India and hires new graduates into software roles.',
    culture: 'Growth-mindset language is everywhere, collaboration is expected, and teams are generally large and well resourced.',
    process: ['Online coding assessment', 'Several coding and design interviews', 'A final conversation with a hiring manager'],
    focus: ['Data structures and algorithms', 'Clean code', 'Communication while solving', 'Collaboration'],
    tips: ['Clarify the problem before you code.', 'Test your own solution out loud with an example.'],
    entry: { swe: 'Software Engineer', data: 'Data and Applied Scientist', product: 'Program Manager', qa: 'Software Engineer in Test', hr: 'Talent Associate' },
  },
  {
    id: 'google',
    name: 'Google',
    full: 'Google (Alphabet)',
    real: true,
    type: 'bigtech',
    kind: 'a global technology company',
    tagline: 'Search, ads, cloud, Android, and a famously hard interview.',
    hq: 'Mountain View, California',
    founded: 1998,
    employees: 183000,
    revenue: { label: 'US$350 billion', usd: '≈ ₹30 lakh crore', note: 'Alphabet revenue', year: 'CY2024' },
    description:
      'The parent company, Alphabet, covers search, advertising, YouTube, Android, cloud and AI research. New-graduate engineering hiring is selective and centres on how you reason about problems.',
    culture: 'Data-driven and engineering-led, with a lot of autonomy and an expectation that you will challenge ideas, including your own.',
    process: ['Several technical interviews on algorithms and problem solving', 'A behavioural conversation', 'Team matching'],
    focus: ['Algorithms', 'Reasoning aloud', 'Handling hints well', 'Collaboration'],
    tips: ['Practise taking a hint without freezing or getting defensive.', 'Explain complexity, then improve the solution.'],
    entry: { swe: 'Software Engineer (early career)', data: 'Data Scientist (early career)', product: 'Associate Product Manager', qa: 'Software Engineer in Test', hr: 'People Operations Associate' },
  },
]

/* --------------------------------------------------------------- shares --- */

/**
 * How a firm of each type spreads its fresher intake across the five roles the
 * simulation offers, and what fraction of the headcount it takes in per year.
 * These are assumptions of the exercise, not facts about any company.
 */
const ROLE_SHARE = {
  service: { swe: 0.58, data: 0.1, product: 0.06, qa: 0.2, hr: 0.06 },
  product: { swe: 0.5, data: 0.14, product: 0.12, qa: 0.18, hr: 0.06 },
  bigtech: { swe: 0.52, data: 0.2, product: 0.14, qa: 0.08, hr: 0.06 },
  startup: { swe: 0.4, data: 0.14, product: 0.2, qa: 0.1, hr: 0.16 },
}
const INTAKE_RATE = { service: 0.07, product: 0.06, bigtech: 0.025, startup: 0.2 }

/** Two significant figures, so a number reads as an estimate rather than a count. */
function roundish(n) {
  if (n < 10) return Math.max(1, Math.round(n))
  const mag = 10 ** (String(Math.round(n)).length - 2)
  return Math.max(10, Math.round(n / mag) * mag)
}

const DEMAND = (share) => (share >= 0.3 ? 'High' : share >= 0.12 ? 'Steady' : 'Selective')

function openingsFor(c, roles) {
  const shares = ROLE_SHARE[c.type] ?? ROLE_SHARE.product
  const intake = c.employees * (INTAKE_RATE[c.type] ?? 0.05)
  return roles.map((r) => ({
    roleId: r.id,
    title: c.entry?.[r.id] ?? r.name,
    demand: DEMAND(shares[r.id] ?? 0.1),
    openings: roundish(intake * (shares[r.id] ?? 0.1)),
  }))
}

/* ---------------------------------------------------------- formatting --- */

export function employeesLabel(n) {
  if (n >= 100000) return `${(n / 100000).toFixed(1).replace(/\.0$/, '')} lakh`
  if (n >= 1000) return `${Math.round(n / 1000).toLocaleString('en-IN')},000`
  return String(n)
}

/* ---------------------------------------------------------------- views --- */

/** Enough to draw a picker row. */
export const companySummary = (c) => ({
  id: c.id,
  name: c.name,
  full: c.full ?? c.name,
  real: c.real,
  type: c.type,
  kind: c.kind,
  blurb: c.tagline,
  hq: c.hq,
  employees: c.employees,
  employeesLabel: employeesLabel(c.employees),
  revenue: c.revenue,
})

/** The whole profile, with openings worked out for the roles on offer. */
export const companyProfile = (c, roles) => ({
  ...companySummary(c),
  founded: c.founded,
  attrition: c.attrition ?? null,
  description: c.description,
  culture: c.culture,
  hiring: { process: c.process, focus: c.focus, tips: c.tips },
  openings: openingsFor(c, roles),
  disclaimer: c.real
    ? 'Headcount and revenue are rounded and change every quarter. The hiring process is typical, not guaranteed. Openings below are simulated for this exercise and are not live job listings, so check the company\'s careers page for real vacancies. The people you meet here are fictional.'
    : 'This company is invented for the exercise. Every figure, opening and person is fictional.',
})

export const COMPANIES = COMPANY_DATA
export const companyById = (id) => COMPANY_DATA.find((c) => c.id === id) ?? null
export const DEFAULT_COMPANY_ID = 'product'
