<script lang="ts">
	import { onMount } from 'svelte';
	import { adminApi } from '$lib/api/endpoints.ts';
	import { toast } from '$lib/state/toast.svelte.ts';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';

	type Laporan = Awaited<ReturnType<typeof adminApi.reports>>['reports'][number];

	const FILTER = [
		{ id: 'open', label: 'Terbuka' },
		{ id: 'valid', label: 'Ditarik' },
		{ id: 'invalid', label: 'Dibiarkan' },
		{ id: 'semua', label: 'Semua' }
	];

	let filter = $state('open');
	let daftar = $state<Laporan[]>([]);
	let memuat = $state(true);

	async function muat() {
		memuat = true;
		try {
			daftar = (await adminApi.reports(filter)).reports;
		} catch (err) {
			toast.bahaya((err as Error).message);
		} finally {
			memuat = false;
		}
	}

	onMount(muat);
	$effect(() => {
		void filter;
		void muat();
	});

	async function tindak(id: string, aksi: 'biarkan' | 'tarik') {
		try {
			await adminApi.act(id, aksi);
			await muat();
			toast.show(aksi === 'tarik' ? 'Tulisan ditarik.' : 'Laporan ditutup, tulisan dibiarkan.');
		} catch (err) {
			toast.bahaya((err as Error).message);
		}
	}

	const warnaStatus = (s: string) =>
		s === 'open' ? '#D9B15E' : s === 'valid' ? '#D98B84' : '#8FBF93';
</script>

<svelte:head><title>Moderasi · Cloister</title></svelte:head>

{#if !sesi.isModerator}
	<div class="kertas" style="padding:var(--s-5)">
		<p class="t-baca">Halaman ini hanya untuk moderator.</p>
	</div>
{:else}
	<div
		class="panel-gelap"
		style="display:flex;flex-direction:column;gap:var(--s-4);padding:var(--s-5);border:1px solid rgb(255 255 255 / 0.12);background:#101315"
	>
		<div
			style="display:flex;flex-wrap:wrap;gap:var(--s-4);align-items:baseline;justify-content:space-between;border-bottom:1px solid rgb(255 255 255 / 0.12);padding-bottom:var(--s-3)"
		>
			<span
				style="font-family:var(--f-data);font-size:var(--text-sm);letter-spacing:0.09em;text-transform:uppercase;color:#D7DDD8"
				>{i18n.t.pengaturan.moderasi} · antrean laporan</span
			>
			<div style="display:flex;gap:6px;flex-wrap:wrap">
				{#each FILTER as f (f.id)}
					<button
						type="button"
						style="cursor:pointer;min-height:30px;padding:0 10px;border:1px solid {filter === f.id
							? 'var(--pin-brass)'
							: 'rgb(255 255 255 / 0.14)'};background:{filter === f.id
							? 'rgb(192 138 46 / 0.2)'
							: 'transparent'};color:#D7DDD8;font-family:var(--f-data);font-size:var(--text-2xs);letter-spacing:0.09em;text-transform:uppercase"
						onclick={() => (filter = f.id)}>{f.label}</button
					>
				{/each}
			</div>
		</div>

		{#if memuat}
			<span class="t-data">{i18n.t.umum.memuat}…</span>
		{:else if daftar.length === 0}
			<span class="t-data">Antrean kosong.</span>
		{:else}
			<div style="overflow-x:auto">
				<table
					style="width:100%;border-collapse:collapse;font-family:var(--f-data);font-size:var(--text-xs);color:#C3CAC5"
				>
					<thead>
						<tr style="text-align:left">
							{#each ['Waktu', 'Nama pena', 'Judul', 'Alasan', 'Lapor', 'Status', 'Aksi'] as h (h)}
								<th
									style="padding:7px 10px;border-bottom:1px solid rgb(255 255 255 / 0.16);font-weight:500;letter-spacing:0.09em;text-transform:uppercase;color:#8B948E;white-space:nowrap"
									>{h}</th
								>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each daftar as l (l.id)}
							<tr>
								<td style="padding:7px 10px;border-bottom:1px solid rgb(255 255 255 / 0.07);white-space:nowrap;color:#8B948E"
									>{new Date(l.createdAt).toLocaleString()}</td
								>
								<td style="padding:7px 10px;border-bottom:1px solid rgb(255 255 255 / 0.07);white-space:nowrap"
									>{l.isAnonymous || !l.penName ? 'anonim' : l.penName}</td
								>
								<td
									style="padding:7px 10px;border-bottom:1px solid rgb(255 255 255 / 0.07);max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
								>
									<a href="/baca/entri/{l.entryId}" style="color:inherit">{l.title}</a>
								</td>
								<td style="padding:7px 10px;border-bottom:1px solid rgb(255 255 255 / 0.07);white-space:nowrap"
									>{l.reason}</td
								>
								<td style="padding:7px 10px;border-bottom:1px solid rgb(255 255 255 / 0.07);text-align:right"
									>{l.reportCount}</td
								>
								<td
									style="padding:7px 10px;border-bottom:1px solid rgb(255 255 255 / 0.07);white-space:nowrap;color:{warnaStatus(
										l.state
									)}">{l.state}</td
								>
								<td style="padding:5px 10px;border-bottom:1px solid rgb(255 255 255 / 0.07);white-space:nowrap">
									<span style="display:flex;gap:5px">
										<button
											type="button"
											style="cursor:pointer;min-height:28px;padding:0 9px;border:1px solid rgb(79 127 83 / 0.7);background:transparent;color:#8FBF93;font-family:var(--f-data);font-size:var(--text-2xs);letter-spacing:0.06em"
											onclick={() => tindak(l.id, 'biarkan')}>Biarkan</button
										>
										<button
											type="button"
											style="cursor:pointer;min-height:28px;padding:0 9px;border:1px solid rgb(192 74 66 / 0.7);background:transparent;color:#D98B84;font-family:var(--f-data);font-size:var(--text-2xs);letter-spacing:0.06em"
											onclick={() => tindak(l.id, 'tarik')}>Tarik</button
										>
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<span class="t-data" style="color:#8B948E">
			Hanya tulisan yang sudah diterbitkan penulisnya yang muncul di sini. Catatan terenkripsi tidak
			bisa dibuka dari halaman ini.
		</span>
	</div>
{/if}
