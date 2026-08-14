<script lang="ts">
	import { page } from '$app/state';
	import { i18n } from '$lib/state/i18n.svelte.ts';
	import { sesi } from '$lib/state/sesi.svelte.ts';

	const menu = $derived([
		{ href: '/pengaturan/akun', label: i18n.t.pengaturan.akun },
		{ href: '/pengaturan/keamanan', label: i18n.t.pengaturan.keamanan },
		{ href: '/pengaturan/perangkat', label: i18n.t.pengaturan.perangkat },
		{ href: '/pengaturan/tampilan', label: i18n.t.pengaturan.tampilan },
		{ href: '/pengaturan/publik', label: i18n.t.pengaturan.publik },
		{ href: '/pengaturan/data', label: i18n.t.pengaturan.data },
		...(sesi.isModerator ? [{ href: '/pengaturan/moderasi', label: i18n.t.pengaturan.moderasi }] : [])
	]);
</script>

<nav style="display:flex;flex-direction:column;gap:var(--s-2)">
	<a href="/app" class="tbl-papan" style="justify-content:flex-start;text-decoration:none">
		&#8592; {i18n.t.umum.kembali}
	</a>
	<span class="t-judul t-lg" style="padding:var(--s-3) 0">{i18n.t.pengaturan.judul}</span>
	{#each menu as m (m.href)}
		<a
			href={m.href}
			class="tbl-papan {page.url.pathname === m.href ? 'tbl-papan-aktif' : ''}"
			style="min-height:52px;justify-content:flex-start;padding:0 16px;text-decoration:none">{m.label}</a
		>
	{/each}
	<a
		href="/bukti"
		class="tbl-papan"
		style="min-height:52px;justify-content:flex-start;padding:0 16px;margin-top:var(--s-4);text-decoration:none"
		>Bukti</a
	>
	<button
		type="button"
		class="tbl-papan"
		style="min-height:52px;justify-content:flex-start;padding:0 16px;margin-top:var(--s-2)"
		onclick={() => sesi.keluar()}>{i18n.t.umum.keluar}</button
	>
</nav>
