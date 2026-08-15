import { and, eq, or, desc, lt, sql, ilike, inArray, isNotNull, count } from 'drizzle-orm';
import { db, publicEntries, publicTags, users } from '$lib/db/server/index.ts';

export interface FeedItem {
	id: string;
	slug: string;
	title: string;
	excerpt: string;
	entryDate: string;
	mood: number | null;
	penName: string | null;
	terverifikasi: boolean;
	isAnonymous: boolean;
	publishedAt: string;
	viewCount: number;
	reactionCount: number;
	tags: string[];
	gambar: string | null;
	jumlahGambar: number;
}

const RE_GAMBAR_MD = /!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g;
const RE_GAMBAR_HTML = /<img\b[^>]*\bsrc="([^"]+)"/gi;

export function gambarDariBadan(body: string): { gambar: string | null; jumlah: number } {
	const src: string[] = [];
	for (const re of [RE_GAMBAR_MD, RE_GAMBAR_HTML]) {
		re.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(body ?? '')) !== null) if (m[1]) src.push(m[1]);
	}
	const gambar = src.find((u) => /^(https?:\/\/|\/(?!\/))/i.test(u)) ?? null;
	return { gambar, jumlah: src.length };
}

export type Urutan = 'terbaru' | 'populer';

export interface FeedQuery {
	cursor?: string | undefined;
	sort?: Urutan;
	tag?: string | undefined;
	penName?: string | undefined;
	/** Kata kunci; dicocokkan ke judul dan isi tulisan. */
	q?: string | undefined;
	/** 1 sampai 5, sesuai warna paku pin. */
	mood?: number | undefined;
	gambar?: boolean | undefined;
	limit?: number;
	/** Halaman bernomor (mulai 1). Kalau diisi, kursor diabaikan. */
	hal?: number | undefined;
}

