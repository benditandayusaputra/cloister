<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { i18n } from '$lib/state/i18n.svelte.ts';

	const KEY = 'cloister:nav-bawah';

	let tampil = $state(true);

	$effect(() => {
		if (browser) tampil = localStorage.getItem(KEY) !== '0';
	});

	$effect(() => {
		if (!browser) return;
		document.documentElement.dataset.navBawah = tampil ? '1' : '0';
		return () => {
			delete document.documentElement.dataset.navBawah;
		};
	});

	function setTampil(nilai: boolean) {
		tampil = nilai;
		if (browser) localStorage.setItem(KEY, nilai ? '1' : '0');
	}

	const item = $derived([
		{ href: '/app', label: 'Papan', ikon: 'papan', aktif: /^\/app(\/\d{4})?(\/\d{2})?$/.test(page.url.pathname) },
		{ href: '/app/cari', label: i18n.t.app.cari, ikon: 'cari', aktif: page.url.pathname.startsWith('/app/cari') },
		{ href: '/app/hari-ini', label: 'Tulis', ikon: 'tulis', aktif: /^\/app\/\d{4}\/\d{2}\/\d{2}/.test(page.url.pathname) },
		{ href: '/baca', label: 'Baca', ikon: 'baca', aktif: page.url.pathname.startsWith('/baca') },
		{ href: '/pengaturan', label: i18n.t.pengaturan.judul, ikon: 'atur', aktif: page.url.pathname.startsWith('/pengaturan') }
	]);
</script>

{#if tampil}
	<nav class="nav-bawah" aria-label="Navigasi utama">
		{#each item as m (m.href)}
			<a
				href={m.href}
				class="nav-bawah-item {m.ikon === 'tulis' ? 'nav-bawah-tulis' : ''}"
				aria-current={m.aktif ? 'page' : undefined}
			>
				<span class="nav-bawah-ikon" aria-hidden="true">
					{#if m.ikon === 'papan'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
							<rect x="3.2" y="4.2" width="17.6" height="15.6" rx="1.6" />
							<rect x="6.4" y="8" width="4.6" height="5.6" rx="0.6" transform="rotate(-3 8.7 10.8)" />
							<rect x="13.2" y="8.4" width="4.6" height="5.6" rx="0.6" transform="rotate(2.5 15.5 11.2)" />
						</svg>
					{:else if m.ikon === 'cari'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
							<circle cx="10.8" cy="10.8" r="5.8" />
							<path d="M15.2 15.2 L20 20" stroke-linecap="round" />
						</svg>
					{:else if m.ikon === 'tulis'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M12 5v14M5 12h14" stroke-linecap="round" />
						</svg>
					{:else if m.ikon === 'baca'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
							<path d="M12 6.5C10.2 4.9 7.6 4.4 3.5 4.6v13.6c4.1-.2 6.7.3 8.5 1.9 1.8-1.6 4.4-2.1 8.5-1.9V4.6c-4.1-.2-6.7.3-8.5 1.9Z" />
							<path d="M12 6.5v13.6" />
						</svg>
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
							<path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h10M18 17h2" stroke-linecap="round" />
							<circle cx="16" cy="7" r="1.9" />
							<circle cx="8" cy="12" r="1.9" />
							<circle cx="16" cy="17" r="1.9" />
						</svg>
					{/if}
				</span>
				<span class="nav-bawah-label">{m.label}</span>
			</a>
		{/each}
		<button
			type="button"
			class="nav-bawah-sembunyi"
			aria-label="Sembunyikan navigasi bawah"
			onclick={() => setTampil(false)}
		>
			<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M6 10l6 5 6-5" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>
	</nav>
{:else}
	<button
		type="button"
		class="nav-bawah-muncul"
		aria-label="Tampilkan navigasi bawah"
		onclick={() => setTampil(true)}
	>
		<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M6 14l6-5 6 5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>
{/if}

<style>
	.nav-bawah,
	.nav-bawah-muncul {
		display: none;
	}

	@media (max-width: 900px) {
		.nav-bawah {
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0;
			z-index: 40;
			display: flex;
			align-items: stretch;
			justify-content: space-around;
			gap: 2px;
			padding: 6px 40px calc(6px + env(safe-area-inset-bottom, 0px)) 8px;
			background: color-mix(in srgb, var(--room-wall) 88%, black 4%);
			backdrop-filter: blur(12px);
			-webkit-backdrop-filter: blur(12px);
			border-top: 1px solid var(--garis-ruang-kuat);
			box-shadow: 0 -6px 24px -8px rgb(0 0 0 / 0.45);
			animation: bd-muncul var(--dur-base) var(--ease-lift) both;
		}

		.nav-bawah-item {
			flex: 1;
			min-width: 0;
			min-height: 52px;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 3px;
			text-decoration: none;
			color: var(--ink-on-board-dim);
			border-radius: var(--r-control);
			transition: color var(--dur-fast) var(--ease-quiet);
		}

		.nav-bawah-item[aria-current='page'] {
			color: var(--ink-on-board);
		}

		.nav-bawah-item[aria-current='page'] .nav-bawah-label::after {
			content: '';
			display: block;
			margin: 2px auto 0;
			width: 5px;
			height: 5px;
			border-radius: 50%;
			background: var(--pin-brass);
		}

		.nav-bawah-ikon {
			width: 22px;
			height: 22px;
			display: grid;
			place-items: center;
		}

		.nav-bawah-ikon svg {
			width: 22px;
			height: 22px;
		}

		.nav-bawah-label {
			font-family: var(--f-data);
			font-size: 0.6rem;
			letter-spacing: 0.06em;
			text-transform: uppercase;
			max-width: 100%;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.nav-bawah-tulis .nav-bawah-ikon {
			width: 40px;
			height: 40px;
			margin-top: -18px;
			border-radius: 50%;
			background: var(--accent);
			color: var(--accent-ink);
			box-shadow:
				0 2px 0 rgb(0 0 0 / 0.35),
				0 6px 14px -4px rgb(0 0 0 / 0.5);
		}

		.nav-bawah-tulis .nav-bawah-ikon svg {
			width: 18px;
			height: 18px;
		}

		.nav-bawah-sembunyi {
			position: absolute;
			right: 4px;
			top: 50%;
			translate: 0 -50%;
			width: 32px;
			height: 40px;
			display: grid;
			place-items: center;
			border: none;
			background: transparent;
			color: var(--ink-on-board-dim);
			cursor: pointer;
		}

		.nav-bawah-muncul {
			position: fixed;
			right: 14px;
			bottom: calc(14px + env(safe-area-inset-bottom, 0px));
			z-index: 40;
			display: grid;
			place-items: center;
			width: 40px;
			height: 40px;
			border: 1px solid var(--garis-ruang-kuat);
			border-radius: 50%;
			background: color-mix(in srgb, var(--room-wall) 88%, black 4%);
			backdrop-filter: blur(12px);
			color: var(--ink-on-board);
			box-shadow: 0 4px 16px -4px rgb(0 0 0 / 0.5);
			cursor: pointer;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nav-bawah {
			animation: none;
		}
	}
</style>
