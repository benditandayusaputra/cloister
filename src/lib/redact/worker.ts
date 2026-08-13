/**
 * Web Worker Penyaring Identitas.
 *
 * Dipisah dari thread utama karena pemindaian catatan panjang bisa memakan
 * ratusan milidetik, dan modal Terbitkan tidak boleh membeku saat pengguna
 * mengetik. Worker ini tidak pernah melakukan `fetch`, `XMLHttpRequest`, atau
 * `importScripts` ke origin lain — tidak ada satu pun di berkas yang diimpor
 * dari sini, dan `tests/unit/redact-offline.test.ts` menegakkan itu.
 */

import { pindai, type JawabanSaring, type PermintaanSaring } from './mesin.ts';

const w = self as unknown as Worker;

w.onmessage = (ev: MessageEvent<PermintaanSaring>) => {
	const { id, teks, entitas } = ev.data;
	try {
		const hasil = pindai(teks, { entitas });
		w.postMessage({ id, ok: true, hasil } satisfies JawabanSaring);
	} catch (err) {
		w.postMessage({
			id,
			ok: false,
			error: (err as Error).message || 'pemindaian gagal'
		} satisfies JawabanSaring);
	}
};
