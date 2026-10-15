const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** "2026-11-14" → "14 novembre 2026" (dates affichées dans les emails). */
export const dateFr = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MOIS[Number(m) - 1]} ${y}`;
};
