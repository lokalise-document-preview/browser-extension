const path = require('path');
const SizePlugin = require('size-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
	devtool: 'inline-source-map',
	stats: 'errors-only',
	entry: {
		preview_content_script: './source/preview_content_script',
		edit_attributes_with_form: './source/edit_attributes_with_form',
		editor_context_script: './source/editor_context_script'
	},
	module: {
		rules: [
			{
				test: /\.(js|ts|tsx)$/,
				loader: 'ts-loader',
				exclude: /node_modules/
			},
		],
	},
	resolve: {
		extensions: ['.ts', '.js']
	},
	output: {
		path: path.join(__dirname, 'distribution'),
		filename: '[name].js'
	},
	plugins: [
		new SizePlugin(),
		new CopyWebpackPlugin([
			'node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
			{
				from: '**/*',
				context: 'source',
				ignore: ['*.js']
			}
		])
	],
	optimization: {
		usedExports: true,
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					mangle: false,
					compress: false,
					output: {
						beautify: true,
						indent_level: 2 // eslint-disable-line camelcase
					}
				}
			})
		]
	}
};
