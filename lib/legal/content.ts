/**
 * Legal content for Cardinal OS, shared by the /privacy and /terms pages and the
 * landing footer. DRAFT - written to a sensible standard for India's DPDP Act,
 * 2023, but should be reviewed by a lawyer before public launch.
 */

export const LEGAL = {
  company: "GraviQ Studios",
  product: "Cardinal OS",
  email: "graviqstudios@gmail.com",
  grievanceOfficer: "P. S. Satchith, GraviQ Studios",
  jurisdiction: "India",
  updated: "14 July 2026",
  // Bump this whenever the Terms / Privacy Policy materially change - users who
  // accepted an older version will be re-prompted once. (Machine-readable date.)
  // Bumped for Constellations servers (public discovery, shared stats,
  // presence), live voice/video rooms, and the AI study assistant.
  effectiveISO: "2026-07-14",
};

export type LegalDoc = {
  title: string;
  sections: { h: string; body: string[] }[];
};

export const PRIVACY: LegalDoc = {
  title: "Privacy Policy",
  sections: [
    {
      h: "Who we are",
      body: [
        `${LEGAL.product} is operated by ${LEGAL.company}, an independent studio in ${LEGAL.jurisdiction}. For the purposes of India's Digital Personal Data Protection Act, 2023 (DPDP Act), GraviQ Studios is the Data Fiduciary for the personal data you provide. You can reach us any time at ${LEGAL.email}.`,
      ],
    },
    {
      h: "What we collect",
      body: [
        "Account details from your Google sign-in: your name and email address.",
        "The content you create inside Cardinal: habits, tasks, projects, goals, journal entries, body metrics, focus sessions and similar.",
        "Your study content: subjects, chapters, topics, study tasks, practice answers and scores, and any notes or documents you upload (which we convert into a searchable form so the AI can answer from them).",
        "Your Constellations activity: the servers you create or join, the messages you post in their channels, and the study stats you publish to them.",
        "If you join a voice or video room, your camera, microphone and screen-share streams are carried in real time to the other people in that room. We do not record or store them.",
        "Basic, non-identifying usage and device information that helps us keep the product reliable.",
        "If you connect Google Calendar, Notion or Spotify, only the data that feature needs, accessed only while connected.",
      ],
    },
    {
      h: "How we use your data",
      body: [
        "To run Cardinal: to calculate your Life Score, power its AI features, and show you your own information.",
        "To support and improve the service, and to keep it secure.",
        "We do not sell your personal data, and we do not use your content to train any AI model.",
      ],
    },
    {
      h: "Who can access your data",
      body: [
        "Cardinal is a cloud service, not an end-to-end encrypted vault. Your data is protected from other users by row-level security, and from the public by authentication, but it is not hidden from us.",
        `Only you, and authorised members of the ${LEGAL.company} team acting to operate, support or secure the service, can access your data. We access individual accounts only when necessary, for example to resolve a support request you raise.`,
        "We may disclose data if required by law, or to protect the rights, safety and security of our users and the service.",
      ],
    },
    {
      h: "Constellations: what other people can see",
      body: [
        "Most of Cardinal is private to you. Constellations are the deliberate exception: they are shared spaces, so some of your information becomes visible to the other members of a server you join.",
        "Members of a server you are in can see your display name, anything you post in its channels, whether you are currently online, and the study stats you publish: your readiness score, your day streak, your recent study minutes and your current goal.",
        "A server is either private (joinable only with its invite code) or public. Public servers are listed in Discover, where any signed-in Cardinal user can see the server's name, description, icon and member count, and can join without an invite. Once they join, they can see the information above about you, even though you do not know them.",
        "Please treat a Constellation as a public place and do not post anything there you would not want its members to have. You can leave a server at any time, and if you own a server you can make it private or delete it.",
      ],
    },
    {
      h: "Voice and video rooms",
      body: [
        "Voice channels let you talk with the other members of a server in real time, using LiveKit as our real-time media provider.",
        "Your camera and microphone stay off until you choose to join a room and your browser asks your permission. You can mute, turn your camera off, or leave at any time.",
        "While you are in a room, your audio, video and any screen you share are relayed live to the other people in that room. We do not record, store or listen to them, and they are not used for AI or analytics.",
        "We cannot control what other people in a room do. Anyone present can see and hear you, and could capture it using tools outside Cardinal. Only join rooms with people you are comfortable with, and only share a screen you are happy for them to see.",
      ],
    },
    {
      h: "AI processing",
      body: [
        "To deliver a feature (such as your daily briefing, weekly and monthly reviews, asking your own notes, or the study assistant drafting a plan), the minimum content necessary is processed by our AI providers, Google (Gemini) and Anthropic (Claude), solely to return your result.",
        "For the study assistant, that can include the subject, chapters and uploaded notes relevant to your question. Nothing is applied to your plan until you review and confirm it.",
        "We count how many AI tokens your account uses each day so we can apply fair-use limits. That is a count, not a copy of what you asked.",
        "This content is not used by us or by those providers to train their models.",
      ],
    },
    {
      h: "Connected apps",
      body: [
        "Connecting an app is always your choice, and we request only the access the feature needs: Google Calendar (to sync your events), Notion (to import the pages you choose) and Spotify (to see your playlists for focus sessions).",
        "Access tokens are encrypted before they are stored, and you can disconnect at any time from Settings, which revokes our access immediately.",
      ],
    },
    {
      h: "Processors we rely on",
      body: [
        "We use a small number of trusted service providers to run Cardinal: Supabase (database, authentication and storage), Vercel (application hosting), Google Gemini and Anthropic Claude (AI features), LiveKit (real-time voice and video) and Brevo (email). Each processes data only as needed to provide their service to us.",
      ],
    },
    {
      h: "Where your data is stored",
      body: [
        "Your data is stored with Supabase and is encrypted in transit. Some of the processors above operate outside India; by using Cardinal you consent to your data being processed in those locations under appropriate safeguards.",
      ],
    },
    {
      h: "Retention",
      body: [
        "Constellation channel messages are kept for 90 days. Voice and video are never recorded, so there is nothing to retain once a room ends.",
        "Everything else is kept until you delete it or close your account, after which it is removed within a reasonable period save where the law requires us to retain it. Note that messages you posted in a shared server stay visible to that server for the 90-day window.",
      ],
    },
    {
      h: "Your rights",
      body: [
        "Under the DPDP Act you can access, correct, and erase your personal data, withdraw consent, and nominate another person to exercise your rights. You can export or delete your data from within the app or by contacting us.",
        `If you have a grievance, contact our Grievance Officer: ${LEGAL.grievanceOfficer}, at ${LEGAL.email}. We aim to respond within the timelines required by law.`,
      ],
    },
    {
      h: "Children",
      body: [`${LEGAL.product} is intended for people aged 16 and over. We do not knowingly collect data from children below that age.`],
    },
    {
      h: "Cookies",
      body: ["We use only the essential cookies needed to keep you signed in and the service working. We do not use third-party advertising or tracking cookies."],
    },
    {
      h: "Changes",
      body: ["We will post any updates to this policy on this page and refresh the date above. Material changes will be highlighted in the app."],
    },
  ],
};

