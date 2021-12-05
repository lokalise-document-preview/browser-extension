import { PreviewParams, PreviewWindow, CurrentPreview } from './types'
import { fetchHtmlDocumentPreview, fetchDocxDocumentPreview, isApiTokenAvailable, setApiToken } from './helpers/apiService'
import getProjectParams from './helpers/getProjectParams'
import { CollectApiDocument, DocxPreviewWindow, ErrorDocument, HtmlPreviewWindow } from './previewWindow'
import { addOpenPreviewBtn, listenKeyTranslationOpenOrSave, openPreviewBtnId } from './helpers/injectPreviewBtnAndListeners'

let previewWindow: PreviewWindow | null = null
let currentPreview: CurrentPreview | null = null
const previewBtnSiblingSelector = '.languages-container > .bilingual-select'

let processedUrl = window.location.href
let projectParams: PreviewParams | undefined

void (async function initializePreview (): Promise<void> {
  if (!await isApiTokenAvailable()) {
    addOpenPreviewBtn(previewBtnSiblingSelector, callbackCollectApiToken)
    return
  }

  await populateProjectParams()

  if ((projectParams != null) && Object.values(projectParams).every(Boolean)) {
    insertActivePreviewBtnAndListeners()
  }
})()

// Support switching between files withing a project
const keysContainer = document.getElementById('endless')
if (keysContainer != null) {
  const observer = new MutationObserver(() => {
    void (async () => {
      if (window.location.href === processedUrl) {
        return
      }

      if (previewWindow === null || !previewWindow?.isOpened()) {
        return
      }

      await populateProjectParams()
      void callbackToFetchPreview(() => {})
    })()
  })
  observer.observe(keysContainer, { childList: true })
}

// Close everything when the parent pages closes
window.addEventListener('beforeunload', closePreview)

async function callbackToFetchPreview (onLoaded: Function): Promise<void> {
  // Prevent opening multiple previews
  closePreview()

  const fileformat = projectParams?.fileformat ?? ''

  if (!['html', 'docx'].includes(fileformat)) {
    return
  }

  switch (fileformat) {
    case 'html':
      previewWindow = new HtmlPreviewWindow()
      break
    case 'docx':
      previewWindow = new DocxPreviewWindow()
      break
  }

  if (previewWindow != null) {
    previewWindow.open()
    previewWindow.loadLocalContentTemplate('templateLoadingPreview')
    await fetchPreviewIntoCurrentlyOpenedWindow()
    previewWindow.focus()
  }

  onLoaded()
}

function callbackToUpdateHighlightFetchedPreview (xpath?: string): void {
  const isValidXpath = xpath?.startsWith('/html/body/') ?? false
  if (isValidXpath) {
    currentPreview?.keyHighlight(xpath as string)
  }
}

function callbackToUpdateKeyInFetchedPreview (xpath?: string, newContent?: string): void {
  const isValidXpath = xpath?.startsWith('/html/body/') ?? false
  if (isValidXpath) {
    currentPreview?.keyUpdateContent(xpath as string, newContent ?? '')
  }
}

function callbackToUpdateClosedKeyInFetchedPreview (xpath?: string, currentContent?: string): void {
  const isValidXpath = xpath?.startsWith('/html/body/') ?? false
  if (isValidXpath) {
    currentPreview?.keyUpdateContent(xpath as string, currentContent ?? '')
    currentPreview?.keyDismissHighlight(xpath as string)
  }
}

function callbackCollectApiToken (onLoaded: Function): void {
  if (previewWindow != null) {
    closePreview()
  }

  previewWindow = new HtmlPreviewWindow()
  previewWindow.open()
  const doc = previewWindow.loadLocalContentTemplate('templateCollectApiToken')
  if (doc != null) {
    const collectApiDocument = new CollectApiDocument(doc)
    collectApiDocument.listenToTokenInput(async token => {
      if (token.length < 40) {
        return
      }

      previewWindow?.loadLocalContentTemplate('templateLoadingPreview')
      await setApiToken(token)
      await populateProjectParams()
      if ((projectParams != null) && Object.values(projectParams).every(Boolean)) {
        void callbackToFetchPreview(() => {})
        document.getElementById(openPreviewBtnId)?.remove()
        insertActivePreviewBtnAndListeners()
      }
    })
  }
  onLoaded()
}

async function populateProjectParams (): Promise<void> {
  try {
    projectParams = await getProjectParams()
    processedUrl = window.location.href
    if (!['html', 'docx'].includes(projectParams.fileformat)) {
      showError('Preview is available only for HTML and DOCX documents.')
    }
  } catch (error) {
    showError(error as Error | string)
  }
}

async function fetchPreviewIntoCurrentlyOpenedWindow (): Promise<void> {
  if (projectParams === undefined) {
    return
  }

  if (previewWindow === null || !previewWindow.isOpened()) {
    return
  }

  const fileformat = projectParams?.fileformat ?? ''

  if (!['html', 'docx'].includes(fileformat)) {
    return
  }

  try {
    let previewContent
    switch (fileformat) {
      case 'html':
        previewContent = await fetchHtmlDocumentPreview(projectParams)
        break
      case 'docx':
        previewContent = await fetchDocxDocumentPreview(projectParams)
        break
    }
    currentPreview = await previewWindow.loadNewExternalContent(previewContent)
  } catch (error) {
    showError(error as Error | string)
  }
}

function insertActivePreviewBtnAndListeners (): void {
  addOpenPreviewBtn(previewBtnSiblingSelector, onLoaded => { void callbackToFetchPreview(onLoaded) })
  listenKeyTranslationOpenOrSave(
    callbackToUpdateHighlightFetchedPreview,
    callbackToUpdateKeyInFetchedPreview,
    callbackToUpdateClosedKeyInFetchedPreview
  )
}

function closePreview (): void {
  previewWindow?.close()
  previewWindow = null
  currentPreview = null
}

function showError (msg: Error | string): void {
  if (previewWindow?.isOpened() === false) {
    return
  }

  currentPreview = null
  const errorDocElement = previewWindow?.loadLocalContentTemplate('templateError')
  if (errorDocElement != null) {
    const errorDoc = new ErrorDocument(errorDocElement)
    errorDoc.insertError(msg)
  }
}
