import { randomInt } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { ABJAD, HURUF, type Titik } from './captcha-huruf.ts';

export const LEBAR = 250;
export const TINGGI = 84;
export const PANJANG_KODE = 5;

const LATAR: [number, number, number] = [243, 237, 225];
const TINTA: [number, number, number][] = [
	[46, 42, 38],
	[62, 46, 40],
	[40, 52, 60],
	[70, 40, 44]
];

function acak(): number {
	return randomInt(0, 1_000_000) / 1_000_000;
}

function antara(a: number, b: number): number {
	return a + (b - a) * acak();
}

export function buatKode(panjang = PANJANG_KODE): string {
	let kode = '';
	for (let i = 0; i < panjang; i++) kode += ABJAD[randomInt(0, ABJAD.length)];
	return kode;
}

class Kanvas {
	readonly piksel: Float32Array;

	constructor(
		readonly lebar: number,
		readonly tinggi: number
	) {
		this.piksel = new Float32Array(lebar * tinggi * 3);
		const kotak = 2;
		const kolom = Math.ceil(lebar / kotak);
		const bercak = new Float32Array(kolom * Math.ceil(tinggi / kotak));
		for (let i = 0; i < bercak.length; i++) bercak[i] = Math.round(antara(-5, 5));
		for (let y = 0; y < tinggi; y++) {
			for (let x = 0; x < lebar; x++) {
				const derau = bercak[Math.floor(y / kotak) * kolom + Math.floor(x / kotak)]!;
				const i = (y * lebar + x) * 3;
				this.piksel[i] = LATAR[0] + derau;
				this.piksel[i + 1] = LATAR[1] + derau;
				this.piksel[i + 2] = LATAR[2] + derau;
			}
		}
	}

	campur(x: number, y: number, warna: [number, number, number], alfa: number) {
		if (alfa <= 0 || x < 0 || y < 0 || x >= this.lebar || y >= this.tinggi) return;
		const i = (y * this.lebar + x) * 3;
		const a = Math.min(1, alfa);
		this.piksel[i] = this.piksel[i]! * (1 - a) + warna[0] * a;
		this.piksel[i + 1] = this.piksel[i + 1]! * (1 - a) + warna[1] * a;
		this.piksel[i + 2] = this.piksel[i + 2]! * (1 - a) + warna[2] * a;
	}

	ruas(a: Titik, b: Titik, tebal: number, warna: [number, number, number], alfa = 1) {
		const r = tebal / 2;
		const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - r - 1));
		const x1 = Math.min(this.lebar - 1, Math.ceil(Math.max(a[0], b[0]) + r + 1));
		const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - r - 1));
		const y1 = Math.min(this.tinggi - 1, Math.ceil(Math.max(a[1], b[1]) + r + 1));
		const dx = b[0] - a[0];
		const dy = b[1] - a[1];
		const panjang2 = dx * dx + dy * dy;
		for (let y = y0; y <= y1; y++) {
			for (let x = x0; x <= x1; x++) {
				const px = x + 0.5 - a[0];
				const py = y + 0.5 - a[1];
				const t = panjang2 === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / panjang2));
				const jx = px - dx * t;
				const jy = py - dy * t;
				const jarak = Math.sqrt(jx * jx + jy * jy);
				this.campur(x, y, warna, Math.max(0, Math.min(1, r + 0.5 - jarak)) * alfa);
			}
		}
	}

	keRgb(): Uint8Array {
		const keluar = new Uint8Array(this.piksel.length);
		for (let i = 0; i < this.piksel.length; i++) {
			keluar[i] = Math.max(0, Math.min(255, Math.round(this.piksel[i]!)));
		}
		return keluar;
	}
}

const TABEL_CRC = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

function crc32(data: Uint8Array): number {
	let c = 0xffffffff;
	for (const b of data) c = TABEL_CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function potongan(tipe: string, data: Uint8Array): Buffer {
	const nama = Buffer.from(tipe, 'ascii');
	const isi = Buffer.concat([nama, Buffer.from(data)]);
	const panjang = Buffer.alloc(4);
	panjang.writeUInt32BE(data.length);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(isi));
	return Buffer.concat([panjang, isi, crc]);
}

