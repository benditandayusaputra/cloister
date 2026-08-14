import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { authApi, toKdfParams, type SessionInfo } from '$lib/api/endpoints.ts';
import { tokenStore, ensureFreshToken } from '$lib/api/client.ts';
import { crypto } from '$crypto/client.ts';
import { metaRepo } from '$lib/db/local/repo.ts';
import { localDb, resetLocalDb } from '$lib/db/local/db.ts';
import { polos } from '$lib/utils/polos.ts';
import { i18n } from './i18n.svelte.ts';
import { tema, type TemaId, type Mode } from './tema.svelte.ts';

export type FaseSesi = 'memuat' | 'tamu' | 'terkunci' | 'siap';

class SesiState {
	fase = $state<FaseSesi>('memuat');
	info = $state<SessionInfo | null>(null);
	deviceId = $state<string | null>(null);
	perluTransfer = $state(false);

	get masuk() {
		return this.info !== null;
	}

	get email() {
		return this.info?.email ?? '';
	}

	get penName() {
		return this.info?.profile.penName ?? null;
	}

	get avatarUrl() {
		return this.info?.profile.avatarUrl ?? null;
	}

	setAvatar(url: string | null) {
		if (this.info) this.info.profile.avatarUrl = url;
	}

	get isModerator() {
		return this.info?.role === 'moderator' || this.info?.role === 'admin';
	}

	/** Bangunkan sesi: refresh token, ambil info, lalu coba buka brankas sesi. */
	async bangun() {
		if (!browser) return;
		this.deviceId = await metaRepo.get<string | null>('deviceId', null);

		if (!(await ensureFreshToken())) {
			this.fase = 'tamu';
			return;
		}
		try {
			this.terapkan(await authApi.session());
		} catch {
			this.fase = 'tamu';
			return;
		}

		const status = await crypto.status();
		if (status.unlocked) {
			this.fase = 'siap';
			return;
		}
		this.fase = (await this.pulihkanBrankas()) ? 'siap' : 'terkunci';
	}

	terapkan(info: SessionInfo) {
		this.info = info;
		if (info.deviceId) {
			this.deviceId = info.deviceId;
			void metaRepo.set('deviceId', info.deviceId);
		}
		const p = info.profile;
		if (p.locale === 'id' || p.locale === 'en') i18n.set(p.locale);
		tema.setTema(p.theme as TemaId);
		tema.setMode(p.mode as Mode);
	}

	async segarkan() {
		if (!this.masuk) return;
		this.info = await authApi.session();
	}

	/** Buka MK dari wrappedMK yang dikirim server memakai KEK di worker. */
	async bukaBrankas(wrappedMk: string, mkNonce: string) {
		await crypto.unlockWithKek(wrappedMk, mkNonce);
		await this.simpanBrankas();
		this.fase = 'siap';
	}

	/**
	 * MK dibungkus CryptoKey non-extractable lalu disimpan di IndexedDB, supaya
	 * memuat ulang halaman tidak memaksa turunkan sandi lagi. Kuncinya tidak
	 * pernah bisa dibaca sebagai byte, bahkan oleh thread utama.
	 */
	async simpanBrankas() {
		if (!browser) return;
		try {
			const r = await crypto.persistSession();
			await localDb().sesiBrankas.put(polos({ key: 'sesi' as const, cryptoKey: r.key, iv: r.iv, ct: r.ct }));
		} catch {
			// tanpa brankas sesi aplikasi tetap jalan, hanya minta sandi lagi setelah reload
		}
	}

	async pulihkanBrankas(): Promise<boolean> {
		if (!browser) return false;
		try {
			const row = await localDb().sesiBrankas.get('sesi');
			if (!row) return false;
			await crypto.restoreSession({ key: row.cryptoKey, iv: row.iv, ct: row.ct });
			return true;
		} catch {
			await localDb().sesiBrankas.delete('sesi').catch(() => {});
			return false;
		}
	}

	async buangBrankas() {
		if (!browser) return;
		await localDb().sesiBrankas.delete('sesi').catch(() => {});
	}

	async keluar(redirect = '/masuk') {
		await authApi.logout().catch(() => {});
		await crypto.lock();
		await this.buangBrankas();
		tokenStore.set(null);
		this.info = null;
		this.fase = 'tamu';
		if (browser) await goto(redirect);
	}

	async lupakanPerangkat() {
		await resetLocalDb();
		this.deviceId = null;
	}

	kdf() {
		return this.info ? toKdfParams(this.info.kdf) : null;
	}
}

export const sesi = new SesiState();
