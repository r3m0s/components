var fileExists;
var dropzone;
var cancel;
var icon;
var hint;
var info;
var fileInput;
var _onCheckFn;

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
            <input id="fileInput" class="zone__input" type="file"/>
            <div id="cancel" class="zone__cancel mdi mdi-close"></div>
        </div>
        `;

        this.attachShadow({ mode: 'open' }).appendChild(fileDropTemplate.content);

        this._onCheckFn = null;

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

    get onFileLoaded() {
        return this._onCheckFn;
    }

    set onFileLoaded(handler) {
        if (this._onCheckFn) {
          this.removeEventListener('fileLoaded', this._onCheckFn);
          this._onCheckFn = null;
        }

        if (typeof handler === 'function') {
          this._onCheckFn = handler;
          this.addEventListener('fileLoaded', this._onCheckFn);
        }
    }

    get size() {
        return this.getAttribute('size');
    }

    set size(val) {
        this.setAttribute('size', val);
    }

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

        this.cancel.addEventListener('click', () => {
            this.resetInput();
        });

        this.fileInput.addEventListener('change', (e) => {
            var file = e.target.files[0];

            this.dropzone.classList.remove('zone--allowed');
            
            if (!this.accept.includes(file.type)) {
                this.rejectInput();
                return;
            }

            var reader = new FileReader(file);
            reader.readAsText(file);
            reader.addEventListener('load', (e) => {
                this.fileExists = true;
                this.fileInput.disabled = true;
                this.icon.classList.remove('mdi-file-plus-outline');
                this.icon.classList.add('mdi-file-check-outline');
                this.icon.classList.add('zone__info__icon--rotate');

                this.dropzone.classList.add('zone--uploaded');
                this.cancel.style.display = 'block';
                this.info.style.display = 'block';
                this.hint.innerText = file.name;
                const date = new Date(file.lastModified);
                this.info.innerText = `Size: ${this.formatBytes(file.size)}\nModified: ${date.toLocaleString("de")}`

                var fileLoadedEvent  = new CustomEvent('fileLoaded', {bubbles: true, cancelable: true, detail: e.target.result});
                this.dispatchEvent(fileLoadedEvent);
            });
        });
    }
    
    resetInput() {
        this.dropzone = this.shadowRoot.getElementById('dropzone');
        this.cancel = this.shadowRoot.getElementById('cancel');
        this.icon = this.shadowRoot.getElementById('icon');
        this.hint = this.shadowRoot.getElementById('hint');
        this.info = this.shadowRoot.getElementById('info');
        this.fileInput = this.shadowRoot.getElementById('fileInput');

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

        this.fileExists = false;
        this.cancel.style.display = 'none';
        this.info.style.display = 'none';
        this.fileInput.accept = this.accept;
        this.fileInput.value = '';
        this.fileInput.disabled = false;
        this.icon.classList.remove('mdi-file-check-outline');
        this.icon.classList.remove('mdi-file-cancel-outline');
        this.icon.classList.remove('zone__info__icon--rotate');
        this.icon.classList.add('mdi-file-plus-outline');
        this.hint.innerText = this.placeholder;
    
        this.dropzone.classList.remove('zone--uploaded');
    
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
    }
    
    rejectInput() {
        this.hint.innerText = this.notAllowedHint;
        this.icon.classList.remove('mdi-file-plus-outline');
        this.icon.classList.add('mdi-file-cancel-outline');
        this.icon.classList.add('zone__info__icon--shake');
        this.dropzone.classList.add('zone--reject');
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

customElements.define('file-drop', FileDrop);