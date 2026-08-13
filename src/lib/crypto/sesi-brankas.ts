/**
 * Brankas sesi: MK dibungkus CryptoKey non-extractable milik WebCrypto.
 * Kuncinya disimpan di IndexedDB sebagai objek CryptoKey, jadi tidak pernah ada
 * dalam bentuk byte yang bisa dieksfiltrasi — XSS bisa memakainya, tapi tidak
 * bisa membawanya keluar perangkat.
 */
export interface RekamanSesi {
	key: CryptoKey;
	iv: Uint8Array;
	ct: Uint8Array;
}

const ALGO = { name: 'AES-GCM', length: 256 } as const;

export async function bungkusSesi(masterKey: Uint8Array): Promise<RekamanSesi> {
	const key = await crypto.subtle.generateKey(ALGO, false, ['encrypt', 'decrypt']);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ct = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, masterKey as BufferSource)
	);
	return { key, iv, ct };
}

export async function bukaSesi(r: RekamanSesi): Promise<Uint8Array> {
	const plain = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: r.iv as BufferSource },
		r.key,
		r.ct as BufferSource
	);
	return new Uint8Array(plain);
}
