const script = document.createElement('script');
script.src = browser.runtime.getURL('edit_attributes_with_form.js');
(document.body || document.documentElement).appendChild(script);