export type projectOpenPreviewCallback = (onPreviewLoaded: Function) => void
export type projectEditorEventCallback = (xpath?: string) => void
export type projectEditorKeyChangeCallback = (xpath?: string, newValue?: string) => void
export const openPreviewBtnId = 'terales-open-live-preview-btn'

export function addOpenPreviewBtn (siblingSelector: string, onClick: projectOpenPreviewCallback): void {
  const initialText = 'Open live preview'
  const loadingText = 'Loading'
  const loadingTextUpdateIntervalMs = 450

  document
    .querySelector(siblingSelector)
    ?.insertAdjacentHTML('beforebegin', `
            <div class="filter-row-element-part">
                <a id="${openPreviewBtnId}" class="btn btn-sm btn-primary" style="min-width: 135px;">
                    Open live preview
                </a>
            </div>
        `)

  const openPreviewBtnEl = document.querySelector(`#${openPreviewBtnId}`)
  if (openPreviewBtnEl != null) {
    let loadingIntervalId = 0
    const startLoadingAnimation = function (btnEl: Element): void {
      btnEl.textContent = loadingText
      btnEl.setAttribute('disabled', '')

      let dotsAmount = 0
      loadingIntervalId = window.setInterval(() => {
        if (dotsAmount < 3) {
          btnEl.insertAdjacentHTML('afterbegin', '&puncsp;') // to prevent text from moving
          btnEl.insertAdjacentText('beforeend', '.')
          dotsAmount++
        } else {
          btnEl.textContent = loadingText
          dotsAmount = 0
        }
      }, loadingTextUpdateIntervalMs)
    }

    const stopLoadingAnimation = function (btnEl: Element) {
      return () => {
        clearInterval(loadingIntervalId)
        btnEl.textContent = initialText
        btnEl.removeAttribute('disabled')
      }
    }

    openPreviewBtnEl.addEventListener('click', () => {
      startLoadingAnimation(openPreviewBtnEl)
      onClick(stopLoadingAnimation(openPreviewBtnEl))
    })
  }
}

export function listenKeyTranslationOpenOrSave (
  onKeyOpen: projectEditorEventCallback,
  onChangeKeyTranslation: projectEditorEventCallback,
  onClosedKey: projectEditorKeyChangeCallback
): void {
  const keysTable = document.querySelector('#endless') as HTMLElement
  const onDomChange = function callback (mutationList: MutationRecord[]): void {
    for (let i = 0; i < mutationList.length; i++) {
      const mutation = mutationList[i]

      if (mutation.type !== 'childList') continue

      if (mutation.addedNodes.length < 1 && mutation.removedNodes.length < 1) continue

      for (let ii = 0; ii < mutation.removedNodes.length; ii++) {
        let shouldIterateToNextMutation = true
        const removedNode = mutation.removedNodes[ii]

        shouldIterateToNextMutation = checkMutation('CodeMirror', removedNode, () => {
          const keyContent = (
            (mutation.target as Element).closest('.lokalise-editor-wrapper') as HTMLElement
          ).dataset.lokaliseEditorValue ?? ''
          onClosedKey(getXpathFromMutatedeElement(mutation.target as Element), keyContent)
        })

        if (!shouldIterateToNextMutation) {
          break
        }
      }

      for (let ii = 0; ii < mutation.addedNodes.length; ii++) {
        let shouldIterateToNextMutation = true
        const addedNode = mutation.addedNodes[ii] as HTMLElement

        shouldIterateToNextMutation = checkMutation('CodeMirror', addedNode, el => {
          const xpath = getXpathFromMutatedeElement(el)
          onKeyOpen(xpath)
          observeElementAttributeChange(addedNode, xpath, onChangeKeyTranslation)
        })

        if (!shouldIterateToNextMutation) {
          break
        }
      }
    }
  }

  const observer = new MutationObserver(onDomChange)
  observer.observe(keysTable, {
    childList: true,
    subtree: true
  })
}

function checkMutation (
  classToCheck: string,
  node: Node,
  onClassFound: (el: Element) => void
): boolean {
  let shouldIterateNext = true
  const el = node as Element
  if (el?.classList?.contains(classToCheck)) {
    onClassFound(el)
    shouldIterateNext = false
  }
  return shouldIterateNext
}

function observeElementAttributeChange (el: Element, xpath: string, onChangeKeyTranslation: projectEditorKeyChangeCallback): void {
  const attributeToObserve = 'data-terales-current-editor-value'
  const onDomChange = function callback (mutationList: MutationRecord[]): void {
    for (let i = 0; i < mutationList.length; i++) {
      const mutation = mutationList[i]
      const target = mutation.target as HTMLElement
      if (target.parentElement != null) {
        onChangeKeyTranslation(xpath, target.getAttribute(attributeToObserve) ?? '')
      }
    }
  }

  const observer = new MutationObserver(onDomChange)
  observer.observe(el, { attributeFilter: [attributeToObserve] })
}

function getXpathFromMutatedeElement (el: Element): string {
  const parent = el.closest('.row-key') as HTMLElement
  return parent?.dataset.name ?? ''
}
