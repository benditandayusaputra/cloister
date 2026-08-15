import { uuidv7 } from 'uuidv7';
import { localDb } from './db.ts';
import type { LocalEntry, QueueItem } from './types.ts';
import { tokenize } from '$lib/utils/search.ts';
import { polos } from '$lib/utils/polos.ts';
import { teksPolos } from '$lib/utils/markdown-aman.ts';

export function emptyEntry(entryDate: string): LocalEntry {
	const now = new Date().toISOString();
	return {
		id: uuidv7(),
		entryDate,
		title: '',
		body: '',
		mood: null,
		tags: [],
		weather: null,
		location: null,
		attachments: [],
		pinned: false,
		createdAt: now,
		updatedAt: now,
		rev: 0,
		baseRev: 0,
		dirty: 1,
		deletedAt: null,
		conflictOf: null,
		conflictLabel: null,
		publicId: null
	};
}

async function reindex(e: LocalEntry) {
	const db = localDb();
	if (e.deletedAt) {
		await db.searchIndex.delete(e.id);
		return;
	}
	await db.searchIndex.put({
		id: e.id,
		tokens: tokenize(`${e.title} ${teksPolos(e.body)} ${e.tags.join(' ')}`),
		entryDate: e.entryDate
	});
}

async function enqueue(item: Omit<QueueItem, 'at'>) {
	await localDb().syncQueue.add({ ...item, at: new Date().toISOString() });
}

export const entriesRepo = {
	async get(id: string) {
		return localDb().entries.get(id);
	},

	async byDate(entryDate: string) {
		return localDb().entries.where('entryDate').equals(entryDate).filter((e) => !e.deletedAt).toArray();
	},

	async byMonth(year: number, month: number) {
		const from = `${year}-${String(month).padStart(2, '0')}-01`;
		const to = `${year}-${String(month).padStart(2, '0')}-31`;
		const rows = await localDb().entries.where('entryDate').between(from, to, true, true).toArray();
		return rows.filter((e) => !e.deletedAt).sort((a, b) => a.entryDate.localeCompare(b.entryDate));
	},

	async byYear(year: number) {
		const rows = await localDb()
			.entries.where('entryDate')
			.between(`${year}-01-01`, `${year}-12-31`, true, true)
			.toArray();
		return rows.filter((e) => !e.deletedAt);
	},

	async all() {
		return (await localDb().entries.toArray()).filter((e) => !e.deletedAt);
	},

	async tersemat() {
		return (await localDb().entries.toArray())
			.filter((e) => !e.deletedAt && e.pinned === true)
			.sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.updatedAt.localeCompare(a.updatedAt));
	},

	async years(): Promise<number[]> {
		const rows = await localDb().entries.toArray();
		const set = new Set<number>();
		for (const e of rows) if (!e.deletedAt) set.add(Number(e.entryDate.slice(0, 4)));
		set.add(new Date().getFullYear());
		return [...set].sort((a, b) => b - a);
	},

	async save(entry: LocalEntry, markDirty = true) {
		// rev dan baseRev milik mesin sync. Salinan yang dipegang layar bisa
		// tertinggal kalau sinkronisasi berjalan di latar sementara pengguna
		// mengetik; menuliskannya balik akan memundurkan rev dan memalsukan
		// konflik terhadap versi server yang sebenarnya sudah sama.
		const tersimpan = await localDb().entries.get(entry.id);
		const next: LocalEntry = polos({
			...entry,
			rev: tersimpan?.rev ?? entry.rev,
			baseRev: tersimpan?.baseRev ?? entry.baseRev,
			updatedAt: new Date().toISOString(),
			dirty: markDirty ? 1 : entry.dirty
		});
		await localDb().entries.put(next);
		await reindex(next);
		if (markDirty) await enqueue({ entityType: 'entry', entityId: next.id, op: 'upsert' });
		return next;
	},

	/** Simpan hasil pull tanpa menandai kotor. */
	async putRemote(entry: LocalEntry) {
		const next = polos(entry);
		await localDb().entries.put(next);
		await reindex(next);
	},

	async remove(id: string) {
		const e = await localDb().entries.get(id);
		if (!e) return;
		const next: LocalEntry = polos({ ...e, deletedAt: new Date().toISOString(), dirty: 1 });
		await localDb().entries.put(next);
		await localDb().searchIndex.delete(id);
		await enqueue({ entityType: 'entry', entityId: id, op: 'delete' });
	},

	async purge(id: string) {
		await localDb().entries.delete(id);
		await localDb().searchIndex.delete(id);
	},

	async dirty(limit = 100) {
		return localDb().entries.where('dirty').equals(1).limit(limit).toArray();
	},

	async dirtyCount() {
		return localDb().entries.where('dirty').equals(1).count();
	},

	async search(query: string, limit = 60) {
		const tokens = tokenize(query);
		if (tokens.length === 0) return [];
		const all = await this.all();
		const q = query.trim().toLowerCase();
		return all
			.filter((e) => {
				const hay = `${e.title} ${teksPolos(e.body)} ${e.tags.join(' ')}`.toLowerCase();
				return hay.includes(q) || tokens.every((t) => hay.includes(t));
			})
			.sort((a, b) => b.entryDate.localeCompare(a.entryDate))
			.slice(0, limit);
	},

	async allTags(): Promise<string[]> {
		const rows = await this.all();
		const counts = new Map<string, number>();
		for (const e of rows) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
	}
};

export const metaRepo = {
	async get<T>(key: string, fallback: T): Promise<T> {
		const row = await localDb().meta.get(key);
		return row ? (row.value as T) : fallback;
	},
	async set(key: string, value: unknown) {
		await localDb().meta.put({ key, value: polos(value) });
	},
	async del(key: string) {
		await localDb().meta.delete(key);
	}
};

export const queueRepo = {
	async pending() {
		return localDb().syncQueue.toArray();
	},
	async clear(seqs: number[]) {
		await localDb().syncQueue.bulkDelete(seqs);
	},
	async count() {
		return localDb().syncQueue.count();
	}
};
