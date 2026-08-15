<script lang="ts">
	import { untrack } from 'svelte';
	import EditorKaya from './kaya/EditorKaya.svelte';
	import PemilihMood from './PemilihMood.svelte';
	import PemilihTag from './PemilihTag.svelte';
	import Lampiran from './Lampiran.svelte';
	import Konteks from './Konteks.svelte';
	import PromptHarian from './PromptHarian.svelte';
	import AmanMarkdown from '$components/markdown/AmanMarkdown.svelte';
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import type { AttachmentMeta } from '$crypto/protocol.ts';
	import { urlLampiran } from '$lib/lampiran/simpan.ts';
	import { labelTanggal, parseIso } from '$lib/utils/tanggal.ts';
	import {
		adalahHtml,
		bersihkanHtml,
		kembalikanLampiran,
		markdownKeHtml,
		resolusiLampiran
	} from '$lib/utils/markdown-aman.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		entri: LocalEntry;
		saranTag?: string[];
		simpanLabel: string;
		mobile?: boolean;
		onubah: (patch: Partial<LocalEntry>) => void;
		onselesai: () => void;
		onhapus: () => void;
	}

	let {
		entri,
		saranTag = [],
		simpanLabel,
		mobile = false,
		onubah,
		onselesai,
		onhapus
	}: Props = $props();

	type ModeEditor = 'tulis' | 'preview';
	let mode = $state<ModeEditor>('tulis');
	let kaya = $state<EditorKaya | null>(null);

	const hari = $derived(parseIso(entri.entryDate).day);
	const tanggalPanjang = $derived(labelTanggal(entri.entryDate, i18n.locale));

	let urls = $state<Record<string, string>>({});
	$effect(() => {
		const ada = new Set(entri.attachments.map((a) => a.id));
		const usang = Object.keys(urls).filter((id) => !ada.has(id));
		if (usang.length) {
			const sisa = { ...urls };
			for (const id of usang) delete sisa[id];
			urls = sisa;
			return;
		}
		for (const a of entri.attachments) {
			if (a.kind !== 'image' || urls[a.id]) continue;
			void urlLampiran(a).then((u) => {
				if (u) urls = { ...urls, [a.id]: u };
			});
		}
	});

	const kunciMuat = $derived(`${entri.id}|${Object.keys(urls).sort().join(',')}`);
	const htmlMuat = $derived.by(() => {
		void kunciMuat;
		return untrack(() => {
			const body = entri.body;
			const html = adalahHtml(body) ? body : markdownKeHtml(body);
			return resolusiLampiran(html, urls);
		});
	});

	function simpanHtml(html: string) {
		onubah({ body: bersihkanHtml(kembalikanLampiran(html, urls)) });
	}

	function sisipGambar(a: AttachmentMeta) {
		const src = urls[a.id];
		if (!src) return;
		const alt = (a.alt ?? a.name.replace(/\.[a-z0-9]+$/i, '')).replace(/[<>"\n]/g, ' ');
		kaya?.sisipGambar(src, alt);
	}

	function pakaiPrompt(teks: string) {
		kaya?.setKonten(markdownKeHtml(teks));
	}

	const MODE_LABEL: Array<{ id: ModeEditor; label: string }> = [
		{ id: 'tulis', label: 'Tulis' },
		{ id: 'preview', label: 'Preview' }
	];
</script>

<div style="position:relative;display:flex;flex-direction:column;gap:var(--s-4)">
	<div
		class="kertas kertas-angkat"
		style="position:relative;padding:{mobile
			? 'var(--s-5) var(--s-4)'
			: 'var(--s-8) var(--s-8) var(--s-6)'};display:flex;flex-direction:column;gap:var(--s-4)"
	>
		<header
			style="display:flex;align-items:flex-start;gap:{mobile
				? 'var(--s-4)'
				: 'var(--s-6)'};flex-wrap:wrap;padding-bottom:var(--s-4);border-bottom:1px solid rgb(27 27 23 / 0.16)"
		>
			<span class="t-hand" style="font-size:{mobile ? '3.2rem' : 'var(--text-3xl)'};line-height:0.8"
				>{hari}</span
			>
			<div style="display:flex;flex-direction:column;gap:8px;padding-top:6px;min-width:0">
				<span class="t-judul" style="color:var(--ink);font-size:{mobile ? '1.2rem' : 'var(--text-lg)'}"
					>{tanggalPanjang}</span
				>
				<span class="t-data t-data-ink">{simpanLabel}</span>
			</div>
			<div
				role="tablist"
				aria-label="Mode editor"
				style="margin-left:auto;display:flex;gap:2px;padding:3px;border:1px solid rgb(27 27 23 / 0.16);border-radius:var(--r-control)"
			>
				{#each MODE_LABEL as m (m.id)}
					<button
						type="button"
						role="tab"
						aria-selected={mode === m.id}
						class="tag-cip {mode === m.id ? 'tag-cip-aktif' : ''}"
						style="min-height:32px;padding:0 12px;border:none"
						onclick={() => (mode = m.id)}
					>
						{m.label}
					</button>
				{/each}
			</div>
		</header>

		<input
			type="text"
			value={entri.title}
			placeholder="Judul (opsional)"
			aria-label="Judul"
			maxlength="160"
			style="border:none;background:transparent;outline:none;font-family:var(--f-display);font-variation-settings:'wdth' 85;font-weight:600;letter-spacing:-0.02em;font-size:var(--text-lg);color:var(--ink);width:100%"
			oninput={(e) => onubah({ title: (e.currentTarget as HTMLInputElement).value })}
		/>

		{#if entri.body.trim().length === 0 && mode === 'tulis'}
			<PromptHarian iso={entri.entryDate} onpakai={pakaiPrompt} />
		{/if}

		<div style="display:{mode === 'tulis' ? 'block' : 'none'};min-width:0">
			<EditorKaya
				bind:this={kaya}
				html={htmlMuat}
				placeholder={i18n.t.app.placeholderTulis}
				{mobile}
				tinggiMin={mobile ? 300 : 380}
				onubah={simpanHtml}
				{onselesai}
			/>
		</div>

		{#if mode === 'preview'}
			<div style="min-height:{mobile ? 300 : 380}px;min-width:0" aria-label="Preview tulisan">
				{#if entri.body.trim()}
					<AmanMarkdown md={entri.body} {urls} />
				{:else}
					<p class="t-baca" style="color:var(--ink-faint)">Belum ada yang bisa di-preview.</p>
				{/if}
			</div>
		{/if}

		<div
			style="padding-top:var(--s-4);border-top:1px solid rgb(27 27 23 / 0.16);display:flex;flex-direction:column;gap:var(--s-4)"
		>
			<div style="display:flex;align-items:center;gap:var(--s-5);flex-wrap:wrap">
				<span class="t-data t-data-ink">{i18n.t.app.mood}</span>
				<PemilihMood nilai={entri.mood} onpilih={(m) => onubah({ mood: m })} />
			</div>

			<div style="display:flex;align-items:flex-start;gap:var(--s-5);flex-wrap:wrap">
				<span class="t-data t-data-ink" style="padding-top:6px">{i18n.t.app.tag}</span>
				<div style="flex:1;min-width:200px">
					<PemilihTag tags={entri.tags} saran={saranTag} onubah={(tags) => onubah({ tags })} />
				</div>
			</div>

			<Lampiran {entri} {urls} onsisip={sisipGambar} {onubah} />

			<Konteks {entri} {onubah} />
		</div>
	</div>

	<div style="display:flex;gap:var(--s-3);flex-wrap:wrap;align-items:center">
		<button type="button" class="tbl" onclick={onselesai}>{i18n.t.app.tancapkan}</button>
		<button type="button" class="tbl-papan" onclick={onhapus}>{i18n.t.app.hapus}</button>
		<span class="t-data" style="margin-left:auto">{i18n.t.app.autosave}</span>
	</div>
</div>
