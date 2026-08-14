<script lang="ts">
	import { onMount } from 'svelte';
	import { crypto as kripto } from '$crypto/client.ts';
	import { keEntryPayload } from '$lib/sync/payload.ts';
	import { entriesRepo } from '$lib/db/local/repo.ts';
	import type { LocalEntry } from '$lib/db/local/types.ts';
	import type { PercobaanKunciSalah, SealedParts } from '$crypto/protocol.ts';
	import { api } from '$lib/api/client.ts';
	import { pantau } from '$lib/bukti/pantau.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import AmanMarkdown from '$components/markdown/AmanMarkdown.svelte';
	import SaklarMode from '$components/nav/SaklarMode.svelte';
	import Logo from '$components/nav/Logo.svelte';
	import { stempelTanggal } from '$lib/utils/tanggal.ts';
	import { plainRingkas } from '$lib/utils/teks.ts';

	interface BarisBukti {
		tabel: string;
		baris: Record<string, string | number | null>;
		ukuran: Record<string, number>;
		entry_tags: string[];
		kolom_yang_tidak_ada: string[];
	}

	let daftar = $state<LocalEntry[]>([]);
	let pilihan = $state<LocalEntry | null>(null);
	let amplop = $state<SealedParts | null>(null);
	let barisDb = $state<BarisBukti | null>(null);
	let errorDb = $state('');
	let memuat = $state(true);
	let bentangCt = $state(false);
	let percobaan = $state<PercobaanKunciSalah | null>(null);
	let mencoba = $state(false);

	const kirimTerakhir = $derived(pilihan ? pantau.untukEntri(pilihan.id) : null);

	function potong(s: string, n = 96): string {
		return s.length <= n ? s : `${s.slice(0, n)}…`;
	}

	async function pilih(e: LocalEntry) {
		pilihan = e;
		amplop = null;
		barisDb = null;
		errorDb = '';
		percobaan = null;
		bentangCt = false;

		// Dienkripsi ulang di sini hanya untuk diperlihatkan. Hasilnya tidak
		// disimpan dan tidak dikirim; nonce-nya pun baru, jadi ia berbeda dari
		// yang tersimpan di server — dan itu justru bagian dari pelajarannya.
		amplop = await kripto.encryptEntry(e.id, keEntryPayload(e));

		try {
			barisDb = await api<BarisBukti>(`/api/bukti/rows?entryId=${e.id}`);
		} catch (err) {
			errorDb = (err as Error).message;
		}
	}

	async function cobaKunciSalah() {
		if (!pilihan || !amplop) return;
		mencoba = true;
		try {
			percobaan = await kripto.bukaKunciSalah(pilihan.id, amplop);
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			mencoba = false;
		}
	}

	onMount(async () => {
		const semua = await entriesRepo.all();
		daftar = semua.sort((a, b) => b.entryDate.localeCompare(a.entryDate)).slice(0, 40);
		memuat = false;
		const pertama = daftar[0];
		if (pertama) await pilih(pertama);
	});
</script>

