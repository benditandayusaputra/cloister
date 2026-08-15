import { entriesRepo } from '$lib/db/local/repo.ts';
import type { LocalEntry } from '$lib/db/local/types.ts';
import { sync } from '$lib/sync/mesin.svelte.ts';

/** Cache reaktif entri per bulan supaya papan tidak membaca IndexedDB tiap render. */
class EntriState {
	bulan = $state<LocalEntry[]>([]);
	tahunAktif = $state(new Date().getFullYear());
	bulanAktif = $state(new Date().getMonth() + 1);
	jumlahPerBulan = $state<number[]>(new Array(12).fill(0));
	tagTersedia = $state<string[]>([]);
	tahunTersedia = $state<number[]>([]);
	tersemat = $state<LocalEntry[]>([]);
	memuat = $state(true);

	async muatBulan(tahun: number, bulan: number) {
		this.tahunAktif = tahun;
		this.bulanAktif = bulan;
		this.memuat = true;
		this.bulan = await entriesRepo.byMonth(tahun, bulan);
		this.memuat = false;
	}

	async muatTahun(tahun: number) {
		this.tahunAktif = tahun;
		this.memuat = true;
		const rows = await entriesRepo.byYear(tahun);
		const hitung = new Array(12).fill(0);
		for (const e of rows) hitung[Number(e.entryDate.slice(5, 7)) - 1]++;
		this.jumlahPerBulan = hitung;
		this.tahunTersedia = await entriesRepo.years();
		this.memuat = false;
	}

	async muatTag() {
		this.tagTersedia = await entriesRepo.allTags();
	}

	async muatTersemat() {
		this.tersemat = await entriesRepo.tersemat();
	}

	async segarkan() {
		await this.muatBulan(this.tahunAktif, this.bulanAktif);
		await this.muatTahun(this.tahunAktif);
		await this.muatTag();
		await this.muatTersemat();
		await sync.hitungAntre();
	}
}

export const entri = new EntriState();
