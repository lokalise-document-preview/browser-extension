import browser from 'webextension-polyfill'

appendJsFileAsInlineScript('codemirror_sync_current_value_with_data_attribute')
appendJsFileAsInlineScript('edit_attributes_with_form')

function appendJsFileAsInlineScript (filename: string): void {
  const script = document.createElement('script')
  script.src = browser.runtime.getURL(`${filename}.js`)
  document.body.appendChild(script)
}
