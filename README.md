# 📈 Calculadora de Dividendos

Controle seus dividendos de forma simples, privada e totalmente local.

---

## 📱 Como utilizar

Adicione seus dividendos e acompanhe seus investimentos diretamente pelo navegador.
Ao acessar o link pelo celular, um banner poderá ser exibido permitindo a instalação da aplicação como um aplicativo (PWA).

Após a instalação, você poderá utilizá-la como um app comum em seu dispositivo.

## 💾 Backup

Como os dados vivem apenas no dispositivo, o navegador pode apagá-los (limpeza de dados do site, ou inatividade prolongada no Safari/iOS). Na aba **⚙️ Config** você pode:

- Exportar um backup completo em JSON (e reimportar em qualquer dispositivo).
- Exportar o histórico de aportes em CSV para abrir no Excel.

## 🤖 Análises com IA

As análises (Balanço Trimestral e Destaques BEST) usam o modelo Claude com **busca na web** para obter preços e indicadores atuais — mas IA pode errar. Nada no app constitui recomendação de investimento; sempre confirme os dados em fontes oficiais (B3, sites de RI das empresas) antes de decidir.

Para usar, informe sua própria chave da API da Anthropic na aba **⚙️ Config** (obtenha em [console.anthropic.com](https://console.anthropic.com/settings/keys)).

## 📈 Cotações reais (brapi.dev)

Com um token gratuito da [brapi.dev](https://brapi.dev) (configurado na aba **⚙️ Config**), o app busca o preço atual real das ações da B3:

- **Verificar preços vs teto** na Calculadora: compara o preço de mercado de cada empresa com o teto cadastrado.
- **Buscar preço atual** na calculadora Bazin: preenche o preço automaticamente.
- O **Balanço Trimestral** passa a usar o preço real de mercado como base dos cálculos da IA.

O token fica salvo apenas no seu dispositivo e não entra nos backups exportados.

## 🔐 PIN de proteção

Na aba **⚙️ Config** é possível criar um PIN de 4 dígitos exigido ao abrir o app. Após **10 tentativas erradas, todos os dados são apagados** do dispositivo — sem recuperação (exporte um backup antes de ativar!).

O PIN nunca é armazenado em texto (apenas um hash com salt). Importante ser transparente: como o app é 100% local, o PIN protege contra acesso casual em dispositivos compartilhados, mas não contra alguém com conhecimento técnico para inspecionar o navegador.

## 🔒 Privacidade

Esta calculadora foi desenvolvida para ser **privada por padrão**.

- ✅ Seus aportes e configurações ficam armazenados apenas no seu dispositivo.
- ✅ Não existe sincronização automática nem servidores próprios.
- ✅ Nenhum dado é vendido ou compartilhado para fins de publicidade.
- ⚠️ **Exceção:** os recursos opcionais de IA enviam os tickers da sua carteira diretamente à API da Anthropic, usando a sua própria chave. Se você não usar esses recursos, nada sai do seu dispositivo.
- 🔒 Sua chave de API fica salva apenas no navegador e **não é incluída** nos arquivos de backup exportados.

⚠️ Por segurança, evite armazenar informações detalhadas sobre seus investimentos em dispositivos de uso compartilhado. Seus investimentos interessam apenas a você.

## 🚀 Testar a Calculadora

<https://hugmad.github.io/calculadora-dividendos/>

## 🗂 Estrutura do projeto

- `index.html` — estrutura da página
- `style.css` — estilos
- `app.js` — toda a lógica (cálculos, gráficos, IA, backup)
- `sw.js` — service worker (funcionamento offline)
- `manifest.json` — configuração do PWA

## 🛠 Personalização

Deseja modificar a calculadora?

1. Faça um fork do projeto.
2. Copie para seu próprio repositório.
3. Realize as alterações desejadas.
4. Publique sua própria versão.

## 📜 Licença

Você pode utilizar, estudar e modificar este projeto para uso pessoal.

**❌ É proibida a venda deste projeto ou de versões derivadas sem autorização prévia.**

---

Feito para investidores que valorizam privacidade, simplicidade e controle dos próprios dados.
