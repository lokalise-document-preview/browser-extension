import templateLoadingPreview from './templateLoadingPreview.html'
import templateCollectApiToken from './templateCollectApiToken.html'
import templateError from './templateError.html'

export interface PreviewWindow {
  open: () => void
  close: () => void
  focus: () => void
  isOpened: () => boolean
  loadLocalContentTemplate: (templateName: string) => Document | null
  loadNewExternalContent: (content: string) => Promise<CurrentPreview> | Promise<never>
}

export interface CurrentPreview {
  keyHighlight: (xpath: string) => void
  keyDismissHighlight: (xpath: string) => void
  keyUpdateContent: (xpath: string, newContent: string) => void
}

export class HtmlPreviewWindow implements PreviewWindow {
  private win!: Window | null

  open (): void {
    this.win = window.open('about:blank', '_blank')
  }

  close (): void {
    this.win?.close()
    this.win = null
  }

  focus (): void {
    this.win?.focus()
  }

  isOpened (): boolean {
    return !this.isClosed()
  }

  loadLocalContentTemplate (templateName: string): Document | null {
    if (this.win != null) {
      let template = ''
      switch (templateName) {
        case 'templateLoadingPreview':
          template = templateLoadingPreview
          break
        case 'templateCollectApiToken':
          template = templateCollectApiToken
          break
        case 'templateError':
          template = templateError
          break
      }
      this.win.document.documentElement.innerHTML = template
      return this.win.document
    }
    return null
  }

  async loadNewExternalContent (html: string): Promise<CurrentPreview | never> {
    if (this.isClosed()) {
      return await Promise.reject(new Error('No content was received.'))
    }

    this.win?.document.body.classList.add('loading')

    return await new Promise(resolve => {
      const existingIframe = this.win?.document.body.querySelector('iframe') as HTMLIFrameElement
      const newIframeSandboxed = this.getSandboxedPreview(html)

      newIframeSandboxed.onload = () => {
        resolve(new HtmlLoadedDocument(newIframeSandboxed))
        this.win?.document.body.classList.remove('loading')
      }

      existingIframe.parentElement?.replaceChild(newIframeSandboxed, existingIframe)
    })
  }

  private isClosed (): boolean {
    return this.win?.window !== this.win &&
            this.win?.closed === true
  }

  private getSandboxedPreview (html: string): HTMLIFrameElement {
    const iframeSandboxed = document.createElement('iframe')

    // we need `allow-same-origin` for accessing content from outside
    // just don't add the `allow-scripts` -- as it would break the isolation and introduce security issues
    iframeSandboxed.setAttribute('sandbox', 'allow-same-origin')

    iframeSandboxed.srcdoc = html
    return iframeSandboxed
  }
}

export class HtmlLoadedDocument implements CurrentPreview {
  private readonly doc: Document
  private foundElementsCache: { [index: string]: HTMLElement } = {}
  private readonly highlightedElementClass = 'terales-live-preview-highlighted-element'
  private readonly highlightedElementBgColor = 'rgba(255, 255, 0, 0.5)'
  private readonly highlightedElementStyles = `
        <style id="${this.highlightedElementClass}-style">
            .${this.highlightedElementClass} {
                background-color: ${this.highlightedElementBgColor} !important;
                box-shadow: 0 0 0 5px ${this.highlightedElementBgColor} !important;
            }
        </style>
    `

  constructor (iframe: HTMLIFrameElement) {
    if (iframe.contentDocument != null) {
      this.doc = iframe.contentDocument
    } else {
      throw new Error('Can\'t access HTML preview contentDocument property.')
    }
  }

  keyHighlight (xpath: string): void {
    const element = this.getElementFromXpath(xpath)
    if (element != null) {
      if (this.doc.head.querySelector(`#${this.highlightedElementClass}-style`) == null) {
        this.doc.head.insertAdjacentHTML('beforeend', this.highlightedElementStyles)
      }

      element.classList.add(this.highlightedElementClass)
      this.scrollToHighlightedElement(element)
    }
  }

