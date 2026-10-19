// Server-side check that runs BEFORE any model call. The system prompt also
// tells the model to redirect, but a prompt instruction is not a safety layer
// by itself. When this matches we return the message below, do not call the
// model, do not store the text, and do not spend one of the user's reflections.
//
// Matching is deliberately broad: a false positive only shows a kind support
// message, while a miss would send a person in crisis to a reflection tool.

const CRISIS_PATTERNS: RegExp[] = [
  // Matches any word starting with "suicid" (suicide, suicidal). Matches "I have been feeling suicidal"; rejects "I enjoyed the sunrise".
  // https://regex101.com/?flavor=javascript&regex=%5Cbsuicid%5Cw%2A&flags=i&testString=I%20have%20been%20feeling%20suicidal%0AI%20enjoyed%20the%20sunrise
  /\bsuicid\w*/i,
  // Matches a self-directed harm verb followed by "myself" or "me". Matches "I keep thinking about hurting myself"; rejects "I keep thinking about hurting her".
  // https://regex101.com/?flavor=javascript&regex=%5Cb%28kill%28ing%29%3F%7Churt%28ing%29%3F%7Charm%28ing%29%3F%7Ccut%28ting%29%3F%29%5Cs%2B%28myself%7Cme%29%5Cb&flags=i&testString=I%20keep%20thinking%20about%20hurting%20myself%0AI%20keep%20thinking%20about%20hurting%20her
  /\b(kill(ing)?|hurt(ing)?|harm(ing)?|cut(ting)?)\s+(myself|me)\b/i,
  // Matches "self harm", "self-harm", "selfharm" and longer forms. Matches "a history of self-harm"; rejects "I want to harm no one".
  // https://regex101.com/?flavor=javascript&regex=%5Cbself%5B%5Cs-%5D%3Fharm%5Cw%2A&flags=i&testString=a%20history%20of%20self-harm%0AI%20want%20to%20harm%20no%20one
  /\bself[\s-]?harm\w*/i,
  // Matches phrases about ending one's own life or "it all". Matches "I want to end my life"; rejects "I want to end the meeting".
  // https://regex101.com/?flavor=javascript&regex=%5Cb%28end%28ing%29%3F%7Ctake%7Ctaking%29%5Cs%2B%28my%5Cs%2B%28own%5Cs%2B%29%3Flife%7Cit%5Cs%2Ball%29%5Cb&flags=i&testString=I%20want%20to%20end%20my%20life%0AI%20want%20to%20end%20the%20meeting
  /\b(end(ing)?|take|taking)\s+(my\s+(own\s+)?life|it\s+all)\b/i,
  // Matches "want to die" and "wanted to die". Matches "sometimes I want to die"; rejects "I want to dine out".
  // https://regex101.com/?flavor=javascript&regex=%5Cbwant%28ed%29%3F%5Cs%2Bto%5Cs%2Bdie%5Cb&flags=i&testString=sometimes%20I%20want%20to%20die%0AI%20want%20to%20dine%20out
  /\bwant(ed)?\s+to\s+die\b/i,
  // Matches the informal "wanna die". Matches "I wanna die"; rejects "I wanna dance".
  // https://regex101.com/?flavor=javascript&regex=%5Cbwanna%5Cs%2Bdie%5Cb&flags=i&testString=I%20wanna%20die%0AI%20wanna%20dance
  /\bwanna\s+die\b/i,
  // Matches not wanting to be here, live, exist or be alive. Matches "I don't want to be here anymore"; rejects "I don't want to be late".
  // https://regex101.com/?flavor=javascript&regex=%5Cb%28don%27%3Ft%7Cdo%20not%29%5Cs%2Bwant%5Cs%2Bto%5Cs%2B%28be%5Cs%2Bhere%7Clive%7Cexist%7Cbe%5Cs%2Balive%29%5Cb&flags=i&testString=I%20don%27t%20want%20to%20be%20here%20anymore%0AI%20don%27t%20want%20to%20be%20late
  /\b(don'?t|do not)\s+want\s+to\s+(be\s+here|live|exist|be\s+alive)\b/i,
  // Matches "better off dead" or "better off without me". Matches "everyone would be better off without me"; rejects "we are better off with a plan".
  // https://regex101.com/?flavor=javascript&regex=%5Cbbetter%5Cs%2Boff%5Cs%2B%28dead%7Cwithout%5Cs%2Bme%29%5Cb&flags=i&testString=everyone%20would%20be%20better%20off%20without%20me%0Awe%20are%20better%20off%20with%20a%20plan
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  // Matches "no reason/point to live", "in living" or "in going on". Matches "there is no point in living"; rejects "there is no point in arguing".
  // https://regex101.com/?flavor=javascript&regex=%5Cbno%5Cs%2B%28reason%7Cpoint%29%5Cs%2B%28to%7Cin%29%5Cs%2B%28live%7Cliving%7Cgoing%5Cs%2Bon%29%5Cb&flags=i&testString=there%20is%20no%20point%20in%20living%0Athere%20is%20no%20point%20in%20arguing
  /\bno\s+(reason|point)\s+(to|in)\s+(live|living|going\s+on)\b/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

export const CRISIS_MESSAGE =
  "What you wrote sounds heavy, and your safety matters more than any reflection. " +
  "This tool is not able to support you through this, so we have not used or saved what you shared.\n\n" +
  "If you might act on thoughts of ending your life, or you are in immediate danger, call or text 988 " +
  "(Suicide & Crisis Lifeline, US) or call 911. You can also text HOME to 741741 (Crisis Text Line, US). " +
  "Outside the US, findahelpline.com lists services by country.\n\n" +
  "If you can, reach out to someone near you today, even with a short message.";
