import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		rules: {
			// Trusted markdown content rendered via {@html} from filesystem
			'svelte/no-at-html-tags': 'off',
			// Static adapter — all routes prerendered, no need for resolve()
			'svelte/no-navigation-without-resolve': 'off',
			// Simple array iterations throughout — keys not needed for static content
			'svelte/require-each-key': 'off',
			// A string literal in a mustache is only "useless" when a plain attribute
			// could say the same thing; one with escapes (e.g. the \n in the OG
			// title) cannot be expressed as an attribute, so keep those. Option per
			// eslint-plugin-svelte's no-useless-mustaches docs.
			'svelte/no-useless-mustaches': ['error', { ignoreStringEscape: true }]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		ignores: [
			'build/',
			'build-*/',
			'.claude/',
			'.svelte-kit/',
			'dist/',
			'.agents/',
			'pnpm-lock.yaml',
			'scripts/migrate-content.js'
		]
	}
);
