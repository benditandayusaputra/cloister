<script lang="ts">
	import MapBulan from './MapBulan.svelte';

	interface Props {
		tahun: number;
		jumlahPerBulan: number[];
		mobile?: boolean;
		onbuka: (bulan: number) => void;
	}

	let { tahun, jumlahPerBulan, mobile = false, onbuka }: Props = $props();
</script>

<div
	class="meja-kayu"
	style="padding:{mobile ? 'var(--s-5) var(--s-4)' : 'var(--s-8) var(--s-7)'};display:grid;grid-template-columns:repeat({mobile
		? 2
		: 4},1fr);gap:{mobile ? 'var(--s-6) var(--s-4)' : 'var(--s-7) var(--s-6)'}"
>
	{#each jumlahPerBulan as jumlah, i (i)}
		<MapBulan {tahun} bulan={i + 1} {jumlah} {mobile} {onbuka} />
	{/each}
</div>
