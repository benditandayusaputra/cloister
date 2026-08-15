<script lang="ts">
	import { goto } from '$app/navigation';
	import { entriesRepo } from '$lib/db/local/repo.ts';
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import { geometri } from '$lib/utils/kertas.ts';
	import { parseIso } from '$lib/utils/tanggal.ts';
	import { highlight } from '$lib/utils/search.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { pinOf, moodLabel } from '$lib/utils/kertas.ts';
	import { entri } from '$lib/state/entri.svelte.ts';
	import { plainTeks } from '$lib/utils/teks.ts';
	import { tema } from '$lib/state/tema.svelte.ts';

	interface Props {
		terbuka: boolean;
		ontutup: () => void;
	}

	let { terbuka, ontutup }: Props = $props();

	let kueri = $state('');
	let filterTag = $state<string | null>(null);
	let filterMood = $state<number | null>(null);
	let hasil = $state<LocalEntry[]>([]);
	let medan = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (terbuka) queueMicrotask(() => medan?.focus());
	});

	$effect(() => {
		const q = kueri;
		const tag = filterTag;
		const mood = filterMood;
		if (!terbuka) return;
		void (async () => {
			let rows = q.trim().length >= 2 ? await entriesRepo.search(q) : await entriesRepo.all();
			if (tag) rows = rows.filter((e) => e.tags.includes(tag));
			if (mood !== null) rows = rows.filter((e) => e.mood === mood);
			hasil = rows
				.sort((a, b) => b.entryDate.localeCompare(a.entryDate))
				.slice(0, q.trim() || tag || mood !== null ? 60 : 0);
		})();
	});

	function buka(e: LocalEntry) {
		const { year, month } = parseIso(e.entryDate);
		ontutup();
		void goto(`/app/${year}/${String(month).padStart(2, '0')}/${e.entryDate.slice(8)}?e=${e.id}`);
	}
</script>

{#if terbuka}
	<div
		class="tirai"
		style="background:rgb(10 12 13 / 0.86);padding:var(--s-8) var(--s-5)"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && ontutup()}
	>
		<div
			role="dialog"
			aria-label={i18n.t.app.cariPlaceholder}
			style="max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:var(--s-5)"
		>
			<input
				bind:this={medan}
				type="text"
				bind:value={kueri}
				placeholder={i18n.t.app.cariPlaceholder}
				aria-label={i18n.t.app.cariPlaceholder}
				style="width:100%;min-height:64px;border:none;border-bottom:2px solid var(--pin-brass);background:transparent;color:var(--ink-on-board);font-family:var(--f-display);font-variation-settings:'wdth' 85;font-weight:600;font-size:var(--text-xl);letter-spacing:-0.02em;outline:none"
				onkeydown={(e) => e.key === 'Escape' && ontutup()}
			/>

			<span class="t-data">{i18n.t.app.cariLokal}</span>

			<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
				<span class="t-data">{i18n.t.app.mood}</span>
				{#each [1, 2, 3, 4, 5] as m (m)}
					<button
						type="button"
						class="tbl-papan {filterMood === m ? 'tbl-papan-aktif' : ''}"
						style="min-height:32px;padding:0 10px;display:inline-flex;align-items:center;gap:7px"
						title={moodLabel(m, i18n.locale)}
						aria-pressed={filterMood === m}
						onclick={() => (filterMood = filterMood === m ? null : m)}
					>
						<span
							aria-hidden="true"
							style="width:11px;height:11px;border-radius:var(--r-pin);background:{pinOf(m)}"
						></span>
						{moodLabel(m, i18n.locale)}
					</button>
				{/each}
			</div>

			{#if entri.tagTersedia.length > 0}
				<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
					<span class="t-data">{i18n.t.app.tag}</span>
					{#each entri.tagTersedia.slice(0, 14) as t (t)}
						<button
							type="button"
							class="tbl-papan {filterTag === t ? 'tbl-papan-aktif' : ''}"
							style="min-height:32px;padding:0 10px"
							onclick={() => (filterTag = filterTag === t ? null : t)}>{t}</button
						>
					{/each}
				</div>
			{/if}

			<div style="display:flex;flex-wrap:wrap;gap:var(--s-4)">
				{#each hasil as r, i (r.id)}
					{@const g = geometri(r.entryDate + r.id.slice(-4), tema.reduceMotion)}
					<button
						type="button"
						class="kartu-papan"
						style="--kertas:{g.paper};width:184px;transform:rotate({g.rot}deg);animation:bd-drop var(--dur-base) var(--ease-pin) {Math.min(
							i * 45,
							500
						)}ms both"
						onclick={() => buka(r)}
					>
						<span class="t-hand" style="font-size:1.9rem;line-height:0.85">{parseIso(r.entryDate).day}</span>
						<span
							style="display:block;font-family:var(--f-read);font-size:0.9rem;line-height:1.45;color:var(--ink-soft);overflow:hidden;max-height:4.35em"
							>{highlight(r.title ? r.title + '. ' + plainTeks(r.body) : plainTeks(r.body), kueri)}</span
						>
					</button>
				{/each}
			</div>

			{#if kueri.trim().length >= 2 && hasil.length === 0}
				<span class="t-data">{i18n.t.umum.tidakAda}</span>
			{/if}

			<button type="button" class="tbl-papan" style="align-self:flex-start" onclick={ontutup}>
				{i18n.t.app.tutup}
			</button>
		</div>
	</div>
{/if}
