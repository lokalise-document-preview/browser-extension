const path = require('path');
const SizePlugin = require('size-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
	devtool: 'inline-source-map',
	stats: 'errors-only',
	node: false,
	entry: {
		preview_content_script: './source/preview_content_script',
		document_editor_context_script: './source/document_editor_context_script',
		codemirror_sync_current_value_with_data_attribute: './source/codemirror_sync_current_value_with_data_attribute',
		edit_attributes_with_form: './source/edit_attributes_with_form',
		document_live_preview_context_script: './source/document_live_preview_context_script/index'
	},
	module: {
		rules: [
			{
				test: /\.(js|ts|tsx)$/,
				loader: 'ts-loader',
				exclude: /node_modules/
			},
			{
				test: /\.html$/i,
				use: [
					{
						loader: 'raw-loader',
						options: {
							esModule: false,
						},
					},
				],
			}
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
				ignore: ['*.js', '*.ts', '*.html']
			}
		])
	],
	optimization: {
		usedExports: true,
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					mangle: true,
					compress: true,
					output: {
						beautify: false,
						indent_level: 2
					}
				}
			})
		]
	}
};
