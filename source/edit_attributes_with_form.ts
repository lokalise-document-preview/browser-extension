const keysTable = document.querySelector("#endless")!;
const observer = new MutationObserver(callback);

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
    console.log('add form the bottom panel', panel);
    const parser = new DOMParser();

    editor.observe(appendForm);
    appendForm('', editor.currentFieldValue);

    function appendForm(_property: string, value: string) {
        // TODO Append form to `panel` based on tags inside the key

        // Parse key to see each attribute
        // Attributes to watch: href, title, src, alt
        // For each tag add a line,
        // For text add a line in between
        const htmlKey = parser.parseFromString(value, 'text/html');
        const matchingTags = htmlKey.querySelectorAll('a, img');

        const pre = document.createElement('pre');
        pre.id = 'ffjfjjf-form-for-editing-attributes';
        pre.style.marginTop = '0.6em';
        matchingTags.forEach(el => {
            pre.textContent += `${el.tagName}: `;
            new Array('title', 'alt', 'src', 'href').forEach(attrName => {
                if (el.getAttribute(attrName)) {
                    pre.textContent += `${attrName}="${el.getAttribute(attrName)}" `;
                }
            });
            pre.textContent += '\n';
        });

        const existingForm = panel.querySelector(`#${pre.id}`)
        if (existingForm) {
            panel.removeChild(existingForm);
        }
        if (matchingTags.length > 0) {
            panel.append(pre);
        }

        // TODO Make form immidiately reflect the changes in the key
    }
  }

  function readValue(element: Element) {
    const codemirror: CodeMirror.Editor = (element as any).CodeMirror;
    codemirror.on('change', updateCurrentValue);

    updateCurrentValue()

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
    target.observe = function(handler: Function) {
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
