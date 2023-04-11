// Selfmade custom webcomponent for file upload, see https://github.com/r3m0s/components

var fileExists;
var dropzone;
var cancel;
var icon;
var hint;
var info;
var fileInput;
var onFileLoadedFn = null;
var form;
abortController = new AbortController();

class FileDrop extends HTMLElement {
    constructor() {
        super();
        
        const fileDropTemplate = document.createElement('template');
        fileDropTemplate.innerHTML = `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@5.9.55/css/materialdesignicons.min.css">
        <link rel="stylesheet" href="./web-components/file-drop.css">
        <div id="dropzone" class="zone">
            <div class="zone__info">
                <div id="icon" class="mdi"></div>
                <h1 id="hint" class="zone__info__hint"></h1>
                <p id="info" class="zone__info__meta"></p>
            </div>
            <input id="fileInput" class="zone__input" type="file" multiple/>
            <div id="cancel" class="zone__cancel mdi mdi-close"></div>
        </div>
        `;

        this.attachShadow({mode: 'open'}).appendChild(fileDropTemplate.content);
        form = document.querySelector('form');
    }

    get placeholder() {
        return this.getAttribute('placeholder');
    }

    set placeholder(val) {
        this.setAttribute('placeholder', val);
    }

    get notAllowedHint() {
        return this.getAttribute('not-allowed-hint');
    }

    set notAllowedHint(val) {
        this.setAttribute('not-allowed-hint', val);
    }

    get accept() {
        return this.getAttribute('accept');
    }

    set accept(val) {
        this.setAttribute('accept', val);
    }

    get size() {
        return this.getAttribute('size');
    }

    set size(val) {
        this.setAttribute('size', val);
    }

    get onFileLoaded() {
        return this.onFileLoadedFn;
    }

    set onFileLoaded(handler) {
        if (this.onFileLoadedFn) {
          this.removeEventListener('fileLoaded', this.onFileLoadedFn);
          this.onFileLoadedFn = null;
        }

        if (typeof handler === 'function') {
          this.onFileLoadedFn = handler;
          this.addEventListener('fileLoaded', this.onFileLoadedFn);
        }
    }

