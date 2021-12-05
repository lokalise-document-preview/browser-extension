export interface PreviewParams {
  projectId: string
  filename: string
  fileformat: string
  langIso: string
}

export interface PreviewWindow {
  open: () => void
  close: () => void
  focus: () => void
  isOpened: () => boolean
  loadLocalContentTemplate: (templateName: string) => Document | null
  loadNewExternalContent: (content: any) => Promise<CurrentPreview> | Promise<never>
}

export interface CurrentPreview {
  keyHighlight: (xpath: string) => void
  keyDismissHighlight: (xpath: string) => void
  keyUpdateContent: (xpath: string, newContent: string) => void
}
