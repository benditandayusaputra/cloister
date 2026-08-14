<script lang="ts">
	import { tema } from '$lib/state/tema.svelte.ts';

	interface Props {
		ringkas?: boolean;
	}
	let { ringkas = false }: Props = $props();

	const malam = $derived(tema.mode === 'malam');
</script>

<button
	type="button"
	class={ringkas ? 'tbl-ikon' : 'tbl-papan'}
	aria-label="Ganti mode terang gelap"
	onclick={() => tema.toggleMode()}
>
	<svg
		viewBox="0 0 24 24"
		width="15"
		height="15"
		fill="none"
		stroke="currentColor"
		stroke-width="1.9"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		style="flex:none"
	>
		{#if malam}
			<path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a8.5 8.5 0 1 0 10.8 10.8z" />
		{:else}
			<circle cx="12" cy="12" r="4.2" />
			<path
				d="M12 2.4v2.3M12 19.3v2.3M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.4 12h2.3M19.3 12h2.3M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"
			/>
		{/if}
	</svg>
	{#if !ringkas}{tema.modeLabel}{/if}
</button>
