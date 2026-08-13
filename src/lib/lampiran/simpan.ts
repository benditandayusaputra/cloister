import { uuidv7 } from 'uuidv7';
import { crypto } from '$crypto/client.ts';
import { localDb } from '$lib/db/local/db.ts';
import { syncApi } from '$lib/api/endpoints.ts';
import type { AttachmentMeta } from '$crypto/protocol.ts';
import { olahGambar, bucketMime } from './gambar.ts';
import { polos } from '$lib/utils/polos.ts';

const urlCache = new Map<string, string>();

/** Simpan lampiran ke IndexedDB dulu supaya offline tetap jalan. */
export async function tambahLampiran(
	entryId: string,
	file: File
): Promise<AttachmentMeta> {
	const id = uuidv7();
	let bytes: ArrayBuffer;
	let mime = file.type || 'application/octet-stream';
	let w: number | undefined;
	let h: number | undefined;

	if (mime.startsWith('image/')) {
		const hasil = await olahGambar(file);
		bytes = await hasil.blob.arrayBuffer();
		mime = hasil.mime;
		w = hasil.width;
		h = hasil.height;
	} else {
		bytes = await file.arrayBuffer();
	}

	await localDb().attachments.put(
		polos({ id, entryId, bytes, mime, name: file.name, size: bytes.byteLength, dirty: 1 as const, remote: 0 as const })
	);

	return {
		id,
		kind: bucketMime(mime),
		name: file.name,
		mime,
		size: bytes.byteLength,
		...(w !== undefined ? { w } : {}),
		...(h !== undefined ? { h } : {})
	};
}

export async function hapusLampiran(id: string) {
	const url = urlCache.get(id);
	if (url) {
		URL.revokeObjectURL(url);
		urlCache.delete(id);
	}
	await localDb().attachments.delete(id);
}

/** Blob URL untuk ditampilkan; ambil lokal dulu, kalau tidak ada baru unduh dan dekripsi. */
export async function urlLampiran(meta: AttachmentMeta): Promise<string | null> {
	const cached = urlCache.get(meta.id);
	if (cached) return cached;

	const lokal = await localDb().attachments.get(meta.id);
	if (lokal) {
		const url = URL.createObjectURL(new Blob([lokal.bytes], { type: lokal.mime }));
		urlCache.set(meta.id, url);
		return url;
	}

	try {
		const res = await syncApi.downloadAttachment(meta.id);
		if (!res.ok) return null;
		const ct = await res.arrayBuffer();
		const plain = await crypto.decryptFile(
			meta.id,
			ct,
			res.headers.get('x-papan-nonce') ?? '',
			res.headers.get('x-papan-wrapped-key') ?? '',
			res.headers.get('x-papan-key-nonce') ?? ''
		);
		await localDb().attachments.put({
			id: meta.id,
			entryId: '',
			bytes: plain,
			mime: meta.mime,
			name: meta.name,
			size: plain.byteLength,
			dirty: 0,
			remote: 1
		});
		const url = URL.createObjectURL(new Blob([plain], { type: meta.mime }));
		urlCache.set(meta.id, url);
		return url;
	} catch {
		return null;
	}
}

/** Kirim lampiran kotor ke server dalam bentuk ciphertext. */
export async function kirimLampiranTertunda(): Promise<number> {
	const kotor = await localDb().attachments.where('dirty').equals(1).toArray();
	let terkirim = 0;
	for (const a of kotor) {
		try {
			const enc = await crypto.encryptFile(a.id, a.bytes.slice(0));
			const form = new FormData();
			form.set('entryId', a.entryId);
			form.set('mimeBucket', bucketMime(a.mime));
			form.set('nonce', enc.nonce);
			form.set('wrappedFileKey', enc.wrappedFileKey);
			form.set('fileKeyNonce', enc.fileKeyNonce);
			form.set('file', new Blob([enc.ciphertext]), `${a.id}.bin`);
			await syncApi.uploadAttachment(form);
			await localDb().attachments.update(a.id, { dirty: 0, remote: 1 });
			terkirim++;
		} catch {
			// tetap kotor, dicoba lagi di putaran sync berikutnya
		}
	}
	return terkirim;
}
