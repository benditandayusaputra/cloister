<script lang="ts">
	import { promptHarian } from '$lib/utils/prompt.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		iso: string;
		onpakai: (teks: string) => void;
	}

	let { iso, onpakai }: Props = $props();
	let tertutup = $state(false);

	const teks = $derived(promptHarian(iso, i18n.locale));
</script>

{#if !tertutup}
	<div
		class="kertas kertas-biru"
		style="padding:var(--s-4) var(--s-5);transform:rotate(-0.6deg);display:flex;align-items:center;gap:var(--s-4);flex-wrap:wrap"
	>
		<span class="t-data t-data-ink">Kalau bingung mulai</span>
		<span style="font-family:var(--f-hand);font-weight:600;font-size:1.05rem;color:var(--ink);flex:1;min-width:220px"
			>{teks}</span
		>
		<div style="display:flex;gap:8px">
			<button type="button" class="tag-cip" style="min-height:32px;padding:0 12px" onclick={() => onpakai(`> ${teks}\n\n`)}>
				Pakai
			</button>
			<button
				type="button"
				aria-label={i18n.t.app.tutup}
				style="cursor:pointer;border:none;background:transparent;color:var(--ink-faint);font-size:16px"
				onclick={() => (tertutup = true)}>&times;</button
			>
		</div>
	</div>
{/if}
