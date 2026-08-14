<script lang="ts">
	import Logo from '$components/nav/Logo.svelte';
	import type { Snippet } from 'svelte';
	import SaklarMode from '$components/nav/SaklarMode.svelte';

	interface Props {
		lebar?: 'form' | 'lebar';
		children: Snippet;
	}

	let { lebar = 'form', children }: Props = $props();
</script>

<div class="ruangan ruangan-muka">
	<div class="shell shell-sempit" style="display:flex;flex-direction:column;gap:var(--s-5)">
		<div
			class="muncul"
			style="display:flex;align-items:center;gap:14px;justify-content:center;position:relative"
		>
			<a
				href="/"
				style="display:flex;align-items:center;gap:14px;text-decoration:none;color:var(--ink-on-board)"
			>
				<Logo />
				<span class="t-judul t-lg">Cloister</span>
			</a>
			<div style="position:absolute;right:0"><SaklarMode /></div>
		</div>

		<p
			class="muncul"
			style="--tunda:60ms;align-self:center;margin:0;text-align:center;font-family:var(--f-read);font-size:var(--text-sm);color:var(--ink-on-board-dim);max-width:46ch;text-wrap:pretty"
		>
			Ditulis di dalam. Tidak terbaca dari luar.
		</p>

		<div
			class="muncul"
			style="--tunda:120ms;align-self:center;width:100%;max-width:{lebar === 'lebar'
				? '840px'
				: '560px'};display:flex;flex-direction:column;gap:var(--s-4)"
		>
			{@render children()}
		</div>

		<div
			class="muncul"
			style="--tunda:200ms;align-self:center;display:flex;gap:14px;flex-wrap:wrap;justify-content:center"
		>
			<span class="t-data" style="color:var(--ink-on-board-dim)">Dienkripsi di perangkat</span>
			<span class="t-data" style="color:var(--ink-on-board-dim)">·</span>
			<span class="t-data" style="color:var(--ink-on-board-dim)">Jalan tanpa jaringan</span>
			<span class="t-data" style="color:var(--ink-on-board-dim)">·</span>
			<span class="t-data" style="color:var(--ink-on-board-dim)">Sumber terbuka</span>
		</div>
	</div>
</div>
