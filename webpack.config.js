const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: {
    preview_content_script: './source/preview_content_script',
    document_editor_context_script: './source/document_editor_context_script',
    codemirror_sync_current_value_with_data_attribute: './source/codemirror_sync_current_value_with_data_attribute',
    edit_attributes_with_form: './source/edit_attributes_with_form',
    document_live_preview_context_script: './source/document_live_preview_context_script/index'
  },
  output: {
    publicPath: "/dist/",
    clean: true,
  },
  module: {
    rules: [
      { test: /\.ts$/, loader: "ts-loader" },
      { test: /\.html$/, loader: "html-loader" },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "static" },
        { from: "node_modules/webextension-polyfill/dist/browser-polyfill.min.js" },
      ],
    }),
  ],
};