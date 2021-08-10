const keysTable = document.querySelector("#endless")!;
const observer = new MutationObserver(callback);
const attributesToWatch = ['title', 'alt', 'src', 'href'];

var editor = <iObservableObject>{
    currentFieldValue: ''
};
var editor = makeObservable(editor);

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
                readValue(el);
                return
            }
        })
    });
}

function addFormToBottomPanel(panel: Element) {
    const parser = new DOMParser();

    editor.observe(appendForm);
    appendForm('', editor.currentFieldValue);

    function appendForm(_property: string, value: string) {
        const htmlKey = parser.parseFromString(value, 'text/html');
        const matchingTags = htmlKey.querySelectorAll('a, img');
        const currentKeyData: any = [];
        let hasEditableAttrs = false;

        matchingTags.forEach(el => {
            const currentTag: any = {
                'tag': el.tagName,
                'attributes': []
            };
            
            attributesToWatch.forEach(attrName => {
                if (el.getAttribute(attrName)) {
                    currentTag.attributes.push({
                        name: attrName,
                        value: escapeHtml(el.getAttribute(attrName)!),
                        placeholder: 'attr-' + (Math.random() + 1).toString(36).substring(7)
                    });
                    hasEditableAttrs = true;
                }
            });

            if (currentTag.attributes.length > 0) {
                currentKeyData.push(currentTag);
            }
        });

        const existingForm = panel.querySelector(`#terales-edits-attrs-form`)
        if (existingForm) {
            panel.removeChild(existingForm.parentNode!);
        }
        if (hasEditableAttrs) {
            panel.appendChild(generateForm(currentKeyData));
        }
    }
}

  function readValue(element: Element) {
    const codemirror: CodeMirror.Editor = (element as any).CodeMirror;
    codemirror.on('change', updateCurrentValue);

    updateCurrentValue();

    function updateCurrentValue() {
        editor.currentFieldValue = codemirror.getValue();
    }
}

interface iObservableObject extends Object {
    handlers: Array<Function>;
    observe: Function;
    currentFieldValue: string;
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
            if (target.currentFieldValue === value) return true;

            let success = Reflect.set(target, property, value, receiver); // forward the operation to object
            if (success) { // if there were no error while setting the property
                // call all handlers
                target.handlers.forEach(handler => handler(property, value));
            }
            return success;
        }
    });
}

function escapeHtml(unsafe: string) {
    return unsafe
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function generateForm(data: any): DocumentFragment {
    return document.createRange().createContextualFragment(`
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
        ${data.reduce(generateTag, '')}
    </div>
</div>
    `);

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
                    <input data-placeholder="${attrData.placeholder}" value="${attrData.value}" type="text" class="form-control" />
                </div>
            `;
        }
    }
}
