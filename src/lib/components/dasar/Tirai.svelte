<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		terbuka: boolean;
		label: string;
		bawah?: boolean;
		ontutup: () => void;
		children: Snippet;
	}

	let { terbuka, label, bawah = false, ontutup, children }: Props = $props();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') ontutup();
	}
</script>

<svelte:window onkeydown={terbuka ? onKey : undefined} />

{#if terbuka}
	<div
		class="tirai"
		style={bawah ? 'display:flex;align-items:flex-end;justify-content:center;padding:0' : ''}
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && ontutup()}
	>
		<div role="dialog" aria-modal="true" aria-label={label} style={bawah ? 'width:100%' : ''}>
			{@render children()}
		</div>
	</div>
{/if}
