<script lang="ts">
	import { onMount } from 'svelte';
	import Ikon from '$components/dasar/Ikon.svelte';
	import { ambilTantangan, pecahkan, type Jawaban } from '$lib/captcha/klien.ts';

	interface Props {
		jawaban: Jawaban | null;
		situs: string;
	}

	let { jawaban = $bindable(null), situs = $bindable('') }: Props = $props();

	type Status = 'siap' | 'menghitung' | 'terbukti' | 'gagal';
	let status = $state<Status>('siap');
	let dicoba = $state(0);
	let pengontrol: AbortController | null = null;
	let janji: Promise<Jawaban> | null = null;

	export function tunggu(): Promise<Jawaban> {
		if (jawaban && jawaban.exp * 1000 > Date.now() + 5000) return Promise.resolve(jawaban);
		return mulai();
	}

	async function mulai(): Promise<Jawaban> {
		if (janji) return janji;
		pengontrol?.abort();
		pengontrol = new AbortController();
		status = 'menghitung';
		dicoba = 0;
		janji = (async () => {
			try {
				const t = await ambilTantangan();
				const j = await pecahkan(t, (n) => (dicoba = n), pengontrol!.signal);
				jawaban = j;
				status = 'terbukti';
				return j;
			} catch (err) {
				status = 'gagal';
				throw err;
			} finally {
				janji = null;
			}
		})();
		return janji;
	}

	export function segarkan() {
		jawaban = null;
		void mulai().catch(() => {});
	}

	onMount(() => {
		void mulai().catch(() => {});
		return () => pengontrol?.abort();
	});
</script>

<div class="bukti" data-status={status} aria-live="polite">
	<span class="kotak" aria-hidden="true">
		{#if status === 'terbukti'}
			<Ikon nama="cek" ukuran={16} tebal={2.6} />
		{:else if status === 'menghitung'}
			<span class="putar"></span>
		{:else if status === 'gagal'}
			<Ikon nama="tutup" ukuran={16} tebal={2.4} />
		{/if}
	</span>
	<span class="teks">
		{#if status === 'terbukti'}
			<strong>Bukan robot, terbukti.</strong>
			<span class="ket">Perangkatmu menyelesaikan teka-teki kecil, tanpa pelacak pihak ketiga.</span>
		{:else if status === 'menghitung'}
			<strong>Membuktikan kamu bukan robot…</strong>
			<span class="ket">{dicoba.toLocaleString('id-ID')} percobaan, semuanya di perangkat ini.</span>
		{:else if status === 'gagal'}
			<strong>Pembuktian gagal.</strong>
			<button type="button" class="ulang" onclick={segarkan}>Coba lagi</button>
		{:else}
			<strong>Pemeriksaan bukan robot</strong>
		{/if}
	</span>
	<span class="merek" aria-hidden="true">Cloister · bukti kerja</span>
</div>

<label class="jebakan" aria-hidden="true">
	Situs web
	<input type="text" name="situs" tabindex="-1" autocomplete="off" bind:value={situs} />
</label>

<style>
	.bukti {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 56px;
		padding: 8px 12px;
		border: 1px solid rgb(27 27 23 / 0.22);
		border-radius: var(--r-control);
		background: rgb(255 255 255 / 0.35);
		color: var(--ink);
	}
	.kotak {
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		border: 2px solid rgb(27 27 23 / 0.35);
		border-radius: 4px;
		background: #fff;
		color: var(--ok);
		transition: border-color var(--dur-fast);
	}
	.bukti[data-status='terbukti'] .kotak {
		border-color: var(--ok);
	}
	.bukti[data-status='gagal'] .kotak {
		border-color: var(--danger);
		color: var(--danger);
	}
	.putar {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid rgb(27 27 23 / 0.2);
		border-top-color: var(--accent);
		animation: putar 0.8s linear infinite;
	}
	@keyframes putar {
		to {
			rotate: 360deg;
		}
	}
	.teks {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
		font-family: var(--f-display);
		font-size: var(--text-sm);
	}
	.ket {
		font-family: var(--f-read);
		font-size: 0.8rem;
		color: var(--ink-soft);
	}
	.ulang {
		align-self: flex-start;
		cursor: pointer;
		border: none;
		background: transparent;
		padding: 0;
		color: var(--accent);
		font-family: var(--f-display);
		font-size: 0.82rem;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.merek {
		flex-shrink: 0;
		font-family: var(--f-data);
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-faint);
		max-width: 64px;
		text-align: right;
		line-height: 1.3;
	}
	:global(html[data-gaya='liquid-glass']) .bukti {
		background: rgb(0 0 0 / 0.28);
		border-color: rgb(255 255 255 / 0.22);
	}
	:global(html[data-gaya='liquid-glass']) .bukti .kotak {
		background: rgb(255 255 255 / 0.92);
		border-color: rgb(255 255 255 / 0.6);
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
