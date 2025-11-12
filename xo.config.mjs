import litomoreXoConfig from '@litomore/xo-config';

const config = [
	...litomoreXoConfig,
	{
		// [TODO] To be enforced in the future.
		rules: {
			'@typescript-eslint/no-unsafe-call': 'off',
		},
	},
];

export default config;
