<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		warna?: 'bone' | 'manila' | 'buram' | 'biru' | 'mawar';
		angkat?: boolean;
		indeks?: boolean;
		rot?: number;
		padding?: string;
		kelas?: string;
		gaya?: string;
		children: Snippet;
	}

	let {
		warna = 'bone',
		angkat = false,
		indeks = false,
		rot = 0,
		padding = 'var(--s-6)',
		kelas = '',
		gaya = '',
		children
	}: Props = $props();

	const warnaKelas: Record<string, string> = {
		bone: '',
		manila: 'kertas-manila',
		buram: 'kertas-buram',
		biru: 'kertas-biru',
		mawar: 'kertas-mawar'
	};
</script>

<div
	class="kertas {warnaKelas[warna]} {angkat ? 'kertas-angkat' : ''} {indeks
		? 'kartu-indeks'
		: ''} {kelas}"
	style="padding:{padding};{rot ? `transform:rotate(${rot}deg);` : ''}{gaya}"
>
	{@render children()}
</div>
