<script lang="ts">
	interface Props {
		kata: string[];
	}
	let { kata }: Props = $props();
</script>

<div
	style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));border-top:1px dashed rgb(27 27 23 / 0.3);border-left:1px dashed rgb(27 27 23 / 0.3)"
>
	{#each kata as w, i (i)}
		<div
			style="display:flex;align-items:baseline;gap:9px;padding:11px 12px;border-right:1px dashed rgb(27 27 23 / 0.3);border-bottom:1px dashed rgb(27 27 23 / 0.3)"
		>
			<span style="font-family:var(--f-data);font-size:var(--text-2xs);color:var(--ink-soft);min-width:16px"
				>{i + 1}</span
			>
			<span data-testid="frasa-kata" style="font-family:var(--f-data);font-size:var(--text-base);color:var(--ink)">{w}</span>
		</div>
	{/each}
</div>
