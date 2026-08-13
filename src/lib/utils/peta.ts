/**
 * Matematika ubin peta (Web Mercator, skema slippy map).
 *
 * Dipisah dari komponennya supaya bisa diuji tanpa peramban: salah satu ubin
 * meleset satu petak sudah cukup untuk menaruh penanda di tempat yang salah.
 */

export const UKURAN_UBIN = 256;
export const HOST_UBIN = 'https://tile.openstreetmap.org';

export interface TitikUbin {
	/** Posisi dalam satuan ubin, termasuk pecahannya. */
	x: number;
	y: number;
}

/** Batas Web Mercator; di luar ini proyeksinya meledak jadi tak hingga. */
const LAT_MAKS = 85.05112878;

export function keUbin(lat: number, lon: number, zoom: number): TitikUbin {
	const n = 2 ** zoom;
	const lonJepit = Math.min(180, Math.max(-180, lon));
	const latJepit = Math.min(LAT_MAKS, Math.max(-LAT_MAKS, lat));
	const rad = (latJepit * Math.PI) / 180;
	const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
	return {
		x: ((lonJepit + 180) / 360) * n,
		// Tepat di batas Mercator hasilnya bisa meleset sepersemiliar ke bawah nol,
		// dan itu sudah cukup untuk membuat indeks ubinnya jadi -1.
		y: Math.min(n, Math.max(0, y))
	};
}

export interface Petak {
	x: number;
	y: number;
	url: string;
	/** Posisi kiri-atas petak ini di dalam kotak peta, dalam piksel. */
	kiri: number;
	atas: number;
}

/**
 * Susunan ubin yang menutupi kotak selebar `lebar` × `tinggi`, dengan koordinat
 * yang diminta tepat di tengahnya.
 */
export function susunPetak(
	lat: number,
	lon: number,
	zoom: number,
	lebar: number,
	tinggi: number
): Petak[] {
	const pusat = keUbin(lat, lon, zoom);
	const n = 2 ** zoom;

	// Piksel global koordinat pusat, lalu sudut kiri-atas kotak petanya.
	const pusatPxX = pusat.x * UKURAN_UBIN;
	const pusatPxY = pusat.y * UKURAN_UBIN;
	const kiriPxX = pusatPxX - lebar / 2;
	const atasPxY = pusatPxY - tinggi / 2;

	const ubinAwalX = Math.floor(kiriPxX / UKURAN_UBIN);
	const ubinAwalY = Math.floor(atasPxY / UKURAN_UBIN);
	const ubinAkhirX = Math.floor((kiriPxX + lebar - 1) / UKURAN_UBIN);
	const ubinAkhirY = Math.floor((atasPxY + tinggi - 1) / UKURAN_UBIN);

	const petak: Petak[] = [];
	for (let ty = ubinAwalY; ty <= ubinAkhirY; ty++) {
		// Di luar kutub tidak ada ubinnya; di bujur, peta menyambung melingkar.
		if (ty < 0 || ty >= n) continue;
		for (let tx = ubinAwalX; tx <= ubinAkhirX; tx++) {
			const txBungkus = ((tx % n) + n) % n;
			petak.push({
				x: txBungkus,
				y: ty,
				url: `${HOST_UBIN}/${zoom}/${txBungkus}/${ty}.png`,
				kiri: tx * UKURAN_UBIN - kiriPxX,
				atas: ty * UKURAN_UBIN - atasPxY
			});
		}
	}
	return petak;
}

/** Tautan ke peta penuh, dibuka pengguna sendiri di tab baru. */
export function tautanOsm(lat: number, lon: number, zoom = 15): string {
	return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
}
