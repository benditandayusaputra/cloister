<script lang="ts">
	interface Props {
		tampil: boolean;
		atas: number;
		onbungkus: (awal: string, akhir: string) => void;
	}

	let { tampil, atas, onbungkus }: Props = $props();

	const alat = [
		{ label: 'B', gaya: 'font-weight:600', a: '**', b: '**', judul: 'Tebal' },
		{ label: 'I', gaya: 'font-style:italic', a: '_', b: '_', judul: 'Miring' },
		{ label: '”', gaya: '', a: '\n> ', b: '', judul: 'Kutip' },
		{ label: 'H', gaya: 'font-weight:600', a: '\n## ', b: '', judul: 'Judul' },
		{ label: '•', gaya: '', a: '\n- ', b: '', judul: 'Daftar' }
	];
</script>

{#if tampil}
	<div
		style="position:absolute;left:50%;top:{atas}px;z-index:5;transform:translateX(-50%);display:flex;gap:2px;padding:5px;background:#22262A;border-radius:var(--r-control);box-shadow:4px 8px 18px -4px rgb(0 0 0 / 0.6)"
	>
		{#each alat as a (a.label)}
			<button
				type="button"
				title={a.judul}
				aria-label={a.judul}
				style="cursor:pointer;min-width:36px;min-height:34px;border:none;background:transparent;color:#E4E9E3;font-family:var(--f-read);font-size:var(--text-base);{a.gaya}"
				onmousedown={(e) => {
					e.preventDefault();
					onbungkus(a.a, a.b);
				}}>{a.label}</button
			>
		{/each}
	</div>
{/if}
