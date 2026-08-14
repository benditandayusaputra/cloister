import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { CFG } from './env.ts';
import { notFound } from './problem.ts';

/** Vercel Blob kalau token ada, kalau tidak simpan di disk (self-host / dev). */
const useVercel = () => CFG.blobToken.length > 0;

const localPath = (key: string) => resolve(CFG.blobDir, key.replace(/\.\./g, ''));

export const blob = {
	async put(key: string, bytes: Uint8Array): Promise<string> {
		if (useVercel()) {
			const { put } = await import('@vercel/blob');
			const res = await put(key, bytes as unknown as Blob, {
				access: 'public',
				token: CFG.blobToken,
				addRandomSuffix: false,
				contentType: 'application/octet-stream'
			});
			return res.url;
		}
		const p = localPath(key);
		await mkdir(dirname(p), { recursive: true });
		await writeFile(p, bytes);
		return `/api/sync/attachments/raw/${key}`;
	},

	async get(key: string): Promise<Uint8Array> {
		if (useVercel()) {
			const { head } = await import('@vercel/blob');
			const info = await head(key, { token: CFG.blobToken });
			const res = await fetch(info.url);
			if (!res.ok) throw notFound('Lampiran tidak ada');
			return new Uint8Array(await res.arrayBuffer());
		}
		try {
			return new Uint8Array(await readFile(localPath(key)));
		} catch {
			throw notFound('Lampiran tidak ada');
		}
	},

	async del(key: string): Promise<void> {
		if (useVercel()) {
			const { del } = await import('@vercel/blob');
			await del(key, { token: CFG.blobToken }).catch(() => {});
			return;
		}
		await unlink(localPath(key)).catch(() => {});
	}
};

export const blobKey = (userId: string, attachmentId: string) =>
	join('lampiran', userId.slice(0, 2), userId, `${attachmentId}.bin`);
