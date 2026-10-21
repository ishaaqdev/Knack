// Bank B of mock-interview questions: Round 4 (Pressure), Round 5 (Closing)
// and employer-style items. Every option carries a reason, because the mock
// is training, not a quiz.

export const BANK_B = [
  /* ------------------------------------------------------------ Round 4 --- */
  {
    id: 'r4-pressure-01',
    round: 4,
    topic: 'challenged-claim',
    style: 'any',
    question: `The interviewer taps your resume. "It says you built the backend of your final-year project. There were four of you. How much of the backend did you personally write?"`,
    options: [
      {
        text: `About 60 percent. I wrote the login and order APIs and the database schema. Farhan did the payment integration, and we reviewed each other's pull requests. I can walk you through any of my files.`,
        score: 9,
        why: `A specific share, named files and a named teammate are all checkable, and they sound honest. Interviewers trust people who credit others and still show what they owned.`,
      },
      {
        text: `I led the backend, so I was responsible for it overall. The others helped in small places, but the design and most of the decisions were mine.`,
        score: 6,
        why: `"Responsible overall" is vague and sounds a little dismissive of your teammates. The interviewer still doesn't know what you personally wrote.`,
      },
      {
        text: `We all worked together on everything, so it's hard to separate who did what. The whole team contributed equally to the backend.`,
        score: 3,
        why: `It sounds modest, but it dodges the question. They asked for your part, and "equally" hints that you may not have one.`,
      },
      {
        text: `That's right, I built it. I wouldn't say anyone else contributed much to the backend. They did small things like the UI and the report, but the core logic, the APIs and the database were all mine from start to end.`,
        score: 1,
        why: `Claiming a whole team project invites a deep dive you may not survive. It also makes you sound like someone who doesn't share credit.`,
      },
    ],
    lesson: `Describe your share of a team project with a rough percentage and file names, and credit teammates by name.`,
  },
  {
    id: 'r4-pressure-02',
    round: 4,
    topic: 'challenged-claim',
    style: 'any',
    question: `You wrote "94% accuracy" for your crop-disease classifier. The interviewer frowns. "You trained on about 800 images from one dataset. Why should I believe that number means anything?"`,
    options: [
      {
        text: `The 94% comes from a standard 80-20 train-test split, so it's valid. I tracked validation loss during training and the model didn't overfit.`,
        score: 6,
        why: `You're defending the method correctly, but the doubt was about the dataset's size and source. That part of the question is still unanswered.`,
      },
      {
        text: `You're right, 800 images is small and the number probably isn't reliable. I'm sorry, I should have collected more data. It was just a college project and I didn't know much then.`,
        score: 3,
        why: `Agreeing is honest, but the apology and "didn't know much" undersell the work, and you offer no next step. It ends the discussion instead of improving it.`,
      },
      {
        text: `Fair point. The 94% is on a held-out split of the same dataset, so it likely overstates real-world accuracy. I'd test on field photos from another source and report precision and recall for each disease.`,
        score: 9,
        why: `You accept the limit without collapsing, say what the number actually measures and name the test that would prove more. That's how an engineer talks about their own result.`,
      },
      {
        text: `Accuracy is the standard metric, and 94% is far higher than the papers I read about similar projects. So I'm confident it's a good model.`,
        score: 1,
        why: `Repeating the number louder doesn't answer the doubt. It tells the interviewer you can't see the weakness in your own evaluation.`,
      },
    ],
    lesson: `When a number is challenged, say what it does and doesn't prove, then name the test that would prove more.`,
  },
  {
    id: 'r4-pressure-03',
    round: 4,
    topic: 'challenged-claim',
    style: 'any',
    question: `"I've seen an almost identical expense tracker on GitHub, with the same folder structure," says the interviewer. "Many final-year projects start from tutorials. Which parts of this one are actually yours?"`,
    options: [
      {
        text: `I didn't copy anything. I understood the concepts from the tutorial and then typed everything myself, line by line, so the code is really mine.`,
        score: 3,
        why: `Retyping isn't authorship, and the defensive tone suggests the question hit a nerve. Now the interviewer doubts the rest of your resume too.`,
      },
      {
        text: `I did start from a tutorial for the basic CRUD, and I'll say so. The budget alerts and CSV import are mine; the import broke on Excel date formats until I wrote a parser. My commits show it.`,
        score: 9,
        why: `Admitting the tutorial base removes the trap. The date-format bug is a detail only the person who wrote it would know, and the commit history can be checked.`,
      },
      {
        text: `That repo might have copied from mine, honestly. I uploaded mine later, but I showed the idea in my college demo long before that, and a few people from other batches had seen it, so they probably took it from there.`,
        score: 1,
        why: `Blaming an unseen person with no proof turns a fair question into an accusation. It's also very easy for the interviewer to check.`,
      },
      {
        text: `Many projects look similar because the problem is common. I made my own design choices, like SQLite over MongoDB, and I added features on top of the basics.`,
        score: 6,
        why: `You claim ownership without one example the interviewer can test. "My own features" needs names and a demo to count.`,
      },
    ],
    lesson: `If a project began from a tutorial, say so first, then point to the parts you changed and can defend.`,
  },
  {
    id: 'r4-pressure-04',
    round: 4,
    topic: 'weak-profile',
    style: 'any',
    question: `"Your CGPA is 6.2, and most applicants here are above 7.5. Why should we look at you instead of them?"`,
    options: [
      {
        text: `I know it's low and I'm really sorry. I had family problems and health issues in second year and I couldn't concentrate on my studies at all. I'm hoping you can give me one chance to prove myself.`,
        score: 3,
        why: `The reason may be true, but asking for a chance puts you in a begging position. The interviewer hears no strengths, only a plea.`,
      },
      {
        text: `CGPA doesn't measure ability. Many toppers can't code, and my practical skills are strong. I've solved 300 problems online and built two projects, so I'm better than my marks show.`,
        score: 6,
        why: `The evidence is fine, but opening with "CGPA doesn't matter" sounds like an excuse, and running down toppers sounds bitter.`,
      },
      {
        text: `Honestly, marks depend on how strict the university evaluators are. Paper-checking in my college is harsh, so friends with a better CGPA aren't necessarily better engineers.`,
        score: 1,
        why: `Blaming the evaluation system is deflecting, and the interviewer has heard it many times. It gives them nothing to hire you for.`,
      },
      {
        text: `My CGPA reflects two semesters I handled badly, and I won't pretend otherwise. Since then my last four semesters average 7.8, and I built two projects alongside. I'd like you to judge me on those.`,
        score: 9,
        why: `You name the weakness in one sentence, show the trend with a number and offer something else to evaluate. That's honest and it moves the conversation forward.`,
      },
    ],
    lesson: `Own a weak number in one sentence, show the trend since, and point to evidence they can test.`,
  },
  {
    id: 'r4-pressure-05',
    round: 4,
    topic: 'weak-profile',
    style: 'any',
    question: `"There's a one-year gap between your 12th and the start of your B.Tech," says the interviewer. "What were you doing?" You spent it retaking an entrance exam and still missed your target rank.`,
    options: [
      {
        text: `I took a drop year to retake the entrance exam, and I missed my target rank. I taught myself Python that year, and that's how I knew I wanted to build software.`,
        score: 9,
        why: `Short, factual and free of drama. The interviewer hears maturity: you tried, it didn't work out and you used the time anyway.`,
      },
      {
        text: `I was preparing for personal reasons, and it's not really related to my engineering career. I'd prefer to focus on my skills and what I can do for the company.`,
        score: 3,
        why: `Refusing to explain makes the gap look bigger than it is. An exam attempt is an ordinary reason and nothing to hide.`,
      },
      {
        text: `I did some freelancing and a few online courses that year, so it was productive. I don't want to go into details, but I gained good experience in the field.`,
        score: 1,
        why: `An invented productive year is easy to probe. When they ask which courses or which clients, the story falls apart and the rest of your answers lose weight.`,
      },
      {
        text: `I was preparing for a better college. I studied twelve hours a day, but it didn't work out. Since joining B.Tech I've been very serious and I'm trying to make up for lost time.`,
        score: 6,
        why: `Honest, but the focus on hours and "lost time" leaves the year sounding wasted, and the answer ends without anything you gained.`,
      },
    ],
    lesson: `Explain a gap in two plain sentences, covering what happened and what you did anyway, then move on.`,
  },
  {
    id: 'r4-pressure-06',
    round: 4,
    topic: 'composure',
    style: 'any',
    question: `You finish your answer about your internship. The interviewer says nothing and just reads their notes. Ten seconds pass, and no new question comes.`,
    options: [
      {
        text: `Add more detail to the same answer, like what else I did in the internship, just so the silence doesn't feel awkward.`,
        score: 3,
        why: `Extra talking tacks weaker material onto a good answer. Rambling is exactly what a silence is testing.`,
      },
      {
        text: `Wait two more seconds, then say, "I can go deeper on the testing side, or move to another project, whichever helps." Then stop talking.`,
        score: 9,
        why: `You offer a direction without rushing, and the silence stays theirs to break. Interviewers often use a pause to see whether you panic.`,
      },
      {
        text: `Smile and wait calmly until they speak, even if it takes another thirty seconds. Filling the gap might look nervous, so staying quiet is the safest.`,
        score: 6,
        why: `Calm is right, but a long silence from you stalls the interview. One short, useful offer shows composure and keeps things moving.`,
      },
      {
        text: `Ask, "Was my answer not good? Should I explain it differently?" so I know where I stand.`,
        score: 1,
        why: `It hands the interviewer your insecurity. The silence probably meant nothing, and now they have to reassure you.`,
      },
    ],
    lesson: `A silence usually means the interviewer is thinking or writing, so stay calm, offer one direction and let them lead.`,
  },
  {
    id: 'r4-pressure-07',
    round: 4,
    topic: 'composure',
    style: 'any',
    question: `You're explaining how you built your project's login page. The interviewer cuts in sharply. "That's not what I asked. I asked how you stored the passwords." Your face goes hot.`,
    options: [
      {
        text: `I'm sorry, I went in the wrong direction, that was my mistake. I stored them hashed with bcrypt. I should have listened more carefully to your question, sorry again.`,
        score: 6,
        why: `The answer is right, but three apologies for a small slip make a small moment bigger. One brief acknowledgement is enough.`,
      },
      {
        text: `I think I stored them in the database with some encryption, I'm not completely sure. I'm a bit nervous today, sorry, and I may be mixing things up.`,
        score: 1,
        why: `Nerves are normal, but a guess on something you actually know, plus a speech about being nervous, makes them doubt the rest of your knowledge.`,
      },
      {
        text: `Right, the passwords. They're hashed with bcrypt and a salt before saving, so plain text never reaches the database. Want me to go into any part of that?`,
        score: 9,
        why: `A two-word acknowledgement, then the exact answer. You stayed on their question without grovelling, which is what composure sounds like.`,
      },
      {
        text: `I was giving context first, because the password part makes more sense once you understand the whole login flow. Let me finish that and I'll come to the passwords.`,
        score: 3,
        why: `Insisting on your order after being redirected sounds like you don't take direction. The interviewer wants the answer now.`,
      },
    ],
    lesson: `When redirected, acknowledge in a few words and answer the exact question you were asked.`,
  },
  {
    id: 'r4-pressure-08',
    round: 4,
    topic: 'dont-know',
    style: 'any',
    question: `"What actually happens inside a HashMap when two keys land in the same bucket?" You know it's called a collision, and that's about all you remember.`,
    options: [
      {
        text: `I remember it's called a collision, but not the internals. My guess is entries get chained within the bucket, and equals is used to find the right key. Is that close? I'd like to understand it properly.`,
        score: 9,
        why: `You separate what you know from what you're guessing, reason from the basics and invite correction. That's how you'd work with a senior engineer.`,
      },
      {
        text: `That wasn't covered in our syllabus, so I haven't studied it. I've used HashMap in projects many times and it worked fine, so I never needed the internals.`,
        score: 3,
        why: `Blaming the syllabus sounds like an excuse, and "never needed the internals" closes the door. The interviewer wanted curiosity, not a defence.`,
      },
      {
        text: `Sorry, I don't know this one. I know HashMaps use hash codes, but I haven't studied the collision part. Can we move to the next question?`,
        score: 6,
        why: `Honest, and better than bluffing. But you stopped at the first wall and showed no reasoning, so the interviewer learns nothing about how you think.`,
      },
      {
        text: `It overwrites the old value, because keys must be unique, so the earlier entry is simply lost. That's why we should always choose distinct keys.`,
        score: 1,
        why: `A confident wrong answer is the worst outcome. You've confused replacing the same key with a collision between different keys, and now they doubt everything else you say.`,
      },
    ],
    lesson: `Say what you know, reason aloud from it and flag guesses as guesses. A confident wrong answer costs more than an honest gap.`,
  },
  {
    id: 'r4-pressure-09',
    round: 4,
    topic: 'dont-know',
    style: 'any',
    question: `Your resume lists Docker under skills. "Explain how a container differs from a virtual machine," says the interviewer. You've followed one tutorial and run about five commands.`,
    options: [
      {
        text: `A container is basically a lightweight VM. Docker packages the application with its dependencies so it runs the same everywhere. I can set one up quickly if you want to see it.`,
        score: 6,
        why: `"Lightweight VM" is the common shortcut and only half right, because it misses the shared kernel. The offer to demo invites a test you may not pass.`,
      },
      {
        text: `I know Docker well enough for this role. Containers come from images and a Dockerfile, and I've used docker-compose too in a simple setup. The VM comparison I'd have to look up, but I can learn it very quickly.`,
        score: 3,
        why: `Listing commands dodges the question asked. It sounds like memorised vocabulary, and "I'd have to look up" is the one thing they wanted from you.`,
      },
      {
        text: `I put it on my resume because most job descriptions ask for it and everyone adds it. I haven't really used it, but I can learn quickly if you give me time.`,
        score: 1,
        why: `The honesty is real, but admitting you pad your resume makes the interviewer doubt every other line on it.`,
      },
      {
        text: `I've only used Docker at a basic level: I containerised a small Flask app from a tutorial. A container shares the host's kernel and is lighter, while a VM carries a full guest OS. I haven't gone deeper.`,
        score: 9,
        why: `You state your real depth, then give a correct answer from it. Interviewers forgive thin experience, but padded skills make them distrust your whole resume.`,
      },
    ],
    lesson: `List only what you can explain at the level you claim, and describe your real depth before they find it themselves.`,
  },
  {
    id: 'r4-pressure-10',
    round: 4,
    topic: 'composure',
    style: 'any',
    question: `"Honestly, students from colleges like yours usually can't handle the pace here," says the interviewer flatly. It's a deliberately unfair comment, and the room goes quiet.`,
    options: [
      {
        text: `I disagree respectfully. Our college has produced good engineers, and some alumni work at top companies. I believe a person's ability matters more than the name of their institution, and I'd like to be judged on my own work.`,
        score: 6,
        why: `Calm and polite, but you're debating the statement instead of proving anything. The interviewer learns about your college and nothing about you.`,
      },
      {
        text: `That may be true of some, so I understand the concern. What I can offer is evidence: I shipped a project in a month alongside exams. Can I walk you through how I managed that deadline?`,
        score: 9,
        why: `You don't argue about the college. You answer the real worry, the pace, with something concrete and stay friendly. That's how you handle a provocation.`,
      },
      {
        text: `Thank you for the feedback, I understand. I'll try to work harder and prove that I can handle the pace, if you give me a chance.`,
        score: 3,
        why: `Agreeing and pleading accepts the stereotype and offers no evidence against it. You sound like someone who already believes the comment.`,
      },
      {
        text: `That's a bit unfair, no? You haven't even seen my work yet. Is it right to judge a candidate by the college name alone?`,
        score: 1,
        why: `The point is fair, but the sharp tone gives the interviewer what they were testing for, which is how you act when provoked.`,
      },
    ],
    lesson: `Don't argue with an unfair comment. Answer the worry underneath it with evidence, in a steady tone.`,
  },
  {
    id: 'r4-pressure-11',
    round: 4,
    topic: 'curveball',
    style: 'any',
    question: `"Suppose it's 2 am in your first week. The app is down, customers are complaining, and you're the only engineer awake. Walk me through what you do." You've never run a production system.`,
    options: [
      {
        text: `I'd quickly restart the servers, since that fixes most outages, and then look into the root cause once customers can use the app again.`,
        score: 3,
        why: `A restart can wipe the logs and state you need, and a first-week engineer changing production alone is risky. Fast action isn't the same as safe action.`,
      },
      {
        text: `I've never handled this, so it's hard to say. I'd probably search the error message online and try different fixes until the site comes back up.`,
        score: 1,
        why: `Trying random fixes on a live system can make things worse, and "hard to say" gives the interviewer nothing to assess.`,
      },
      {
        text: `Check what's actually broken first: the dashboards, the logs, the last deploy. Then message the on-call lead with what I've found, so they aren't woken up blind. If the last deploy is the cause, I'd ask whether to roll it back.`,
        score: 9,
        why: `You gather facts, escalate with information and ask before a risky action. That shows good judgement from a junior who knows their limits.`,
      },
      {
        text: `First I'd tell the team lead and wake the senior engineers, because I'm new and shouldn't touch production alone. I'd wait for instructions before changing anything.`,
        score: 6,
        why: `Escalating is sensible, but only escalating sounds passive. The interviewer wants to see you do something useful first, such as gathering facts.`,
      },
    ],
    lesson: `In an incident, look first, tell the right person what you found and ask before taking any risky action.`,
  },
  {
    id: 'r4-pressure-12',
    round: 4,
    topic: 'curveball',
    style: 'any',
    question: `Out of nowhere: "How many chai stalls are there in Pune?" The interviewer doesn't want an exact figure. They're watching how you handle a question with no right answer.`,
    options: [
      {
        text: `Let me assume Pune has about 70 lakh people. If one stall serves roughly 500 people around it, that's about 14,000 stalls. Offices, colleges and railway areas add more, so I'd say 15,000 to 20,000.`,
        score: 9,
        why: `You state assumptions aloud, do simple arithmetic and adjust for obvious exceptions. The final number matters less than the reasoning they can see.`,
      },
      {
        text: `That seems an odd question for a software role. Pune has maybe 5,000 chai stalls. Shall we move on to the technical questions?`,
        score: 1,
        why: `Calling the question odd and tossing out a number shows impatience with ambiguity, which is the skill being tested.`,
      },
      {
        text: `Pune is a big student city and chai is everywhere, so I'd guess something like 20,000. I could narrow it down if I knew whether you mean registered stalls or all of them.`,
        score: 6,
        why: `Asking what counts is a good instinct, but the number came from feel, with no breakdown anyone could check or argue with.`,
      },
      {
        text: `I don't have any data on that. Can I search it online, or should I just guess 10,000? I'm not sure how to reason about it.`,
        score: 3,
        why: `A bare number with no reasoning is what they're trying to avoid, and asking to search misses the point that the question is about estimating.`,
      },
    ],
    lesson: `For a question with no right answer, state your assumptions, do the arithmetic aloud and give a range.`,
  },

  /* ------------------------------------------------------------ Round 5 --- */
  {
    id: 'r5-closing-01',
    round: 5,
    topic: 'salary',
    style: 'any',
    question: `The HR manager closes with, "What are your salary expectations?" You're a fresher. Seniors say offers here range from 3.5 to 6 LPA, but nobody is certain.`,
    options: [
      {
        text: `I'm open to whatever the company's standard package is for freshers. I'm more interested in learning, so salary isn't my main concern right now.`,
        score: 6,
        why: `It sounds agreeable, but it gives away your room, and "salary isn't a concern" rarely persuades anyone. HR still has to pick a number for you.`,
      },
      {
        text: `I've heard freshers here come in around 4 to 6 LPA. I'd be happy within that range, a little higher if my skills and the role justify it. What's the band for this role?`,
        score: 9,
        why: `You show you've done research, give a range instead of one number and ask for theirs. It becomes a conversation instead of a demand.`,
      },
      {
        text: `I'm looking for 10 LPA. My friend got that at another company last year, and I have good projects and certifications, so I believe I deserve the same. I won't be able to accept anything much lower than that.`,
        score: 1,
        why: `A number set by a friend's offer, not by this role, signals unrealistic expectations. HR has no reason to move forward at that figure.`,
      },
      {
        text: `Sir, whatever you feel is right, I will accept. I just need the job.`,
        score: 3,
        why: `Saying you just need the job removes any reason for a fair offer. HR hears that you'll take the lowest number.`,
      },
    ],
    lesson: `Give a researched range with your reasoning and ask for their band, rather than one unexplained number or none.`,
  },
  {
    id: 'r5-closing-02',
    round: 5,
    topic: 'salary',
    style: 'any',
    question: `HR asks, "What's your current CTC?" You earned 15,000 rupees a month as an intern for four months, and it ended last week. A friend told you to say 3 LPA to anchor higher.`,
    options: [
      {
        text: `As a fresher I don't have a CTC. My internship stipend was 15,000 a month and it has ended. I'm looking for a market-rate figure for the full-time role.`,
        score: 9,
        why: `The facts are exact and easy to verify. You don't inflate, and you steer to the real discussion, which is what the full-time role is worth.`,
      },
      {
        text: `It's around 3 LPA if I include the stipend, certificates and the perks I got during the internship, like food and travel.`,
        score: 3,
        why: `Padding with perks is a stretch that internship letters and background checks can contradict. Even a small inflation puts your honesty in doubt.`,
      },
      {
        text: `My stipend was 15,000 a month, which comes to about 1.8 LPA annually. I'd like to be paid more for a full-time role, so please consider that, because my skills have improved a lot since the internship.`,
        score: 6,
        why: `Truthful, but converting a short stipend into an annual figure makes it sound like a salary, and "please consider that" asks for a favour instead of discussing value.`,
      },
      {
        text: `Why does my past stipend matter? It was only an internship. I'd rather not share it, and I think my expectations should be judged by my skills.`,
        score: 1,
        why: `The point has some truth, but refusing in a prickly way sounds evasive about a simple fact. HR may wonder what you're hiding.`,
      },
    ],
    lesson: `State past pay as it was, in plain numbers, then move the talk to what the new role is worth.`,
  },
  {
    id: 'r5-closing-03',
    round: 5,
    topic: 'offers',
    style: 'any',
    question: `HR calls with an offer of 4.5 LPA. You were hoping for 6, and batchmates got 5.5 at similar firms. You have no other offer in hand. HR asks, "Are you happy with this?"`,
    options: [
      {
        text: `I have other options, so I need 6 LPA or I'll have to think about them. Can you increase it? If not, I may go elsewhere.`,
        score: 1,
        why: `You have no other offer, and HR may call the bluff. An ultimatum at this stage can leave you with no offer at all.`,
      },
      {
        text: `Yes, thank you, I'm very happy. I've been waiting for this and I'm ready to accept right away. When can I sign?`,
        score: 6,
        why: `It's warm and keeps goodwill, but you've closed the discussion in one breath. If you were hoping for more, HR has no way of knowing there was room.`,
      },
      {
        text: `Thank you, I'm excited about the role. The number is a little below what I'd hoped, given my projects and that similar roles are paying about 5.5. Is there any flexibility on the fixed component?`,
        score: 9,
        why: `You thank them, give one concrete reason and ask a question that invites a yes or no. That is firm and polite at once.`,
      },
      {
        text: `I need to discuss this with my parents before I can say anything. I'll let you know whenever I can.`,
        score: 3,
        why: `Taking time can be fine, but with no date and no question, it sounds vague. HR can't tell whether you're negotiating or leaving.`,
      },
    ],
    lesson: `Thank them, give one concrete reason and ask whether there's flexibility. Never bluff about offers you don't have.`,
  },
  {
    id: 'r5-closing-04',
    round: 5,
    topic: 'offers',
    style: 'any',
    question: `You hold an offer from a firm you like less, with a Friday deadline. A company you like more says results come "next week." Your phone rings. The first firm's HR wants your decision.`,
    options: [
      {
        text: `I'll accept now to be safe. If the other company comes through, I'll just decline this one later. Nothing is joined yet, so it's fine.`,
        score: 3,
        why: `Accepting with a plan to back out burns trust, and recruiters talk to each other. A reneged offer can follow you into later job hunts.`,
      },
      {
        text: `I need a few more days to decide. Could you extend the deadline by a week? I have some family discussions pending.`,
        score: 6,
        why: `Asking for time is right, but the family reason hides the real one. A specific date and honest context get a better response.`,
      },
      {
        text: `I have another offer with a higher salary, so if you can match it, I'll accept. Otherwise, I'm going with them.`,
        score: 1,
        why: `You've invented a rival offer that doesn't exist yet. The bluff can be checked and called, and the recruiter's goodwill ends there.`,
      },
      {
        text: `Thank you, I'm happy to have this offer. I'm waiting on one other process that concludes next week, and I'd like to give you a firm answer. Could I have until Wednesday? If not, I'll tell you by Friday.`,
        score: 9,
        why: `You say there's another process, which is honest, ask for a specific date and respect their deadline. Most HR teams prefer that to a late no.`,
      },
    ],
    lesson: `Be honest about a pending process and ask for a dated extension. Never accept an offer you plan to back out of.`,
  },
  {
    id: 'r5-closing-05',
    round: 5,
    topic: 'offers',
    style: 'any',
    question: `In the final round at a company you really want, the manager asks, "Are you interviewing anywhere else? Do you hold any offers?" You have one decent offer, from a firm you're not excited about.`,
    options: [
      {
        text: `Yes, I have one offer, but I haven't accepted. This role is my first choice, so I'd like to know your timeline.`,
        score: 9,
        why: `The truth, plus a clear preference, gives them a reason to move quickly and shows you know what you want.`,
      },
      {
        text: `Yes, I have three offers, including two from top companies. I'm waiting to see what you'd offer before I decide who gets my yes.`,
        score: 1,
        why: `Inflating the count and treating them as bidders turns a conversation into a standoff. Hiring managers rarely bid against a student's exaggeration.`,
      },
      {
        text: `No, I don't have any offers yet. I'm just focused on this interview and want to give it my full attention, because I don't want to split my focus between companies.`,
        score: 3,
        why: `Hiding a real offer feels safe, but it can surface at the paperwork stage, and a lie sours things. It also throws away the urgency your other offer creates.`,
      },
      {
        text: `Yes, I do, but I'd prefer not to name the company. I'm focusing on this opportunity, and I'm very interested in joining you. I'd rather keep that other process private.`,
        score: 6,
        why: `Declining to name the firm is fair, and the interest is good. But you haven't said whether you've accepted or when you must decide, which is what they really asked.`,
      },
    ],
    lesson: `If asked about other offers, answer honestly, say which way you lean and why, and neither exaggerate nor hide.`,
  },
  {
    id: 'r5-closing-06',
    round: 5,
    topic: 'questions-back',
    style: 'any',
    question: `At the end, the engineering manager says, "That's all from me. Do you have any questions for us?" You're tired and nervous, and everything you'd planned to ask was already covered.`,
    options: [
      {
        text: `What does your company do exactly? And what's the work culture like? I couldn't find much on the website.`,
        score: 3,
        why: `Asking what the company does shows you didn't prepare, and "culture" with no specifics gets a stock answer. You've told them you skipped basic research.`,
      },
      {
        text: `Not really, you've covered everything already. Thank you for your time. I enjoyed the discussion and I'm very interested in this role.`,
        score: 6,
        why: `Polite, but "no questions" can read as low curiosity at the exact moment you're meant to show some. One prepared question would have helped.`,
      },
      {
        text: `One. What would a new joiner on this team be expected to have shipped or learnt by the end of three months? I'd like to know what a good start looks like.`,
        score: 9,
        why: `It shows you're thinking about doing the job well, and the answer tells you something real about the team. It's about the work, not the brochure.`,
      },
      {
        text: `What's the salary and how many leaves do we get? Also, is work from home allowed, and how soon can I expect the result? And will there be any night shifts or weekend work?`,
        score: 1,
        why: `These are fair things to want to know, but leading with pay and leave suggests that's all you care about. Save them for HR.`,
      },
    ],
    lesson: `Keep one prepared question about the work, the team or what success looks like in the first months.`,
  },
  {
    id: 'r5-closing-07',
    round: 5,
    topic: 'growth',
    style: 'any',
    question: `"Where do you see yourself in five years?" asks the HR manager, smiling. You're applying as a software developer. You're unsure of the future, but you do want to keep growing technically.`,
    options: [
      {
        text: `I see myself as a team lead or manager, running a big team and taking strategic decisions for the company. I'm a leader by nature, I've always been the one who organises groups, and I want to grow fast.`,
        score: 6,
        why: `Ambition is fine, but "manager" five years in skips the engineering years, and it can suggest you'd rather leave the work behind for a title.`,
      },
      {
        text: `I'd like to be a strong engineer who owns a module end to end and can mentor new joiners. Whether that becomes a lead path or a specialist one, I'll decide as I learn what I'm good at.`,
        score: 9,
        why: `Honest, tied to the actual job and open about what you don't yet know. HR hears someone who will stay and become useful.`,
      },
      {
        text: `I want to be in your company in five years, growing with it. I can't plan beyond that, because the future is very uncertain, but I'll work hard.`,
        score: 3,
        why: `Loyalty is nice, but there's no skill, no role and no direction in it. It sounds like a rehearsed line and tells HR nothing.`,
      },
      {
        text: `Honestly, I plan to do an MBA or MS in two or three years, and then see where life takes me. I'm treating this job as a starting point.`,
        score: 1,
        why: `Plans to study are legitimate, but telling HR you'll leave in two years makes them wonder why they should invest in training you.`,
      },
    ],
    lesson: `Describe growth in skills and responsibility inside the role, not in titles, and keep it honest.`,
  },
  {
    id: 'r5-closing-08',
    round: 5,
    topic: 'commitment',
    style: 'any',
    question: `"We'd like you to join on June 1," says the recruiter. Your final semester exams run until June 14. The offer letter has no joining clause yet, and your college hasn't published the result date.`,
    options: [
      {
        text: `I'll check with my college and let you know. It depends on whether the exams get postponed, so I can't confirm a date now.`,
        score: 6,
        why: `Not committing to a date you can't keep is wise, but you offer no alternative, and "it depends" gives the recruiter nothing to plan around.`,
      },
      {
        text: `June 1 is fine, I'll manage the exams somehow. I can study in the evenings and take leave for the paper days if needed.`,
        score: 3,
        why: `You're promising something you can't deliver. Exam days clashing with a new job will cost you either your degree or your reputation in week one.`,
      },
      {
        text: `I might be able to join earlier if I skip the final exams and write them later as a backlog, since the job matters more than the semester.`,
        score: 1,
        why: `Offering to skip exams can put your degree at risk, and most employers need that certificate. They'd see poor judgement, not dedication.`,
      },
      {
        text: `I'd love to join. My last exam is on June 14, so I can start June 17. I'll send the schedule today. Would that work?`,
        score: 9,
        why: `You say yes to joining, give a precise date backed by a document and ask, instead of promising something that clashes. That's reliable behaviour.`,
      },
    ],
    lesson: `Offer a joining date you can actually keep, with the reason behind it, before they have to ask.`,
  },
  {
    id: 'r5-closing-09',
    round: 5,
    topic: 'commitment',
    style: 'any',
    question: `The offer is in Bengaluru, and you live in Jaipur. The recruiter says, "We don't give a relocation allowance, so you'd arrange your own housing from day one. Is that a problem?" Take-home is about 38,000 a month.`,
    options: [
      {
        text: `That's difficult for me. Rent in Bengaluru is very high and 38,000 won't cover it. Can you add a relocation allowance? Otherwise I may not be able to join.`,
        score: 1,
        why: `The concern is real, but opening with "difficult" and a threat to not join makes it a demand. Say yes to the move first, then ask about support.`,
      },
      {
        text: `I'm happy to relocate. Is there a guest house or short-term stay for the first couple of weeks? Deposits and rent will hit early, so I'd like to plan for it. Otherwise I'll manage.`,
        score: 9,
        why: `You say yes first, then raise a practical cost question calmly. Recruiters respect planning, and asking isn't the same as refusing.`,
      },
      {
        text: `I'll think about it. Maybe I can stay in Jaipur and join remotely for some months until I settle. Is that an option?`,
        score: 3,
        why: `Asking for a remote start on an on-site role looks like avoiding the move. It reads as reluctance to commit, and not as a practical question.`,
      },
      {
        text: `Not a problem at all, I'll manage anything. I'm ready to relocate and I'll adjust to whatever conditions the company has.`,
        score: 6,
        why: `Easy to say, but if deposits and rent start eating the take-home, a blanket yes today becomes a complaint in month two.`,
      },
    ],
    lesson: `Agree to the move first, then ask one practical question about support, instead of hiding the cost or issuing a threat.`,
  },
  {
    id: 'r5-closing-10',
    round: 5,
    topic: 'commitment',
    style: 'any',
    question: `The offer letter has a two-year service agreement: leave early and repay 2 lakh rupees. HR says, "This is standard, please sign today." Your parents are waiting at home to hear the news.`,
    options: [
      {
        text: `Thank you. Before signing, may I take the letter home for a day to read the clause fully? I'd like to understand what triggers repayment, and whether it reduces after the first year.`,
        score: 9,
        why: `You're not refusing, you're reading carefully and asking precise questions about triggers and terms. That sounds careful, not difficult.`,
      },
      {
        text: `I'll sign if it's standard. Most companies have this, and I'm planning to stay long anyway, so the bond doesn't worry me.`,
        score: 6,
        why: `Your attitude is positive, but signing a repayment clause unread is a risk. Plans change, and 2 lakh is a lot of money for a fresher.`,
      },
      {
        text: `Let me sign now and ask my parents' opinion later. If there's a problem I can discuss it with HR after joining, since they'll know me better by then.`,
        score: 1,
        why: `After joining you've lost your leverage, and signed terms are hard to change. The time to question a bond is before the signature.`,
      },
      {
        text: `I'm not comfortable with any bond, so I'd rather not sign. Can you remove the clause? Otherwise I'll have to decline the offer.`,
        score: 3,
        why: `Rejecting the idea without learning its terms is blunt. Some terms can be discussed, but not through an ultimatum.`,
      },
    ],
    lesson: `Never sign on the spot. Ask for time, read the exit terms and find out exactly what triggers any repayment.`,
  },
  {
    id: 'r5-closing-11',
    round: 5,
    topic: 'commitment',
    style: 'any',
    question: `"What would make you leave a job?" asks the hiring manager, leaning back. Your honest first thoughts are low pay, a bad manager and boring work.`,
    options: [
      {
        text: `Only if the company asked me to do something unethical, or if the environment were toxic. I can adjust to everything else.`,
        score: 6,
        why: `Safe and defensible, but extreme. It sounds rehearsed because it skips the everyday reasons people actually leave.`,
      },
      {
        text: `A bad manager. In my internship, my mentor was rude and I couldn't learn anything, so I know I can't work under someone like that. Nobody should have to put up with such behaviour for long.`,
        score: 1,
        why: `Criticising a past mentor makes the interviewer wonder how you'd describe them later. It also suggests you leave when things get hard.`,
      },
      {
        text: `If I stopped learning, or the work had no real challenge for a long time, I'd start looking. Before leaving, I'd raise it with my manager and try to fix it.`,
        score: 9,
        why: `You give a real reason tied to your growth and say you'd talk first. That's honest and shows you raise problems before walking away.`,
      },
      {
        text: `Nothing really. I'm a very loyal person and I'll stay wherever I'm given a chance, whatever the circumstances.`,
        score: 3,
        why: `It sounds committed, but nobody believes it, and it avoids the question. The interviewer concludes the answer is scripted.`,
      },
    ],
    lesson: `Name a real, professional reason, such as no learning, and say you'd raise it before leaving. Don't claim you'd never leave.`,
  },
  {
    id: 'r5-closing-12',
    round: 5,
    topic: 'offers',
    style: 'any',
    question: `HR says, "We'd like to offer you a place, but in the testing team, not development, which you applied for." You've prepared for developer roles for a year. The pay is the same.`,
    options: [
      {
        text: `Thank you. Could you tell me more about the testing team's work, especially automation, and whether people move into development after a year? I'd like to decide with clear information.`,
        score: 9,
        why: `You ask what the role really involves and where it leads. That makes it an informed decision, not a reflex in either direction.`,
      },
      {
        text: `I applied for development only, so I can't accept testing. If there's no developer opening, I'd rather decline politely.`,
        score: 3,
        why: `A firm preference is fine, but a flat no without a single question leaves no middle path, and you haven't learnt what the role really is.`,
      },
      {
        text: `I'd rather wait for a developer offer from another company, but I'll keep this as a backup. Can you keep it open for a month? I'll confirm as soon as the other results are out.`,
        score: 1,
        why: `Asking a company to hold a role you plan to drop shows little regard for them, and a month is a long time to hold an offer.`,
      },
      {
        text: `I'll accept anything just to start, and then try to move into development later. Once I'm inside, switching teams will be easy.`,
        score: 6,
        why: `Testing can be a good start, but "easy" is an assumption. Moves depend on the company, and using the role as a ladder can worry HR.`,
      },
    ],
    lesson: `Before accepting or refusing a different role, ask what the work is and where it can lead.`,
  },

  /* ------------------------------------------------------- Style: service --- */
  {
    id: 's-service-01',
    round: 1,
    topic: 'aptitude-test',
    style: 'service',
    question: `A large IT services firm's online test has a standard section and an optional harder coding section for its higher-paying track. The placement cell says missing the harder cut-off doesn't affect your standard result. You have 25 minutes left, and the standard section is done.`,
    options: [
      {
        text: `Jump straight into the harder section. Rechecking the standard section wastes minutes I need for the hard problems, and I'm already fairly confident in those answers.`,
        score: 6,
        why: `Going for the upside is right, but a standard section that was never rechecked is where a careless slip costs you the basic offer.`,
      },
      {
        text: `Skip the harder section and submit. I'm comfortable with the standard track, and a hard test I might fail will only hurt my confidence before the interview.`,
        score: 3,
        why: `Protecting confidence is human, but with no penalty, skipping gives up a free chance at a better package. Fear is making the call.`,
      },
      {
        text: `Recheck the flagged questions in the standard section for two minutes, then attempt the harder one, easiest problem first. One solved problem could move me toward the better track.`,
        score: 9,
        why: `With no penalty, the harder section is pure upside. Protect the work you've secured first, then take the easiest points available.`,
      },
      {
        text: `Start with the hardest problem in the harder section, since solving it would impress the evaluators most. If I'm stuck, I'll keep thinking until time runs out, because giving up on a problem feels like failing.`,
        score: 1,
        why: `Chasing the toughest question can burn all your time for zero points. Taking the easiest first puts something on the board.`,
      },
    ],
    lesson: `When a harder option carries no penalty, attempt it, but secure what you've already done and take the easiest points first.`,
  },
  {
    id: 's-service-02',
    round: 1,
    topic: 'communication-test',
    style: 'service',
    question: `In an automated speaking test for a large IT services firm, the screen says, "Talk for 45 seconds about your hometown." The recording starts, and your mind goes blank for a moment.`,
    options: [
      {
        text: `Start simply: "I'm from Nashik, a city known for its vineyards and temples." Then give a few plain facts, one personal memory and a closing line before the timer ends.`,
        score: 9,
        why: `Clear, slow sentences with a beginning and an end work well in these tests. The aim is to be easily understood, not to show off vocabulary.`,
      },
      {
        text: `Say, "Sorry, can I restart? I wasn't ready," and begin again. If the system doesn't allow that, I'll stay silent for a bit, collect my thoughts and then continue slowly from the beginning.`,
        score: 1,
        why: `Asking a machine to restart wastes your 45 seconds, and silence gets scored. Apologising to an automated test helps nobody.`,
      },
      {
        text: `Speak continuously without pauses so the recording is never silent. If I forget a word, I'll rush on, because long silences might reduce my fluency score.`,
        score: 6,
        why: `Fluency matters, but rushing worsens pronunciation and makes the answer messy. A short pause to think beats a stream of filler words.`,
      },
      {
        text: `Use advanced vocabulary and long sentences, like "my hometown is a vibrant confluence of heritage and modernity", to show that my English is strong.`,
        score: 3,
        why: `Heavy vocabulary tends to trip your pronunciation and rhythm, and the listener hears recitation. Plain sentences land better.`,
      },
    ],
    lesson: `In a spoken test, use short plain sentences with a clear start and finish, and keep a steady pace.`,
  },
  {
    id: 's-service-03',
    round: 2,
    topic: 'team-player',
    style: 'service',
    question: `A large IT services firm's interviewer asks, "In your group project, one teammate did almost nothing. What did you do?" They're listening for how you treat people, not for who was right.`,
    options: [
      {
        text: `I complained to our project guide that the teammate wasn't working, and asked that the marks be given according to contribution.`,
        score: 3,
        why: `Going straight to the guide skips the direct conversation. The interviewer hears someone who reaches for authority first.`,
      },
      {
        text: `I spoke to Arjun privately first and found the module was too big for one person. We split it into smaller tasks, I checked in daily, and I took one part myself. We submitted on time.`,
        score: 9,
        why: `You talked to the person before escalating, found the cause and kept the project moving. That's what a team player does at work, where you can't just replace people.`,
      },
      {
        text: `I did the extra work myself so the team wouldn't suffer. I didn't want any conflict before the demo, and the final result was good. Our guide was very happy.`,
        score: 6,
        why: `Delivering is good, but absorbing it silently hides the problem. At work that means overload for you and the same pattern next time.`,
      },
      {
        text: `Honestly, I stopped depending on them. I did my own portion and nothing more. If they didn't care about the project, why should I?`,
        score: 1,
        why: `It's understandable, but "why should I" is the opposite of a team player. Service firms put you in large teams where this attitude spreads fast.`,
      },
    ],
    lesson: `Talk to the person first, find the real cause, then rearrange the work. Don't silently absorb it or go straight to authority.`,
  },
  {
    id: 's-service-04',
    round: 3,
    topic: 'basics-plainly',
    style: 'service',
    question: `"Your project uses MySQL, so tell me, what is normalization and why do we do it?" A panel member at a large IT services firm asks this plainly, with no tricks. You have about two minutes.`,
    options: [
      {
        text: `It's the process of removing redundancy using normal forms: 1NF, 2NF, 3NF and BCNF. In 1NF there are no repeating groups, in 2NF no partial dependency, and in 3NF no transitive dependency.`,
        score: 6,
        why: `Correct textbook content, recited with no example from your own work. The panel can't tell whether you understand it or memorised it.`,
      },
      {
        text: `It's a database design technique, very important for performance and data integrity. Without normalization, the database will not work properly and will become very slow.`,
        score: 3,
        why: `Big claims with no explanation. Normalization isn't mainly about speed, and "will not work properly" is an easy point for a follow-up to expose.`,
      },
      {
        text: `I used MySQL through Workbench, and I created tables and ran queries. I haven't implemented normalization separately, but my tables were designed by my teammate.`,
        score: 1,
        why: `You've moved off the question to your tools and then handed the design to someone else. On a basics question about your own project, that sounds evasive.`,
      },
      {
        text: `Normalization means organising tables so each fact is stored once. In my library project, I kept the author's name in its own table instead of repeating it in every book row.`,
        score: 9,
        why: `A plain one-line definition plus a small example from your own project shows understanding, which is what a basics question is checking.`,
      },
    ],
    lesson: `For a basics question, give a one-line definition and one small example from your own project.`,
  },
  {
    id: 's-service-05',
    round: 4,
    topic: 'client-communication',
    style: 'service',
    question: `In a role-play, the interviewer plays an angry client. "Your team missed the delivery date again. I've lost a week. Why should I keep trusting you?" The delay really came from another team's late input.`,
    options: [
      {
        text: `I'm sorry about the lost week. The input reached us late, so the new date is Thursday, and I'll update you every morning until then. Can I confirm Thursday with my lead and call back today?`,
        score: 9,
        why: `You acknowledge the impact, give a plan with a date and promise regular updates, without blaming a colleague. Clients forgive delays more easily than silence.`,
      },
      {
        text: `The delay wasn't from my side. We were waiting for input from the other team, and it came late. Once we got it, we worked as fast as possible, and honestly the other team should explain this to you.`,
        score: 3,
        why: `It's true, but it's an answer made of blame. The client doesn't care which team was late. They care about a plan and a date.`,
      },
      {
        text: `I apologise sincerely, we'll deliver it as soon as possible. I'll ask the team to work extra hours this week so it gets done. You have my full commitment.`,
        score: 6,
        why: `The tone is right, but "as soon as possible" isn't a date, and promising extra hours is a commitment a junior can't make for the team.`,
      },
      {
        text: `I understand, sir. I'll escalate this to my manager right away and they will speak to you. I'm only a trainee, so I can't make decisions about delivery.`,
        score: 1,
        why: `Escalating isn't wrong, but a handoff with no information leaves the client feeling ignored. Even a trainee can acknowledge, explain and promise to come back.`,
      },
    ],
    lesson: `With an angry client, apologise for the impact, give the real reason briefly and offer a dated plan without blaming another team.`,
  },
  {
    id: 's-service-06',
    round: 5,
    topic: 'shifts-relocation',
    style: 'service',
    question: `In the HR round at a large IT services firm: "Are you ready to work night shifts for an overseas client, and to be posted anywhere in India?" You live with your parents in a small town, and you've never worked nights.`,
    options: [
      {
        text: `Yes sir, I'm ready for anything. Night shifts, any location, any project. I'll adapt, and my only priority is to join the company.`,
        score: 6,
        why: `A flat yes sounds keen but also careless. HR has heard it from everyone, and some of those candidates quit within months when the reality hits.`,
      },
      {
        text: `Yes, I understand client time zones mean night shifts at times, and that I may be posted anywhere. I'm ready for both. How long is the usual training period?`,
        score: 9,
        why: `A clear yes that shows you understand what's involved, followed by a practical question. That reads as someone who will turn up and stay.`,
      },
      {
        text: `I'm okay with relocation, but night shifts might be difficult for my health. Could I be placed in day shifts, or in a city near my hometown?`,
        score: 3,
        why: `Stating preferences isn't wrong, but asking for day shifts and a nearby city before an offer tells HR you come with conditions on both counts.`,
      },
      {
        text: `I'll agree now because I need the job, but my parents don't like the idea of night shifts, so I may need to refuse later. I'm just telling you the situation.`,
        score: 1,
        why: `You've told HR you may back out after joining. They can't plan around a yes that carries a built-in no.`,
      },
    ],
    lesson: `Say yes only to what you'll actually do, show you understand what it involves and ask a practical question.`,
  },

  /* ------------------------------------------------------ Style: bigtech --- */
  {
    id: 's-bigtech-01',
    round: 1,
    topic: 'why-company',
    style: 'bigtech',
    question: `A recruiter at a big tech company asks, "Why do you want to work here?" Your honest reasons: it pays well, your seniors are there, and you use their products every day.`,
    options: [
      {
        text: `I use your maps product daily in Pune, and I've wondered how it handles routes in bad traffic. I built a small route planner for my project, and I'd like to work on that problem at scale.`,
        score: 9,
        why: `A product you really use, something you built and a reason tied to the work. The recruiter hears interest in the problems themselves.`,
      },
      {
        text: `This company is a global leader, with great engineers and a strong learning culture. Working here would be a great start to my career and I'd learn from the best.`,
        score: 6,
        why: `True of ten other companies. It's polite, but nothing in it could only be said about this one.`,
      },
      {
        text: `Your company pays one of the highest packages for freshers, and the brand value is great for my resume and my family's pride.`,
        score: 3,
        why: `Honest, but pay and prestige alone make you look like someone who'd leave for the next better offer. Interviewers listen for what you'd actually build.`,
      },
      {
        text: `I've been preparing for this company for two years and solved 800 problems on practice sites. This has been my dream since first year, and I'll do anything, work any hours and go anywhere to get in.`,
        score: 1,
        why: `The effort is real, but a dream with no reason gives the recruiter nothing about the company or the role. "Anything" sounds like pleading.`,
      },
    ],
    lesson: `Name something specific you use or have built that connects to the work, instead of praising the company's size.`,
  },
  {
    id: 's-bigtech-02',
    round: 2,
    topic: 'ownership-story',
    style: 'bigtech',
    question: `A big tech interviewer says, "Tell me about a time you took ownership of a problem that wasn't strictly yours." You have a real example: your club's event-registration sheet kept breaking.`,
    options: [
      {
        text: `I take ownership of any problem I see. If something isn't working, I don't wait for permission, I just go and fix it. That's how I've always worked.`,
        score: 3,
        why: `A claim about your character, with no story behind it. Behavioural questions want one specific event, not a description of your nature.`,
      },
      {
        text: `My club's registration was a mess because the coordinator was careless. Eventually I had to step in and fix everything myself, since nobody else would.`,
        score: 1,
        why: `Blaming the coordinator turns an ownership story into a complaint. The interviewer hears someone who steps in resentfully and may criticise colleagues later.`,
      },
      {
        text: `Our club's registration sheet kept breaking before every event, and nobody owned it. I rebuilt it as a form with validation and trained two volunteers. Duplicate entries dropped from about 30 to 2 at the next fest.`,
        score: 9,
        why: `Problem, your own action and a number for the result. "I" is used for what you did, which is what the interviewer needs to evaluate.`,
      },
      {
        text: `In our club, we noticed the registration sheet kept breaking, so we decided to fix it. We built a form together and it worked much better for the next fest. Everybody appreciated it, and the club president thanked the team.`,
        score: 6,
        why: `The story is good, but "we" throughout hides what you did. The interviewer can't give you credit for work you don't separate out.`,
      },
    ],
    lesson: `Tell one real story with the problem, what you personally did and a number for the result.`,
  },
  {
    id: 's-bigtech-03',
    round: 3,
    topic: 'clarify-first',
    style: 'bigtech',
    question: `A big tech interviewer says, "Given an array of integers, find two numbers that add up to a target." You already know the hash map solution, and your hands are itching to start typing.`,
    options: [
      {
        text: `Start coding the hash map solution right away to save time, and explain the approach while writing. A fast, correct solution will impress more than questions.`,
        score: 3,
        why: `Racing ahead skips the check that you've understood the problem. If the array can have duplicates or no valid pair, your code may solve the wrong problem.`,
      },
      {
        text: `Ask first: can numbers repeat, can the array be empty, is there always exactly one answer, and can values be negative? Then state my plan before coding.`,
        score: 9,
        why: `These questions change the code, and asking them first shows how you'd work with real requirements. Interviewers at this level expect you to pin the problem down first.`,
      },
      {
        text: `Say, "Brute force is two loops, O(n squared). I can improve it with a hash map to O(n)." Then ask whether they want me to optimise or code the simple version first.`,
        score: 6,
        why: `Showing the trade-off is good, but you haven't checked the problem's constraints, and you asked a coding-order question instead of a question about the input.`,
      },
      {
        text: `Mention that the question looks familiar from a practice site, say I've solved it before, and code it quickly from memory to save time for harder follow-ups.`,
        score: 1,
        why: `Announcing you've seen it and writing from memory shows recall, not reasoning. Some interviewers will simply switch to a harder question.`,
      },
    ],
    lesson: `Ask a few questions about inputs and edge cases, then state your approach, before you write any code.`,
  },
  {
    id: 's-bigtech-04',
    round: 3,
    topic: 'system-design-basics',
    style: 'bigtech',
    question: `"Design a URL shortener," says the interviewer. You've read about hashing, databases, caches and load balancers. The whiteboard is blank.`,
    options: [
      {
        text: `First I'd confirm requirements: how many URLs per day, whether links expire, whether custom aliases are needed. Then I'd estimate scale, sketch a simple write and redirect flow, and add pieces like a cache only where the numbers need them.`,
        score: 9,
        why: `Requirements and numbers first, then the simplest design that fits. That ordering is the skill the interviewer is checking.`,
      },
      {
        text: `I'd use a load balancer, a distributed cache, a sharded database, a message queue for analytics and a CDN for fast redirects, so it scales to billions of users.`,
        score: 3,
        why: `Listing every large-system component with no reason signals memorised buzzwords. The interviewer can't see why any piece is needed.`,
      },
      {
        text: `I'd write a hash function that converts the long URL into a short string using MD5 and keep the first six characters. Then I'd store it in a table.`,
        score: 1,
        why: `Jumping to one implementation detail skips the design conversation, and truncated hashes collide. You're treating a design question like a coding question.`,
      },
      {
        text: `I'd start with the core: generate a short code, store the mapping in a database and redirect on lookup. Once that works, I'd talk about scaling with caching and sharding.`,
        score: 6,
        why: `Starting simple is right, but you never asked about scale or features, so you can't say which scaling ideas are needed.`,
      },
    ],
    lesson: `In a design question, get requirements and rough numbers first, then draw the simplest design that meets them.`,
  },
  {
    id: 's-bigtech-05',
    round: 4,
    topic: 'asking-for-hints',
    style: 'bigtech',
    question: `You've been stuck for ten minutes on a graph problem in a big tech coding round. Your approach isn't working. The interviewer has been silent for a while, and time is running out.`,
    options: [
      {
        text: `Switch to a brute force solution without telling the interviewer, hoping it passes the sample cases, and get something working on screen before time ends.`,
        score: 1,
        why: `Changing direction without a word looks like panic. Brute force is fine to propose, but say what you're doing and why.`,
      },
      {
        text: `Say what I've tried and why it fails: "BFS gives the shortest path, but I'm missing the weight constraint. Is there a property of the input I should use?" Then work on the hint aloud.`,
        score: 9,
        why: `Showing your thinking lets the interviewer give a precise nudge, and asking about input properties points them to exactly where you're stuck.`,
      },
      {
        text: `Say, "I'm stuck, can you give me the solution approach?" It's better to learn the idea now than waste the remaining time going in the wrong direction, and I can understand it quickly once it's explained.`,
        score: 6,
        why: `Asking is better than silent struggle, but asking for the whole solution gives the interviewer no reasoning of yours to build a hint on.`,
      },
      {
        text: `Keep trying quietly for another five minutes. Asking for hints will reduce my rating, so I'll only ask if I'm completely out of ideas.`,
        score: 3,
        why: `Silent struggle burns your time and shows nothing. Interviewers prefer a candidate who takes a hint well to one who stays stuck alone.`,
      },
    ],
    lesson: `When stuck, say what you've tried and where it fails, then ask a specific question and use the hint aloud.`,
  },
  {
    id: 's-bigtech-06',
    round: 5,
    topic: 'self-reflection',
    style: 'bigtech',
    question: `In the final interview at a big tech company, the interviewer says, "Looking back at today's coding rounds, what's one thing you'd do differently?" You froze for several minutes on the second problem.`,
    options: [
      {
        text: `I should have studied more graph problems before coming. That topic was my weak area, and I'll practise more of them before the next interview.`,
        score: 6,
        why: `Honest, but "study more" is a generic fix. It doesn't address what actually hurt you, which was freezing instead of talking.`,
      },
      {
        text: `I'd ask for the question a day in advance. The problem was unfamiliar, and in real work we get time to research before solving something, so this format is a bit unfair to people who think slowly.`,
        score: 1,
        why: `Blaming the format sounds like someone who'll resist feedback at work. The question was meant to test how you reason on something unfamiliar.`,
      },
      {
        text: `Nothing major. I think I performed well overall and solved most of the questions. I just got a little nervous on the second one, which is natural for anyone.`,
        score: 3,
        why: `Brushing off the freeze tells the interviewer you don't examine your own mistakes, and a repeated pattern is what they'd be hiring.`,
      },
      {
        text: `On the second problem I froze and went quiet instead of thinking aloud. Next time I'll write the brute force first, say it aloud, then improve it. I've started practising that with a timer.`,
        score: 9,
        why: `You name the actual mistake, say what you'd change and show you've started. Self-awareness with a concrete fix is hard to fake.`,
      },
    ],
    lesson: `Name the actual mistake, say what you'd change and show that you've already started on it.`,
  },

  /* ------------------------------------------------------ Style: product --- */
  {
    id: 's-product-01',
    round: 1,
    topic: 'why-product',
    style: 'product',
    question: `A mid-size product company's interviewer asks, "Most students from your college go to services firms. Why do you want a product company?" The honest answer: you heard the pay is better, and you like building things end to end.`,
    options: [
      {
        text: `Product companies have better work culture and pay, and I've read that growth is faster. I don't want to waste my first years on support work.`,
        score: 3,
        why: `Honest, but it's about what you'll get, not what you'll give. The "support work" remark also puts down other people's jobs.`,
      },
      {
        text: `I want to learn the full product cycle: design, development, testing and release. Services firms mostly work on one part for a client, so a product company gives broader learning and a chance to see the whole system.`,
        score: 6,
        why: `A fair reason, but it's an assumption about services work you haven't done. A personal example would make it yours.`,
      },
      {
        text: `Honestly, I applied to every company that came to campus. Product is just one of the options for me, and I'll go wherever an offer comes first.`,
        score: 1,
        why: `Plain honesty about your search isn't wrong, but this tells the interviewer nothing about their company mattered to you.`,
      },
      {
        text: `I like building something people use. In my final-year project I watched classmates use the app and changed three screens because they got confused. I want that build, watch, fix cycle to be my daily work.`,
        score: 9,
        why: `A real example of caring about users answers the question with evidence. Product interviewers want people who notice how others use what they build.`,
      },
    ],
    lesson: `Answer "why a product company" with something you built for real users, not with pay or culture claims.`,
  },
  {
    id: 's-product-02',
    round: 2,
    topic: 'user-care',
    style: 'product',
    question: `"Tell me about a time you made something better for its users when nobody asked you to," says the product company interviewer. You once spent a weekend improving your hostel mess menu page.`,
    options: [
      {
        text: `Students kept missing mess menu changes in our group chat. I built a page showing today's menu and asked ten students to try it. Three found the font too small, so I fixed it.`,
        score: 9,
        why: `You noticed a real problem, asked actual users and acted on what they said. That loop is what product companies mean by caring about quality.`,
      },
      {
        text: `In my internship I noticed some bugs in the existing app and reported them to my mentor. It wasn't my job to fix them, so I left it with the team, who said they'd take care of it later.`,
        score: 3,
        why: `Reporting is fine, but stopping there is the wrong end of an initiative story. The interviewer wanted to hear what you did, not what you handed off.`,
      },
      {
        text: `I redesigned the interface of our department website to look more modern, with a new colour scheme and animations. Everyone said it looked great, and the HOD appreciated it.`,
        score: 6,
        why: `The effort is clear, but the praise is about looks. Nothing says anyone using it found it easier.`,
      },
      {
        text: `I always try to write clean code and follow best practices in all my projects, because I believe the quality of a product depends on the code behind it.`,
        score: 1,
        why: `A belief with no event. Clean code matters, but the question asked about users, and you haven't mentioned one.`,
      },
    ],
    lesson: `Pick a story where you found a user problem yourself, checked with real users and changed something because of it.`,
  },
  {
    id: 's-product-03',
    round: 3,
    topic: 'language-depth',
    style: 'product',
    question: `You say Python is your strongest language. The interviewer writes: def add(x, items=[]): items.append(x); return items. "What do add(1) and then add(2) return?"`,
    options: [
      {
        text: `I don't write functions like this in practice. I'd use a class or a dictionary, so it isn't something I'd run into. Can we try a different question?`,
        score: 3,
        why: `Sidestepping a question on your strongest language looks like avoiding the weak spot. The interviewer will conclude your depth is shallow.`,
      },
      {
        text: `Second call returns [1, 2], I believe. The default list is created once when the function is defined and shared by every call. The usual fix is items=None, and then creating a new list inside.`,
        score: 9,
        why: `You predict the output, give the reason and name the fix. That's depth in one language, which is what this round looks for.`,
      },
      {
        text: `I'd guess [1] and then [2], since each call starts with an empty list. Hmm, I'm not certain. I'd run it to check.`,
        score: 6,
        why: `The prediction is wrong, but you flagged doubt and offered to test it. That's honest, though someone strong in Python would have caught this classic.`,
      },
      {
        text: `It returns [1] and then [2]. Default arguments are evaluated fresh on each call, so there's no shared state between calls. This is the standard behaviour.`,
        score: 1,
        why: `A confident wrong answer on the language you call your strongest damages the claim. The shared default list is a classic gotcha.`,
      },
    ],
    lesson: `Know one language well enough to predict what code does and explain why, including its famous gotchas.`,
  },
  {
    id: 's-product-04',
    round: 3,
    topic: 'test-your-own-code',
    style: 'product',
    question: `In a practical round at a product company, you finish writing a function that merges two sorted lists. You feel done. The interviewer, watching your screen, asks, "Okay, is it working?"`,
    options: [
      {
        text: `I ran the sample input from the problem statement and it gives the right output, so it works. Should I explain the complexity now?`,
        score: 6,
        why: `Better than guessing, but one sample isn't a test. Empty lists and duplicates are where merge functions usually break.`,
      },
      {
        text: `I think so, but I'm not sure about edge cases. Maybe you can give me some test cases and I'll see whether it passes them.`,
        score: 1,
        why: `Handing the testing to the interviewer shows you wait for others to find your bugs. Producing your own test cases is part of the job.`,
      },
      {
        text: `Let me check. I'll run a normal case, an empty list, one list much longer than the other, and duplicates. If something fails, I'll fix it before we discuss complexity.`,
        score: 9,
        why: `You prove it works with tests aimed at the usual failure points. Practical rounds are mostly about whether you hand over code that has been tested.`,
      },
      {
        text: `Yes, the logic is correct. I traced it on paper while writing, and it works for any sorted input.`,
        score: 3,
        why: `You asserted correctness without running anything. Tracing in your head misses the empty-list and off-by-one slips that real tests catch.`,
      },
    ],
    lesson: `Before saying done, run your own tests, including empty and unusual inputs, and fix whatever fails.`,
  },
  {
    id: 's-product-05',
    round: 4,
    topic: 'live-build',
    style: 'product',
    question: `The interviewer asks you to build a small to-do app live, in 45 minutes. At minute 25, with tasks and a delete button working, they say, "Now add due dates and sort by them." Your structure isn't ready for it.`,
    options: [
      {
        text: `Say, "Okay, I'll add a date field and sort on it." Make the smallest change that works first, mention one thing I'd refactor if this were real, and carry on.`,
        score: 9,
        why: `You absorb the change calmly, deliver a working version and show that you see the design debt. That's how real product work feels.`,
      },
      {
        text: `Add the due date feature by copying the delete-button code and changing it, since there's no time to think about structure. I'll clean up later if time remains.`,
        score: 6,
        why: `Speed is right, but copy-paste without saying so leaves a mess you can't explain. One sentence about the trade-off would have turned it into a decision.`,
      },
      {
        text: `Spend the next ten minutes planning how to restructure the whole app properly with classes and a separate data layer, then make the due-date change on top of that, so the design stays clean for future changes.`,
        score: 1,
        why: `Over-engineering under a deadline risks leaving nothing working. The interviewer watches what you ship, not what you could have built.`,
      },
      {
        text: `Say I'd need more time to redesign for this since it wasn't in the original spec, and ask whether I can restart with a better structure.`,
        score: 3,
        why: `Requirements change mid-way in real work. Asking to restart treats a normal event as a failure and burns the minutes you have left.`,
      },
    ],
    lesson: `When requirements change mid-build, make the smallest working change first and say what you'd clean up later.`,
  },
  {
    id: 's-product-06',
    round: 5,
    topic: 'product-sense',
    style: 'product',
    question: `The final interviewer shares their screen with the company's own app. "Use it for two minutes," they say. "Then tell me one thing you'd change, and why." You spot several problems quickly.`,
    options: [
      {
        text: `There are many issues: the colours are inconsistent, some buttons are misaligned, the text is small and navigation is confusing. I'd redesign the whole thing with a cleaner layout and a proper design system.`,
        score: 3,
        why: `A pile of complaints with no priority. The interviewer asked for one change, and picking none shows you can't decide what matters most.`,
      },
      {
        text: `The app is great overall. I'd improve the loading speed, because it took four seconds to open the dashboard. I'd cache the data to make it faster.`,
        score: 6,
        why: `A real observation and a reasonable fix, but you jumped to a solution without saying who it affects or how you'd know it worked.`,
      },
      {
        text: `New users land on a dashboard with ten widgets and no hint where to start. I'd show one guided first task and hide the rest, then measure whether more people finish it.`,
        score: 9,
        why: `You give an observation, the person affected, a specific change and a way to tell whether it worked. That is product thinking.`,
      },
      {
        text: `I wouldn't change anything. The product is already successful, and I don't have enough experience to criticise it. I'd first want to work here and learn.`,
        score: 1,
        why: `Declining to give an opinion is caution, but the interviewer wanted to see how you think about users, and you've shown them nothing.`,
      },
    ],
    lesson: `Pick one problem, say who it hurts, propose a specific fix and say how you'd know it worked.`,
  },

  /* ------------------------------------------------------ Style: startup --- */
  {
    id: 's-startup-01',
    round: 1,
    topic: 'why-startup',
    style: 'startup',
    question: `A founder at a 30-person startup asks, "You could join a big company at a safe 7 LPA. Why would you pick us?" You applied partly because campus offers are scarce, but you do like building things.`,
    options: [
      {
        text: `I'm passionate about startups and I want to learn fast. Big companies give narrow work, but here I could do many things and grow quickly. I'm ready to work hard.`,
        score: 6,
        why: `The reasons are right but generic. Every candidate says "learn fast" at a startup, and nothing here shows you've looked at this company.`,
      },
      {
        text: `I want to see a whole product get built, and here a first-year engineer ships real features. I've read your changelog and I'd like to work on onboarding. I understand the risks.`,
        score: 9,
        why: `You show research and name a piece of work you'd want. You also acknowledge the risk, which tells the founder you've thought about it.`,
      },
      {
        text: `Honestly, I didn't get many campus offers, and I thought a startup would give me a chance. I'm a quick learner and I'm sure I'll contribute well.`,
        score: 3,
        why: `The honesty is brave, but leading with "I had no other offers" makes you sound like a fallback. Founders want people who choose them.`,
      },
      {
        text: `I'm very interested in the equity and the chance that the startup becomes big. If it does, I'd earn much more than at a big company, so the risk is worth it for me, even if the salary is lower.`,
        score: 1,
        why: `Leading with money from a possible success sounds like a gamble. Founders want people who'll stay through hard months before any payout arrives.`,
      },
    ],
    lesson: `Show you've looked at their product, name one thing you'd want to build and acknowledge the risk plainly.`,
  },
  {
    id: 's-startup-02',
    round: 2,
    topic: 'ambiguity-story',
    style: 'startup',
    question: `"Tell me about a time you had to figure something out with no instructions and nobody to ask," says the startup's CTO. You once had to deploy your hackathon team's app with only half-finished docs.`,
    options: [
      {
        text: `Our hackathon app needed deploying, and nobody on the team had done it. I read the docs, broke the job into steps and had a first version live in four hours. I left a one-page note for the next person.`,
        score: 9,
        why: `A clear task, how you broke it down and a result with a time on it. The handover note shows you think about whoever comes next.`,
      },
      {
        text: `In our hackathon the deployment was a problem, so I told the organisers the documentation was incomplete. They fixed it later, and then we could continue.`,
        score: 1,
        why: `Waiting for someone else to fix the docs is the opposite of working it out yourself. The story shows a dependency, not a decision.`,
      },
      {
        text: `I asked my seniors and watched a few videos, and we managed to deploy it. It took a long time, but I learnt a lot from the process and enjoyed it, and the final app worked fine on demo day.`,
        score: 6,
        why: `The question said nobody to ask, and your story leans on seniors. The CTO wants to hear what you decided yourself.`,
      },
      {
        text: `I don't usually like working without instructions, but when needed I did it. I'd prefer a clear task with a plan, since that reduces mistakes and saves time.`,
        score: 3,
        why: `Preferring structure is human, but a 30-person startup will give you very little of it. This answer tells the CTO you'd struggle there.`,
      },
    ],
    lesson: `Pick a story where you broke an unclear task into steps yourself, finished it and left something behind for others.`,
  },
  {
    id: 's-startup-03',
    round: 3,
    topic: 'breadth',
    style: 'startup',
    question: `"We need one person for backend, a bit of frontend and deployment," says the founder. "I see only Node.js and MongoDB on your resume. Is that a problem?" You've used React for one weekend tutorial.`,
    options: [
      {
        text: `I know React also, and I've worked with deployment through a free hosting service. I'm a full-stack developer, so it's not a problem for me at all.`,
        score: 3,
        why: `Inflating your skills in front of the person you'd work with invites a test on day one. The gap would show up within a week.`,
      },
      {
        text: `That's a lot for one person. Usually these are separate roles, so maybe I could focus on backend only and others can handle the rest?`,
        score: 1,
        why: `A reasonable thing to say at a big company, but at 30 people the founder is asking whether you'll stretch. This answer says no.`,
      },
      {
        text: `Backend is my strength, but I can learn React and deployment quickly. I picked up Node in a month. Please give me some time and I'll cover the rest.`,
        score: 6,
        why: `A fair claim, but "give me some time" is a request, not a plan. The founder can't judge how quickly you'd actually learn.`,
      },
      {
        text: `Backend is where I'm strongest. I've done one weekend of React, enough for a simple form, and I haven't deployed anything. I'd start this week by putting my project and a small React page on a cheap server.`,
        score: 9,
        why: `You say what's true, where the gaps are and exactly how you'd close them. A founder hiring for breadth wants honesty and learning speed.`,
      },
    ],
    lesson: `At a startup, say plainly what you can't do yet and show exactly how you'd close the gap.`,
  },
  {
    id: 's-startup-04',
    round: 4,
    topic: 'speed-vs-quality',
    style: 'startup',
    question: `It's your trial week at a startup. The founder says, "A big customer demo is tomorrow. Ship the new billing screen tonight, skip the tests, we'll fix it later." You know billing bugs can mean wrong charges.`,
    options: [
      {
        text: `Say I can't ship untested billing code and ask to postpone the demo. Quality is my responsibility, and a wrong charge could hurt the company's reputation.`,
        score: 3,
        why: `The concern is valid, but a flat refusal in your first week ignores what the demo is worth. The founder hears someone who won't help in a crunch.`,
      },
      {
        text: `Ship it tonight as asked. The founder knows the business better, and I'll write the tests next week once the demo is done and things are calmer.`,
        score: 6,
        why: `Trusting the founder is reasonable, but "next week" rarely arrives at a startup, and nobody has named the risk of unguarded billing code reaching real users.`,
      },
      {
        text: `Say, "I can ship tonight. Billing is risky, so I'll put it behind a flag for the demo account only and test the calculation by hand. Real customers get it after proper tests." Then do exactly that.`,
        score: 9,
        why: `You deliver what the demo needs and contain the risk where it matters. Speed and quality become a decision with a boundary.`,
      },
      {
        text: `Do what's asked, quietly. If something breaks, it was the founder's decision and I followed instructions, so I won't be responsible for the outcome.`,
        score: 1,
        why: `Protecting yourself instead of the product is the opposite of ownership, and a small team can't afford that attitude.`,
      },
    ],
    lesson: `Meet the deadline, then contain the risk: ship behind a flag, test the dangerous part by hand and say what is untested.`,
  },
  {
    id: 's-startup-05',
    round: 5,
    topic: 'equity-vs-salary',
    style: 'startup',
    question: `The founder offers two options: 6 LPA with 0.2 percent equity, or 8 LPA with no equity. The company has about eight months of cash left, and your father retires next year. "Which would you pick?"`,
    options: [
      {
        text: `I'd take the 8 LPA. My family relies on steady income right now, and early equity at this size is unlikely to pay out soon. Could you tell me how the equity vests and what it might be worth after a raise?`,
        score: 9,
        why: `You decide from your actual situation and ask the questions that matter: vesting and valuation. Founders respect a reasoned no to equity more than a reflex yes.`,
      },
      {
        text: `Whichever you think is best for the company. I'm flexible, and I'll be happy with either, since I'm more interested in the work than the compensation.`,
        score: 3,
        why: `Handing the decision back avoids it, and "I don't care about compensation" isn't believable. The founder wanted to see how you weigh risk.`,
      },
      {
        text: `I'd take the 6 LPA with equity. I believe in the company, and if it succeeds, the equity will be worth far more than the 2 LPA difference.`,
        score: 6,
        why: `The belief is nice, but you haven't asked what 0.2 percent is worth, how it vests or what eight months of cash means. That's optimism, not analysis.`,
      },
      {
        text: `Both are too low for my skills. I'd want 10 LPA with equity, because startups should reward people who take the risk of joining them.`,
        score: 1,
        why: `Rejecting both with no other offer, and with the company's thin cash in view, sounds out of touch.`,
      },
    ],
    lesson: `Choose from your real situation, and ask how equity vests and what it could realistically be worth before deciding.`,
  },
  {
    id: 's-startup-06',
    round: 5,
    topic: 'role-scope',
    style: 'startup',
    question: `A founder explains the role: "You'd write code, but two days a week you'll answer customer emails and sometimes help pack demo kits. There's no fixed job description. Are you okay with that?"`,
    options: [
      {
        text: `I applied for a developer role, so I'd prefer to spend most of my time coding. Support and packing can be handled by someone else, since it's not engineering work and I'd be more useful writing code.`,
        score: 3,
        why: `Treating customer work as beneath you tells a 30-person team you won't pitch in, and those tasks are how engineers there learn what users need.`,
      },
      {
        text: `That sounds like a lot of non-technical work. Can I get a job description in writing first, with a clear list of what's expected, before I decide whether to join?`,
        score: 1,
        why: `Asking for clarity is reasonable, but demanding a written list from a founder who just said none exists signals you'd expect structure they can't give.`,
      },
      {
        text: `Yes. Customer emails will teach me what users struggle with, which should make my code better. How is the time roughly split, and how would we review my progress after three months?`,
        score: 9,
        why: `You see the value in the unglamorous work and still ask how the role is shaped. That reads as someone who'll do the work and also grow.`,
      },
      {
        text: `I'm fine with anything the company needs, because I'm here to learn and no job is too small for me. I'll do whatever is asked and adapt.`,
        score: 6,
        why: `The attitude is welcome, but a bare "anything" leaves unclear how much of your time goes to coding, which is the career you came for.`,
      },
    ],
    lesson: `At a small startup, show you'll do the unglamorous work, and ask how your time and progress will be reviewed.`,
  },
]
