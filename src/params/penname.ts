import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => /^@[a-z0-9_]{3,24}$/.test(param);
