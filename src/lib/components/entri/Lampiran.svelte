<script lang="ts">
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import { tambahLampiran, hapusLampiran, urlLampiran } from '$lib/lampiran/simpan.ts';
	import { ukuranManusia } from '$lib/lampiran/gambar.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		entri: LocalEntry;
		onubah: (patch: Partial<LocalEntry>) => void;
	}

	let { entri, onubah }: Props = $props();
	let input = $state<HTMLInputElement | null>(null);
	let sibuk = $state(false);
	let urls = $state<Record<string, string>>({});

	$effect(() => {
		for (const a of entri.attachments) {
			if (a.kind !== 'image' || urls[a.id]) continue;
			void urlLampiran(a).then((u) => {
				if (u) urls = { ...urls, [a.id]: u };
			});
		}
	});

	async function pilih(e: Event) {
		const files = (e.currentTarget as HTMLInputElement).files;
		if (!files?.length) return;
		sibuk = true;
		try {
			const metas = [];
			for (const f of Array.from(files).slice(0, 6)) metas.push(await tambahLampiran(entri.id, f));
			onubah({ attachments: [...entri.attachments, ...metas] });
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			sibuk = false;
			if (input) input.value = '';
		}
	}

	async function buang(id: string) {
		await hapusLampiran(id);
		onubah({ attachments: entri.attachments.filter((a) => a.id !== id) });
	}
</script>

<div style="display:flex;align-items:flex-start;gap:var(--s-5);flex-wrap:wrap">
	<span class="t-data t-data-ink" style="padding-top:6px">{i18n.t.app.lampiran}</span>

	<div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:10px">
		<div style="display:flex;flex-wrap:wrap;gap:10px">
			{#each entri.attachments as a (a.id)}
				<div
					class="kertas"
					style="padding:6px;display:flex;flex-direction:column;gap:5px;width:120px;box-shadow:var(--sh-contact), var(--sh-pinned)"
				>
					{#if a.kind === 'image' && urls[a.id]}
						<img
							src={urls[a.id]}
							alt={a.alt ?? a.name}
							style="width:100%;height:76px;object-fit:cover"
						/>
					{:else}
						<div
							style="height:76px;display:grid;place-items:center;border:1px dashed rgb(27 27 23 / 0.28);font-family:var(--f-data);font-size:var(--text-2xs);color:var(--ink-soft)"
						>
							{a.kind}
						</div>
					{/if}
					<span
						style="font-family:var(--f-data);font-size:var(--text-2xs);color:var(--ink-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
						title={a.name}>{a.name}</span
					>
					<div style="display:flex;align-items:center;justify-content:space-between">
						<span style="font-family:var(--f-data);font-size:var(--text-2xs);color:var(--ink-faint)"
							>{ukuranManusia(a.size)}</span
						>
						<button
							type="button"
							aria-label="Hapus {a.name}"
							style="cursor:pointer;border:none;background:transparent;color:var(--danger);font-size:14px;line-height:1"
							onclick={() => buang(a.id)}>&times;</button
						>
					</div>
				</div>
			{/each}
		</div>

		<div>
			<input
				bind:this={input}
				type="file"
				accept="image/*,audio/*"
				multiple
				style="display:none"
				onchange={pilih}
			/>
			<button
				type="button"
				class="tag-cip"
				style="min-height:36px;padding:0 14px"
				disabled={sibuk}
				onclick={() => input?.click()}
			>
				{sibuk ? i18n.t.umum.memuat : '+ ' + i18n.t.app.lampiran}
			</button>
		</div>
	</div>
</div>
