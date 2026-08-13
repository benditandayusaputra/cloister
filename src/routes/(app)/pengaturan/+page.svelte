<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => void goto('/pengaturan/akun', { replaceState: true }));
</script>
