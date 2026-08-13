import { seedFromString } from './kertas.ts';

const PROMPT_ID = [
	'Apa satu hal kecil yang bikin kamu senang hari ini?',
	'Apa yang kamu hindari hari ini, dan kenapa?',
	'Siapa yang kamu pikirkan hari ini tanpa memberi tahu dia?',
	'Apa yang berubah di rumahmu minggu ini?',
	'Apa yang kamu dengar hari ini yang tidak biasa?',
	'Kalau hari ini punya satu warna, warna apa?',
	'Apa yang kamu tunda lagi hari ini?',
	'Hal apa yang kamu syukuri tapi jarang kamu sebut?',
	'Apa yang kamu katakan hari ini dan langsung kamu sesali?',
	'Apa yang kamu lakukan hari ini yang tidak dilihat siapa pun?',
	'Apa yang kamu takutkan minggu ini, dan seberapa besar sebenarnya?',
	'Kapan terakhir kali kamu tertawa sampai lupa hal lain?',
	'Apa yang ingin kamu katakan ke dirimu tiga bulan lalu?',
	'Apa yang paling melelahkan hari ini, dan apakah itu sepadan?'
];

const PROMPT_EN = [
	'What small thing made you happy today?',
	'What did you avoid today, and why?',
	'Who did you think about today without telling them?',
	'What changed at home this week?',
	'What did you hear today that was unusual?',
	'If today had one colour, which one?',
	'What did you put off again today?',
	'What are you grateful for but rarely mention?',
	'What did you say today and immediately regret?',
	'What did you do today that nobody saw?',
	'What are you afraid of this week, and how big is it really?',
	'When did you last laugh hard enough to forget everything else?',
	'What would you tell yourself three months ago?',
	'What drained you most today, and was it worth it?'
];

/** Prompt harian deterministik dari tanggal, jadi sama di semua perangkat. */
export function promptHarian(iso: string, locale = 'id'): string {
	const list = locale === 'en' ? PROMPT_EN : PROMPT_ID;
	return list[seedFromString(`prompt:${iso}`) % list.length] as string;
}
