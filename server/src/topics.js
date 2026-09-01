/**
 * Group discussion topics.
 *
 * The first eight were placeholders and read like it — "should companies
 * require employees to return to the office" is a motion nobody in the room has
 * a stake in, so nobody argues properly.
 *
 * These are chosen on one test: can a competent final-year student hold either
 * side, and does the disagreement cost them something? A topic with an obvious
 * answer produces a queue of people agreeing, which is not a discussion and
 * teaches nothing about handling one.
 *
 * `frame` is the part that was missing entirely. A real GD opens with a
 * moderator saying what the question actually means, because half the room
 * otherwise spends two minutes arguing about definitions.
 */

export const TOPICS = [
  /* ---------------------------------------------------- work and careers -- */
  {
    id: 'moonlight',
    text: 'Should employees be free to take on paid work outside their job?',
    category: 'Work',
    frame:
      'Several Indian IT firms have terminated staff for it; others now allow it with disclosure. The contracts usually forbid it, the salaries often assume it will not happen, and enforcement is uneven.',
  },
  {
    id: 'bond',
    text: 'Are training bonds in service companies fair to freshers?',
    category: 'Work',
    frame:
      'A two-year bond with a penalty clause is standard for campus hires. Companies argue they are recovering months of unbilled training; the person signing is usually twenty-one and has no other offer.',
  },
  {
    id: 'salary-transparency',
    text: 'Should every salary in a company be visible to everyone in it?',
    category: 'Work',
    frame:
      'A handful of firms publish internal pay bands. It closes gaps that negotiation created, and it also means the person sitting next to you knows exactly what you are worth to the company.',
  },
  {
    id: 'remote-freshers',
    text: 'Is remote work worse for people in their first two years?',
    category: 'Work',
    frame:
      'The productivity data is contested. The thing that is not contested is that most of what a fresher learns is overheard rather than taught, and there is nothing to overhear on a video call.',
  },
  {
    id: 'unpaid-interns',
    text: 'Is it acceptable for a company to ship an unpaid intern’s work to production?',
    category: 'Work',
    frame:
      'Unpaid and stipend-only internships are common. If the work is good enough to ship, the question is why it was not good enough to pay for.',
  },

  /* ------------------------------------------------------------ AI and us -- */
  {
    id: 'ai-in-interviews',
    text: 'Should candidates be allowed to use AI assistants in technical interviews?',
    category: 'AI',
    frame:
      'They will use one on the job from day one. Banning it tests something the role does not require; allowing it makes it much harder to tell who actually understands the problem.',
  },
  {
    id: 'ai-screening',
    text: 'Is it fair for companies to let AI screen resumes?',
    category: 'AI',
    frame:
      'A recruiter gives a CV six seconds; a model gives every CV the same six seconds. It removes one kind of bias by encoding another, and the applicant never learns which one rejected them.',
  },
  {
    id: 'ai-training-data',
    text: 'Should AI companies pay the people whose work trained their models?',
    category: 'AI',
    frame:
      'Every large model is trained on work its authors did not license for that purpose. The counter-argument is that people have always learned from other people’s work for free.',
  },
  {
    id: 'ai-regulation',
    text: 'Should India regulate AI now, or wait until the harms are clearer?',
    category: 'AI',
    frame:
      'Regulating early risks strangling an industry the country is trying to build. Regulating late means writing rules for harms that have already happened to somebody.',
  },
  {
    id: 'ai-accountability',
    text: 'When AI-written code causes an outage, who is responsible?',
    category: 'AI',
    frame:
      'The engineer approved it, the reviewer passed it, the company shipped it, and the model wrote it. Every one of those four has a defensible claim that it was not primarily them.',
  },

  /* --------------------------------------------------- ethics and society -- */
  {
    id: 'refuse-to-build',
    text: 'Should an engineer refuse to build something they believe is harmful?',
    category: 'Ethics',
    frame:
      'Doctors and lawyers have professional bodies that back a refusal. Engineers mostly have a manager, a notice period, and a loan.',
  },
  {
    id: 'algorithmic-harm',
    text: 'Should a company be legally liable for what its recommendation algorithm promotes?',
    category: 'Ethics',
    frame:
      'Nobody wrote the rule that surfaced the content. The question is whether "the model learned it" is a defence, or an admission that no one was watching.',
  },
  {
    id: 'employee-monitoring',
    text: 'Is screen monitoring of remote employees ever justified?',
    category: 'Ethics',
    frame:
      'Some clients contractually require it. It measures presence rather than output, and the people it catches are rarely the ones costing the company money.',
  },
  {
    id: 'data-localisation',
    text: 'Should India require all citizen data to be stored inside the country?',
    category: 'Ethics',
    frame:
      'It gives the state jurisdiction over data about its own citizens. It also gives the state jurisdiction over data about its own citizens.',
  },
  {
    id: 'open-source',
    text: 'Is open source being exploited by large technology companies?',
    category: 'Ethics',
    frame:
      'Billion-dollar products run on libraries maintained by two unpaid people. Those people also chose a licence that explicitly permits exactly this.',
  },

  /* ------------------------------------------------- education and hiring -- */
  {
    id: 'degrees',
    text: 'Should companies hire engineers on skills tests alone and ignore the degree?',
    category: 'Hiring',
    frame:
      'A test measures what someone can do this week. A degree is four years of evidence about whether they finish things, from an institution of wildly variable quality.',
  },
  {
    id: 'coding-tests',
    text: 'Do competitive-programming style tests select the right engineers?',
    category: 'Hiring',
    frame:
      'They are fast, cheap and objective. They also select for a skill most engineering jobs never ask for again after the interview.',
  },
  {
    id: 'placement-rankings',
    text: 'Should engineering colleges be ranked on the salaries their students get?',
    category: 'Hiring',
    frame:
      'It is the number families actually care about. It also rewards a college for admitting students who were going to do well anyway.',
  },
  {
    id: 'attendance',
    text: 'Should attendance be compulsory in engineering colleges?',
    category: 'Education',
    frame:
      'Attendance rules exist because some students will not turn up otherwise. They also punish the ones who learned the material faster elsewhere.',
  },
  {
    id: 'cgpa-cutoffs',
    text: 'Are CGPA cut-offs a reasonable way to shortlist candidates?',
    category: 'Hiring',
    frame:
      'With four thousand applications and forty slots, something has to cut. The question is whether this particular something correlates with anything the job needs.',
  },

  /* ------------------------------------------------------ industry and India */
  {
    id: 'startup-value',
    text: 'Does India’s startup funding boom create real value, or move money around?',
    category: 'Industry',
    frame:
      'Some of it built genuinely new infrastructure. Some of it subsidised deliveries until the money ran out and the jobs went with it.',
  },
  {
    id: 'startup-vs-service',
    text: 'Is a startup the right first job for an engineer?',
    category: 'Industry',
    frame:
      'You will do more, sooner, with less supervision. All three of those are the argument for and the argument against.',
  },
  {
    id: 'four-day-week',
    text: 'Could a four-day week work in Indian IT services?',
    category: 'Work',
    frame:
      'The billing model is hours against a client contract. Trials elsewhere held output steady, but those were product companies who bill for outcomes rather than time.',
  },
  {
    id: 'gig-economy',
    text: 'Are gig platforms creating opportunity or removing employment?',
    category: 'Industry',
    frame:
      'Millions of people earn on them who could not before. Almost none of them have the protections the previous version of that work carried.',
  },
  {
    id: 'ev-grid',
    text: 'Are electric vehicles genuinely better for the environment in India today?',
    category: 'Industry',
    frame:
      'The tailpipe emissions move to the power station, and a large share of that grid is still coal. Where the grid goes, so does the answer.',
  },
]

