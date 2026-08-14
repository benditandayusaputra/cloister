<script lang="ts">
	import Logo from '$components/nav/Logo.svelte';
	import MenuMobile from '$components/nav/MenuMobile.svelte';
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
			<nav class="nav-muka" style="margin-left:auto;display:flex;align-items:center;gap:var(--s-3);flex-wrap:wrap">
				<a href="/tentang" class="tbl-papan nav-muka-tautan" style="text-decoration:none">Tentang</a>
				<a href="/privasi" class="tbl-papan nav-muka-tautan" style="text-decoration:none">Privasi</a>
				<a href="/app" class="tbl nav-muka-tautan" style="text-decoration:none">Jurnalku</a>
				<MenuMobile
					tautan={[
						{ href: '/tentang', label: 'Tentang' },
						{ href: '/keamanan', label: 'Keamanan' },
						{ href: '/privasi', label: 'Privasi' },
						{ href: '/app', label: 'Jurnalku', utama: true }
					]}
				/>
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

<style>
	@media (max-width: 700px) {
		.nav-muka-tautan {
			display: none;
		}
	}
</style>
