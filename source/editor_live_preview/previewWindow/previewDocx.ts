import templatePreviewDocx from './templatePreviewDocx.html'
import templateCollectApiToken from './templateCollectApiToken.html'
import templateError from './templateError.html'
import { PreviewWindow, CurrentPreview } from '../types'

export class DocxPreviewWindow implements PreviewWindow {
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
          template = templatePreviewDocx
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

  async loadNewExternalContent (pdf: Blob): Promise<CurrentPreview | never> {
    if (this.win === null || this.isClosed()) {
      return await Promise.reject(new Error('No content was received.'))
    }

    this.win.document.body.classList.add('loading')

    this.win.location = URL.createObjectURL(pdf)
    return new DocxLoadedDocument()
  }

  private isClosed (): boolean {
    return this.win?.window !== this.win &&
            this.win?.closed === true
  }
}

export class DocxLoadedDocument implements CurrentPreview {
  keyHighlight (): void {}

  keyDismissHighlight (): void {}

  keyUpdateContent (): void {}
}