/** % dan _ punya arti khusus di ILIKE, jadi harus dinetralkan dulu. */
export function polaCari(teks: string): string {
	return `%${teks.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Kursor untuk "terbaru" cukup waktu terbit, tapi untuk "populer" urutannya
 * jumlah dilihat — memakai waktu terbit di sana melompati tulisan.
 */
export function bacaKursor(kursor: string, sort: Urutan) {
	if (sort === 'populer') {
		const [n, id] = kursor.split('|');
		// Number('') itu 0, jadi bagian angkanya harus diperiksa sendiri.
		if (!n || !id || !/^\d+$/.test(n)) return null;
		return sql`(${publicEntries.viewCount}, ${publicEntries.id}) < (${Number(n)}, ${id})`;
	}
	const waktu = new Date(kursor);
	return Number.isNaN(waktu.getTime()) ? null : lt(publicEntries.publishedAt, waktu);
}

/** Satu tempat baca parameter feed, dipakai halaman maupun endpoint API. */
export function bacaParamFeed(url: URL): FeedQuery & { sort: Urutan; q: string } {
	const p = url.searchParams;
	const moodAngka = Number(p.get('mood'));
	return {
		sort: p.get('sort') === 'populer' ? 'populer' : 'terbaru',
		tag: p.get('tag') ?? undefined,
		penName: p.get('penulis') ?? undefined,
		q: (p.get('q') ?? '').trim().slice(0, 120),
		mood:
			Number.isInteger(moodAngka) && moodAngka >= 1 && moodAngka <= 5 ? moodAngka : undefined,
		gambar: p.get('gambar') === '1' ? true : undefined,
		cursor: p.get('cursor') ?? undefined,
		hal: (() => {
			const n = Number(p.get('hal'));
			return Number.isInteger(n) && n >= 1 && n <= 500 ? n : undefined;
		})()
	};
}

export interface HasilFeed {
	items: FeedItem[];
	nextCursor: string | null;
	total: number;
	hal: number;
	totalHal: number;
}

export async function loadFeed(q: FeedQuery): Promise<HasilFeed> {
	const limit = Math.min(q.limit ?? 24, 50);
	const sort: Urutan = q.sort === 'populer' ? 'populer' : 'terbaru';
	const hal = q.hal ?? 1;
	const pakaiHalaman = q.hal !== undefined;
	const filters = [eq(publicEntries.visibility, 'public'), eq(publicEntries.moderationState, 'ok')];

	if (q.cursor && !pakaiHalaman) {
		const batas = bacaKursor(q.cursor, sort);
		if (batas) filters.push(batas);
	}
	if (q.penName) filters.push(eq(publicEntries.penName, q.penName));
	if (q.mood) filters.push(eq(publicEntries.mood, q.mood));
	if (q.gambar) {
		filters.push(
			sql`(${publicEntries.bodyMd} LIKE '%![%' OR ${publicEntries.bodyMd} ILIKE '%<img%')`
		);
	}

	const kata = q.q?.trim();
	if (kata && kata.length >= 2) {
		const pola = polaCari(kata);
		const cocok = or(ilike(publicEntries.title, pola), ilike(publicEntries.bodyMd, pola));
		if (cocok) filters.push(cocok);
	}

	if (q.tag) {
		const tagged = await db
			.select({ id: publicTags.publicEntryId })
			.from(publicTags)
			.where(eq(publicTags.tag, q.tag.toLowerCase()))
			.limit(500);
		const ids = tagged.map((t) => t.id);
		if (ids.length === 0) return { items: [], nextCursor: null, total: 0, hal: 1, totalHal: 1 };
		filters.push(inArray(publicEntries.id, ids));
	}

	const [{ n: total }] = (await db
		.select({ n: count() })
		.from(publicEntries)
		.where(and(...filters))) as [{ n: number }];
	const totalHal = Math.max(1, Math.ceil(Number(total) / limit));

	const rows = await db
		.select()
		.from(publicEntries)
		.where(and(...filters))
		.orderBy(
			...(sort === 'populer'
				? [desc(publicEntries.viewCount), desc(publicEntries.id)]
				: [desc(publicEntries.publishedAt)])
		)
		.limit(limit + 1)
		.offset(pakaiHalaman ? (hal - 1) * limit : 0);

	const page = rows.slice(0, limit);
	const tagRows = page.length
		? await db
				.select()
				.from(publicTags)
				.where(
					inArray(
						publicTags.publicEntryId,
						page.map((r) => r.id)
					)
				)
		: [];
	// Centang biru ikut penulis, bukan tulisan; ambil sekali untuk seluruh halaman.
	const terverifikasi = await penulisTerverifikasi(page.map((r) => r.userId));

	const byEntry = new Map<string, string[]>();
	for (const t of tagRows) {
		const list = byEntry.get(t.publicEntryId) ?? [];
		list.push(t.tag);
		byEntry.set(t.publicEntryId, list);
	}

	const akhir = page[page.length - 1];
	const adaLagi = rows.length > limit && akhir !== undefined;

	return {
		items: page.map((r) => {
			const g = gambarDariBadan(r.bodyMd);
			return {
				id: r.id,
				slug: r.slug,
				title: r.title,
				excerpt: r.excerpt,
				entryDate: r.entryDate,
				mood: r.mood,
				penName: r.penName,
				terverifikasi: !r.isAnonymous && terverifikasi.has(r.userId),
				isAnonymous: r.isAnonymous,
				publishedAt: r.publishedAt.toISOString(),
				viewCount: r.viewCount,
				reactionCount: r.reactionCount,
				tags: byEntry.get(r.id) ?? [],
				gambar: g.gambar,
				jumlahGambar: g.jumlah
			};
		}),
		nextCursor: !adaLagi
			? null
			: sort === 'populer'
				? `${akhir.viewCount}|${akhir.id}`
				: akhir.publishedAt.toISOString(),
		total: Number(total),
		hal,
		totalHal
	};
}

/** Penulis mana saja dari daftar ini yang sudah memverifikasi emailnya. */
export async function penulisTerverifikasi(userIds: string[]): Promise<Set<string>> {
	const unik = [...new Set(userIds)];
	if (unik.length === 0) return new Set();
	const rows = await db
		.select({ id: users.id })
		.from(users)
		.where(and(inArray(users.id, unik), isNotNull(users.emailVerifiedAt)));
	return new Set(rows.map((r) => r.id));
}

export async function popularTags(limit = 12): Promise<string[]> {
	const rows = await db
		.select({ tag: publicTags.tag, n: sql<number>`count(*)::int` })
		.from(publicTags)
		.groupBy(publicTags.tag)
		.orderBy(sql`count(*) desc`)
		.limit(limit);
	return rows.map((r) => r.tag);
}
