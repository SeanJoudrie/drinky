/* RAP SHEET — base deck.
   Voice: deadpan cop report wrapped around filthy accusations.
   Stakes are NEUTRAL ("a prior"). Drinking is a global toggle, never baked in text.
   Tokens (filled on-device): {left} {right} {across} {holder} {keyword}
   type: callout | dare | thisorthat | group
   book: true  -> shows the "who got booked?" chips (default for non-group)
         false -> pure laugh, just advance (used for some group/keyword bits)
*/
window.CARDS = [
  // ---------- spice 1 (chill-safe) ----------
  {id:1,  type:"callout", spice:1, text:"Everyone point at the worst driver here. Majority rules — they're booked."},
  {id:2,  type:"callout", spice:1, text:"Point at the table's biggest gossip. Charges filed."},
  {id:3,  type:"callout", spice:1, text:"Point at whoever takes the longest to get ready."},
  {id:4,  type:"callout", spice:1, text:"Who's most likely to cry at a commercial? Book 'em."},
  {id:5,  type:"callout", spice:1, text:"Point at the worst liar at this table."},
  {id:6,  type:"dare",    spice:1, text:"{holder}, compliment {right} like you actually mean it. Refuse and take a prior."},
  {id:7,  type:"dare",    spice:1, text:"{left}, show the group your phone wallpaper and explain it."},
  {id:8,  type:"dare",    spice:1, text:"{across}, do your best fake laugh. Unconvincing = booked."},
  {id:9,  type:"thisorthat", spice:1, text:"Jury's out: bigger liability, the youngest here or the oldest? Loser booked."},
  {id:10, type:"group",   spice:1, text:"Everyone who's left a party without saying goodbye is hereby charged. Confess."},
  {id:11, type:"group",   spice:1, text:"Everyone still thinking about something dumb they did in high school — booked."},
  {id:12, type:"group",   spice:1, text:"Anyone who's faked being busy to dodge plans this month, take a prior."},
  {id:13, type:"group",   spice:1, text:"Roll call: take a prior if you've googled yourself this week."},
  {id:14, type:"callout", spice:1, text:"Point at the person here who gives the absolute worst advice."},

  // ---------- spice 2 (classic) ----------
  {id:20, type:"callout", spice:2, text:"Point at the prime suspect — who's most likely to get us kicked out tonight?"},
  {id:21, type:"callout", spice:2, text:"Book 'em: who at this table is texting an ex before sunrise?"},
  {id:22, type:"callout", spice:2, text:"Name the table's biggest liability on a night out. Charges filed."},
  {id:23, type:"callout", spice:2, text:"Who's most likely to get a tattoo they'll regret? Point now."},
  {id:24, type:"callout", spice:2, text:"Who'd survive the shortest in prison? The court wants a name."},
  {id:25, type:"callout", spice:2, text:"Who's most likely to start drama in the group chat? Accuse them."},
  {id:26, type:"callout", spice:2, text:"Who's most likely to 'accidentally' leave before the bill comes? Book them."},
  {id:27, type:"callout", spice:2, text:"Point at whoever's most likely to fake their own death to avoid a conversation."},
  {id:28, type:"dare",    spice:2, text:"{holder}, the court demands your most convincing fake cry. Comply or take a prior."},
  {id:29, type:"dare",    spice:2, text:"{left}, do a 10-second impression of someone at this table. Refuse and you're booked."},
  {id:30, type:"dare",    spice:2, text:"{across}, do your worst celebrity impression. Bad acting is a crime here."},
  {id:31, type:"dare",    spice:2, text:"{right}, talk in an accent until your next turn. Drop it and you're booked."},
  {id:32, type:"dare",    spice:2, text:"{holder}, do 10 pushups or confess something this group doesn't know."},
  {id:33, type:"thisorthat", spice:2, text:"Bigger menace tonight — {left} or {right}? Loser gets booked."},
  {id:34, type:"thisorthat", spice:2, text:"Who'd last longer in jail — {holder} or {across}? Vote out loud."},
  {id:35, type:"thisorthat", spice:2, text:"Who's the bigger oversharer: {left} or {right}? Loser booked."},
  {id:36, type:"thisorthat", spice:2, text:"Who's more likely to ghost a wedding — {holder} or {across}?"},
  {id:37, type:"group",   spice:2, text:"Anyone who's rehearsed a text for over five minutes: guilty. Take a prior."},
  {id:38, type:"group",   spice:2, text:"Confess: who's cried at work this year? You're all charged."},
  {id:39, type:"group",   spice:2, text:"Everyone who's named a pet, password, or playlist after an ex — booked."},
  {id:40, type:"group",   spice:2, text:"Roll call: take a prior if you've ever pretended to know a song you didn't."},

  // ---------- spice 3 (classic-edge) ----------
  {id:50, type:"callout", spice:3, text:"Identify the flight risk — who'd ditch this group first for someone hotter?"},
  {id:51, type:"callout", spice:3, text:"Who here has the worst taste in people they date? Point now."},
  {id:52, type:"callout", spice:3, text:"Whose phone has the most cursed search history? Accuse someone."},
  {id:53, type:"callout", spice:3, text:"Name the biggest hypocrite at this table. Evidence optional."},
  {id:54, type:"callout", spice:3, text:"Point at whoever clearly peaked in high school."},
  {id:55, type:"dare",    spice:3, text:"{holder}, read your last sent text out loud in a seductive voice. Or eat a prior."},
  {id:56, type:"dare",    spice:3, text:"{left}, play the most embarrassing song in your recent history. Lie and it's two priors."},
  {id:57, type:"group",   spice:3, text:"Roll call: confess if you've ever stalked an ex's new partner online."},
  {id:58, type:"group",   spice:3, text:"Anyone who's sent a risky text and immediately regretted it — guilty."},

  // ---------- felony (spice 4-5, +2 priors) ----------
  {id:70, type:"dare",    spice:4, text:"FELONY: {holder}, name the most attractive person at this table. No takebacks."},
  {id:71, type:"dare",    spice:5, text:"FELONY: hand your phone left — they read your last search out loud. Or two priors."},
  {id:72, type:"group",   spice:4, text:"FELONY: confess the pettiest reason you've ever unfollowed someone. Weak confession = two priors."},
  {id:73, type:"dare",    spice:4, text:"FELONY: {across}, reveal your most-used emoji and explain yourself to the court."},
  {id:74, type:"callout", spice:4, text:"FELONY: everyone vote — who's the biggest red flag here? They take two priors."},
  {id:75, type:"dare",    spice:5, text:"FELONY: {holder}, show the group the last photo in your camera roll. Refuse = two priors."},
  {id:76, type:"dare",    spice:4, text:"FELONY: {left}, describe your type out loud. The whole table judges. Lie = two priors."},
  {id:77, type:"callout", spice:4, text:"FELONY: name one person here you'd survive the apocalypse with — and one you'd leave behind."},
  {id:78, type:"dare",    spice:4, text:"FELONY: {right}, let the table pick one word you must say in every sentence till your next turn."},

  // ---------- keyword / {keyword} token cards (the no-AI 'vibe' sprinkle) ----------
  {id:90, type:"callout", spice:1, usesKeyword:true, text:"Who at this table is most obsessed with {keyword}? Point now."},
  {id:91, type:"group",   spice:1, usesKeyword:true, text:"Anyone who's spent way too much money on {keyword}, take a prior."},
  {id:92, type:"dare",    spice:2, usesKeyword:true, text:"{left}, do your best {keyword} villain monologue. Bad acting = prior."},
  {id:93, type:"callout", spice:1, usesKeyword:true, book:false, text:"Name a crime {keyword} would absolutely commit. Funniest answer walks free."},
  {id:94, type:"dare",    spice:2, usesKeyword:true, text:"{holder}, make a convincing case that {keyword} is overrated. Fail and take a prior."},
  {id:95, type:"thisorthat", spice:2, usesKeyword:true, text:"Vote: who here would betray us all for {keyword}? Loser booked."},
  {id:96, type:"group",   spice:2, usesKeyword:true, text:"Confess: who secretly can't stand {keyword} but won't admit it?"},
  {id:97, type:"dare",    spice:2, usesKeyword:true, text:"{right}, sing about {keyword} for 10 seconds. Refuse and take a prior."},
  {id:98, type:"group",   spice:1, usesKeyword:true, text:"Anyone who's been to {keyword}: you're all persons of interest. Take a prior."},
  {id:99, type:"callout", spice:1, usesKeyword:true, text:"Who'd talk about {keyword} for three hours straight? Accuse them."},
];
