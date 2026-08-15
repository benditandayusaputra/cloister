import { olahGambar } from '$lib/lampiran/gambar.ts';

export const SISI_MAKS_SISIPAN = 1280;
export const BATAS_BADAN = 950_000;

export function bacaSebagaiDataUrl(blob: Blob): Promise<string> {
	return new Promise((selesai, gagal) => {
		const r = new FileReader();
		r.onload = () => selesai(String(r.result));
		r.onerror = () => gagal(new Error('gagal membaca gambar'));
		r.readAsDataURL(blob);
	});
}

export async function gambarKeDataUrl(file: File): Promise<{ src: string; alt: string }> {
	if (!file.type.startsWith('image/')) throw new Error('bukan file gambar');
	const hasil = await olahGambar(file, SISI_MAKS_SISIPAN);
	const src = await bacaSebagaiDataUrl(hasil.blob);
	const alt = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();
	return { src, alt };
}

export function muatKalauBerkas(items: DataTransferItemList | null | undefined): File[] {
	if (!items) return [];
	const files: File[] = [];
	for (const it of Array.from(items)) {
		if (it.kind !== 'file') continue;
		const f = it.getAsFile();
		if (f && f.type.startsWith('image/')) files.push(f);
	}
	return files;
}
