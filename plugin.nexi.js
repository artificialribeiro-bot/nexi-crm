/**
 * Nexi Chat Widget v1.0
 * Widget de chat para suporte ao cliente
 * 
 * COMO USAR:
 * 1. Adicione este script no seu site:
 *    <script src="caminho/para/nexi-chat-widget.js"></script>
 * 
 * 2. Inicialize o widget:
 *    <script>
 *      NexiChat.init({
 *        empresaId: 'SEU_ID_EMPRESA_AQUI',
 *        position: 'right', // 'right' ou 'left'
 *        primaryColor: '#1a2b45',
 *        accentColor: '#ff6b35'
 *      });
 *    </script>
 */

(function() {
    'use strict';

    // Variáveis globais do widget
    const NexiChat = {
        config: {
            empresaId: null,
            position: 'right',
            primaryColor: '#1a2b45',
            accentColor: '#ff6b35'
        },
        state: {
            isOpen: false,
            chatId: null,
            customerData: { id_usuario: 'anon_' + Date.now() },
            currentStep: 'ask_client_name',
            attendantJoined: false,
            pollingInterval: null,
            lastMessageTimestamp: 0,
            companyData: null
        },
        
        // APIs
        API: {
            EMPRESA: 'https://script.google.com/macros/s/AKfycbw0HyUQPS_67MmotBUNj3GI-LjweHrc6ALchR7rJt8eSPwGHitxeh5U9LIDQRtXybcZ/exec',
            CLIENTES: 'https://script.google.com/macros/s/AKfycbwe2m8h2OP0bFpkItF4x5OYRT77Bkhkdvg-EEBEzT_fq59Yz6J8ulcX3iPq9KOjpfcwVg/exec',
            CHAT: 'https://astounding-donut-e0ea90.netlify.app/.netlify/functions/proxy',
            USER: 'https://script.google.com/macros/s/AKfycbzxJFdRr7kqPAQUllOEN6WjroFGsgqvN25FleCDpHyOxQ3r1n_zBMKFblFNt663CVXj/exec',
            PRODUTOS: 'https://script.google.com/macros/s/AKfycbyEFH261J3qybQfBslMZiFQyJh1dJnFtsgswekugKYgkrsV6bxXcMvFu_YGw5K-fS4zLQ/exec',
            KEY: '1526'
        },

        // Inicialização
        init: function(options) {
            if (!options.empresaId) {
                console.error('Nexi Chat: empresaId é obrigatório');
                return;
            }
            
            this.config = { ...this.config, ...options };
            this.injectStyles();
            this.createWidget();
            this.loadCompanyData();
        },

        // Injetar estilos CSS
        injectStyles: function() {
            const styles = `
                /* Nexi Chat Widget Styles */
                #nexi-chat-widget * {
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
                
                /* Header */
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
                }
                
                #nexi-chat-close:hover {
                    opacity: 1;
                }
                
                /* Messages Area */
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
                
                /* Typing Indicator */
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
                
                /* Input Area */
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
                }
                
                #nexi-chat-send-btn:hover:not(:disabled) {
                    opacity: 0.9;
                }
                
                #nexi-chat-send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                /* Resume Chat Section */
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
                }
                
                #nexi-resume-chat-btn:hover {
                    opacity: 0.9;
                }
                
                #nexi-resume-chat-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                /* Loading */
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
                
                /* Scrollbar */
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
                
                /* Mobile Responsive */
                @media (max-width: 480px) {
                    #nexi-chat-container {
                        width: calc(100vw - 20px);
                        height: calc(100vh - 100px);
                        bottom: 80px;
                        ${this.config.position}: 10px;
                    }
                }
            `;
            
            const styleSheet = document.createElement('style');
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        },

        // Criar estrutura HTML do widget
        createWidget: function() {
            const widgetHTML = `
                <div id="nexi-chat-widget">
                    <button id="nexi-chat-button" aria-label="Abrir chat">
                        💬
                    </button>
                    
                    <div id="nexi-chat-container">
                        <div id="nexi-chat-header">
                            <img id="nexi-company-logo" src="https://placehold.co/40x40/ffffff/1a2b45?text=N" alt="Logo">
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

        // Event listeners
        attachEventListeners: function() {
            const button = document.getElementById('nexi-chat-button');
            const closeBtn = document.getElementById('nexi-chat-close');
            const sendBtn = document.getElementById('nexi-chat-send-btn');
            const input = document.getElementById('nexi-chat-input');
            const attachBtn = document.getElementById('nexi-chat-attach-btn');
            const fileInput = document.getElementById('nexi-chat-file-input');
            const resumeBtn = document.getElementById('nexi-resume-chat-btn');
            
            button.addEventListener('click', () => this.toggleChat());
            closeBtn.addEventListener('click', () => this.toggleChat());
            sendBtn.addEventListener('click', () => this.sendMessage());
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !sendBtn.disabled) this.sendMessage();
            });
            attachBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
            resumeBtn.addEventListener('click', () => this.resumeChat());
        },

        // Toggle chat aberto/fechado
        toggleChat: function() {
            const container = document.getElementById('nexi-chat-container');
            const button = document.getElementById('nexi-chat-button');
            
            this.state.isOpen = !this.state.isOpen;
            
            if (this.state.isOpen) {
                container.classList.add('nexi-chat-visible');
                button.classList.add('nexi-chat-open');
                if (!this.state.chatId && this.state.currentStep === 'ask_client_name') {
                    this.startChatFlow();
                }
            } else {
                container.classList.remove('nexi-chat-visible');
                button.classList.remove('nexi-chat-open');
            }
        },

        // Carregar dados da empresa
        loadCompanyData: async function() {
            try {
                const response = await fetch(`${this.API.EMPRESA}?action=get_empresa&key=${this.API.KEY}&id_empresa=${this.config.empresaId}`);
                const result = await response.json();
                
                if (result.success && result.data) {
                    this.state.companyData = result.data;
                    document.getElementById('nexi-company-name').textContent = result.data.nome;
                    document.getElementById('nexi-company-logo').src = result.data.foto_link || 'https://placehold.co/40x40/ffffff/1a2b45?text=N';
                    document.getElementById('nexi-chat-status').textContent = 'Online';
                } else {
                    throw new Error('Empresa não encontrada');
                }
            } catch (error) {
                console.error('Nexi Chat: Erro ao carregar empresa', error);
                document.getElementById('nexi-company-name').textContent = 'Erro ao carregar';
                document.getElementById('nexi-chat-status').textContent = 'Offline';
            }
        },

        // Adicionar mensagem
        addMessage: function(text, sender = 'bot', name = null, isHtml = false) {
            const messagesContainer = document.getElementById('nexi-chat-messages');
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

        // Indicador de digitação
        showTypingIndicator: function() {
            const messagesContainer = document.getElementById('nexi-chat-messages');
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

        // Controle de input
        enableInput: function() {
            if (this.state.currentStep !== 'done') {
                document.getElementById('nexi-chat-input').disabled = false;
                document.getElementById('nexi-chat-send-btn').disabled = false;
                document.getElementById('nexi-chat-attach-btn').disabled = !this.state.chatId;
            }
        },

        disableInput: function() {
            document.getElementById('nexi-chat-input').disabled = true;
            document.getElementById('nexi-chat-send-btn').disabled = true;
            document.getElementById('nexi-chat-attach-btn').disabled = true;
        },

        // Iniciar fluxo de chat
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
                }, 1200);
            }, 500);
        },

        // Enviar mensagem
        sendMessage: async function() {
            const input = document.getElementById('nexi-chat-input');
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

        // Processar etapas do chat
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
        },

        // Confirmar e registrar
        confirmAndRegister: function() {
            const summary = `<strong>Nome:</strong> ${this.state.customerData.nome}<br><strong>CPF:</strong> ${this.state.customerData.cpf}<br><strong>Celular:</strong> ${this.state.customerData.celular}<br><strong>Email:</strong> ${this.state.customerData.email}<br><strong>Nascimento:</strong> ${this.state.customerData.data_nascimento}<br><strong>Cidade:</strong> ${this.state.customerData.cidade}<br><strong>Estado:</strong> ${this.state.customerData.estado}`;
            this.addMessage(`Para finalizar, por favor, confirme os dados:<br><br>${summary}`, 'bot', 'NexiBot', true);
            setTimeout(() => {
                this.addMessage("Os dados estão corretos e você aceita os termos da LGPD do Nexi CRM? (Digite 'sim' ou 'não')", 'bot');
                this.state.currentStep = 'confirm_and_register';
            }, 1000);
        },

        // Buscar CEP
        handleCepInput: async function(cep) {
            const cleanCep = cep.replace(/\D/g, '');
            if (cleanCep.length !== 8) {
                this.addMessage("CEP inválido. Tente novamente ou digite 'manual'.", 'bot');
                return;
            }
            
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                
                if (data.erro) {
                    this.addMessage('Não encontrei este CEP. Por favor, digite sua cidade.', 'bot');
                    this.state.currentStep = 'ask_city';
                } else {
                    this.state.customerData.cidade = data.localidade;
                    this.state.customerData.estado = data.uf;
                    this.addMessage(`Endereço encontrado: ${data.localidade} - ${data.uf}.`, 'bot');
                    this.confirmAndRegister();
                }
            } catch (error) {
                this.addMessage('Tive um problema ao buscar o CEP. Por favor, digite sua cidade.', 'bot');
                this.state.currentStep = 'ask_city';
            }
        },

        // Verificar se cliente existe
        checkCustomerExists: async function(cpf) {
            try {
                const url = `${this.API.CLIENTES}?action=getByCpf&cpf=${cpf}&id_empresa=${this.config.empresaId}`;
                const response = await fetch(url);
                const result = await response.json();
                
                if (result.success) {
                    this.addMessage(`Encontrei seu cadastro, ${result.data.nome}! Um momento enquanto crio seu ticket de suporte.`, 'bot');
                    this.state.customerData = result.data;
                    await this.createSupportChat();
                } else {
                    this.addMessage('Não encontrei seu cadastro. Vamos criar um rapidamente.', 'bot');
                    setTimeout(() => {
                        this.addMessage('Qual seu celular com DDD?', 'bot');
                        this.state.currentStep = 'ask_celular';
                    }, 1000);
                }
            } catch (error) {
                this.addMessage('Tive um problema para verificar seu cadastro. Tente novamente.', 'bot');
            }
        },

        // Registrar cliente
        registerCustomer: async function() {
            try {
                const params = new URLSearchParams({
                    action: 'register',
                    ...this.state.customerData,
                    id_empresa: this.config.empresaId
                });
                const url = `${this.API.CLIENTES}?${params.toString()}`;
                const response = await fetch(url);
                const result = await response.json();
                
                if (result.success) {
                    this.state.customerData.id_usuario = result.data.id_usuario;
                    this.addMessage('Cadastro realizado com sucesso! Agora vou criar seu ticket de suporte.', 'bot');
                    await this.createSupportChat();
                } else {
                    this.addMessage(`Houve um erro ao criar seu cadastro: ${result.message}`, 'bot');
                    this.state.currentStep = 'done';
                }
            } catch (error) {
                this.addMessage('Tive um problema para realizar seu cadastro. Tente novamente.', 'bot');
                this.state.currentStep = 'done';
            }
        },

        // Criar chat de suporte
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const result = await response.json();
                
                if (result.success) {
                    this.state.chatId = result.data.chat_id;
                    const successMessage = `Seu atendimento foi iniciado!<br><br>O ID do seu chat é: <strong style="font-size: 16px; color: ${this.config.accentColor};">${this.state.chatId}</strong><br><br>Guarde este código para retomar a conversa no futuro.`;
                    this.addMessage(successMessage, 'bot', 'NexiBot', true);
                    setTimeout(() => {
                        this.addMessage('Um de nossos atendentes irá se conectar em breve.', 'bot');
                        this.addMessage('Enquanto aguarda, você pode descrever seu problema ou enviar um anexo.', 'bot');
                        this.state.currentStep = 'awaiting_attendant';
                        document.getElementById('nexi-chat-status').textContent = 'Aguardando atendente...';
                        this.startPolling();
                    }, 1500);
                } else {
                    this.addMessage(`Não consegui criar o chat: ${result.message || 'Tente novamente.'}`, 'bot');
                    this.state.currentStep = 'done';
                }
            } catch (error) {
                this.addMessage('Ocorreu um erro de rede ao criar o chat.', 'bot');
                this.state.currentStep = 'done';
            }
        },

        // Retomar chat existente
        resumeChat: async function() {
            const input = document.getElementById('nexi-resume-chat-input');
            const button = document.getElementById('nexi-resume-chat-btn');
            const chatIdToResume = input.value.trim();
            
            if (!chatIdToResume) return;
            
            button.disabled = true;
            button.innerHTML = '<span class="nexi-loading"></span>';
            
            try {
                const chatUrl = `${this.API.CHAT}?action=get_chat&key=${this.API.KEY}&chat_id=${chatIdToResume}`;
                const chatResponse = await fetch(chatUrl);
                const chatResult = await chatResponse.json();
                
                if (!chatResult.success) throw new Error(chatResult.message || 'Chat não encontrado.');
                
                const chatData = chatResult.data;
                this.state.chatId = chatData.chat_id;
                this.state.customerData.id_usuario = chatData.creator_user_id;
                this.state.customerData.email = chatData.creator_email;
                this.state.customerData.nome = chatData.title.replace('Suporte para ', '');
                
                // Carregar mensagens
                const messagesUrl = `${this.API.CHAT}?action=get_messages&key=${this.API.KEY}&chat_id=${chatIdToResume}&page_size=200`;
                const messagesResponse = await fetch(messagesUrl);
                const messagesResult = await messagesResponse.json();
                
                // Limpar mensagens existentes
                document.getElementById('nexi-chat-messages').innerHTML = '';
                
                // Adicionar mensagens carregadas
                if (messagesResult.success && messagesResult.data.messages) {
                    const messages = messagesResult.data.messages.sort((a, b) => 
                        new Date(a.created_at || a[""]) - new Date(b.created_at || b[""])
                    );
                    
                    for (const msg of messages) {
                        await this.normalizeAndDisplayMessage(msg);
                    }
                    
                    if (messages.length > 0) {
                        const lastMsg = messages[messages.length - 1];
                        this.state.lastMessageTimestamp = new Date(lastMsg.created_at || lastMsg[""]).getTime();
                    }
                }
                
                this.state.currentStep = 'awaiting_attendant';
                document.getElementById('nexi-chat-status').textContent = 'Chat retomado';
                this.enableInput();
                this.startPolling();
                
                // Ocultar seção de retomar
                document.getElementById('nexi-resume-section').style.display = 'none';
                
            } catch (error) {
                this.addMessage(`Erro ao retomar chat: ${error.message}`, 'bot');
                input.value = '';
            } finally {
                button.disabled = false;
                button.innerHTML = 'Retomar';
            }
        },

        // Normalizar e exibir mensagem
        normalizeAndDisplayMessage: async function(msg, isNew = false) {
            const normalized = { ...msg };
            
            if (!normalized.sender_name && normalized.sender_user_id) {
                normalized.sender_name = normalized.sender_user_id === this.state.customerData.id_usuario 
                    ? this.state.customerData.nome 
                    : 'Atendente';
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
            
            // Verificar anexos
            const attachmentMatch = content.match(/\*\*attachment_id:([a-zA-Z0-9_-]+)\*\*/);
            const productMatch = content.match(/\*\*product_id:([a-zA-Z0-9_-]+)\*\*/);
            
            if (attachmentMatch) {
                const attachmentId = attachmentMatch[1];
                const attachmentDetails = await this.fetchAttachmentDetails(attachmentId);
                if (attachmentDetails) {
                    content = `<a href="${attachmentDetails.public_url}" target="_blank" style="color: #0066cc; text-decoration: underline;">📎 ${attachmentDetails.file_name}</a>`;
                    isHtmlContent = true;
                }
            } else if (productMatch) {
                const productId = productMatch[1];
                const productDetails = await this.fetchProductDetails(productId);
                if (productDetails) {
                    const price = parseFloat(productDetails.valor).toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                    });
                    content = `
                        <div style="border-top: 1px solid #ddd; padding-top: 8px; margin-top: 8px;">
                            <img src="${productDetails.foto1 || 'https://placehold.co/64x64/eee/ccc?text=Produto'}" 
                                 style="width: 64px; height: 64px; border-radius: 4px; float: left; margin-right: 8px;">
                            <div>
                                <strong>${productDetails.nome}</strong><br>
                                <small style="color: #666;">${(productDetails.descricao || '').substring(0, 50)}...</small><br>
                                <strong style="color: ${this.config.accentColor};">${price}</strong>
                            </div>
                        </div>
                    `;
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

        // Buscar detalhes de anexo
        fetchAttachmentDetails: async function(attachmentId) {
            try {
                const url = `${this.API.CHAT}?action=get_attachment&key=${this.API.KEY}&attachment_id=${attachmentId}`;
                const response = await fetch(url);
                const result = await response.json();
                return result.success ? result.data : null;
            } catch (e) {
                return null;
            }
        },

        // Buscar detalhes de produto
        fetchProductDetails: async function(productId) {
            try {
                const url = `${this.API.PRODUTOS}?action=getByCompany&id_empresa=${this.config.empresaId}`;
                const response = await fetch(url);
                const result = await response.json();
                
                if (result.success && result.data) {
                    return result.data.find(p => p.id_produto === productId);
                }
                return null;
            } catch (e) {
                return null;
            }
        },

        // Buscar detalhes do atendente
        fetchAttendantDetails: async function(attendantId) {
            try {
                const url = `${this.API.USER}?action=get&key=${this.API.KEY}&id=${attendantId}`;
                const response = await fetch(url);
                const result = await response.json();
                return result.success ? result.data : null;
            } catch (e) {
                return null;
            }
        },

        // Enviar mensagem do usuário para o chat
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            } catch (error) {
                this.addMessage('Não foi possível enviar sua mensagem. Verifique sua conexão.', 'bot');
            }
        },

        // Upload de arquivo
        handleFileUpload: async function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            this.disableInput();
            this.addMessage(`Enviando anexo: ${file.name}...`, 'bot');
            
            const sendBtn = document.getElementById('nexi-chat-send-btn');
            const originalContent = sendBtn.innerHTML;
            sendBtn.innerHTML = '<span class="nexi-loading"></span>';
            
            try {
                // Converter arquivo para base64
                const base64String = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = error => reject(error);
                });
                
                // Criar mensagem temporária
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tempMessageBody)
                });
                const tempMsgResult = await tempMsgRes.json();
                
                if (!tempMsgResult.success) throw new Error(tempMsgResult.message);
                
                const messageId = tempMsgResult.data.message_id;
                
                // Upload do anexo
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(attachmentBody)
                });
                const attachmentResult = await attachmentResponse.json();
                
                if (!attachmentResult.success) throw new Error(attachmentResult.message || 'Falha ao enviar o anexo.');
                
                // Enviar mensagem final com ID do anexo
                const finalMessage = `**attachment_id:${attachmentResult.data.attachment_id}**`;
                await this.sendUserMessageToChat(finalMessage);
                
                this.addMessage('Anexo enviado com sucesso!', 'bot');
                
            } catch (error) {
                this.addMessage(`Erro ao enviar o anexo: ${error.message}`, 'bot');
            } finally {
                this.enableInput();
                sendBtn.innerHTML = originalContent;
                event.target.value = '';
            }
        },

        // Polling para novas mensagens
        startPolling: function() {
            if (this.state.pollingInterval) clearInterval(this.state.pollingInterval);
            
            this.state.pollingInterval = setInterval(async () => {
                try {
                    // Verificar status do chat
                    const chatUrl = `${this.API.CHAT}?action=get_chat&key=${this.API.KEY}&chat_id=${this.state.chatId}`;
                    const chatResponse = await fetch(chatUrl);
                    if (!chatResponse.ok) return;
                    
                    const chatResult = await chatResponse.json();
                    
                    if (chatResult.success) {
                        const chatData = chatResult.data;
                        
                        // Verificar se atendente entrou
                        if (chatData.attendant_user_id && !this.state.attendantJoined) {
                            this.state.attendantJoined = true;
                            const attendantDetails = await this.fetchAttendantDetails(chatData.attendant_user_id);
                            const attendantName = attendantDetails ? attendantDetails.nome : (chatData.attendant_email || 'Atendente');
                            
                            document.getElementById('nexi-chat-status').textContent = `Atendido por ${attendantName}`;
                            this.addMessage(`Olá! Meu nome é ${attendantName} e vou te ajudar.`, 'attendant', attendantName);
                        }
                        
                        // Verificar se chat foi fechado
                        const status = chatData.status || chatData.updated_at;
                        if (status === 'fechado' || status === 'cancelado') {
                            clearInterval(this.state.pollingInterval);
                            this.addMessage('Este atendimento foi finalizado e não pode mais receber novas mensagens.', 'bot');
                            this.disableInput();
                            document.getElementById('nexi-chat-status').textContent = 'Chat finalizado';
                            return;
                        }
                    }
                    
                    // Buscar novas mensagens
                    const messagesUrl = `${this.API.CHAT}?action=get_messages&key=${this.API.KEY}&chat_id=${this.state.chatId}&page_size=50`;
                    const messagesResponse = await fetch(messagesUrl);
                    if (!messagesResponse.ok) return;
                    
                    const messagesResult = await messagesResponse.json();
                    
                    if (messagesResult.success && messagesResult.data && messagesResult.data.messages) {
                        const newMessages = messagesResult.data.messages.filter(msg => 
                            new Date(msg.created_at || msg[""]).getTime() > this.state.lastMessageTimestamp
                        );
                        
                        if (newMessages.length > 0) {
                            newMessages.sort((a, b) => 
                                new Date(a.created_at || a[""]) - new Date(b.created_at || b[""])
                            );
                            
                            for (const msg of newMessages) {
                                await this.normalizeAndDisplayMessage(msg, true);
                            }
                        }
                    }
                } catch (error) {
                    // Falha silenciosa no polling
                }
            }, 5000);
        }
    };

    // Expor globalmente
    window.NexiChat = NexiChat;
})();

