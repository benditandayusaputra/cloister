import { browser } from '$app/environment';
import { id as kamusId, type Kamus } from '$lib/i18n/id.ts';
import { en as kamusEn } from '$lib/i18n/en.ts';

export type Locale = 'id' | 'en';

const KAMUS: Record<Locale, Kamus> = { id: kamusId, en: kamusEn };
const KEY = 'cloister:locale';

function detect(): Locale {
	if (!browser) return 'id';
	const saved = localStorage.getItem(KEY);
	if (saved === 'id' || saved === 'en') return saved;
	return navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en';
}

class I18nState {
	locale = $state<Locale>('id');

	init() {
		this.locale = detect();
	}

	set(next: Locale) {
		this.locale = next;
		if (browser) localStorage.setItem(KEY, next);
	}

	get t(): Kamus {
		return KAMUS[this.locale];
	}
}

export const i18n = new I18nState();
