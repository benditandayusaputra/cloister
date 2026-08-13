import { browser } from '$app/environment';

export type TemaId = 'flanel' | 'buku-tulis' | 'polaroid' | 'meja' | 'terminal';
export type Mode = 'malam' | 'siang';

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
		id: 'terminal',
		nama: 'Terminal',
		papan:
			'repeating-linear-gradient(0deg, rgb(255 255 255 / 0.035) 0 1px, transparent 1px 3px), linear-gradient(#050505,#050505)',
		kertas: ['transparent', 'transparent', 'transparent'],
		bayang: 'inset 0 0 0 1px #3E7F4E'
	}
];

const KEY_TEMA = 'cloister:tema';
const KEY_MODE = 'cloister:mode';
const KEY_SISTEM = 'cloister:ikut-sistem';

class TemaState {
	tema = $state<TemaId>('flanel');
	mode = $state<Mode>('malam');
	ikutSistem = $state(false);
	reduceMotion = $state(false);

	init() {
		if (!browser) return;
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
