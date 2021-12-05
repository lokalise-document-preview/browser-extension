const keysTable = document.querySelector('#endless') as HTMLElement
const observer = new MutationObserver(callback)
const attributesToWatch = ['title', 'alt', 'src', 'href']

const parser = new DOMParser()
let codemirror: CodeMirror.Editor

const editorTemplate: iObservableObject = {
  currentFieldValue: '',
  keepForm: false,
  handlers: [],
  observe: () => {},
  htmlKey: new Document()
}
let editor = makeObservable(Object.assign({}, editorTemplate))

observer.observe(keysTable, {
  childList: true,
  subtree: true
})

function callback (mutationList: MutationRecord[]): void {
  mutationList.forEach(mutation => {
    if (mutation.type !== 'childList') return

    if (mutation.addedNodes.length < 1) return

    mutation.addedNodes.forEach(node => {
      const el = node as Element
      if (el.classList?.contains('bottom-panel')) {
        addFormToBottomPanel(el)
        return
      }

      if (el.classList?.contains('CodeMirror')) {
        editor = makeObservable(Object.assign({}, editorTemplate))
        readValue(el)
      }
    })
  })
}

function addFormToBottomPanel (panel: Element): void {
  editor.observe(appendForm)
  appendForm('currentFieldValue')

  function appendForm (property: string): void {
    if (property !== 'currentFieldValue') {
      return
    }

    if (editor.keepForm) {
      editor.keepForm = false
      return
    }
    const matchingTags = editor.htmlKey.querySelectorAll('a, img')
    const currentKeyData: any = []
    let hasEditableAttrs = false

    matchingTags.forEach(el => {
      const currentTag: any = {
        tag: el.tagName,
        xpath: getXPathForElement(el as HTMLElement, editor.htmlKey),
        attributes: []
      }

      attributesToWatch.forEach(attrName => {
        const attributeValue = el.getAttribute(attrName) ?? ''
        if (attributeValue !== '') {
          currentTag.attributes.push({
            name: attrName,
            value: attributeValue
          })
          hasEditableAttrs = true
        }
      })

      if (currentTag.attributes.length > 0) {
        currentKeyData.push(currentTag)
      }
    })

    const existingForm = panel.querySelector('#terales-edits-attrs-form')
    if (existingForm != null) {
      panel.removeChild(existingForm.parentNode as Node)
    }
    if (hasEditableAttrs) {
      panel.appendChild(generateForm(currentKeyData))
    }
  }
}

function readValue (element: Element): void {
  codemirror = (element as any).CodeMirror
  codemirror.on('change', updateCurrentValue)

  updateCurrentValue()

  function updateCurrentValue (): void {
    const newValue = codemirror.getValue()
    editor.htmlKey = parser.parseFromString(newValue, 'text/html')
    editor.currentFieldValue = newValue
  }
}

interface iObservableObject extends Object {
  handlers: Function[]
  observe: Function
  currentFieldValue: string
  htmlKey: Document
  keepForm: boolean
}

function makeObservable (target: iObservableObject): iObservableObject {
  // 1. Initialize handlers store
  target.handlers = []

  // Store the handler function in array for future calls
  target.observe = function (handler: Function) {
    target.handlers.push(handler)
  }

  // 2. Create a proxy to handle changes
  return new Proxy(target, {
    set (target, property, value, receiver) {
      let initialValue = ''
      let newValue = ''
      if (property === 'currentFieldValue') {
        initialValue = target.currentFieldValue
        newValue = value
      }

      const success = Reflect.set(target, property, value, receiver) // forward the operation to object

      if (success && property === 'currentFieldValue' && initialValue !== newValue) { // if there were no error while setting the property
        // call all handlers
        target.handlers.forEach(handler => handler(property, value))
      }
      return success
    }
  })
}

