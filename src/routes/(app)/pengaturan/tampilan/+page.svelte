<script lang="ts">
	import PreviewTema from '$components/pengaturan/PreviewTema.svelte';
	import { tema, TEMA, type TemaId } from '$lib/state/tema.svelte.ts';
	import { accountApi } from '$lib/api/endpoints.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	async function pilih(id: TemaId) {
		tema.setTema(id);
		try {
			await accountApi.updateProfile({ theme: id });
		} catch {
			toast.show('Tema tersimpan di perangkat ini, sinkron menyusul.');
		}
	}

	async function gantiMode() {
		tema.toggleMode();
		await accountApi.updateProfile({ mode: tema.mode }).catch(() => {});
	}
</script>

<svelte:head><title>Tampilan · Cloister</title></svelte:head>

<div style="display:flex;flex-direction:column;gap:var(--s-5)">
	<h1 class="t-judul t-lg">{i18n.t.pengaturan.tampilan}</h1>

	<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--s-4)">
		{#each TEMA as t (t.id)}
			<PreviewTema def={t} aktif={tema.tema === t.id} onpilih={pilih} />
		{/each}
	</div>

	<div
		style="display:flex;flex-wrap:wrap;gap:var(--s-6);align-items:center;padding:var(--s-5);border:1px solid var(--garis-ruang);border-radius:var(--r-control)"
	>
		<div style="display:flex;align-items:center;gap:var(--s-4)">
			<button
				type="button"
				aria-label="Saklar Malam atau Siang"
				style="cursor:pointer;width:40px;height:62px;padding:5px;border:1px solid var(--garis-ruang);border-radius:var(--r-control);background:linear-gradient(#2A2F33,#1D2124);box-shadow:inset 0 1px 0 var(--garis-ruang);display:flex;align-items:{tema.mode ===
				'malam'
					? 'flex-end'
					: 'flex-start'}"
				onclick={gantiMode}
			>
				<span
					style="width:100%;height:26px;border-radius:2px;background:linear-gradient(#EDE7D6,#C9C2AE);box-shadow:0 2px 4px rgb(0 0 0 / 0.5)"
				></span>
			</button>
			<div style="display:flex;flex-direction:column;gap:4px">
				<span style="font-family:var(--f-display);font-size:var(--text-base);color:var(--ink-on-board)"
					>Mode {tema.modeLabel}</span
				>
				<span
					style="font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim);max-width:38ch"
					>{i18n.t.pengaturan.modeRuangan}</span
				>
			</div>
		</div>

		<label style="display:flex;align-items:center;gap:10px;min-height:44px;cursor:pointer">
			<input
				type="checkbox"
				checked={tema.ikutSistem}
				style="width:20px;height:20px;accent-color:#2B4F8E"
				onchange={(e) => tema.setIkutSistem((e.currentTarget as HTMLInputElement).checked)}
			/>
			<span style="font-family:var(--f-display);font-size:var(--text-base);color:var(--ink-on-board)"
				>{i18n.t.pengaturan.ikutiSistem}</span
			>
		</label>

		<label style="display:flex;align-items:center;gap:10px;min-height:44px;cursor:pointer">
			<input
				type="checkbox"
				checked={tema.reduceMotion}
				style="width:20px;height:20px;accent-color:#2B4F8E"
				onchange={(e) => (tema.reduceMotion = (e.currentTarget as HTMLInputElement).checked)}
			/>
			<span style="font-family:var(--f-display);font-size:var(--text-base);color:var(--ink-on-board)"
				>Kurangi gerak (rotasi kartu mati)</span
			>
		</label>
	</div>
</div>
