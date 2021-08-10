const keysTable = document.querySelector("#endless")!;
const observer = new MutationObserver(callback);
const attributesToWatch = ['title', 'alt', 'src', 'href'];

const parser = new DOMParser();
let codemirror: CodeMirror.Editor;

const editorTemplate = <iObservableObject>{
    currentFieldValue: '',
    keepForm: false
};
let editor = makeObservable(Object.assign({}, editorTemplate));

observer.observe(keysTable, {
    childList: true,
    subtree: true
});

function callback(mutationList: Array<MutationRecord>) {
    mutationList.forEach(mutation => {
        if (mutation.type != 'childList') return;

        if (mutation.addedNodes.length < 1) return;

        mutation.addedNodes.forEach(node => {
            const el = node as Element;
            if (el.classList?.contains('bottom-panel')) {
                addFormToBottomPanel(el);
                return;
            }

            if (el.classList?.contains('CodeMirror')) {
                editor = makeObservable(Object.assign({}, editorTemplate));
                readValue(el);
                return
            }
        })
    });
}

function addFormToBottomPanel(panel: Element) {
    editor.observe(appendForm);
    appendForm('currentFieldValue');

    function appendForm(property: string) {
        if (property != 'currentFieldValue') {
            return;
        }

        if (editor.keepForm) {
            editor.keepForm = false;
            return;
        }
        const matchingTags = editor.htmlKey.querySelectorAll('a, img');
        const currentKeyData: any = [];
        let hasEditableAttrs = false;

        matchingTags.forEach(el => {
            const currentTag: any = {
                tag: el.tagName,
                xpath: getXPathForElement(<HTMLElement>el, editor.htmlKey),
                attributes: []
            };

            attributesToWatch.forEach(attrName => {
                if (el.getAttribute(attrName)) {
                    currentTag.attributes.push({
                        name: attrName,
                        value: el.getAttribute(attrName)!
                    });
                    hasEditableAttrs = true;
                }
            });

            if (currentTag.attributes.length > 0) {
                currentKeyData.push(currentTag);
            }
        });

        const existingForm = panel.querySelector(`#terales-edits-attrs-form`);
        if (existingForm) {
            panel.removeChild(existingForm.parentNode!);
        }
        if (hasEditableAttrs) {
            panel.appendChild(generateForm(currentKeyData));
        }
    }
}

function readValue(element: Element) {
    codemirror = (element as any).CodeMirror;
    codemirror.on('change', updateCurrentValue);

    updateCurrentValue();

    function updateCurrentValue() {
        const newValue = codemirror.getValue();
        editor.htmlKey = parser.parseFromString(newValue, 'text/html');
        editor.currentFieldValue = newValue;
    }
}

interface iObservableObject extends Object {
    handlers: Array<Function>;
    observe: Function;
    currentFieldValue: string;
    htmlKey: Document;
    keepForm: boolean;
}

function makeObservable(target: iObservableObject) {
    // 1. Initialize handlers store
    target.handlers = [];

    // Store the handler function in array for future calls
    target.observe = function (handler: Function) {
        target.handlers.push(handler);
    };

    // 2. Create a proxy to handle changes
    return new Proxy(target, {
        set(target, property, value, receiver) {
            let initialValue = '';
            let newValue = '';
            if (property == 'currentFieldValue') {
                initialValue = target.currentFieldValue;
                newValue = value;
            }

            const success = Reflect.set(target, property, value, receiver); // forward the operation to object

            if (success && property == 'currentFieldValue' && initialValue != newValue) { // if there were no error while setting the property
                console.log('Called: ', value);
                console.trace();

                // call all handlers
                target.handlers.forEach(handler => handler(property, value));
            }
            return success;
        }
    });
}

function generateForm(data: any): DocumentFragment {
    const form: DocumentFragment = document
        .createRange()
        .createContextualFragment(getFormTemplate(data));

    form.querySelectorAll('.terales-attr-input-js').forEach(input => {
        if (input instanceof HTMLInputElement) {
            input.addEventListener('input', () => {
                const changedEl = <Element>editor.htmlKey.evaluate(input.dataset.xpath!, editor.htmlKey, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                changedEl.setAttribute(input.dataset.attributeName!, input.value);
                editor.keepForm = true;
                codemirror.setValue(editor.htmlKey.body.innerHTML);
            });
        }
    });

    return form;

    function getFormTemplate(keyData: any): string {
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
                <div id="terales-edits-attrs-form">
                    ${keyData.reduce(generateTag, '')}
                </div>
            </div>
        `;

        function generateTag(generated: string, tagData:any) {
            let tagName = '';
            if (tagData.tag == 'A') tagName = 'Link:';
            if (tagData.tag == 'IMG') tagName = 'Image:';
    
            return generated + `
                <div class="terales-tag">
                    <div class="terales-label">${tagName}</div>
                    ${tagData.attributes.reduce(generateAttribute, '')}
                </div>
            `;
    
            function generateAttribute(generated: string, attrData: any) {
                return generated + `
                    <div class="terales-horizontal-spacing"></div>
                    <div class="terales-field-container input-group input-group-sm">
                        <span class="input-group-addon">${attrData.name}</span>
                        <input data-xpath="${tagData.xpath}" data-attribute-name="${attrData.name}" value="${attrData.value}" type="text" class="terales-attr-input-js form-control" />
                    </div>
                `;
            }
        }
    }
}

function getXPathForElement(el: HTMLElement, xml: Document) {
	var xpath = '';
	var pos, tempitem2;

	while(el !== xml.documentElement) {
		pos = 0;
		tempitem2 = el;
		while(tempitem2) {
			if (tempitem2.nodeType === 1 && tempitem2.nodeName === el.nodeName) { // If it is ELEMENT_NODE of the same name
				pos += 1;
			}
			tempitem2 = tempitem2.previousSibling;
		}

		xpath = `${el.nodeName}[${pos}]//` + xpath;

		el = <HTMLElement>el.parentNode;
	}
	xpath = '/html//' + xpath;
	xpath = xpath.replace(/\/\/$/, '');
	return xpath;
}
