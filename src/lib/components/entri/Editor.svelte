<script lang="ts">
	import BilahAlat from './BilahAlat.svelte';
	import PemilihMood from './PemilihMood.svelte';
	import PemilihTag from './PemilihTag.svelte';
	import Lampiran from './Lampiran.svelte';
	import Konteks from './Konteks.svelte';
	import PromptHarian from './PromptHarian.svelte';
	import AmanMarkdown from '$components/markdown/AmanMarkdown.svelte';
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import { labelTanggal, parseIso, namaHari } from '$lib/utils/tanggal.ts';
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

	let area = $state<HTMLTextAreaElement | null>(null);
	let seleksi = $state(false);
	let pratinjau = $state(false);

	const hari = $derived(parseIso(entri.entryDate).day);
	const tanggalPanjang = $derived(labelTanggal(entri.entryDate, i18n.locale));

	function bungkus(awal: string, akhir: string) {
		if (!area) return;
		const { selectionStart: s, selectionEnd: e, value } = area;
		const pilih = value.slice(s, e);
		const teks = value.slice(0, s) + awal + pilih + akhir + value.slice(e);
		onubah({ body: teks });
		queueMicrotask(() => {
			area?.focus();
			area?.setSelectionRange(s + awal.length, s + awal.length + pilih.length);
		});
	}

	function periksaSeleksi() {
		seleksi = !!area && area.selectionStart !== area.selectionEnd;
	}

	function pintasan(e: KeyboardEvent) {
		if (!(e.metaKey || e.ctrlKey)) return;
		if (e.key === 'b') {
			e.preventDefault();
			bungkus('**', '**');
		}
		if (e.key === 'i') {
			e.preventDefault();
			bungkus('_', '_');
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			onselesai();
		}
	}
</script>

<div style="position:relative;display:flex;flex-direction:column;gap:var(--s-4)">
	<div
		class="kertas kertas-angkat"
		style="position:relative;padding:{mobile
			? 'var(--s-5)'
			: 'var(--s-8) var(--s-8) var(--s-6)'};display:flex;flex-direction:column;gap:var(--s-4)"
	>
		<BilahAlat tampil={seleksi && !pratinjau} atas={mobile ? 60 : 96} onbungkus={bungkus} />

		<header
			style="display:flex;align-items:flex-start;gap:{mobile
				? 'var(--s-4)'
				: 'var(--s-6)'};flex-wrap:wrap;padding-bottom:var(--s-5);border-bottom:1px solid rgb(27 27 23 / 0.16)"
		>
			<span class="t-hand" style="font-size:{mobile ? '3.2rem' : 'var(--text-3xl)'};line-height:0.8"
				>{hari}</span
			>
			<div style="display:flex;flex-direction:column;gap:8px;padding-top:6px">
				<span class="t-judul" style="color:var(--ink);font-size:{mobile ? '1.2rem' : 'var(--text-lg)'}"
					>{tanggalPanjang}</span
				>
				<span class="t-data t-data-ink">{simpanLabel}</span>
			</div>
			<div style="margin-left:auto;display:flex;gap:var(--s-2);align-items:center">
				<button
					type="button"
					class="tag-cip"
					style="min-height:32px;padding:0 12px"
					aria-pressed={pratinjau}
					onclick={() => (pratinjau = !pratinjau)}
				>
					{pratinjau ? 'Tulis' : 'Pratinjau'}
				</button>
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

		{#if entri.body.trim().length === 0 && !pratinjau}
			<PromptHarian
				iso={entri.entryDate}
				onpakai={(t) => {
					onubah({ body: t });
					queueMicrotask(() => area?.focus());
				}}
			/>
		{/if}

		{#if pratinjau}
			<div style="min-height:{mobile ? 300 : 380}px;max-width:62ch">
				<AmanMarkdown md={entri.body} />
			</div>
		{:else}
			<textarea
				bind:this={area}
				value={entri.body}
				placeholder={i18n.t.app.placeholderTulis}
				aria-label="Isi tulisan"
				style="width:100%;max-width:62ch;min-height:{mobile
					? 300
					: 380}px;border:none;outline:none;resize:vertical;background:transparent;font-family:var(--f-read);font-size:var(--text-md);line-height:1.72;color:var(--ink)"
				oninput={(e) => onubah({ body: (e.currentTarget as HTMLTextAreaElement).value })}
				onselect={periksaSeleksi}
				onkeyup={periksaSeleksi}
				onkeydown={pintasan}
				onblur={() => (seleksi = false)}
			></textarea>
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

			<Lampiran {entri} {onubah} />

			<Konteks {entri} {onubah} />
		</div>
	</div>

	<div style="display:flex;gap:var(--s-3);flex-wrap:wrap;align-items:center">
		<button type="button" class="tbl" onclick={onselesai}>{i18n.t.app.tancapkan}</button>
		<button type="button" class="tbl-papan" onclick={onhapus}>{i18n.t.app.hapus}</button>
		<span class="t-data" style="margin-left:auto">{i18n.t.app.autosave}</span>
	</div>
</div>
