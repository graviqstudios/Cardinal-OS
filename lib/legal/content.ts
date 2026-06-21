/**
 * Legal content for Cardinal OS, shared by the /privacy and /terms pages and the
 * landing footer. DRAFT — written to a sensible standard for India's DPDP Act,
 * 2023, but should be reviewed by a lawyer before public launch.
 */

export const LEGAL = {
  company: "GraviQ Studios",
  product: "Cardinal OS",
  email: "graviqstudios@gmail.com",
  grievanceOfficer: "P. S. Satchith, GraviQ Studios",
  jurisdiction: "India",
  updated: "21 June 2026",
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
        "The content you create inside Cardinal: habits, tasks, projects, goals, journal entries, body metrics, focus sessions, constellation messages and similar.",
        "Basic, non-identifying usage and device information that helps us keep the product reliable.",
        "If you connect Google Calendar, the calendar events needed to sync, accessed only while connected.",
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
      h: "AI processing",
      body: [
        "To deliver a feature (such as your daily briefing, weekly and monthly reviews, or asking your own notes), the minimum content necessary is processed by our AI providers, Google (Gemini) and Anthropic (Claude), solely to return your result.",
        "This content is not used by us or by those providers to train their models.",
      ],
    },
    {
      h: "Connected apps",
      body: [
        "When you connect Google Calendar, we access only what the feature needs to sync your events. Access tokens are encrypted before they are stored, and you can disconnect at any time, which revokes our access immediately.",
      ],
    },
    {
      h: "Processors we rely on",
      body: [
        "We use a small number of trusted service providers to run Cardinal: Supabase (database, authentication and storage), Vercel (application hosting), Google Gemini and Anthropic Claude (AI features), and Brevo (email). Each processes data only as needed to provide their service to us.",
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
        "Constellation chat history is kept for 90 days. Everything else is kept until you delete it or close your account, after which it is removed within a reasonable period save where the law requires us to retain it.",
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
    { h: "Acceptable use", body: ["Do not misuse the service: no illegal, harmful, infringing or abusive activity; no scraping, reverse engineering, or attempts to break security; and treat the members of your constellation with respect."] },
    { h: "Your content", body: ["You own the content you create. You grant GraviQ Studios a limited, worldwide licence to store, process and display it solely to provide the service to you. You are responsible for the content you add and for having the right to add it."] },
    { h: "Connected services", body: ["Your use of the Google Calendar integration (and any future integrations) is also subject to those companies' own terms and policies."] },
    { h: "AI features and no professional advice", body: ["Cardinal's AI features can be wrong or incomplete. They support your own judgement and are not medical, financial, legal, or other professional advice. The Life Score is informational only."] },
    { h: "Intellectual property", body: [`Cardinal OS, the Needle mark, and all related branding and software belong to ${LEGAL.company}. These Terms do not grant you any rights to them beyond using the service.`] },
    { h: "Disclaimers and liability", body: [`To the maximum extent permitted by law, ${LEGAL.company} is not liable for indirect, incidental, or consequential damages, or for loss of data or profits, arising from your use of the service.`] },
    { h: "Termination", body: ["You may stop using Cardinal and delete your account at any time. We may suspend or terminate accounts that breach these Terms or harm the service or other users."] },
    { h: "Governing law", body: [`These Terms are governed by the laws of ${LEGAL.jurisdiction}, and the courts of ${LEGAL.jurisdiction} have exclusive jurisdiction. Questions: ${LEGAL.email}.`] },
    { h: "Changes to these terms", body: ["We may update these Terms; the latest version will always live on this page with the date above. Continued use after a change means you accept it."] },
  ],
};
