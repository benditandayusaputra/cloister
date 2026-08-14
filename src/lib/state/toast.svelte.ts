export interface ToastItem {
	id: number;
	text: string;
	nada: 'biasa' | 'bahaya';
}

let seq = 0;

class ToastState {
	items = $state<ToastItem[]>([]);

	show(text: string, nada: ToastItem['nada'] = 'biasa', ms = 3200) {
		const id = ++seq;
		this.items = [...this.items, { id, text, nada }];
		setTimeout(() => this.dismiss(id), ms);
	}

	bahaya(text: string) {
		this.show(text, 'bahaya', 4500);
	}

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toast = new ToastState();