    /**
     * Define attributes which should be observed by the web-component
     */
    static get observedAttributes() {
        return ['placeholder', 'not-allowed-hint', 'accept', 'onfileloaded', 'size'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'placeholder' || prop === 'accept' || prop == 'size') this.resetInput();
        if (prop === 'onfileloaded' && oldVal !== newVal) {
            if (newVal === null) {
              this.onFileLoaded = null;
            }
            else {
              this.onFileLoaded = Function(`return function onfileloaded(event) {\n\t${newVal};\n};`)();
            }
        }
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.resetInput();

        // Delete current file
        this.cancel.addEventListener('click', () => {
            this.resetInput();
        });

        // Prevents default browser drop-behaviour to support Chrome
        this.fileInput.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadFile(e.dataTransfer.files);
            this.dispatchEvent(new CustomEvent('change', {detail: e.dataTransfer.files}));
        });

        // Support file-dialog for file-input aswell
        this.fileInput.addEventListener('change', (e) => {
            this.uploadFile(e.target.files);
            this.dispatchEvent(new CustomEvent('change', {detail: e.target.files}));
        });

        // Styles for dragenter/leave animations
        this.fileInput.addEventListener('dragenter', (e) => {
            this.icon.classList.add('zone__info__icon--scale');
        });
        this.fileInput.addEventListener('dragleave', (e) => {
            this.icon.classList.remove('zone__info__icon--scale');
        });
    }

    /**
     * Reads the file object's data and returns data through the onfileloaded event
     * @param {Give file object} files
     */
    uploadFile(files) {
        this.dropzone.classList.remove('zone--allowed');
        this.info.innerText = '';
        this.hint.innerText = '';
        // Controls event handling for formdata for external form submit
        abortController = new AbortController();

        for (const file of files) {
            if (!this.accept.includes(file.type) || file.type === "") {
                this.rejectInput();
                return;
            }
    
                // Read data from file
            var reader = new FileReader(file);
            reader.readAsText(file);
            reader.addEventListener('load', (fileContent) => {
                this.fileExists = true;
    
                // Update zone style-state
                this.fileInput.disabled = true;
                this.icon.classList.remove('mdi-file-plus-outline');
                this.icon.classList.add('mdi-file-check-outline');
                this.icon.classList.add('zone__info__icon--rotate');
                this.dropzone.classList.add('zone--uploaded');
                this.cancel.style.display = 'block';
                this.info.style.display = 'block';
    
                // Output information
                const date = new Date(file.lastModified);
                this.info.innerText += `Size: ${this.formatBytes(file.size)}\nModified: ${date.toLocaleString("de")}\n`;
                this.hint.innerHTML += file.name + '  ';
    
                // Emit data-event
                var fileLoadedEvent  = new CustomEvent('fileLoaded', {detail: fileContent.target.result});
                this.dispatchEvent(fileLoadedEvent);
    
                // Set File content variable for outer form submits
                form.addEventListener('formdata', ({formData}) => {
                    formData.append('file[]', file, file.name);
                },
                { signal: abortController.signal }
                );
            });
        }
    }
    
    /**
     * Called to initialize or when file was removed
     */
    resetInput() {
        this.fileExists = false;

        // DOM-Elements
        this.dropzone = this.shadowRoot.getElementById('dropzone');
        this.cancel = this.shadowRoot.getElementById('cancel');
        this.icon = this.shadowRoot.getElementById('icon');
        this.hint = this.shadowRoot.getElementById('hint');
        this.info = this.shadowRoot.getElementById('info');
        this.fileInput = this.shadowRoot.getElementById('fileInput');

        // Adjust icon-sizes
        switch (this.size) {
            default:
            case 'sm':
                this.icon.classList.add('mdi-24px');
                this.cancel.classList.add('mdi-24px');
            break;
            case 'lg':
                this.icon.classList.add('mdi-36px');
                this.cancel.classList.add('mdi-24px');
                break;
            case 'xl':
                this.icon.classList.add('mdi-48px');
                this.cancel.classList.add('mdi-36px');
                break;
        }

        // Reset zone style-state
        this.fileInput.accept = this.accept;
        this.fileInput.disabled = false;
        this.fileInput.value = '';
        this.hint.innerText = this.placeholder;
        this.icon.classList.remove('mdi-file-check-outline');
        this.icon.classList.remove('mdi-file-cancel-outline');
        this.icon.classList.remove('zone__info__icon--rotate');
        this.icon.classList.remove('zone__info__icon--scale');
        this.dropzone.classList.remove('zone--uploaded');
        this.icon.classList.add('mdi-file-plus-outline');
        this.cancel.style.display = 'none';
        this.info.style.display = 'none';
    
        this.dropzone.addEventListener('dragover', () => {
            if (!this.fileExists) {
                this.dropzone.classList.add('zone--allowed');
            }
        });
    
        this.dropzone.addEventListener('dragleave', () => {
            if (!this.fileExists) {
                this.dropzone.classList.remove('zone--allowed');
            }
        });

        // Remove external form submit files
        abortController.abort();
    }
    
    /**
     * Called when input file-type is not allowed to show feedback to the user
     */
    rejectInput() {
        this.icon.classList.remove('mdi-file-plus-outline');
        this.icon.classList.add('mdi-file-cancel-outline');
        this.icon.classList.add('zone__info__icon--shake');
        this.dropzone.classList.add('zone--reject');
        this.hint.innerText = this.notAllowedHint;

        setTimeout(() => {
            this.dropzone.classList.remove('zone--reject');
            this.icon.classList.remove('zone__info__icon--shake');
            this.resetInput();
        }, 1500);
    }
    
    /**
     * 
     * @param {Enter bytes as int} bytes 
     * @param {Enter decimal points} decimals 
     * @returns Formatted size as string
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
    
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
        const i = Math.floor(Math.log(bytes) / Math.log(k));
    
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

}

// Defines the file-drop web-component for reuse
customElements.define('file-drop', FileDrop);