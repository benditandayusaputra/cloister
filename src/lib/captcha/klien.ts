export interface Tantangan {
	token: string;
	gambar: string;
	exp: number;
	panjang: number;
}

export interface Jawaban {
	token: string;
	teks: string;
}

export async function ambilTantangan(): Promise<Tantangan> {
	const res = await fetch('/api/auth/tantangan', { cache: 'no-store' });
	if (!res.ok) throw new Error('Kode gambar tidak bisa diambil');
	return (await res.json()) as Tantangan;
}
