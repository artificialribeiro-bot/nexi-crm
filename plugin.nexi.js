(function() {
    'use strict';
    // Prevenir múltiplas inicializações
    if (window.NexiChat) {
        console.warn('Nexi Chat: O widget já foi inicializado.');
        return;
    }

    const NexiChat = {
        config: {
            empresaId: null, // Pode ser pré-definido na inicialização
            position: 'right',
            primaryColor: '#1a2b45',
            accentColor: '#ff6b35'
        },
        state: {
            isOpen: false,
            isInitialized: false,
            selectedCompany: null,
            allCompanies: [],
            chatId: null,
            customerData: {
                id_usuario: 'anon_' + Date.now()
            },
            currentStep: 'ask_client_name',
            attendantJoined: false,
            pollingInterval: null,
            lastMessageTimestamp: 0,
        },
        API: {
            EMPRESA: 'https://script.google.com/macros/s/AKfycbw0HyUQPS_67MmotBUNj3GI-LjweHrc6ALchR7rJt8eSPwGHitxeh5U9LIDQRtXybcZ/exec',
            CLIENTES: 'https://script.google.com/macros/s/AKfycbwe2m8h2OP0bFpkItF4x5OYRT77Bkhkdvg-EEBEzT_fq59Yz6J8ulcX3iPq9KOjpfcwVg/exec',
            CHAT: 'https://astounding-donut-e0ea90.netlify.app/.netlify/functions/proxy',
            USER: 'https://script.google.com/macros/s/AKfycbzxJFdRr7kqPAQUllOEN6WjroFGsgqvN25FleCDpHyOxQ3r1n_zBMKFblFNt663CVXj/exec',
            PRODUTOS: 'https://script.google.com/macros/s/AKfycbyEFH261J3qybQfBslMZiFQyJh1dJnFtsgswekugKYgkrsV6bxXcMvFu_YGw5K-fS4zLQ/exec',
            KEY: '1526'
        },
        elements: {}, // Para guardar referências aos elementos do DOM

        // --- INICIALIZAÇÃO ---
        init: function(options = {}) {
            if (this.state.isInitialized) return;
            this.config = { ...this.config,
                ...options
            };
            this.state.isInitialized = true;

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        },

        setup: function() {
            this.injectDependencies();
            this.injectHTML();
            this.injectStyles();
            this.mapDOMElements();
            this.attachEventListeners();

            // Lógica para decidir o que mostrar:
            if (this.config.empresaId) {
                this.loadSpecificCompanyAndStart(this.config.empresaId);
            } else {
                this.initializeCompanySelection();
            }
        },

        // --- CONSTRUÇÃO DA UI ---
        injectDependencies: function() {
            const googleFonts = document.createElement('link');
            googleFonts.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
            googleFonts.rel = 'stylesheet';
            document.head.appendChild(googleFonts);

            const materialIcons = document.createElement('link');
            materialIcons.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
            materialIcons.rel = 'stylesheet';
            document.head.appendChild(materialIcons);
        },

        injectHTML: function() {
            const widgetContainer = document.createElement('div');
            widgetContainer.id = 'nexi-chat-plugin-container';

            const htmlStructure = `
                <button id="nexi-chat-button" aria-label="Abrir chat">
                    <span class="material-icons">chat</span>
                </button>
                <div id="nexi-chat-container">
                    <div id="company-selection-modal-wrapper">
                        <div id="company-selection-modal" class="modal-content">
                            <div class="modal-header">
                                <h3>Bem-vindo ao Suporte</h3>
                                <p>Para qual empresa você precisa de ajuda?</p>
                                <div class="search-wrapper">
                                    <span class="material-icons">search</span>
                                    <input type="text" id="company-search-input" placeholder="Pesquisar empresa...">
                                </div>
                            </div>
                            <div id="company-list"></div>
                            <div id="company-loader" class="hidden"><div class="loader"></div></div>
                            <div class="modal-footer">
                                <p>Já tem um atendimento?</p>
                                <div class="resume-group">
                                    <input type="text" id="resume-chat-input" placeholder="Insira o ID do seu chat">
                                    <button id="resume-chat-button"><span>Entrar</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="chat-ui" class="hidden">
                        <header id="chat-header">
                            <img id="company-logo" src="https://placehold.co/40x40/ffffff/1a2b45?text=N" alt="Logo da Empresa">
                            <div class="header-info-container">
                                <div id="attendant-info" class="hidden">
                                    <img id="attendant-photo" src="https://placehold.co/40x40/ffffff/1a2b45?text=A" alt="Foto do Atendente">
                                    <div>
                                        <h2 id="attendant-name"></h2>
                                        <p id="chat-status-attendant">Online</p>
                                    </div>
                                </div>
                                <div id="company-info">
                                    <h2 id="company-chat-name"></h2>
                                    <p id="chat-status-company">Aguardando atendimento...</p>
                                </div>
                            </div>
                        </header>
                        <main id="messages-container"></main>
                        <footer id="chat-footer">
                            <button id="attach-file-button" disabled><span class="material-icons">attach_file</span></button>
                            <input type="file" id="file-input" class="hidden"/>
                            <input type="text" id="message-input" placeholder="Digite sua mensagem..." disabled>
                            <button id="send-button" disabled><span class="material-icons">send</span></button>
                        </footer>
                    </div>
                </div>
            `;
            widgetContainer.innerHTML = htmlStructure;
            document.body.appendChild(widgetContainer);
        },

        injectStyles: function() {
            const style = document.createElement('style');
            style.textContent = `
                :root {
                    --primary-blue: ${this.config.primaryColor};
                    --primary-orange: ${this.config.accentColor};
                    --bg-light: #f0f2f5;
                    --bg-dark: #111b21;
                    --bubble-sent: #d9fdd3;
                    --bubble-received: #ffffff;
                }
                #nexi-chat-plugin-container, #nexi-chat-plugin-container * { box-sizing: border-box; font-family: 'Poppins', sans-serif; }
                .hidden { display: none !important; }
                
                /* Botão flutuante */
                #nexi-chat-button { position: fixed; bottom: 20px; ${this.config.position}: 20px; width: 60px; height: 60px; border-radius: 50%; background-color: var(--primary-orange); color: white; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; z-index: 999998; transition: transform 0.3s; }
                #nexi-chat-button.open { transform: rotate(90deg); }

                /* Container Principal */
                #nexi-chat-container { position: fixed; bottom: 90px; ${this.config.position}: 20px; width: 380px; max-width: calc(100vw - 40px); height: 600px; max-height: calc(100vh - 120px); background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); display: none; flex-direction: column; z-index: 999999; overflow: hidden; }
                #nexi-chat-container.visible { display: flex; animation: nexi-slide-up 0.4s ease-out; }
                @keyframes nexi-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

                /* Modal de Seleção */
                #company-selection-modal-wrapper, #chat-ui { width: 100%; height: 100%; display: flex; flex-direction: column; }
                #company-selection-modal { display: flex; flex-direction: column; height: 100%;}
                .modal-header { padding: 24px; }
                .modal-header h3 { font-size: 1.25rem; font-weight: 700; color: #111; }
                .modal-header p { color: #666; margin-top: 8px; }
                .search-wrapper { position: relative; margin-top: 16px; }
                .search-wrapper .material-icons { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #999; }
                #company-search-input { width: 100%; padding: 8px 16px 8px 40px; border: 1px solid #ddd; border-radius: 8px; }
                #company-list { flex: 1; overflow-y: auto; border-top: 1px solid #eee; }
                .company-item { display: flex; align-items: center; padding: 16px; cursor: pointer; border-bottom: 1px solid #eee; }
                .company-item:hover { background-color: #f9f9f9; }
                .company-item img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
                .company-item span { margin-left: 16px; font-weight: 600; }
                .loader { margin: auto; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-blue); border-radius: 50%; width: 40px; height: 40px; animation: nexi-spin 1s linear infinite; }
                @keyframes nexi-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                #company-loader { text-align: center; padding: 40px; }
                .modal-footer { padding: 24px; border-top: 1px solid #eee; }
                .modal-footer p { font-size: 0.875rem; text-align: center; color: #666; }
                .resume-group { margin-top: 12px; display: flex; gap: 8px; }
                #resume-chat-input { flex: 1; padding: 8px 16px; border: 1px solid #ddd; border-radius: 8px; min-width: 0;}
                #resume-chat-button { background-color: var(--primary-blue); color: white; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; }
                
                /* UI do Chat */
                #chat-header { background: var(--primary-blue); color: white; padding: 12px; display: flex; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); flex-shrink: 0; }
                #chat-header img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
                .header-info-container { margin-left: 12px; flex: 1; min-width: 0; }
                #attendant-info { display: flex; align-items: center; gap: 12px; }
                #chat-header h2 { font-weight: 600; font-size: 1.1rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
                #chat-header p { font-size: 0.75rem; color: #eee; }
                #messages-container { flex: 1; padding: 16px; overflow-y: auto; background-color: var(--bg-light); display: flex; flex-direction: column; gap: 16px; }
                #chat-footer { background: #fff; padding: 12px; display: flex; align-items: center; gap: 12px; border-top: 1px solid #eee; }
                #message-input { flex: 1; background: #f0f2f5; border-radius: 9999px; padding: 8px 16px; border: 1px solid transparent; outline: none; min-width: 0; }
                #message-input:focus { border-color: var(--primary-orange); }
                #attach-file-button, #send-button { color: #555; background: none; border: none; cursor: pointer; padding: 8px; border-radius: 50%;}
                #send-button { background-color: var(--primary-orange); color: white; }
                button:disabled { opacity: 0.5; cursor: not-allowed; }

                /* Bolhas de Mensagem */
                .message-div { display: flex; }
                .message-div.user { justify-content: flex-end; }
                .message-div.bot, .message-div.attendant { justify-content: flex-start; }
                .message-bubble { max-width: 80%; padding: 8px 12px; border-radius: 12px; box-shadow: 0 1px 1px rgba(0,0,0,0.05); }
                .message-div.user .message-bubble { background-color: var(--bubble-sent); }
                .message-div.bot .message-bubble, .message-div.attendant .message-bubble { background-color: var(--bubble-received); }
                .message-name { font-weight: 700; font-size: 0.75rem; color: var(--primary-orange); margin-bottom: 4px; }
                .message-content { font-size: 0.9rem; word-wrap: break-word; color: #000; }
                .message-content a { color: #007bff; text-decoration: underline; }
                
                /* Indicador de Digitação */
                #typing-indicator .typing-dots span { height: 8px; width: 8px; margin: 0 1px; background-color: #9E9E9E; display: inline-block; border-radius: 50%; animation: nexi-bob 1s infinite; }
                #typing-indicator .typing-dots span:nth-of-type(1) { animation-delay: 0s; }
                #typing-indicator .typing-dots span:nth-of-type(2) { animation-delay: 0.2s; }
                #typing-indicator .typing-dots span:nth-of-type(3) { animation-delay: 0.4s; }
                @keyframes nexi-bob { 50% { transform: translateY(-5px); } }
            `;
            document.head.appendChild(style);
        },

        mapDOMElements: function() {
            const ids = [
                'nexi-chat-button', 'nexi-chat-container', 'company-selection-modal-wrapper',
                'company-selection-modal', 'company-list', 'company-loader', 'company-search-input',
                'chat-ui', 'messages-container', 'message-input', 'send-button',
                'resume-chat-input', 'resume-chat-button', 'attach-file-button', 'file-input',
                'company-logo', 'company-chat-name', 'chat-status-company', 'attendant-info',
                'attendant-photo', 'attendant-name', 'chat-status-attendant', 'company-info'
            ];
            ids.forEach(id => {
                const camelCaseId = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
                this.elements[camelCaseId] = document.getElementById(id);
            });
        },

        attachEventListeners: function() {
            this.elements.nexiChatButton.addEventListener('click', () => this.toggleChat());
            this.elements.companySearchInput.addEventListener('input', (e) => this.renderCompanies(e.target.value));
            this.elements.resumeChatButton.addEventListener('click', () => this.handleResumeChat());
            this.elements.sendButton.addEventListener('click', () => {
                const text = this.elements.messageInput.value.trim();
                if (text) {
                    this.handleUserInput(text);
                    this.elements.messageInput.value = '';
                }
            });
            this.elements.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !this.elements.sendButton.disabled) {
                    this.elements.sendButton.click();
                }
            });
            this.elements.attachFileButton.addEventListener('click', () => this.elements.fileInput.click());
            this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        },

        toggleChat: function() {
            this.state.isOpen = !this.state.isOpen;
            this.elements.nexiChatContainer.classList.toggle('visible');
            this.elements.nexiChatButton.classList.toggle('open');
        },

        // --- LÓGICA DA APLICAÇÃO (CONVERSÃO 1:1 DO FICHEIRO HTML) ---
        loadSpecificCompanyAndStart: async function(empresaId) {
            this.elements.companySelectionModal.innerHTML = `<div class="p-10 text-center"><div class="loader mx-auto"></div><p class="mt-4">Carregando dados da empresa...</p></div>`;
            try {
                const url = `${this.API.EMPRESA}?action=get_empresa&key=${this.API.KEY}&id_empresa=${empresaId}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error('Empresa não encontrada');
                const result = await response.json();
                if (result.success && result.data) {
                    this.handleCompanySelection(result.data);
                } else {
                    throw new Error(result.message || 'Falha ao carregar dados da empresa.');
                }
            } catch (error) {
                this.elements.companySelectionModal.innerHTML = `<div class="p-6 text-center text-red-500"><h3 class="text-xl font-bold">Erro</h3><p class="mt-2">${error.message}</p></div>`;
            }
        },

        initializeCompanySelection: async function() {
            this.elements.companyLoader.classList.remove('hidden');
            try {
                const response = await fetch(`${this.API.EMPRESA}?action=list_empresas&key=${this.API.KEY}`);
                if (!response.ok) throw new Error('Erro de rede');
                const result = await response.json();
                if (result.success && result.data) {
                    this.state.allCompanies = result.data;
                    this.renderCompanies();
                } else {
                    throw new Error(result.message || 'Falha ao buscar empresas');
                }
            } catch (error) {
                this.elements.companyList.innerHTML = `<p class="p-4 text-center text-red-500">${error.message}</p>`;
            } finally {
                this.elements.companyLoader.classList.add('hidden');
            }
        },

        renderCompanies: function(searchTerm = '') {
            const list = this.elements.companyList;
            list.innerHTML = '';
            const filtered = this.state.allCompanies.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()));
            filtered.forEach(company => {
                const item = document.createElement('div');
                item.className = 'company-item';
                item.innerHTML = `<img src="${company.foto_link || 'https://placehold.co/40x40/1a2b45/ffffff?text=N'}" alt="Logo"><span>${company.nome}</span>`;
                item.addEventListener('click', () => this.handleCompanySelection(company));
                list.appendChild(item);
            });
        },

        handleCompanySelection: function(company) {
            this.state.selectedCompany = company;
            this.elements.companyLogo.src = company.foto_link || 'https://placehold.co/40x40/ffffff/1a2b45?text=N';
            this.elements.companyChatName.textContent = company.nome;
            this.elements.companySelectionModalWrapper.classList.add('hidden');
            this.elements.chatUi.classList.remove('hidden');
            this.startChatFlow();
        },

        addMessage: function(text, sender = 'bot', name = 'NexiBot', isHtml = false) {
            const container = this.elements.messagesContainer;
            const messageDiv = document.createElement('div');
            messageDiv.className = `message-div ${sender}`;
            const bubbleColor = sender === 'user' ? 'var(--bubble-sent)' : 'var(--bubble-received)';
            messageDiv.innerHTML = `
                <div class="message-bubble" style="background-color: ${bubbleColor};">
                    ${name ? `<p class="message-name">${name}</p>` : ''}
                    <div class="message-content"></div>
                </div>
            `;
            const contentDiv = messageDiv.querySelector('.message-content');
            if (isHtml) {
                contentDiv.innerHTML = text;
            } else {
                contentDiv.textContent = text;
            }
            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight;
        },

        showTypingIndicator: function() {
            const container = this.elements.messagesContainer;
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typing-indicator';
            typingDiv.className = 'message-div bot';
            typingDiv.innerHTML = `<div class="message-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
            container.appendChild(typingDiv);
            container.scrollTop = container.scrollHeight;
        },

        removeTypingIndicator: function() {
            const indicator = document.getElementById('typing-indicator');
            if (indicator) indicator.remove();
        },

        normalizeAndDisplayMessage: async function(msg, isNew = false) {
            const normalized = { ...msg };
            if (!normalized.sender_name && normalized.sender_user_id) {
                normalized.sender_name = normalized.sender_user_id === this.state.customerData.id_usuario ? this.state.customerData.nome : 'Atendente';
            }
            if (normalized.attachment && typeof normalized.attachment === 'string' && !normalized.message) {
                normalized.message = normalized.attachment;
            }
            if (normalized.created_at === false && normalized[""]) {
                normalized.created_at = normalized[""];
            }

            const senderType = normalized.sender_user_id === this.state.customerData.id_usuario ? 'user' : 'attendant';
            let content = normalized.message || "";
            let isHtmlContent = false;

            const attachmentMatch = content.match(/\*\*attachment_id:([a-zA-Z0-9_-]+)\*\*/);
            const productMatch = content.match(/\*\*product_id:([a-zA-Z0-9_-]+)\*\*/);

            if (attachmentMatch) {
                const attachmentDetails = await this.fetchAttachmentDetails(attachmentMatch[1]);
                if (attachmentDetails) {
                    content = `<a href="${attachmentDetails.public_url}" target="_blank" class="flex items-center text-blue-600 underline"><span class="material-icons text-base mr-1">attach_file</span> ${attachmentDetails.file_name}</a>`;
                    isHtmlContent = true;
                }
            } else if (productMatch) {
                const productDetails = await this.fetchProductDetails(productMatch[1]);
                if (productDetails) {
                    const price = parseFloat(productDetails.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    content = `<div class="mt-2 border-t pt-2 flex items-start space-x-3"><img src="${productDetails.foto1 || 'https://placehold.co/64x64/eee/ccc?text=Produto'}" class="w-16 h-16 rounded-md object-cover"/><div><p class="font-bold">${productDetails.nome}</p><p class="text-xs">${(productDetails.descricao || '').substring(0, 50)}...</p><p class="text-sm font-semibold mt-1">${price}</p></div></div>`;
                    isHtmlContent = true;
                }
            }

            this.addMessage(content, senderType, normalized.sender_name, isHtmlContent);

            if (isNew) {
                const newTimestamp = new Date(normalized.created_at).getTime();
                if (newTimestamp > this.state.lastMessageTimestamp) {
                    this.state.lastMessageTimestamp = newTimestamp;
                }
            }
        },

        startChatFlow: function() {
            setTimeout(() => {
                this.addMessage(`Olá! Bem-vindo(a) ao suporte da <strong>${this.state.selectedCompany.nome}</strong>.`, 'bot', 'NexiBot', true);
                setTimeout(() => {
                    this.addMessage("Para começarmos, qual é o seu nome?");
                    this.enableInput();
                }, 1200);
            }, 500);
        },

        handleUserInput: async function(text) {
            this.disableInput();
            this.addMessage(text, 'user', null);
            await new Promise(resolve => setTimeout(resolve, 800));
            this.showTypingIndicator();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.processStep(text);
            this.removeTypingIndicator();
            if (this.state.currentStep !== 'done') {
                this.enableInput();
            }
        },

        processStep: async function(input) {
            switch (this.state.currentStep) {
                case 'ask_client_name':
                    this.state.customerData.nome = input;
                    this.addMessage(`Prazer, ${input}! Agora, por favor, digite seu CPF (apenas números).`);
                    this.state.currentStep = 'ask_cpf';
                    break;
                case 'ask_cpf':
                    const cpf = input.replace(/\D/g, '');
                    if (cpf.length !== 11) {
                        this.addMessage("CPF inválido. Por favor, digite um CPF com 11 dígitos.");
                        return;
                    }
                    this.state.customerData.cpf = cpf;
                    await this.checkCustomerExists(cpf);
                    break;
                case 'ask_celular':
                    this.state.customerData.celular = input.replace(/\D/g, '');
                    this.addMessage("Qual o seu e-mail?");
                    this.state.currentStep = 'ask_email';
                    break;
                case 'ask_email':
                    this.state.customerData.email = input;
                    this.addMessage("Ótimo. Agora, sua data de nascimento (formato AAAA-MM-DD).");
                    this.state.currentStep = 'ask_birth_date';
                    break;
                case 'ask_birth_date':
                    this.state.customerData.data_nascimento = input;
                    this.addMessage("Por favor, informe seu CEP para localizarmos sua cidade e estado. (Ou digite 'manual' para inserir manualmente)");
                    this.state.currentStep = 'ask_cep';
                    break;
                case 'ask_cep':
                    if (input.toLowerCase() === 'manual') {
                        this.addMessage("Ok. Qual é a sua cidade?");
                        this.state.currentStep = 'ask_city';
                    } else {
                        await this.handleCepInput(input);
                    }
                    break;
                case 'ask_city':
                    this.state.customerData.cidade = input;
                    this.addMessage("E qual o seu estado (sigla, ex: SP)?");
                    this.state.currentStep = 'ask_state';
                    break;
                case 'ask_state':
                    this.state.customerData.estado = input;
                    this.confirmAndRegister();
                    break;
                case 'confirm_and_register':
                    if (input.toLowerCase() === 'sim') {
                        this.addMessage("Obrigado! Criando seu cadastro...");
                        await this.registerCustomer();
                    } else {
                        this.addMessage("Entendido. Sem seu consentimento, não podemos prosseguir. O chat será encerrado. Agradecemos o contato!");
                        this.state.currentStep = 'done';
                    }
                    break;
                case 'awaiting_attendant':
                    await this.sendUserMessageToChat(input);
                    break;
            }
        },

        confirmAndRegister: function() {
            const summary = `<strong>Nome:</strong> ${this.state.customerData.nome}<br><strong>CPF:</strong> ${this.state.customerData.cpf}<br><strong>Celular:</strong> ${this.state.customerData.celular}<br><strong>Email:</strong> ${this.state.customerData.email}<br><strong>Nascimento:</strong> ${this.state.customerData.data_nascimento}<br><strong>Cidade:</strong> ${this.state.customerData.cidade}<br><strong>Estado:</strong> ${this.state.customerData.estado}`;
            this.addMessage(`Para finalizar, por favor, confirme os dados:<br><br>${summary}`, 'bot', 'NexiBot', true);
            setTimeout(() => {
                this.addMessage("Os dados estão corretos e você aceita os termos da LGPD do Nexi CRM? (Digite 'sim' ou 'não')");
                this.state.currentStep = 'confirm_and_register';
            }, 1000);
        },

        handleCepInput: async function(cep) {
            const cleanCep = cep.replace(/\D/g, '');
            if (cleanCep.length !== 8) {
                this.addMessage("CEP inválido. Tente novamente ou digite 'manual'.");
                return;
            }
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                if (data.erro) {
                    this.addMessage("Não encontrei este CEP. Por favor, digite sua cidade.");
                    this.state.currentStep = 'ask_city';
                } else {
                    this.state.customerData.cidade = data.localidade;
                    this.state.customerData.estado = data.uf;
                    this.addMessage(`Endereço encontrado: ${data.localidade} - ${data.uf}.`);
                    this.confirmAndRegister();
                }
            } catch (error) {
                this.addMessage("Tive um problema ao buscar o CEP. Por favor, digite sua cidade.");
                this.state.currentStep = 'ask_city';
            }
        },

        checkCustomerExists: async function(cpf) {
            try {
                const url = `${this.API.CLIENTES}?action=getByCpf&cpf=${cpf}&id_empresa=${this.state.selectedCompany.empresa_id}`;
                const response = await fetch(url);
                const result = await response.json();
                if (result.success) {
                    this.addMessage(`Encontrei seu cadastro, ${result.data.nome}! Um momento enquanto crio seu ticket de suporte.`);
                    this.state.customerData = result.data;
                    await this.createSupportChat();
                } else {
                    this.addMessage("Não encontrei seu cadastro. Vamos criar um rapidamente.");
                    setTimeout(() => {
                        this.addMessage("Qual seu celular com DDD?");
                        this.state.currentStep = 'ask_celular';
                    }, 1000);
                }
            } catch (error) {
                this.addMessage("Tive um problema para verificar seu cadastro. Tente novamente.", 'bot', 'Sistema');
            }
        },

        registerCustomer: async function() {
            try {
                const params = new URLSearchParams({
                    action: 'register',
                    ...this.state.customerData,
                    id_empresa: this.state.selectedCompany.empresa_id
                });
                const url = `${this.API.CLIENTES}?${params.toString()}`;
                const response = await fetch(url);
                const result = await response.json();
                if (result.success) {
                    this.state.customerData.id_usuario = result.data.id_usuario;
                    this.addMessage("Cadastro realizado com sucesso! Agora vou criar seu ticket de suporte.");
                    await this.createSupportChat();
                } else {
                    this.addMessage(`Houve um erro ao criar seu cadastro: ${result.message}`);
                    this.state.currentStep = 'done';
                }
            } catch (error) {
                this.addMessage("Tive um problema para realizar seu cadastro. Tente novamente.", 'bot', 'Sistema');
                this.state.currentStep = 'done';
            }
        },

        createSupportChat: async function() {
            const body = {
                action: 'create_chat',
                key: this.API.KEY,
                creator_user_id: this.state.customerData.id_usuario,
                creator_email: this.state.customerData.email || '',
                title: `Suporte para ${this.state.customerData.nome}`,
                send_email_summary: true
            };
            try {
                const response = await fetch(this.API.CHAT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
                const result = await response.json();
                if (result.success) {
                    this.state.chatId = result.data.chat_id;
                    const successMessage = `Seu atendimento foi iniciado!<br><br>O ID do seu chat é: <strong style="font-size: 1.2em;">${this.state.chatId}</strong><br><br>Guarde este código para retomar a conversa no futuro.`;
                    this.addMessage(successMessage, 'bot', 'NexiBot', true);
                    setTimeout(() => {
                        this.addMessage("Um de nossos atendentes irá se conectar em breve.");
                        this.addMessage("Enquanto aguarda, você pode descrever seu problema ou enviar um anexo.");
                        this.state.currentStep = 'awaiting_attendant';
                        this.startPolling();
                    }, 1500);
                } else {
                    this.addMessage(`Não consegui criar o chat: ${result.message || 'Tente novamente.'}`);
                    this.state.currentStep = 'done';
                }
            } catch (error) {
                this.addMessage("Ocorreu um erro de rede ao criar o chat.", 'bot', 'Sistema');
                this.state.currentStep = 'done';
            }
        },

        handleResumeChat: async function() {
            const chatIdToResume = this.elements.resumeChatInput.value.trim();
            if (!chatIdToResume) return;

            const button = this.elements.resumeChatButton;
            button.disabled = true;
            button.innerHTML = `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>`;

            try {
                const chatUrl = `${this.API.CHAT}?action=get_chat&key=${this.API.KEY}&chat_id=${chatIdToResume}`;
                const chatResponse = await fetch(chatUrl);
                const chatResult = await chatResponse.json();
                if (!chatResult.success) throw new Error(chatResult.message || "Chat não encontrado.");

                const chatData = chatResult.data;
                this.state.chatId = chatData.chat_id;
                this.state.customerData.id_usuario = chatData.creator_user_id;
                this.state.customerData.email = chatData.creator_email;
                this.state.customerData.nome = chatData.title.replace('Suporte para ', '');

                const messagesUrl = `${this.API.CHAT}?action=get_messages&key=${this.API.KEY}&chat_id=${chatIdToResume}&page_size=200`;
                const messagesResponse = await fetch(messagesUrl);
                const messagesResult = await messagesResponse.json();

                this.elements.companySelectionModalWrapper.classList.add('hidden');
                this.elements.chatUi.classList.remove('hidden');

                this.elements.companyLogo.src = 'https://placehold.co/40x40/ffffff/1a2b45?text=N';
                this.elements.companyChatName.textContent = chatData.title;

                this.elements.messagesContainer.innerHTML = '';
                if (messagesResult.success && messagesResult.data.messages) {
                    const messages = messagesResult.data.messages.sort((a, b) => new Date(a.created_at || a[""]) - new Date(b.created_at || b[""]));
                    for (const msg of messages) await this.normalizeAndDisplayMessage(msg);
                    if (messages.length > 0) this.state.lastMessageTimestamp = new Date(messages[messages.length - 1].created_at || messages[messages.length - 1][""]).getTime();
                }

                this.state.currentStep = 'awaiting_attendant';
                this.startPolling();

            } catch (error) {
                this.elements.resumeChatInput.value = '';
                this.elements.resumeChatInput.placeholder = error.message;
                setTimeout(() => {
                    this.elements.resumeChatInput.placeholder = 'Insira o ID do seu chat';
                }, 3000);
            } finally {
                button.disabled = false;
                button.innerHTML = `<span>Entrar</span>`;
            }
        },

        handleFileUpload: async function(event) {
            const file = event.target.files[0];
            if (!file) return;

            this.disableInput();
            this.addMessage(`Enviando anexo: ${file.name}...`, 'bot', 'Sistema');
            const button = this.elements.sendButton;
            const originalButtonContent = button.innerHTML;
            button.innerHTML = `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;

            try {
                const base64String = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = error => reject(error);
                });

                const tempMessageBody = {
                    action: 'add_message',
                    key: this.API.KEY,
                    chat_id: this.state.chatId,
                    sender_user_id: this.state.customerData.id_usuario,
                    sender_name: this.state.customerData.nome,
                    message: `[Uploading ${file.name}]`
                };
                const tempMsgRes = await fetch(this.API.CHAT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(tempMessageBody)
                });
                const tempMsgResult = await tempMsgRes.json();
                if (!tempMsgResult.success) throw new Error(tempMsgResult.message);
                const messageId = tempMsgResult.data.message_id;

                const attachmentBody = {
                    action: 'upload_attachment',
                    key: this.API.KEY,
                    chat_id: this.state.chatId,
                    message_id: messageId,
                    file_name: file.name,
                    file_type: file.type,
                    file_data: base64String,
                    uploaded_by: this.state.customerData.id_usuario
                };
                const attachmentResponse = await fetch(this.API.CHAT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(attachmentBody)
                });
                const attachmentResult = await attachmentResponse.json();
                if (!attachmentResult.success) throw new Error(attachmentResult.message || 'Falha ao enviar o anexo.');

                const finalMessage = `**attachment_id:${attachmentResult.data.attachment_id}**`;
                await this.sendUserMessageToChat(finalMessage);

            } catch (error) {
                this.addMessage(`Erro ao enviar o anexo: ${error.message}`, 'bot', 'Sistema');
            } finally {
                this.enableInput();
                button.innerHTML = originalButtonContent;
                this.elements.fileInput.value = '';
            }
        },

        fetchAttendantDetails: async function(attendantId) {
            try {
                const url = `${this.API.USER}?action=get&key=${this.API.KEY}&id=${attendantId}`;
                const response = await fetch(url);
                const result = await response.json();
                if (result.success) return result.data;
            } catch (e) { /* fail silently */ }
            return null;
        },

        startPolling: function() {
            if (this.state.pollingInterval) clearInterval(this.state.pollingInterval);

            this.state.pollingInterval = setInterval(async () => {
                if (!this.state.isOpen) return; // Pausar se o chat estiver fechado
                try {
                    const chatUrl = `${this.API.CHAT}?action=get_chat&key=${this.API.KEY}&chat_id=${this.state.chatId}`;
                    const chatResponse = await fetch(chatUrl);
                    if (!chatResponse.ok) return;
                    const chatResult = await chatResponse.json();

                    if (chatResult.success) {
                        const chatData = chatResult.data;
                        if (chatData.attendant_user_id && !this.state.attendantJoined) {
                            this.state.attendantJoined = true;
                            const attendantDetails = await this.fetchAttendantDetails(chatData.attendant_user_id);
                            const attendantName = attendantDetails ? attendantDetails.nome : (chatData.attendant_email || 'Atendente');

                            this.elements.companyInfo.classList.add('hidden');
                            const attendantInfo = this.elements.attendantInfo;
                            if (attendantDetails && attendantDetails.foto) this.elements.attendantPhoto.src = attendantDetails.foto;
                            this.elements.attendantName.textContent = attendantName;
                            attendantInfo.classList.remove('hidden');

                            this.addMessage(`Olá! Meu nome é ${attendantName} e vou te ajudar.`, 'attendant', attendantName);
                        }

                        const status = chatData.status || chatData.updated_at;
                        if (status === 'fechado' || status === 'cancelado') {
                            clearInterval(this.state.pollingInterval);
                            this.addMessage("Este atendimento foi finalizado e não pode mais receber novas mensagens.", 'bot', 'Sistema');
                            this.disableInput();
                            return;
                        }
                    }

                    const messagesUrl = `${this.API.CHAT}?action=get_messages&key=${this.API.KEY}&chat_id=${this.state.chatId}&page_size=50`;
                    const messagesResponse = await fetch(messagesUrl);
                    if (!messagesResponse.ok) return;
                    const messagesResult = await messagesResponse.json();

                    if (messagesResult.success && messagesResult.data && messagesResult.data.messages) {
                        const newMessages = messagesResult.data.messages.filter(msg => new Date(msg.created_at || msg[""]).getTime() > this.state.lastMessageTimestamp);
                        if (newMessages.length > 0) {
                            newMessages.sort((a, b) => new Date(a.created_at || a[""]) - new Date(b.created_at || b[""]));
                            for (const msg of newMessages) await this.normalizeAndDisplayMessage(msg, true);
                        }
                    }
                } catch (error) { /* Silently fail on poll */ }
            }, 5000);
        },

        fetchProductDetails: async function(productId) {
            try {
                if (!this.state.selectedCompany) return null;
                const url = `${this.API.PRODUTOS}?action=getByCompany&id_empresa=${this.state.selectedCompany.empresa_id}`;
                const res = await fetch(url);
                const result = await res.json();
                if (result.success && result.data) {
                    return result.data.find(p => p.id_produto === productId);
                }
                return null;
            } catch (e) {
                return null;
            }
        },

        fetchAttachmentDetails: async function(attachmentId) {
            try {
                const url = `${this.API.CHAT}?action=get_attachment&key=${this.API.KEY}&attachment_id=${attachmentId}`;
                const res = await fetch(url);
                const result = await res.json();
                return result.success ? result.data : null;
            } catch (e) {
                return null;
            }
        },

        sendUserMessageToChat: async function(message) {
            const body = {
                action: 'add_message',
                key: this.API.KEY,
                chat_id: this.state.chatId,
                sender_user_id: this.state.customerData.id_usuario,
                sender_name: this.state.customerData.nome,
                message: message
            };
            try {
                await fetch(this.API.CHAT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
            } catch (error) {
                this.addMessage("Não foi possível enviar sua mensagem. Verifique sua conexão.", 'bot', 'Sistema');
            }
        },

        enableInput: function() {
            if (this.state.currentStep !== 'done') {
                this.elements.messageInput.disabled = false;
                this.elements.sendButton.disabled = false;
                this.elements.attachFileButton.disabled = !this.state.chatId;
                this.elements.messageInput.focus();
            }
        },

        disableInput: function() {
            this.elements.messageInput.disabled = true;
            this.elements.sendButton.disabled = true;
            this.elements.attachFileButton.disabled = true;
        },
    };

    window.NexiChat = NexiChat;

})();


