<script lang="ts">
	import type { Benang } from './tata-letak.ts';

	interface Props {
		benang: Benang[];
		lebar: number;
		tinggi: number;
	}

	let { benang, lebar, tinggi }: Props = $props();
</script>

<svg
	viewBox="0 0 {lebar} {tinggi}"
	width={lebar}
	height={tinggi}
	aria-hidden="true"
	style="position:absolute;left:0;top:0;z-index:1;pointer-events:none;max-width:100%"
>
	{#each benang as t, i (i)}
		<path
			d={t.d}
			fill="none"
			stroke="rgb(0 0 0 / 0.45)"
			stroke-width="3"
			stroke-linecap="round"
			transform="translate(1,3)"
			style="--len:{t.len};stroke-dasharray:{t.len};animation:bd-thread 260ms var(--ease-lift) {t.delay}ms both"
		></path>
	{/each}
	{#each benang as t, i (i)}
		<path
			d={t.d}
			fill="none"
			stroke="var(--thread)"
			stroke-width="1.5"
			stroke-linecap="round"
			style="--len:{t.len};stroke-dasharray:{t.len};animation:bd-thread 260ms var(--ease-lift) {t.delay}ms both"
		></path>
	{/each}
</svg>
