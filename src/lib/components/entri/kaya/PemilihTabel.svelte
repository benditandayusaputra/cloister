<script lang="ts">
	interface Props {
		onpilih: (baris: number, kolom: number) => void;
	}

	let { onpilih }: Props = $props();

	const MAKS_BARIS = 8;
	const MAKS_KOLOM = 8;
	let baris = $state(3);
	let kolom = $state(3);

	const TEMPLAT: Array<{ label: string; baris: number; kolom: number }> = [
		{ label: 'Akun & kata sandi', baris: 4, kolom: 3 },
		{ label: 'Kebiasaan mingguan', baris: 4, kolom: 8 },
		{ label: 'Pengeluaran', baris: 5, kolom: 4 }
	];
</script>

<div class="kertas kertas-angkat muncul panel" role="dialog" aria-label="Sisipkan tabel">
	<span class="t-data t-data-ink">Ukuran tabel: {baris} baris × {kolom} kolom</span>
	<div
		class="grid"
		style="grid-template-columns:repeat({MAKS_KOLOM},18px)"
		role="grid"
		aria-label="Pilih ukuran tabel"
	>
		{#each Array.from({ length: MAKS_BARIS }) as _, r (r)}
			{#each Array.from({ length: MAKS_KOLOM }) as _, c (c)}
				<button
					type="button"
					role="gridcell"
					aria-label="{r + 1} baris, {c + 1} kolom"
					class="sel"
					class:nyala={r < baris && c < kolom}
					onmouseenter={() => {
						baris = r + 1;
						kolom = c + 1;
					}}
					onfocus={() => {
						baris = r + 1;
						kolom = c + 1;
					}}
					onmousedown={(e) => {
						e.preventDefault();
						onpilih(r + 1, c + 1);
					}}
				></button>
			{/each}
		{/each}
	</div>
	<div class="templat">
		{#each TEMPLAT as t (t.label)}
			<button
				type="button"
				class="tag-cip"
				onmousedown={(e) => {
					e.preventDefault();
					onpilih(t.baris, t.kolom);
				}}>{t.label}</button
			>
		{/each}
	</div>
</div>

<style>
	.panel {
		position: absolute;
		z-index: 30;
		top: calc(100% + 6px);
		left: 0;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: max-content;
		max-width: calc(100vw - 32px);
	}
	.grid {
		display: grid;
		gap: 3px;
	}
	.sel {
		width: 18px;
		height: 18px;
		padding: 0;
		border: 1px solid rgb(27 27 23 / 0.28);
		border-radius: 2px;
		background: transparent;
		cursor: pointer;
	}
	.sel.nyala {
		background: var(--accent);
		border-color: var(--accent);
	}
	.templat {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
</style>
