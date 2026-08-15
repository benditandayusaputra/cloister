<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import TombolAlat from './TombolAlat.svelte';

	interface Props {
		editor: Editor;
		versi: number;
		lebarWadah: number;
	}

	let { editor, versi, lebarWadah }: Props = $props();

	const rata = $derived.by(() => {
		void versi;
		return (editor.getAttributes('image').rata as string | null) ?? 'kiri';
	});
	const alt = $derived.by(() => {
		void versi;
		return (editor.getAttributes('image').alt as string | null) ?? '';
	});

	const c = () => editor.chain().focus();

	function ukuran(persen: number) {
		const lebar = Math.max(80, Math.round((lebarWadah || 600) * persen));
		c().updateAttributes('image', { width: lebar, height: null }).run();
	}

	function ubahAlt(nilai: string) {
		c().updateAttributes('image', { alt: nilai.slice(0, 160) }).run();
	}
</script>

<div class="menu muncul" role="toolbar" aria-label="Alat gambar">
	<span class="t-data t-data-ink" style="padding:0 6px">Gambar</span>
	<span class="pisah" aria-hidden="true"></span>
	<TombolAlat judul="Rata kiri" ikon="rata-kiri" aktif={rata === 'kiri'} ontekan={() => c().setRataGambar(null).run()} />
	<TombolAlat judul="Rata tengah" ikon="rata-tengah" aktif={rata === 'tengah'} ontekan={() => c().setRataGambar('tengah').run()} />
	<TombolAlat judul="Rata kanan" ikon="rata-kanan" aktif={rata === 'kanan'} ontekan={() => c().setRataGambar('kanan').run()} />
	<span class="pisah" aria-hidden="true"></span>
	{#each [0.25, 0.5, 0.75, 1] as p (p)}
		<TombolAlat judul="Lebar {p * 100}%" ontekan={() => ukuran(p)}>
			<span class="ket">{p * 100}%</span>
		</TombolAlat>
	{/each}
	<span class="pisah" aria-hidden="true"></span>
	<input
		class="alt"
		type="text"
		placeholder="Keterangan gambar"
		aria-label="Keterangan gambar"
		value={alt}
		oninput={(e) => ubahAlt((e.currentTarget as HTMLInputElement).value)}
	/>
	<TombolAlat judul="Hapus gambar" ikon="sampah" bahaya ontekan={() => c().deleteSelection().run()} />
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
	}
	.alt {
		flex: 1;
		min-width: 120px;
		border: 1px solid rgb(27 27 23 / 0.2);
		border-radius: var(--r-control);
		background: transparent;
		color: var(--ink);
		font-family: var(--f-read);
		font-size: 0.8rem;
		padding: 5px 8px;
	}
</style>
