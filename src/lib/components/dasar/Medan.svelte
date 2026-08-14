<script lang="ts">
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

	const kelasStatus = $derived(
		status === 'benar' ? 'isian-benar' : status === 'salah' ? 'isian-salah' : ''
	);
</script>

<label class="label-medan">
	<span class="t-data t-data-ink">{label}</span>
	<input
		{type}
		{placeholder}
		{disabled}
		autocomplete={autocomplete as never}
		class="isian {mono ? 'isian-data' : ''} {kelasStatus}"
		bind:value
		oninput={(e) => oninput?.((e.currentTarget as HTMLInputElement).value)}
		onkeydown={(e) => e.key === 'Enter' && onenter?.()}
	/>
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
