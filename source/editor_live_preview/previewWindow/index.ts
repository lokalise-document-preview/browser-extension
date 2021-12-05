import { HtmlPreviewWindow, HtmlLoadedDocument } from './previewHtml'
import { DocxPreviewWindow, DocxLoadedDocument } from './previewDocx'

class CollectApiDocument {
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

class ErrorDocument {
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

export {
  CollectApiDocument,
  ErrorDocument,
  HtmlPreviewWindow,
  HtmlLoadedDocument,
  DocxPreviewWindow,
  DocxLoadedDocument
}
