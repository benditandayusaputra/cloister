<script lang="ts">
	import Ikon from './Ikon.svelte';

	interface Props {
		label: string;
		value: string;
		type?: 'text' | 'email' | 'password' | 'number';
		placeholder?: string;
		mono?: boolean;
		autocomplete?: string;
		status?: 'netral' | 'benar' | 'salah';
		pesan?: string;
		disabled?: boolean;
		oninput?: (v: string) => void;
		onenter?: () => void;
	}

	let {
		label,
		value = $bindable(),
		type = 'text',
		placeholder = '',
		mono = false,
		autocomplete,
		status = 'netral',
		pesan = '',
		disabled = false,
		oninput,
		onenter
	}: Props = $props();

	let tampilSandi = $state(false);

	const kelasStatus = $derived(
		status === 'benar' ? 'isian-benar' : status === 'salah' ? 'isian-salah' : ''
	);
	const tipeAktif = $derived(type === 'password' && tampilSandi ? 'text' : type);
</script>

<label class="label-medan">
	<span class="t-data t-data-ink">{label}</span>
	<span class="bungkus" class:sandi={type === 'password'}>
		<input
			type={tipeAktif}
			{placeholder}
			{disabled}
			autocomplete={autocomplete as never}
			class="isian {mono ? 'isian-data' : ''} {kelasStatus}"
			bind:value
			oninput={(e) => oninput?.((e.currentTarget as HTMLInputElement).value)}
			onkeydown={(e) => e.key === 'Enter' && onenter?.()}
		/>
		{#if type === 'password'}
			<button
				type="button"
				class="mata"
				aria-label={tampilSandi ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
				aria-pressed={tampilSandi}
				title={tampilSandi ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
				{disabled}
				onclick={() => (tampilSandi = !tampilSandi)}
			>
				<Ikon nama={tampilSandi ? 'mata-tutup' : 'mata'} ukuran={18} />
			</button>
		{/if}
	</span>
	{#if pesan}
		<span
			class="t-data"
			style="color:{status === 'salah'
				? 'var(--danger)'
				: status === 'benar'
					? 'var(--ok)'
					: 'var(--ink-soft)'}">{pesan}</span
		>
	{/if}
</label>

<style>
	.bungkus {
		position: relative;
		display: block;
	}
	.bungkus.sandi .isian {
		padding-right: 44px;
	}
	.mata {
		cursor: pointer;
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border: none;
		background: transparent;
		color: var(--ink-soft);
		border-radius: var(--r-control);
	}
	.mata:hover:not(:disabled) {
		color: var(--ink);
		background: rgb(27 27 23 / 0.06);
	}
	.mata:disabled {
		cursor: default;
		opacity: 0.4;
	}
</style>
