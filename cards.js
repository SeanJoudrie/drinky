/* RAP SHEET — base deck.
   Voice: deadpan cop report wrapped around filthy accusations.
   Stakes are NEUTRAL ("a prior"). Drinking is a global toggle (window.DRINK), never baked in text.
   Tokens (filled on-device): {left} {right} {across} {holder} {keyword}
   Fields:
     type   : callout | dare | thisorthat | group
     spice  : 1..5  (4+ = FELONY, +2 priors)
     themes : [] for keyword/vibe boosting
     minPlayers : table-size floor (default 2)
     topics : [] off-limits tags ("exes","body","money") for the setup guardrail
     book   : false => pure laugh, no booking chips
     choice : true  => "double or nothing" per-turn agency (felony)
     drinkRule : optional per-card override of the global map
*/
window.DRINK = { prior: "🍺 That's a sip.", felony: "🍺 Two big sips — or finish it." };

window.CARDS = [
  // ───────────────────── SPICE 1 — chill / sober-safe ─────────────────────
  {id:1,  type:"callout", spice:1, minPlayers:3, themes:["driving"], text:"Everyone point at the worst driver here. Majority rules — they're booked."},
  {id:2,  type:"callout", spice:1, themes:["social"], text:"Point at the table's biggest gossip. Charges filed."},
  {id:3,  type:"callout", spice:1, themes:["social"], text:"Point at whoever takes the longest to get ready."},
  {id:4,  type:"callout", spice:1, themes:["social"], text:"Who's most likely to cry at a commercial? Book 'em."},
  {id:5,  type:"callout", spice:1, text:"Point at the worst liar at this table."},
  {id:6,  type:"dare",    spice:1, text:"{holder}, compliment {right} like you actually mean it. Refuse and take a prior."},
  {id:7,  type:"dare",    spice:1, themes:["phone"], text:"{left}, show the group your phone wallpaper and explain it."},
  {id:8,  type:"dare",    spice:1, text:"{across}, do your best fake laugh. Unconvincing = booked."},
  {id:9,  type:"thisorthat", spice:1, minPlayers:3, text:"Jury's out: bigger liability, the youngest here or the oldest? Loser booked."},
  {id:10, type:"group",   spice:1, themes:["party"], text:"Everyone who's left a party without saying goodbye is hereby charged. Confess."},
  {id:11, type:"group",   spice:1, text:"Everyone still thinking about something dumb they did in high school — booked."},
  {id:12, type:"group",   spice:1, themes:["social"], text:"Anyone who's faked being busy to dodge plans this month, take a prior."},
  {id:13, type:"group",   spice:1, themes:["phone"], text:"Roll call: take a prior if you've googled yourself this week."},
  {id:14, type:"callout", spice:1, text:"Point at the person here who gives the absolute worst advice."},
  {id:15, type:"callout", spice:1, themes:["food"], text:"Identify the table's pickiest eater. The court demands a name."},
  {id:16, type:"dare",    spice:1, text:"{holder}, do your best impression of a tired customer-service worker."},
  {id:17, type:"group",   spice:1, themes:["phone"], text:"Anyone whose screen-time is genuinely embarrassing, take a prior."},
  {id:18, type:"callout", spice:1, themes:["social"], text:"Point at whoever's most likely to talk through an entire movie."},
  {id:19, type:"dare",    spice:1, themes:["music"], text:"{right}, hum a song until someone guesses it. Fail in 30 seconds = booked."},

  // ───────────────────── SPICE 2 — classic ─────────────────────
  {id:20, type:"callout", spice:2, themes:["party"], text:"Point at the prime suspect — who's most likely to get us kicked out tonight?"},
  {id:21, type:"callout", spice:2, themes:["dating","exes"], topics:["exes"], text:"Book 'em: who at this table is texting an ex before sunrise?"},
  {id:22, type:"callout", spice:2, themes:["party"], text:"Name the table's biggest liability on a night out. Charges filed."},
  {id:23, type:"callout", spice:2, text:"Who's most likely to get a tattoo they'll regret? Point now."},
  {id:24, type:"callout", spice:2, text:"Who'd survive the shortest in prison? The court wants a name."},
  {id:25, type:"callout", spice:2, themes:["phone","social"], text:"Who's most likely to start drama in the group chat? Accuse them."},
  {id:26, type:"callout", spice:2, themes:["money"], topics:["money"], text:"Who's most likely to 'accidentally' leave before the bill comes? Book them."},
  {id:27, type:"callout", spice:2, themes:["social"], text:"Point at whoever's most likely to fake their own death to avoid a conversation."},
  {id:28, type:"dare",    spice:2, text:"{holder}, the court demands your most convincing fake cry. Comply or take a prior."},
  {id:29, type:"dare",    spice:2, text:"{left}, do a 10-second impression of someone at this table. Refuse and you're booked."},
  {id:30, type:"dare",    spice:2, text:"{across}, do your worst celebrity impression. Bad acting is a crime here."},
  {id:31, type:"dare",    spice:2, text:"{right}, talk in an accent until your next turn. Drop it and you're booked."},
  {id:32, type:"dare",    spice:2, text:"{holder}, do 10 pushups or confess something this group doesn't know."},
  {id:33, type:"thisorthat", spice:2, minPlayers:3, text:"Bigger menace tonight — {left} or {right}? Loser gets booked."},
  {id:34, type:"thisorthat", spice:2, minPlayers:3, text:"Who'd last longer in jail — {holder} or {across}? Vote out loud."},
  {id:35, type:"thisorthat", spice:2, minPlayers:3, themes:["social"], text:"Who's the bigger oversharer: {left} or {right}? Loser booked."},
  {id:36, type:"thisorthat", spice:2, minPlayers:3, themes:["social"], text:"Who's more likely to ghost a wedding — {holder} or {across}?"},
  {id:37, type:"group",   spice:2, themes:["phone","social"], text:"Anyone who's rehearsed a text for over five minutes: guilty. Take a prior."},
  {id:38, type:"group",   spice:2, themes:["work"], text:"Confess: who's cried at work this year? You're all charged."},
  {id:39, type:"group",   spice:2, themes:["dating","exes"], topics:["exes"], text:"Everyone who's named a pet, password, or playlist after an ex — booked."},
  {id:40, type:"group",   spice:2, themes:["music"], text:"Roll call: take a prior if you've ever pretended to know a song you didn't."},
  {id:41, type:"callout", spice:2, themes:["work"], text:"Point at the one most likely to reply-all to the entire company by accident."},
  {id:42, type:"callout", spice:2, themes:["party","drinking"], text:"Who's the lightweight here? The room knows. Point."},
  {id:43, type:"dare",    spice:2, themes:["phone"], text:"{holder}, read the last notification on your lock screen out loud. Refuse = prior."},
  {id:44, type:"group",   spice:2, themes:["social"], text:"Anyone who's ghosted someone they actually liked, take a prior. Cowards."},
  {id:45, type:"thisorthat", spice:2, minPlayers:3, themes:["money"], topics:["money"], text:"Worse with money — {left} or {right}? Loser is booked."},
  {id:46, type:"callout", spice:2, themes:["social"], text:"Point at whoever apologizes the most for things that aren't their fault."},
  {id:47, type:"dare",    spice:2, text:"{across}, say the most controversial food opinion you actually believe."},
  {id:48, type:"group",   spice:2, themes:["party"], text:"Everyone who's thrown up at a party they were hosting: guilty as charged."},
  {id:49, type:"callout", spice:2, themes:["dating"], text:"Who falls in love the fastest at this table? Point at the felon."},

  // ───────────────────── SPICE 3 — classic edge ─────────────────────
  {id:50, type:"callout", spice:3, themes:["dating","social"], text:"Identify the flight risk — who'd ditch this group first for someone hotter?"},
  {id:51, type:"callout", spice:3, themes:["dating","exes"], topics:["exes"], text:"Who here has the worst taste in people they date? Point now."},
  {id:52, type:"callout", spice:3, themes:["phone"], text:"Whose phone has the most cursed search history? Accuse someone."},
  {id:53, type:"callout", spice:3, text:"Name the biggest hypocrite at this table. Evidence optional."},
  {id:54, type:"callout", spice:3, text:"Point at whoever clearly peaked in high school."},
  {id:55, type:"dare",    spice:3, themes:["phone"], text:"{holder}, read your last sent text out loud in a seductive voice. Or eat a prior."},
  {id:56, type:"dare",    spice:3, themes:["music"], text:"{left}, play the most embarrassing song in your recent history. Lie and it's two priors."},
  {id:57, type:"group",   spice:3, themes:["dating","exes"], topics:["exes"], text:"Roll call: confess if you've ever stalked an ex's new partner online."},
  {id:58, type:"group",   spice:3, themes:["dating"], text:"Anyone who's sent a risky text and immediately regretted it — guilty."},
  {id:59, type:"callout", spice:3, themes:["social"], text:"Who at this table is the most secretly judgmental? Point. We all know."},
  {id:60, type:"dare",    spice:3, themes:["phone"], text:"{across}, hand left and let them scroll three posts back on your feed."},
  {id:61, type:"group",   spice:3, themes:["work"], text:"Confess: who's lied on a résumé or in an interview? Take a prior."},
  {id:62, type:"callout", spice:3, themes:["dating"], text:"Point at whoever's the worst texter — leaves everyone on read for days."},
  {id:63, type:"thisorthat", spice:3, minPlayers:3, themes:["dating"], text:"Messier love life — {left} or {right}? The loser confesses one detail."},
  {id:64, type:"group",   spice:3, themes:["social"], text:"Anyone who's screenshotted a conversation to talk about someone — booked."},

  // ───────────────────── FELONY — spice 4-5, +2 priors ─────────────────────
  {id:70, type:"dare",    spice:4, choice:true, text:"FELONY: {holder}, name the most attractive person at this table. No takebacks."},
  {id:71, type:"dare",    spice:5, choice:true, themes:["phone"], text:"FELONY: hand your phone left — they read your last search out loud."},
  {id:72, type:"group",   spice:4, themes:["social"], text:"FELONY: confess the pettiest reason you've ever unfollowed someone. Weak confession = two priors."},
  {id:73, type:"dare",    spice:4, themes:["phone"], text:"FELONY: {across}, reveal your most-used emoji and explain yourself to the court."},
  {id:74, type:"callout", spice:4, minPlayers:3, text:"FELONY: everyone vote — who's the biggest red flag here? They take two priors."},
  {id:75, type:"dare",    spice:5, choice:true, themes:["phone"], text:"FELONY: {holder}, show the group the last photo in your camera roll. No scrolling."},
  {id:76, type:"dare",    spice:4, choice:true, themes:["dating"], text:"FELONY: {left}, describe your type out loud. The whole table judges. Lie = two priors."},
  {id:77, type:"callout", spice:4, text:"FELONY: name one person here you'd survive the apocalypse with — and one you'd leave behind."},
  {id:78, type:"dare",    spice:4, text:"FELONY: {right}, let the table pick one word you must say in every sentence till your next turn."},
  {id:79, type:"dare",    spice:5, choice:true, themes:["phone","dating","exes"], topics:["exes"], text:"FELONY: {holder}, read the last message from the most recent ex in your phone."},
  {id:80, type:"group",   spice:4, themes:["dating"], text:"FELONY: everyone confess the most unhinged thing you've done to get someone's attention."},
  {id:81, type:"dare",    spice:4, choice:true, themes:["phone"], text:"FELONY: {across}, let the person on your right send one (1) text from your phone."},
  {id:82, type:"callout", spice:4, text:"FELONY: point at the person here you'd least trust with your biggest secret."},

  // ───────────────────── {keyword} token cards — the no-AI 'vibe' sprinkle ─────────────────────
  {id:90, type:"callout", spice:1, usesKeyword:true, text:"Who at this table is most obsessed with {keyword}? Point now."},
  {id:91, type:"group",   spice:1, usesKeyword:true, themes:["money"], text:"Anyone who's spent way too much money on {keyword}, take a prior."},
  {id:92, type:"dare",    spice:2, usesKeyword:true, text:"{left}, do your best {keyword} villain monologue. Bad acting = prior."},
  {id:93, type:"callout", spice:1, usesKeyword:true, book:false, text:"Name a crime {keyword} would absolutely commit. Funniest answer walks free."},
  {id:94, type:"dare",    spice:2, usesKeyword:true, text:"{holder}, make a convincing case that {keyword} is overrated. Fail and take a prior."},
  {id:95, type:"thisorthat", spice:2, usesKeyword:true, minPlayers:3, text:"Vote: who here would betray us all for {keyword}? Loser booked."},
  {id:96, type:"group",   spice:2, usesKeyword:true, text:"Confess: who secretly can't stand {keyword} but won't admit it?"},
  {id:97, type:"dare",    spice:2, usesKeyword:true, themes:["music"], text:"{right}, sing about {keyword} for 10 seconds. Refuse and take a prior."},
  {id:98, type:"group",   spice:1, usesKeyword:true, text:"Anyone who's been to {keyword}: you're all persons of interest. Take a prior."},
  {id:99, type:"callout", spice:1, usesKeyword:true, text:"Who'd talk about {keyword} for three hours straight? Accuse them."},
  {id:100,type:"dare",    spice:1, usesKeyword:true, text:"{across}, give the table a 10-second TED talk on {keyword}. Boring = booked."},
  {id:101,type:"callout", spice:2, usesKeyword:true, text:"Point at whoever would ditch this table to go do {keyword} instead."},
  {id:102,type:"group",   spice:2, usesKeyword:true, text:"Everyone whose personality is just {keyword} now — take a prior."},
  {id:103,type:"dare",    spice:2, usesKeyword:true, text:"{holder}, name three things about {keyword} or take a prior. Clock's ticking."},
  {id:104,type:"thisorthat", spice:2, usesKeyword:true, minPlayers:3, text:"Who knows more about {keyword} — {left} or {right}? Loser of the quiz is booked."},
  {id:105,type:"dare",    spice:3, usesKeyword:true, text:"{right}, confess your most embarrassing {keyword} opinion. Hold back = two priors... kidding, one."},
  {id:106,type:"callout", spice:1, usesKeyword:true, book:false, text:"As a group, decide which one of us would be canceled first for their {keyword} takes."},
  {id:107,type:"group",   spice:1, usesKeyword:true, text:"Roll call: take a prior if {keyword} has ever made you cry, rage, or text someone at 2am."},
];
