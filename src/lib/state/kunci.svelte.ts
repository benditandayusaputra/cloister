import { browser } from '$app/environment';
import { crypto } from '$crypto/client.ts';
import { localDb } from '$lib/db/local/db.ts';
import { metaRepo } from '$lib/db/local/repo.ts';
import { sesi } from './sesi.svelte.ts';

const IDLE_MS = 5 * 60_000;

class KunciState {
	aktif = $state(false);
	terkunci = $state(false);
	private timer: ReturnType<typeof setTimeout> | null = null;

	async muat() {
		if (!browser) return;
		const row = await localDb().vaultBlob.get('applock');
		this.aktif = !!row;
		if (this.aktif) {
			const status = await crypto.status();
			this.terkunci = !status.unlocked;
		}
	}

	/** Aktifkan kunci aplikasi: MK dibungkus PIN, plaintext dibuang dari IndexedDB. */
	async pasang(pin: string) {
		const sealed = await crypto.sealVault(pin);
		await localDb().vaultBlob.put({ key: 'applock', ...sealed });
		await metaRepo.set('appLockAktif', true);
		await sesi.buangBrankas();
		this.aktif = true;
		this.pasangTimer();
	}

	async buka(pin: string): Promise<boolean> {
		const row = await localDb().vaultBlob.get('applock');
		if (!row) return false;
		try {
			await crypto.openVault(pin, row.salt, row.ct, row.nonce);
			this.terkunci = false;
			this.pasangTimer();
			return true;
		} catch {
			return false;
		}
	}

	async lepas() {
		await localDb().vaultBlob.delete('applock');
		await metaRepo.set('appLockAktif', false);
		await sesi.simpanBrankas();
		this.aktif = false;
		this.terkunci = false;
		if (this.timer) clearTimeout(this.timer);
	}

	async kunciSekarang() {
		if (!this.aktif) return;
		await crypto.lock();
		this.terkunci = true;
	}

	pasangTimer() {
		if (!browser || !this.aktif) return;
		const reset = () => {
			if (this.timer) clearTimeout(this.timer);
			this.timer = setTimeout(() => void this.kunciSekarang(), IDLE_MS);
		};
		for (const ev of ['pointerdown', 'keydown', 'visibilitychange']) {
			addEventListener(ev, reset, { passive: true });
		}
		reset();
	}
}

export const kunci = new KunciState();
