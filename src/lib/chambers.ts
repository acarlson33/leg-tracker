export const chamberStateOptions = [
  "Recess",
  "Adjournment",
  "No Active Bill",
  "Opening Summation",
  "Question Answer Period",
  "Amendment Period",
  "Pro/Con Debate",
  "Closing Summation",
  "Voting",
] as const;

export type ChamberState = string;

export type Chamber = {
  slug: string;
  name: string;
  body: "House" | "Senate";
  currentState: ChamberState;
  currentBill: string | null;
  docket: Array<{
    id: string;
    title: string;
    author: string;
    body: string;
    status: ChamberState;
  }>;
};

export const chambers: Chamber[] = [
  {
    slug: "house-main",
    name: "House Chamber",
    body: "House",
    currentState: "Pro/Con Debate",
    currentBill: "HB 1024 - School Safety Program Expansion",
    docket: [
      {
        id: "HB-1024",
        title: "School Safety Program Expansion",
        author: "A. Rivera",
        body: "House",
        status: "Pro/Con Debate",
      },
      {
        id: "SB-318",
        title: "Inter-Body Ethics Transparency Act",
        author: "L. Bennett",
        body: "Senate",
        status: "Opening Summation",
      },
    ],
  },
  {
    slug: "senate-main",
    name: "Senate Chamber",
    body: "Senate",
    currentState: "Question Answer Period",
    currentBill: "SB 211 - Student Mental Health Access Act",
    docket: [
      {
        id: "SB-211",
        title: "Student Mental Health Access Act",
        author: "J. Flores",
        body: "Senate",
        status: "Question Answer Period",
      },
      {
        id: "HB-77",
        title: "Youth Civic Internship Grant",
        author: "K. Hall",
        body: "House",
        status: "No Active Bill",
      },
    ],
  },
];

export function getChamberBySlug(slug: string) {
  return chambers.find((chamber) => chamber.slug === slug);
}
