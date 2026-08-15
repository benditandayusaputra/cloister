<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import TombolAlat from './TombolAlat.svelte';
	import PemilihEmoji from './PemilihEmoji.svelte';
	import PemilihTabel from './PemilihTabel.svelte';
	import Ikon from '$components/dasar/Ikon.svelte';
	import { UKURAN_FONT, type UkuranFont } from '$lib/editor/ekstensi.ts';

	interface Props {
		editor: Editor | null;
		versi: number;
		mobile?: boolean;
		onunggah: (files: FileList) => void;
	}

	let { editor, versi, mobile = false, onunggah }: Props = $props();

	type Popover = 'emoji' | 'tabel' | 'tautan' | null;
	let popover = $state<Popover>(null);
	let hrefTautan = $state('');
	let inputBerkas = $state<HTMLInputElement | null>(null);
	let inputTautan = $state<HTMLInputElement | null>(null);

	const aktif = $derived((nama: string, attrs?: Record<string, unknown>) => {
		void versi;
		return editor?.isActive(nama, attrs) ?? false;
	});
	const bisa = $derived((cek: (e: Editor) => boolean) => {
		void versi;
		return editor ? cek(editor) : false;
	});

	const blokAktif = $derived.by(() => {
		void versi;
		if (!editor) return 'p';
		for (const level of [1, 2, 3, 4, 5, 6] as const) {
			if (editor.isActive('heading', { level })) return `h${level}`;
		}
		return 'p';
	});
	const ukuranAktif = $derived.by(() => {
		void versi;
		const u = editor?.getAttributes('ukuranFont').ukuran as number | undefined;
		return u ?? 0;
	});
	const rataAktif = $derived.by(() => {
		void versi;
		if (!editor) return 'left';
		if (editor.isActive('image')) {
			const r = editor.getAttributes('image').rata as string | null;
			return r === 'tengah' ? 'center' : r === 'kanan' ? 'right' : 'left';
		}
		for (const a of ['center', 'right', 'justify']) if (editor.isActive({ textAlign: a })) return a;
		return 'left';
	});

	function jalankan(fn: (e: Editor) => void) {
		if (!editor) return;
		fn(editor);
	}

	function pilihBlok(nilai: string) {
		jalankan((e) => {
			const c = e.chain().focus();
			if (nilai === 'p') c.setParagraph().run();
			else c.setHeading({ level: Number(nilai[1]) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
		});
	}

	function pilihUkuran(nilai: number) {
		jalankan((e) => {
			if (nilai === 0) e.chain().focus().unsetUkuranFont().run();
			else e.chain().focus().setUkuranFont(nilai as UkuranFont).run();
		});
	}

	function rata(arah: 'left' | 'center' | 'right' | 'justify') {
		jalankan((e) => {
			if (e.isActive('image')) {
				const peta = { left: 'kiri', center: 'tengah', right: 'kanan', justify: null } as const;
				e.chain().focus().setRataGambar(peta[arah]).run();
				return;
			}
			e.chain().focus().setTextAlign(arah).run();
		});
	}

	export function bukaTautan() {
		if (!editor) return;
		hrefTautan = (editor.getAttributes('link').href as string | undefined) ?? '';
		popover = popover === 'tautan' ? null : 'tautan';
		queueMicrotask(() => inputTautan?.focus());
	}

	function pasangTautan() {
		jalankan((e) => {
			const url = hrefTautan.trim();
			if (!url) {
				e.chain().focus().extendMarkRange('link').unsetLink().run();
			} else {
				const lengkap = /^(https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`;
				e.chain().focus().extendMarkRange('link').setLink({ href: lengkap }).run();
			}
		});
		popover = null;
	}

	function sisipTabel(baris: number, kolom: number) {
		jalankan((e) => e.chain().focus().insertTable({ rows: baris, cols: kolom, withHeaderRow: true }).run());
		popover = null;
	}

	function sisipEmoji(emo: string) {
		jalankan((e) => e.chain().focus().insertContent(emo).run());
	}

	function pilihBerkas(ev: Event) {
		const input = ev.currentTarget as HTMLInputElement;
		if (input.files?.length) onunggah(input.files);
		input.value = '';
	}

	export function tutupPopover() {
		popover = null;
	}
</script>

<div class="bilah" class:mobile role="toolbar" aria-label="Format tulisan">
	<div class="grup">
		<TombolAlat judul="Urungkan (Ctrl+Z)" ikon="undo" nonaktif={!bisa((e) => e.can().undo())} ontekan={() => jalankan((e) => e.chain().focus().undo().run())} />
		<TombolAlat judul="Ulangi (Ctrl+Shift+Z)" ikon="redo" nonaktif={!bisa((e) => e.can().redo())} ontekan={() => jalankan((e) => e.chain().focus().redo().run())} />
	</div>

	<span class="pisah" aria-hidden="true"></span>

	<div class="grup">
		<label class="pilih" title="Gaya paragraf">
			<Ikon nama="heading" ukuran={15} />
			<select
				aria-label="Gaya paragraf"
				value={blokAktif}
				onmousedown={(e) => e.stopPropagation()}
				onchange={(e) => pilihBlok((e.currentTarget as HTMLSelectElement).value)}
			>
				<option value="p">Paragraf</option>
				<option value="h1">Judul 1</option>
				<option value="h2">Judul 2</option>
				<option value="h3">Judul 3</option>
				<option value="h4">Judul 4</option>
				<option value="h5">Judul 5</option>
				<option value="h6">Judul 6</option>
			</select>
		</label>
		<label class="pilih" title="Ukuran huruf">
			<Ikon nama="ukuran-teks" ukuran={15} />
			<select
				aria-label="Ukuran huruf"
				value={String(ukuranAktif)}
				onmousedown={(e) => e.stopPropagation()}
				onchange={(e) => pilihUkuran(Number((e.currentTarget as HTMLSelectElement).value))}
			>
				<option value="0">Normal</option>
				{#each UKURAN_FONT as u (u)}
					<option value={String(u)}>{u} px</option>
				{/each}
			</select>
		</label>
	</div>

	<span class="pisah" aria-hidden="true"></span>

	<div class="grup">
		<TombolAlat judul="Tebal (Ctrl+B)" ikon="tebal" aktif={aktif('bold')} ontekan={() => jalankan((e) => e.chain().focus().toggleBold().run())} />
		<TombolAlat judul="Miring (Ctrl+I)" ikon="miring" aktif={aktif('italic')} ontekan={() => jalankan((e) => e.chain().focus().toggleItalic().run())} />
		<TombolAlat judul="Garis bawah (Ctrl+U)" ikon="garis-bawah" aktif={aktif('underline')} ontekan={() => jalankan((e) => e.chain().focus().toggleUnderline().run())} />
		<TombolAlat judul="Coret" ikon="coret" aktif={aktif('strike')} ontekan={() => jalankan((e) => e.chain().focus().toggleStrike().run())} />
		<TombolAlat judul="Kode sebaris" ikon="kode" aktif={aktif('code')} ontekan={() => jalankan((e) => e.chain().focus().toggleCode().run())} />
	</div>

	<span class="pisah" aria-hidden="true"></span>

	<div class="grup">
		<TombolAlat judul="Rata kiri" ikon="rata-kiri" aktif={rataAktif === 'left'} ontekan={() => rata('left')} />
		<TombolAlat judul="Rata tengah" ikon="rata-tengah" aktif={rataAktif === 'center'} ontekan={() => rata('center')} />
		<TombolAlat judul="Rata kanan" ikon="rata-kanan" aktif={rataAktif === 'right'} ontekan={() => rata('right')} />
	</div>

	<span class="pisah" aria-hidden="true"></span>

	<div class="grup">
		<TombolAlat judul="Daftar" ikon="daftar" aktif={aktif('bulletList')} ontekan={() => jalankan((e) => e.chain().focus().toggleBulletList().run())} />
		<TombolAlat judul="Daftar berangka" ikon="daftar-angka" aktif={aktif('orderedList')} ontekan={() => jalankan((e) => e.chain().focus().toggleOrderedList().run())} />
		<TombolAlat judul="Daftar centang" ikon="centang" aktif={aktif('taskList')} ontekan={() => jalankan((e) => e.chain().focus().toggleTaskList().run())} />
		<TombolAlat judul="Kutipan" ikon="kutip" aktif={aktif('blockquote')} ontekan={() => jalankan((e) => e.chain().focus().toggleBlockquote().run())} />
		<TombolAlat judul="Blok kode" ikon="blok-kode" aktif={aktif('codeBlock')} ontekan={() => jalankan((e) => e.chain().focus().toggleCodeBlock().run())} />
		<TombolAlat judul="Garis pemisah" ikon="garis" ontekan={() => jalankan((e) => e.chain().focus().setHorizontalRule().run())} />
	</div>

	<span class="pisah" aria-hidden="true"></span>

	<div class="grup" style="position:relative">
		<TombolAlat judul="Tautan (Ctrl+K)" ikon="tautan" aktif={aktif('link')} ontekan={bukaTautan} />
		<TombolAlat judul="Unggah gambar" ikon="gambar" ontekan={() => inputBerkas?.click()} />
		<TombolAlat judul="Sisipkan tabel" ikon="tabel" aktif={popover === 'tabel'} ontekan={() => (popover = popover === 'tabel' ? null : 'tabel')} />
		<TombolAlat judul="Emoji" ikon="emoji" aktif={popover === 'emoji'} ontekan={() => (popover = popover === 'emoji' ? null : 'emoji')} />

		{#if popover === 'emoji'}
			<PemilihEmoji onpilih={sisipEmoji} />
		{:else if popover === 'tabel'}
			<PemilihTabel onpilih={sisipTabel} />
		{:else if popover === 'tautan'}
			<form
				class="kertas kertas-angkat muncul tautan"
				onsubmit={(e) => {
					e.preventDefault();
					pasangTautan();
				}}
			>
				<input
					bind:this={inputTautan}
					type="text"
					inputmode="url"
					placeholder="https://…"
					aria-label="Alamat tautan"
					bind:value={hrefTautan}
					onkeydown={(e) => {
						if (e.key === 'Escape') popover = null;
					}}
				/>
				<button type="submit" class="tbl" style="min-height:32px;padding:0 12px">Pasang</button>
				{#if aktif('link')}
					<button
						type="button"
						class="tbl-papan"
						style="min-height:32px;padding:0 12px"
						onclick={() => {
							hrefTautan = '';
							pasangTautan();
						}}>Lepas</button
					>
				{/if}
			</form>
		{/if}
	</div>

	<input
		bind:this={inputBerkas}
		type="file"
		accept="image/*"
		multiple
		style="display:none"
		aria-hidden="true"
		tabindex="-1"
		onchange={pilihBerkas}
	/>
</div>

<style>
	.bilah {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px;
		padding: 4px;
		border: 1px solid rgb(27 27 23 / 0.16);
		border-radius: var(--r-control);
		background: rgb(27 27 23 / 0.04);
		position: relative;
	}
	.bilah.mobile {
		flex-wrap: nowrap;
		overflow-x: auto;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
	}
	.bilah.mobile::-webkit-scrollbar {
		display: none;
	}
	.grup {
		display: flex;
		align-items: center;
		gap: 1px;
		flex-shrink: 0;
	}
	.pisah {
		width: 1px;
		height: 20px;
		margin: 0 4px;
		background: rgb(27 27 23 / 0.16);
		flex-shrink: 0;
	}
	.pilih {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 0 4px 0 6px;
		min-height: 32px;
		border-radius: var(--r-control);
		color: var(--ink);
	}
	.pilih:hover {
		background: rgb(27 27 23 / 0.1);
	}
	.pilih select {
		border: none;
		background: transparent;
		color: var(--ink);
		font-family: var(--f-read);
		font-size: 0.82rem;
		padding: 4px 2px;
		cursor: pointer;
		max-width: 110px;
	}
	.pilih select:focus {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
	.tautan {
		position: absolute;
		z-index: 30;
		top: calc(100% + 6px);
		left: 0;
		display: flex;
		gap: 6px;
		padding: 8px;
		width: min(360px, calc(100vw - 32px));
	}
	.tautan input {
		flex: 1;
		min-width: 0;
		border: 1px solid rgb(27 27 23 / 0.24);
		border-radius: var(--r-control);
		padding: 6px 8px;
		font-family: var(--f-data);
		font-size: 0.8rem;
		background: transparent;
		color: var(--ink);
	}
</style>
