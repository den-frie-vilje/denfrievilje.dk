import type { PersonMeta } from './content';

/**
 * Build a schema.org Person JSON-LD payload from the `person:` frontmatter
 * block in src/content/about/index.md. The frontmatter is the single source
 * of truth — both the homepage and the /about page emit the result of this
 * builder, sharing an `@id` so Google understands they describe the same
 * entity.
 *
 * Past employers and past affiliations are encoded with the schema.org
 * `Role` / `OrganizationRole` wrapper so `endDate` can be expressed without
 * losing the relationship. Current entries stay flat.
 */

interface BuildOpts {
	/** Canonical Person URL — used for `@id`, `url`, and `image` resolution.
	 *  Always the artist apex (https://ole.kristensen.name) regardless of
	 *  which build emits this JSON-LD. */
	personUrl: string;
	/** Canonical Organization URL — entries in `worksFor` whose url matches
	 *  this base get an `@id` reference so the Person-→Organization edge
	 *  uses the canonical entity identifier. */
	organizationUrl: string;
	/** Canonical Organization @id (precomputed for cross-references). */
	organizationId: string;
	name: string;
	sameAs?: string[];
	address?: Record<string, unknown>;
}

type Org = Record<string, unknown>;

function org(name: string, url?: string, idOverride?: string): Org {
	const out: Org = { '@type': 'Organization', name };
	if (idOverride) out['@id'] = idOverride;
	if (url) out.url = url;
	return out;
}

function eduOrg(e: NonNullable<PersonMeta['alumniOf']>[number]): Org {
	const out: Org = { '@type': 'EducationalOrganization', name: e.name };
	if (e.department) out.department = e.department;
	return out;
}

export function buildPersonJsonLd(
	meta: PersonMeta | undefined | null,
	opts: BuildOpts
): Record<string, unknown> | null {
	if (!meta) return null;

	// Treat any Org URL that matches the canonical Organization base as the
	// Den Frie Vilje entity, and emit it with the canonical `@id` so the
	// Person→Organization edge consolidates across apexes.
	const orgWithId = (name: string, url?: string): Org => {
		if (url && url.startsWith(opts.organizationUrl)) {
			return org(name, url, opts.organizationId);
		}
		return org(name, url);
	};

	const out: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Person',
		'@id': `${opts.personUrl}/#person`,
		name: opts.name,
		url: opts.personUrl
	};

	if (meta.givenName) out.givenName = meta.givenName;
	if (meta.familyName) out.familyName = meta.familyName;
	if (meta.birthYear) out.birthDate = String(meta.birthYear);
	if (meta.birthPlace) out.birthPlace = { '@type': 'Place', name: meta.birthPlace };
	if (meta.nationality) out.nationality = meta.nationality;
	if (meta.image) out.image = `${opts.personUrl}${meta.image}`;
	if (meta.jobTitle?.length) out.jobTitle = meta.jobTitle;
	if (opts.address) out.address = opts.address;
	if (opts.sameAs?.length) out.sameAs = opts.sameAs;

	const works: Org[] = [];
	for (const w of meta.worksFor ?? []) {
		// Current employer — flat Organization. The orgWithId helper adds the
		// canonical @id when the url matches the Organization apex.
		works.push(orgWithId(w.name, w.url));
	}
	for (const p of meta.pastEmployer ?? []) {
		// Past employer — wrap in OrganizationRole so the endDate is
		// expressible without dropping the relationship.
		const role: Record<string, unknown> = {
			'@type': 'OrganizationRole',
			worksFor: orgWithId(p.name, p.url)
		};
		if (p.role) role.roleName = p.role;
		if (p.from) role.startDate = String(p.from);
		if (p.to) role.endDate = String(p.to);
		works.push(role);
	}
	if (works.length) out.worksFor = works;

	const affs: Org[] = [];
	for (const a of meta.affiliation ?? []) {
		affs.push(orgWithId(a.name, a.url));
	}
	for (const a of meta.pastAffiliation ?? []) {
		const role: Record<string, unknown> = {
			'@type': 'Role',
			affiliation: orgWithId(a.name, a.url)
		};
		if (a.role) role.roleName = a.role;
		if (a.from) role.startDate = String(a.from);
		if (a.to) role.endDate = String(a.to);
		affs.push(role);
	}
	if (affs.length) out.affiliation = affs;

	if (meta.memberOf?.length) out.memberOf = meta.memberOf.map((m) => orgWithId(m.name, m.url));
	if (meta.alumniOf?.length) out.alumniOf = meta.alumniOf.map(eduOrg);

	if (meta.awards?.length) {
		out.award = meta.awards.map((a) => {
			const parts = [a.title];
			const tail: string[] = [];
			if (a.organization) tail.push(a.organization);
			if (a.year) tail.push(String(a.year));
			if (a.forWork) tail.push(`for ${a.forWork}`);
			if (tail.length) parts.push(`(${tail.join(', ')})`);
			return parts.join(' ');
		});
	}

	if (meta.knowsAbout?.length) out.knowsAbout = meta.knowsAbout;
	if (meta.knowsLanguage?.length) out.knowsLanguage = meta.knowsLanguage;

	return out;
}
