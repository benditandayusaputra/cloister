import { browser } from '$app/environment';

export type TemaId =
	| 'flanel'
	| 'buku-tulis'
	| 'polaroid'
	| 'meja'
	| 'batik'
	| 'kamar-gelap'
	| 'senja'
	| 'terminal';
export type Mode = 'malam' | 'siang';
export type Gaya = 'flat' | 'liquid-glass' | 'line-art';

export interface TemaDef {
	id: TemaId;
	nama: string;
	papan: string;
	kertas: [string, string, string];
	bayang: string;
}

export const TEMA: TemaDef[] = [
	{
		id: 'flanel',
		nama: 'Flanel',
		papan: 'radial-gradient(130% 100% at 12% 0%, #35443C 0%, #2A3630 42%, #1F2924 100%)',
		kertas: ['#EDE7D6', '#DCC79B', '#C2D4D8'],
		bayang: '1px 1px 0 rgb(0 0 0 / 0.3), 3px 5px 8px -2px rgb(0 0 0 / 0.45)'
	},
	{
		id: 'buku-tulis',
		nama: 'Buku tulis',
		papan:
			'repeating-linear-gradient(0deg, rgb(255 255 255 / 0.05) 0 1px, transparent 1px 7px), linear-gradient(160deg, #26365E, #17223C)',
		kertas: ['#F1EEE2', '#F1EEE2', '#F1EEE2'],
		bayang: '1px 1px 0 rgb(0 0 0 / 0.3)'
	},
	{
		id: 'polaroid',
		nama: 'Polaroid',
		papan:
			'repeating-linear-gradient(0deg, rgb(0 0 0 / 0.18) 0 11px, transparent 11px 13px), linear-gradient(160deg, #4A2E28, #2B1A16)',
		kertas: ['#FAF8F2', '#FAF8F2', '#FAF8F2'],
		bayang: '2px 3px 6px -1px rgb(0 0 0 / 0.5)'
	},
	{
		id: 'meja',
		nama: 'Meja',
		papan:
			'repeating-linear-gradient(93deg, rgb(0 0 0 / 0.16) 0 3px, transparent 3px 16px), linear-gradient(160deg, #4C3826, #241A12)',
		kertas: ['#E4D4AE', '#C79C6A', '#E4D4AE'],
		bayang: '1px 2px 0 rgb(0 0 0 / 0.3), 4px 7px 10px -3px rgb(0 0 0 / 0.5)'
	},
	{
		id: 'batik',
		nama: 'Batik',
		papan:
			'repeating-linear-gradient(135deg, rgb(255 255 255 / 0.055) 0 2px, transparent 2px 15px), linear-gradient(160deg, #263457, #16203A)',
		kertas: ['#F3EAD3', '#E7D3A4', '#D3DEE8'],
		bayang: '1px 1px 0 rgb(0 0 0 / 0.28), 4px 7px 12px -3px rgb(0 0 0 / 0.45)'
	},
	{
		id: 'kamar-gelap',
		nama: 'Kamar gelap',
		papan:
			'radial-gradient(120% 90% at 15% 0%, rgb(214 84 60 / 0.14), transparent 60%), linear-gradient(160deg, #2A181C, #1A0E11)',
		kertas: ['#F5F2EA', '#EAE4D6', '#F0DCDA'],
		bayang: '1px 1px 0 rgb(0 0 0 / 0.4), 4px 7px 14px -3px rgb(0 0 0 / 0.6)'
	},
	{
		id: 'senja',
		nama: 'Senja',
		papan:
			'radial-gradient(120% 70% at 50% 108%, rgb(224 122 62 / 0.30), transparent 62%), linear-gradient(168deg, #432A40 0%, #5A3145 52%, #77402F 100%)',
		kertas: ['#F6E9D4', '#EFD9AE', '#F2D4C4'],
		bayang: '1px 1px 0 rgb(0 0 0 / 0.26), 4px 7px 12px -3px rgb(0 0 0 / 0.45)'
	},
	{
		id: 'terminal',
		nama: 'Terminal',
		papan:
			'repeating-linear-gradient(0deg, rgb(255 255 255 / 0.035) 0 1px, transparent 1px 3px), linear-gradient(#050505,#050505)',
		kertas: ['transparent', 'transparent', 'transparent'],
		bayang: 'inset 0 0 0 1px #3E7F4E'
	}
];

const KEY_TEMA = 'cloister:tema';
const KEY_GAYA = 'cloister:gaya';
const KEY_MODE = 'cloister:mode';
const KEY_SISTEM = 'cloister:ikut-sistem';

class TemaState {
	tema = $state<TemaId>('flanel');
	gaya = $state<Gaya>('flat');
	mode = $state<Mode>('malam');
	ikutSistem = $state(false);
	reduceMotion = $state(false);

	init() {
		if (!browser) return;
		const g = localStorage.getItem(KEY_GAYA);
		if (g === 'liquid-glass' || g === 'line-art') this.gaya = g;
		document.documentElement.dataset.gaya = this.gaya;
		const t = localStorage.getItem(KEY_TEMA) as TemaId | null;
		if (t && TEMA.some((x) => x.id === t)) this.tema = t;
		const m = localStorage.getItem(KEY_MODE);
		if (m === 'malam' || m === 'siang') this.mode = m;
		this.ikutSistem = localStorage.getItem(KEY_SISTEM) === '1';

		const mqMotion = matchMedia('(prefers-reduced-motion: reduce)');
		this.reduceMotion = mqMotion.matches;
		mqMotion.addEventListener('change', (e) => (this.reduceMotion = e.matches));

		const mqLight = matchMedia('(prefers-color-scheme: light)');
		if (this.ikutSistem) this.mode = mqLight.matches ? 'siang' : 'malam';
		mqLight.addEventListener('change', (e) => {
			if (this.ikutSistem) this.mode = e.matches ? 'siang' : 'malam';
		});

		this.apply();
	}

	apply() {
		if (!browser) return;
		const root = document.documentElement;
		root.dataset.theme = this.tema;
		root.dataset.mode = this.mode;
	}

	setGaya(g: Gaya) {
		this.gaya = g;
		if (!browser) return;
		localStorage.setItem(KEY_GAYA, g);
		document.documentElement.dataset.gaya = g;
	}

	setTema(t: TemaId) {
		this.tema = t;
		if (browser) localStorage.setItem(KEY_TEMA, t);
		this.apply();
	}

	setMode(m: Mode) {
		this.mode = m;
		if (browser) localStorage.setItem(KEY_MODE, m);
		this.apply();
	}

	toggleMode() {
		this.setMode(this.mode === 'malam' ? 'siang' : 'malam');
	}

	setIkutSistem(on: boolean) {
		this.ikutSistem = on;
		if (browser) {
			localStorage.setItem(KEY_SISTEM, on ? '1' : '0');
			if (on) this.setMode(matchMedia('(prefers-color-scheme: light)').matches ? 'siang' : 'malam');
		}
	}

	get modeLabel() {
		return this.mode === 'malam' ? 'Malam' : 'Siang';
	}
}

export const tema = new TemaState();
