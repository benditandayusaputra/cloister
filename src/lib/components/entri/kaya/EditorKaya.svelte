<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import TextAlign from '@tiptap/extension-text-align';
	import { TaskItem, TaskList } from '@tiptap/extension-list';
	import { TableKit } from '@tiptap/extension-table';
	import { Placeholder } from '@tiptap/extensions';
	import { GambarKaya, UkuranFontMark } from '$lib/editor/ekstensi.ts';
	import { BATAS_BADAN, gambarKeDataUrl, muatKalauBerkas } from '$lib/editor/gambar.ts';
	import { bersihkanHtml } from '$lib/utils/markdown-aman.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import BilahAlatKaya from './BilahAlatKaya.svelte';
	import MenuTabel from './MenuTabel.svelte';
	import MenuGambar from './MenuGambar.svelte';

	interface Props {
		html: string;
		placeholder?: string;
		mobile?: boolean;
		tinggiMin?: number;
		onubah: (html: string) => void;
		onselesai?: () => void;
	}

	let { html, placeholder = '', mobile = false, tinggiMin = 380, onubah, onselesai }: Props = $props();

	let wadah = $state<HTMLDivElement | null>(null);
	let editor = $state.raw<Editor | null>(null);
	let bilah = $state<BilahAlatKaya | null>(null);
	let versi = $state(0);
	let lebarWadah = $state(0);
	let menyeret = $state(false);
	let terakhir = '';

	const diTabel = $derived.by(() => {
		void versi;
		return editor?.isActive('table') ?? false;
	});
	const diGambar = $derived.by(() => {
		void versi;
		return editor?.isActive('image') ?? false;
	});

	async function sisipBerkas(files: File[] | FileList, posisi?: number) {
		if (!editor) return;
		for (const f of Array.from(files).slice(0, 8)) {
			try {
				const { src, alt } = await gambarKeDataUrl(f);
				if (editor.getHTML().length + src.length > BATAS_BADAN) {
					toast.bahaya('Catatan hampir mencapai batas 1 MB. Kecilkan atau kurangi gambarnya.');
					return;
				}
				const rantai = editor.chain().focus();
				if (posisi !== undefined) rantai.insertContentAt(posisi, { type: 'image', attrs: { src, alt } }).run();
				else rantai.setImage({ src, alt }).run();
				posisi = undefined;
			} catch (err) {
				toast.bahaya((err as Error).message);
			}
		}
	}

	onMount(() => {
		if (!wadah) return;
		const ed = new Editor({
			element: wadah,
			extensions: [
				StarterKit.configure({
					heading: { levels: [1, 2, 3, 4, 5, 6] },
					link: { openOnClick: false, autolink: true, defaultProtocol: 'https' }
				}),
				TextAlign.configure({ types: ['heading', 'paragraph'] }),
				TaskList,
				TaskItem.configure({ nested: true }),
				TableKit.configure({ table: { resizable: true, cellMinWidth: 56, lastColumnResizable: false } }),
				GambarKaya,
				UkuranFontMark,
				Placeholder.configure({ placeholder })
			],
			content: html,
			editorProps: {
				attributes: {
					class: 'prosa isi',
					'aria-label': 'Isi tulisan',
					role: 'textbox',
					'aria-multiline': 'true'
				},
				transformPastedHTML: (h) => bersihkanHtml(h),
				handlePaste: (_view, event) => {
					const files = muatKalauBerkas(event.clipboardData?.items);
					if (!files.length) return false;
					event.preventDefault();
					void sisipBerkas(files);
					return true;
				},
				handleDrop: (view, event, _slice, dipindah) => {
					menyeret = false;
					if (dipindah) return false;
					const files = muatKalauBerkas(event.dataTransfer?.items);
					if (!files.length) return false;
					event.preventDefault();
					const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
					void sisipBerkas(files, pos);
					return true;
				},
				handleKeyDown: (_view, event) => {
					const mod = event.metaKey || event.ctrlKey;
					if (mod && event.key === 'Enter') {
						event.preventDefault();
						onselesai?.();
						return true;
					}
					if (mod && event.key === 'k') {
						event.preventDefault();
						bilah?.bukaTautan();
						return true;
					}
					return false;
				}
			},
			onUpdate: ({ editor: e }) => {
				const h = e.isEmpty ? '' : e.getHTML();
				terakhir = h;
				onubah(h);
			},
			onTransaction: () => {
				versi++;
			}
		});
		editor = ed;
		terakhir = html;
		const ro = new ResizeObserver(() => {
			lebarWadah = wadah?.clientWidth ?? 0;
		});
		ro.observe(wadah);
		return () => {
			ro.disconnect();
			ed.destroy();
			editor = null;
		};
	});

	$effect(() => {
		const h = html;
		const ed = editor;
		if (!ed || h === terakhir) return;
		untrack(() => {
			ed.commands.setContent(h, { emitUpdate: false });
			terakhir = h;
		});
	});

	export function sisipGambar(src: string, alt = '') {
		editor?.chain().focus().setImage({ src, alt }).run();
	}

	export function setKonten(h: string) {
		editor?.commands.setContent(h, { emitUpdate: true });
		editor?.commands.focus('end');
	}

	export function fokus() {
		editor?.commands.focus('end');
	}