function generateForm (data: any): DocumentFragment {
  const form = getForm(data)

  form.querySelectorAll('.terales-attr-input-js').forEach(input => {
    if (input instanceof HTMLInputElement) {
      input.addEventListener('input', () => {
        const changedEl = editor.htmlKey.evaluate(input.dataset.xpath ?? '', editor.htmlKey, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as Element
        changedEl.setAttribute(input.dataset.attributeName ?? '', input.value)
        editor.keepForm = true
        codemirror.setValue(editor.htmlKey.body.innerHTML)
      })
    }
  })

  return form

  function getForm (keyData: any): DocumentFragment {
    const container = document
      .createRange()
      .createContextualFragment(getFormContainerTemplate())
    const form = container.querySelector('#terales-edits-attrs-form') as HTMLFormElement

    keyData.forEach((tagData: any) => {
      let tagName = ''
      if (tagData.tag === 'A') tagName = 'Link:'
      if (tagData.tag === 'IMG') tagName = 'Image:'

      const tagFragment = document.createRange().createContextualFragment(`
                <div class="terales-tag">
                    <div class="terales-label"></div>
                </div>
            `)
      tagFragment.querySelector('.terales-label')?.insertAdjacentText('beforeend', tagName)
      const tagEl = tagFragment.querySelector('.terales-tag') as HTMLDivElement

      tagData.attributes.forEach((attrData: any) => {
        const attrEl = document.createRange().createContextualFragment(`
                    <div class="terales-horizontal-spacing"></div>
                    <div class="terales-field-container input-group input-group-sm">
                        <span class="input-group-addon"></span>
                        <input data-xpath="" data-attribute-name="" value="" type="text" class="terales-attr-input-js form-control" />
                    </div>
                `)
        attrEl.querySelector('.input-group-addon')?.insertAdjacentText('beforeend', attrData.name)

        const attrInput = attrEl.querySelector('.terales-attr-input-js') as HTMLInputElement
        if (attrInput === null) {
          return
        }

        attrInput.dataset.xpath = tagData.xpath
        attrInput.dataset.attributeName = attrData.name
        attrInput.value = attrData.value

        tagEl.appendChild(attrEl)
      })

      form.appendChild(tagFragment)
    })

    return container

    function getFormContainerTemplate (): string {
      return `
                <div>
                    <style>
                        #terales-edits-attrs-form .terales-tag {
                            margin-top: 12px;
                            display: flex;
                            flex-direction: row;
                            flex-wrap: nowrap;
                            justify-content: space-between;
                            align-content: stretch;
                            align-items: flex-start;
                        }
                        #terales-edits-attrs-form .terales-tag:first-child {
                            margin-top: 16px;
                        }
                    
                        #terales-edits-attrs-form .terales-label {
                            font-size: 16px;
                            line-height: 35px;
                            width: 55px;
                            overflow: hidden;
                            order: 0;
                            flex: 0 0 auto;
                            align-self: auto;
                        }
                    
                        #terales-edits-attrs-form .terales-field-container {
                            order: 0;
                            flex: 1 1 auto;
                            align-self: auto;
                        }

                        #terales-edits-attrs-form .terales-horizontal-spacing {
                            flex: 0 0 16px;
                        }
                    </style>
                    <div id="terales-edits-attrs-form"></div>
                </div>
            `
    }
  }
}

function getXPathForElement (el: HTMLElement, xml: Document): string {
  let xpath = ''
  let pos, tempitem2

  while (el !== xml.documentElement) {
    pos = 0
    tempitem2 = el
    while (tempitem2 != null) {
      if (tempitem2.nodeType === 1 && tempitem2.nodeName === el.nodeName) { // If it is ELEMENT_NODE of the same name
        pos += 1
      }
      tempitem2 = tempitem2.previousSibling
    }

    xpath = `${el.nodeName}[${pos}]//` + xpath

    el = el.parentNode as HTMLElement
  }
  xpath = '/html//' + xpath
  xpath = xpath.replace(/\/\/$/, '')
  return xpath
}