  keyDismissHighlight (xpath: string): void {
    const element = this.getElementFromXpath(xpath)
    element?.classList.remove(this.highlightedElementClass)
  }

  keyUpdateContent (xpath: string, newContent: string): void {
    const element = this.getElementFromXpath(xpath)
    if (element != null) {
      element.innerHTML = newContent
    }
  }

  private scrollToHighlightedElement (element: Element): void {
    element.scrollIntoView({ block: 'center', inline: 'nearest' })
  }

  private getElementFromXpath (xpath: string): HTMLElement | undefined {
    if (xpath in this.foundElementsCache) {
      return this.foundElementsCache[xpath]
    }

    const nodeFound = this.doc.evaluate(
      this.prepareLokaliseXpathForDOM(xpath),
      this.doc.documentElement,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue

    if (nodeFound == null) {
      return undefined
    }

    if (nodeFound?.nodeType === Node.TEXT_NODE && (nodeFound.parentElement != null)) {
      this.foundElementsCache[xpath] = nodeFound.parentElement
    }
    if (nodeFound?.nodeType === Node.ELEMENT_NODE) {
      this.foundElementsCache[xpath] = nodeFound as HTMLElement
    }

    return this.foundElementsCache[xpath]
  }

  private prepareLokaliseXpathForDOM (originalXpath: string): string {
    let modifiedXpath = originalXpath

    modifiedXpath = (function addRequiredTbody (xpath: string): string {
      const splitted = xpath.split('/')
      const prepared = []
      for (let i = 0; i < splitted.length; i++) {
        if (splitted[i]?.startsWith('tr') &&
                    !splitted[i - 1]?.startsWith('tbody') &&
                    !splitted[i - 1]?.startsWith('thead') &&
                    !splitted[i - 1]?.startsWith('tfoot')
        ) {
          prepared.push('tbody')
        }
        prepared.push(splitted[i])
      }
      return prepared.join('/')
    })(modifiedXpath)

    modifiedXpath = (function removePartAfterHash (xpath: string): string {
      return xpath.substring(0, xpath.lastIndexOf('#'))
    })(modifiedXpath)

    return modifiedXpath
  }
}

export class CollectApiDocument {
  private readonly doc: Document
  private readonly tokenApiInputSelector = '#api-token-input'

  constructor (doc: Document) {
    this.doc = doc
  }

  listenToTokenInput (onChange: (newValue: string) => any): void {
    const input = this.doc.querySelector(this.tokenApiInputSelector) as HTMLInputElement
    input?.addEventListener('input', () => onChange(input.value))
  }
}

export class ErrorDocument {
  private readonly doc: Document
  private readonly errorBoxSelector = '.error'

  constructor (doc: Document) {
    this.doc = doc
  }

  insertError (error: Error | string): void {
    const el = this.doc.querySelector(this.errorBoxSelector) as HTMLElement
    const msg = error instanceof Error && Number.isInteger(parseInt(error.message))
      ? this.getErrorText(parseInt(error.message))
      : error as string

    if (el !== null) {
      el.textContent = msg
    }
  }

  private getErrorText (errorCode: number): string {
    let msg: string
    switch (errorCode) {
      case 400:
        msg = 'Some required parameter is incorrect or missing required parameter (error in extension code).'
        break
      case 401: // Lokalise reports 401 for a valid token but insufficient permissions
      case 403:
        msg = 'The "Download" permission is required for live preview or token is invalid.'
        break
      case 404:
        msg = 'The requested resource does not exist (error in extension code).'
        break
      case 429:
        msg = 'Too many requests hit the Lokalise API too quickly (error in extension code).'
        break
      default:
        msg = `Error code ${errorCode} was received (error in extension code).`
    }
    return msg
  }
}
