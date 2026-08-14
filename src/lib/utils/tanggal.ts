export const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const HARI_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const BULAN_ID = [
	'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
	'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
export const BULAN_EN = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
];

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const isoDate = (d: Date = new Date()) =>
	`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const todayIso = () => isoDate();

export function parseIso(iso: string): { year: number; month: number; day: number } {
	const [y, m, d] = iso.split('-').map(Number);
	return { year: y ?? 1970, month: m ?? 1, day: d ?? 1 };
}

export function daysInMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate();
}

export function weekdayIndex(iso: string): number {
	const { year, month, day } = parseIso(iso);
	return new Date(year, month - 1, day).getDay();
}

export function namaHari(iso: string, locale = 'id'): string {
	const list = locale === 'en' ? HARI_EN : HARI_ID;
	return list[weekdayIndex(iso)] as string;
}

export function namaBulan(month: number, locale = 'id'): string {
	const list = locale === 'en' ? BULAN_EN : BULAN_ID;
	return list[month - 1] as string;
}

export function labelTanggal(iso: string, locale = 'id'): string {
	const { year, month, day } = parseIso(iso);
	return `${namaHari(iso, locale)}, ${day} ${namaBulan(month, locale)} ${year}`;
}

export function stempelTanggal(iso: string, locale = 'id'): string {
	const { year, month, day } = parseIso(iso);
	return `${day} ${namaBulan(month, locale).slice(0, 3).toLowerCase()} ${year}`;
}

export function jamPendek(d: Date = new Date()): string {
	return `${pad2(d.getHours())}.${pad2(d.getMinutes())}`;
}

export function waktuRelatif(iso: string | null, locale = 'id'): string {
	if (!iso) return locale === 'en' ? 'never' : 'belum pernah';
	const diff = Date.now() - new Date(iso).getTime();
	const menit = Math.floor(diff / 60000);
	if (menit < 1) return locale === 'en' ? 'just now' : 'barusan';
	if (menit < 60) return locale === 'en' ? `${menit}m ago` : `${menit} menit lalu`;
	const jam = Math.floor(menit / 60);
	if (jam < 24) return locale === 'en' ? `${jam}h ago` : `${jam} jam lalu`;
	const hari = Math.floor(jam / 24);
	if (hari < 30) return locale === 'en' ? `${hari}d ago` : `${hari} hari lalu`;
	return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID');
}
