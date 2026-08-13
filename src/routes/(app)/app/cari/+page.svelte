<script lang="ts">
	import { goto } from '$app/navigation';
	import TiraiCari from '$components/cari/TiraiCari.svelte';
</script>

<div class="ruangan" style="min-height:100vh"></div>
<TiraiCari terbuka={true} ontutup={() => goto('/app')} />
