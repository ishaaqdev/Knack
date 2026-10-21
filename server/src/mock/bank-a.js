export const BANK_A = [
  // ---------------------------------------------------------------- Round 1: Introduction
  {
    id: 'r1-intro-01',
    round: 1,
    topic: 'self-introduction',
    style: 'any',
    question: 'The interviewer says "Tell me about yourself." You have about a minute. Which opening works best?',
    options: [
      {
        text: `I'm Rahul Menon, final year ECE at NIT Calicut. This past year I've moved towards backend work, mainly through an inventory API I built for our college store. That's what caught my eye about this role.`,
        score: 9,
        why: 'Name, college, a direction and one real example, all in about fifteen seconds. The interviewer now has a concrete thing to ask about, so the conversation goes where you steered it.'
      },
      {
        text: `I was born in Pune and studied there till 12th, then got into engineering through the state CET. First year we had C and physics, second year data structures, third year DBMS and networks, and now I'm in final year.`,
        score: 3,
        why: `This is the syllabus read out in order, and it can run until the interviewer cuts in. Nothing in it says what you're good at or what you want.`
      },
      {
        text: `I'm Rahul, a final year CSE student at NIT Calicut with an 8.2 CGPA. I know Java, Python and SQL, I've done two projects and one internship, and I'm looking to start my career with a good company.`,
        score: 6,
        why: `Everything in it is true and clear, but it's the CV read aloud. The interviewer already has that page in front of them, so you've told them nothing new.`
      },
      {
        text: 'Good morning sir. I am a hardworking and passionate person with good communication skills. I am a quick learner and a team player, and I always give my hundred percent to whatever work is given to me.',
        score: 1,
        why: 'Every fresher uses these words, so it sounds memorised. With no evidence behind any claim, the interviewer has nothing to believe.'
      }
    ],
    lesson: `Open with who you are, one direction you're heading and one real example, so the interviewer has something specific to ask about.`
  },
  {
    id: 'r1-intro-02',
    round: 1,
    topic: 'self-introduction',
    style: 'any',
    question: `The interviewer says "Walk me through your resume." Your page has six sections. What's the best way to handle it?`,
    options: [
      {
        text: `Go section by section in the printed order: education, skills, projects, internship, certifications, then achievements. Keep each one short and don't skip anything.`,
        score: 6,
        why: `It's complete and orderly, but a certificate gets the same time as your best project. The interviewer can't tell which parts you're proud of.`
      },
      {
        text: `Say the resume is self-explanatory and ask which section they'd like to hear about, so you answer exactly what they need.`,
        score: 1,
        why: `It sounds efficient, but it hands over the opening entirely. The interviewer may read it as someone who hasn't thought about their own story.`
      },
      {
        text: `Pick the two items you'd most like to discuss, say in a line what you did in each, and link them. Then say you're happy to go deeper into anything else they like.`,
        score: 9,
        why: `You're choosing what to show, which is itself a sign of judgement. It also moves the interview onto your strongest ground instead of letting it drift to the weakest.`
      },
      {
        text: 'Start from your Class 10 percentage and go forward year by year, because the resume is chronological and the interviewer should see the whole journey.',
        score: 3,
        why: 'The oldest and least relevant details use up your time first. In a twenty-minute interview you might not reach your projects at all.'
      }
    ],
    lesson: `Treat the resume as a menu: lead with the two items you're proudest of and let the interviewer choose what else to explore.`
  },
  {
    id: 'r1-intro-03',
    round: 1,
    topic: 'self-introduction',
    style: 'any',
    question: `The interviewer says "Introduce yourself, but please don't repeat what's on your resume." What do you do?`,
    options: [
      {
        text: `Say politely that you'll give a different version of the same details, then summarise your education and skills in new words so it doesn't sound repeated.`,
        score: 3,
        why: `Rewording the CV is still the CV. The interviewer asked for something different and will notice that the content hasn't changed.`
      },
      {
        text: `Share something the page can't show, like how our hostel's broken Wi-Fi login page pushed me into web development, and what I enjoy building now. Keep it short.`,
        score: 9,
        why: `They've asked for the person behind the page. A small true story shows how you think, and it gives them something to remember you by.`
      },
      {
        text: `Say there's nothing much to add beyond the resume, since all the important things are already on it.`,
        score: 1,
        why: `It shuts down a question the interviewer chose to open. It can sound like low effort, or like there's nothing about you outside the syllabus.`
      },
      {
        text: `Briefly mention hobbies like cricket and music, and say you're a family-oriented person from Nagpur, so the interviewer gets to know you personally.`,
        score: 6,
        why: `You've followed the instruction, but hobbies with no story behind them say little about how you work. It's safe and easily forgotten.`
      }
    ],
    lesson: 'When asked for something beyond the resume, give one small true story that shows how you think.'
  },
  {
    id: 'r1-motive-01',
    round: 1,
    topic: 'motivation',
    style: 'any',
    question: `You're applying for a QA engineer role. The interviewer says "Most students from your branch want development roles. Why QA?" Which answer works best?`,
    options: [
      {
        text: `In our final year project I spent more time trying to break my teammates' modules than writing my own, and I enjoyed it. I like finding the case nobody thought of, and I'd like to build that skill properly.`,
        score: 9,
        why: 'You give a real reason from your own experience. It shows you chose this role instead of ending up in it.'
      },
      {
        text: 'QA is important because bad software costs companies a lot of money. I also see it as a good way to understand a product end to end, which will help me later.',
        score: 6,
        why: `The reasoning is sensible, but it's about QA in general. The interviewer still can't tell whether you'd enjoy the daily work.`
      },
      {
        text: 'Honestly, development openings were limited this year, and I thought QA is a good way to enter the company and shift to development later.',
        score: 1,
        why: `It's honest, but it tells the interviewer you see the role as a waiting room. They'll doubt you'd give it full effort or stay long.`
      },
      {
        text: `I'm open to any role the company thinks is right for me. I'm confident I can do development or QA, and I'll go wherever the team needs me.`,
        score: 3,
        why: 'Flexibility is fine, but this answer says you have no preference. The interviewer asked why this role and gets no reason at all.'
      }
    ],
    lesson: `Tie your reason for the role to something you've actually done, so it sounds like a choice and not a fallback.`
  },
  {
    id: 'r1-motive-02',
    round: 1,
    topic: 'motivation',
    style: 'any',
    question: 'For a software engineer opening, the interviewer asks "Where do you see yourself in five years?" Which answer lands best?',
    options: [
      {
        text: `I see myself in a senior technical role, having learned the company's stack deeply. I'd like to grow with the organisation and contribute to its success in the long term.`,
        score: 6,
        why: 'Safe and reasonable, but it reads like a template. "Grow with the organisation" could be said to any employer.'
      },
      {
        text: `I'd like to be someone the team trusts with a whole module end to end. In five years I hope to have worked on a few real systems and to be helping newer joiners, whether on a lead or a specialist path.`,
        score: 9,
        why: `It's about growing skill and responsibility, which is what an employer pays for. It's specific enough to sound honest without promising a title.`
      },
      {
        text: `I want to be a manager in five years, leading a team and handling clients. I'm ambitious and I don't want to remain a coder for long.`,
        score: 3,
        why: `Ambition is fine, but "don't want to remain a coder" tells a hiring manager you'd rather leave the work they're hiring you for.`
      },
      {
        text: `Honestly, I haven't thought that far. I'm focused on getting a job right now, and I'll see what happens after that.`,
        score: 1,
        why: `It's truthful, but it signals no direction at all. A sentence of forward thinking would have cost you nothing, and this reads as indifference.`
      }
    ],
    lesson: `Describe the skills and trust you want to have built by then, tied to the work you'd be doing.`
  },
  {
    id: 'r1-motive-03',
    round: 1,
    topic: 'motivation',
    style: 'any',
    question: `You're a Mechanical student applying for a software role. The interviewer says "Why are you leaving your own branch?" Which reply is strongest?`,
    options: [
      {
        text: `Mechanical was never my real interest. I joined it because my rank was low. I've always liked computers, so I'm applying here.`,
        score: 1,
        why: `It's honest, but "never my interest" and "my rank was low" sound like complaints, and they make your four years look wasted.`
      },
      {
        text: `Core companies aren't hiring much, and my parents also suggested IT. I'm hardworking and I'll learn whatever the company teaches me.`,
        score: 3,
        why: `Mentioning the job market and your parents makes the choice sound like it wasn't yours. The interviewer wants to hear that you picked this.`
      },
      {
        text: `Software has more openings and better growth than core mechanical. I've learned programming on my own through YouTube, and I'm confident I can adapt fast.`,
        score: 6,
        why: `The market logic is true and self-study is a plus, but there's no proof of either. It sounds like a reaction to the job market more than interest in the work.`
      },
      {
        text: `In my machine design project I wrote a Python script to automate our stress calculations and enjoyed that more than the drawing. Since then I've finished a Java course and built two small apps.`,
        score: 9,
        why: 'The switch has a visible starting point and a record after it. That turns "why leave" into a story the interviewer can believe.'
      }
    ],
    lesson: `If you're changing direction, point to the moment it started and what you've done since, so the switch has evidence behind it.`
  },
  {
    id: 'r1-company-01',
    round: 1,
    topic: 'company-knowledge',
    style: 'any',
    question: 'The interviewer asks "What do you know about our company?" You spent about ten minutes on its website last night. Which answer is best?',
    options: [
      {
        text: `I read that you build fleet-tracking software for transport companies, and that you launched a route-planning feature this year. I'm curious whether that team works with the same live tracking data.`,
        score: 9,
        why: 'Two specific facts and a real question show you looked past the home page. The question at the end turns your answer into a conversation.'
      },
      {
        text: `Everyone knows your company is very big and famous, and my seniors who work here say it's a great place to start a career.`,
        score: 3,
        why: `You're relying on reputation and hearsay. The interviewer learns you like the name, but not that you know what they actually do.`
      },
      {
        text: `I didn't get much time to research since the interview was announced late. But I know it's a good company. Can you tell me a little about it?`,
        score: 1,
        why: `Asking them to explain their own company shows you didn't try. Even a short, partial answer would have been better than none.`
      },
      {
        text: `You're one of the leading IT companies with offices in many countries, working with clients in banking and retail. You have over fifty thousand employees and a good work culture.`,
        score: 6,
        why: `These facts fit many big firms, so the interviewer can't tell whether you did any research. It sounds like the first line of a Wikipedia page.`
      }
    ],
    lesson: 'Learn two specific things about the company, such as a product or a recent launch, and end your answer with a question.'
  },
  {
    id: 'r1-company-02',
    round: 1,
    topic: 'company-knowledge',
    style: 'any',
    question: 'At the end of the round, the interviewer asks "Do you have any questions for us?" What do you ask?',
    options: [
      {
        text: 'What is the salary for this role, and how many days of work from home do we get?',
        score: 3,
        why: 'These are fair questions, but asking them first makes the package look like your main interest. They belong with HR, later.'
      },
      {
        text: 'Which technologies does the team use day to day, and is there any training for freshers before they start on projects?',
        score: 6,
        why: `Sensible and relevant, but the job description or offer letter would answer it. It doesn't show anything about you.`
      },
      {
        text: `No sir, you've explained everything very well and I have no doubts. Thank you for this opportunity.`,
        score: 1,
        why: 'No question at all reads as low curiosity. A polite thank-you is fine, but it ends the interview with nothing for them to remember.'
      },
      {
        text: `What does a new joiner's first three months look like in this team, and what would make someone do really well here? I'm trying to understand what to prepare for.`,
        score: 9,
        why: `It shows you're already thinking about doing the job well, and the answer tells you something real about the team.`
      }
    ],
    lesson: `Ask one question about what success looks like in the first months. It shows you're thinking about the work and not the perks.`
  },
  {
    id: 'r1-strength-01',
    round: 1,
    topic: 'strengths-weakness',
    style: 'any',
    question: 'The interviewer asks "What is your biggest weakness?" Which answer shows the most self-awareness?',
    options: [
      {
        text: `I sometimes spend too long on small details in my code, like naming and formatting. I'm trying to balance that with deadlines, though it still takes me longer.`,
        score: 6,
        why: `A mild, believable weakness with a hint of improvement. But it's close to "I work too hard", which interviewers hear often.`
      },
      {
        text: `I used to avoid speaking up in group discussions and meetings. I started presenting my lab results to the class, and now I volunteer first. I'm still not fully comfortable, but it's better.`,
        score: 9,
        why: 'A real weakness, a concrete step you took and an honest "still working on it". The interviewer sees someone who notices a gap and acts.'
      },
      {
        text: `I don't think I have any major weakness. I adapt to most situations, and whatever problems come, I handle them.`,
        score: 1,
        why: 'Everyone has one, so this sounds either unaware or guarded. It also gives the interviewer nothing to go on.'
      },
      {
        text: `My biggest weakness is that I'm a perfectionist and a workaholic. I can't leave work until it's perfect, and sometimes I forget to rest.`,
        score: 3,
        why: 'This is a strength in disguise, and interviewers spot the trick quickly. It reads as dodging the question.'
      }
    ],
    lesson: `Pick a real weakness that isn't central to the job, say what you've done about it, and be honest that it's still in progress.`
  },
  {
    id: 'r1-strength-02',
    round: 1,
    topic: 'strengths-weakness',
    style: 'any',
    question: 'The interviewer asks "What is your biggest strength?" Which answer is hardest to doubt?',
    options: [
      {
        text: 'I finish what I start. Our college robotics club had a half-built line-follower that two batches had left behind, and I took it over and got it running for the inter-college event.',
        score: 9,
        why: 'The claim is one short phrase and the proof is a concrete story. The interviewer can test it with follow-up questions, which makes it far more believable.'
      },
      {
        text: `I have many strengths: communication, leadership, teamwork, quick learning and punctuality. I'm good at everything I've tried.`,
        score: 1,
        why: `A long list with no examples sounds rehearsed, and "everything" is an over-claim. The interviewer can't pick one thing to explore, so they trust none of it.`
      },
      {
        text: `Problem solving. I enjoy solving DSA problems and have done over 400 on LeetCode and CodeChef, so I'm comfortable with logic and debugging.`,
        score: 6,
        why: `The number gives it some weight, but a count of problems doesn't show how you think. They'd still want an example from outside a practice site.`
      },
      {
        text: `My biggest strength is my positive attitude. I stay calm in every situation, and my friends say I'm very supportive and easy to work with.`,
        score: 3,
        why: 'The only evidence is what friends say. Attitude claims with no moment attached are easy to make and hard to believe.'
      }
    ],
    lesson: 'Name one strength in a short phrase, then back it with one specific thing you did.'
  },
  {
    id: 'r1-resume-01',
    round: 1,
    topic: 'resume-claims',
    style: 'any',
    question: 'Your resume says "Proficient in Java, Python, C++". The interviewer says "Rate yourself out of ten in Java." Which answer is best?',
    options: [
      {
        text: `It depends on what you ask. Java is a huge language and nobody knows all of it, so I can't really give one number.`,
        score: 3,
        why: `The point is true, but it dodges a simple question. The interviewer asked for a number to start a conversation, and you've closed it.`
      },
      {
        text: `I'd say seven. I've used Java for three years in college and in two projects, and I'm still learning new things every week.`,
        score: 6,
        why: 'Seven is reasonable, but the reasons are years and project counts, not what you can do. Expect them to test it straight away.'
      },
      {
        text: `About a six. I'm solid on OOP, collections and exceptions because I used them in my final year project, but I haven't worked with multithreading or Spring yet.`,
        score: 9,
        why: `A moderate number with specifics on both sides is believable. You've also shown you know where your edges are, and told them where to probe.`
      },
      {
        text: `Nine. I know it very well, I've practised a lot, and I'm confident, so please ask me anything in Java.`,
        score: 1,
        why: 'A nine invites the hardest questions. At the first gap, the interviewer will start doubting everything else on the resume too.'
      }
    ],
    lesson: `Rate yourself honestly and give a reason: say what you're solid on and what you haven't touched yet.`
  },
  {
    id: 'r1-resume-02',
    round: 1,
    topic: 'resume-claims',
    style: 'any',
    question: 'Your resume lists "Smart Attendance System using face recognition." The interviewer says "Give me this project in two lines." Which answer works best?',
    options: [
      {
        text: `It's a big project with many modules, so it's hard to explain in two lines. If you give me a few minutes, I can explain it properly.`,
        score: 1,
        why: `You've turned down a small, clear request and asked for time the interviewer may not have. It sounds like you can't summarise your own work.`
      },
      {
        text: `It's a face recognition attendance system made in Python using OpenCV and a Haar cascade classifier, with a MySQL database for records and a simple Tkinter interface.`,
        score: 6,
        why: 'All tools and no purpose or result. The interviewer knows what you used but not what it does for anyone, or what you did in it.'
      },
      {
        text: 'So this was my third year mini project. First our guide told us to select a topic, and we discussed with friends, and then we found that attendance takes class time, so we decided to...',
        score: 3,
        why: `You've started from the day of topic selection, so two lines became two minutes. The interviewer wants the result first, and the history can follow if they ask.`
      },
      {
        text: 'It marks class attendance from a photo of the room. A Python and OpenCV pipeline matches faces to enrolled students, and we tested it on one section of 60. I built the matching and database, my teammate built the app.',
        score: 9,
        why: 'It covers what it does, how, at what scale and your own part, in two sentences. The interviewer can now choose which part to dig into.'
      }
    ],
    lesson: 'When asked for a short version, say what the project does, how, and which part you built, and keep the backstory for later.'
  },

  // ---------------------------------------------------------------- Round 2: Behavioural
  {
    id: 'r2-conflict-01',
    round: 2,
    topic: 'conflict',
    style: 'any',
    question: `The interviewer says "Tell me about a conflict with a teammate." You choose a story where a teammate hadn't started their module days before the review. How do you tell it?`,
    options: [
      {
        text: `One teammate wasn't doing their part, so I raised it in our WhatsApp group and we redistributed the work. It created some tension, but the project got submitted.`,
        score: 6,
        why: 'You acted, which is good, but raising it in front of everyone before asking the person puts them on the defensive. The interviewer sees the outcome and a rough method.'
      },
      {
        text: `Our review was in four days and Meera hadn't started the login module. I asked her privately what was blocking her, found she was stuck on OAuth, and we paired for two evenings. It was ready on time, and I now check in earlier.`,
        score: 9,
        why: 'You went to the person first, found the cause and shared the work. The last line shows what you changed afterwards, which is what they were really asking about.'
      },
      {
        text: `I had a problem with Rohit, who never did the work and kept giving excuses. I told our guide I couldn't work with Rohit and moved to another group.`,
        score: 1,
        why: `The story is about Rohit's faults, and your solution was to leave. The interviewer hears blame and an exit, not a resolution.`
      },
      {
        text: `Honestly, I ended up doing most of the project myself because the teammate was irresponsible. I didn't want to fight, so I finished it and we got good marks anyway.`,
        score: 3,
        why: `You avoided the conflict, so there's no conflict handling to hear. They also hear that you'd absorb a problem silently and resent it.`
      }
    ],
    lesson: 'In a conflict story, show that you spoke to the person first, found the real cause and fixed it together.'
  },
  {
    id: 'r2-conflict-02',
    round: 2,
    topic: 'conflict',
    style: 'any',
    question: `At your internship, you think your mentor's database design will slow the app down. The interviewer asks "How do you handle disagreeing with a senior?" Which story is best?`,
    options: [
      {
        text: 'I tested both designs on a copy of the data and showed my mentor the timings. I said I might be missing something and asked what they thought. They kept their design for one table and took mine for another.',
        score: 9,
        why: 'You brought evidence, stayed open to being wrong and let the senior decide. The interviewer sees someone who can disagree without turning it into a contest.'
      },
      {
        text: `I didn't say anything because I was only an intern. Later the app did get slow, and I felt I should have spoken, but it wasn't my place then.`,
        score: 3,
        why: `Staying quiet cost the team something you saw coming. The interviewer hears that you'd hold back useful warnings.`
      },
      {
        text: 'I raised my concern politely in the team meeting and explained my reasoning, but my mentor had more experience, so we went with their design. I learned that seniors know best.',
        score: 6,
        why: 'You spoke up, which counts. But you gave way on seniority, not on facts, and "seniors know best" is a shrug and not a lesson.'
      },
      {
        text: 'I felt my idea was clearly better, so I quietly built my version on a separate branch over the weekend and showed it to the manager to prove my mentor wrong.',
        score: 1,
        why: 'Going around your mentor to the manager damages trust, whatever the result. The interviewer hears someone who wins arguments by embarrassing people.'
      }
    ],
    lesson: 'When you disagree with a senior, bring evidence, say you may be missing something and let them make the call.'
  },
  {
    id: 'r2-conflict-03',
    round: 2,
    topic: 'conflict',
    style: 'any',
    question: 'You were coordinating your college tech fest. Two volunteer leads kept arguing over the registration desk plan. The interviewer asks what you did. Which answer is strongest?',
    options: [
      {
        text: 'I let them argue it out themselves, as they were senior to me and should sort it out. In the end the faculty coordinator stepped in and decided.',
        score: 3,
        why: 'Stepping back left the problem for someone else. You were the coordinator, so the interviewer expected you to hold the conflict, not pass it up.'
      },
      {
        text: 'I picked the plan that seemed more practical and told both to follow it, because the fest was three days away. One of them was upset, but it worked.',
        score: 6,
        why: `Deciding quickly can be right for a coordinator, and it got the job done. But you skipped the listening, and the upset lead is a cost you didn't address.`
      },
      {
        text: `I met each of them separately to understand what they needed, then sat them together with last year's footfall numbers. We merged the two plans, and the desk ran without a queue.`,
        score: 9,
        why: 'You listened to both before deciding, then moved the argument from opinions to numbers. It shows you can settle things without just picking a side.'
      },
      {
        text: `I told them the arguing was unprofessional and would hurt the fest's reputation, and asked them to apologise and shake hands in front of the team.`,
        score: 1,
        why: `A public telling-off hardens positions. Nobody's actual concern got heard, so the argument is likely to return in another form.`
      }
    ],
    lesson: 'As the person in the middle, listen to each side separately, then move the discussion from opinions to facts.'
  },
  {
    id: 'r2-failure-01',
    round: 2,
    topic: 'failure',
    style: 'any',
    question: 'The interviewer says "Tell me about a time you failed." Which story is the best choice?',
    options: [
      {
        text: `I can't think of a big failure. I always prepare well and avoid mistakes, so mostly things have gone well for me.`,
        score: 1,
        why: `Everyone has failed at something. Saying you haven't sounds like either low reflection or unwillingness to be open.`
      },
      {
        text: 'My biggest failure was not getting shortlisted in my first two company drives. But the tests were very hard and the cutoff was unfair, so I just kept trying.',
        score: 3,
        why: 'You describe the failure as something done to you. The interviewer wants to know what you did wrong and what you learned, and hears neither.'
      },
      {
        text: 'I failed Operating Systems in fourth semester. I felt bad, but I studied harder and cleared it in the next attempt with a good score.',
        score: 6,
        why: `It's honest, and recovering counts. But "studied harder" isn't a change anyone can see, and a failed exam is a fairly passive kind of failure.`
      },
      {
        text: 'In second year I skipped writing input checks in our mini project, and the demo to our guide crashed on a blank form. We lost marks. Since then I write the basic checks first, and I did in my last two projects.',
        score: 9,
        why: 'A real failure that was yours, with its cost and a habit you changed. The interviewer takes it as proof you learn without getting defensive.'
      }
    ],
    lesson: 'Choose a failure that was your own doing, say what it cost, and name one habit you changed because of it.'
  },
  {
    id: 'r2-failure-02',
    round: 2,
    topic: 'failure',
    style: 'any',
    question: 'During your internship you pushed a change that broke the shared staging server for the whole team. The interviewer asks how you handled it. Which answer is best?',
    options: [
      {
        text: 'Since several people were pushing code that day, I first checked whether it was really my commit. Once I was sure, I told my mentor and fixed it.',
        score: 3,
        why: `Verifying is sensible, but opening with "was it really me" delays the team's recovery and sounds like hedging.`
      },
      {
        text: `I noticed the errors within minutes, told my mentor on chat right away that it was my commit, and reverted it. Afterwards I wrote down what happened and added a check so it couldn't happen again.`,
        score: 9,
        why: 'You were fast, said it was yours, fixed it and prevented a repeat. Interviewers trust people who raise their hand early more than people who claim they never slip.'
      },
      {
        text: `I quickly reverted my change and the server was back in about ten minutes. I didn't make a big issue of it and I was more careful afterwards.`,
        score: 6,
        why: 'Fixing it fast was right. But nobody was told, so teammates lost time wondering what broke, and "more careful" is not a change anyone can see.'
      },
      {
        text: `The staging server was unstable anyway, so a few errors are normal. I waited to see if somebody else would notice before raising it, since I didn't want to alarm anyone.`,
        score: 1,
        why: 'Hoping nobody notices is the worst response in an incident. The interviewer hears that you might hide a problem you caused, and that is hard to forgive near production.'
      }
    ],
    lesson: `When you break something, say it was you straight away, fix it, and add a guard so it can't happen again.`
  },
  {
    id: 'r2-deadline-01',
    round: 2,
    topic: 'deadline',
    style: 'any',
    question: 'The interviewer says "Tell me about a time you missed a deadline." Your story is about a mini project report that was two days late. Which telling is best?',
    options: [
      {
        text: `I'd planned three days for the report and it took six, since our survey data kept changing. I only told our guide on day five. We were two days late, and now I flag a slip the moment I see it.`,
        score: 9,
        why: 'You own the estimate and the late warning, and you say what you do now. The interviewer hears accountability and a habit they can picture.'
      },
      {
        text: 'Honestly the deadline was unrealistic. Our guide gave us two weeks for work that needs a month, so missing it was guaranteed and I said so at the time.',
        score: 1,
        why: `Maybe the deadline was tight, but the story becomes about the guide's planning. The interviewer wants to hear what you did about it, and you only complained.`
      },
      {
        text: `We were two days late because I underestimated the work. I stayed up and finished it, and the guide accepted it. I've learned to start earlier.`,
        score: 6,
        why: 'You own the cause, but "start earlier" is a vague promise. The interviewer wants to hear what exactly you changed, such as estimating in smaller pieces.'
      },
      {
        text: `We missed it because the lab equipment wasn't available on time and the guide was travelling. I did everything I could and submitted as soon as I got the readings.`,
        score: 3,
        why: 'The reasons may be true, but the story is about circumstances. An interviewer wants to hear what was in your control.'
      }
    ],
    lesson: 'Own the part of the miss that was yours, and say the specific thing you do differently now.'
  },
  {
    id: 'r2-deadline-02',
    round: 2,
    topic: 'deadline',
    style: 'any',
    question: 'Your end-semester exam, a hackathon you registered for and a project demo all fall in one week. The interviewer asks how you handle competing deadlines. Which answer is best?',
    options: [
      {
        text: 'I make a day-wise timetable with fixed hours for each task and follow it strictly. I wake up early, keep my phone away, and everything gets done on time.',
        score: 6,
        why: `Planning is good, but a timetable assumes everything fits. The interviewer wants to know what you do when it doesn't.`
      },
      {
        text: `I just work harder and sleep less that week. I've done all-nighters before, and I can manage anything if I push myself, so I don't mind the pressure.`,
        score: 3,
        why: 'Effort is one tool, and it fails when tasks collide. It also suggests you might burn out or hand in tired work.'
      },
      {
        text: `I'd list what each one costs if missed and what can be moved. For example, I'd tell the hackathon team I can only join the final day, ask my guide to shift the demo by two days, and keep exam revision fixed.`,
        score: 9,
        why: `You rank by consequence and talk to the affected people before the week begins. The interviewer sees someone who prioritises and communicates, and who doesn't rely on hard work alone.`
      },
      {
        text: `I'd choose exams and quietly leave the other two, since marks matter most. Teammates will understand if I explain after the week is over.`,
        score: 1,
        why: 'Leaving people mid-project and explaining later breaks trust. The priority call may be right, but not warning them is what the interviewer remembers.'
      }
    ],
    lesson: `When deadlines collide, rank them by what's lost if missed and tell the affected people early.`
  },
  {
    id: 'r2-feedback-01',
    round: 2,
    topic: 'feedback',
    style: 'any',
    question: 'The interviewer asks "How do you take criticism?" You describe the time your mentor said your pull request was messy and hard to review. Which telling is best?',
    options: [
      {
        text: `Honestly I don't mind criticism. I explained to my mentor why my code was fine, and pointed out that the other interns' PRs weren't clean either, so it wasn't a big problem.`,
        score: 1,
        why: 'Defending yourself and pointing at others turns feedback into an argument. The interviewer hears someone who deflects and would be hard to coach.'
      },
      {
        text: 'My mentor said my PR mixed three changes and was hard to review. It stung a bit, but I asked for an example of a clean one, split mine into smaller PRs, and the next ones got approved the same day.',
        score: 9,
        why: 'You admit it stung, ask for a model, then show a result. The interviewer sees someone who turns criticism into a visible change.'
      },
      {
        text: 'At first I felt it was unfair because the code worked, but I made the changes my mentor asked for since that was the team rule, and the PR got merged.',
        score: 3,
        why: `You complied without agreeing. The interviewer hears that you'd follow instructions but not learn from them, so the same habit would return.`
      },
      {
        text: 'My mentor said my PR was messy. I accepted it positively and thanked them, and I try to take all feedback as a chance to improve myself.',
        score: 6,
        why: `Gracious, but it's generic. There's no specific change you made, so the interviewer can't tell whether you really listened.`
      }
    ],
    lesson: 'Show what you changed after the criticism. Thanking the person is polite, but the change is what proves you listened.'
  },
  {
    id: 'r2-feedback-02',
    round: 2,
    topic: 'feedback',
    style: 'any',
    question: `As lead of your final year project, you find that a junior teammate's code keeps breaking the build. The interviewer asks how you'd tell them. Which approach is best?`,
    options: [
      {
        text: `I'd fix the code myself quickly, since the build is the priority and explaining takes time. If it happens again, I'd mention it to them later.`,
        score: 3,
        why: `You'd get a working build today and the same break next week. They never learn their code was the cause, so nothing changes.`
      },
      {
        text: `I'd message them privately with the error log and ask them to fix it before the next build. I'd keep it short and polite so they don't feel bad.`,
        score: 6,
        why: 'Private and polite is right, but a log with an order leaves them guessing how to avoid it next time. It fixes the build, not the cause.'
      },
      {
        text: `I'd point out the mistake in the group meeting so everyone is careful, because the whole team suffers when a build breaks.`,
        score: 1,
        why: 'Public correction embarrasses the person and makes everyone more afraid to admit errors. The team learns to hide bugs.'
      },
      {
        text: `I'd sit with them for ten minutes, show the exact build failure and how I'd trace it, and ask what was confusing. Then we'd agree on one habit, like running tests before pushing.`,
        score: 9,
        why: `It's private, specific and about the work. Asking what was confusing finds the real problem, and one small habit is something they can actually do.`
      }
    ],
    lesson: `Give feedback privately and specifically, find out what's confusing, and agree on one small habit to change.`
  },
  {
    id: 'r2-initiative-01',
    round: 2,
    topic: 'initiative',
    style: 'any',
    question: 'The interviewer says "Tell me about a time you took initiative." Which story shows it best?',
    options: [
      {
        text: `Our department's lab manuals were scattered across WhatsApp groups, and seniors kept re-sending old versions. Nobody asked me, but I put the latest ones in one shared drive with a short index. The next batch inherited it.`,
        score: 9,
        why: `Nobody assigned it, the problem was real, and the result lasted beyond you. That's what initiative looks like to an interviewer.`
      },
      {
        text: 'When our club had no one to handle the website, I volunteered since I knew basic HTML. I built it in a week and everyone appreciated it.',
        score: 6,
        why: 'You stepped up, but filling a vacant job is easier than spotting a problem nobody named. The result stops at "appreciated".'
      },
      {
        text: 'I always take initiative. In every group project I end up taking the lead, doing most of the work and making the decisions, so the team can rely on me.',
        score: 1,
        why: `A claim with no event behind it is only a claim. The line about doing most of the work also hints that you don't share tasks.`
      },
      {
        text: 'As the coordinator for our event, I sent reminder messages to all participants. My seniors had asked me to do that, and I did it properly and on time.',
        score: 3,
        why: `If you were asked, it wasn't initiative. The interviewer is looking for something you started yourself, not a task done well.`
      }
    ],
    lesson: 'Initiative means starting something nobody asked for. Pick a story where you spotted the problem yourself and left something that lasted.'
  },
  {
    id: 'r2-initiative-02',
    round: 2,
    topic: 'initiative',
    style: 'any',
    question: 'The interviewer says "Tell me about a time you led a team." Which answer gives the clearest story?',
    options: [
      {
        text: 'I think a good leader is one who listens and never forces anyone. I led by being friendly with everyone, so we had no fights and the project went well.',
        score: 1,
        why: `A view about leadership isn't a story. With no moment or decision in it, the interviewer can't verify anything.`
      },
      {
        text: 'It was in July, and our guide had made a group of five from different sections. First we met in the library and discussed many ideas, and then we decided on a portal after a vote, and then we divided the work.',
        score: 3,
        why: `Most of the time goes on setting the scene, and you still haven't reached what you did. The interviewer will interrupt, and the story loses its shape.`
      },
      {
        text: 'We had six weeks to build a placement-cell portal with five people. I split it into modules, ran a ten-minute stand-up each evening and took the integration myself. We delivered a day early, and the cell still uses it.',
        score: 9,
        why: 'One line of context, then what you did and what came of it. The interviewer gets a complete story in under half a minute.'
      },
      {
        text: 'I was the team leader for our final year project. We faced many challenges but I handled them with good planning and communication, and the external examiner appreciated our project.',
        score: 6,
        why: `It has a situation and a result, but your actions are hidden behind "planning and communication". The interviewer can't tell what you actually did.`
      }
    ],
    lesson: 'Use one line for the situation, then spend your time on what you did and what happened as a result.'
  },
  {
    id: 'r2-initiative-03',
    round: 2,
    topic: 'initiative',
    style: 'any',
    question: 'The interviewer asks "Tell me about a time you had to learn something quickly." Your hackathon team needed a payment integration in a day and nobody had done it. Which answer is best?',
    options: [
      {
        text: `Nobody had used a payment gateway, so I took the sandbox docs, got one test payment working in an hour, and wrote a half-page note for the team on what I'd confirmed and what I hadn't. It worked with ten hours left.`,
        score: 9,
        why: `You went straight to something working, then shared what you learned. Saying what you hadn't verified is honest in a way engineers respect.`
      },
      {
        text: `We didn't need it, as payment can be shown with a dummy button in the demo. Judges mostly check the idea, so I convinced the team to skip the real integration.`,
        score: 1,
        why: 'Avoiding the learning is the opposite of what was asked. The interviewer hears that you cut corners when something gets hard.'
      },
      {
        text: `I messaged seniors and friends who'd done this before, and one of them sent their code, which I adapted for our app.`,
        score: 3,
        why: `Asking for help is fine, but you can't explain code you didn't write. The interviewer can't tell what you learned from the exchange.`
      },
      {
        text: `I watched tutorials on YouTube for the whole afternoon and followed along. I'm a quick learner, and by evening I had integrated it into our app.`,
        score: 6,
        why: `It shows you can pick things up, but "tutorials and quick learner" is the usual answer. There's nothing on how you checked it worked or helped the team.`
      }
    ],
    lesson: `When you learn something fast, show how you reached a working result and how you checked it, instead of saying you're a quick learner.`
  },

  // ---------------------------------------------------------------- Round 3: Your work
  {
    id: 'r3-explain-01',
    round: 3,
    topic: 'project-explaining',
    style: 'any',
    question: `An HR interviewer with no technical background says "Explain your project to me like I'm not an engineer." Your project predicts crop disease from leaf photos. Which explanation works best?`,
    options: [
      {
        text: `It's a deep learning based leaf disease classifier using a CNN. In simple terms, the computer is trained to recognise patterns in images, like how humans recognise faces.`,
        score: 6,
        why: 'You tried to simplify, and the face analogy helps a little, but "CNN" and "classifier" are still in there. The problem it solves for anyone is missing.'
      },
      {
        text: 'Farmers often notice a plant disease too late. Our app lets them photograph a leaf and tells them which disease it most likely is, so they can act earlier. We trained it on about ten thousand labelled leaf photos.',
        score: 9,
        why: 'It starts with a person and a problem, uses plain words and adds one detail for credibility. The listener could repeat it to someone else, which is the real test.'
      },
      {
        text: `I'd keep it simple and say it's an AI project. AI is the future, and our project uses it to solve a real agricultural problem, which is very important for India.`,
        score: 3,
        why: `"AI" and "important" are big words with nothing inside them. The listener hears enthusiasm but couldn't say what the app does.`
      },
      {
        text: 'It uses a MobileNetV2 transfer learning model with data augmentation, trained on the PlantVillage dataset, reaching 94 percent validation accuracy at batch size 32. I can go through the architecture if you want.',
        score: 1,
        why: 'Everything here is correct, and none of it helps this listener. You were asked to translate and you answered in technical terms again.'
      }
    ],
    lesson: 'For a non-technical listener, start with who has the problem and what your project does for them, in plain words.'
  },
  {
    id: 'r3-explain-02',
    round: 3,
    topic: 'project-explaining',
    style: 'any',
    question: 'A technical interviewer says "Walk me through what happens when a user places an order in your food-delivery app." Which approach works best?',
    options: [
      {
        text: `First let me explain the whole design from the beginning. Our app has twelve modules: user, restaurant, menu, cart, payment and so on. I'll go one by one, starting with the user module.`,
        score: 3,
        why: `You've turned a flow question into a module tour. By module four the interviewer has lost the thread, and the order itself hasn't been mentioned.`
      },
      {
        text: `It's quite simple. The user places an order, the backend processes it, saves it in the database and the restaurant sees it. Everything is automatic, so there isn't much more to it.`,
        score: 1,
        why: `Every step is a placeholder. "Processes it" is exactly what the interviewer asked about, and you've skipped past it.`
      },
      {
        text: 'We used React for the frontend, Node and Express for the backend, MongoDB for the database and Redis for caching. The frontend talks to the backend through REST APIs, and everything is hosted on AWS.',
        score: 6,
        why: `A tidy list of components, but the question was about the flow. The interviewer still doesn't know what happens, or in what order, for one order.`
      },
      {
        text: `I'll follow one order. The app sends a POST to the order service, which checks stock and writes the order, then puts a message on a queue. A worker picks it up and notifies the restaurant. I can zoom into any step.`,
        score: 9,
        why: 'Following one request from start to end gives a clear spine, and offering to zoom in lets the interviewer choose the depth.'
      }
    ],
    lesson: 'Explain a system by following one real request from start to finish, and offer to go deeper wherever they like.'
  },
  {
    id: 'r3-explain-03',
    round: 3,
    topic: 'project-explaining',
    style: 'any',
    question: 'The interviewer says "A library management system is a very common final-year project. What did you do differently?" Which answer is best?',
    options: [
      {
        text: 'We took a GitHub project as the base and customised it for our college, because time was short and many students do it this way. The marks were good for us.',
        score: 1,
        why: 'Starting from existing code is fine if you say what changed. You only said it was copied, and now the interviewer may doubt every other claim you make about it.'
      },
      {
        text: `Our system has extra features like email reminders and a barcode scanner, so it's more advanced than the usual ones. We also used a modern tech stack that most students don't.`,
        score: 6,
        why: 'Features and stack are a fair answer, but anyone can add them. The interviewer is asking what you thought through, not what you bolted on.'
      },
      {
        text: `You're right, the core is standard CRUD. The part I did myself was the fine calculator, because our library's real rules have exceptions for reference books and faculty, and no tutorial covered that. I can show you how I handled them.`,
        score: 9,
        why: 'You agree with the obvious point, then name one thing you decided yourself. That sounds honest, and it gives the interviewer a place to test you.'
      },
      {
        text: `It's actually quite different because it's a complete system with a full UI. Most students make only a basic version, but ours has all the features a real library would need.`,
        score: 3,
        why: `Calling it complete and different without one example sounds defensive. The interviewer can't check "all the features".`
      }
    ],
    lesson: `If your project is a common one, agree that it's common and point to the one part you worked out yourself.`
  },
  {
    id: 'r3-tradeoff-01',
    round: 3,
    topic: 'trade-offs',
    style: 'any',
    question: `The interviewer says "Why did you pick MongoDB for your PG-finder app?" Your honest reason is that you'd used it before and the listing fields kept changing. Which answer is best?`,
    options: [
      {
        text: `Honestly, I knew it already, and our listing fields kept changing in the first month, so not fixing a schema helped us move fast. If we needed reports across tables, like rent by locality, I'd move to a relational database.`,
        score: 9,
        why: 'You give the real reasons, including familiarity, then say what would change your mind. Naming that condition shows you understand the trade-off behind the tool.'
      },
      {
        text: 'SQL is outdated for modern apps, and MongoDB is the industry standard now since startups and big companies use it widely. So I chose the industry-standard technology.',
        score: 3,
        why: `A sweeping claim the interviewer may disagree with, and it shows nothing was weighed. If they ask what SQL can't do, there's no answer behind it.`
      },
      {
        text: `MongoDB is a NoSQL database, which is flexible and scalable compared to SQL. It stores data in JSON format, so it's easy to work with in a Node application.`,
        score: 6,
        why: `True features, but they're the textbook line. The interviewer can't tell whether the choice was a decision or a default.`
      },
      {
        text: `Our guide suggested it, so we used MongoDB. I don't know much about the other options, so I can't really compare them, and it worked fine for our project.`,
        score: 1,
        why: `It's honest, but "I didn't choose it and can't compare" ends the discussion. The interviewer hears that nobody on the team thought about the choice.`
      }
    ],
    lesson: 'Give the real reason for a technology choice and say what would make you switch.'
  },
  {
    id: 'r3-tradeoff-02',
    round: 3,
    topic: 'trade-offs',
    style: 'any',
    question: `Your live-score app for your college's sports week refreshes by asking the server every five seconds, not by using WebSockets. The interviewer asks "Why polling?" Which answer is best?`,
    options: [
      {
        text: `We didn't know WebSockets at that time, so we used polling. I've learned about them since, and WebSockets are better because they give real-time updates without extra requests.`,
        score: 6,
        why: `Honest, and you've since learned more. But you didn't say whether polling was actually wrong for this app, so the interviewer can't tell if you'd choose well next time.`
      },
      {
        text: `Polling is very reliable and WebSockets have too many connection problems, so polling is the better choice for any app. That's why we kept it in our project.`,
        score: 3,
        why: `"Better for any app" is the kind of absolute that gets challenged. Both have their place, and you've shown you know only one side.`
      },
      {
        text: `It's a small project, so it doesn't matter. Nobody checks live scores that closely anyway, and the app was only for sports week.`,
        score: 1,
        why: `"It doesn't matter" shuts down a question you were given a chance to answer. It reads as not caring about engineering choices.`
      },
      {
        text: `With sports week two days away, polling was a few lines and fine for forty users. It wastes requests, so if we reached thousands of users I'd move to WebSockets or server-sent events.`,
        score: 9,
        why: `You admit the cost of your choice and say when it stops being right. That's the core of a trade-off answer.`
      }
    ],
    lesson: `A good trade-off answer states what you gave up and the point at which you'd choose differently.`
  },
  {
    id: 'r3-ownership-01',
    round: 3,
    topic: 'ownership',
    style: 'any',
    question: 'Your resume project had four members. The interviewer says "Which part did you personally build?" Which answer is best?',
    options: [
      {
        text: `It was a team effort and we all did everything together, so it's hard to separate. We met daily, discussed every feature and each of us reviewed all the code.`,
        score: 3,
        why: `Sharing credit is generous, but "we all did everything" tells the interviewer nobody can say what you built. They'll assume your share was small.`
      },
      {
        text: 'I wrote the booking service, meaning the seat-locking logic and its tests. Divya did the payment flow, and Arjun and Kavya did the frontend. My tricky part was two people booking the same seat, which I solved with a database lock.',
        score: 9,
        why: `There's a clear boundary between your work and theirs, plus a technical detail only the builder would know. The interviewer can probe it, and you can answer.`
      },
      {
        text: 'I built the entire thing, honestly. My teammates are listed on the project, but I did the design, backend, frontend and deployment on my own.',
        score: 1,
        why: `Claiming everything is risky because it's easy to test. One question about the frontend and the interviewer will find out how much was really yours.`
      },
      {
        text: 'I worked on the backend of the project, mostly the APIs and the database. My teammates handled the frontend and testing. We coordinated well and everyone contributed to the final product.',
        score: 6,
        why: `"Backend" is an area and not a piece of work. Without a specific API or decision, the interviewer can't tell how deep your part went.`
      }
    ],
    lesson: 'Name the exact piece you built, credit teammates by name for theirs, and be ready for follow-ups on yours.'
  },
  {
    id: 'r3-ownership-02',
    round: 3,
    topic: 'ownership',
    style: 'any',
    question: 'The interviewer says "What was the hardest bug you hit in this project?" Which answer is best?',
    options: [
      {
        text: `The hardest bug was in the login module. It wasn't working properly for some users. After a lot of debugging and searching on Stack Overflow, I finally found the issue and fixed it.`,
        score: 6,
        why: 'You hit every story beat but give no content. Which bug, what caused it, how did you find it? The interviewer needs one real detail to believe the rest.'
      },
      {
        text: `We didn't face any big bugs. The project worked fine in the demo, and the small errors we got were solved by Googling, so I don't have a specific one in mind.`,
        score: 1,
        why: `A project with no hard bugs sounds like a project that wasn't pushed. The interviewer takes it as shallow work or a story that isn't yours.`
      },
      {
        text: 'Our app slowed down after a few minutes of use. I added timing logs and saw that each request opened a new database connection and never closed it. A connection pool fixed it, and now I check for that early.',
        score: 9,
        why: `You give the symptom, how you found the cause and what fixed it, in order. That shows a debugging method that would work on a bug you haven't seen before.`
      },
      {
        text: 'The hardest part was deployment, not a bug. The project ran on my laptop but not on the server, and it took two days. In the end my friend helped me fix it.',
        score: 3,
        why: `A real problem, but the story ends with "my friend helped me". The interviewer can't tell what you understood or took from it.`
      }
    ],
    lesson: 'Describe a bug as symptom, how you found the cause, and the fix, with one real technical detail.'
  },
  {
    id: 'r3-ownership-03',
    round: 3,
    topic: 'ownership',
    style: 'any',
    question: 'The interviewer asks "If you could redo this project, what would you change?" Your project was a canteen pre-order app. Which answer is best?',
    options: [
      {
        text: `I'd write tests for the order-total logic from week one. We found two wrong-total bugs only at the demo, and a few tests would have caught them. I'd also agree on the API format before the frontend started.`,
        score: 9,
        why: `It's specific, about how you worked, and tied to something that really happened. The interviewer hears reflection and not a polished confession.`
      },
      {
        text: `I'd add more features like notifications and analytics, and use a better UI. With more time I'd also make it scalable so many users can use it at once.`,
        score: 6,
        why: `More features is a wish list, not a lesson. The interviewer wanted to hear what you'd do differently in how you worked.`
      },
      {
        text: `I'd use a more popular technology like React with Next.js, since Angular was difficult and nobody in industry uses it. I'd rebuild it from scratch.`,
        score: 1,
        why: `Swapping the tool is rarely the lesson, and "nobody uses it" is an easy claim to challenge. It suggests you'd blame the stack for problems that came from planning.`
      },
      {
        text: `I wouldn't change anything major. The project worked well, we got an A grade, and the examiner was happy. Maybe a few small things in the UI.`,
        score: 3,
        why: `Having nothing to change suggests you didn't look back at the work critically. Interviewers often ask this precisely to see whether you can.`
      }
    ],
    lesson: `Say what you'd change about how you worked, and tie it to something that actually went wrong.`
  },
  {
    id: 'r3-depth-01',
    round: 3,
    topic: 'depth',
    style: 'any',
    question: `The interviewer asks "How does a HashMap handle collisions?" You've used HashMap in every project but never looked inside. Which response is best?`,
    options: [
      {
        text: `It simply overwrites the old value with the new one if the hash is the same, so there are no collisions in a HashMap. That's why it's so fast.`,
        score: 1,
        why: `This is wrong and said with certainty. A confident wrong answer costs more than "I'm not sure", because it makes your other answers hard to trust.`
      },
      {
        text: `I've used it a lot but haven't studied the internals deeply. My understanding is that keys go into buckets by hash, and two keys landing in one bucket are chained together. I'm not sure about the details after that. Shall I reason it through?`,
        score: 9,
        why: 'You say what you know, name where it stops and offer to think aloud. Interviewers find an honest boundary more trustworthy than a confident bluff.'
      },
      {
        text: `I haven't studied that, sir. I know HashMap stores key-value pairs and gives fast lookup, but I don't know how collisions are handled. I'll learn it after this interview.`,
        score: 6,
        why: 'Honest, and not bluffing. But you stopped at the edge with nothing to build on. Even a guess at the mechanism, marked as a guess, would keep the conversation alive.'
      },
      {
        text: `That's an internal implementation detail, and Java handles it for us. As a developer I don't need to worry about it, I just use the put and get methods.`,
        score: 3,
        why: 'It sounds confident but dismisses the question. An interviewer asking about internals is checking curiosity, and this shows none.'
      }
    ],
    lesson: 'When you hit the edge of what you know, say where it is, share what you do know, and offer to reason it out.'
  },
  {
    id: 'r3-depth-02',
    round: 3,
    topic: 'depth',
    style: 'any',
    question: 'You gave a correct answer about database indexes. The interviewer frowns and says "Are you sure about that?" What do you do?',
    options: [
      {
        text: `I'd take a few seconds to re-check my reasoning out loud. If I still think I'm right, I'd say so and explain why. If I find a gap, I'd say "you're right, I missed that" and correct it.`,
        score: 9,
        why: 'You treat the challenge as a reason to re-check and not as a verdict. Interviewers often push to see whether you can hold a correct answer and admit a real error.'
      },
      {
        text: `I'd hold my answer firmly and repeat it with more confidence. I know what I said was right, and changing it would look like I'm unsure of my own knowledge.`,
        score: 6,
        why: `Standing firm is right when you are right, but repeating louder isn't reasoning. The interviewer wants to hear why, and may be hinting at a real gap.`
      },
      {
        text: `I'd say "sorry, maybe I'm wrong" and switch my answer to the opposite, because the interviewer probably knows better.`,
        score: 3,
        why: 'Switching with no new reasoning shows your first answer was a guess. The interviewer learns they can steer you to any answer by frowning.'
      },
      {
        text: `I'd say "I think so, but you tell me, sir" and wait for the interviewer to give the right answer.`,
        score: 1,
        why: `You handed the question back with no reasoning. The interviewer learns nothing about what you know, and sees that you don't check your own work.`
      }
    ],
    lesson: 'When challenged, re-check out loud, hold your answer if the reasoning stands, and admit a mistake plainly if you find one.'
  },
  {
    id: 'r3-impact-01',
    round: 3,
    topic: 'impact',
    style: 'any',
    question: 'Your hostel mess-feedback app had no analytics, but you know people used it. The interviewer asks "What impact did it have?" Which answer is best?',
    options: [
      {
        text: `Not much, honestly. It was a learning project to practise Node, so I never tracked anything, and I can't say how many people used it.`,
        score: 1,
        why: `Honest about the gap, but it stops there. Even without analytics you'd have signals, like sign-ups or what changed because of it, and the interviewer wanted to hear them.`
      },
      {
        text: 'The impact was huge. It completely solved the hostel mess problem and is now used by the entire college, so we made a big difference.',
        score: 3,
        why: 'Big claims with no numbers are easy to check with one follow-up. If any of it is stretched, the interviewer will find the stretch quickly.'
      },
      {
        text: 'It was used by a good number of hostel students and the response was very positive. Many friends told me it was useful, and the mess committee also appreciated it.',
        score: 6,
        why: `Positive, but "good number" and "appreciated" are vague. The interviewer can't picture how many used it or what it changed.`
      },
      {
        text: `I don't have formal metrics, but here's what I saw. About 150 of the 300 residents had signed up by the second month, and the mess committee changed the dinner menu twice based on complaints it showed.`,
        score: 9,
        why: `Honest about what you don't have, then specific signals you can stand behind. It says what changed because the app existed, which is what impact means.`
      }
    ],
    lesson: `With no formal metrics, report the signals you do have, like sign-ups or decisions the project changed, and say plainly that they're informal.`
  },
  {
    id: 'r3-impact-02',
    round: 3,
    topic: 'impact',
    style: 'any',
    question: 'Your resume says "Improved dashboard load time by 40%" from your internship. The interviewer asks "How did you measure that?" Which answer is best?',
    options: [
      {
        text: `I loaded the dashboard fifty times before and after the change on the same network and compared the average. It dropped from about 2.5 seconds to 1.5. I didn't test with many users at once.`,
        score: 9,
        why: `You say what you measured and under what conditions, and what the figure doesn't cover. That's what makes the number believable.`
      },
      {
        text: 'My mentor calculated the number and put it in my report. I made the change, and the mentor said load time improved by about forty percent.',
        score: 3,
        why: `If you quote your mentor's number, you can't defend it. A result on your resume should be one you can explain from scratch.`
      },
      {
        text: 'That figure is approximate. I wrote 40 percent because numbers look better on resumes, and the improvement was definitely there.',
        score: 1,
        why: `Admitting a number was chosen for looks makes the interviewer question every other line on your resume. It's honest, but it costs you a lot.`
      },
      {
        text: `We checked the load time in the browser before and after the change and it was about forty percent faster. I can't recall the exact numbers, but it was clearly better.`,
        score: 6,
        why: `You did measure something, but you can't produce the figures. The interviewer will wonder if forty percent was rounded up for the resume.`
      }
    ],
    lesson: `Only put a number on your resume if you can explain how you measured it and what it doesn't cover.`
  }
];
