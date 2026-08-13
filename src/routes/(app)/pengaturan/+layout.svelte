<script lang="ts">
	import NavPengaturan from '$components/pengaturan/NavPengaturan.svelte';
	import PitaOffline from '$components/nav/PitaOffline.svelte';

	let { children } = $props();
</script>

<div class="ruangan">
	<div class="shell">
		<div
			style="display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:var(--s-6);align-items:start"
			class="tata-pengaturan"
		>
			<NavPengaturan />
			<div style="display:flex;flex-direction:column;gap:var(--s-5);min-width:0">
				<PitaOffline />
				{@render children()}
			</div>
		</div>
	</div>
</div>

<style>
	@media (max-width: 860px) {
		.tata-pengaturan {
			grid-template-columns: minmax(0, 1fr) !important;
		}
	}
</style>