</script>

<div class="editor-kaya" class:mobile class:menyeret style="--tinggi-min:{tinggiMin}px">
	<BilahAlatKaya bind:this={bilah} {editor} {versi} {mobile} onunggah={(f) => sisipBerkas(f)} />

	{#if editor && diGambar}
		<MenuGambar {editor} {versi} {lebarWadah} />
	{:else if editor && diTabel}
		<MenuTabel {editor} {versi} />
	{/if}

	<div
		bind:this={wadah}
		class="wadah"
		ondragover={(e) => {
			if (muatKalauBerkas(e.dataTransfer?.items).length || e.dataTransfer?.types.includes('Files')) {
				menyeret = true;
			}
		}}
		ondragleave={() => (menyeret = false)}
		ondrop={() => (menyeret = false)}
		role="presentation"
	></div>
	{#if menyeret}
		<div class="petunjuk-seret t-data" aria-hidden="true">Lepaskan untuk menyisipkan gambar</div>
	{/if}
</div>

<style>
	.editor-kaya {
		display: flex;
		flex-direction: column;
		gap: 8px;
		position: relative;
		min-width: 0;
	}
	.wadah {
		position: relative;
		border-radius: var(--r-control);
		transition: box-shadow var(--dur-fast) ease;
	}
	.menyeret .wadah {
		box-shadow: 0 0 0 2px var(--accent);
	}
	.petunjuk-seret {
		position: absolute;
		inset: auto 0 12px 0;
		text-align: center;
		color: var(--accent);
		pointer-events: none;
	}

	.editor-kaya :global(.isi) {
		min-height: var(--tinggi-min);
		outline: none;
		max-width: 100%;
		padding: 4px 2px 40px;
		caret-color: var(--accent);
	}
	.editor-kaya :global(.isi > *:first-child) {
		margin-top: 0;
	}
	.editor-kaya :global(.isi p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
		color: var(--ink-faint);
		font-style: italic;
	}
	.editor-kaya :global(.isi ::selection) {
		background: color-mix(in srgb, var(--accent) 22%, transparent);
	}

	.editor-kaya :global(.isi .tableWrapper) {
		overflow-x: auto;
		margin: 0 0 var(--s-4);
		padding-bottom: 4px;
	}
	.editor-kaya :global(.isi table) {
		display: table;
		table-layout: fixed;
		width: 100%;
		margin: 0;
		overflow: visible;
	}
	.editor-kaya :global(.isi td),
	.editor-kaya :global(.isi th) {
		position: relative;
		vertical-align: top;
		min-width: 56px;
	}
	.editor-kaya :global(.isi td > p),
	.editor-kaya :global(.isi th > p) {
		margin: 0;
	}
	.editor-kaya :global(.isi .selectedCell::after) {
		content: '';
		position: absolute;
		inset: 0;
		background: color-mix(in srgb, var(--accent) 16%, transparent);
		pointer-events: none;
	}
	.editor-kaya :global(.isi .column-resize-handle) {
		position: absolute;
		top: 0;
		bottom: -1px;
		right: -2px;
		width: 4px;
		background: var(--accent);
		pointer-events: none;
	}
	.editor-kaya :global(.isi.resize-cursor) {
		cursor: col-resize;
	}

	.editor-kaya :global(.isi img) {
		margin: 0;
		max-width: 100%;
		height: auto;
		cursor: default;
	}
	.editor-kaya :global(.isi .ProseMirror-selectednode img) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.editor-kaya :global(.isi div:has(> div > img)) {
		margin: var(--s-4) 0;
		max-width: 100%;
	}
	.editor-kaya :global(.isi div:has(> div > img[data-rata='tengah'])) {
		justify-content: center;
	}
	.editor-kaya :global(.isi div:has(> div > img[data-rata='kanan'])) {
		justify-content: flex-end;
	}
	.editor-kaya :global(.isi div:has(> img)) {
		max-width: 100%;
	}
	.editor-kaya :global(.isi [data-resize-handle]) {
		opacity: 0;
		transition: opacity var(--dur-fast) ease;
		z-index: 2;
	}
	.editor-kaya :global(.isi .ProseMirror-selectednode [data-resize-handle]),
	.editor-kaya :global(.isi div:hover > [data-resize-handle]) {
		opacity: 1;
	}
	.editor-kaya :global(.isi [data-resize-handle='left']),
	.editor-kaya :global(.isi [data-resize-handle='right']) {
		width: 8px;
		cursor: ew-resize;
	}
	.editor-kaya :global(.isi [data-resize-handle='left']::after),
	.editor-kaya :global(.isi [data-resize-handle='right']::after) {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 6px;
		height: 32px;
		border-radius: 3px;
		background: var(--accent);
		border: 1.5px solid #fff;
		transform: translate(-50%, -50%);
	}
	.editor-kaya :global(.isi [data-resize-handle='bottom-left']),
	.editor-kaya :global(.isi [data-resize-handle='bottom-right']) {
		width: 14px;
		height: 14px;
		background: var(--accent);
		border: 2px solid #fff;
		border-radius: 50%;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
	}
	.editor-kaya :global(.isi [data-resize-handle='bottom-left']) {
		cursor: nesw-resize;
		transform: translate(-50%, 50%);
	}
	.editor-kaya :global(.isi [data-resize-handle='bottom-right']) {
		cursor: nwse-resize;
		transform: translate(50%, 50%);
	}

	.editor-kaya :global(.isi ul[data-type='taskList']) {
		list-style: none;
		padding-left: 0;
	}
	.editor-kaya :global(.isi li[data-type='taskItem']) {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}
	.editor-kaya :global(.isi li[data-type='taskItem'] > label) {
		flex-shrink: 0;
		margin-top: 0.42em;
		display: inline-flex;
	}
	.editor-kaya :global(.isi li[data-type='taskItem'] > label input) {
		accent-color: var(--accent);
		width: 16px;
		height: 16px;
		cursor: pointer;
	}
	.editor-kaya :global(.isi li[data-type='taskItem'] > div) {
		flex: 1;
		min-width: 0;
	}
	.editor-kaya :global(.isi li[data-type='taskItem'][data-checked='true'] > div) {
		text-decoration: line-through;
		color: var(--ink-faint);
	}

	.editor-kaya :global(.isi .ProseMirror-gapcursor::after) {
		border-top: 1px solid var(--ink);
	}
	.editor-kaya :global(.isi a) {
		cursor: text;
	}
	.editor-kaya :global(.isi hr.ProseMirror-selectednode) {
		border-top-color: var(--accent);
	}
	.editor-kaya :global(.isi pre) {
		white-space: pre-wrap;
	}
</style>
