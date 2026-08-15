<script lang="ts">
	import BilahAlat, { type AksiEditor } from './BilahAlat.svelte';
	import PemilihMood from './PemilihMood.svelte';
	import PemilihTag from './PemilihTag.svelte';
	import Lampiran from './Lampiran.svelte';
	import Konteks from './Konteks.svelte';
	import PromptHarian from './PromptHarian.svelte';
	import PembangunTabel from './PembangunTabel.svelte';
	import AmanMarkdown from '$components/markdown/AmanMarkdown.svelte';
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import type { AttachmentMeta } from '$crypto/protocol.ts';
	import { urlLampiran } from '$lib/lampiran/simpan.ts';
	import { labelTanggal, parseIso } from '$lib/utils/tanggal.ts';
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

	type ModeEditor = 'tulis' | 'berdampingan' | 'preview';
	let mode = $state<ModeEditor>('tulis');
	let emojiTerbuka = $state(false);
	let tabelTerbuka = $state(false);
	let posisiTabel = 0;

	const EMOJI = [
		'😀','😄','😅','😂','🥲','😊','😍','🤩','😎','🤔','😴','😭','😤','🥳','🤗','🙃',
		'❤️','🧡','💛','💚','💙','💜','🖤','✨','⭐','🔥','🌱','🌸','🌧️','☀️','🌙','⛰️',
		'☕','🍜','🍰','🎂','🎉','🎧','📚','✏️','📌','📷','🚲','✈️','🏠','💼','💡','✅'
	];
	// Layar sempit tidak muat dua kolom; jatuhkan ke mode tulis.
	$effect(() => {
		if (mobile && mode === 'berdampingan') mode = 'tulis';
	});

	const menulis = $derived(mode !== 'preview');
	const hari = $derived(parseIso(entri.entryDate).day);
	const tanggalPanjang = $derived(labelTanggal(entri.entryDate, i18n.locale));

	/** Blob URL lampiran gambar terdekripsi, untuk preview dan galeri. */
	let urls = $state<Record<string, string>>({});
	$effect(() => {
		for (const a of entri.attachments) {
			if (a.kind !== 'image' || urls[a.id]) continue;
			void urlLampiran(a).then((u) => {
				if (u) urls = { ...urls, [a.id]: u };
			});
		}
	});

	/* ---------------------------------------------------------------- *
	 * Operasi teks. Semuanya bekerja pada nilai textarea dan
	 * mengembalikan kursor ke tempat yang masuk akal.
	 * ---------------------------------------------------------------- */

	function tulis(teks: string, s: number, e: number) {
		onubah({ body: teks });
		queueMicrotask(() => {
			area?.focus();
			area?.setSelectionRange(s, e);
		});
	}

	/** Bungkus seleksi; tanpa seleksi, sisipkan placeholder lalu pilih. */
	function bungkus(awal: string, akhir: string, placeholder = '') {
		if (!area) return;
		const { selectionStart: s, selectionEnd: e, value } = area;
		const pilih = value.slice(s, e) || placeholder;
		const teks = value.slice(0, s) + awal + pilih + akhir + value.slice(e);
		tulis(teks, s + awal.length, s + awal.length + pilih.length);
	}

	/** Bubuhkan atau cabut awalan pada setiap baris yang tersentuh seleksi. */
	function awalanBaris(awalan: string) {
		if (!area) return;
		const { selectionStart: s, selectionEnd: e, value } = area;
		const mulai = value.lastIndexOf('\n', s - 1) + 1;
		const akhirBaris = value.indexOf('\n', e);
		const selesai = akhirBaris === -1 ? value.length : akhirBaris;

		const baris = value.slice(mulai, selesai).split('\n');
		const semuaPunya = baris.every((b) => b.startsWith(awalan) || b.trim() === '');
		const baru = baris
			.map((b) => {
				if (b.trim() === '') return b;
				return semuaPunya ? b.slice(awalan.length) : awalan + b;
			})
			.join('\n');

		const teks = value.slice(0, mulai) + baru + value.slice(selesai);
		tulis(teks, mulai, mulai + baru.length);
	}

	function daftarAngka() {
		if (!area) return;
		const { selectionStart: s, selectionEnd: e, value } = area;
		const mulai = value.lastIndexOf('\n', s - 1) + 1;
		const akhirBaris = value.indexOf('\n', e);
		const selesai = akhirBaris === -1 ? value.length : akhirBaris;

		const baris = value.slice(mulai, selesai).split('\n');
		let n = 0;
		const baru = baris.map((b) => (b.trim() === '' ? b : `${++n}. ${b}`)).join('\n');
		const teks = value.slice(0, mulai) + baru + value.slice(selesai);
		tulis(teks, mulai, mulai + baru.length);
	}

	function sisipBlok(blok: string) {
		if (!area) return;
		const { selectionStart: s, value } = area;
		const perluBaris = s > 0 && value[s - 1] !== '\n' ? '\n' : '';
		const teks = value.slice(0, s) + perluBaris + blok + value.slice(s);
		const kursor = s + perluBaris.length + blok.length;
		tulis(teks, kursor, kursor);
	}

	function sisipDiPosisi(blok: string, posisi: number) {
		if (!area) return;
		const value = area.value;
		const perluBaris = posisi > 0 && value[posisi - 1] !== '\n' ? '\n' : '';
		const teks = value.slice(0, posisi) + perluBaris + blok + value.slice(posisi);
		const kursor = posisi + perluBaris.length + blok.length;
		tulis(teks, kursor, kursor);
	}

	function lanjutkanDaftar(e: KeyboardEvent) {
		if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || !area) return;
		const { selectionStart: s, value } = area;
		const mulai = value.lastIndexOf('\n', s - 1) + 1;
		const barisIni = value.slice(mulai, s);
		const m = /^(\s*)([-*+]\s\[[ x]\]\s|[-*+]\s|(\d+)\.\s|>\s)(.*)$/.exec(barisIni);
		if (!m) return;
		e.preventDefault();
		const [, indent, penanda, angka, isi] = m;
		if (!isi?.trim()) {
			const teks = value.slice(0, mulai) + value.slice(s);
			tulis(teks, mulai, mulai);
			return;
		}
		let berikut = penanda ?? '';
		if (angka) berikut = `${Number(angka) + 1}. `;
		if (/\[x\]/.test(berikut)) berikut = berikut.replace('[x]', '[ ]');
		const sisipan = `\n${indent ?? ''}${berikut}`;
		const teks = value.slice(0, s) + sisipan + value.slice(area.selectionEnd);
		tulis(teks, s + sisipan.length, s + sisipan.length);
	}

	function sisipEmoji(e: string) {
		if (!area) return;
		const { selectionStart: s, value } = area;
		tulis(value.slice(0, s) + e + value.slice(area.selectionEnd), s + e.length, s + e.length);
	}

	function aksi(a: AksiEditor) {
		if (mode === 'preview') mode = 'tulis';
		if (a !== 'emoji') emojiTerbuka = false;
		switch (a) {
			case 'tebal':
				return bungkus('**', '**', 'teks tebal');
			case 'miring':
				return bungkus('_', '_', 'teks miring');
			case 'coret':
				return bungkus('~~', '~~', 'dicoret');
			case 'kode':
				return bungkus('`', '`', 'kode');
			case 'h2':
				return awalanBaris('## ');
			case 'h3':
				return awalanBaris('### ');
			case 'kutip':
				return awalanBaris('> ');
			case 'daftar':
				return awalanBaris('- ');
			case 'daftar-angka':
				return daftarAngka();
			case 'centang':
				return awalanBaris('- [ ] ');
			case 'tautan':
				return bungkus('[', '](https://)', 'teks tautan');
			case 'tabel':
				posisiTabel = area?.selectionStart ?? 0;
				tabelTerbuka = true;
				return;
			case 'blok-kode':
				return bungkus('\n```\n', '\n```\n', 'tulis kodenya di sini');
			case 'emoji':
				emojiTerbuka = !emojiTerbuka;
				return;
			case 'garis':
				return sisipBlok('\n---\n\n');
		}
	}

	/**
	 * Sisipkan gambar di posisi kursor. Yang masuk ke teks hanya sintaks
	 * `![alt](lampiran:<id>)` — bukan URL, bukan HTML. Resolusi ke blob URL
	 * terjadi saat render, dan hanya untuk lampiran milik catatan ini.
	 */
	function sisipGambar(a: AttachmentMeta) {
		const alt = (a.alt ?? a.name.replace(/\.[a-z0-9]+$/i, '')).replace(/[[\]()\n]/g, ' ');
		sisipBlok(`![${alt}](lampiran:${a.id})\n\n`);
	}

	function pintasan(e: KeyboardEvent) {
		lanjutkanDaftar(e);
		if (e.defaultPrevented) return;
		if (!(e.metaKey || e.ctrlKey)) return;
		if (e.key === 'b') {
			e.preventDefault();
			aksi('tebal');
		}
		if (e.key === 'i') {
			e.preventDefault();
			aksi('miring');
		}
		if (e.key === 'k') {
			e.preventDefault();
			aksi('tautan');
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			onselesai();
		}
	}

	const MODE_LABEL: Array<{ id: ModeEditor; label: string; sembunyiMobile?: boolean }> = [
		{ id: 'tulis', label: 'Tulis' },
		{ id: 'berdampingan', label: 'Berdampingan', sembunyiMobile: true },
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
					{#if !(mobile && m.sembunyiMobile)}
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
					{/if}
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

		{#if menulis}
			<div style="position:relative">
				<BilahAlat onaksi={aksi} />
				{#if emojiTerbuka}
					<div
						role="listbox"
						aria-label="Pilih emoji"
						class="kertas kertas-angkat muncul"
						style="position:absolute;z-index:30;top:calc(100% + 6px);left:0;max-width:100%;width:340px;padding:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:2px"
					>
						{#each EMOJI as e (e)}
							<button
								type="button"
								role="option"
								aria-selected="false"
								aria-label="Emoji {e}"
								style="cursor:pointer;min-height:34px;border:none;border-radius:var(--r-control);background:transparent;font-size:1.15rem;line-height:1"
								onmousedown={(ev) => {
									ev.preventDefault();
									sisipEmoji(e);
								}}>{e}</button
							>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		{#if entri.body.trim().length === 0 && menulis}
			<PromptHarian
				iso={entri.entryDate}
				onpakai={(t) => {
					onubah({ body: t });
					queueMicrotask(() => area?.focus());
				}}
			/>
		{/if}

		<div
			style="display:grid;gap:var(--s-5);grid-template-columns:{mode === 'berdampingan'
				? 'minmax(0,1fr) minmax(0,1fr)'
				: 'minmax(0,1fr)'};align-items:start"
		>
			{#if menulis}
				<textarea
					bind:this={area}
					value={entri.body}
					placeholder={i18n.t.app.placeholderTulis}
					aria-label="Isi tulisan"
					style="width:100%;{mode === 'berdampingan'
						? ''
						: 'max-width:62ch;'}min-height:{mobile
						? 300
						: 380}px;border:none;outline:none;resize:vertical;background:transparent;font-family:var(--f-read);font-size:var(--text-md);line-height:1.72;color:var(--ink)"
					oninput={(e) => onubah({ body: (e.currentTarget as HTMLTextAreaElement).value })}
					onkeydown={pintasan}
				></textarea>
			{/if}

			{#if mode !== 'tulis'}
				<div
					style="min-height:{mobile ? 300 : 380}px;max-width:62ch;min-width:0;{mode ===
					'berdampingan'
						? 'border-left:1px solid rgb(27 27 23 / 0.12);padding-left:var(--s-5);'
						: ''}"
					aria-label="Preview tulisan"
				>
					{#if entri.body.trim()}
						<AmanMarkdown md={entri.body} {urls} />
					{:else}
						<p class="t-baca" style="color:var(--ink-faint)">Belum ada yang bisa di-preview.</p>
					{/if}
				</div>
			{/if}
		</div>

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

<PembangunTabel
	terbuka={tabelTerbuka}
	ontutup={() => (tabelTerbuka = false)}
	onsisip={(md) => sisipDiPosisi(md, posisiTabel)}
/>
