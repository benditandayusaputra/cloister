export interface Tantangan {
	salt: string;
	bits: number;
	exp: number;
	sig: string;
}

export interface Jawaban extends Tantangan {
	nonce: number;
}

const enc = new TextEncoder();

function nolDiDepan(digest: Uint8Array): number {
	let n = 0;
	for (const b of digest) {
		if (b === 0) {
			n += 8;
			continue;
		}
		n += Math.clz32(b) - 24;
		break;
	}
	return n;
}

export async function ambilTantangan(): Promise<Tantangan> {
	const res = await fetch('/api/auth/tantangan', { cache: 'no-store' });
	if (!res.ok) throw new Error('Tantangan bukan-robot tidak bisa diambil');
	return (await res.json()) as Tantangan;
}

export async function pecahkan(
	t: Tantangan,
	onprogress?: (dicoba: number) => void,
	sinyal?: AbortSignal
): Promise<Jawaban> {
	const awalan = enc.encode(`${t.salt}:`);
	let nonce = 0;
	for (;;) {
		if (sinyal?.aborted) throw new Error('dibatalkan');
		const batas = nonce + 512;
		for (; nonce < batas; nonce++) {
			const angka = enc.encode(String(nonce));
			const data = new Uint8Array(awalan.length + angka.length);
			data.set(awalan);
			data.set(angka, awalan.length);
			const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
			if (nolDiDepan(digest) >= t.bits) return { ...t, nonce };
		}
		onprogress?.(nonce);
		await new Promise((r) => setTimeout(r, 0));
	}
}