export const TERMS: LegalDoc = {
  title: "Terms & Conditions",
  sections: [
    { h: "Agreement", body: [`By creating an account or using ${LEGAL.product}, you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use the service.`] },
    { h: "Eligibility", body: ["You must be at least 16 years old to use Cardinal OS. By using it, you confirm that you meet this requirement."] },
    { h: "Beta and availability", body: ['Cardinal is currently in beta and is provided "as is" and "as available". Features may change, pause, or be removed as we learn from real use, and we do not guarantee uninterrupted or error-free operation.'] },
    { h: "Pricing", body: ["Cardinal is free for everyone during the testing period. If pricing is introduced later, it will be transparent, communicated in advance, and never a dark pattern."] },
    { h: "Your account", body: ["You are responsible for keeping your login secure and for activity under your account. Tell us promptly if you suspect unauthorised use."] },
    { h: "Acceptable use", body: ["Do not misuse the service: no illegal, harmful, infringing or abusive activity; no scraping, reverse engineering, or attempts to break security."] },
    {
      h: "Constellations and live rooms",
      body: [
        "Constellations are shared spaces, and public servers can be joined by people you do not know. Treat everyone in them with respect.",
        "In any channel or voice/video room, do not harass, bully, threaten or impersonate anyone; do not share sexual, hateful, violent or illegal content; and do not share other people's personal information.",
        "Do not record, photograph or re-stream another member's camera, microphone or screen share without their clear permission.",
        "If you create a server you are responsible for it, including what you make public and who you invite. We may remove content, servers or accounts, or suspend access, where they breach these Terms or harm other users.",
        "Anything you post or say in a shared server is visible to its members. Do not put anything there you would not want them to have.",
      ],
    },
    { h: "Your content", body: ["You own the content you create. You grant GraviQ Studios a limited, worldwide licence to store, process and display it solely to provide the service to you. You are responsible for the content you add and for having the right to add it.", "Content you post in a Constellation is additionally shared with that server's members, and in a public server with anyone who joins it."] },
    { h: "Connected services", body: ["Your use of the Google Calendar, Notion and Spotify integrations (and any future integrations) is also subject to those companies' own terms and policies."] },
    { h: "AI features and no professional advice", body: ["Cardinal's AI features can be wrong or incomplete. They support your own judgement and are not medical, financial, legal, or other professional advice. The Life Score is informational only.", "AI features carry fair-use limits, including a daily allowance, so the service stays available to everyone. We may change those limits."] },
    { h: "Intellectual property", body: [`Cardinal OS, the Needle mark, and all related branding and software belong to ${LEGAL.company}. These Terms do not grant you any rights to them beyond using the service.`] },
    { h: "Disclaimers and liability", body: [`To the maximum extent permitted by law, ${LEGAL.company} is not liable for indirect, incidental, or consequential damages, or for loss of data or profits, arising from your use of the service.`] },
    { h: "Termination", body: ["You may stop using Cardinal and delete your account at any time. We may suspend or terminate accounts that breach these Terms or harm the service or other users."] },
    { h: "Governing law", body: [`These Terms are governed by the laws of ${LEGAL.jurisdiction}, and the courts of ${LEGAL.jurisdiction} have exclusive jurisdiction. Questions: ${LEGAL.email}.`] },
    { h: "Changes to these terms", body: ["We may update these Terms; the latest version will always live on this page with the date above. Continued use after a change means you accept it."] },
  ],
};
