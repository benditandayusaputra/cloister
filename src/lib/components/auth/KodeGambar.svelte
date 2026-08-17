<script lang="ts">
	import { onMount } from 'svelte';
	import Ikon from '$components/dasar/Ikon.svelte';
	import { ambilTantangan, type Jawaban, type Tantangan } from '$lib/captcha/klien.ts';

	interface Props {
		jawaban: Jawaban | null;
		situs: string;
	}

	let { jawaban = $bindable(null), situs = $bindable('') }: Props = $props();

	let tantangan = $state<Tantangan | null>(null);
	let teks = $state('');
	let memuat = $state(true);
	let gagal = $state(false);

	export async function segarkan() {
		memuat = true;
		gagal = false;
		teks = '';
		try {
			tantangan = await ambilTantangan();
		} catch {
			tantangan = null;
			gagal = true;
		} finally {
			memuat = false;
		}
	}

	$effect(() => {
		const bersih = teks.trim();
		jawaban = tantangan && bersih.length > 0 ? { token: tantangan.token, teks: bersih } : null;
	});

	onMount(() => {
		void segarkan();
	});
</script>

<div class="kode">
	<span class="tanya" id="kode-tanya">Ketik huruf yang ada di gambar</span>

	<div class="baris">
		<div class="bingkai">
			{#if tantangan}
				<img src={tantangan.gambar} alt="Gambar berisi {tantangan.panjang} huruf dan angka" />
			{:else if memuat}
				<span class="kabar">Mengambil gambar…</span>
			{:else if gagal}
				<span class="kabar">Gambar gagal dimuat</span>
			{/if}
		</div>
		<button
			type="button"
			class="ganti"
			onclick={segarkan}
			title="Ganti gambar"
			aria-label="Ganti gambar"
			disabled={memuat}
		>
			<Ikon nama="sinkron" ukuran={17} tebal={2.1} />
		</button>
	</div>

	<input
		class="isian"
		type="text"
		bind:value={teks}
		aria-describedby="kode-tanya"
		aria-label="Huruf di gambar"
		placeholder={tantangan ? `${tantangan.panjang} huruf` : ''}
		maxlength="12"
		autocomplete="off"
		autocapitalize="characters"
		autocorrect="off"
		spellcheck="false"
	/>
</div>

<label class="jebakan" aria-hidden="true">
	Situs web
	<input type="text" name="situs" tabindex="-1" autocomplete="off" bind:value={situs} />
</label>

<style>
	.kode {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.tanya {
		font-family: var(--f-display);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--ink);
	}
	.baris {
		display: flex;
		align-items: stretch;
		gap: 8px;
	}
	.bingkai {
		flex: 1;
		min-width: 0;
		display: grid;
		place-items: center;
		min-height: 84px;
		padding: 4px;
		border: 1px solid var(--garis-kertas);
		border-radius: var(--r-control);
		background: rgb(255 255 255 / 0.5);
		overflow: hidden;
	}
	.bingkai img {
		display: block;
		width: 100%;
		max-width: 250px;
		height: auto;
		image-rendering: auto;
		user-select: none;
		-webkit-user-select: none;
		pointer-events: none;
	}
	.kabar {
		font-family: var(--f-read);
		font-size: var(--text-sm);
		color: var(--ink-soft);
	}
	.ganti {
		flex-shrink: 0;
		width: 44px;
		display: grid;
		place-items: center;
		border: 1px solid var(--garis-kertas);
		border-radius: var(--r-control);
		background: rgb(255 255 255 / 0.5);
		color: var(--ink);
		cursor: pointer;
		transition: background var(--dur-fast);
	}
	.ganti:hover:not(:disabled) {
		background: rgb(255 255 255 / 0.85);
	}
	.ganti:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.isian {
		width: 100%;
		min-height: 46px;
		padding: 0 12px;
		border: 1px solid var(--garis-kertas);
		border-radius: var(--r-control);
		background: rgb(255 255 255 / 0.5);
		color: var(--ink);
		font-family: var(--f-data);
		font-size: var(--text-base);
		letter-spacing: 0.28em;
		text-transform: uppercase;
		outline: none;
	}
	.isian:focus {
		border-color: var(--accent);
	}
	:global(html[data-gaya='liquid-glass']) .bingkai,
	:global(html[data-gaya='liquid-glass']) .ganti,
	:global(html[data-gaya='liquid-glass']) .isian {
		background: rgb(0 0 0 / 0.24);
		border-color: rgb(255 255 255 / 0.24);
		color: var(--ink-on-board);
	}
	:global(html[data-gaya='liquid-glass']) .tanya {
		color: var(--ink-on-board);
	}
	:global(html[data-gaya='liquid-glass']) .ganti:hover:not(:disabled) {
		background: rgb(0 0 0 / 0.4);
	}
	.jebakan {
		position: absolute;
		left: -10000px;
		top: auto;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
</style>