function kePng(lebar: number, tinggi: number, rgb: Uint8Array): Buffer {
	const lebarBaris = lebar * 3;
	const baris = Buffer.alloc(tinggi * (lebarBaris + 1));
	for (let y = 0; y < tinggi; y++) {
		const awal = y * (lebarBaris + 1);
		baris[awal] = y === 0 ? 0 : 2;
		for (let x = 0; x < lebarBaris; x++) {
			const kini = rgb[y * lebarBaris + x]!;
			const atas = y === 0 ? 0 : rgb[(y - 1) * lebarBaris + x]!;
			baris[awal + 1 + x] = (kini - atas) & 0xff;
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(lebar, 0);
	ihdr.writeUInt32BE(tinggi, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		potongan('IHDR', ihdr),
		potongan('IDAT', deflateSync(baris, { level: 9 })),
		potongan('IEND', new Uint8Array())
	]);
}

export function gambarKode(kode: string): string {
	const kanvas = new Kanvas(LEBAR, TINGGI);
	const ombakA = antara(2.5, 5);
	const ombakB = antara(2, 4);
	const panjangA = antara(26, 40);
	const panjangB = antara(34, 52);
	const gescA = acak() * Math.PI * 2;
	const gescB = acak() * Math.PI * 2;

	const lengkung = (t: Titik): Titik => [
		t[0] + ombakA * Math.sin(t[1] / panjangA + gescA),
		t[1] + ombakB * Math.sin(t[0] / panjangB + gescB)
	];

	const sisi = 22;
	const langkah = (LEBAR - sisi * 2) / kode.length;

	for (let i = 0; i < kode.length; i++) {
		const glif = HURUF[kode[i]!];
		if (!glif) continue;
		const tinggiGlif = antara(40, 52);
		const lebarGlif = tinggiGlif * antara(0.62, 0.78);
		const sudut = (antara(-20, 20) * Math.PI) / 180;
		const kos = Math.cos(sudut);
		const sin = Math.sin(sudut);
		const cx = sisi + langkah * (i + 0.5) + antara(-4, 4);
		const cy = TINGGI / 2 + antara(-6, 6);
		const warna = TINTA[randomInt(0, TINTA.length)]!;
		const tebal = antara(2.6, 3.6);

		const tempat = (p: Titik): Titik => {
			const x = (p[0] - 0.5) * lebarGlif;
			const y = (p[1] - 0.5) * tinggiGlif;
			return lengkung([cx + x * kos - y * sin, cy + x * sin + y * kos]);
		};

		for (const guratan of glif) {
			let sebelum = tempat(guratan[0]!);
			for (let k = 1; k < guratan.length; k++) {
				const kini = guratan[k]!;
				const lalu = guratan[k - 1]!;
				const jarak = Math.hypot((kini[0] - lalu[0]) * lebarGlif, (kini[1] - lalu[1]) * tinggiGlif);
				const bagi = Math.max(1, Math.ceil(jarak / 3));
				for (let s = 1; s <= bagi; s++) {
					const t = s / bagi;
					const titik = tempat([lalu[0] + (kini[0] - lalu[0]) * t, lalu[1] + (kini[1] - lalu[1]) * t]);
					kanvas.ruas(sebelum, titik, tebal, warna);
					sebelum = titik;
				}
			}
		}
	}

	for (let g = 0; g < 2; g++) {
		const warna = TINTA[randomInt(0, TINTA.length)]!;
		const y0 = antara(TINGGI * 0.2, TINGGI * 0.8);
		const amp = antara(6, 14);
		const gel = antara(60, 130);
		const fase = acak() * Math.PI * 2;
		let sebelum: Titik = [0, y0 + amp * Math.sin(fase)];
		for (let x = 4; x <= LEBAR; x += 4) {
			const kini: Titik = [x, y0 + amp * Math.sin(x / gel + fase)];
			kanvas.ruas(sebelum, kini, antara(1.6, 2.4), warna, 0.5);
			sebelum = kini;
		}
	}

	for (let n = 0; n < 260; n++) {
		const warna = TINTA[randomInt(0, TINTA.length)]!;
		const x = randomInt(0, LEBAR);
		const y = randomInt(0, TINGGI);
		kanvas.campur(x, y, warna, antara(0.15, 0.55));
	}

	return `data:image/png;base64,${kePng(LEBAR, TINGGI, kanvas.keRgb()).toString('base64')}`;
}
