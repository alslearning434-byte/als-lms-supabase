const SUBJECT_MAP: { pattern: RegExp; icon: string; color: string; bg: string }[] = [
  { pattern: /filipino|wikang|tagalog|pagsulat|komunikasyon/, icon: "fa-comment-dots", color: "text-red-600", bg: "bg-red-100" },
  { pattern: /english|grammar|writing|reading|communication|oral|research/, icon: "fa-language", color: "text-blue-600", bg: "bg-blue-100" },
  { pattern: /math|algebra|geometry|arithmetic|calculus|pre-calc|basic calc|statistics|business math/, icon: "fa-square-root-variable", color: "text-emerald-600", bg: "bg-emerald-100" },
  { pattern: /science|biology|chemistry|physics|earth|life science|physical science/, icon: "fa-flask-vial", color: "text-violet-600", bg: "bg-violet-100" },
  { pattern: /history|heograpiya|araling|panlipunan|politics|governance|social science|society|culture/, icon: "fa-landmark-dome", color: "text-amber-600", bg: "bg-amber-100" },
  { pattern: /technology|computer|tle|ict|livelihood|empowerment|media and information|disaster|safety/, icon: "fa-microchip", color: "text-cyan-600", bg: "bg-cyan-100" },
  { pattern: /music|arts|mapeh|mape|contemporary|creative nonfiction|creative writing|humanit/, icon: "fa-palette", color: "text-fuchsia-600", bg: "bg-fuchsia-100" },
  { pattern: /physical|pe |sports|health|cookery|tailoring|welding|automotive|home econ|industrial/, icon: "fa-dumbbell", color: "text-orange-600", bg: "bg-orange-100" },
  { pattern: /value|moral|character|citizenship|business ethics|personal dev/, icon: "fa-heart-pulse", color: "text-rose-600", bg: "bg-rose-100" },
  { pattern: /business|accountancy|management|abm|entrepreneur|organization/, icon: "fa-chart-line", color: "text-indigo-600", bg: "bg-indigo-100" },
  { pattern: /environment|agriculture|marine|ecology|nature/, icon: "fa-leaf", color: "text-lime-600", bg: "bg-lime-100" },
  { pattern: /philosophy|logic|ethics|psychology|sociology/, icon: "fa-brain", color: "text-teal-600", bg: "bg-teal-100" },
  { pattern: /language|spanish|japanese|korean|chinese|mandarin|french|german/, icon: "fa-earth-americas", color: "text-sky-600", bg: "bg-sky-100" },
  { pattern: /architecture|design|drawing|engineering/, icon: "fa-drafting-compass", color: "text-stone-600", bg: "bg-stone-100" },
]

export function getSubjectIcon(subject: string): { icon: string; color: string; bg: string } {
  const s = subject.toLowerCase()
  for (const entry of SUBJECT_MAP) {
    if (entry.pattern.test(s)) return { icon: entry.icon, color: entry.color, bg: entry.bg }
  }
  return { icon: "fa-book-open", color: "text-navy-600", bg: "bg-navy-100" }
}
