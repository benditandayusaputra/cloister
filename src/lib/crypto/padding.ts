export const BUCKETS = [256, 1024, 4096, 16384, 65536, 131072, 262144, 524288, 1048576] as const;
export type Bucket = (typeof BUCKETS)[number];

export function pickBucket(len: number): Bucket {
	for (const b of BUCKETS) if (len + 1 <= b) return b;
	throw new Error('entri terlalu besar, pecah jadi beberapa entri');
}

/** Padding ISO 7816-4: byte 0x80 lalu nol sampai ukuran bucket. */
export function pad(msg: Uint8Array): { padded: Uint8Array; bucket: Bucket } {
	const bucket = pickBucket(msg.length);
	const padded = new Uint8Array(bucket);
	padded.set(msg, 0);
	padded[msg.length] = 0x80;
	return { padded, bucket };
}

export function unpad(padded: Uint8Array): Uint8Array {
	let i = padded.length - 1;
	while (i >= 0 && padded[i] === 0x00) i--;
	if (i < 0 || padded[i] !== 0x80) throw new Error('padding rusak');
	return padded.subarray(0, i);
}
