import { browser } from '$app/environment';
import { uuidv7 } from 'uuidv7';
import { crypto } from '$crypto/client.ts';
import type { EntryPayload } from '$crypto/protocol.ts';
import { syncApi, type RemoteEntry } from '$lib/api/endpoints.ts';
import { entriesRepo, metaRepo, queueRepo } from '$lib/db/local/repo.ts';
import { localDb } from '$lib/db/local/db.ts';
import type { LocalEntry } from '$lib/db/local/types.ts';
import { coba, labelTandingan } from './konflik.ts';
import { keEntryPayload } from './payload.ts';
import { jendelaSekarang, batasTanggal, KEY_REV } from './jendela.ts';
import { toast } from '$lib/state/toast.svelte.ts';
import { polos } from '$lib/utils/polos.ts';
import { i18n } from '$lib/state/i18n.svelte.ts';

export type StatusSync = 'synced' | 'syncing' | 'offline' | 'error';

function fromPayload(r: RemoteEntry, p: EntryPayload): LocalEntry {
	return {
		id: r.id,
		entryDate: r.entryDate,
		title: p.title ?? '',
		body: p.body ?? '',
		mood: p.mood ?? null,
		tags: p.tags ?? [],
		weather: p.weather ?? null,
		location: p.location ?? null,
		attachments: p.attachments ?? [],
		createdAt: p.createdAt ?? r.clientUpdatedAt,
		updatedAt: p.updatedAt ?? r.clientUpdatedAt,
		rev: r.rev,
		baseRev: r.rev,
		dirty: 0,
		deletedAt: r.deletedAt,
		conflictOf: null,
		conflictLabel: null,
		publicId: null
	};
}

class MesinSync {
	status = $state<StatusSync>('synced');
	antre = $state(0);
	terakhir = $state<string | null>(null);
	konflikBaru = $state(0);
	/** Naik tiap putaran selesai; tampilan memakainya untuk membaca ulang IndexedDB. */
	putaran = $state(0);
	private berjalan = false;
	private timer: ReturnType<typeof setInterval> | null = null;
	private namaPerangkat = 'perangkat lain';

	mulai(namaPerangkat: string) {
		if (!browser || this.timer) return;
		this.namaPerangkat = namaPerangkat;
		this.status = navigator.onLine ? 'synced' : 'offline';
		addEventListener('online', () => {
			this.status = 'syncing';
			void this.jalankan();
		});
		addEventListener('offline', () => (this.status = 'offline'));
		this.timer = setInterval(() => void this.jalankan(), 45_000);
		void this.hitungAntre();
		void this.jalankan();
	}

	berhenti() {
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
	}

	async hitungAntre() {
		this.antre = await entriesRepo.dirtyCount();
	}

	async jalankan(): Promise<void> {
		if (!browser || this.berjalan) return;
		if (!navigator.onLine) {
			this.status = 'offline';
			return;
		}
		const siap = await crypto.status();
		if (!siap.unlocked) return;

		this.berjalan = true;
		this.status = 'syncing';
		try {
			await this.tarik();
			await this.dorong();
			await this.tarik();
			this.status = 'synced';
			this.terakhir = new Date().toISOString();
		} catch (err) {
			this.status = navigator.onLine ? 'error' : 'offline';
			console.error('[sync]', err);
		} finally {
			this.berjalan = false;
			await this.hitungAntre();
			this.putaran += 1;
		}
	}

	private async tarik() {
		let since = await metaRepo.get<number>(KEY_REV, 0);
		// Sync selektif: perangkat kecil hanya menarik N bulan terakhir.
		const batas = batasTanggal(await jendelaSekarang()) ?? undefined;

		for (let putaran = 0; putaran < 40; putaran++) {
			const res = await syncApi.pull(since, 200, batas);
			for (const r of res.entries) {
				const lokal = await entriesRepo.get(r.id);
				if (lokal?.dirty === 1) continue;
				if (r.deletedAt) {
					await entriesRepo.purge(r.id);
					continue;
				}
				try {
					const payload = await crypto.decryptEntry(r.id, {
						ciphertext: r.ciphertext,
						nonce: r.nonce,
						wrappedDek: r.wrappedDek,
						dekNonce: r.dekNonce,
						sizeBucket: r.sizeBucket as never
					});
					await entriesRepo.putRemote(fromPayload(r, payload));
				} catch {
					console.warn('[sync] entri tidak bisa dibuka', r.id);
				}
				since = Math.max(since, r.rev);
			}
			await metaRepo.set(KEY_REV, since);
			if (!res.hasMore) break;
		}
	}

