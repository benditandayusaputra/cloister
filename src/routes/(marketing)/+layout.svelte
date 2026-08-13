<script lang="ts">
	import Logo from '$components/nav/Logo.svelte';
	import SaklarMode from '$components/nav/SaklarMode.svelte';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	let { children } = $props();

	const tahun = new Date().getFullYear();
</script>

<div class="ruangan">
	<div class="shell shell-sempit">
		<header
			style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding-bottom:var(--s-6)"
		>
			<a
				href="/"
				style="display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--ink-on-board)"
			>
				<Logo />
				<span class="t-judul t-lg">Cloister</span>
			</a>
			<nav style="margin-left:auto;display:flex;align-items:center;gap:var(--s-3);flex-wrap:wrap">
				<a href="/baca" class="tbl-papan" style="text-decoration:none">Baca publik</a>
				<a href="/privasi" class="tbl-papan" style="text-decoration:none">Privasi</a>
				<SaklarMode />
				<a href="/masuk" class="tbl" style="text-decoration:none">{i18n.t.auth.masuk}</a>
			</nav>
		</header>

		{@render children()}

		<footer
			style="margin-top:var(--s-9);padding-top:var(--s-5);border-top:1px solid var(--garis-ruang);display:flex;flex-wrap:wrap;gap:var(--s-4);justify-content:space-between"
		>
			<span
				class="t-data"
				style="color:var(--ink-on-board-dim);text-transform:none;letter-spacing:0.02em"
			>
				&copy; {tahun} Bendi Tandayu Saputra &middot; made with &hearts;
			</span>
			<div style="display:flex;gap:var(--s-4);flex-wrap:wrap;align-items:center">
				<a href="/privasi" class="t-data" style="color:var(--ink-on-board-dim)">Privasi</a>
				<a href="/keamanan" class="t-data" style="color:var(--ink-on-board-dim)">Keamanan</a>
				<a href="/baca" class="t-data" style="color:var(--ink-on-board-dim)">Catatan publik</a>
				<a href="/bukti" class="t-data" style="color:var(--ink-on-board-dim)">Bukti</a>
			</div>
		</footer>
	</div>
</div>
