<script lang="ts">
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { pinOf } from '$lib/utils/kertas.ts';
	import { skorSandi } from '$lib/utils/sandi.ts';

	interface Props {
		sandi: string;
	}
	let { sandi }: Props = $props();

	const skor = $derived(skorSandi(sandi));
	const warna = $derived(pinOf(Math.max(1, skor)));
</script>

<div style="display:flex;align-items:center;gap:var(--s-4);flex-wrap:wrap">
	<div style="display:flex;gap:9px" aria-hidden="true">
		{#each [1, 2, 3, 4, 5] as n (n)}
			<span
				style="width:13px;height:13px;border-radius:var(--r-pin);background:{n <= skor
					? warna
					: 'rgb(27 27 23 / 0.14)'};box-shadow:{n <= skor
					? '1px 1px 0 rgb(0 0 0 / 0.25)'
					: 'inset 1px 1px 2px rgb(0 0 0 / 0.2)'}"
			></span>
		{/each}
	</div>
	<span class="t-data t-data-ink">{i18n.t.auth.kekuatan[skor]}</span>
</div>
