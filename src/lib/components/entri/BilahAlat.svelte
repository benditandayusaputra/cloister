<script lang="ts">
	/**
	 * Bilah alat editor. Semua tombol menghasilkan markdown, bukan HTML —
	 * editor ini sengaja bukan contenteditable, karena contenteditable berarti
	 * HTML mentah dari clipboard dan permukaan XSS yang jauh lebih lebar.
	 * Formatnya tetap markdown dari ujung ke ujung, dan render selalu lewat
	 * pipeline tersanitasi yang sama.
	 */

	export type AksiEditor =
		| 'tebal'
		| 'miring'
		| 'coret'
		| 'h2'
		| 'h3'
		| 'kutip'
		| 'daftar'
		| 'daftar-angka'
		| 'tautan'
		| 'garis';

	interface Props {
		nonaktif?: boolean;
		onaksi: (aksi: AksiEditor) => void;
	}

	let { nonaktif = false, onaksi }: Props = $props();

	interface Alat {
		aksi: AksiEditor;
		label: string;
		gaya?: string;
		judul: string;
	}

	// Dikelompokkan dengan pemisah visual: gaya teks, struktur, blok, sisipan.
	const GRUP: Alat[][] = [
		[
			{ aksi: 'tebal', label: 'B', gaya: 'font-weight:700', judul: 'Tebal (Ctrl+B)' },
			{ aksi: 'miring', label: 'I', gaya: 'font-style:italic', judul: 'Miring (Ctrl+I)' },
			{ aksi: 'coret', label: 'S', gaya: 'text-decoration:line-through', judul: 'Coret' }
		],
		[
			{ aksi: 'h2', label: 'H2', gaya: 'font-weight:600;font-size:0.78rem', judul: 'Judul bagian' },
			{ aksi: 'h3', label: 'H3', gaya: 'font-weight:600;font-size:0.78rem', judul: 'Anak judul' }
		],
		[
			{ aksi: 'kutip', label: '”', judul: 'Kutipan' },
			{ aksi: 'daftar', label: '•', judul: 'Daftar' },
			{ aksi: 'daftar-angka', label: '1.', gaya: 'font-size:0.78rem', judul: 'Daftar berangka' }
		],
		[
			{ aksi: 'tautan', label: '\u{1F517}', gaya: 'font-size:0.82rem', judul: 'Tautan (Ctrl+K)' },
			{ aksi: 'garis', label: '—', judul: 'Garis pemisah' }
		]
	];
</script>

<div
	role="toolbar"
	aria-label="Format tulisan"
	style="display:flex;flex-wrap:wrap;align-items:center;gap:2px;padding:4px;border:1px solid rgb(27 27 23 / 0.16);border-radius:var(--r-control);background:rgb(27 27 23 / 0.04);opacity:{nonaktif
		? 0.45
		: 1}"
>
	{#each GRUP as grup, gi (gi)}
		{#if gi > 0}
			<span
				aria-hidden="true"
				style="width:1px;height:20px;margin:0 4px;background:rgb(27 27 23 / 0.16)"
			></span>
		{/if}
		{#each grup as a (a.aksi)}
			<button
				type="button"
				title={a.judul}
				aria-label={a.judul}
				disabled={nonaktif}
				class="tbl-alat"
				style={a.gaya ?? ''}
				onmousedown={(e) => {
					// mousedown, bukan click: fokus dan seleksi textarea tidak boleh
					// sempat hilang sebelum aksinya dijalankan.
					e.preventDefault();
					if (!nonaktif) onaksi(a.aksi);
				}}>{a.label}</button
			>
		{/each}
	{/each}
</div>

<style>
	.tbl-alat {
		cursor: pointer;
		min-width: 34px;
		min-height: 34px;
		padding: 0 6px;
		border: none;
		border-radius: var(--r-control);
		background: transparent;
		color: var(--ink);
		font-family: var(--f-read);
		font-size: var(--text-base);
		line-height: 1;
	}
	.tbl-alat:hover:not(:disabled) {
		background: rgb(27 27 23 / 0.1);
	}
	.tbl-alat:active:not(:disabled) {
		background: rgb(27 27 23 / 0.16);
	}
	.tbl-alat:disabled {
		cursor: default;
	}
</style>
