<script lang="ts">
	import Logo from '$components/nav/Logo.svelte';
	import '../../../app.css';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	let { children } = $props();

	const tahun = new Date().getFullYear();
</script>

<div class="ruangan">
	<div class="shell" style="display:flex;flex-direction:column;gap:var(--s-5)">
		<header style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
			<a
				href="/baca"
				style="display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--ink-on-board)"
			>
				<Logo />
				<span class="t-judul t-lg">Cloister</span>
			</a>
			<nav style="margin-left:auto;display:flex;gap:var(--s-3);flex-wrap:wrap">
				<a href="/privasi" class="tbl-papan" style="text-decoration:none">Privasi</a>
				<a href="/app" class="tbl" style="text-decoration:none">Jurnalku</a>
			</nav>
		</header>

		{@render children()}

		<footer
			style="margin-top:var(--s-8);padding-top:var(--s-5);border-top:1px solid var(--garis-ruang);display:flex;flex-direction:column;gap:var(--s-3)"
		>
			<p
				style="margin:0;max-width:62ch;font-family:var(--f-read);font-size:var(--text-sm);line-height:1.7;color:var(--ink-on-board-dim);text-wrap:pretty"
			>
				{i18n.t.publik.krisis}
			</p>
			<span class="t-data"
				>Hanya tulisan yang sengaja diterbitkan penulisnya yang muncul di sini. Catatan privat tetap
				terkunci.</span
			>
			<span
				class="t-data"
				style="color:var(--ink-on-board-dim);text-transform:none;letter-spacing:0.02em"
			>
				&copy; {tahun} Bendi Tandayu Saputra &middot; made with &hearts;
			</span>
		</footer>
	</div>
</div>
