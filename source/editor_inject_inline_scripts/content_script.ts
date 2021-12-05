import browser from 'webextension-polyfill'

appendJsFileAsInlineScript('editor_sync_codemirror_with_dom_inline_script')
appendJsFileAsInlineScript('editor_add_attributes_form_inline_script')

function appendJsFileAsInlineScript (filename: string): void {
  const script = document.createElement('script')
  script.src = browser.runtime.getURL(`${filename}.js`)
  document.body.appendChild(script)
}
