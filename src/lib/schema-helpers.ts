// Small helpers for emitting schema.org JSON-LD shapes that show up on
// more than one page. Things that are page-specific (CreativeWork, Event)
// stay inline; things repeated verbatim across pages live here.

import { PERSON_ID, PERSON_NAME } from './site';

/**
 * Reference to the canonical Person entity. Use this in CreativeWork.creator,
 * Organization.founder, etc. instead of a fresh inline `{ @type: Person, … }`
 * object so Google links the relationship to the canonical Person record.
 */
export const PERSON_REF = {
	'@id': PERSON_ID,
	'@type': 'Person',
	name: PERSON_NAME
} as const;

/**
 * Build a VideoObject for a Vimeo embed. The work / consultancy that owns
 * the video is referenced via @id so Google links the video to the
 * canonical CreativeWork.
 */
export function buildVideoObject(
	v: { id: string; title: string },
	parent: { id: string; name: string; url: string },
	opts: { uploadDate?: string | null; description?: string }
): Record<string, unknown> {
	return {
		'@context': 'https://schema.org',
		'@type': 'VideoObject',
		name: v.title || parent.name,
		description: opts.description || v.title || '',
		contentUrl: `https://vimeo.com/${v.id}`,
		embedUrl: `https://player.vimeo.com/video/${v.id}`,
		thumbnailUrl: `https://vumbnail.com/${v.id}.jpg`,
		...(opts.uploadDate ? { uploadDate: opts.uploadDate } : {}),
		isPartOf: {
			'@type': 'CreativeWork',
			'@id': parent.id,
			name: parent.name,
			url: parent.url
		}
	};
}
