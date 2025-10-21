/**
 * Nexi CRM Chat Plugin - Versão 2.0
 * Plugin embeddable para suporte ao cliente
 * 
 * Uso:
 * <script src="https://seu-dominio.com/nexi-crm-plugin.js"></script>
 * <script>
 *   NexiCRM.init({
 *     apiKey: '1526',
 *     apiBaseUrl: 'https://astounding-donut-e0ea90.netlify.app/.netlify/functions/proxy',
 *     empresaId: '123' // Opcional
 *   });
 * </script>
 */

(function(window) {
    'use strict';

    /**
     * CSS Styles para o Plugin
     */
    const PLUGIN_STYLES = `
        .nexi-crm-widget {
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            --primary-blue: #1a2b45;
            --primary-orange: #ff6b35;
            --bg-light: #f0f2f5;
            --bg-dark: #111b21;
            --chat-sent: #d9fdd3;
            --chat-sent-dark: #005c4b;
            --chat-received: #ffffff;
            --chat-received-dark: #202c33;
        }

        .nexi-crm-widget * {
            box-sizing: border-box;
        }

        .nexi-crm-toggle-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: var(--primary-orange);
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            transition: all 0.3s ease;
        }

        .nexi-crm-toggle-btn:hover {
            background-color: #e05a2e;
            transform: scale(1.1);
        }

        .nexi-crm-container {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 400px;
            height: 600px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
            z-index: 9998;
            display: none;
            flex-direction: column;
            overflow: hidden;
            animation: slideUp 0.3s ease-out;
        }

        .nexi-crm-container.active {
            display: flex;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .nexi-crm-header {
            background-color: var(--primary-blue);
            color: white;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .nexi-crm-header-logo {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
        }

        .nexi-crm-header-info {
            flex: 1;
            min-width: 0;
        }

        .nexi-crm-header-title {
            font-weight: 600;
            font-size: 14px;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .nexi-crm-header-status {
            font-size: 12px;
            opacity: 0.8;
            margin: 4px 0 0 0;
        }

        .nexi-crm-header-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 20px;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .nexi-crm-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background-color: var(--bg-light);
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .nexi-crm-message {
            display: flex;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .nexi-crm-message.sent {
            justify-content: flex-end;
        }

        .nexi-crm-message-bubble {
            max-width: 70%;
            padding: 10px 14px;
            border-radius: 12px;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.4;
        }

        .nexi-crm-message.sent .nexi-crm-message-bubble {
            background-color: var(--chat-sent);
            color: #000;
            border-bottom-right-radius: 4px;
        }

        .nexi-crm-message.received .nexi-crm-message-bubble {
            background-color: var(--chat-received);
            color: #000;
            border-bottom-left-radius: 4px;
        }

        .nexi-crm-message.bot .nexi-crm-message-bubble {
            background-color: #e8e8e8;
            color: #000;
        }

        .nexi-crm-typing {
            display: flex;
            gap: 4px;
            padding: 10px 14px;
        }

        .nexi-crm-typing-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #999;
            animation: typing 1.4s infinite;
        }

        .nexi-crm-typing-dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .nexi-crm-typing-dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typing {
            0%, 60%, 100% {
                opacity: 0.5;
                transform: translateY(0);
            }
            30% {
                opacity: 1;
                transform: translateY(-10px);
            }
        }

        .nexi-crm-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 16px;
        }

        .nexi-crm-modal.active {
            display: flex;
        }

        .nexi-crm-modal-content {
            background-color: white;
            border-radius: 12px;
            width: 100%;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
            animation: slideUp 0.3s ease-out;
        }

        .nexi-crm-modal-header {
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
        }

        .nexi-crm-modal-header h2 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: var(--primary-blue);
        }

        .nexi-crm-modal-header p {
            margin: 0;
            font-size: 14px;
            color: #666;
        }

        .nexi-crm-search {
            padding: 16px 20px;
            border-bottom: 1px solid #e0e0e0;
        }

        .nexi-crm-search-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
        }

        .nexi-crm-search-input:focus {
            outline: none;
            border-color: var(--primary-orange);
            box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.1);
        }

        .nexi-crm-companies-list {
            max-height: 300px;
            overflow-y: auto;
        }

        .nexi-crm-company-item {
            padding: 12px 16px;
            border-bottom: 1px solid #f0f0f0;
            cursor: pointer;
            transition: background-color 0.2s;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .nexi-crm-company-item:hover {
            background-color: #f9f9f9;
        }

        .nexi-crm-company-logo {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
        }

        .nexi-crm-company-info {
            flex: 1;
            min-width: 0;
        }

        .nexi-crm-company-name {
            font-weight: 600;
            font-size: 14px;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #333;
        }

        .nexi-crm-company-email {
            font-size: 12px;
            color: #999;
            margin: 4px 0 0 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .nexi-crm-resume-section {
            padding: 16px 20px;
            border-top: 1px solid #e0e0e0;
        }

        .nexi-crm-resume-label {
            font-size: 12px;
            color: #666;
            text-align: center;
            margin-bottom: 12px;
        }

        .nexi-crm-resume-form {
            display: flex;
            gap: 8px;
        }

        .nexi-crm-resume-input {
            flex: 1;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
        }

        .nexi-crm-resume-input:focus {
            outline: none;
            border-color: var(--primary-orange);
            box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.1);
        }

        .nexi-crm-resume-btn {
            padding: 10px 16px;
            background-color: var(--primary-blue);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: background-color 0.2s;
        }

        .nexi-crm-resume-btn:hover {
            background-color: #0f1f35;
        }

        .nexi-crm-resume-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .nexi-crm-input-area {
            padding: 12px 16px;
            background-color: white;
            border-top: 1px solid #e0e0e0;
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }

        .nexi-crm-input-area input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid #ddd;
            border-radius: 20px;
            font-size: 14px;
            font-family: inherit;
        }

        .nexi-crm-input-area input:focus {
            outline: none;
            border-color: var(--primary-orange);
        }

        .nexi-crm-input-area input:disabled {
            background-color: #f5f5f5;
            cursor: not-allowed;
        }

        .nexi-crm-send-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: var(--primary-orange);
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            transition: background-color 0.2s;
            flex-shrink: 0;
        }

        .nexi-crm-send-btn:hover:not(:disabled) {
            background-color: #e05a2e;
        }

        .nexi-crm-send-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .nexi-crm-loader {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .nexi-crm-spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid var(--primary-blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
            .nexi-crm-container {
                width: 100vw;
                height: 100vh;
                bottom: 0;
                right: 0;
                border-radius: 0;
                max-width: 100%;
            }

            .nexi-crm-toggle-btn {
                bottom: 10px;
                right: 10px;
                width: 50px;
                height: 50px;
            }
        }
    `;

    /**
     * Classe Principal do Plugin
     */
    class NexiCRMPlugin {
        constructor(config = {}) {
            this.config = {
                apiKey: config.apiKey || '1526',
                apiBaseUrl: config.apiBaseUrl || 'https://astounding-donut-e0ea90.netlify.app/.netlify/functions/proxy',
                empresaUrl: config.empresaUrl || 'https://script.google.com/macros/s/AKfycbw0HyUQPS_67MmotBUNj3GI-LjweHrc6ALchR7rJt8eSPwGHitxeh5U9LIDQRtXybcZ/exec',
                usuarioUrl: config.usuarioUrl || 'https://script.google.com/macros/s/AKfycbzxJFdRr7kqPAQUllOEN6WjroFGsgqvN25FleCDpHyOxQ3r1n_zBMKFblFNt663CVXj/exec',
                empresaId: config.empresaId || null,
                ...config
            };

            this.state = {
                isOpen: false,
                selectedCompany: null,
                companies: [],
                chatId: null,
                messages: [],
                customerData: {
                    id_usuario: 'anon_' + Date.now(),
                    nome: 'Cliente',
                    email: ''
                },
                attendantJoined: false,
                pollingInterval: null,
                lastMessageTimestamp: 0
            };

            this.elements = {};
            this.init();
        }

        /**
         * Inicializa o plugin
         */
        init() {
            this.injectStyles();
            this.createDOM();
            this.attachEventListeners();
            this.loadStoredData();
            this.checkForAutoInitialization();
        }

        /**
         * Injeta os estilos CSS no documento
         */
        injectStyles() {
            const style = document.createElement('style');
            style.textContent = PLUGIN_STYLES;
            document.head.appendChild(style);
        }

        /**
         * Cria a estrutura DOM do plugin
         */
        createDOM() {
            // Container principal
            const container = document.createElement('div');
            container.className = 'nexi-crm-widget';
            container.id = 'nexi-crm-widget';

            // Botão de toggle
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'nexi-crm-toggle-btn';
            toggleBtn.innerHTML = '💬';
            toggleBtn.id = 'nexi-crm-toggle-btn';

            // Container do chat
            const chatContainer = document.createElement('div');
            chatContainer.className = 'nexi-crm-container';
            chatContainer.id = 'nexi-crm-container';
            chatContainer.innerHTML = `
                <div class="nexi-crm-header">
                    <img id="nexi-crm-header-logo" class="nexi-crm-header-logo" src="https://placehold.co/40x40/ffffff/1a2b45?text=N" alt="Logo">
                    <div class="nexi-crm-header-info">
                        <h3 id="nexi-crm-header-title" class="nexi-crm-header-title">Nexi CRM</h3>
                        <p id="nexi-crm-header-status" class="nexi-crm-header-status">Aguardando...</p>
                    </div>
                    <button id="nexi-crm-header-close" class="nexi-crm-header-close">✕</button>
                </div>
                <div id="nexi-crm-messages" class="nexi-crm-messages"></div>
                <div class="nexi-crm-input-area">
                    <input type="text" id="nexi-crm-message-input" placeholder="Digite sua mensagem..." disabled>
                    <button id="nexi-crm-send-btn" class="nexi-crm-send-btn" disabled>📤</button>
                </div>
            `;

            // Modal de seleção de empresa
            const modal = document.createElement('div');
            modal.className = 'nexi-crm-modal';
            modal.id = 'nexi-crm-modal';
            modal.innerHTML = `
                <div class="nexi-crm-modal-content">
                    <div class="nexi-crm-modal-header">
                        <h2>Bem-vindo ao Suporte</h2>
                        <p>Para qual empresa você precisa de ajuda?</p>
                    </div>
                    <div class="nexi-crm-search">
                        <input type="text" id="nexi-crm-search-input" class="nexi-crm-search-input" placeholder="Pesquisar empresa...">
                    </div>
                    <div id="nexi-crm-companies-list" class="nexi-crm-companies-list"></div>
                    <div class="nexi-crm-resume-section">
                        <p class="nexi-crm-resume-label">Já tem um atendimento?</p>
                        <div class="nexi-crm-resume-form">
                            <input type="text" id="nexi-crm-resume-input" class="nexi-crm-resume-input" placeholder="ID do chat">
                            <button id="nexi-crm-resume-btn" class="nexi-crm-resume-btn">Entrar</button>
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(toggleBtn);
            container.appendChild(chatContainer);
            container.appendChild(modal);
            document.body.appendChild(container);

            // Armazenar referências dos elementos
            this.elements = {
                widget: container,
                toggleBtn,
                chatContainer,
                modal,
                messagesContainer: document.getElementById('nexi-crm-messages'),
                messageInput: document.getElementById('nexi-crm-message-input'),
                sendBtn: document.getElementById('nexi-crm-send-btn'),
                headerClose: document.getElementById('nexi-crm-header-close'),
                headerTitle: document.getElementById('nexi-crm-header-title'),
                headerStatus: document.getElementById('nexi-crm-header-status'),
                headerLogo: document.getElementById('nexi-crm-header-logo'),
                searchInput: document.getElementById('nexi-crm-search-input'),
                companiesList: document.getElementById('nexi-crm-companies-list'),
                resumeInput: document.getElementById('nexi-crm-resume-input'),
                resumeBtn: document.getElementById('nexi-crm-resume-btn')
            };
        }

        /**
         * Anexa event listeners
         */
        attachEventListeners() {
            this.elements.toggleBtn.addEventListener('click', () => this.toggleChat());
            this.elements.headerClose.addEventListener('click', () => this.closeChat());
            this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
            this.elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.elements.sendBtn.disabled) {
                    this.sendMessage();
                }
            });
            this.elements.searchInput.addEventListener('input', (e) => this.filterCompanies(e.target.value));
            this.elements.resumeBtn.addEventListener('click', () => this.resumeChat());
        }

        /**
         * Carrega dados armazenados
         */
        loadStoredData() {
            const storedEmpresaId = localStorage.getItem('nexi_empresa_id');
            const storedChatId = localStorage.getItem('nexi_chat_id');
            const storedCustomerData = localStorage.getItem('nexi_customer_data');

            if (storedCustomerData) {
                this.state.customerData = JSON.parse(storedCustomerData);
            }

            if (storedChatId) {
                this.state.chatId = storedChatId;
            }

            if (storedEmpresaId) {
                this.state.selectedCompany = { empresa_id: storedEmpresaId };
            }
        }

        /**
         * Verifica se deve inicializar automaticamente
         */
        checkForAutoInitialization() {
            const urlParams = new URLSearchParams(window.location.search);
            const empresaIdFromUrl = urlParams.get('id_empresa') || this.config.empresaId;

            if (empresaIdFromUrl) {
                this.loadCompanyAndStartChat(empresaIdFromUrl);
            } else if (this.state.chatId) {
                this.loadChatMessages();
                this.showChatUI();
            } else {
                this.loadCompanies();
                this.showModal();
            }
        }

        /**
         * Carrega a lista de empresas
         */
        async loadCompanies() {
            try {
                const response = await fetch(`${this.config.empresaUrl}?action=getAll&key=${this.config.apiKey}`);
                const result = await response.json();

                if (result.success && Array.isArray(result.data)) {
                    this.state.companies = result.data;
                    this.renderCompanies(result.data);
                }
            } catch (error) {
                console.error('Erro ao carregar empresas:', error);
                this.showError('Erro ao carregar empresas. Tente novamente.');
            }
        }

        /**
         * Renderiza a lista de empresas
         */
        renderCompanies(companies) {
            this.elements.companiesList.innerHTML = '';
            companies.forEach(company => {
                const item = document.createElement('div');
                item.className = 'nexi-crm-company-item';
                item.innerHTML = `
                    <img src="${company.logo || 'https://placehold.co/40x40/ffffff/1a2b45?text=C'}" alt="${company.nome}" class="nexi-crm-company-logo">
                    <div class="nexi-crm-company-info">
                        <p class="nexi-crm-company-name">${company.nome}</p>
                        <p class="nexi-crm-company-email">${company.email || 'Sem email'}</p>
                    </div>
                `;
                item.addEventListener('click', () => this.selectCompany(company));
                this.elements.companiesList.appendChild(item);
            });
        }

        /**
         * Filtra empresas por nome
         */
        filterCompanies(searchTerm) {
            const filtered = this.state.companies.filter(c =>
                c.nome.toLowerCase().includes(searchTerm.toLowerCase())
            );
            this.renderCompanies(filtered);
        }

        /**
         * Seleciona uma empresa e inicia um novo chat
         */
        async selectCompany(company) {
            this.state.selectedCompany = company;
            localStorage.setItem('nexi_empresa_id', company.empresa_id);
            this.hideModal();
            await this.startNewChat(company);
        }

        /**
         * Carrega uma empresa e inicia o chat
         */
        async loadCompanyAndStartChat(empresaId) {
            try {
                const response = await fetch(`${this.config.empresaUrl}?action=getById&id_empresa=${empresaId}&key=${this.config.apiKey}`);
                const result = await response.json();

                if (result.success && result.data) {
                    this.state.selectedCompany = result.data;
                    localStorage.setItem('nexi_empresa_id', empresaId);
                    this.hideModal();
                    await this.startNewChat(result.data);
                } else {
                    this.loadCompanies();
                    this.showModal();
                }
            } catch (error) {
                console.error('Erro ao carregar empresa:', error);
                this.loadCompanies();
                this.showModal();
            }
        }

        /**
         * Inicia um novo chat
         */
        async startNewChat(company) {
            try {
                this.disableInput();
                this.addMessage('Iniciando atendimento...', 'bot');

                const body = {
                    action: 'create_chat',
                    key: this.config.apiKey,
                    empresa_id: company.empresa_id,
                    title: `Suporte para ${company.nome}`,
                    creator_user_id: this.state.customerData.id_usuario,
                    creator_email: this.state.customerData.email || 'cliente@email.com'
                };

                const response = await fetch(this.config.apiBaseUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const result = await response.json();
                if (result.success && result.data.chat_id) {
                    this.state.chatId = result.data.chat_id;
                    localStorage.setItem('nexi_chat_id', this.state.chatId);
                    localStorage.setItem('nexi_customer_data', JSON.stringify(this.state.customerData));

                    this.elements.messagesContainer.innerHTML = '';
                    this.addMessage('Bem-vindo! Como posso ajudá-lo?', 'bot');
                    this.elements.headerTitle.textContent = company.nome;
                    this.elements.headerLogo.src = company.logo || 'https://placehold.co/40x40/ffffff/1a2b45?text=C';
                    this.showChatUI();
                    this.enableInput();
                    this.startPolling();
                } else {
                    this.addMessage('Erro ao iniciar chat. Tente novamente.', 'bot');
                }
            } catch (error) {
                console.error('Erro ao iniciar chat:', error);
                this.addMessage('Erro ao iniciar chat. Verifique sua conexão.', 'bot');
            }
        }

        /**
         * Retoma um chat existente
         */
        async resumeChat() {
            const chatId = this.elements.resumeInput.value.trim();
            if (!chatId) return;

            this.elements.resumeBtn.disabled = true;
            const originalText = this.elements.resumeBtn.textContent;
            this.elements.resumeBtn.textContent = '...';

            try {
                const response = await fetch(`${this.config.apiBaseUrl}?action=get_chat&key=${this.config.apiKey}&chat_id=${chatId}`);
                const result = await response.json();

                if (!result.success) throw new Error(result.message || 'Chat não encontrado');

                const chatData = result.data;
                this.state.chatId = chatData.chat_id;
                this.state.customerData.id_usuario = chatData.creator_user_id;
                this.state.customerData.email = chatData.creator_email;
                this.state.customerData.nome = chatData.title.replace('Suporte para ', '');

                localStorage.setItem('nexi_chat_id', this.state.chatId);
                localStorage.setItem('nexi_customer_data', JSON.stringify(this.state.customerData));

                this.hideModal();
                await this.loadChatMessages();
                this.showChatUI();
                this.enableInput();
                this.startPolling();
            } catch (error) {
                this.elements.resumeInput.placeholder = error.message;
                setTimeout(() => {
                    this.elements.resumeInput.placeholder = 'ID do chat';
                }, 3000);
            } finally {
                this.elements.resumeBtn.disabled = false;
                this.elements.resumeBtn.textContent = originalText;
            }
        }

        /**
         * Carrega mensagens do chat
         */
        async loadChatMessages() {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}?action=get_messages&key=${this.config.apiKey}&chat_id=${this.state.chatId}&page_size=200`);
                const result = await response.json();

                if (result.success && result.data.messages) {
                    this.elements.messagesContainer.innerHTML = '';
                    const messages = result.data.messages.sort((a, b) =>
                        new Date(a.created_at || '') - new Date(b.created_at || '')
                    );

                    messages.forEach(msg => this.displayMessage(msg));

                    if (messages.length > 0) {
                        this.state.lastMessageTimestamp = new Date(messages[messages.length - 1].created_at || '').getTime();
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar mensagens:', error);
            }
        }

        /**
         * Envia uma mensagem
         */
        async sendMessage() {
            const text = this.elements.messageInput.value.trim();
            if (!text) return;

            this.disableInput();
            this.addMessage(text, 'sent');
            this.elements.messageInput.value = '';

            try {
                const body = {
                    action: 'add_message',
                    key: this.config.apiKey,
                    chat_id: this.state.chatId,
                    sender_user_id: this.state.customerData.id_usuario,
                    sender_name: this.state.customerData.nome,
                    message: text
                };

                await fetch(this.config.apiBaseUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                this.enableInput();
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                this.addMessage('Erro ao enviar mensagem. Tente novamente.', 'bot');
                this.enableInput();
            }
        }

        /**
         * Inicia polling para novas mensagens
         */
        startPolling() {
            if (this.state.pollingInterval) clearInterval(this.state.pollingInterval);

            this.state.pollingInterval = setInterval(async () => {
                try {
                    const response = await fetch(`${this.config.apiBaseUrl}?action=get_messages&key=${this.config.apiKey}&chat_id=${this.state.chatId}&page_size=50`);
                    const result = await response.json();

                    if (result.success && result.data.messages) {
                        const newMessages = result.data.messages.filter(msg =>
                            new Date(msg.created_at || '').getTime() > this.state.lastMessageTimestamp
                        );

                        if (newMessages.length > 0) {
                            newMessages.sort((a, b) =>
                                new Date(a.created_at || '') - new Date(b.created_at || '')
                            );
                            newMessages.forEach(msg => this.displayMessage(msg));
                        }
                    }
                } catch (error) {
                    console.error('Erro no polling:', error);
                }
            }, 5000);
        }

        /**
         * Exibe uma mensagem
         */
        displayMessage(msg) {
            const sender = msg.sender_type === 'attendant' ? 'received' : (msg.sender_type === 'user' ? 'sent' : 'bot');
            this.addMessage(msg.message, sender);
            this.state.lastMessageTimestamp = Math.max(
                this.state.lastMessageTimestamp,
                new Date(msg.created_at || '').getTime()
            );
        }

        /**
         * Adiciona uma mensagem ao chat
         */
        addMessage(text, sender = 'bot') {
            const messageDiv = document.createElement('div');
            messageDiv.className = `nexi-crm-message ${sender}`;

            const bubble = document.createElement('div');
            bubble.className = 'nexi-crm-message-bubble';
            bubble.textContent = text;

            messageDiv.appendChild(bubble);
            this.elements.messagesContainer.appendChild(messageDiv);
            this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
        }

        /**
         * Alterna a visibilidade do chat
         */
        toggleChat() {
            if (this.state.isOpen) {
                this.closeChat();
            } else {
                this.openChat();
            }
        }

        /**
         * Abre o chat
         */
        openChat() {
            this.state.isOpen = true;
            this.elements.chatContainer.classList.add('active');
        }

        /**
         * Fecha o chat
         */
        closeChat() {
            this.state.isOpen = false;
            this.elements.chatContainer.classList.remove('active');
        }

        /**
         * Mostra a modal de seleção
         */
        showModal() {
            this.elements.modal.classList.add('active');
        }

        /**
         * Esconde a modal de seleção
         */
        hideModal() {
            this.elements.modal.classList.remove('active');
        }

        /**
         * Mostra a interface de chat
         */
        showChatUI() {
            this.openChat();
        }

        /**
         * Habilita o input
         */
        enableInput() {
            this.elements.messageInput.disabled = false;
            this.elements.sendBtn.disabled = false;
        }

        /**
         * Desabilita o input
         */
        disableInput() {
            this.elements.messageInput.disabled = true;
            this.elements.sendBtn.disabled = true;
        }

        /**
         * Mostra uma mensagem de erro
         */
        showError(message) {
            this.addMessage(message, 'bot');
        }
    }

    /**
     * API Global do Plugin
     */
    window.NexiCRM = {
        instance: null,

        init(config) {
            if (!this.instance) {
                this.instance = new NexiCRMPlugin(config);
            }
            return this.instance;
        },

        open() {
            if (this.instance) this.instance.openChat();
        },

        close() {
            if (this.instance) this.instance.closeChat();
        },

        toggle() {
            if (this.instance) this.instance.toggleChat();
        },

        sendMessage(message) {
            if (this.instance) {
                this.instance.elements.messageInput.value = message;
                this.instance.sendMessage();
            }
        }
    };

})(window);

