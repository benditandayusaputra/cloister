/**
 * Salin jadi objek polos. Proxy $state Svelte tidak bisa di-structured-clone,
 * jadi apa pun yang menuju IndexedDB atau postMessage harus lewat sini dulu.
 */
export function polos<T>(nilai: T): T {
	if (nilai === null || typeof nilai !== 'object') return nilai;
	if (nilai instanceof ArrayBuffer || ArrayBuffer.isView(nilai)) return nilai;
	if (nilai instanceof Date || nilai instanceof Blob) return nilai;
	if (typeof CryptoKey !== 'undefined' && nilai instanceof CryptoKey) return nilai;
	if (Array.isArray(nilai)) return nilai.map(polos) as unknown as T;

	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(nilai as Record<string, unknown>)) out[k] = polos(v);
	return out as T;
}
