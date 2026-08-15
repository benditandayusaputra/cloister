<script lang="ts">
	import Ikon from '$components/dasar/Ikon.svelte';
	import { pinOf, moodLabel } from '$lib/utils/kertas.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	interface Props {
		sort: 'terbaru' | 'populer';
		tags: string[];
		tagAktif: string | null;
		moodAktif: number | null;
		penulisAktif: string | null;
		gambarAktif?: boolean;
		cari: string;
	}

	let { sort, tags, tagAktif, moodAktif, penulisAktif, gambarAktif = false, cari }: Props = $props();


	/** Ganti satu saringan tanpa menjatuhkan yang lain; cursor selalu direset. */
	function tautan(ubah: Record<string, string | number | null>): string {
		const p = new URLSearchParams();
		const dasar: Record<string, string | number | null> = {
			sort: sort === 'populer' ? 'populer' : null,
			tag: tagAktif,
			mood: moodAktif,
			penulis: penulisAktif,
			gambar: gambarAktif ? 1 : null,
			q: cari || null
		};
		for (const [k, v] of Object.entries({ ...dasar, ...ubah })) {
			if (v !== null && v !== '') p.set(k, String(v));
		}
		const s = p.toString();
		return s ? `/baca?${s}` : '/baca';
	}

	const adaSaringan = $derived(
		Boolean(cari || tagAktif || moodAktif || penulisAktif || gambarAktif || sort === 'populer')
	);
</script>

<div style="display:flex;flex-direction:column;gap:var(--s-4)">
	<form
		method="GET"
		action="/baca"
		role="search"
		style="display:flex;gap:var(--s-3);flex-wrap:wrap;align-items:center"
	>
		<label style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:6px">
			<span class="t-data" style="color:#BFAF92">Cari tulisan</span>
			<!-- defaultValue, bukan value: kalau Svelte ikut mengendalikannya, ketikan
			     yang masuk sebelum halaman selesai hidup akan terhapus saat hidrasi. -->
			<input
				type="search"
				name="q"
				defaultValue={cari}
				placeholder="kata di judul atau isi tulisan"
				maxlength="120"
				style="min-height:44px;padding:0 12px;border:2px solid rgb(232 223 201 / 0.3);border-radius:var(--r-control);background:rgb(0 0 0 / 0.18);font-family:var(--f-read);font-size:var(--text-md);color:#E8DFC9;outline:none"
			/>
		</label>

		<!-- Saringan lain ikut terbawa saat mencari, bukan hilang begitu saja. -->
		{#if sort === 'populer'}<input type="hidden" name="sort" value="populer" />{/if}
		{#if tagAktif}<input type="hidden" name="tag" value={tagAktif} />{/if}
		{#if moodAktif}<input type="hidden" name="mood" value={moodAktif} />{/if}
		{#if penulisAktif}<input type="hidden" name="penulis" value={penulisAktif} />{/if}
		{#if gambarAktif}<input type="hidden" name="gambar" value="1" />{/if}

		<button type="submit" class="tbl" style="min-height:44px;align-self:flex-end">Cari</button>
		{#if adaSaringan}
			<a
				href="/baca"
				class="tbl-papan"
				style="min-height:44px;align-self:flex-end;text-decoration:none">Bersihkan</a
			>
		{/if}
	</form>

	<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
		<a
			href={tautan({ sort: null })}
			class="tbl-papan {sort === 'terbaru' ? 'tbl-papan-aktif' : ''}"
			style="min-height:38px;text-decoration:none">{i18n.t.publik.terbaru}</a
		>
		<a
			href={tautan({ sort: 'populer' })}
			class="tbl-papan {sort === 'populer' ? 'tbl-papan-aktif' : ''}"
			style="min-height:38px;text-decoration:none">{i18n.t.publik.populer}</a
		>

		<span aria-hidden="true" style="width:1px;height:24px;background:rgb(232 223 201 / 0.22)"></span>

		{#each [1, 2, 3, 4, 5] as m (m)}
			<a
				href={tautan({ mood: moodAktif === m ? null : m })}
				class="tbl-papan {moodAktif === m ? 'tbl-papan-aktif' : ''}"
				title={moodLabel(m, i18n.locale)}
				style="min-height:38px;text-decoration:none;display:inline-flex;align-items:center;gap:7px"
			>
				<span
					aria-hidden="true"
					style="width:12px;height:12px;border-radius:var(--r-pin);background:{pinOf(m)}"
				></span>
				{moodLabel(m, i18n.locale)}
			</a>
		{/each}

		<span aria-hidden="true" style="width:1px;height:24px;background:rgb(232 223 201 / 0.22)"></span>

		<a
			href={tautan({ gambar: gambarAktif ? null : 1 })}
			class="tbl-papan {gambarAktif ? 'tbl-papan-aktif' : ''}"
			style="min-height:38px;text-decoration:none;display:inline-flex;align-items:center;gap:7px"
			aria-current={gambarAktif ? 'true' : undefined}
		>
			<Ikon nama="gambar" ukuran={15} />
			Ada foto
		</a>
	</div>

	{#if tags.length > 0}
		<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
			<span class="t-data" style="color:#BFAF92">Label</span>
			{#each tags as t (t)}
				<a
					href={tautan({ tag: tagAktif === t ? null : t })}
					class="tbl-papan {tagAktif === t ? 'tbl-papan-aktif' : ''}"
					style="min-height:34px;text-decoration:none">{t}</a
				>
			{/each}
		</div>
	{/if}

	{#if penulisAktif}
		<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
			<span class="t-data" style="color:#BFAF92">Penulis</span>
			<a href={tautan({ penulis: null })} class="tbl-papan tbl-papan-aktif" style="min-height:34px;text-decoration:none"
				>{penulisAktif} &times;</a
			>
		</div>
	{/if}
</div>
