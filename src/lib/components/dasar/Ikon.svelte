<script lang="ts">
	import { IKON, type NamaIkon } from './ikon-peta.ts';

	interface Props {
		nama: NamaIkon;
		ukuran?: number | string;
		tebal?: number;
		kelas?: string;
	}

	let { nama, ukuran = 18, tebal = 1.8, kelas = '' }: Props = $props();
	const paths = $derived(IKON[nama] ?? []);
</script>

<svg
	viewBox="0 0 24 24"
	width={ukuran}
	height={ukuran}
	fill="none"
	stroke="currentColor"
	stroke-width={tebal}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
	class={kelas}
	style="flex-shrink:0;display:inline-block;vertical-align:middle"
>
	{#each paths as d (d)}
		<path {d} />
	{/each}
</svg>
