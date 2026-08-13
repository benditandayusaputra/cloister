/**
 * Preferensi Penyaring Identitas.
 *
 * Disimpan di localStorage, bukan di profil peladen: ini preferensi perangkat,
 * dan peladen tidak perlu tahu apa pun tentang bagaimana penyaring dipakai.
 */

import { browser } from '$app/environment';

const KEY = 'cloister:penyaring-entitas';

class PenyaringState {
	/** Lapis 2 aktif. Bisa dimatikan permanen dari Pengaturan (PRD 13.2). */
	entitas = $state(true);

	muat() {
		if (!browser) return;
		this.entitas = localStorage.getItem(KEY) !== '0';
	}

	setEntitas(nilai: boolean) {
		this.entitas = nilai;
		if (browser) localStorage.setItem(KEY, nilai ? '1' : '0');
	}
}

export const penyaring = new PenyaringState();
