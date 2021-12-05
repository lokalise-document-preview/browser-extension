import { PreviewParams } from './types'
import { fetchHtmlDocumentPreview, isApiTokenAvailable, setApiToken } from './apiService'
import getProjectParams from './getProjectParams'
import { PreviewWindow, CurrentPreview, HtmlPreviewWindow, CollectApiDocument, ErrorDocument } from './triggerPreview'
import { addOpenPreviewBtn, listenKeyTranslationOpenOrSave, openPreviewBtnId } from './injectPreviewBtnAndListeners'

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

      if (previewWindow?.isOpened() === false) {
        return
      }

      if (!await isApiTokenAvailable()) {
        closePreview()
      }

      previewWindow?.loadLocalContentTemplate('templateLoadingPreview')
      await populateProjectParams()
      await fetchPreviewIntoCurrentlyOpenedWindow()
    })()
  })
  observer.observe(keysContainer, { childList: true })
}

// Close everything when the parent pages closes
window.addEventListener('beforeunload', closePreview)

async function callbackToFetchPreview (onLoaded: Function): Promise<void> {
  // Prevent opening multiple previews
  closePreview()

  if (projectParams?.fileformat !== 'html') {
    return
  }

  previewWindow = new HtmlPreviewWindow()
  previewWindow.open()
  previewWindow.loadLocalContentTemplate('templateLoadingPreview')
  await fetchPreviewIntoCurrentlyOpenedWindow()
  previewWindow.focus()

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
    previewWindow.close()
    previewWindow = null
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
        await fetchPreviewIntoCurrentlyOpenedWindow()
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

    if (projectParams.fileformat !== 'html') {
      showError('Preview is available only for HTML documents.')
    }
  } catch (error) {
    showError(error as Error | string)
  }
}

async function fetchPreviewIntoCurrentlyOpenedWindow (): Promise<void> {
  if (previewWindow === null || !previewWindow.isOpened()) {
    return
  }

  if (projectParams?.fileformat !== 'html') {
    return
  }

  try {
    const previewContent = await fetchHtmlDocumentPreview(projectParams)
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
