export type projectOpenPreviewCallback = (onPreviewLoaded: Function) => void;
export type projectEditorEventCallback = (xpath?: string) => void;
export type projectEditorKeyChangeCallback = (xpath?: string, newValue?: string) => void;
export const openPreviewBtnId = 'terales-open-live-preview-btn';

export function addOpenPreviewBtn(siblingSelector: string, onClick: projectOpenPreviewCallback) {
    const initialText = 'Open live preview';
    const loadingText = 'Loading';
    const loadingTextUpdateIntervalMs = 450;

    document
        .querySelector(siblingSelector)
        ?.insertAdjacentHTML('beforebegin', `
            <div class="filter-row-element-part">
                <a id="${openPreviewBtnId}" class="btn btn-sm btn-primary" style="min-width: 135px;">
                    Open live preview
                </a>
            </div>
        `);

    const openPreviewBtnEl = document.querySelector(`#${openPreviewBtnId}`);
    if (openPreviewBtnEl) {
        let loadingIntervalId = 0;
        const startLoadingAnimation = function (btnEl: Element) {
            btnEl.textContent = loadingText;
            btnEl.setAttribute('disabled', '');

            let dotsAmount = 0;
            loadingIntervalId = window.setInterval(() => {
                if (dotsAmount < 3) {
                    btnEl.insertAdjacentHTML('afterbegin', '&puncsp;'); // to prevent text from moving
                    btnEl.insertAdjacentText('beforeend', '.');
                    dotsAmount++;
                } else {
                    btnEl.textContent = loadingText;
                    dotsAmount = 0;
                }
            }, loadingTextUpdateIntervalMs);
        };
    
        const stopLoadingAnimation = function (btnEl: Element) {
            return () => {
                clearInterval(loadingIntervalId);
                btnEl.textContent = initialText;
                btnEl.removeAttribute('disabled');
            };
        };
    
        openPreviewBtnEl.addEventListener('click', () => {
            startLoadingAnimation(openPreviewBtnEl);
            onClick(stopLoadingAnimation(openPreviewBtnEl));
        });
    }
}

export function listenKeyTranslationOpenOrSave(
    onKeyOpen: projectEditorEventCallback,
    onChangeKeyTranslation: projectEditorEventCallback,
    onClosedKey: projectEditorKeyChangeCallback
) {
    const keysTable = document.querySelector("#endless")!;
    const onDomChange = function callback(mutationList: Array<MutationRecord>) {
        mutationListLoop:
        for (let i = 0; i < mutationList.length; i++) {
            const mutation = mutationList[i] as MutationRecord;
            
            if (mutation.type != 'childList') continue mutationListLoop;
    
            if (mutation.addedNodes.length < 1 && mutation.removedNodes.length < 1) continue mutationListLoop;

            for (let ii = 0; ii < mutation.removedNodes.length; ii++) {
                let shouldIterateToNextMutation = true;
                const removedNode = mutation.removedNodes[ii];

                if (removedNode) {
                    shouldIterateToNextMutation = checkMutation('CodeMirror', removedNode, () => {
                        const keyContent = (
                            (mutation.target as Element).closest('.lokalise-editor-wrapper') as HTMLElement
                        ).dataset.lokaliseEditorValue ?? '';
                        onClosedKey(getXpathFromMutatedeElement(mutation.target as Element), keyContent);
                    });
                }
                
                if (!shouldIterateToNextMutation) {
                    break;
                }
            }
    
            for (let ii = 0; ii < mutation.addedNodes.length; ii++) {
                let shouldIterateToNextMutation = true;
                const addedNode = mutation.addedNodes[ii];

                if (addedNode) {
                    shouldIterateToNextMutation = checkMutation('CodeMirror', addedNode, el => {
                        const xpath = getXpathFromMutatedeElement(el);
                        onKeyOpen(xpath);
                        
                        const codeMirrorElement = addedNode as Element;
                        if (codeMirrorElement) {
                            observeElementAttributeChange(codeMirrorElement, xpath, onChangeKeyTranslation);
                        }
                    });
                }

                if (!shouldIterateToNextMutation) {
                    break;
                }
            }
        }
    };

    const observer = new MutationObserver(onDomChange);
    observer.observe(keysTable, {
        childList: true,
        subtree: true
    });
}

function checkMutation(
    classToCheck: string,
    node: Node,
    onClassFound: (el: Element) => void,
): boolean {
    let shouldIterateNext = true;
    const el = node as Element;
    if (el?.classList?.contains(classToCheck)) {
        onClassFound(el);
        shouldIterateNext = false;
    }
    return shouldIterateNext;
}

function observeElementAttributeChange(el: Element, xpath: string, onChangeKeyTranslation: projectEditorKeyChangeCallback) {
    const attributeToObserve = 'data-terales-current-editor-value';
    const onDomChange = function callback(mutationList: Array<MutationRecord>) {
        for (let i = 0; i < mutationList.length; i++) {
            const mutation = mutationList[i] as MutationRecord;
            const target = mutation.target as HTMLElement;
            if (target.parentElement) {
                onChangeKeyTranslation(xpath, target.getAttribute(attributeToObserve) ?? '');
            }
        }
    };

    const observer = new MutationObserver(onDomChange);
    observer.observe(el, {attributeFilter: [attributeToObserve]});
}

function getXpathFromMutatedeElement(el: Element) {
    const parent = el.closest('.row-key') as HTMLElement;
    return parent?.dataset.name ?? '';
}