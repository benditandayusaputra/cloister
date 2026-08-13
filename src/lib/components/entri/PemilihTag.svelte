<script lang="ts">
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		tags: string[];
		saran?: string[];
		onubah: (tags: string[]) => void;
	}

	let { tags, saran = [], onubah }: Props = $props();
	let draft = $state('');

	const tersedia = $derived(
		saran.filter((s) => !tags.includes(s) && s.includes(draft.trim().toLowerCase())).slice(0, 6)
	);

	function tambah(raw: string) {
		const t = raw.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32);
		if (!t || tags.includes(t) || tags.length >= 8) return;
		onubah([...tags, t]);
		draft = '';
	}
</script>

<div style="display:flex;flex-direction:column;gap:8px">
	<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
		{#each tags as t (t)}
			<span
				class="tag-cip"
				style="min-height:28px;padding:0 6px 0 10px;gap:6px;cursor:default;font-size:var(--text-xs)"
			>
				{t}
				<button
					type="button"
					aria-label="Hapus tag {t}"
					style="cursor:pointer;border:none;background:transparent;color:var(--ink-faint);font-size:14px;line-height:1;padding:0 4px"
					onclick={() => onubah(tags.filter((x) => x !== t))}>&times;</button
				>
			</span>
		{/each}

		{#if tags.length < 8}
			<input
				type="text"
				bind:value={draft}
				placeholder="+ {i18n.t.app.tag.toLowerCase()}"
				aria-label={i18n.t.app.tag}
				style="min-height:28px;width:120px;border:none;border-bottom:1px dashed rgb(27 27 23 / 0.35);background:transparent;font-family:var(--f-display);font-size:var(--text-xs);color:var(--ink);outline:none"
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ',') {
						e.preventDefault();
						tambah(draft);
					}
					if (e.key === 'Backspace' && draft === '' && tags.length)
						onubah(tags.slice(0, -1));
				}}
				onblur={() => tambah(draft)}
			/>
		{/if}
	</div>

	{#if draft.length > 0 && tersedia.length > 0}
		<div style="display:flex;flex-wrap:wrap;gap:5px">
			{#each tersedia as s (s)}
				<button type="button" class="tag-cip" onclick={() => tambah(s)}>{s}</button>
			{/each}
		</div>
	{/if}
</div>
