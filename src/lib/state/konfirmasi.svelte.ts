export interface Permintaan {
	judul: string;
	pesan?: string;
	teksYa?: string;
	teksBatal?: string;
	bahaya?: boolean;
	ketik?: string;
}

interface Aktif extends Permintaan {
	selesai: (ok: boolean) => void;
}

class KonfirmasiState {
	aktif = $state<Aktif | null>(null);

	tanya(p: Permintaan): Promise<boolean> {
		this.aktif?.selesai(false);
		return new Promise((resolve) => {
			this.aktif = {
				...p,
				selesai: (ok) => {
					this.aktif = null;
					resolve(ok);
				}
			};
		});
	}
}

export const konfirmasi = new KonfirmasiState();

export function tanya(p: Permintaan): Promise<boolean> {
	return konfirmasi.tanya(p);
}