/** Categories, so a repeat run does not land on the same kind of argument. */
export const CATEGORIES = [...new Set(TOPICS.map((t) => t.category))]

/**
 * Picks a topic, rotating category first and then within it, so a trainee doing
 * five discussions gets five genuinely different arguments rather than five
 * variations on hiring.
 */
export function pickTopic(n = 0, avoidIds = []) {
  const fresh = TOPICS.filter((t) => !avoidIds.includes(t.id))
  const pool = fresh.length ? fresh : TOPICS

  const category = CATEGORIES[n % CATEGORIES.length]
  const inCategory = pool.filter((t) => t.category === category)
  const list = inCategory.length ? inCategory : pool

  return list[Math.floor(n / CATEGORIES.length) % list.length]
}

/**
 * The room.
 *
 * A discussion with no setting is a text box with a question above it. Saying
 * where this is, who is watching and how long it lasts is most of what makes
 * the trainee's stomach drop, and that is the part being practised.
 */
export const ROOM = {
  setting:
    'A placement drive. Six of you around one table, a panel of two watching from the side, and ten minutes on the clock.',
  brief:
    'They are not marking who is loudest. They are marking who moves the discussion somewhere it would not otherwise have gone — which sometimes means being the person who summarises, and sometimes means being the person who disagrees with the room.',
  moderator: 'The moderator reads out the topic, says nothing else, and starts the timer.',
}
