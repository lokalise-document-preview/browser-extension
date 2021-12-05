import { Editor } from 'codemirror'

const keysTableElement = document.querySelector('#endless')

observeElementTextContentChange(keysTableElement, (mutatedElement: HTMLElement) => {
  const codemirror = (mutatedElement as any).CodeMirror
  codemirror.on('change', (codeMirrorInstance: Editor) => {
    mutatedElement.dataset.teralesCurrentEditorValue = codeMirrorInstance.getValue()
  })
})

function observeElementTextContentChange (el: Element | null, onCodeMirrorAdded: Function): void {
  if (el === null) {
    return
  }

  const onDomChange = function callback (mutationList: MutationRecord[]): void {
    for (let i = 0; i < mutationList.length; i++) {
      const mutation = mutationList[i]

      for (let ii = 0; ii < mutation.addedNodes.length; ii++) {
        const mutatedElement = mutation.addedNodes[ii] as Element
        if (mutatedElement.classList?.contains('CodeMirror')) {
          onCodeMirrorAdded(mutatedElement as HTMLElement)
          return
        }
      }
    }
  }

  const observer = new MutationObserver(onDomChange)
  observer.observe(el, { childList: true, subtree: true })
}
