import { metaRepo } from '$lib/db/local/repo.ts';
import { pad2 } from '$lib/utils/tanggal.ts';

export const KEY_JENDELA = 'syncJendelaBulan';
export const KEY_REV = 'lastSyncedRev';

/** 0 berarti tarik semuanya. */
export const PILIHAN_JENDELA = [0, 3, 6, 12, 24] as const;
export type JendelaBulan = (typeof PILIHAN_JENDELA)[number];

export async function jendelaSekarang(): Promise<JendelaBulan> {
	return metaRepo.get<JendelaBulan>(KEY_JENDELA, 0);
}

/** Tanggal paling awal yang ikut ditarik, atau null kalau semuanya. */
export function batasTanggal(bulan: JendelaBulan, sekarang = new Date()): string | null {
	if (bulan === 0) return null;
	const d = new Date(sekarang.getFullYear(), sekarang.getMonth() - (bulan - 1), 1);
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

/**
 * Menyempitkan jendela aman. Melebarkannya harus menarik ulang dari awal,
 * karena kursor rev sudah melewati entri yang dulu tersaring keluar.
 */
export async function setJendela(bulan: JendelaBulan): Promise<{ tarikUlang: boolean }> {
	const lama = await jendelaSekarang();
    const melebar = bulan === 0 || (lama !== 0 && bulan > lama);
	await metaRepo.set(KEY_JENDELA, bulan);
	if (melebar) {
		await metaRepo.set(KEY_REV, 0);
		return { tarikUlang: true };
	}
	return { tarikUlang: false };
}

export function labelJendela(bulan: JendelaBulan, locale = 'id'): string {
	if (bulan === 0) return locale === 'en' ? 'Everything' : 'Semuanya';
	return locale === 'en' ? `Last ${bulan} months` : `${bulan} bulan terakhir`;
}
