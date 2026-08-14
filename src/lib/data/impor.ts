import JSZip from 'jszip';
import { uuidv7 } from 'uuidv7';
import { entriesRepo, emptyEntry } from '$lib/db/local/repo.ts';
import type { LocalEntry } from '$lib/db/local/types.ts';

export interface HasilImpor {
	masuk: number;
	dilewati: number;
	sumber: string;
}

const isoDari = (s: string): string | null => {
	const m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
	return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

function dariFrontmatter(teks: string, namaFile: string): LocalEntry | null {
	const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(teks);
	const isi = m ? (m[2] ?? '') : teks;
	const meta = m ? (m[1] ?? '') : '';

	const ambil = (k: string) => new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(meta)?.[1]?.trim() ?? '';
	const bersih = (v: string) => v.replace(/^["']|["']$/g, '');

	const tanggal = isoDari(ambil('date')) ?? isoDari(namaFile);
	if (!tanggal) return null;

	const e = emptyEntry(tanggal);
	e.title = bersih(ambil('title'));
	e.body = isi.trim();
	const mood = Number(ambil('mood'));
	e.mood = Number.isInteger(mood) && mood >= 1 && mood <= 5 ? mood : null;
	const tags = ambil('tags');
	if (tags) {
		e.tags = tags
			.replace(/^\[|\]$/g, '')
			.split(',')
			.map((t) => bersih(t.trim()).toLowerCase())
			.filter(Boolean)
			.slice(0, 8);
	}
	return e;
}

/** Impor format Cloister sendiri, Day One JSON, Journey, dan markdown biasa. */
export async function imporFile(file: File): Promise<HasilImpor> {
	const nama = file.name.toLowerCase();

	if (nama.endsWith('.zip')) return imporZip(file);
	if (nama.endsWith('.json')) return imporJson(await file.text());
	if (nama.endsWith('.md') || nama.endsWith('.txt')) {
		const e = dariFrontmatter(await file.text(), file.name);
		if (!e) return { masuk: 0, dilewati: 1, sumber: 'markdown' };
		await entriesRepo.save(e);
		return { masuk: 1, dilewati: 0, sumber: 'markdown' };
	}
	throw new Error('Format file tidak dikenal. Pakai .zip, .json, atau .md');
}

async function imporZip(file: File): Promise<HasilImpor> {
	const zip = await JSZip.loadAsync(file);
	const jsonFile = zip.file('cloister-export.json') ?? zip.file(/Journal\.json$/)[0];
	if (jsonFile) return imporJson(await jsonFile.async('string'));

	let masuk = 0;
	let dilewati = 0;
	const fileMd = zip.file(/\.md$/);
	for (const f of fileMd) {
		const e = dariFrontmatter(await f.async('string'), f.name);
		if (!e) {
			dilewati++;
			continue;
		}
		await entriesRepo.save(e);
		masuk++;
	}
	return { masuk, dilewati, sumber: 'zip markdown' };
}

interface DayOneEntry {
	creationDate?: string;
	modifiedDate?: string;
	text?: string;
	tags?: string[];
	starred?: boolean;
	location?: { placeName?: string; latitude?: number; longitude?: number };
}

async function imporJson(teks: string): Promise<HasilImpor> {
	const data = JSON.parse(teks) as Record<string, unknown>;

	if (data.format === 'cloister-export' && Array.isArray(data.entries)) {
		let masuk = 0;
		for (const raw of data.entries as Partial<LocalEntry>[]) {
			if (!raw.entryDate) continue;
			const dasar = emptyEntry(raw.entryDate);
			await entriesRepo.save({
				...dasar,
				...raw,
				id: raw.id ?? uuidv7(),
				rev: 0,
				baseRev: 0,
				dirty: 1,
				deletedAt: null,
				publicId: null
			} as LocalEntry);
			masuk++;
		}
		return { masuk, dilewati: 0, sumber: 'papan' };
	}

	// Day One: { entries: [...] }
	if (Array.isArray(data.entries)) {
		let masuk = 0;
		let dilewati = 0;
		for (const raw of data.entries as DayOneEntry[]) {
			const tanggal = isoDari(raw.creationDate ?? '');
			if (!tanggal) {
				dilewati++;
				continue;
			}
			const e = emptyEntry(tanggal);
			const isi = (raw.text ?? '').trim();
			e.body = isi;
			e.title = isi.split('\n')[0]?.replace(/^#+\s*/, '').slice(0, 120) ?? '';
			e.tags = (raw.tags ?? []).map((t) => t.toLowerCase()).slice(0, 8);
			if (raw.location?.placeName && raw.location.latitude && raw.location.longitude) {
				e.location = {
					lat: raw.location.latitude,
					lon: raw.location.longitude,
					label: raw.location.placeName
				};
			}
			if (raw.creationDate) e.createdAt = raw.creationDate;
			if (raw.modifiedDate) e.updatedAt = raw.modifiedDate;
			await entriesRepo.save(e);
			masuk++;
		}
		return { masuk, dilewati, sumber: 'Day One' };
	}

	// Journey: array datar dengan date_journal (epoch ms)
	if (Array.isArray(data)) {
		let masuk = 0;
		for (const raw of data as Array<{ date_journal?: number; text?: string; tags?: string[] }>) {
			if (!raw.date_journal) continue;
			const e = emptyEntry(new Date(raw.date_journal).toISOString().slice(0, 10));
			e.body = raw.text ?? '';
			e.tags = (raw.tags ?? []).slice(0, 8);
			await entriesRepo.save(e);
			masuk++;
		}
		return { masuk, dilewati: 0, sumber: 'Journey' };
	}

	throw new Error('Struktur JSON tidak dikenal');
}
