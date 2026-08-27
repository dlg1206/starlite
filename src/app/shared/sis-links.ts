export const SIS_CRSEAVAIL_BASE_URL = 'https://www.sis.hawaii.edu:9350/crseavail';

/** Link to the official UH course availability page for a subject in a given term/campus. */
export function sisCrseavailUrl(termCode: string, campusCode: string, subjectCode: string): string {
  return `${SIS_CRSEAVAIL_BASE_URL}/${encodeURIComponent(termCode)}/${encodeURIComponent(campusCode)}/${encodeURIComponent(subjectCode)}`;
}
