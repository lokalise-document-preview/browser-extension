import { Editor } from "codemirror";

const keysTableElement = document.querySelector("#endless")!;

observeElementTextContentChange(keysTableElement, (mutatedElement: HTMLElement) => {
    const codemirror = (mutatedElement as any).CodeMirror;
    codemirror.on('change', (codeMirrorInstance: Editor) => {
        mutatedElement.dataset.teralesCurrentEditorValue = codeMirrorInstance.getValue();
    });
});

function observeElementTextContentChange(el: Element, onCodeMirrorAdded: Function) {
    const onDomChange = function callback(mutationList: Array<MutationRecord>) {
        mutationListLoop:
        for (let i = 0; i < mutationList.length; i++) {
            const mutation = mutationList[i] as MutationRecord;

            for (let ii = 0; ii < mutation.addedNodes.length; ii++) {
                const mutatedElement = mutation.addedNodes[ii] as Element;
                if (mutatedElement.classList?.contains('CodeMirror')) {
                    onCodeMirrorAdded(mutatedElement as HTMLElement);
                    break mutationListLoop;
                }
            }
        }
    };

    const observer = new MutationObserver(onDomChange);
    observer.observe(el, {childList: true, subtree: true});
}