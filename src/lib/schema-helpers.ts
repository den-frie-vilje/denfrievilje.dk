// Small helpers for emitting schema.org JSON-LD shapes that show up on
// more than one page. Things that are page-specific stay inline; shapes
// repeated verbatim live here.

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
 * Reference to a CreativeWork by its canonical URL — used as ListItem.item
 * inside ItemList, and in nested workPerformed / isPartOf relationships
 * elsewhere. The @id ties the reference to the work's own JSON-LD on its
 * detail page so Google consolidates the entity.
 */
export function creativeWorkRef(opts: { id?: string; name: string; url: string }) {
	const out: Record<string, unknown> = { '@type': 'CreativeWork', name: opts.name, url: opts.url };
	if (opts.id) out['@id'] = opts.id;
	return out;
}

/**
 * Build a BreadcrumbList from an ordered list of crumbs. Each crumb's
 * `position` is its 1-based index. Used on detail and listing pages.
 */
export function buildBreadcrumb(crumbs: Array<{ name: string; url: string }>) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: crumbs.map((c, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: c.name,
			item: c.url
		}))
	};
}

/**
 * Build an ItemList of CreativeWorks (works / consultancies). Each item is
 * referenced by its canonical URL via @id. Pages can either embed the
 * returned object directly (homepage) or wrap it inside a CollectionPage
 * (listing pages) — both are valid.
 */
export function buildCreativeWorkItemList(
	items: Array<{ slug: string; name: string }>,
	opts: { name: string; baseUrl: string; descending?: boolean }
) {
	const list: Record<string, unknown> = {
		'@type': 'ItemList',
		name: opts.name,
		numberOfItems: items.length,
		itemListElement: items.map((it, i) => {
			const url = `${opts.baseUrl}/${it.slug}/`;
			return {
				'@type': 'ListItem',
				position: i + 1,
				item: creativeWorkRef({ id: url, name: it.name, url })
			};
		})
	};
	if (opts.descending) list.itemListOrder = 'https://schema.org/ItemListOrderDescending';
	return list;
}

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
