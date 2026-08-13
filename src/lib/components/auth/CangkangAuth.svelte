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

<div class="ruangan">
	<div class="shell shell-sempit" style="display:flex;flex-direction:column;gap:var(--s-5)">
		<div style="display:flex;align-items:center;gap:14px;justify-content:center;position:relative">
			<a
				href="/"
				style="display:flex;align-items:center;gap:14px;text-decoration:none;color:var(--ink-on-board)"
			>
				<Logo />
				<span class="t-judul t-lg">Cloister</span>
			</a>
			<div style="position:absolute;right:0"><SaklarMode /></div>
		</div>

		<div
			style="align-self:center;width:100%;max-width:{lebar === 'lebar'
				? '840px'
				: '560px'};display:flex;flex-direction:column;gap:var(--s-4)"
		>
			{@render children()}
		</div>
	</div>
</div>
