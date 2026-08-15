<script lang="ts">
	import { konfirmasi } from '$lib/state/konfirmasi.svelte.ts';
	import Ikon from './Ikon.svelte';

	let tombolYa = $state<HTMLButtonElement | null>(null);
	let ketikan = $state('');

	const aktif = $derived(konfirmasi.aktif);
	const bolehYa = $derived(!aktif?.ketik || ketikan.trim() === aktif.ketik);

	$effect(() => {
		if (!aktif) return;
		ketikan = '';
		const sebelumnya = document.activeElement as HTMLElement | null;
		queueMicrotask(() => tombolYa?.focus());
		return () => sebelumnya?.focus?.();
	});

	function onKey(e: KeyboardEvent) {
		if (!aktif) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			aktif.selesai(false);
		}
	}
</script>

<svelte:window onkeydown={aktif ? onKey : undefined} />

{#if aktif}
	<div class="tirai" role="presentation" onclick={(e) => e.target === e.currentTarget && aktif.selesai(false)}>
		<div
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="konfirmasi-judul"
			aria-describedby={aktif.pesan ? 'konfirmasi-pesan' : undefined}
			class="kertas kertas-angkat kotak muncul"
			class:bahaya={aktif.bahaya}
		>
			<span aria-hidden="true" class="pin-bulat pin"></span>
			<div class="kepala">
				<span class="ikon">
					<Ikon nama={aktif.bahaya ? 'sampah' : 'tanya'} ukuran={20} />
				</span>
				<h2 id="konfirmasi-judul" class="t-judul judul">{aktif.judul}</h2>
			</div>
			{#if aktif.pesan}
				<p id="konfirmasi-pesan" class="pesan">{aktif.pesan}</p>
			{/if}
			{#if aktif.ketik}
				<label class="label-medan">
					<span class="t-data t-data-ink">Ketik <strong>{aktif.ketik}</strong> untuk melanjutkan</span>
					<input
						class="isian isian-data"
						type="text"
						autocomplete="off"
						spellcheck="false"
						bind:value={ketikan}
						onkeydown={(e) => e.key === 'Enter' && bolehYa && aktif.selesai(true)}
					/>
				</label>
			{/if}
			<div class="aksi">
				<button type="button" class="tbl-garis" onclick={() => aktif.selesai(false)}>
					{aktif.teksBatal ?? 'Batal'}
				</button>
				<button
					bind:this={tombolYa}
					type="button"
					class="tbl"
					class:tbl-merah={aktif.bahaya}
					disabled={!bolehYa}
					onclick={() => aktif.selesai(true)}
				>
					{aktif.teksYa ?? 'Ya, lanjutkan'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.tirai {
		display: grid;
		place-items: center;
		z-index: 80;
	}
	.kotak {
		position: relative;
		width: min(440px, 100%);
		padding: var(--s-6) var(--s-6) var(--s-5);
		display: flex;
		flex-direction: column;
		gap: var(--s-4);
		transform: rotate(-0.6deg);
	}
	.pin {
		position: absolute;
		left: 50%;
		top: -9px;
		width: 17px;
		height: 17px;
		transform: translateX(-50%);
		background: var(--pin-brass);
	}
	.bahaya .pin {
		background: var(--pin-mood-1);
	}
	.kepala {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}
	.ikon {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: rgb(27 27 23 / 0.07);
		color: var(--ink);
	}
	.bahaya .ikon {
		background: rgb(158 59 52 / 0.12);
		color: var(--danger);
	}
	.judul {
		color: var(--ink);
		font-size: var(--text-lg);
		line-height: 1.15;
		padding-top: 6px;
	}
	.pesan {
		margin: 0;
		font-family: var(--f-read);
		font-size: var(--text-md);
		line-height: 1.65;
		color: var(--ink-soft);
		text-wrap: pretty;
	}
	.aksi {
		display: flex;
		justify-content: flex-end;
		gap: var(--s-3);
		flex-wrap: wrap;
	}
	.tbl-merah {
		background: var(--danger);
	}
	.tbl-merah:hover:not(:disabled) {
		background: var(--danger-hi);
	}
</style>
