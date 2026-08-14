export const MAX_SISI = 2048;

export interface HasilOlah {
	blob: Blob;
	width: number;
	height: number;
	mime: string;
}

/**
 * Gambar dilewatkan canvas: EXIF ikut hilang, sisi terpanjang dibatasi 2048 px,
 * lalu dikonversi ke WebP sebelum dienkripsi.
 */
export async function olahGambar(file: File, maxSisi = MAX_SISI): Promise<HasilOlah> {
	const bitmap = await createImageBitmap(file);
	const skala = Math.min(1, maxSisi / Math.max(bitmap.width, bitmap.height));
	const w = Math.round(bitmap.width * skala);
	const h = Math.round(bitmap.height * skala);

	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('canvas tidak tersedia');
	ctx.drawImage(bitmap, 0, 0, w, h);
	bitmap.close();

	const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.85));
	if (!blob) throw new Error('gagal mengonversi gambar');
	return { blob, width: w, height: h, mime: 'image/webp' };
}

export function bucketMime(mime: string): 'image' | 'audio' | 'other' {
	if (mime.startsWith('image/')) return 'image';
	if (mime.startsWith('audio/')) return 'audio';
	return 'other';
}

export function ukuranManusia(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
