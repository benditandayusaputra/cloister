<script lang="ts">
	import type { BarisBukti } from '$lib/server/bukti.ts';

	interface Props {
		baris: BarisBukti;
	}

	let { baris }: Props = $props();
	let bentang = $state(false);

	function potong(s: string, n = 56): string {
		return s.length <= n ? s : `${s.slice(0, n)}…`;
	}
</script>

<dl class="baris">
	{#each Object.entries(baris.baris) as [k, val] (k)}
		<dt>{k}</dt>
		<dd>
			{val === null
				? 'NULL'
				: typeof val === 'string'
					? potong(val, k === 'ciphertext' && bentang ? 1_000_000 : 56)
					: val}
		</dd>
	{/each}
</dl>

<button type="button" class="tbl-garis" style="align-self:flex-start;min-height:36px" onclick={() => (bentang = !bentang)}>
	{bentang ? 'Potong ciphertext' : 'Bentangkan ciphertext'}
</button>

<div class="ukuran">
	{#each Object.entries(baris.ukuran) as [k, val] (k)}
		<span>{k}: {val}</span>
	{/each}
</div>

<div class="kelompok">
	<span class="t-data" style="color:var(--ink-soft)">Kolom yang tidak ada di tabel</span>
	<div class="daftar">
		{#each baris.kolom_yang_tidak_ada as k (k)}
			<code class="coret">{k}</code>
		{/each}
	</div>
</div>

{#if baris.entry_tags.length}
	<div class="kelompok">
		<span class="t-data" style="color:var(--ink-soft)">entry_tags, token indeks buta, bukan nama tag</span>
		<div class="daftar">
			{#each baris.entry_tags as t (t)}
				<code>{t}</code>
			{/each}
		</div>
	</div>
{/if}

<style>
	.baris {
		margin: 0;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 12px;
		font-family: var(--f-data);
		font-size: 0.72rem;
		line-height: 1.6;
	}
	.baris dt {
		color: var(--ink-soft);
	}
	.baris dd {
		margin: 0;
		color: var(--ink);
		word-break: break-all;
	}
	.ukuran {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		font-family: var(--f-data);
		font-size: 0.7rem;
		color: var(--ink-soft);
	}
	.kelompok {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.daftar {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.daftar code {
		font-family: var(--f-data);
		font-size: 0.72rem;
		color: var(--ink-soft);
	}
	.coret {
		text-decoration: line-through;
	}
</style>
