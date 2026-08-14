import { browser } from '$app/environment';

const KEY = 'cloister:ikon-map';

class IkonMapState {
	peta = $state<Record<string, string>>({});

	muat() {
		if (!browser) return;
		try {
			this.peta = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>;
		} catch {
			this.peta = {};
		}
	}

	ikon(bulan: number): string | null {
		return this.peta[String(bulan).padStart(2, '0')] ?? null;
	}

	set(bulan: number, emoji: string | null) {
		const kunci = String(bulan).padStart(2, '0');
		const baru = { ...this.peta };
		if (emoji) baru[kunci] = emoji;
		else delete baru[kunci];
		this.peta = baru;
		if (browser) localStorage.setItem(KEY, JSON.stringify(baru));
	}
}

export const ikonMap = new IkonMapState();
