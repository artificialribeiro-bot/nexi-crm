

(function() {
    'use strict';

    // Prevenir múltiplas inicializações
    if (window.NexiChat) {
        console.warn('Nexi Chat: Widget já inicializado');
        return;
    }

    const NexiChat = {
        config: {
            empresaId: null,
            position: 'right',
            primaryColor: '#1a2b45',
            accentColor: '#ff6b35'
        },
        state: {
            isOpen: false,
            isInitialized: false,
            chatId: null,
            customerData: { id_usuario: 'anon_' + Date.now() },
            currentStep: 'ask_client_name',
            attendantJoined: false,
            pollingInterval: null,
            lastMessageTimestamp: 0,
            companyData: null
        },
        
        API: {
            EMPRESA: 'https://script.google.com/macros/s/AKfycbw0HyUQPS_67MmotBUNj3GI-LjweHrc6ALchR7rJt8eSPwGHitxeh5U9LIDQRtXybcZ/exec',
            CLIENTES: 'https://script.google.com/macros/s/AKfycbwe2m8h2OP0bFpkItF4x5OYRT77Bkhkdvg-EEBEzT_fq59Yz6J8ulcX3iPq9KOjpfcwVg/exec',
            CHAT: 'https://astounding-donut-e0ea90.netlify.app/.netlify/functions/proxy',
            USER: 'https://script.google.com/macros/s/AKfycbzxJFdRr7kqPAQUllOEN6WjroFGsgqvN25FleCDpHyOxQ3r1n_zBMKFblFNt663CVXj/exec',
            PRODUTOS: 'https://script.google.com/macros/s/AKfycbyEFH261J3qybQfBslMZiFQyJh1dJnFtsgswekugKYgkrsV6bxXcMvFu_YGw5K-fS4zLQ/exec',
            KEY: '1526'
        },

        init: function(options) {
            if (this.state.isInitialized) {
                console.warn('Nexi Chat: Widget já foi inicializado');
                return;
            }

            if (!options || !options.empresaId) {
                console.error('Nexi Chat: empresaId é obrigatório');
                return;
            }
            
            this.config = { ...this.config, ...options };
            this.state.isInitialized = true;
            
            // Aguardar DOM estar pronto
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        },

        setup: function() {
            this.injectStyles();
            this.createWidget();
            this.loadCompanyData();
        },

        injectStyles: function() {
            const styles = `
                #nexi-chat-widget *,
                #nexi-chat-widget *::before,
                #nexi-chat-widget *::after {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                
                #nexi-chat-button {
                    position: fixed;
                    bottom: 20px;
                    ${this.config.position}: 20px;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: ${this.config.accentColor};
                    color: white;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999998;
                    transition: transform 0.3s, box-shadow 0.3s;
                    font-size: 28px;
                    line-height: 1;
                }
                
                #nexi-chat-button:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
                }
                
                #nexi-chat-button.nexi-chat-open {
                    transform: rotate(90deg);
                }
                
                #nexi-chat-container {
                    position: fixed;
                    bottom: 90px;
                    ${this.config.position}: 20px;
                    width: 380px;
                    max-width: calc(100vw - 40px);
                    height: 600px;
                    max-height: calc(100vh - 120px);
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
                    display: none;
                    flex-direction: column;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    overflow: hidden;
                }
                
                #nexi-chat-container.nexi-chat-visible {
                    display: flex;
                    animation: nexiSlideUp 0.3s ease-out;
                }
                
                @keyframes nexiSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                #nexi-chat-header {
                    background: ${this.config.primaryColor};
                    color: white;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    flex-shrink: 0;
                }
                
                #nexi-chat-header img {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    object-fit: cover;
                    margin-right: 12px;
                    flex-shrink: 0;
                }
                
                #nexi-chat-header-info {
                    flex: 1;
                    min-width: 0;
                }
                
                #nexi-chat-header-info h3 {
                    font-size: 16px;
                    font-weight: 600;
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                #nexi-chat-header-info p {
                    font-size: 12px;
                    opacity: 0.8;
                    margin: 2px 0 0 0;
                }
                
                #nexi-chat-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                    font-size: 24px;
                    line-height: 1;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                    flex-shrink: 0;
                }
                
                #nexi-chat-close:hover {
                    opacity: 1;
                }
                
                #nexi-chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    background: #f0f2f5;
                }
                
                .nexi-message {
                    display: flex;
                    margin-bottom: 12px;
                }
                
                .nexi-message.nexi-message-user {
                    justify-content: flex-end;
                }
                
                .nexi-message-bubble {
                    max-width: 70%;
                    padding: 10px 14px;
                    border-radius: 12px;
                    font-size: 14px;
                    line-height: 1.4;
                    word-wrap: break-word;
                }
                
                .nexi-message-bot .nexi-message-bubble {
                    background: white;
                    color: #000;
                }
                
                .nexi-message-user .nexi-message-bubble {
                    background: #d9fdd3;
                    color: #000;
                }
                
                .nexi-message-attendant .nexi-message-bubble {
                    background: white;
                    color: #000;
                }
                
                .nexi-message-name {
                    font-weight: 600;
                    font-size: 12px;
                    color: ${this.config.accentColor};
                    margin-bottom: 4px;
                }
                
                .nexi-typing-indicator {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 10px 14px;
                }
                
                .nexi-typing-indicator span {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #90949c;
                    animation: nexiTypingBounce 1.4s infinite;
                }
                
                .nexi-typing-indicator span:nth-child(2) {
                    animation-delay: 0.2s;
                }
                
                .nexi-typing-indicator span:nth-child(3) {
                    animation-delay: 0.4s;
                }
                
                @keyframes nexiTypingBounce {
                    0%, 60%, 100% {
                        transform: translateY(0);
                    }
                    30% {
                        transform: translateY(-10px);
                    }
                }
                
                #nexi-chat-input-area {
                    padding: 12px;
                    background: white;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                
                #nexi-chat-attach-btn {
                    background: none;
                    border: none;
                    color: #666;
                    cursor: pointer;
                    padding: 8px;
                    font-size: 20px;
                    transition: color 0.2s;
                    line-height: 1;
                    flex-shrink: 0;
                }
                
                #nexi-chat-attach-btn:hover:not(:disabled) {
                    color: ${this.config.accentColor};
                }
                
                #nexi-chat-attach-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }
                
                #nexi-chat-input {
                    flex: 1;
                    border: 1px solid #e0e0e0;
                    border-radius: 20px;
                    padding: 10px 16px;
                    font-size: 14px;
                    font-family: inherit;
                    outline: none;
                    transition: border-color 0.2s;
                    min-width: 0;
                }
                
                #nexi-chat-input:focus {
                    border-color: ${this.config.accentColor};
                }
                
                #nexi-chat-input:disabled {
                    background: #f5f5f5;
                    cursor: not-allowed;
                }
                
                #nexi-chat-send-btn {
                    background: ${this.config.accentColor};
                    border: none;
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    transition: opacity 0.2s;
                    flex-shrink: 0;
                }
                
                #nexi-chat-send-btn:hover:not(:disabled) {
                    opacity: 0.9;
                }
                
                #nexi-chat-send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                #nexi-resume-section {
                    padding: 16px;
                    border-top: 1px solid #e0e0e0;
                    background: #f9f9f9;
                }
                
                #nexi-resume-section p {
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                    margin-bottom: 8px;
                }
                
                #nexi-resume-section .nexi-resume-input-group {
                    display: flex;
                    gap: 8px;
                }
                
                #nexi-resume-chat-input {
                    flex: 1;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 8px 12px;
                    font-size: 13px;
                    font-family: inherit;
                    outline: none;
                    min-width: 0;
                }
                
                #nexi-resume-chat-input:focus {
                    border-color: ${this.config.accentColor};
                }
                
                #nexi-resume-chat-btn {
                    background: ${this.config.primaryColor};
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 16px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: opacity 0.2s;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                
                #nexi-resume-chat-btn:hover:not(:disabled) {
                    opacity: 0.9;
                }
                
                #nexi-resume-chat-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .nexi-loading {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 2px solid #f3f3f3;
                    border-top: 2px solid ${this.config.accentColor};
                    border-radius: 50%;
                    animation: nexiSpin 0.8s linear infinite;
                }
                
                @keyframes nexiSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                #nexi-chat-messages::-webkit-scrollbar {
                    width: 6px;
                }
                
                #nexi-chat-messages::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                #nexi-chat-messages::-webkit-scrollbar-thumb {
                    background: #ccc;
                    border-radius: 3px;
                }
                
                #nexi-chat-messages::-webkit-scrollbar-thumb:hover {
                    background: #999;
                }
                
                @media (max-width: 480px) {
                    #nexi-chat-container {
                        width: calc(100vw - 20px);
                        height: calc(100vh - 100px);
                        bottom: 80px;
                        ${this.config.position}: 10px;
                    }
                    
                    #nexi-chat-button {
                        width: 56px;
                        height: 56px;
                        font-size: 24px;
                    }
                }
            `;
            
            const styleSheet = document.createElement('style');
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        },

        createWidget: function() {
            const widgetHTML = `
                <div id="nexi-chat-widget">
                    <button id="nexi-chat-button" aria-label="Abrir chat">
                        💬
                    </button>
                    
                    <div id="nexi-chat-container">
                        <div id="nexi-chat-header">
                            <img id="nexi-company-logo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%231a2b45' width='40' height='40'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dy='.3em'%3EN%3C/text%3E%3C/svg%3E" alt="Logo">
                            <div id="nexi-chat-header-info">
                                <h3 id="nexi-company-name">Carregando...</h3>
                                <p id="nexi-chat-status">Conectando...</p>
                            </div>
                            <button id="nexi-chat-close" aria-label="Fechar chat">×</button>
                        </div>
                        
                        <div id="nexi-chat-messages"></div>
                        
                        <div id="nexi-chat-input-area">
                            <button id="nexi-chat-attach-btn" disabled aria-label="Anexar arquivo">📎</button>
                            <input type="file" id="nexi-chat-file-input" style="display: none;">
                            <input type="text" id="nexi-chat-input" placeholder="Digite sua mensagem..." disabled>
                            <button id="nexi-chat-send-btn" disabled aria-label="Enviar mensagem">➤</button>
                        </div>
                        
                        <div id="nexi-resume-section">
                            <p>Já tem um atendimento?</p>
                            <div class="nexi-resume-input-group">
                                <input type="text" id="nexi-resume-chat-input" placeholder="ID do chat">
                                <button id="nexi-resume-chat-btn">Retomar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const div = document.createElement('div');
            div.innerHTML = widgetHTML;
            document.body.appendChild(div.firstElementChild);
            
            this.attachEventListeners();
        },

        attachEventListeners: function() {
            const button = document.getElementById('nexi-chat-button');
            const closeBtn = document.getElementById('nexi-chat-close');
            const sendBtn = document.getElementById('nexi-chat-send-btn');
            const input = document.getElementById('nexi-chat-input');
            const attachBtn = document.getElementById('nexi-chat-attach-btn');
            const fileInput = document.getElementById('nexi-chat-file-input');
            const resumeBtn = document.getElementById('nexi-resume-chat-btn');
            
            if (button) button.addEventListener('click', () => this.toggleChat());
            if (closeBtn) closeBtn.addEventListener('click', () => this.toggleChat());
            if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !sendBtn.disabled) this.sendMessage();
                });
            }
            if (attachBtn) attachBtn.addEventListener('click', () => fileInput.click());
            if (fileInput) fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
            if (resumeBtn) resumeBtn.addEventListener('click', () => this.resumeChat());
        },

        toggleChat: function() {
            const container = document.getElementById('nexi-chat-container');
            const button = document.getElementById('nexi-chat-button');
            
            this.state.isOpen = !this.state.isOpen;
            
            if (this.state.isOpen) {
                container.classList.add('nexi-chat-visible');
                button.classList.add('nexi-chat-open');
                if (!this.state.chatId && this.state.currentStep === 'ask_client_name' && this.state.companyData) {
                    setTimeout(() => this.startChatFlow(), 300);
                }
            } else {
                container.classList.remove('nexi-chat-visible');
                button.classList.remove('nexi-chat-open');
            }
        },

        loadCompanyData: async function() {
            try {
                const url = `${this.API.EMPRESA}?action=get_empresa&key=${this.API.KEY}&id_empresa=${this.config.empresaId}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success && result.data) {
                    this.state.companyData = result.data;
                    const nameEl = document.getElementById('nexi-company-name');
                    const logoEl = document.getElementById('nexi-company-logo');
                    const statusEl = document.getElementById('nexi-chat-status');
                    
                    if (nameEl) nameEl.textContent = result.data.nome;
                    if (logoEl && result.data.foto_link) logoEl.src = result.data.foto_link;
                    if (statusEl) statusEl.textContent = 'Online';
                } else {
                    throw new Error(result.message || 'Empresa não encontrada');
                }
            } catch (error) {
                console.error('Nexi Chat: Erro ao carregar empresa', error);
                const nameEl = document.getElementById('nexi-company-name');
                const statusEl = document.getElementById('nexi-chat-status');
                if (nameEl) nameEl.textContent = 'Suporte';
                if (statusEl) statusEl.textContent = 'Disponível';
                
                // Criar dados padrão
                this.state.companyData = {
                    nome: 'Suporte',
                    empresa_id: this.config.empresaId
                };
            }
        },

        addMessage: function(text, sender = 'bot', name = null, isHtml = false) {
            const messagesContainer = document.getElementById('nexi-chat-messages');
            if (!messagesContainer) return;
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `nexi-message nexi-message-${sender}`;
            
            const bubble = document.createElement('div');
            bubble.className = 'nexi-message-bubble';
            
            if (name) {
                const nameSpan = document.createElement('div');
                nameSpan.className = 'nexi-message-name';
                nameSpan.textContent = name;
                bubble.appendChild(nameSpan);
            }
            
            const content = document.createElement('div');
            if (isHtml) {
                content.innerHTML = text;
            } else {
                content.textContent = text;
            }
            bubble.appendChild(content);
            
            messageDiv.appendChild(bubble);
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        },

        showTypingIndicator: function() {
            const messagesContainer = document.getElementById('nexi-chat-messages');
            if (!messagesContainer) return;
            
            const typingDiv = document.createElement('div');
            typingDiv.id = 'nexi-typing-indicator';
            typingDiv.className = 'nexi-message nexi-message-bot';
            typingDiv.innerHTML = `
                <div class="nexi-message-bubble">
                    <div class="nexi-typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(typingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        },

        removeTypingIndicator: function() {
            const indicator = document.getElementById('nexi-typing-indicator');
            if (indicator) indicator.remove();
        },

        enableInput: function() {
            if (this.state.currentStep !== 'done') {
                const input = document.getElementById('nexi-chat-input');
                const sendBtn = document.getElementById('nexi-chat-send-btn');
                const attachBtn = document.getElementById('nexi-chat-attach-btn');
                
                if (input) input.disabled = false;
                if (sendBtn) sendBtn.disabled = false;
                if (attachBtn) attachBtn.disabled = !this.state.chatId;
            }
        },

        disableInput: function() {
            const input = document.getElementById('nexi-chat-input');
            const sendBtn = document.getElementById('nexi-chat-send-btn');
            const attachBtn = document.getElementById('nexi-chat-attach-btn');
            
            if (input) input.disabled = true;
            if (sendBtn) sendBtn.disabled = true;
            if (attachBtn) attachBtn.disabled = true;
        },

        startChatFlow: function() {
            if (!this.state.companyData) {
                this.addMessage('Aguarde enquanto carregamos as informações...', 'bot');
                return;
            }
            
            setTimeout(() => {
                this.addMessage(`Olá! Bem-vindo(a) ao suporte da <strong>${this.state.companyData.nome}</strong>.`, 'bot', 'NexiBot', true);
                setTimeout(() => {
                    this.addMessage('Para começarmos, qual é o seu nome?', 'bot');
                    this.enableInput();
                    
                    // Focar no input
                    const input = document.getElementById('nexi-chat-input');
                    if (input) input.focus();
                }, 1200);
            }, 500);
        },

        sendMessage: async function() {
            const input = document.getElementById('nexi-chat-input');
            if (!input) return;
            
            const text = input.value.trim();
            if (!text) return;
            
            this.disableInput();
            this.addMessage(text, 'user');
            input.value = '';
            
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
                    this.addMessage(`Prazer, ${input}! Agora, por favor, digite seu CPF (apenas números).`, 'bot');
                    this.state.currentStep = 'ask_cpf';
                    break;
                    
                case 'ask_cpf':
                    const cpf = input.replace(/\D/g, '');
                    if (cpf.length !== 11) {
                        this.addMessage('CPF inválido. Por favor, digite um CPF com 11 dígitos.', 'bot');
                        return;
                    }
                    this.state.customerData.cpf = cpf;
                    await this.checkCustomerExists(cpf);
                    break;
                    
                case 'ask_celular':
                    this.state.customerData.celular = input.replace(/\D/g, '');
                    this.addMessage('Qual o seu e-mail?', 'bot');
                    this.state.currentStep = 'ask_email';
                    break;
                    
                case 'ask_email':
                    this.state.customerData.email = input;
                    this.addMessage('Ótimo. Agora, sua data de nascimento (formato AAAA-MM-DD).', 'bot');
                    this.state.currentStep = 'ask_birth_date';
                    break;
                    
                case 'ask_birth_date':
                    this.state.customerData.data_nascimento = input;
                    this.addMessage("Por favor, informe seu CEP para localizarmos sua cidade e estado. (Ou digite 'manual' para inserir manualmente)", 'bot');
                    this.state.currentStep = 'ask_cep';
                    break;
                    
                case 'ask_cep':
                    if (input.toLowerCase() === 'manual') {
                        this.addMessage('Ok. Qual é a sua cidade?', 'bot');
                        this.state.currentStep = 'ask_city';
                    } else {
                        await this.handleCepInput(input);
                    }
                    break;
                    
                case 'ask_city':
                    this.state.customerData.cidade = input;
                    this.addMessage('E qual o seu estado (sigla, ex: SP)?', 'bot');
                    this.state.currentStep = 'ask_state';
                    break;
                    
                case 'ask_state':
                    this.state.customerData.estado = input;
                    this.confirmAndRegister();
                    break;
                    
                case 'confirm_and_register':
                    if (input.toLowerCase() === 'sim') {
                        this.addMessage('Obrigado! Criando seu cadastro...', 'bot');
                        await this.registerCustomer();
                    } else {
                        this.addMessage('Entendido. Sem seu consentimento, não podemos prosseguir. O chat será encerrado. Agradecemos o contato!', 'bot');
                        this.state.currentStep = 'done';
                    }
                    break;
                    
                case 'awaiting_attendant':
                    await this.sendUserMessageToChat(input);
                    break;
            }