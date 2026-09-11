# 🎮 Prateleira Gamer

Uma estante virtual interativa para exibir sua coleção de jogos físicos como caixas 3D estilo DVD, inspirado no app Cibby.

![Prateleira Gamer](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## ✨ Funcionalidades

- 🔍 **Busca de jogos** via API RAWG com capas oficiais
- 📦 **Caixas 3D interativas** com frente, lombada e verso
- 🖱️ **Efeitos hover** - as caixas inclinam ao passar o mouse
- 🔄 **Rotação 180°** - clique para ver o verso da caixa
- 💾 **Persistência local** - sua coleção fica salva no navegador
- 📥 **Exportar/Importar** - backup em formato JSON
- 🔢 **Contador de jogos** - veja o tamanho da sua coleção
- 📊 **Ordenação** - por nome, ano ou ordem de adição
- 📱 **Responsivo** - funciona em desktop, tablet e celular
- 🌙 **Design dark** com tema de prateleira de madeira

## 🚀 Como usar

### 1. Obter chave da API RAWG

1. Acesse [https://rawg.io/apidocs](https://rawg.io/apidocs)
2. Clique em **"Get API Key"**
3. Faça login ou crie uma conta gratuita
4. Copie sua chave da API

### 2. Configurar o projeto

1. Clone ou baixe este repositório
2. Copie o arquivo `config.example.js` para `config.js`:
   ```bash
   cp config.example.js config.js
   ```
3. Abra `config.js` e substitua `'SUA_CHAVE_AQUI'` pela sua chave da API RAWG:
   ```javascript
   const CONFIG = {
       RAWG_API_KEY: 'sua-chave-aqui'
   };
   ```

### 3. Executar localmente

#### Opção 1: Abrir diretamente no navegador
- Simplesmente abra o arquivo `index.html` no seu navegador

#### Opção 2: Usar um servidor local (recomendado)
```bash
# Com Python 3
python -m http.server 8000

# Com Node.js (npx)
npx serve

# Com PHP
php -S localhost:8000
```

Depois acesse: `http://localhost:8000`

## 📋 Como funciona

1. **Buscar jogos**: Digite o nome do jogo no campo de busca e clique em "Buscar"
2. **Adicionar à prateleira**: Escolha um jogo dos resultados e clique em "Adicionar à prateleira"
3. **Interagir com as caixas**:
   - Passe o mouse sobre uma caixa para vê-la inclinar
   - Clique na caixa para girar e ver o verso
   - Passe o mouse para ver o botão de remover (X)
4. **Organizar**: Use o menu de ordenação para reorganizar por nome ou ano
5. **Fazer backup**: Clique em "Exportar" para baixar sua coleção em JSON
6. **Restaurar backup**: Clique em "Importar" e selecione um arquivo JSON de backup

## 🌐 Deploy (Hospedagem Gratuita)

### GitHub Pages

1. Faça commit dos arquivos (exceto `config.js`):
   ```bash
   git add .
   git commit -m "Initial commit"
   ```

2. Crie um repositório no GitHub e faça push:
   ```bash
   git remote add origin https://github.com/seu-usuario/prateleira-gamer.git
   git branch -M main
   git push -u origin main
   ```

3. Vá até **Settings** → **Pages**
4. Em **Source**, selecione **main branch**
5. Clique em **Save**

**⚠️ IMPORTANTE**: Você precisará configurar a chave da API diretamente no código para o GitHub Pages. Substitua a linha em `script.js`:

```javascript
const API_KEY = CONFIG.RAWG_API_KEY;
```

Por:

```javascript
const API_KEY = 'sua-chave-aqui';
```

**Ou melhor**: Use GitHub Secrets e GitHub Actions para injetar a chave no build.

### Netlify

1. Crie uma conta em [https://netlify.com](https://netlify.com)
2. Clique em **"Add new site"** → **"Deploy manually"**
3. Arraste a pasta do projeto para a área de upload
4. Configure a variável de ambiente:
   - Vá em **Site settings** → **Environment variables**
   - Adicione: `RAWG_API_KEY` com sua chave

5. Crie um arquivo `netlify.toml` na raiz:
   ```toml
   [build]
     publish = "."
   ```

Seu site estará no ar em poucos segundos!

### Vercel

1. Instale o Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Na pasta do projeto, execute:
   ```bash
   vercel
   ```

3. Siga as instruções no terminal
4. Configure a variável de ambiente no dashboard do Vercel

## ⚠️ Avisos importantes

- **Dados locais**: A coleção fica salva apenas no navegador atual (localStorage). Se você limpar os dados do navegador ou acessar de outro dispositivo, não verá sua coleção.
- **Backup**: Use a função de exportar regularmente para ter um backup da sua coleção.
- **Chave da API**: Nunca compartilhe sua chave da API publicamente. O arquivo `config.js` está no `.gitignore` para evitar isso.
- **Limite da API**: A API RAWG tem limite de requisições. A versão gratuita permite 20.000 requisições por mês.

## 🛠️ Estrutura de arquivos

```
prateleira-gamer/
├── index.html           # Estrutura HTML da página
├── style.css            # Estilos e efeitos 3D
├── script.js            # Lógica JavaScript
├── config.js            # Configuração da API (ignorado pelo git)
├── config.example.js    # Exemplo de configuração
├── .gitignore          # Arquivos ignorados pelo git
└── README.md           # Este arquivo
```

## 🎨 Personalização

### Alterar cores

Edite as variáveis CSS em `style.css`:

```css
:root {
    --cor-fundo: #1a1a1a;
    --cor-primaria: #ff6b6b;
    --cor-secundaria: #4ecdc4;
    /* ... */
}
```

### Mudar número de jogos por prateleira

Edite a constante em `script.js`:

```javascript
const JOGOS_POR_PRATELEIRA = 8; // Altere para o número desejado
```

### Alterar tamanho das caixas

Edite a classe `.caixa` em `style.css`:

```css
.caixa {
    width: 150px;  /* Largura */
    height: 200px; /* Altura */
}
```

## 🐛 Solução de problemas

### "Configure sua chave da API RAWG"
- Verifique se o arquivo `config.js` existe
- Confirme se você colocou sua chave corretamente no arquivo
- Certifique-se de que substituiu `'SUA_CHAVE_AQUI'`

### "Erro ao buscar jogos"
- Verifique sua conexão com a internet
- Confirme se sua chave da API está válida
- Verifique se não excedeu o limite de requisições da API

### Jogos não aparecem após recarregar
- Verifique se o localStorage está habilitado no navegador
- Alguns navegadores em modo anônimo não salvam dados

### Caixas 3D não funcionam
- Certifique-se de estar usando um navegador moderno (Chrome, Firefox, Edge)
- Tente desabilitar extensões que possam interferir com CSS

## 🌟 Recursos futuros (ideias)

- [ ] Modo claro/escuro
- [ ] Categorias/tags personalizadas
- [ ] Compartilhar coleção via link
- [ ] Estatísticas da coleção
- [ ] Integração com outras APIs (Steam, PlayStation, Xbox)
- [ ] Busca por plataforma
- [ ] Lista de desejos separada
- [ ] Notas e avaliações pessoais

## 📝 Tecnologias utilizadas

- **HTML5** - Estrutura semântica
- **CSS3** - Estilos e transformações 3D
- **JavaScript (Vanilla)** - Lógica e interatividade
- **API RAWG** - Dados e capas dos jogos
- **localStorage** - Persistência de dados

## 📄 Licença

Este projeto é livre para uso pessoal. Sinta-se à vontade para modificar e adaptar às suas necessidades.

## 🤝 Contribuições

Sugestões e melhorias são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Fazer fork e criar pull requests

## 📧 Contato

Criado com ❤️ para gamers que amam colecionar jogos físicos.

---

**Divirta-se montando sua prateleira virtual! 🎮📚**
