import { crypto } from './client.ts';
import type { KdfParams } from './kdf.ts';
import { api } from '$lib/api/client.ts';
import { authApi } from '$lib/api/endpoints.ts';
import { entriesRepo } from '$lib/db/local/repo.ts';
import { keEntryPayload } from '$lib/sync/payload.ts';
import { sesi } from '$lib/state/sesi.svelte.ts';

const BATCH = 50;

export type FaseRotasi = 'diam' | 'menyiapkan' | 'membungkus' | 'selesai' | 'gagal';

export interface HasilRotasi {
	keyVersion: number;
	phrase: string[];
	diperbarui: number;
}

/**
 * Rotasi kunci master: seluruh entri didekripsi dengan MK lama lalu dienkripsi
 * ulang dengan MK baru, semuanya di dalam Web Worker. Server hanya menerima
 * ciphertext baru dan brankas kunci baru.
 */
class RotasiState {
	fase = $state<FaseRotasi>('diam');
	total = $state(0);
	selesai = $state(0);
	pesan = $state('');

	get persen() {
		return this.total === 0 ? 0 : Math.round((this.selesai / this.total) * 100);
	}

	get berjalan() {
		return this.fase === 'menyiapkan' || this.fase === 'membungkus';
	}

	async jalankan(sandiLama: string, sandiBaru: string, kdf: KdfParams): Promise<HasilRotasi> {
		this.fase = 'menyiapkan';
		this.selesai = 0;
		this.pesan = '';

		try {
			// Buktikan kepemilikan sandi lama sebelum apa pun disentuh.
			const p = await authApi.params(sesi.email);
			const { authKey: authKeyLama } = await crypto.derive(sandiLama, p.saltUser, kdf);

			const baru = await crypto.mulaiRotasiMk(sandiBaru, kdf);

			const { keyVersion } = await api<{ keyVersion: number }>('/api/account/rotate-key', {
				method: 'POST',
				body: {
					authKeyLama,
					authKey: baru.authKey,
					saltUser: baru.saltUser,
					kdf,
					wrappedMk: baru.wrappedMk,
					mkNonce: baru.mkNonce,
					recoveryWrappedMk: baru.recoveryWrappedMk,
					recoveryNonce: baru.recoveryNonce,
					recoverySalt: baru.recoverySalt,
					recoveryAuthKey: baru.recoveryAuthKey
				}
			});

			this.fase = 'membungkus';
			const diperbarui = await this.bungkusUlangSemua(keyVersion);

			await crypto.selesaikanRotasiMk();
			await sesi.simpanBrankas();
			await sesi.segarkan();

			this.fase = 'selesai';
			return { keyVersion, phrase: baru.phrase, diperbarui };
		} catch (err) {
			await crypto.batalkanRotasiMk().catch(() => {});
			this.fase = 'gagal';
			this.pesan = (err as Error).message;
			throw err;
		}
	}

	/** Baca entri dari IndexedDB, bungkus ulang di worker, kirim per batch. */
	private async bungkusUlangSemua(keyVersion: number): Promise<number> {
		const semua = await entriesRepo.all();
		this.total = semua.length;
		if (semua.length === 0) return 0;

		let diperbarui = 0;
		for (let i = 0; i < semua.length; i += BATCH) {
			const potongan = semua.slice(i, i + BATCH);
			const batch = [];

			for (const e of potongan) {
				// Plaintext sudah ada di perangkat, jadi cukup dienkripsi ulang dengan MK baru.
				const baru = await crypto.encryptEntry(e.id, keEntryPayload(e));
				const tags = await crypto.tagTokens(e.tags);
				batch.push({
					id: e.id,
					entryDate: e.entryDate,
					ciphertext: baru.ciphertext,
					nonce: baru.nonce,
					wrappedDek: baru.wrappedDek,
					dekNonce: baru.dekNonce,
					sizeBucket: baru.sizeBucket,
					tagTokens: tags,
					clientUpdatedAt: e.updatedAt,
					baseRev: e.baseRev
				});
				this.selesai += 1;
			}

			const res = await api<{ diperbarui: number }>('/api/account/rotate-key', {
				method: 'PUT',
				body: { keyVersion, entries: batch }
			});
			diperbarui += res.diperbarui;
		}
		return diperbarui;
	}

	reset() {
		this.fase = 'diam';
		this.total = 0;
		this.selesai = 0;
		this.pesan = '';
	}
}

export const rotasi = new RotasiState();
