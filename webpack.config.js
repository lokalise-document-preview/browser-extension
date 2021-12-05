const CopyPlugin = require('copy-webpack-plugin')

module.exports = (env, options) => ({
  devtool: options.mode === 'development' ? 'inline-source-map' : false,
  stats: 'minimal',
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: {
    download_preview_content_script: './source/download_preview/content_script',
    editor_inject_inline_scripts_content_script: './source/editor_inject_inline_scripts/content_script',
    editor_sync_codemirror_with_dom_inline_script: './source/editor_sync_codemirror_with_dom/inline_script',
    editor_add_attributes_form_inline_script: './source/editor_add_attributes_form/inline_script',
    editor_live_preview_content_script: './source/editor_live_preview/content_script'
  },
  output: {
    publicPath: '/dist/',
    clean: true
  },
  module: {
    rules: [
      { test: /\.ts$/, loader: 'ts-loader' },
      { test: /\.html$/, loader: 'html-loader' }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'static' },
        { from: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js' }
      ]
    })
  ],
  watchOptions: {
    ignored: '**/node_modules'
  }
})
