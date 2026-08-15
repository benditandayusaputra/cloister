<script lang="ts">
	import Ikon from '$components/dasar/Ikon.svelte';
	import type { NamaIkon } from '$components/dasar/ikon-peta.ts';
	import type { Snippet } from 'svelte';

	interface Props {
		judul: string;
		ikon?: NamaIkon;
		aktif?: boolean;
		nonaktif?: boolean;
		bahaya?: boolean;
		lebar?: string;
		ontekan: () => void;
		children?: Snippet;
	}

	let {
		judul,
		ikon,
		aktif = false,
		nonaktif = false,
		bahaya = false,
		lebar,
		ontekan,
		children
	}: Props = $props();
</script>

<button
	type="button"
	class="tbl-alat"
	class:aktif
	class:bahaya
	title={judul}
	aria-label={judul}
	aria-pressed={aktif}
	disabled={nonaktif}
	style={lebar ? `min-width:${lebar}` : ''}
	onmousedown={(e) => {
		e.preventDefault();
		if (!nonaktif) ontekan();
	}}
>
	{#if ikon}
		<Ikon nama={ikon} ukuran={17} />
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>

<style>
	.tbl-alat {
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-width: 32px;
		min-height: 32px;
		padding: 0 6px;
		border: none;
		border-radius: var(--r-control);
		background: transparent;
		color: var(--ink);
		font-family: var(--f-read);
		font-size: 0.82rem;
		line-height: 1;
		flex-shrink: 0;
		transition:
			background var(--dur-fast, 120ms) ease,
			color var(--dur-fast, 120ms) ease;
	}
	.tbl-alat:hover:not(:disabled) {
		background: rgb(27 27 23 / 0.1);
	}
	.tbl-alat:active:not(:disabled) {
		background: rgb(27 27 23 / 0.16);
	}
	.tbl-alat.aktif {
		background: var(--accent);
		color: var(--accent-ink, #fff);
	}
	.tbl-alat.bahaya {
		color: var(--danger);
	}
	.tbl-alat:disabled {
		cursor: default;
		opacity: 0.4;
	}
</style>
