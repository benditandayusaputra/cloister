<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import TombolAlat from './TombolAlat.svelte';

	interface Props {
		editor: Editor;
		versi: number;
	}

	let { editor, versi }: Props = $props();

	const bisaGabung = $derived.by(() => {
		void versi;
		return editor.can().mergeCells();
	});
	const bisaPisah = $derived.by(() => {
		void versi;
		return editor.can().splitCell();
	});

	const c = () => editor.chain().focus();
</script>

<div class="menu muncul" role="toolbar" aria-label="Alat tabel">
	<span class="t-data t-data-ink" style="padding:0 6px">Tabel</span>
	<span class="pisah" aria-hidden="true"></span>
	<TombolAlat judul="Tambah baris di atas" ikon="baris" ontekan={() => c().addRowBefore().run()}>
		<span class="ket">+ atas</span>
	</TombolAlat>
	<TombolAlat judul="Tambah baris di bawah" ikon="baris" ontekan={() => c().addRowAfter().run()}>
		<span class="ket">+ bawah</span>
	</TombolAlat>
	<TombolAlat judul="Hapus baris" ikon="baris" bahaya ontekan={() => c().deleteRow().run()}>
		<span class="ket">hapus</span>
	</TombolAlat>
	<span class="pisah" aria-hidden="true"></span>
	<TombolAlat judul="Tambah kolom di kiri" ikon="kolom" ontekan={() => c().addColumnBefore().run()}>
		<span class="ket">+ kiri</span>
	</TombolAlat>
	<TombolAlat judul="Tambah kolom di kanan" ikon="kolom" ontekan={() => c().addColumnAfter().run()}>
		<span class="ket">+ kanan</span>
	</TombolAlat>
	<TombolAlat judul="Hapus kolom" ikon="kolom" bahaya ontekan={() => c().deleteColumn().run()}>
		<span class="ket">hapus</span>
	</TombolAlat>
	<span class="pisah" aria-hidden="true"></span>
	<TombolAlat judul="Baris judul" ontekan={() => c().toggleHeaderRow().run()}>
		<span class="ket">Baris judul</span>
	</TombolAlat>
	{#if bisaGabung}
		<TombolAlat judul="Gabung sel" ikon="gabung" ontekan={() => c().mergeCells().run()} />
	{/if}
	{#if bisaPisah}
		<TombolAlat judul="Pisah sel" ikon="gabung" ontekan={() => c().splitCell().run()} />
	{/if}
	<span class="pisah" aria-hidden="true"></span>
	<TombolAlat judul="Hapus tabel" ikon="sampah" bahaya ontekan={() => c().deleteTable().run()} />
</div>

<style>
	.menu {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px;
		padding: 3px 4px;
		border: 1px solid rgb(27 27 23 / 0.16);
		border-radius: var(--r-control);
		background: rgb(27 27 23 / 0.04);
	}
	.pisah {
		width: 1px;
		height: 18px;
		margin: 0 4px;
		background: rgb(27 27 23 / 0.16);
	}
	.ket {
		font-family: var(--f-data);
		font-size: 0.68rem;
		letter-spacing: 0.02em;
	}
</style>
