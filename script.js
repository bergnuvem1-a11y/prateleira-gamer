// ========================================
// PRATELEIRA GAMER - Estante Neon Edition
// ========================================

(function () {
    'use strict';

    const STORAGE_KEY = 'prateleiraGamer_jogos';
    const JOGOS_POR_PRATELEIRA = 8;
    const API_BASE_URL = 'https://api.rawg.io/api';

    const PLATAFORMAS = {
        'PlayStation 5': { cor: '#003791', label: 'PS5', fundo: '#003791' },
        'PlayStation 4': { cor: '#003791', label: 'PS4', fundo: '#003791' },
        'PlayStation 3': { cor: '#003791', label: 'PS3', fundo: '#003791' },
        'Xbox Series X': { cor: '#107c10', label: 'XBOX', fundo: '#107c10' },
        'Xbox One': { cor: '#107c10', label: 'XBOX ONE', fundo: '#107c10' },
        'Xbox 360': { cor: '#107c10', label: 'XBOX 360', fundo: '#52b043' },
        'Nintendo Switch': { cor: '#e4000f', label: 'SWITCH', fundo: '#e4000f' },
        'PC': { cor: '#1b2838', label: 'PC', fundo: '#1b2838' },
    };

    const PLATAFORMA_PADRAO = { cor: '#333', label: 'GAME', fundo: '#222' };

    let colecao = [];
    let ordenacaoAtual = 'adicionado';
    let abaAtiva = 'buscar'; // 'buscar' ou 'colecao'

    // ========================================
    // INICIALIZAÇÃO
    // ========================================

    function init() {
        if (typeof CONFIG === 'undefined' || !CONFIG.RAWG_API_KEY) {
            mostrarToast('Configure sua chave da API RAWG no arquivo config.js');
            return;
        }
        carregarColecao();
        renderizarPrateleiras();
        registrarEventos();
        
        // Expor referência global da coleção para drive-sync.js
        window.colecao = colecao;
    }

    function registrarEventos() {
        document.getElementById('btnBuscar').addEventListener('click', realizarBusca);
        document.getElementById('inputBusca').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') realizarBusca();
        });
        
        // Atualizar placeholder ao digitar
        document.getElementById('inputBusca').addEventListener('input', () => {
            if (abaAtiva === 'colecao') realizarBusca();
        });
        
        document.getElementById('btnExportar').addEventListener('click', exportarColecao);
        document.getElementById('inputImportar').addEventListener('change', importarColecao);
        document.getElementById('btnLimpar').addEventListener('click', limparColecao);
        document.getElementById('selectOrdenacao').addEventListener('change', (e) => {
            ordenacaoAtual = e.target.value;
            renderizarPrateleiras();
        });

        // Botão Custom
        document.getElementById('btnAddCustom').addEventListener('click', abrirModalCustom);

        // Abas do buscador
        document.querySelectorAll('.search-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const novaAba = tab.dataset.tab;
                alternarAba(novaAba);
            });
        });

        // Preview da imagem ao selecionar
        document.getElementById('customCapa').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('previewCapaImg').src = e.target.result;
                    document.getElementById('previewCapa').style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        // Fechar modal ao clicar fora
        document.getElementById('modalCustom').addEventListener('click', (e) => {
            if (e.target.id === 'modalCustom') {
                fecharModalCustom();
            }
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('resultadosBusca');
            const input = document.getElementById('inputBusca');
            if (!dropdown.contains(e.target) && e.target !== input) {
                dropdown.classList.remove('show');
            }
        });
    }
    
    function alternarAba(aba) {
        abaAtiva = aba;
        
        // Atualizar classes das abas
        document.querySelectorAll('.search-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === aba);
        });
        
        // Atualizar placeholder
        const input = document.getElementById('inputBusca');
        const btnBuscar = document.getElementById('btnBuscar');
        
        if (aba === 'buscar') {
            input.placeholder = 'Digite o nome do jogo...';
            btnBuscar.textContent = '🔍';
        } else {
            input.placeholder = 'Filtrar na sua coleção...';
            btnBuscar.textContent = '🔍';
        }
        
        // Limpar busca anterior
        input.value = '';
        document.getElementById('resultadosBusca').classList.remove('show');
    }

    // ========================================
    // COLEÇÃO
    // ========================================

    function carregarColecao() {
        try {
            const dados = localStorage.getItem(STORAGE_KEY);
            colecao = dados ? JSON.parse(dados) : [];
            atualizarContador();
            // Atualizar referência global
            window.colecao = colecao;
        } catch (erro) {
            console.error('Erro ao carregar coleção:', erro);
            colecao = [];
            window.colecao = colecao;
        }
    }

    function salvarColecao() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(colecao));
            atualizarContador();
            // Atualizar referência global
            window.colecao = colecao;
        } catch (erro) {
            console.error('Erro ao salvar coleção:', erro);
        }
    }

    function atualizarContador() {
        const contador = document.getElementById('contadorJogos');
        if (contador) {
            contador.textContent = `${colecao.length} ${colecao.length === 1 ? 'jogo' : 'jogos'}`;
        }
    }

    function adicionarJogo(jogo) {
        if (colecao.some(j => j.id === jogo.id)) {
            mostrarToast('Este jogo já está na sua coleção');
            return;
        }
        colecao.push(jogo);
        salvarColecao();
        renderizarPrateleiras();
        mostrarToast(`${jogo.nome} adicionado!`);
    }

    function removerJogo(id) {
        const jogo = colecao.find(j => j.id === id);
        if (!jogo) return;
        if (confirm(`Deseja remover "${jogo.nome}"?`)) {
            colecao = colecao.filter(j => j.id !== id);
            salvarColecao();
            renderizarPrateleiras();
            mostrarToast('Jogo removido');
        }
    }

    function limparColecao() {
        if (colecao.length === 0) {
            mostrarToast('Coleção já está vazia');
            return;
        }
        if (confirm(`Remover todos os ${colecao.length} jogos?`)) {
            colecao = [];
            salvarColecao();
            renderizarPrateleiras();
            mostrarToast('Coleção limpa');
        }
    }

    function ordenarColecao() {
        const copia = [...colecao];
        switch (ordenacaoAtual) {
            case 'nome': copia.sort((a, b) => a.nome.localeCompare(b.nome)); break;
            case 'ano-desc': copia.sort((a, b) => (b.ano || 0) - (a.ano || 0)); break;
            case 'ano-asc': copia.sort((a, b) => (a.ano || 0) - (b.ano || 0)); break;
            case 'console': copia.sort((a, b) => {
                const plataformaA = a.plataformaLabel || 'ZZZ';
                const plataformaB = b.plataformaLabel || 'ZZZ';
                return plataformaA.localeCompare(plataformaB);
            }); break;
            case 'zerados': 
                // Zerados primeiro, depois por ordem alfabética
                copia.sort((a, b) => {
                    if (a.zerado && !b.zerado) return -1;
                    if (!a.zerado && b.zerado) return 1;
                    return a.nome.localeCompare(b.nome);
                }); 
                break;
        }
        return copia;
    }

    // ========================================
    // BUSCA
    // ========================================

    async function realizarBusca() {
        const query = document.getElementById('inputBusca').value.trim();
        
        if (!query) {
            document.getElementById('resultadosBusca').classList.remove('show');
            return;
        }

        if (abaAtiva === 'colecao') {
            // Buscar na coleção local
            buscarNaColecao(query);
        } else {
            // Buscar na API RAWG
            buscarNaAPI(query);
        }
    }
    
    function buscarNaColecao(query) {
        const termo = query.toLowerCase();
        const resultados = colecao.filter(jogo => 
            jogo.nome.toLowerCase().includes(termo) ||
            (jogo.genero && jogo.genero.toLowerCase().includes(termo)) ||
            (jogo.plataformaLabel && jogo.plataformaLabel.toLowerCase().includes(termo))
        );
        
        exibirResultadosColecao(resultados, query);
    }
    
    function exibirResultadosColecao(resultados, query) {
        const dropdown = document.getElementById('resultadosBusca');
        dropdown.innerHTML = '';
        
        if (resultados.length === 0) {
            dropdown.innerHTML = `<div class="search-result"><p style="color: rgba(255,255,255,0.5); text-align: center;">Nenhum jogo encontrado para "${query}"</p></div>`;
            dropdown.classList.add('show');
            return;
        }
        
        dropdown.classList.add('show');
        
        resultados.forEach(jogo => {
            const item = document.createElement('div');
            item.className = 'search-result';
            item.style.cursor = 'pointer';
            item.innerHTML = `
                <img src="${jogo.capa || ''}" onerror="this.style.display='none'">
                <div class="search-result-info">
                    <div class="search-result-title">${sanitizar(jogo.nome)}</div>
                    <div class="search-result-meta">${jogo.plataformaLabel || 'N/A'} • ${jogo.ano || 'N/A'}</div>
                </div>
                <button class="btn-add" style="background: transparent; color: #4285f4; border: 1px solid #4285f4;">📍</button>
            `;
            
            // Clicar para rolar até o jogo e abrir
            item.addEventListener('click', () => {
                dropdown.classList.remove('show');
                localizarEAbrirJogo(jogo.id);
            });
            
            dropdown.appendChild(item);
        });
    }
    
    function localizarEAbrirJogo(jogoId) {
        // Encontrar a caixa do jogo no DOM
        const shelfUnit = document.getElementById('shelfUnit');
        const slots = Array.from(shelfUnit.querySelectorAll('.slot'));
        
        const slotDoJogo = slots.find(slot => {
            const btnRemove = slot.querySelector('.btn-remove');
            return btnRemove && btnRemove.dataset.id == jogoId;
        });
        
        if (!slotDoJogo) {
            mostrarToast('Jogo não encontrado na prateleira');
            return;
        }
        
        // Scroll suave até o jogo
        slotDoJogo.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
        });
        
        // Destacar temporariamente
        slotDoJogo.style.transform = 'scale(1.05)';
        slotDoJogo.style.transition = 'transform 0.3s ease';
        
        // Abrir o DVD após 600ms (tempo do scroll)
        setTimeout(() => {
            const caixaEl = slotDoJogo.querySelector('.case3d');
            if (caixaEl && !caixaEl.classList.contains('is-open')) {
                caixaEl.classList.add('is-open');
            }
            
            // Remover destaque após 1s
            setTimeout(() => {
                slotDoJogo.style.transform = '';
            }, 1000);
        }, 600);
        
        mostrarToast('📍 Localizado!');
    }

    async function buscarNaAPI(query) {
        try {
            mostrarLoading(true);
            const url = `${API_BASE_URL}/games?search=${encodeURIComponent(query)}&key=${CONFIG.RAWG_API_KEY}&page_size=10`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Erro na busca');
            const dados = await resposta.json();
            mostrarLoading(false);

            if (!dados.results || dados.results.length === 0) {
                mostrarToast('Nenhum jogo encontrado');
                return;
            }
            exibirResultados(dados.results);
        } catch (erro) {
            console.error('Erro ao buscar:', erro);
            mostrarToast('Erro ao buscar jogos');
            mostrarLoading(false);
        }
    }

    function exibirResultados(resultados) {
        const dropdown = document.getElementById('resultadosBusca');
        dropdown.innerHTML = '';
        dropdown.classList.add('show');

        resultados.forEach(resultado => {
            const jaAdicionado = colecao.some(j => j.id === resultado.id);
            const item = document.createElement('div');
            item.className = 'search-result';
            item.innerHTML = `
                <img src="${resultado.background_image || ''}" onerror="this.style.display='none'">
                <div class="search-result-info">
                    <div class="search-result-title">${sanitizar(resultado.name)}</div>
                    <div class="search-result-meta">${resultado.released ? new Date(resultado.released).getFullYear() : 'N/A'}</div>
                </div>
                <button class="btn-add" ${jaAdicionado ? 'disabled' : ''}>
                    ${jaAdicionado ? '✓' : '+'}
                </button>
            `;

            if (!jaAdicionado) {
                item.querySelector('.btn-add').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await confirmarAdicao(resultado);
                    dropdown.classList.remove('show');
                });
            }

            dropdown.appendChild(item);
        });
    }

    async function confirmarAdicao(resultado) {
        try {
            mostrarLoading(true);
            const det = await buscarDetalhes(resultado.id);
            mostrarLoading(false);

            const plataformas = (det.platforms || []).map(p => p.platform.name);
            const plataformaInfo = resolverPlataforma(plataformas);

            adicionarJogo({
                id: resultado.id,
                nome: resultado.name,
                capa: resultado.background_image || '',
                ano: resultado.released ? new Date(resultado.released).getFullYear() : null,
                genero: resultado.genres?.[0]?.name || '',
                rating: det.rating || null,
                developer: det.developers?.[0]?.name || '',
                publisher: det.publishers?.[0]?.name || '',
                descricao: det.description_raw ? det.description_raw.substring(0, 200) : '',
                cor: plataformaInfo.fundo,
                plataformas,
                plataformaLabel: plataformaInfo.label,
            });
        } catch (erro) {
            console.error('Erro ao buscar detalhes:', erro);
            mostrarLoading(false);
            // Adiciona mesmo sem detalhes
            const plataformaInfo = PLATAFORMA_PADRAO;
            adicionarJogo({
                id: resultado.id,
                nome: resultado.name,
                capa: resultado.background_image || '',
                ano: resultado.released ? new Date(resultado.released).getFullYear() : null,
                genero: resultado.genres?.[0]?.name || '',
                cor: plataformaInfo.fundo,
                plataformas: [],
                plataformaLabel: plataformaInfo.label,
            });
        }
    }

    async function buscarDetalhes(id) {
        const url = `${API_BASE_URL}/games/${id}?key=${CONFIG.RAWG_API_KEY}`;
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error('Erro ao buscar detalhes');
        return resposta.json();
    }

    function resolverPlataforma(plataformas) {
        if (!plataformas || plataformas.length === 0) return PLATAFORMA_PADRAO;
        for (const plat of plataformas) {
            if (PLATAFORMAS[plat]) return PLATAFORMAS[plat];
        }
        return PLATAFORMA_PADRAO;
    }

    // ========================================
    // RENDERIZAÇÃO
    // ========================================

    function renderizarPrateleiras() {
        const shelfUnit = document.getElementById('shelfUnit');
        if (!shelfUnit) return;

        if (colecao.length === 0) {
            shelfUnit.innerHTML = `
                <div class="divider"><div class="neon"></div></div>
                <div class="row">
                    <div class="tint"></div>
                    <div class="empty-state">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                        <p>Nenhum jogo adicionado</p>
                    </div>
                </div>
                <div class="divider"><div class="neon"></div></div>
                <div class="floor"></div>
            `;
            return;
        }

        const lista = ordenarColecao();
        let html = '<div class="divider"><div class="neon"></div></div>';

        for (let i = 0; i < lista.length; i += JOGOS_POR_PRATELEIRA) {
            const rowItems = lista.slice(i, i + JOGOS_POR_PRATELEIRA);
            html += '<div class="row"><div class="tint"></div>';
            rowItems.forEach(jogo => {
                html += criarCaixaHTML(jogo);
            });
            html += '</div>';
            html += '<div class="divider"><div class="neon"></div></div>';
        }

        html += '<div class="floor"></div>';
        shelfUnit.innerHTML = html;

        // Adicionar eventos de clique
        shelfUnit.querySelectorAll('.case3d').forEach(caseEl => {
            caseEl.addEventListener('click', () => {
                caseEl.classList.toggle('is-open');
            });
        });

        // Adicionar eventos de remover
        shelfUnit.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id; // Não converter para int - pode ser string (custom_xxx)
                removerJogo(id);
            });
        });
        
        // Adicionar eventos de botão zerado
        shelfUnit.querySelectorAll('.btn-zerado').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const jogo = colecao.find(j => j.id == id);
                if (jogo) {
                    toggleZerado(id, !jogo.zerado);
                }
            });
        });
    }
    
    function toggleZerado(jogoId, zerado) {
        const jogo = colecao.find(j => j.id == jogoId);
        if (!jogo) return;
        
        jogo.zerado = zerado;
        salvarColecao();
        renderizarPrateleiras();
        
        if (zerado) {
            mostrarToast(`🎉 ${jogo.nome} marcado como zerado!`);
        } else {
            mostrarToast(`${jogo.nome} desmarcado`);
        }
    }

    function criarCaixaHTML(jogo) {
        const artStyle = jogo.cor || '#333';
        const artDark = escurecerCor(artStyle);
        const spineArt = `linear-gradient(180deg, ${artStyle}, ${artDark})`;
        
        // Determinar qual template usar baseado na plataforma
        const templateMap = {
            'PS5': 'mockup-ps5-transparente.png',
            'PS4': 'mockup-ps4-transparente.png',
            'PS3': 'mockup-ps3-transparente.png',
            'PS2': 'mockup-ps2-transparente.png',
            'XBOX': 'mockup-pc-transparente.png',
            'XBOX ONE': 'mockup-pc-transparente.png',
            'XBOX 360': 'mockup-pc-transparente.png',
            'SWITCH': 'mockup-switch-transparente.png',
            'PC': 'mockup-pc-transparente.png',
        };
        
        const templateFile = templateMap[jogo.plataformaLabel] || 'mockup-pc-transparente.png';

        // --- Conquistas Steam ---
        const c = jogo.conquistas;
        const temConquistas = c && c.total > 0;

        // Badge visível na frente da caixa (canto inferior direito da capa)
        const badgeHTML = temConquistas ? `
            <div class="achievement-badge" title="${c.desbloqueadas} de ${c.total} conquistas (${c.percentual}%)">
                <span class="ach-icon">🏆</span>
                <span class="ach-count">${c.desbloqueadas}/${c.total}</span>
            </div>` : '';
        
        // Badge ZERADO (canto superior esquerdo)
        const zeradoBadgeHTML = jogo.zerado ? `
            <div class="zerado-badge">
                <span>✓</span>
                <span>ZERADO</span>
            </div>` : '';

        // Barra de progresso para o verso
        const progressHTML = temConquistas ? `
            <div class="ach-section">
                <p class="info-item">
                    <span class="info-label">🏆 Conquistas:</span>${c.desbloqueadas}/${c.total} (${c.percentual}%)
                </p>
                <div class="ach-bar-wrap">
                    <div class="ach-bar-fill" style="width:${c.percentual}%"></div>
                </div>
            </div>` : '';
        
        return `
            <div class="slot">
                <button class="btn-remove" data-id="${jogo.id}">×</button>
                <button class="btn-zerado ${jogo.zerado ? 'zerado' : ''}" data-id="${jogo.id}" title="${jogo.zerado ? 'Jogo zerado' : 'Marcar como zerado'}">✓</button>
                <div class="case3d" style="--art:${artStyle}; --art-dark:${artDark}; --spine-art:${spineArt}; --edge-art:${artStyle}; --back-art:${artDark}; --template:url('${templateFile}');">
                    <div class="tray">
                        <div class="tray-back">
                            <div class="disc"></div>
                        </div>
                        <div class="tray-spine"></div>
                        <div class="tray-top"></div>
                        <div class="tray-bottom"></div>
                    </div>
                    <div class="lid">
                        <div class="lid-face">
                            ${jogo.capa ? `<div class="game-cover"><img src="${jogo.capa}" alt="${sanitizar(jogo.nome)}"></div>` : ''}
                            <div class="case-template"></div>
                            ${zeradoBadgeHTML}
                            ${badgeHTML}
                        </div>
                        <div class="lid-back">
                            <div class="game-info">
                                ${jogo.ano ? `<p class="info-item"><span class="info-label">Ano:</span>${jogo.ano}</p>` : ''}
                                ${jogo.plataformaLabel ? `<p class="info-item"><span class="info-label">Plataforma:</span>${jogo.plataformaLabel}</p>` : ''}
                                ${jogo.genero ? `<p class="info-item"><span class="info-label">Gênero:</span>${jogo.genero}</p>` : ''}
                                ${jogo.rating ? `<p class="info-item"><span class="info-label">Nota:</span>${jogo.rating}/5 ⭐</p>` : ''}
                                ${jogo.developer ? `<p class="info-item"><span class="info-label">Dev:</span>${jogo.developer}</p>` : ''}
                                ${jogo.publisher ? `<p class="info-item"><span class="info-label">Publisher:</span>${jogo.publisher}</p>` : ''}
                                ${jogo.tempoJogado ? `<p class="info-item"><span class="info-label">⏱️  Tempo Jogado:</span>${jogo.tempoJogado}</p>` : ''}
                                ${jogo.lastSaveUpdate ? `<p class="info-item"><span class="info-label">💾 Último Save:</span>${jogo.lastSaveUpdate}</p>` : ''}
                                ${progressHTML}
                                ${jogo.descricao ? `<p class="info-description">${jogo.descricao}</p>` : ''}
                            </div>
                        </div>
                        <div class="lid-edge"></div>
                    </div>
                </div>
                <div class="meta">
                    <p class="game-title">${sanitizar(jogo.nome)}</p>
                    ${jogo.driveFolderUrl ? `<button class="btn-drive-mini" onclick="window.abrirDriveSave('${jogo.driveFolderUrl}'); event.stopPropagation();" title="Acessar saves no Google Drive">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                        </svg>
                    </button>` : ''}
                </div>
            </div>
        `;
    }

    // ========================================
    // EXPORTAR / IMPORTAR
    // ========================================

    function exportarColecao() {
        if (colecao.length === 0) {
            mostrarToast('Nenhum jogo para exportar');
            return;
        }
        const json = JSON.stringify(colecao, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prateleira-gamer-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        mostrarToast('Coleção exportada');
    }

    function importarColecao(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const dados = JSON.parse(event.target.result);
                if (!Array.isArray(dados)) {
                    mostrarToast('Arquivo inválido');
                    return;
                }
                // Mescla sem duplicar
                dados.forEach(jogo => {
                    if (!colecao.some(j => j.id === jogo.id)) {
                        colecao.push(jogo);
                    }
                });
                salvarColecao();
                renderizarPrateleiras();
                mostrarToast(`${dados.length} jogos importados`);
            } catch (erro) {
                console.error('Erro ao importar:', erro);
                mostrarToast('Erro ao importar arquivo');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Limpa o input
    }

    // ========================================
    // UTILITÁRIOS
    // ========================================

    function mostrarLoading(show) {
        const modal = document.getElementById('modalLoading');
        if (modal) {
            modal.classList.toggle('show', show);
        }
    }

    function mostrarToast(mensagem) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = mensagem;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function sanitizar(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    function escurecerCor(cor) {
        // Pega a cor e escurece 30%
        if (cor.startsWith('#')) {
            const r = parseInt(cor.substr(1, 2), 16);
            const g = parseInt(cor.substr(3, 2), 16);
            const b = parseInt(cor.substr(5, 2), 16);
            const nr = Math.floor(r * 0.7);
            const ng = Math.floor(g * 0.7);
            const nb = Math.floor(b * 0.7);
            return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
        }
        return cor;
    }

    // ========================================
    // JOGO CUSTOMIZADO
    // ========================================

    function abrirModalCustom() {
        document.getElementById('modalCustom').style.display = 'flex';
        document.getElementById('customNome').value = '';
        document.getElementById('customCapa').value = '';
        document.getElementById('customAno').value = '';
        document.getElementById('customPlataforma').value = 'PS5';
        document.getElementById('customDriveUrl').value = '';
        document.getElementById('previewCapa').style.display = 'none';
    }

    function fecharModalCustom() {
        document.getElementById('modalCustom').style.display = 'none';
    }

    async function salvarJogoCustom() {
        const nome = document.getElementById('customNome').value.trim();
        const capaFile = document.getElementById('customCapa').files[0];
        const ano = parseInt(document.getElementById('customAno').value) || new Date().getFullYear();
        const plataforma = document.getElementById('customPlataforma').value;
        const driveUrl = document.getElementById('customDriveUrl').value.trim();

        if (!nome) {
            mostrarToast('Digite o nome do jogo');
            return;
        }

        if (!capaFile) {
            mostrarToast('Selecione uma imagem de capa');
            return;
        }

        // Verificar se já existe
        if (colecao.some(j => j.nome.toLowerCase() === nome.toLowerCase())) {
            mostrarToast('Jogo já está na coleção');
            return;
        }

        try {
            // Converter imagem para base64
            const capaBase64 = await lerArquivoComoBase64(capaFile);

            // Criar objeto do jogo customizado
            const jogoCustom = {
                id: `custom_${Date.now()}`,
                nome: nome,
                capa: capaBase64,
                ano: ano,
                plataformaLabel: plataforma,
                cor: getCorPlataforma(plataforma),
                genero: 'Custom',
                custom: true
            };
            
            // Adicionar link do Drive se fornecido
            if (driveUrl) {
                jogoCustom.driveFolderUrl = driveUrl;
            }

            colecao.push(jogoCustom);
            salvarColecao();
            renderizarPrateleiras();
            fecharModalCustom();
            mostrarToast(`${nome} adicionado à prateleira!`);
        } catch (erro) {
            console.error('Erro ao adicionar jogo custom:', erro);
            mostrarToast('Erro ao processar a imagem');
        }
    }

    function lerArquivoComoBase64(arquivo) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(arquivo);
        });
    }

    function getCorPlataforma(plataforma) {
        const cores = {
            'PS5': '#003791',
            'PS4': '#003791',
            'PS3': '#003791',
            'PS2': '#003791',
            'XBOX': '#107c10',
            'XBOX ONE': '#107c10',
            'XBOX 360': '#107c10',
            'SWITCH': '#e4000f',
            'PC': '#1b2838'
        };
        return cores[plataforma] || '#333';
    }

    // ========================================
    // INICIAR
    // ========================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expor funções globalmente para drive-sync.js
    window.abrirModalCustom = abrirModalCustom;
    window.fecharModalCustom = fecharModalCustom;
    window.salvarJogoCustom = salvarJogoCustom;
    window.colecao = colecao;
    window.adicionarJogo = adicionarJogo;
    window.renderizarPrateleiras = renderizarPrateleiras;
    window.resolverPlataforma = resolverPlataforma;
    window.mostrarToast = mostrarToast;
    window.mostrarLoading = mostrarLoading;
    window.API_BASE_URL = API_BASE_URL;
    
    // Função para abrir Drive Save
    window.abrirDriveSave = function(url) {
        console.log('📥 Abrindo Drive Save:', url);
        window.open(url, '_blank');
        mostrarToast('Abrindo pasta de saves no Google Drive...');
    };

})();
