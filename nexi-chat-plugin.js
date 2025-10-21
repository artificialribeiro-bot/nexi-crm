/**
 * Nexi Chat Plugin - Web Component
 * 
 * Um Web Component reutilizável que encapsula a funcionalidade do chat Nexi CRM.
 * O ID da empresa pode ser passado como atributo do componente.
 * 
 * Uso:
 * <nexi-chat company-id="123"></nexi-chat>
 * 
 * Ou via JavaScript:
 * const chatElement = document.createElement('nexi-chat');
 * chatElement.setAttribute('company-id', '123');
 * document.body.appendChild(chatElement);
 */

class NexiChatPlugin extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.companyId = null;
    this.selectedCompany = null;
    this.allCompanies = [];
    this.chatState = {
      chatId: null,
      customerData: { id_usuario: 'anon_' + Date.now() },
      currentStep: 'ask_client_name',
      attendantJoined: false,
      pollingInterval: null,
      lastMessageTimestamp: 0,
    };

    // APIs
    this.API_EMPRESA_URL = 'https://script.google.com/macros/s/AKfycbw0HyUQPS_67MmotBUNj3GI-LjweHrc6ALchR7rJt8eSPwGHitxeh5U9LIDQRtXybcZ/exec';
    this.API_CLIENTES_URL = 'https://script.google.com/macros/s/AKfycbwe2m8h2OP0bFpkItF4x5OYRT77Bkhkdvg-EEBEzT_fq59Yz6J8ulcX3iPq9KOjpfcwVg/exec';
    this.API_CHAT_URL = 'https://astounding-donut-e0ea90.netlify.app/.netlify/functions/proxy';
    this.API_USER_URL = 'https://script.google.com/macros/s/AKfycbzxJFdRr7kqPAQUllOEN6WjroFGsgqvN25FleCDpHyOxQ3r1n_zBMKFblFNt663CVXj/exec';
    this.API_PRODUTOS_URL = 'https://script.google.com/macros/s/AKfycbyEFH261J3qybQfBslMZiFQyJh1dJnFtsgswekugKYgkrsV6bxXcMvFu_YGw5K-fS4zLQ/exec';
    this.API_KEY = '1526';
  }

  connectedCallback() {
    // Obter o ID da empresa do atributo
    this.companyId = this.getAttribute('company-id');
    
    // Se nenhum ID foi fornecido, usar um padrão
    if (!this.companyId) {
      console.warn('Aviso: Nenhum company-id foi fornecido. Use <nexi-chat company-id="123"></nexi-chat>');
      this.companyId = 'default';
    }

    // Renderizar o componente
    this.render();
    this.setupEventListeners();
    
    // Se um company-id foi fornecido, inicializar o chat diretamente
    if (this.getAttribute('company-id')) {
      this.initializeChat();
    } else {
      // Caso contrário, carregar a lista de empresas
      this.loadCompanies();
    }
  }

  render() {
    const template = `
      <style>
        :host {
          --primary-blue: #1a2b45;
          --primary-orange: #ff6b35;
          --background-light: #f0f2f5;
          --background-dark: #111b21;
          --chat-bubble-sent: #d9fdd3;
          --chat-bubble-received: #ffffff;
          --chat-bubble-received-dark: #202c33;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .nexi-chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background-color: var(--background-light);
          color: #333;
        }

        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid var(--primary-blue);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loader-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          width: 100%;
        }

        /* Company Selection Modal */
        .company-modal {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 40;
        }

        .company-modal.hidden {
          display: none;
        }

        .modal-content {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 28rem;
        }

        .modal-header {
          padding: 1.5rem;
        }

        .modal-header h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .modal-header p {
          color: #4b5563;
          font-size: 0.875rem;
        }

        .search-container {
          position: relative;
          margin-top: 1rem;
        }

        .search-container input {
          width: 100%;
          padding: 0.5rem 1rem 0.5rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }

        .search-container input:focus {
          outline: none;
          ring: 2px;
          ring-color: var(--primary-orange);
        }

        .company-list {
          max-height: 15rem;
          overflow-y: auto;
          border-top: 1px solid #e5e7eb;
        }

        .company-item {
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .company-item:hover {
          background-color: #f9fafb;
        }

        .company-item.active {
          background-color: #eff6ff;
          border-left: 4px solid var(--primary-orange);
        }

        .company-item-logo {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 0.75rem;
          display: inline-block;
          vertical-align: middle;
        }

        .company-item-name {
          font-weight: 500;
          color: #1f2937;
          display: inline-block;
          vertical-align: middle;
        }

        .resume-chat-section {
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .resume-chat-section p {
          text-align: center;
          color: #4b5563;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .resume-chat-input-group {
          display: flex;
          gap: 0.5rem;
        }

        .resume-chat-input-group input {
          flex: 1;
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }

        .resume-chat-input-group button {
          padding: 0.5rem 1rem;
          background-color: var(--primary-blue);
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .resume-chat-input-group button:hover {
          background-color: #0f1419;
        }

        /* Chat Interface */
        .chat-ui {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
        }

        .chat-ui.hidden {
          display: none;
        }

        .chat-header {
          background-color: var(--primary-blue);
          color: white;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .chat-header-logo {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .chat-header-info {
          margin-left: 0.75rem;
          flex: 1;
          min-width: 0;
        }

        .chat-header-info h2 {
          font-size: 1.125rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-header-info p {
          font-size: 0.75rem;
          color: #d1d5db;
        }

        .messages-container {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
          background-color: var(--background-light);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .message {
          display: flex;
          margin-bottom: 0.5rem;
        }

        .message.sent {
          justify-content: flex-end;
        }

        .message.received {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 70%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          word-wrap: break-word;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .message.sent .message-bubble {
          background-color: var(--chat-bubble-sent);
          color: #1f2937;
          border-bottom-right-radius: 0.25rem;
        }

        .message.received .message-bubble {
          background-color: var(--chat-bubble-received);
          color: #1f2937;
          border-bottom-left-radius: 0.25rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .message-time {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 0.25rem;
          padding: 0 0.5rem;
        }

        .typing-indicator {
          display: flex;
          gap: 0.25rem;
          padding: 0.75rem 1rem;
          background-color: var(--chat-bubble-received);
          border-radius: 0.75rem;
          width: fit-content;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .typing-indicator span {
          width: 0.5rem;
          height: 0.5rem;
          background-color: #9ca3af;
          border-radius: 50%;
          opacity: 0.4;
          animation: bob 1s infinite;
        }

        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bob {
          10% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
          90% { transform: translateY(0); opacity: 0.4; }
        }

        .message-input-area {
          background-color: white;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
          border-top: 1px solid #e5e7eb;
        }

        .message-input-area button {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: color 0.2s;
        }

        .message-input-area button:hover:not(:disabled) {
          color: var(--primary-orange);
        }

        .message-input-area button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message-input-area input {
          flex: 1;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 9999px;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          outline: none;
          transition: ring 0.2s;
        }

        .message-input-area input:focus {
          ring: 2px;
          ring-color: var(--primary-orange);
        }

        .message-input-area input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .send-button {
          background-color: var(--primary-orange);
          color: white;
          border: none;
          border-radius: 50%;
          padding: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
          flex-shrink: 0;
        }

        .send-button:hover:not(:disabled) {
          background-color: #ff5722;
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 0.5rem;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 0.25rem;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      </style>

      <div class="nexi-chat-container">
        <!-- Loading state -->
        <div class="loader-container" id="loader">
          <div class="loader"></div>
        </div>

        <!-- Company Selection Modal -->
        <div class="company-modal" id="companyModal">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Bem-vindo ao Suporte</h3>
              <p>Para qual empresa você precisa de ajuda?</p>
              <div class="search-container">
                <input type="text" id="companySearchInput" placeholder="Pesquisar empresa..." />
              </div>
            </div>
            <div class="company-list" id="companyList">
              <!-- Companies will be populated here -->
            </div>
            <div class="resume-chat-section">
              <p>Já tem um atendimento?</p>
              <div class="resume-chat-input-group">
                <input type="text" id="resumeChatInput" placeholder="Insira o ID do seu chat" />
                <button id="resumeChatButton">Entrar</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Interface -->
        <div class="chat-ui hidden" id="chatUI">
          <header class="chat-header">
            <img id="companyLogo" src="https://placehold.co/40x40/ffffff/1a2b45?text=N" alt="Logo da Empresa" class="chat-header-logo">
            <div class="chat-header-info">
              <h2 id="companyName">Nome da Empresa</h2>
              <p id="chatStatus">Aguardando atendimento...</p>
            </div>
          </header>

          <main class="messages-container" id="messagesContainer">
            <!-- Messages will be injected here -->
          </main>

          <footer class="message-input-area">
            <button id="attachFileButton" disabled>📎</button>
            <input type="file" id="fileInput" style="display: none;" />
            <input type="text" id="messageInput" placeholder="Digite sua mensagem..." disabled />
            <button id="sendButton" class="send-button" disabled>📤</button>
          </footer>
        </div>
      </div>
    `;

    this.shadowRoot.innerHTML = template;
  }

  setupEventListeners() {
    const companySearchInput = this.shadowRoot.getElementById('companySearchInput');
    const companyList = this.shadowRoot.getElementById('companyList');
    const resumeChatInput = this.shadowRoot.getElementById('resumeChatInput');
    const resumeChatButton = this.shadowRoot.getElementById('resumeChatButton');
    const messageInput = this.shadowRoot.getElementById('messageInput');
    const sendButton = this.shadowRoot.getElementById('sendButton');
    const attachFileButton = this.shadowRoot.getElementById('attachFileButton');
    const fileInput = this.shadowRoot.getElementById('fileInput');

    // Company search
    if (companySearchInput) {
      companySearchInput.addEventListener('input', (e) => {
        this.filterCompanies(e.target.value);
      });
    }

    // Company selection
    if (companyList) {
      companyList.addEventListener('click', (e) => {
        const companyItem = e.target.closest('.company-item');
        if (companyItem) {
          const companyId = companyItem.getAttribute('data-company-id');
          this.selectCompany(companyId);
        }
      });
    }

    // Resume chat
    if (resumeChatButton) {
      resumeChatButton.addEventListener('click', () => {
        const chatId = resumeChatInput.value.trim();
        if (chatId) {
          this.resumeChat(chatId);
        }
      });
    }

    // Message sending
    if (sendButton) {
      sendButton.addEventListener('click', () => {
        this.sendMessage();
      });
    }

    if (messageInput) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // File attachment
    if (attachFileButton) {
      attachFileButton.addEventListener('click', () => {
        fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileUpload(e.target.files[0]);
      });
    }
  }

  loadCompanies() {
    const loader = this.shadowRoot.getElementById('loader');
    loader.style.display = 'flex';

    fetch(this.API_EMPRESA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getEmpresas', apiKey: this.API_KEY })
    })
      .then(res => res.json())
      .then(data => {
        this.allCompanies = data.empresas || [];
        this.renderCompanyList(this.allCompanies);
        loader.style.display = 'none';
      })
      .catch(err => {
        console.error('Erro ao carregar empresas:', err);
        loader.style.display = 'none';
      });
  }

  renderCompanyList(companies) {
    const companyList = this.shadowRoot.getElementById('companyList');
    companyList.innerHTML = '';

    companies.forEach(company => {
      const item = document.createElement('div');
      item.className = 'company-item';
      item.setAttribute('data-company-id', company.id);
      item.innerHTML = `
        <img src="${company.logo || 'https://placehold.co/40x40/ffffff/1a2b45?text=N'}" alt="${company.nome}" class="company-item-logo">
        <span class="company-item-name">${company.nome}</span>
      `;
      companyList.appendChild(item);
    });
  }

  filterCompanies(searchTerm) {
    const filtered = this.allCompanies.filter(company =>
      company.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
    this.renderCompanyList(filtered);
  }

  selectCompany(companyId) {
    const company = this.allCompanies.find(c => c.id === companyId);
    if (company) {
      this.selectedCompany = company;
      this.initializeChat();
    }
  }

  initializeChat() {
    const companyModal = this.shadowRoot.getElementById('companyModal');
    const chatUI = this.shadowRoot.getElementById('chatUI');
    const loader = this.shadowRoot.getElementById('loader');

    companyModal.classList.add('hidden');
    chatUI.classList.remove('hidden');
    loader.style.display = 'none';

    // Update header with company info
    const companyLogo = this.shadowRoot.getElementById('companyLogo');
    const companyName = this.shadowRoot.getElementById('companyName');

    if (this.selectedCompany) {
      companyLogo.src = this.selectedCompany.logo || 'https://placehold.co/40x40/ffffff/1a2b45?text=N';
      companyName.textContent = this.selectedCompany.nome;
    } else {
      companyName.textContent = `Empresa ${this.companyId}`;
    }

    // Enable message input
    const messageInput = this.shadowRoot.getElementById('messageInput');
    const sendButton = this.shadowRoot.getElementById('sendButton');
    const attachFileButton = this.shadowRoot.getElementById('attachFileButton');

    messageInput.disabled = false;
    sendButton.disabled = false;
    attachFileButton.disabled = false;

    // Add initial bot message
    this.addMessage('Olá! Como posso ajudá-lo?', 'bot');

    // Start polling for new messages
    this.startPolling();
  }

  addMessage(text, sender = 'bot', timestamp = null) {
    const messagesContainer = this.shadowRoot.getElementById('messagesContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'user' ? 'sent' : 'received'}`;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    bubbleDiv.textContent = text;

    messageDiv.appendChild(bubbleDiv);

    if (timestamp) {
      const timeDiv = document.createElement('div');
      timeDiv.className = 'message-time';
      timeDiv.textContent = new Date(timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      messageDiv.appendChild(timeDiv);
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  sendMessage() {
    const messageInput = this.shadowRoot.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    // Add user message to UI
    this.addMessage(message, 'user');
    messageInput.value = '';

    // Send to API
    fetch(this.API_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendMessage',
        chatId: this.chatState.chatId,
        message: message,
        userId: this.chatState.customerData.id_usuario,
        companyId: this.companyId,
        apiKey: this.API_KEY
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log('Mensagem enviada:', data);
      })
      .catch(err => {
        console.error('Erro ao enviar mensagem:', err);
        this.addMessage('Erro ao enviar mensagem. Tente novamente.', 'bot');
      });
  }

  handleFileUpload(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = e.target.result;
      this.addMessage(`📎 Arquivo enviado: ${file.name}`, 'user');

      // Send file to API
      fetch(this.API_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendFile',
          chatId: this.chatState.chatId,
          fileName: file.name,
          fileData: fileData,
          userId: this.chatState.customerData.id_usuario,
          companyId: this.companyId,
          apiKey: this.API_KEY
        })
      })
        .catch(err => console.error('Erro ao enviar arquivo:', err));
    };
    reader.readAsDataURL(file);
  }

  resumeChat(chatId) {
    this.chatState.chatId = chatId;
    this.initializeChat();
  }

  startPolling() {
    // Poll for new messages every 2 seconds
    this.chatState.pollingInterval = setInterval(() => {
      this.pollMessages();
    }, 2000);
  }

  pollMessages() {
    fetch(this.API_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getMessages',
        chatId: this.chatState.chatId,
        userId: this.chatState.customerData.id_usuario,
        companyId: this.companyId,
        apiKey: this.API_KEY,
        lastTimestamp: this.chatState.lastMessageTimestamp
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach(msg => {
            if (msg.timestamp > this.chatState.lastMessageTimestamp) {
              this.addMessage(msg.text, msg.sender === 'user' ? 'user' : 'bot', msg.timestamp);
              this.chatState.lastMessageTimestamp = msg.timestamp;
            }
          });
        }
      })
      .catch(err => console.error('Erro ao buscar mensagens:', err));
  }

  disconnectedCallback() {
    // Clean up polling interval
    if (this.chatState.pollingInterval) {
      clearInterval(this.chatState.pollingInterval);
    }
  }
}

// Register the custom element
customElements.define('nexi-chat', NexiChatPlugin);

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NexiChatPlugin;
}