<svelte:head>
	<title>Bukti · Cloister</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="ruangan">
	<main class="shell" style="display:flex;flex-direction:column;gap:var(--s-6);padding-bottom:var(--s-9)">
		<nav style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding-bottom:var(--s-2)">
			<a
				href="/app"
				style="display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--ink-on-board)"
			>
				<Logo />
				<span class="t-judul t-lg">Cloister</span>
			</a>
			<div style="margin-left:auto;display:flex;align-items:center;gap:var(--s-3)">
				<SaklarMode />
				<a href="/app" class="tbl-papan" style="text-decoration:none">Kembali ke papan</a>
			</div>
		</nav>

		<header style="display:flex;flex-direction:column;gap:10px">
			<h1 class="t-judul t-xl">Bukti</h1>
			<p
				style="margin:0;font-family:var(--f-read);font-size:var(--text-md);line-height:1.7;color:var(--ink-on-board-dim);max-width:70ch;text-wrap:pretty"
			>
				Kelemahan semua aplikasi terenkripsi adalah jaminannya tidak terlihat. Halaman ini
				memperlihatkan tiga hal berdampingan untuk satu catatan yang sama: apa yang kamu lihat, apa
				yang dikirim ke server, dan baris apa yang benar-benar tersimpan di database. Semuanya
				diambil langsung dari sistem yang sedang berjalan, bukan screenshot.
			</p>
			<p
				style="margin:0;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim);max-width:70ch"
			>
				Verifikasi semacam ini sudah dilakukan Notesnook lewat Vericrypt. Kami menganggapnya standar
				minimum untuk aplikasi terenkripsi, bukan fitur unggulan.
			</p>
		</header>

		<section
			class="kertas kertas-manila"
			style="padding:var(--s-5);display:flex;flex-wrap:wrap;gap:var(--s-5);align-items:center;justify-content:space-between"
		>
			<div style="display:flex;flex-direction:column;gap:4px">
				<span class="t-data t-data-ink">Byte plaintext yang pernah dikirim ke server</span>
				<span
					class="t-hand"
					style="font-size:2.6rem;line-height:1;color:{pantau.bytePlaintext === 0
						? '#4E7A52'
						: '#9B3B2F'}">{pantau.bytePlaintext}</span
				>
				<span style="font-family:var(--f-read);font-size:0.82rem;color:var(--ink-soft);max-width:52ch">
					Dihitung dari {pantau.rekaman.length} permintaan ke rute privat di sesi ini,
					{pantau.byteTerkirim.toLocaleString('id-ID')} byte total. Rute publik seperti
					<code>/api/publish</code> tidak ikut dihitung karena penerbitan memang keluar dari enkripsi
					atas permintaanmu.
				</span>
			</div>
			<button type="button" class="tbl-garis" onclick={() => pantau.bersihkan()}>
				Bersihkan penghitung
			</button>
		</section>

		<!-- Pemilih catatan -->
		<section style="display:flex;flex-direction:column;gap:10px">
			<span class="t-data">Pilih catatan</span>
			{#if memuat}
				<span class="t-data">{i18n.t.umum.memuat}…</span>
			{:else if daftar.length === 0}
				<p class="t-baca" style="color:var(--ink-on-board-dim)">
					Belum ada catatan di perangkat ini. Tulis satu dulu, lalu kembali ke sini.
				</p>
			{:else}
				<div style="display:flex;flex-wrap:wrap;gap:8px">
					{#each daftar as e (e.id)}
						<button
							type="button"
							class="tag-cip {pilihan?.id === e.id ? 'tag-cip-aktif' : ''}"
							aria-pressed={pilihan?.id === e.id}
							onclick={() => pilih(e)}
						>
							{e.entryDate} · {plainRingkas(e.title || e.body, 28)}
						</button>
					{/each}
				</div>
			{/if}
		</section>

		{#if pilihan}
			<div
				style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:var(--s-5);align-items:start"
			>
				<!-- Panel 1 -->
				<section class="kertas" style="padding:var(--s-5);display:flex;flex-direction:column;gap:12px">
					<span class="t-data t-data-ink">1 · Yang kamu lihat</span>
					<span class="t-data" style="color:var(--ink-soft)"
						>{stempelTanggal(pilihan.entryDate, i18n.locale)}</span
					>
					<h2 class="t-judul" style="color:var(--ink);font-size:var(--text-lg)">
						{pilihan.title || 'Tanpa judul'}
					</h2>
					<div class="prosa" style="color:var(--ink)">
						<AmanMarkdown md={pilihan.body} />
					</div>
					{#if pilihan.tags.length}
						<div style="display:flex;flex-wrap:wrap;gap:6px">
							{#each pilihan.tags as t (t)}<span class="tag-cip">{t}</span>{/each}
						</div>
					{/if}
				</section>

				<!-- Panel 2 -->
				<section
					class="kertas kertas-biru"
					style="padding:var(--s-5);display:flex;flex-direction:column;gap:12px"
				>
					<span class="t-data t-data-ink">2 · Yang dikirim ke server</span>
					{#if kirimTerakhir}
						<span style="font-family:var(--f-read);font-size:0.82rem;color:var(--ink-soft)">
							Permintaan sungguhan dari sesi ini: <code
								>{kirimTerakhir.metode} {kirimTerakhir.path}</code
							>, {kirimTerakhir.byte.toLocaleString('id-ID')} byte, di antaranya
							{kirimTerakhir.bytePlaintext} byte yang tidak bisa dijelaskan sebagai bahan kripto.
						</span>
						<pre
							style="margin:0;max-height:320px;overflow:auto;font-family:var(--f-data);font-size:0.72rem;line-height:1.5;color:var(--ink);background:rgb(27 27 23 / 0.05);padding:10px;border-radius:4px;white-space:pre-wrap;word-break:break-all">{kirimTerakhir.payload}</pre>
					{:else if amplop}
						<span style="font-family:var(--f-read);font-size:0.82rem;color:var(--ink-soft)">
							Catatan ini belum disinkronkan lagi di sesi ini, jadi yang ditampilkan adalah amplop
							yang baru saja dibentuk ulang di perangkat ini dengan bahan yang sama persis. Bentuk
							payload-nya identik dengan yang dikirim mesin sinkronisasi.
						</span>
						<pre
							style="margin:0;max-height:320px;overflow:auto;font-family:var(--f-data);font-size:0.72rem;line-height:1.5;color:var(--ink);background:rgb(27 27 23 / 0.05);padding:10px;border-radius:4px;white-space:pre-wrap;word-break:break-all">{JSON.stringify(
								{
									id: pilihan.id,
									entryDate: pilihan.entryDate,
									ciphertext: bentangCt ? amplop.ciphertext : potong(amplop.ciphertext),
									nonce: amplop.nonce,
									wrappedDek: amplop.wrappedDek,
									dekNonce: amplop.dekNonce,
									sizeBucket: amplop.sizeBucket,
									clientUpdatedAt: pilihan.updatedAt,
									baseRev: pilihan.baseRev
								},
								null,
								2
							)}</pre>
						<button
							type="button"
							class="tbl-garis"
							style="align-self:flex-start"
							onclick={() => (bentangCt = !bentangCt)}
						>
							{bentangCt ? 'Potong ciphertext' : 'Bentangkan ciphertext'}
						</button>
					{:else}
						<span class="t-data">{i18n.t.umum.memuat}…</span>
					{/if}

					<p style="margin:0;font-family:var(--f-read);font-size:0.82rem;color:var(--ink-soft)">
						Tidak ada bidang bernama <code>title</code>, <code>body</code>, atau
						<code>content</code>. Skema Valibot di rute sinkronisasi menolak properti yang tidak
						dikenal, jadi bidang seperti itu tidak akan pernah lolos meski ada yang mengirimkannya.
					</p>
				</section>

				<!-- Panel 3 -->
				<section
					class="kertas kertas-buram"
					style="padding:var(--s-5);display:flex;flex-direction:column;gap:12px"
				>
					<span class="t-data t-data-ink">3 · Yang tersimpan di database</span>
					{#if barisDb}
						<span style="font-family:var(--f-read);font-size:0.82rem;color:var(--ink-soft)">
							Baris <code>{barisDb.tabel}</code> milikmu sendiri, diambil apa adanya lewat
							<code>GET /api/bukti/rows</code>. Nama kolom sengaja memakai nama aslinya di Postgres.
						</span>
						<dl
							style="margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-family:var(--f-data);font-size:0.72rem;line-height:1.6"
						>
							{#each Object.entries(barisDb.baris) as [k, val] (k)}
								<dt style="color:var(--ink-soft)">{k}</dt>
								<dd style="margin:0;color:var(--ink);word-break:break-all">
									{val === null ? 'NULL' : typeof val === 'string' ? potong(val, 56) : val}
								</dd>
							{/each}
						</dl>

						<div
							style="display:flex;flex-wrap:wrap;gap:10px;font-family:var(--f-data);font-size:0.7rem;color:var(--ink-soft)"
						>
							{#each Object.entries(barisDb.ukuran) as [k, val] (k)}
								<span>{k}: {val}</span>
							{/each}
						</div>

						<div style="display:flex;flex-direction:column;gap:4px">
							<span class="t-data" style="color:var(--ink-soft)">Kolom yang tidak ada di tabel</span>
							<div style="display:flex;flex-wrap:wrap;gap:6px">
								{#each barisDb.kolom_yang_tidak_ada as k (k)}
									<code
										style="font-family:var(--f-data);font-size:0.72rem;color:var(--ink-soft);text-decoration:line-through"
										>{k}</code
									>
								{/each}
							</div>
						</div>

						{#if barisDb.entry_tags.length}
							<div style="display:flex;flex-direction:column;gap:4px">
								<span class="t-data" style="color:var(--ink-soft)"
									>entry_tags — token indeks buta, bukan nama tag</span
								>
								<div style="display:flex;flex-wrap:wrap;gap:6px">
									{#each barisDb.entry_tags as t (t)}
										<code style="font-family:var(--f-data);font-size:0.7rem;color:var(--ink-soft)"
											>{t}</code
										>
									{/each}
								</div>
							</div>
						{/if}
					{:else if errorDb}
						<p class="t-baca" style="font-size:0.86rem;color:var(--ink-soft)">
							{errorDb}. Catatan ini belum pernah sampai ke server — itu sendiri sudah jawaban:
							aplikasi bekerja penuh sebelum ada apa pun yang tersinkron.
						</p>
					{:else}
						<span class="t-data">{i18n.t.umum.memuat}…</span>
					{/if}
				</section>
			</div>

			<!-- Coba buka dengan kunci salah -->
			<section
				class="kertas kertas-mawar"
				style="padding:var(--s-5);display:flex;flex-direction:column;gap:12px"
			>
				<span class="t-data t-data-ink">Coba buka dengan kunci salah</span>
				<p class="t-baca" style="font-size:0.9rem;color:var(--ink-soft);max-width:70ch">
					Tombol ini benar-benar menjalankan dekripsi dengan kunci utama 32 byte yang baru diacak,
					bukan simulasi. Yang muncul di bawah adalah kegagalan verifikasi tag Poly1305 apa adanya,
					termasuk pesan error dari libsodium.
				</p>
				<button
					type="button"
					class="tbl"
					style="align-self:flex-start"
					disabled={mencoba || !amplop}
					onclick={cobaKunciSalah}
				>
					{mencoba ? 'Mencoba…' : 'Jalankan dengan kunci acak'}
				</button>

				{#if percobaan}
					<dl
						style="margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-family:var(--f-data);font-size:0.74rem;line-height:1.6"
					>
						<dt style="color:var(--ink-soft)">kunci acak</dt>
						<dd style="margin:0;color:var(--ink);word-break:break-all">
							{potong(percobaan.kunciAcak, 56)}
						</dd>
						<dt style="color:var(--ink-soft)">gagal di</dt>
						<dd style="margin:0;color:var(--ink)">{percobaan.langkah}</dd>
						<dt style="color:var(--ink-soft)">hasil</dt>
						<dd style="margin:0;color:var(--ink)">
							{percobaan.berhasil ? 'BERHASIL — laporkan ini sebagai celah keamanan' : 'GAGAL'}
						</dd>
						<dt style="color:var(--ink-soft)">error</dt>
						<dd style="margin:0;color:var(--ink);word-break:break-word">{percobaan.error}</dd>
					</dl>
				{/if}
			</section>
		{/if}

		<!-- Tautan ke tes otomatis -->
		<section class="kertas" style="padding:var(--s-5);display:flex;flex-direction:column;gap:10px">
			<span class="t-data t-data-ink">Hal yang sama, dibuktikan ulang di CI</span>
			<p class="t-baca" style="font-size:0.9rem;color:var(--ink-soft);max-width:70ch">
				Halaman ini memperlihatkan satu catatan. Tes di bawah melakukan hal yang sama secara otomatis
				di setiap perubahan kode, dan siapa pun bisa menjalankannya ulang dengan
				<code>pnpm test</code> dan <code>pnpm test:e2e</code>.
			</p>
			<ul
				style="margin:0;padding-left:1.2em;font-family:var(--f-data);font-size:0.78rem;line-height:1.9;color:var(--ink)"
			>
				<li>
					<code>tests/e2e/no-plaintext-on-server.spec.ts</code> — menulis catatan berisi frasa
					penanda, memicu sinkronisasi, lalu memindai seluruh isi tabel <code>entries</code> dan
					memastikan frasa itu tidak muncul dalam bentuk apa pun
				</li>
				<li>
					<code>tests/unit/validasi.test.ts</code> — skema rute privat menolak bidang
					<code>title</code>, <code>body</code>, dan <code>content</code>
				</li>
				<li>
					<code>tests/crypto-vectors/vektor.test.ts</code> — vektor uji tetap untuk KDF, AEAD, dan
					pembungkusan kunci, supaya refactor tidak diam-diam mengubah format
				</li>
				<li>
					<code>tests/unit/redact-offline.test.ts</code> — Penyaring Identitas tidak memuat satu pun
					jalur jaringan
				</li>
			</ul>
		</section>
	</main>
</div>
