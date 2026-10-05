import courses from "@/data/courses.json";
import durations from "@/data/courseDurations.json";
import requirements from "@/data/programRequirements.json";
import type { TableData } from "@/components/ui/table";
import { DISCORD_INVITE } from "@/lib/links";

/**
 * The CS guide's prose as plain text, one entry per page anchor, for the
 * guide chat. Mirrors app/(public)/cs-guide/page.tsx: when a section there
 * changes, change it here too. Tables come straight from data/*.json.
 */
export type GuideSection = { id: string; title: string; text: string };

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "introduction",
    title: "Brock CS Student Guide",
    text: "An open-source guide for Computer Science students at Brock University, maintained by the Computer Science Club. It covers course registration, program requirements, resources and opportunities. Everyone is welcome to contribute.",
  },
  {
    id: "registration",
    title: "Course Registration",
    text: "As a first-year student, one of your first tasks is to register for your courses. Start by checking the course requirements in the undergraduate calendar (https://calendar.brocku.ca/). Familiarise yourself with the page, including program notes and hyperlinks.",
  },
  {
    id: "course-codes",
    title: "Course Codes",
    text: "A course code like COSC 1P02 breaks down as: COSC is the department offering the course; 1 is the year the course is intended for; P is the number of credits you get for completing the course; 02 is the department's code for the specific course.",
  },
  {
    id: "common-course-types",
    title: "Common Course Types",
    text: "F = full-credit course: runs through both Fall and Winter (D1 duration); some intensive thesis or project courses are weighted as 1.0 credits. P/Q = half-credit course: most Brock courses are 0.5 credits and run one 12-week semester; Q is the same as P but used for cross-listed courses. C = co-op credit course: only required for co-op; the credit counts for OSAP but not toward graduation. N = no-credit course: only required for co-op. Every major program requires 20.0 credits to graduate with an Honours degree.",
  },
  {
    id: "course-duration",
    title: "Course Durations",
    text: "Courses are offered at various times of year; the duration code tells you which period a course runs in.",
  },
  {
    id: "course-sections",
    title: "Sections",
    text: "Large courses are divided into sections for lectures, seminars, labs or marking. Sections may have different instructors but cover the same material. To be in the same class as a friend, enrol in the same section.",
  },
  {
    id: "context-credits",
    title: "Context Credits",
    text: "All students must include one credit (or two half-credits) from the lists of Humanities, Social Sciences and Sciences context courses (https://brocku.ca/webcal/current/undergrad/areg.html#sec29). For Computer Science students the Sciences context credit is covered by program requirements, so you mostly need Humanities and Social Sciences. Students in four-year Honours professional programs must finish context requirements by the end of third year; all other students must complete all three within their first 10 credits. Cross-reference the undergraduate timetable (https://brocku.ca/guides-and-timetables/timetables/?session=fw&type=ug&level=all) because listed courses are not always offered. The Course Planning Tool in the my.brocku.ca portal shows which courses satisfy each context credit and whether they have space, are waitlisted or full. Tip: read the course description and pick something you are interested in; spending an extra 15 minutes choosing can change your whole semester.",
  },
  {
    id: "bachelor",
    title: "Credit Requirements for Bachelor of Science, Computer Science",
    text: "Credit limits by course level are in the table below. These requirements are subject to change and may differ for specialized majors; use them together with the course calendar (https://calendar.brocku.ca/).",
  },
  {
    id: "minor-computing",
    title: "Minor in Applied Computing",
    text: "The only minor the CS Department offers. Students in other disciplines can earn it by completing four APCO and/or COSC credits with a minimum 60 percent overall average. It is not available to Computer Science students of any kind. APCO classes are only available to COSC students when cross-listed as COSC classes, e.g. APCO 2P89 Internet Technologies is also COSC 2P89.",
  },
  {
    id: "double-major",
    title: "Double Major",
    text: "A double major can give more direction to your non-core courses, may let you bypass courses such as MATH 1P06 and COSC 4P61, and adds qualifications to your resume. A popular pathway is Computing and Business (https://brocku.ca/programs/undergraduate/computing-and-business/), but Computer Science pairs with most programs in sciences, humanities, social sciences and arts. Double major info: https://calendar.brocku.ca/preview_program.php?catoid=23&poid=10350",
  },
  {
    id: "courses",
    title: "Courses",
    text: "The table below lists required COSC courses for the BSc major in Computer Science, their prerequisites and the terms they are generally offered. It is not exhaustive (courses not offered in two years are left out); always check the Brock timetable (https://brocku.ca/guides-and-timetables/timetables/?session=fw&type=ug&level=all) and the course calendar (https://brocku.ca/webcal/current/undergrad/cosc.html). The CS department website is https://brocku.ca/mathematics-science/computer-science/.",
  },
  {
    id: "resources",
    title: "Resources",
    text: `Computer Science Club: follow on Instagram (https://www.instagram.com/brockcsc/) and join the Discord (${DISCORD_INVITE}) to stay up to date. Computer Science Help Desk: one-on-one help with CS course questions in MCJ 328; schedule at http://brocku.ca/mathematics-science/computer-science/helpdesk_schedule/. Learning Services (https://brocku.ca/student-life-success/learning-services/) supports academic success. Professors: attend office hours and ask questions. Student goodies: Office 365 with 5TB OneDrive, GitHub Student Developer Pack, LinkedIn Learning, 1Password trial, Amazon Prime Student, Figma education, Spotify Student, and local student discounts such as Rogers Wireless.`,
  },
  {
    id: "opportunities",
    title: "Opportunities",
    text: "Experience BU (https://experiencebu.brocku.ca/) lists events, volunteering and workshops. CareerZone (https://careerzone.brocku.ca/myAccount/dashboard.htm) has on-campus jobs. Most job postings for next year appear in January/February; check Workday (https://brocku.wd3.myworkdayjobs.com/brocku_careers) for TA roles and other listings.",
  },
];

const cellText = (value: TableData["rows"][number][string]) =>
  typeof value === "object" ? value.label : String(value);

const tableText = (data: TableData) =>
  [
    data.columns.map((c) => c.label).join(" | "),
    ...data.rows.map((row) =>
      data.columns.map((c) => cellText(row[c.key] ?? "")).join(" | "),
    ),
  ].join("\n");

const TABLES: Record<string, TableData> = {
  "course-duration": durations as TableData,
  bachelor: requirements as TableData,
  courses: courses as TableData,
};

/** One section as text, with its table when the page shows one. */
const sectionText = (section: GuideSection) => {
  const table = TABLES[section.id];
  return table ? `${section.text}\n\n${tableText(table)}` : section.text;
};

/** The whole guide as one document; stable across requests so it caches. */
export const GUIDE_TEXT = GUIDE_SECTIONS.map(
  (s) => `## ${s.title} (#${s.id})\n${sectionText(s)}`,
).join("\n\n");
