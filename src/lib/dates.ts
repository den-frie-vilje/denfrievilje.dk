// Shared date parsing for content frontmatter values like "March 2012",
// "Mar 2012", "2018 — ongoing", or just "2014". Used by VideoObject
// uploadDate and Event startDate on detail pages and by the Atom feed.
//
// Returns ISO YYYY-MM-DD strings. Defaults missing month to 01. Returns
// null when no four-digit year can be extracted at all.

const MONTH_TO_NUM: Record<string, number> = {
	jan: 1,
	feb: 2,
	mar: 3,
	apr: 4,
	may: 5,
	jun: 6,
	jul: 7,
	aug: 8,
	sep: 9,
	oct: 10,
	nov: 11,
	dec: 12,
	january: 1,
	february: 2,
	march: 3,
	april: 4,
	june: 6,
	july: 7,
	august: 8,
	september: 9,
	october: 10,
	november: 11,
	december: 12
};

export function isoDate(input?: string): string | null {
	if (!input) return null;
	const yearMatch = input.match(/(\d{4})/);
	if (!yearMatch) return null;
	const year = yearMatch[1];
	const monthMatch = input.toLowerCase().match(/[a-z]{3,}/);
	const month = monthMatch ? MONTH_TO_NUM[monthMatch[0]] : null;
	const mm = month ? String(month).padStart(2, '0') : '01';
	return `${year}-${mm}-01`;
}
