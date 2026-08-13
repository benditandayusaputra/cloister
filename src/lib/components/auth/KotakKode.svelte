<script lang="ts">
	interface Props {
		nilai: string[];
		gelap?: boolean;
		onubah: (v: string[]) => void;
		onlengkap?: (kode: string) => void;
	}

	let { nilai, gelap = false, onubah, onlengkap }: Props = $props();
	let kotak: HTMLInputElement[] = [];

	function isi(i: number, raw: string) {
		const angka = raw.replace(/\D/g, '');
		if (angka.length > 1) {
			const next = [...nilai];
			for (let k = 0; k < angka.length && i + k < next.length; k++) next[i + k] = angka[k] as string;
			onubah(next);
			const akhir = Math.min(i + angka.length, nilai.length - 1);
			kotak[akhir]?.focus();
			if (next.every(Boolean)) onlengkap?.(next.join(''));
			return;
		}
		const next = [...nilai];
		next[i] = angka;
		onubah(next);
		if (angka && i < nilai.length - 1) kotak[i + 1]?.focus();
		if (next.every(Boolean)) onlengkap?.(next.join(''));
	}

	function tombol(i: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !nilai[i] && i > 0) kotak[i - 1]?.focus();
		if (e.key === 'ArrowLeft' && i > 0) kotak[i - 1]?.focus();
		if (e.key === 'ArrowRight' && i < nilai.length - 1) kotak[i + 1]?.focus();
	}
</script>

<div style="display:flex;gap:8px;flex-wrap:wrap">
	{#each nilai as v, i (i)}
		<input
			bind:this={kotak[i]}
			type="text"
			inputmode="numeric"
			maxlength="6"
			value={v}
			aria-label="Angka ke-{i + 1}"
			style="width:48px;height:{gelap
				? 58
				: 56}px;text-align:center;border:none;border-bottom:2px solid {v
				? gelap
					? 'var(--pin-brass)'
					: 'var(--accent)'
				: gelap
					? 'var(--garis-ruang-kuat)'
					: 'rgb(27 27 23 / 0.45)'};background:{gelap
				? 'var(--isi-ruang)'
				: 'transparent'};font-family:var(--f-data);font-size:var(--text-lg);color:{gelap
				? 'var(--ink-on-board)'
				: 'var(--ink)'};outline:none"
			oninput={(e) => isi(i, (e.currentTarget as HTMLInputElement).value)}
			onkeydown={(e) => tombol(i, e)}
		/>
	{/each}
</div>