	private async dorong() {
		const kotor = await entriesRepo.dirty(100);
		if (kotor.length === 0) return;

		const batch: unknown[] = [];
		const hapus: LocalEntry[] = [];
		// Versi yang ikut terkirim, untuk mendeteksi suntingan yang masuk saat push berjalan.
		const dikirim = new Map<string, string>();

		for (const e of kotor) {
			if (e.deletedAt) {
				hapus.push(e);
				continue;
			}
			const parts = await crypto.encryptEntry(e.id, keEntryPayload(e));
			const tags = await crypto.tagTokens(e.tags);
			dikirim.set(e.id, e.updatedAt);
			batch.push({
				id: e.id,
				entryDate: e.entryDate,
				ciphertext: parts.ciphertext,
				nonce: parts.nonce,
				wrappedDek: parts.wrappedDek,
				dekNonce: parts.dekNonce,
				sizeBucket: parts.sizeBucket,
				tagTokens: tags,
				clientUpdatedAt: e.updatedAt,
				baseRev: e.baseRev
			});
		}

		for (const e of hapus) {
			await syncApi.remove(e.id).catch(() => {});
			await entriesRepo.purge(e.id);
		}

		if (batch.length === 0) return;
		const res = await syncApi.push(batch);

		for (const r of res.results) {
			const lokal = await entriesRepo.get(r.id);
			if (!lokal) continue;
			if (r.status === 'ok') {
				// Kalau entri disunting lagi saat push berjalan, biarkan tetap kotor
				// tapi majukan baseRev supaya putaran berikutnya tidak dianggap konflik.
				const berubah = lokal.updatedAt !== dikirim.get(r.id);
				await localDb().entries.put(
					polos({ ...lokal, rev: r.rev, baseRev: r.rev, dirty: berubah ? 1 : 0 })
				);
				continue;
			}
			if (r.server) await this.selesaikanKonflik(lokal, r.server);
		}

		await metaRepo.set(KEY_REV, Math.max(await metaRepo.get<number>(KEY_REV, 0), res.serverRev));
		const seqs = (await queueRepo.pending()).map((q) => q.seq).filter((s): s is number => s !== undefined);
		await queueRepo.clear(seqs);
	}

	/** Tidak pernah menimpa diam-diam: gabung otomatis atau simpan versi tandingan. */
	private async selesaikanKonflik(lokal: LocalEntry, server: RemoteEntry) {
		let versiServer: LocalEntry;
		try {
			const payload = await crypto.decryptEntry(server.id, {
				ciphertext: server.ciphertext,
				nonce: server.nonce,
				wrappedDek: server.wrappedDek,
				dekNonce: server.dekNonce,
				sizeBucket: server.sizeBucket as never
			});
			versiServer = fromPayload(server, payload);
		} catch {
			return;
		}

		const hasil = coba(lokal, versiServer);
		if (hasil.jenis === 'ambil-server') {
			await entriesRepo.putRemote(versiServer);
			return;
		}
		if (hasil.jenis === 'gabung') {
			await localDb().entries.put(polos(hasil.hasil));
			return;
		}

		await entriesRepo.putRemote(versiServer);
		await entriesRepo.save(
			{
				...lokal,
				id: uuidv7(),
				rev: 0,
				baseRev: 0,
				dirty: 1,
				conflictOf: server.id,
				conflictLabel: labelTandingan(this.namaPerangkat)
			},
			true
		);
		this.konflikBaru += 1;
		toast.show(
			i18n.locale === 'en'
				? 'A conflicting version was kept as a separate card.'
				: 'Ada versi tandingan, disimpan jadi kartu terpisah.'
		);
	}
}

export const sync = new MesinSync();
