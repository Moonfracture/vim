// Admission-score ("балообразуване") schemes shared by the calculator and the
// per-university card hint. Each university/specialty has its own official
// formula, so these are orientational presets grouped by field of study.
export const SCHEMES = [
  {
    id: 'standard',
    label: 'Стандартна (2 матури + 2 оценки)',
    formula: '2×БЕЛ + 2×матура + 2 оценки',
    rows: [
      { label: 'ДЗИ Български език и литература', coef: 2 },
      { label: 'Втора матура (по профил)', coef: 2 },
      { label: 'Оценка от диплома', coef: 1 },
      { label: 'Оценка от диплома', coef: 1 },
    ],
  },
  {
    id: 'tech',
    label: 'Технически / Информатика',
    formula: '3×Математика + БЕЛ + 2 оценки',
    rows: [
      { label: 'Изпит/ДЗИ Математика', coef: 3 },
      { label: 'ДЗИ Български език и литература', coef: 1 },
      { label: 'Оценка от диплома — Математика', coef: 1 },
      { label: 'Оценка от диплома — Информатика/Физика', coef: 1 },
    ],
  },
  {
    id: 'med',
    label: 'Медицина',
    formula: '3×Биология + 3×Химия + 2 оценки',
    rows: [
      { label: 'Изпит Биология', coef: 3 },
      { label: 'Изпит Химия', coef: 3 },
      { label: 'Оценка от диплома — Биология', coef: 1 },
      { label: 'Оценка от диплома — Химия', coef: 1 },
    ],
  },
];

export const SCHEME_BY_ID = Object.fromEntries(SCHEMES.map((s) => [s.id, s]));

// map a field of study to the scheme a Bulgarian applicant would typically use
const FIELD_SCHEME = {
  'Компютърни науки': 'tech',
  'Инженерство': 'tech',
  'Природни науки': 'tech',
  'Медицина': 'med',
};

export function schemeForField(field) {
  return SCHEME_BY_ID[FIELD_SCHEME[field]] || SCHEME_BY_ID.standard;
}
