// Sincronização com Google Drive + Conquistas Steam
(function() {
    let gapiInitialized = false;
    let gisInitialized = false;
    let tokenClient;
    let accessToken = null;

    function gapiLoaded() {
        gapi.load('client', initializeGapiClient);
    }

    async function initializeGapiClient() {
        await gapi.client.init({
            apiKey: GOOGLE_CONFIG.API_KEY,
            discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
        });
        gapiInitialized = true;
        console.log('✅ Google API inicializada');
    }

    function gisLoaded() {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPES,
            callback: '',
        });
        gisInitialized = true;
        console.log('✅ Google Identity Services inicializado');
    }

    // ============================================
    // CONQUISTAS STEAM
    // ============================================

    // Cache do tempo jogado (busca uma vez e reutiliza)
    let cacheTempoJogado = null;

    // Busca tempo jogado de TODOS os jogos do usuário de uma vez
    async function buscarTempoJogado() {
        if (cacheTempoJogado) return cacheTempoJogado;

        try {
            if (!STEAM_CONFIG || !STEAM_CONFIG.API_KEY || !STEAM_CONFIG.STEAM_ID) {
                console.warn('⚠️ STEAM_CONFIG não configurado');
                return {};
            }

            const url = `/api/steam/playtime?steamid=${STEAM_CONFIG.STEAM_ID}&key=${STEAM_CONFIG.API_KEY}`;
            const resp = await fetch(url);
            const data = await resp.json();

            if (!data.response || !data.response.games) {
                console.log('⚠️ Sem dados de tempo jogado');
                return {};
            }

            // Cria mapa: { appid: minutos_jogados }
            const mapa = {};
            data.response.games.forEach(game => {
                mapa[game.appid] = game.playtime_forever || 0;
            });

            console.log(`⏱️  Tempo jogado carregado para ${Object.keys(mapa).length} jogos`);
            cacheTempoJogado = mapa;
            return mapa;

        } catch (erro) {
            console.error('❌ Erro ao buscar tempo jogado:', erro);
            return {};
        }
    }

    // Formata minutos em horas legíveis
    function formatarTempo(minutos) {
        if (!minutos || minutos === 0) return null;
        const horas = Math.floor(minutos / 60);
        if (horas === 0) return `${minutos}min`;
        if (horas < 10) return `${horas}h ${minutos % 60}min`;
        return `${horas}h`;
    }

    // Busca conquistas do jogador para um AppID específico via proxy local
    async function buscarConquistasSteam(appId) {
        try {
            if (!STEAM_CONFIG || !STEAM_CONFIG.API_KEY || !STEAM_CONFIG.STEAM_ID) {
                console.warn('⚠️ STEAM_CONFIG não configurado');
                return null;
            }

            const url = `/api/steam/achievements?appid=${appId}&steamid=${STEAM_CONFIG.STEAM_ID}&key=${STEAM_CONFIG.API_KEY}`;
            const resp = await fetch(url);
            const data = await resp.json();

            if (!data.playerstats || data.playerstats.error) {
                console.log(`⚠️ Sem conquistas para AppID ${appId}:`, data.playerstats?.error || 'sem dados');
                return null;
            }

            const achievements    = data.playerstats.achievements || [];
            const total           = achievements.length;
            const desbloqueadas   = achievements.filter(a => a.achieved === 1).length;
            const percentual      = total > 0 ? Math.round((desbloqueadas / total) * 100) : 0;

            console.log(`🏆 ${data.playerstats.gameName}: ${desbloqueadas}/${total} (${percentual}%)`);
            return { total, desbloqueadas, percentual, gameName: data.playerstats.gameName };

        } catch (erro) {
            console.error(`❌ Erro conquistas AppID ${appId}:`, erro);
            return null;
        }
    }

    // Atualiza conquistas de todos os jogos com steamAppId já na coleção
    async function atualizarConquistasColecao() {
        if (!window.colecao) return;

        const jogos = window.colecao.filter(j => j.steamAppId);
        if (jogos.length === 0) {
            mostrarToastSafe('Nenhum jogo Steam encontrado na coleção');
            return;
        }

        mostrarLoadingSafe(true);
        mostrarToastSafe(`🏆 Atualizando conquistas de ${jogos.length} jogos...`);

        let atualizados = 0;
        for (const jogo of jogos) {
            const conquistas = await buscarConquistasSteam(jogo.steamAppId);
            if (conquistas) {
                jogo.conquistas = conquistas;
                atualizados++;
            }
        }

        localStorage.setItem('prateleiraGamer_jogos', JSON.stringify(window.colecao));
        if (typeof renderizarPrateleiras === 'function') renderizarPrateleiras();

        mostrarLoadingSafe(false);
        mostrarToastSafe(`🏆 ${atualizados} jogos com conquistas atualizados!`);
    }

    // ============================================
    // GOOGLE DRIVE — buscar pastas de jogos
    // ============================================

    async function buscarJogosNoDrive() {
        if (!accessToken) throw new Error('Não autenticado');

        // Buscar pasta raiz CloudRedirect
        const searchFolder = await gapi.client.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${GOOGLE_CONFIG.CLOUDREDIRECT_FOLDER}' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        const pastas = searchFolder.result.files;
        if (!pastas || pastas.length === 0) {
            mostrarToastSafe('Pasta "CloudRedirect" não encontrada no Google Drive');
            return [];
        }

        const pastaPrincipal = pastas[0];
        console.log(`📁 Pasta encontrada: ${pastaPrincipal.name} (ID: ${pastaPrincipal.id})`);

        // Subpastas de primeiro nível (AppIDs numéricos do CloudRedirect)
        const primeiroNivel = await gapi.client.drive.files.list({
            q: `'${pastaPrincipal.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        let todasPastas = [];

        for (const pasta of primeiroNivel.result.files || []) {
            if (/^\d+$/.test(pasta.name)) {
                console.log(`📂 AppID: ${pasta.name}`);
                const subpastas = await gapi.client.drive.files.list({
                    q: `'${pasta.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                    fields: 'files(id, name, modifiedTime)',
                    spaces: 'drive',
                    orderBy: 'modifiedTime desc'
                });
                // Cada subpasta carrega o AppID do pai
                const subs = (subpastas.result.files || []).map(s => ({ ...s, steamAppId: pasta.name }));
                todasPastas = todasPastas.concat(subs);
            } else {
                todasPastas.push(pasta);
            }
        }

        console.log(`🎮 ${todasPastas.length} pastas de jogos encontradas`);
        return todasPastas;
    }

    // ============================================
    // SINCRONIZAÇÃO PRINCIPAL
    // ============================================

    async function sincronizarComDrive() {
        if (!gapiInitialized || !gisInitialized) {
            mostrarToastSafe('Aguarde a inicialização...');
            return;
        }

        mostrarLoadingSafe(true);
        mostrarToastSafe('🔍 Buscando jogos no Google Drive...');

        try {
            const jogosNoDrive = await buscarJogosNoDrive();

            if (jogosNoDrive.length === 0) {
                mostrarLoadingSafe(false);
                return;
            }

            mostrarToastSafe(`${jogosNoDrive.length} jogos encontrados! Buscando informações...`);

            // Buscar tempo jogado de todos os jogos de uma vez
            const tempoJogadoMap = await buscarTempoJogado();

            let adicionados = 0;
            let atualizados = 0;

            for (const pasta of jogosNoDrive) {
                let nomeJogo    = pasta.name;
                let steamAppId  = pasta.steamAppId || null;

                // Nome numérico = AppID direto na pasta de saves
                if (/^\d+$/.test(nomeJogo)) {
                    if (nomeJogo === '0') continue;
                    try {
                        const resp = await fetch(`/api/steamspy?appid=${nomeJogo}`);
                        const data = await resp.json();
                        if (data && data.name) {
                            steamAppId = nomeJogo;
                            nomeJogo   = data.name;
                            console.log(`✅ AppID ${steamAppId} → ${nomeJogo}`);
                        } else {
                            continue;
                        }
                    } catch (e) {
                        console.error(`❌ SteamSpy erro AppID ${nomeJogo}:`, e);
                        continue;
                    }
                }

                // Jogo já existe na coleção → apenas atualiza conquistas
                const jogoExistente = window.colecao &&
                    window.colecao.find(j => j.nome.toLowerCase() === nomeJogo.toLowerCase());

                if (jogoExistente) {
                    if (steamAppId && !jogoExistente.steamAppId) jogoExistente.steamAppId = steamAppId;
                    if (steamAppId) {
                        const c = await buscarConquistasSteam(steamAppId);
                        if (c) { jogoExistente.conquistas = c; atualizados++; }
                        // Atualizar tempo jogado
                        const minutos = tempoJogadoMap[steamAppId];
                        if (minutos) jogoExistente.tempoJogado = formatarTempo(minutos);
                    }
                    continue;
                }

                // Novo jogo — buscar na RAWG
                try {
                    const url  = `${API_BASE_URL}/games?search=${encodeURIComponent(nomeJogo)}&key=${CONFIG.RAWG_API_KEY}&page_size=1`;
                    const resp = await fetch(url);
                    const dados = await resp.json();

                    if (!dados.results || dados.results.length === 0) {
                        console.log(`❌ ${nomeJogo} não encontrado na RAWG`);
                        continue;
                    }

                    const resultado = dados.results[0];
                    const detResp   = await fetch(`${API_BASE_URL}/games/${resultado.id}?key=${CONFIG.RAWG_API_KEY}`);
                    const det       = await detResp.json();

                    // Buscar conquistas se tiver AppID
                    const conquistas = steamAppId ? await buscarConquistasSteam(steamAppId) : null;
                    
                    // Buscar tempo jogado
                    const minutos = steamAppId ? tempoJogadoMap[steamAppId] : null;
                    const tempoJogado = minutos ? formatarTempo(minutos) : null;

                    const jogoData = {
                        id:             resultado.id,
                        nome:           resultado.name,
                        capa:           resultado.background_image || '',
                        ano:            resultado.released ? new Date(resultado.released).getFullYear() : null,
                        genero:         resultado.genres?.[0]?.name || '',
                        rating:         det.rating || null,
                        developer:      det.developers?.[0]?.name || '',
                        publisher:      det.publishers?.[0]?.name || '',
                        descricao:      det.description_raw ? det.description_raw.substring(0, 200) : '',
                        cor:            '#1b2838',
                        plataformas:    ['PC'],
                        plataformaLabel:'PC',
                        driveFolder:    pasta.id,
                        driveFolderUrl: `https://drive.google.com/drive/folders/${pasta.id}`,
                        syncedFromDrive:true,
                        lastSaveUpdate: pasta.modifiedTime ? new Date(pasta.modifiedTime).toLocaleString('pt-BR') : null,
                        steamAppId:     steamAppId,
                        conquistas:     conquistas,
                        tempoJogado:    tempoJogado
                    };

                    if (typeof adicionarJogo === 'function') {
                        adicionarJogo(jogoData);
                    } else if (window.colecao) {
                        window.colecao.push(jogoData);
                        localStorage.setItem('prateleiraGamer_jogos', JSON.stringify(window.colecao));
                    }

                    console.log(`✅ ${resultado.name} adicionado!`);
                    adicionados++;

                } catch (erro) {
                    console.error(`❌ Erro ao adicionar ${nomeJogo}:`, erro);
                }
            }

            // Salvar e renderizar
            if (window.colecao) {
                localStorage.setItem('prateleiraGamer_jogos', JSON.stringify(window.colecao));
            }
            renderizarSafe();
            mostrarLoadingSafe(false);

            if (adicionados > 0) {
                mostrarToastSafe(`✅ ${adicionados} jogos adicionados com conquistas!`);
            } else if (atualizados > 0) {
                mostrarToastSafe(`🏆 Conquistas atualizadas para ${atualizados} jogos!`);
            } else {
                mostrarToastSafe(`ℹ️ Tudo já está em dia!`);
            }

        } catch (erro) {
            console.error('❌ Erro na sincronização:', erro);
            mostrarLoadingSafe(false);
            mostrarToastSafe('Erro ao sincronizar com o Google Drive');
        }
    }

    // ============================================
    // HELPERS
    // ============================================

    function mostrarToastSafe(msg) {
        if (typeof mostrarToast === 'function') mostrarToast(msg);
        else console.log('📢', msg);
    }

    function mostrarLoadingSafe(show) {
        if (typeof mostrarLoading === 'function') mostrarLoading(show);
    }

    function renderizarSafe() {
        if (typeof renderizarPrateleiras === 'function') renderizarPrateleiras();
        else window.location.reload();
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================

    function setup() {
        gapiLoaded();
        gisLoaded();

        const btnSync = document.getElementById('btnSyncDrive');
        if (btnSync) btnSync.addEventListener('click', handleSyncClick);

        const btnAch = document.getElementById('btnAtualizarConquistas');
        if (btnAch) btnAch.addEventListener('click', atualizarConquistasColecao);
    }

    function handleSyncClick() {
        if (!gapiInitialized || !gisInitialized) {
            mostrarToastSafe('Aguarde a inicialização do Google Drive...');
            return;
        }

        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                mostrarToastSafe('Erro ao autenticar com o Google');
                return;
            }
            accessToken = resp.access_token;
            console.log('✅ Autenticado com sucesso!');
            await sincronizarComDrive();
        };

        if (gapi.client.getToken() !== null) {
            sincronizarComDrive();
        } else {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }

    window.sincronizarComDrive        = sincronizarComDrive;
    window.atualizarConquistasColecao = atualizarConquistasColecao;
})();
