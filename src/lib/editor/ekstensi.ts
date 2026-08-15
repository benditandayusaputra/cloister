import { Mark, mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';

export const UKURAN_FONT = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48] as const;
export type UkuranFont = (typeof UKURAN_FONT)[number];

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		ukuranFont: {
			setUkuranFont: (ukuran: UkuranFont) => ReturnType;
			unsetUkuranFont: () => ReturnType;
		};
		gambarKaya: {
			setRataGambar: (rata: 'kiri' | 'tengah' | 'kanan' | null) => ReturnType;
		};
	}
}

export const UkuranFontMark = Mark.create({
	name: 'ukuranFont',

	addAttributes() {
		return {
			ukuran: {
				default: null,
				parseHTML: (el) => {
					const n = Number(el.getAttribute('data-ukuran'));
					return (UKURAN_FONT as readonly number[]).includes(n) ? n : null;
				},
				renderHTML: (attrs) => (attrs.ukuran ? { 'data-ukuran': String(attrs.ukuran) } : {})
			}
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-ukuran]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes(HTMLAttributes), 0];
	},

	addCommands() {
		return {
			setUkuranFont:
				(ukuran) =>
				({ commands }) =>
					commands.setMark(this.name, { ukuran }),
			unsetUkuranFont:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name)
		};
	}
});

function angkaPositif(nilai: string | number | null | undefined): number | null {
	const n = Number(nilai);
	return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

const UKURAN_GAMBAR = {
	default: null,
	parseHTML: (el: HTMLElement) => angkaPositif(el.getAttribute('width')),
	renderHTML: (attrs: Record<string, unknown>) =>
		attrs.width ? { width: String(angkaPositif(attrs.width as number)) } : {}
};

export const GambarKaya = Image.extend({
	name: 'image',

	addAttributes() {
		return {
			...this.parent?.(),
			width: UKURAN_GAMBAR,
			height: {
				default: null,
				parseHTML: (el: HTMLElement) => angkaPositif(el.getAttribute('height')),
				renderHTML: (attrs: Record<string, unknown>) =>
					attrs.height ? { height: String(angkaPositif(attrs.height as number)) } : {}
			},
			rata: {
				default: null,
				parseHTML: (el) => {
					const r = el.getAttribute('data-rata');
					return r === 'kiri' || r === 'tengah' || r === 'kanan' ? r : null;
				},
				renderHTML: (attrs) => (attrs.rata ? { 'data-rata': attrs.rata } : {})
			}
		};
	},

	addCommands() {
		return {
			...this.parent?.(),
			setRataGambar:
				(rata) =>
				({ commands }) =>
					commands.updateAttributes(this.name, { rata })
		};
	},

	addNodeView() {
		const induk = this.parent?.();
		if (!induk) return null;
		return (props) => {
			const nv = induk(props);
			const el = nv.dom instanceof HTMLElement ? nv.dom.querySelector('img') : null;
			const asli = nv.update?.bind(nv);
			nv.update = (node, decorations, innerDecorations) => {
				const hasil = asli ? asli(node, decorations, innerDecorations) : true;
				if (hasil !== false && el && node.type.name === this.name) {
					el.style.width = node.attrs.width ? `${node.attrs.width}px` : '';
					el.style.height = node.attrs.height ? `${node.attrs.height}px` : '';
				}
				return hasil;
			};
			return nv;
		};
	}
}).configure({
	allowBase64: true,
	inline: false,
	resize: {
		enabled: true,
		directions: ['left', 'right', 'bottom-left', 'bottom-right'],
		minWidth: 80,
		minHeight: 40,
		alwaysPreserveAspectRatio: true
	}
});
