/* ═══════════════════════════════════════════════════════════
   Calculadora Dividendos BEST — app.js
   ═══════════════════════════════════════════════════════════ */

// ─── SEGURANÇA: escape de HTML ───────────────────────────
// Todo valor dinâmico (digitado pelo usuário ou vindo da IA)
// passa por esc() antes de ser interpolado em innerHTML.
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, m => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));
}

// ─── CORES DINÂMICAS ─────────────────────────────────────
// Paleta base + geração automática para carteiras grandes.
const PALETTE = ['#00E5A0','#FFB020','#00CEC9','#A78BFA','#4D9FFF','#FF7AC6','#9BE15D','#FF9F5C','#5EEAD4','#F472B6'];
const NAME_MAP = {green:'#00E5A0', amber:'#FFB020', teal:'#00CEC9', purple:'#A78BFA'};

function hslToHex(h, s, l){
  s/=100; l/=100;
  const k = n => (n + h/30) % 12;
  const a = s * Math.min(l, 1-l);
  const f = n => l - a * Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n), 1)));
  return '#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');
}

function getColorHex(c, i){
  if(c && c.color){
    if(NAME_MAP[c.color]) return NAME_MAP[c.color];
    if(/^#[0-9a-fA-F]{6}$/.test(c.color)) return c.color;
  }
  if(i < PALETTE.length) return PALETTE[i];
  return hslToHex((i * 137.508) % 360, 70, 62); // ângulo áureo: cores bem distribuídas
}

// Estilo inline com as variáveis CSS de cor do card
function cardStyle(hex){
  return `--c:${hex};--c-dim:${hex}1A;--c-border:${hex}33`;
}

// ─── API KEY ─────────────────────────────────────────────
const APIKEY_KEY = 'best_anthropic_key';
function getApiKey(){ return localStorage.getItem(APIKEY_KEY) || ''; }
function saveApiKey(){
  const val = document.getElementById('apikey-input').value.trim();
  if(!val){ showApiKeyStatus('⚠️ Digite a chave antes de salvar.','var(--amber)'); return; }
  if(!val.startsWith('sk-ant-')){ showApiKeyStatus('⚠️ Chave inválida — deve começar com sk-ant-','var(--red)'); return; }
  localStorage.setItem(APIKEY_KEY, val);
  showApiKeyStatus('✓ Chave salva com sucesso!','var(--green)');
}
function clearApiKey(){
  localStorage.removeItem(APIKEY_KEY);
  document.getElementById('apikey-input').value = '';
  showApiKeyStatus('Chave removida.','var(--text2)');
}
function toggleApiKeyVisibility(){
  const inp = document.getElementById('apikey-input');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}
function showApiKeyStatus(msg, color){
  const el = document.getElementById('apikey-status');
  if(!el) return;
  el.style.color = color;
  el.textContent = msg;
  setTimeout(()=>{ el.textContent=''; }, 4000);
}
function requireApiKey(){ return getApiKey(); }
function showNoKeyMessage(wrapId, btnEl, btnOrigText){
  const wrap = document.getElementById(wrapId);
  if(wrap) wrap.innerHTML = `<div style="background:rgba(255,176,32,.08);border:1px solid rgba(255,176,32,.25);border-radius:14px;padding:20px 18px;text-align:center;font-family:'DM Mono',monospace;font-size:13px;color:var(--amber)">
    ⚠️ Configure sua chave de API na aba <strong>⚙️ Config</strong> para usar as análises de IA.
  </div>`;
  if(btnEl){ btnEl.textContent = btnOrigText; btnEl.disabled = false; }
}

// ─── CHAMADA À API ANTHROPIC ─────────────────────────────
// Com busca na web habilitada (dados reais, não alucinados),
// verificação de status HTTP e mensagens de erro específicas.
async function callClaude(apiKey, prompt, maxTokens = 2500){
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });
  } catch(e){
    throw new Error('Sem conexão com a internet. Verifique sua rede e tente novamente.');
  }

  if(!resp.ok){
    let apiMsg = '';
    try { const e = await resp.json(); apiMsg = e?.error?.message || ''; } catch(_){}
    if(resp.status === 401) throw new Error('Chave de API inválida ou revogada. Verifique na aba ⚙️ Config.');
    if(resp.status === 403) throw new Error('Chave sem permissão para este recurso.');
    if(resp.status === 429) throw new Error('Limite de requisições atingido. Aguarde alguns minutos e tente de novo.');
    if(resp.status === 529) throw new Error('API da Anthropic sobrecarregada no momento. Tente novamente em instantes.');
    if(/credit|billing/i.test(apiMsg)) throw new Error('Créditos insuficientes na sua conta Anthropic. Verifique em console.anthropic.com.');
    throw new Error(apiMsg || `Erro ${resp.status} na API. Tente novamente.`);
  }

  const data = await resp.json();
  // Com web search a resposta traz blocos mistos — usamos só os de texto
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text || '').join('');
}

function parseJsonResponse(raw){
  const clean = raw.replace(/```json|```/g, '').trim();
  const start = clean.indexOf('{');
  const end   = clean.lastIndexOf('}');
  if(start === -1 || end === -1) throw new Error('A IA respondeu em formato inesperado. Tente novamente.');
  return JSON.parse(clean.slice(start, end + 1));
}

const AI_DISCLAIMER = `<div class="ai-disclaimer">⚠️ Conteúdo gerado por IA com busca na web — pode conter erros ou dados desatualizados. <strong>Não é recomendação de investimento.</strong> Sempre confirme preços e indicadores em fontes oficiais (B3, RI das empresas) antes de qualquer decisão.</div>`;

// ─── BRAPI: COTAÇÕES REAIS DA B3 ─────────────────────────
// Token gratuito em brapi.dev — salvo apenas neste dispositivo,
// como a chave da Anthropic. Nunca incluído em backups.
const BRAPI_KEY = 'best_brapi_token';
function getBrapiToken(){ return localStorage.getItem(BRAPI_KEY) || ''; }
function saveBrapiToken(){
  const val = document.getElementById('brapi-input').value.trim();
  if(!val){ showBrapiStatus('⚠️ Digite o token antes de salvar.', 'var(--amber)'); return; }
  localStorage.setItem(BRAPI_KEY, val);
  quoteCache = {}; // limpa cache ao trocar de token
  showBrapiStatus('✓ Token salvo com sucesso!', 'var(--green)');
}
function clearBrapiToken(){
  localStorage.removeItem(BRAPI_KEY);
  document.getElementById('brapi-input').value = '';
  showBrapiStatus('Token removido.', 'var(--text2)');
}
function showBrapiStatus(msg, color){
  const el = document.getElementById('brapi-status');
  if(!el) return;
  el.style.color = color;
  el.textContent = msg;
  setTimeout(()=>{ el.textContent=''; }, 4000);
}

// Cache em memória (5 min) para economizar a cota do plano gratuito
let quoteCache = {}; // { TICKER: { price, time } }
const QUOTE_TTL = 5 * 60 * 1000;

// Busca a cotação de UM ticker (o plano gratuito da brapi
// aceita apenas 1 ativo por requisição).
async function fetchQuote(ticker){
  const token = getBrapiToken();
  if(!token) throw new Error('Configure seu token da brapi.dev na aba ⚙️ Config.');

  const cached = quoteCache[ticker];
  if(cached && Date.now() - cached.time < QUOTE_TTL) return cached.price;

  let resp;
  try {
    resp = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?token=${encodeURIComponent(token)}`);
  } catch(e){
    throw new Error('Sem conexão com a brapi.dev. Verifique sua rede.');
  }
  if(!resp.ok){
    if(resp.status === 401 || resp.status === 403) throw new Error('Token da brapi.dev inválido. Verifique na aba ⚙️ Config.');
    if(resp.status === 404) throw new Error(`Ticker ${ticker} não encontrado na brapi.dev.`);
    if(resp.status === 429) throw new Error('Cota da brapi.dev esgotada. Tente mais tarde.');
    throw new Error(`Erro ${resp.status} na brapi.dev.`);
  }
  const data  = await resp.json();
  const price = data?.results?.[0]?.regularMarketPrice;
  if(typeof price !== 'number') throw new Error(`Preço de ${ticker} indisponível na brapi.dev.`);
  quoteCache[ticker] = { price, time: Date.now() };
  return price;
}

// Busca várias cotações em paralelo; retorna { TICKER: preço|null }
async function fetchQuotes(tickers){
  const results = await Promise.allSettled(tickers.map(t => fetchQuote(t)));
  const out = {};
  tickers.forEach((t, i) => {
    out[t] = results[i].status === 'fulfilled' ? results[i].value : null;
  });
  return out;
}

// Botão "Verificar preços" do painel Calculadora:
// compara o preço atual de cada empresa com o teto cadastrado.
async function checkPrices(){
  const btn = document.getElementById('check-prices-btn');
  if(!getBrapiToken()){
    alert('Configure seu token gratuito da brapi.dev na aba ⚙️ Config para buscar preços reais.');
    return;
  }
  btn.textContent = '⏳ Buscando...';
  btn.disabled = true;
  try {
    const quotes = await fetchQuotes(COMPANIES.map(c => c.ticker));
    let ok = 0, above = 0, fail = 0;
    COMPANIES.forEach((c, i) => {
      const chip  = document.getElementById('price-chip-' + i);
      if(!chip) return;
      const price = quotes[c.ticker];
      if(price === null){
        chip.innerHTML = '<span style="color:var(--text3)">preço indisponível</span>';
        fail++;
        return;
      }
      const priceFmt = 'R$ ' + price.toFixed(2).replace('.', ',');
      if(!c.teto){
        chip.innerHTML = `<span style="color:var(--text2)">Atual: ${priceFmt}</span> <span style="color:var(--text3)">(sem teto cadastrado)</span>`;
      } else if(price <= c.teto){
        chip.innerHTML = `<span style="color:var(--green)">Atual: ${priceFmt} ✓ abaixo do teto</span>`;
        ok++;
      } else {
        chip.innerHTML = `<span style="color:var(--red)">Atual: ${priceFmt} ⛔ acima do teto</span>`;
        above++;
      }
    });
    const stamp = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
    const note = document.getElementById('check-prices-note');
    if(note) note.textContent = `Cotações brapi.dev às ${stamp} · ${ok} abaixo do teto · ${above} acima${fail ? ' · ' + fail + ' indisponível(is)' : ''} — desative manualmente as que passaram do teto.`;
  } catch(err){
    alert('⚠️ ' + err.message);
  }
  btn.textContent = '🔄 Verificar preços vs teto';
  btn.disabled = false;
}

// Botão da calculadora Bazin: preenche o preço atual automaticamente
async function fetchBazinPrice(){
  const ticker = (document.getElementById('bazin-ticker').value || '').trim().toUpperCase();
  if(!ticker){ alert('Digite o ticker primeiro.'); return; }
  const btn = document.getElementById('bazin-fetch-btn');
  btn.textContent = '⏳';
  btn.disabled = true;
  try {
    const price = await fetchQuote(ticker);
    document.getElementById('bazin-preco').value = price.toFixed(2);
    calcBazin(true);
  } catch(err){
    alert('⚠️ ' + err.message);
  }
  btn.textContent = '🔄 Buscar preço atual';
  btn.disabled = false;
}

// ─── SANITIZAÇÃO DE DADOS ────────────────────────────────
// Garante os tipos corretos em dados vindos do localStorage
// ou de backups importados (campos numéricos nunca viram string).
function sanitizeCompanies(list){
  if(!Array.isArray(list)) return null;
  return list.map(c => ({
    ticker: String(c?.ticker ?? '').trim().toUpperCase().slice(0, 12),
    name:   String(c?.name   ?? '').slice(0, 60),
    sector: String(c?.sector ?? '').slice(0, 30),
    color:  /^#[0-9a-fA-F]{6}$/.test(c?.color) || NAME_MAP[c?.color] ? c.color : '',
    dy:     Math.min(1,   Math.max(0, parseFloat(c?.dy)   || 0)),
    teto:   Math.max(0,   parseFloat(c?.teto) || 0),
    peso:   Math.min(100, Math.max(0, parseInt(c?.peso)   || 0)),
    risco:  String(c?.risco ?? 'Médio').slice(0, 20),
    anos:   String(c?.anos  ?? '').slice(0, 20),
  })).filter(c => c.ticker);
}

// ─── CONSTANTS ───────────────────────────────────────────
let COMPANIES = (() => {
  try { return sanitizeCompanies(JSON.parse(localStorage.getItem('best_companies'))); }
  catch(e){ return null; }
})() || [
  {ticker:'TAEE11', name:'Transmissão Paulista', sector:'Energia', color:'green',  dy:0.078,  teto:42, peso:35, risco:'Baixo', anos:'9 anos'},
  {ticker:'BBSE3',  name:'BB Seguridade',        sector:'Seguros', color:'amber',  dy:0.072,  teto:38, peso:25, risco:'Baixo', anos:'8 anos'},
  {ticker:'CMIG4',  name:'Cemig PN',             sector:'Energia', color:'teal',   dy:0.1174, teto:14, peso:20, risco:'Médio', anos:'7 anos'},
  {ticker:'VIVT3',  name:'Telefônica Vivo',      sector:'Telecom', color:'purple', dy:0.061,  teto:55, peso:20, risco:'Médio', anos:'6 anos'},
];
const STORAGE_KEY = 'best_aportes_v2';
const BAZIN_KEY   = 'best_bazin_hist';

// ─── STATE ───────────────────────────────────────────────
let pesos   = COMPANIES.map(c => c.peso);
let enabled = COMPANIES.map(() => true);
let pieChart = null, realChart = null, futChart = null;
let aportes = {}; // { 'YYYY-MM': { TICKER: valor } }

// ─── STORAGE ─────────────────────────────────────────────
async function loadData(){
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if(r) aportes = JSON.parse(r);
  } catch(e){
    console.error(e);
    aportes = {};
  }
}
async function saveData(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(aportes)); }
  catch(e){ console.error('Storage error', e); }
}
function saveCompanies(){ localStorage.setItem('best_companies', JSON.stringify(COMPANIES)); }

// ─── UTILS ───────────────────────────────────────────────
function fmtBR(n){ return 'R$ ' + Math.round(n).toLocaleString('pt-BR'); }
function fmtBRDec(n){ return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function ym(d){ return d.toISOString().slice(0, 7); }
function ymLabel(s){
  const [y, m] = s.split('-');
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return names[parseInt(m) - 1] + '/' + y.slice(2);
}
function getMonthOptions(){
  const opts = [];
  const now = new Date();
  for(let i = 0; i < 24; i++){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push(ym(d));
  }
  return opts;
}

// ─── TABS ────────────────────────────────────────────────
function showPanel(id){
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
  document.getElementById('panel-' + id).classList.add('active');
  const idx = {calc:0, aporte:1, hist:2, proj:3, info:4, teto:5, config:6}[id];
  const tab = document.querySelectorAll('.tab')[idx];
  tab.classList.add('active');
  tab.setAttribute('aria-selected','true');
  if(id === 'hist')   renderHist();
  if(id === 'proj')   renderProj();
  if(id === 'aporte') renderAportePanel();
  if(id === 'config') renderConfig();
  if(id === 'teto')   renderBazinHist();
}

// ─── CALCULADORA ─────────────────────────────────────────
function getCalcValues(){
  const renda = parseFloat(document.getElementById('renda-input').value) || 0;
  const fixas = parseFloat(document.getElementById('fixas-input').value) || 0;
  const sobra = Math.max(0, renda - fixas);
  const inv   = sobra * 0.75;
  const res   = sobra - inv;
  return {renda, fixas, sobra, inv, res};
}

function normPesos(){
  const active = pesos.map((p, i) => enabled[i] ? p : 0);
  const total  = active.reduce((a, b) => a + b, 0);
  if(!total) return active.map(() => 0);
  return active.map(p => p / total);
}

function buildCompanyCards(){
  const wrap = document.getElementById('ccards-wrap');
  wrap.innerHTML = COMPANIES.map((c, i) => {
    const hex = getColorHex(c, i);
    return `
    <div class="ccard" data-idx="${i}" style="${cardStyle(hex)};animation:fadeUp .5s ${0.1 + i * .05}s ease both">
      <div class="dis-ov"><span style="font-size:26px">🚫</span><span class="dis-label">Acima do teto</span></div>
      <button class="tog-btn" onclick="toggleCo(${i})" aria-label="Ativar ou desativar ${esc(c.ticker)}"><span class="tog-dot"></span><span class="tog-txt">Ativa</span></button>
      <div class="c-head">
        <span class="c-ticker">${esc(c.ticker)}</span>
        <span class="c-sector">${esc(c.sector)}</span>
      </div>
      <div class="c-name">${esc(c.name)}</div>
      <div class="alloc-val" id="alloc-${i}">R$ 0</div>
      <div class="alloc-lbl">alocação estimada</div>
      <div class="pbar"><div class="pfill" id="prog-${i}" style="width:${c.peso}%"></div></div>
      <div class="cstats">
        <div class="cstat"><div class="cstat-lbl">DY médio</div><div class="cstat-val hi">${(c.dy * 100).toFixed(1).replace('.', ',')}% a.a.</div></div>
        <div class="cstat"><div class="cstat-lbl">Consistência</div><div class="cstat-val hi">${esc(c.anos)}</div></div>
        <div class="cstat"><div class="cstat-lbl">Preço teto</div><div class="cstat-val">R$ ${(c.teto || 0).toFixed(2).replace('.', ',')}</div></div>
        <div class="cstat"><div class="cstat-lbl">Risco</div><div class="cstat-val" style="color:${c.risco === 'Baixo' ? 'var(--green)' : 'var(--amber)'}">${esc(c.risco)}</div></div>
      </div>
      <div class="price-chip" id="price-chip-${i}"></div>
      <div class="peso-grp">
        <div class="peso-row"><span class="peso-lbl">Peso na carteira</span><span class="peso-pct" id="ppct-${i}">${c.peso}%</span></div>
        <input type="range" class="peso-sl" id="peso-${i}" min="0" max="100" value="${c.peso}" oninput="setPeso(${i},this.value)" aria-label="Peso de ${esc(c.ticker)} na carteira">
      </div>
    </div>`;
  }).join('');

  document.getElementById('div-grid').innerHTML = COMPANIES.map((c, i) => `
    <div class="div-card" id="div-card-${i}">
      <div class="div-ticker">${esc(c.ticker)}</div>
      <div class="div-val" id="div-${i}">R$ 0</div>
      <div class="div-sub">DY ${(c.dy * 100).toFixed(2).replace('.', ',')}% a.a.</div>
    </div>
  `).join('');
}

function toggleCo(idx){
  enabled[idx] = !enabled[idx];
  const card = document.querySelector(`.ccard[data-idx="${idx}"]`);
  const txt  = card.querySelector('.tog-txt');
  card.classList.toggle('disabled', !enabled[idx]);
  txt.textContent = enabled[idx] ? 'Ativa' : 'Reativar';
  updateCalc();
}

function setPeso(idx, val){
  pesos[idx] = parseInt(val);
  updateCalc();
}

function updateCalc(){
  const {renda, sobra, inv, res} = getCalcValues();

  document.getElementById('slider-val').textContent =
    (parseFloat(document.getElementById('renda-slider').value) || 0).toLocaleString('pt-BR');

  document.getElementById('sobra-val').textContent = fmtBR(sobra);
  document.getElementById('inv-val').textContent   = fmtBR(inv);
  document.getElementById('res-val').textContent   = fmtBR(res);

  const bar = document.getElementById('res-bar');
  document.getElementById('res-text').textContent = renda >= 4000
    ? '✓ Com esta renda você consegue investir e guardar parte para emergências.'
    : 'Renda baixa — priorize a reserva de emergência de R$7.500.';
  bar.className = 'res-bar' + (renda >= 4000 ? ' ok' : '');

  const norm   = normPesos();
  const allocs = norm.map(p => inv * p);
  const divs   = allocs.map((a, i) => a * COMPANIES[i].dy / 4);
  const divTotal = divs.reduce((a, b) => a + b, 0);

  const rawTotal = pesos.reduce((a, b) => a + b, 0);
  const disAmt = rawTotal > 0 ? pesos.map((p, i) => enabled[i] ? 0 : p).reduce((a, b) => a + b, 0) / rawTotal * inv : 0;
  const tb = document.getElementById('tesouro-banner');
  if(disAmt > 0){ tb.classList.add('show'); document.getElementById('tesouro-amt').textContent = fmtBR(disAmt); }
  else tb.classList.remove('show');

  COMPANIES.forEach((_, i) => {
    const el = document.getElementById('alloc-' + i);
    if(!el) return;
    el.textContent = enabled[i] ? fmtBR(allocs[i]) : 'R$ 0';
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
    document.getElementById('prog-' + i).style.width = (norm[i] * 100).toFixed(1) + '%';
    document.getElementById('div-' + i).textContent = enabled[i] ? fmtBR(divs[i]) : 'R$ 0';
    document.getElementById('div-card-' + i).classList.toggle('disabled', !enabled[i]);
  });

  document.getElementById('div-total').textContent  = fmtBR(divTotal);
  document.getElementById('pie-center').textContent = fmtBR(inv);

  COMPANIES.forEach((_, i) => {
    const el = document.getElementById('ppct-' + i);
    if(el) el.textContent = rawTotal > 0 ? Math.round(pesos[i] / rawTotal * 100) + '%' : '0%';
  });

  updatePie(allocs);
  updatePieLegend(norm);
}

function updatePie(allocs){
  const ctx  = document.getElementById('pie-chart').getContext('2d');
  const data = allocs.map((a, i) => enabled[i] ? Math.round(a) : 0);
  const bg   = COMPANIES.map((c, i) => enabled[i] ? getColorHex(c, i) + 'CC' : '#ffffff18');
  const bc   = COMPANIES.map((c, i) => enabled[i] ? getColorHex(c, i) : '#ffffff30');
  if(pieChart){
    pieChart.data.labels = COMPANIES.map(c => c.ticker);
    pieChart.data.datasets[0].data = data;
    pieChart.data.datasets[0].backgroundColor = bg;
    pieChart.data.datasets[0].borderColor = bc;
    pieChart.update('none'); return;
  }
  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {labels: COMPANIES.map(c => c.ticker), datasets: [{data, backgroundColor: bg, borderColor: bc, borderWidth: 1.5, hoverOffset: 5}]},
    options: {responsive: false, cutout: '62%', plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => fmtBR(c.parsed)}}}, animation: {duration: 350}}
  });
}

function updatePieLegend(norm){
  document.getElementById('pie-legend').innerHTML = COMPANIES.map((c, i) => `
    <div class="pie-leg-item${enabled[i] ? '' : ' disabled'}">
      <div class="pie-leg-left">
        <div class="pie-dot" style="background:${enabled[i] ? getColorHex(c, i) : '#4A5568'}"></div>
        <span class="pie-name">${esc(c.ticker)}</span>
      </div>
      <span class="pie-pct">${enabled[i] ? Math.round(norm[i] * 100) + '%' : '—'}</span>
    </div>`).join('');
}

// ─── APORTE PANEL ────────────────────────────────────────
function renderAportePanel(){
  const sel  = document.getElementById('aporte-mes');
  const opts = getMonthOptions();
  sel.innerHTML = opts.map(o => `<option value="${o}">${ymLabel(o)}</option>`).join('');
  sel.onchange = () => loadAporteFields();

  document.getElementById('aporte-grid').innerHTML = COMPANIES.map((c, i) => `
    <div class="aporte-card" style="${cardStyle(getColorHex(c, i))}">
      <div class="aporte-ticker">${esc(c.ticker)}</div>
      <div class="aporte-name">${esc(c.name)}</div>
      <div class="inp-wrap">
        <span class="inp-pre" style="font-size:12px">R$</span>
        <input type="number" class="inp sm" id="ap-${esc(c.ticker)}" value="0" min="0" step="1" placeholder="0" aria-label="Aporte em ${esc(c.ticker)}">
      </div>
    </div>
  `).join('');

  loadAporteFields();
}

function loadAporteFields(){
  const mes   = document.getElementById('aporte-mes').value;
  const saved = aportes[mes] || {};
  COMPANIES.forEach(c => {
    const el = document.getElementById('ap-' + c.ticker);
    if(el) el.value = saved[c.ticker] || 0;
  });
  const btn = document.getElementById('save-btn');
  btn.textContent = '💾 Salvar aporte';
  btn.className = 'save-btn';
}

async function saveAporte(){
  const mes   = document.getElementById('aporte-mes').value;
  const entry = {};
  COMPANIES.forEach(c => {
    const el = document.getElementById('ap-' + c.ticker);
    entry[c.ticker] = parseFloat(el?.value) || 0;
  });
  aportes[mes] = entry;
  await saveData();

  const btn = document.getElementById('save-btn');
  btn.textContent = '✓ Salvo!';
  btn.className = 'save-btn saved';
  setTimeout(() => { btn.textContent = '💾 Salvar aporte'; btn.className = 'save-btn'; }, 2000);
}

// ─── HISTÓRICO ───────────────────────────────────────────
function renderHist(){
  const keys = Object.keys(aportes).sort();

  const acum = {};
  COMPANIES.forEach(c => acum[c.ticker] = 0);
  let totalInv = 0;
  keys.forEach(k => {
    COMPANIES.forEach(c => {
      acum[c.ticker] += (aportes[k][c.ticker] || 0);
      totalInv       += (aportes[k][c.ticker] || 0);
    });
  });

  const dyMedio = totalInv > 0
    ? COMPANIES.reduce((s, c) => s + (acum[c.ticker] / totalInv) * c.dy, 0) : 0;
  const divAno = totalInv * dyMedio;

  document.getElementById('total-inv').textContent     = fmtBR(totalInv);
  document.getElementById('total-div-ano').textContent = fmtBR(divAno);
  document.getElementById('total-meses').textContent   = keys.length;
  document.getElementById('dy-medio').textContent      = (dyMedio * 100).toFixed(1).replace('.', ',') + '%';

  document.getElementById('acum-grid').innerHTML = COMPANIES.map((c, i) => `
    <div class="div-card">
      <div class="div-ticker">${esc(c.ticker)}</div>
      <div class="div-val" style="color:${getColorHex(c, i)}">${fmtBR(acum[c.ticker])}</div>
      <div class="div-sub">${totalInv > 0 ? Math.round(acum[c.ticker] / totalInv * 100) + '% da carteira' : '—'}</div>
    </div>
  `).join('');

  if(!keys.length){
    document.getElementById('hist-table-wrap').innerHTML = '<div class="empty">Nenhum aporte registrado. Vá em "Registrar Aporte" para começar.</div>';
    return;
  }

  const html = `<div class="hist-table-scroll"><table class="hist-table">
    <thead><tr>
      <th>Mês</th>
      ${COMPANIES.map(c => `<th>${esc(c.ticker)}</th>`).join('')}
      <th>Total</th>
      <th></th>
    </tr></thead>
    <tbody>
    ${keys.slice().reverse().map(k => {
      const row = aportes[k] || {};
      const tot = COMPANIES.reduce((s, c) => s + (row[c.ticker] || 0), 0);
      return `<tr>
        <td>${ymLabel(k)}</td>
        ${COMPANIES.map((c, i) => `<td style="color:${getColorHex(c, i)}">${fmtBR(row[c.ticker] || 0)}</td>`).join('')}
        <td style="color:var(--text)">${fmtBR(tot)}</td>
        <td><button class="del-btn" onclick="deleteAporte('${k}')" aria-label="Apagar aporte de ${ymLabel(k)}">🗑</button></td>
      </tr>`;
    }).join('')}
    </tbody>
  </table></div>`;
  document.getElementById('hist-table-wrap').innerHTML = html;
}

async function deleteAporte(mes){
  if(!confirm(`Apagar aporte de ${ymLabel(mes)}?`)) return;
  delete aportes[mes];
  await saveData();
  renderHist();
}

// ─── PROJEÇÃO REAL ───────────────────────────────────────
function renderProj(){
  const keys = Object.keys(aportes).sort();

  let cumul = 0;
  const realLabels = [], realData = [], divMesData = [];
  const DY_MEDIO = 0.07;

  keys.forEach(k => {
    const tot = COMPANIES.reduce((s, c) => s + (aportes[k][c.ticker] || 0), 0);
    cumul += tot;
    const acum = {}; COMPANIES.forEach(c => acum[c.ticker] = 0);
    keys.slice(0, keys.indexOf(k) + 1).forEach(kk => { COMPANIES.forEach(c => { acum[c.ticker] += (aportes[kk][c.ticker] || 0); }); });
    const totalAcum = COMPANIES.reduce((s, c) => s + (acum[c.ticker] || 0), 0);
    const dyW = totalAcum > 0 ? COMPANIES.reduce((s, c) => s + (acum[c.ticker] / totalAcum) * c.dy, 0) : DY_MEDIO;
    realLabels.push(ymLabel(k));
    realData.push(Math.round(cumul));
    divMesData.push(Math.round(cumul * dyW / 12));
  });

  const patrimAtual = realData.length ? realData[realData.length - 1] : 0;
  const divMesAtual = divMesData.length ? divMesData[divMesData.length - 1] : 0;
  const totalInv = Object.values(aportes).reduce((s, v) => s + COMPANIES.reduce((ss, c) => ss + (v[c.ticker] || 0), 0), 0);
  const apoMedSimple = keys.length ? totalInv / keys.length : 0;

  document.getElementById('proj-patrim').textContent     = fmtBR(patrimAtual);
  document.getElementById('proj-div-mes').textContent    = fmtBR(divMesAtual);
  document.getElementById('proj-aporte-med').textContent = fmtBR(apoMedSimple);

  const META_DIV = 2500, META_PATRIM = META_DIV * 12 / DY_MEDIO;
  if(patrimAtual >= META_PATRIM){
    document.getElementById('proj-eta').textContent = '✓ Meta atingida!';
  } else {
    const dyM = DY_MEDIO / 12;
    let p = patrimAtual, m = 0;
    while(p < META_PATRIM && m < 600){ p = p * (1 + dyM) + apoMedSimple; m++; }
    const anos = Math.ceil(m / 12);
    const anoChega = new Date().getFullYear() + anos;
    document.getElementById('proj-eta').textContent = m >= 600 ? '—' : `~${anoChega} (${anos} anos)`;
  }

  const rctx = document.getElementById('real-chart')?.getContext('2d');
  if(realChart){ realChart.destroy(); realChart = null; }

  if(!realLabels.length){
    const wrap = document.getElementById('real-chart')?.parentElement;
    if(wrap) wrap.innerHTML = '<div class="empty" style="height:260px;display:flex;align-items:center;justify-content:center">Registre aportes para ver o gráfico de evolução real.</div>';
  } else if(rctx){
    realChart = new Chart(rctx, {
      type: 'bar',
      data: {
        labels: realLabels,
        datasets: [
          {label: 'Patrimônio acumulado', data: realData, backgroundColor: 'rgba(0,229,160,.25)', borderColor: '#00E5A0', borderWidth: 1.5, borderRadius: 6, type: 'bar', yAxisID: 'y'},
          {label: 'Dividendo mensal est.', data: divMesData, borderColor: '#FFB020', borderDash: [5, 3], borderWidth: 2, fill: false, tension: .4, pointRadius: 4, type: 'line', yAxisID: 'y2'},
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {legend: {display: true, labels: {color: '#8A97B5', font: {family: 'DM Mono', size: 11}, boxWidth: 12}},
          tooltip: {callbacks: {label: c => c.dataset.label + ': ' + fmtBR(c.parsed.y)}}},
        scales: {
          x: {ticks: {color: '#4A5568', font: {family: 'DM Mono', size: 10}, maxRotation: 45, autoSkip: true, maxTicksLimit: 12}, grid: {color: 'rgba(255,255,255,.04)'}},
          y: {position: 'left', ticks: {color: '#00E5A0', font: {family: 'DM Mono', size: 10}, callback: v => v >= 1000 ? 'R$' + Math.round(v / 1000) + 'k' : fmtBR(v)}, grid: {color: 'rgba(255,255,255,.04)'}},
          y2: {position: 'right', ticks: {color: '#FFB020', font: {family: 'DM Mono', size: 10}, callback: v => fmtBR(v)}, grid: {display: false}}
        }
      }
    });
  }

  const futLabels = [], futData = [], futDivData = [];
  const dyM = DY_MEDIO / 12;
  let p = patrimAtual;
  for(let m = 1; m <= 180; m++){
    p = p * (1 + dyM) + apoMedSimple;
    if(m % 12 === 0){
      futLabels.push('+' + (m / 12) + 'a');
      futData.push(Math.round(p));
      futDivData.push(Math.round(p * DY_MEDIO / 12));
    }
  }

  const fctx = document.getElementById('fut-chart')?.getContext('2d');
  if(futChart){ futChart.destroy(); futChart = null; }
  if(!fctx) return;
  futChart = new Chart(fctx, {
    type: 'line',
    data: {labels: futLabels, datasets: [
      {label: 'Patrimônio projetado', data: futData, borderColor: '#00E5A0', backgroundColor: 'rgba(0,229,160,.07)', fill: true, tension: .4, pointRadius: 2, yAxisID: 'y'},
      {label: 'Dividendo mensal', data: futDivData, borderColor: '#FFB020', borderDash: [5, 3], fill: false, tension: .4, pointRadius: 0, yAxisID: 'y2'},
      {label: 'Meta R$2.500/mês', data: futLabels.map(() => META_PATRIM), borderColor: 'rgba(255,92,92,.5)', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, fill: false, yAxisID: 'y'},
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {legend: {display: true, labels: {color: '#8A97B5', font: {family: 'DM Mono', size: 11}, boxWidth: 12}},
        tooltip: {callbacks: {label: c => c.dataset.label + ': ' + fmtBR(c.parsed.y)}}},
      scales: {
        x: {ticks: {color: '#4A5568', font: {family: 'DM Mono', size: 10}, maxRotation: 0, autoSkip: true, maxTicksLimit: 8}, grid: {color: 'rgba(255,255,255,.04)'}},
        y: {position: 'left', ticks: {color: '#00E5A0', font: {family: 'DM Mono', size: 10}, callback: v => v >= 1000000 ? 'R$' + (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? 'R$' + Math.round(v / 1000) + 'k' : fmtBR(v)}, grid: {color: 'rgba(255,255,255,.04)'}},
        y2: {position: 'right', ticks: {color: '#FFB020', font: {family: 'DM Mono', size: 10}, callback: v => fmtBR(v)}, grid: {display: false}}
      }
    }
  });
}

// ─── BAZIN / PREÇO TETO ──────────────────────────────────
function getBazinHist(){
  try { return JSON.parse(localStorage.getItem(BAZIN_KEY) || '[]'); }
  catch(e){ return []; }
}
function saveBazinHist(hist){
  localStorage.setItem(BAZIN_KEY, JSON.stringify(hist));
}

function calcBazin(silent){
  const ticker = (document.getElementById('bazin-ticker').value || '').trim().toUpperCase();
  const div    = parseFloat(document.getElementById('bazin-div').value) || 0;
  const preco  = parseFloat(document.getElementById('bazin-preco').value) || 0;
  const nome   = document.getElementById('bazin-nome').value || ticker;

  if(!div){
    if(silent !== true) alert('Informe o dividendo anual para calcular.');
    return;
  }

  const teto   = div / 0.06;
  const dyReal = preco > 0 ? (div / preco * 100) : 0;
  const margem = preco > 0 ? ((teto - preco) / teto * 100) : 0;

  document.getElementById('bazin-result').style.display = 'block';
  document.getElementById('bazin-metrics').innerHTML = `
    <div class="bazin-result-metric">
      <div class="bazin-result-label">Preço Teto Bazin</div>
      <div class="bazin-result-val" style="color:var(--green)">R$ ${teto.toFixed(2).replace('.', ',')}</div>
    </div>
    <div class="bazin-result-metric">
      <div class="bazin-result-label">DY ao preço atual</div>
      <div class="bazin-result-val" style="color:${dyReal >= 6 ? 'var(--green)' : dyReal >= 4 ? 'var(--amber)' : 'var(--red)'}">
        ${preco > 0 ? dyReal.toFixed(2).replace('.', ',') + ' %' : '—'}
      </div>
    </div>
    <div class="bazin-result-metric">
      <div class="bazin-result-label">Margem de segurança</div>
      <div class="bazin-result-val" style="color:${margem > 15 ? 'var(--green)' : margem > 0 ? 'var(--amber)' : 'var(--red)'}">
        ${preco > 0 ? (margem > 0 ? '+' : '') + margem.toFixed(1).replace('.', ',') + ' %' : '—'}
      </div>
    </div>`;

  let verdictClass, verdictIcon, verdictText;
  const tetoFmt  = teto.toFixed(2).replace('.', ',');
  const precoFmt = preco.toFixed(2).replace('.', ',');
  if(preco <= 0){
    verdictClass = 'atencao'; verdictIcon = 'ℹ️';
    verdictText = `Preço teto calculado: <strong>R$ ${tetoFmt}</strong>. Informe o preço atual para ver o veredicto de compra.`;
  } else if(preco <= teto * 0.90){
    verdictClass = 'comprar'; verdictIcon = '✅';
    verdictText = `<strong>ABAIXO DO TETO</strong> com ${margem.toFixed(1).replace('.', ',')}% de margem de segurança. Preço teto: R$ ${tetoFmt} · Atual: R$ ${precoFmt}. Dentro da zona de compra pelo método Bazin.`;
  } else if(preco <= teto){
    verdictClass = 'atencao'; verdictIcon = '⚠️';
    verdictText = `<strong>PRÓXIMO DO TETO</strong> — margem de segurança pequena (${margem.toFixed(1).replace('.', ',')}%). Preço teto: R$ ${tetoFmt} · Atual: R$ ${precoFmt}. Compra aceitável mas sem folga.`;
  } else {
    verdictClass = 'caro'; verdictIcon = '⛔';
    verdictText = `<strong>ACIMA DO TETO</strong> — ${Math.abs(margem).toFixed(1).replace('.', ',')}% mais caro que o limite. Preço teto: R$ ${tetoFmt} · Atual: R$ ${precoFmt}. Aguarde correção antes de comprar.`;
  }

  document.getElementById('bazin-verdict').innerHTML =
    `<div class="verdict ${verdictClass}">${verdictIcon} ${verdictText}</div>`;

  if(ticker){
    const hist = getBazinHist().filter(h => h.ticker !== ticker);
    hist.unshift({ticker, nome, div, preco: preco || null, teto, dyReal: preco > 0 ? dyReal : null, date: new Date().toLocaleDateString('pt-BR')});
    saveBazinHist(hist.slice(0, 20));
    renderBazinHist();
  }
}

function renderBazinHist(){
  const hist = getBazinHist();
  const box  = document.getElementById('bazin-hist-box');
  const list = document.getElementById('bazin-hist-list');
  if(!box || !list) return;

  if(!hist.length){ box.style.display = 'none'; return; }
  box.style.display = 'block';

  list.innerHTML = hist.map(h => `
    <div class="bazin-hist-item">
      <span class="bazin-hist-ticker">${esc(h.ticker)}</span>
      <div class="bazin-hist-vals">
        <span class="bazin-hist-val">Div: <span>R$ ${(h.div || 0).toFixed(2).replace('.', ',')}</span></span>
        <span class="bazin-hist-val">Teto: <span style="color:var(--green)">R$ ${(h.teto || 0).toFixed(2).replace('.', ',')}</span></span>
        ${h.preco ? `<span class="bazin-hist-val">Atual: <span style="color:${h.preco <= h.teto ? 'var(--green)' : 'var(--red)'}">R$ ${h.preco.toFixed(2).replace('.', ',')}</span></span>` : ''}
        ${h.dyReal ? `<span class="bazin-hist-val">DY: <span>${h.dyReal.toFixed(1).replace('.', ',')}%</span></span>` : ''}
      </div>
      <span style="font-size:10px;color:var(--text3);font-family:'DM Mono',monospace;white-space:nowrap">${esc(h.date)}</span>
    </div>`).join('');
}

function clearBazinHist(){
  if(!confirm('Limpar todos os cálculos salvos?')) return;
  localStorage.removeItem(BAZIN_KEY);
  renderBazinHist();
}

// ─── DESTAQUES BEST (IA) ─────────────────────────────────
async function loadDestaques(){
  const wrap = document.getElementById('dest-wrap');
  const btn  = document.getElementById('dest-btn');

  const apiKey = requireApiKey();
  if(!apiKey){ showNoKeyMessage('dest-wrap', btn, '✨ Ver destaques'); return; }

  btn.textContent = '⏳ Analisando...';
  btn.disabled = true;

  wrap.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
    ${[0, 1, 2].map(i => `<div class="info-loading"><span class="spin">⟳</span><span>Pesquisando destaque ${i + 1}...</span></div>`).join('')}
  </div>`;

  try {
    const carteiraAtual = COMPANIES.map(c => c.ticker).join(', ');
    const prompt = `Você é um analista de ações brasileiras especializado no método BEST (Bancos, Energia, Saneamento, Seguros, Telecom) para investidores de dividendos de longo prazo.

A carteira atual do investidor já possui: ${carteiraAtual}. NÃO inclua nenhum desses tickers nos destaques — sugira apenas ações que ele ainda não tem.

IMPORTANTE: use a busca na web para obter o PREÇO ATUAL real e os dividendos efetivamente pagos nos últimos 12 meses de cada ação antes de responder. Não use valores de memória.

Escolha as 3 melhores ações do método BEST disponíveis na B3 agora, priorizando:
1. Estar abaixo ou próxima do preço teto (dividendo anual ÷ 6%)
2. DY acima de 6% a.a.
3. Histórico consistente de pelo menos 5 anos pagando dividendos
4. Lucro operacional recorrente e crescente

Após pesquisar, responda SOMENTE com JSON válido, sem markdown:
{
  "destaques": [
    {
      "ticker": "string",
      "nome": "string",
      "setor": "string",
      "preco_atual": "string ex: R$ 37,44",
      "preco_teto_bazin": "string ex: R$ 42,00",
      "status_teto": "abaixo|proximo|acima",
      "dy_estimado": "string ex: 7,8%",
      "ultimo_dividendo_anual": "string ex: R$ 2,52",
      "pontos_fortes": "string em português, máximo 2 frases",
      "ponto_atencao": "string em português, 1 frase sobre o principal risco"
    }
  ]
}`;

    const raw = await callClaude(apiKey, prompt, 3000);
    const json = parseJsonResponse(raw);
    const destaques = json.destaques || [];
    if(!destaques.length) throw new Error('A IA não retornou destaques. Tente novamente.');

    const DEST_COLORS = ['d0', 'd1', 'd2'];
    wrap.innerHTML = `<div class="dest-grid">${destaques.slice(0, 3).map((d, i) => `
      <div class="dest-card ${DEST_COLORS[i]}" style="animation:fadeUp .4s ${i * .1}s ease both">
        <div class="dest-head">
          <div>
            <div class="dest-ticker">${esc(d.ticker)}</div>
            <div style="font-size:11px;color:var(--text2);font-family:'DM Mono',monospace">${esc(d.setor)}</div>
          </div>
          <span class="dest-teto-badge ${d.status_teto === 'abaixo' ? 'dest-teto-ok' : 'dest-teto-warn'}">
            ${d.status_teto === 'abaixo' ? '✓ Abaixo do teto' : d.status_teto === 'proximo' ? '⚠ Próximo do teto' : '⛔ Acima do teto'}
          </span>
        </div>
        <div class="dest-metrics">
          <div class="dest-metric">
            <div class="dest-metric-lbl">Preço atual</div>
            <div class="dest-metric-val">${esc(d.preco_atual)}</div>
          </div>
          <div class="dest-metric">
            <div class="dest-metric-lbl">Preço teto</div>
            <div class="dest-metric-val" style="color:var(--green)">${esc(d.preco_teto_bazin)}</div>
          </div>
          <div class="dest-metric">
            <div class="dest-metric-lbl">DY estimado</div>
            <div class="dest-metric-val" style="color:var(--green)">${esc(d.dy_estimado)}</div>
          </div>
          <div class="dest-metric">
            <div class="dest-metric-lbl">Div. anual</div>
            <div class="dest-metric-val">${esc(d.ultimo_dividendo_anual)}</div>
          </div>
        </div>
        <div class="dest-why">
          <div style="margin-bottom:6px">${esc(d.pontos_fortes)}</div>
          <div style="color:var(--amber);font-size:11px">⚠ ${esc(d.ponto_atencao)}</div>
        </div>
      </div>`).join('')}
    </div>
    ${AI_DISCLAIMER}
    <div style="font-size:11px;color:var(--text3);font-family:'DM Mono',monospace;text-align:right;margin-top:10px">
      Análise IA com busca na web · ${new Date().toLocaleString('pt-BR')}
    </div>`;

  } catch(err){
    console.error('Destaques erro:', err);
    wrap.innerHTML = `<div class="info-error">⚠️ ${esc(err.message || 'Não foi possível carregar os destaques. Tente novamente.')}</div>`;
  }

  btn.textContent = '✨ Ver destaques';
  btn.disabled = false;
}

// ─── BALANÇO TRIMESTRAL (IA) ─────────────────────────────
let infoCache = {}; // cache por ticker para não chamar a API toda vez

async function loadInfoPanel(){
  const wrap = document.getElementById('info-cards-wrap');
  const btn  = document.getElementById('info-refresh-btn');

  const apiKey = requireApiKey();
  if(!apiKey){ showNoKeyMessage('info-cards-wrap', btn, '🔍 Analisar carteira'); return; }

  btn.textContent = '⏳ Analisando...';
  btn.disabled = true;

  wrap.innerHTML = `<div class="info-grid">${COMPANIES.map(c => `
    <div class="info-loading">
      <span class="spin">⟳</span>
      <span>Pesquisando dados de <strong>${esc(c.ticker)}</strong>...</span>
    </div>
  `).join('')}</div>`;

  // Se houver token da brapi, busca os preços reais primeiro e os
  // injeta no prompt — a IA usa o preço de mercado como verdade.
  let realPrices = {};
  if(getBrapiToken()){
    try { realPrices = await fetchQuotes(COMPANIES.map(c => c.ticker)); }
    catch(e){ console.warn('brapi indisponível, seguindo só com busca na web:', e); }
  }

  const results = await Promise.all(COMPANIES.map((c, i) => fetchCompanyInfo(c, i, apiKey, realPrices[c.ticker])));

  wrap.innerHTML = `<div class="info-grid">${results.map(r => r.html).join('')}</div>
    ${AI_DISCLAIMER}
    <div class="info-last-update">Última análise: ${new Date().toLocaleString('pt-BR')}</div>`;

  btn.textContent = '🔍 Analisar carteira';
  btn.disabled = false;
}

async function fetchCompanyInfo(company, idx, apiKey, realPrice){
  try {
    const priceLine = (typeof realPrice === 'number')
      ? `\nDADO CONFIRMADO — preço atual de mercado de ${company.ticker} (fonte: brapi.dev, agora): R$ ${realPrice.toFixed(2)}. Use este preço como verdade absoluta nos cálculos de DY.\n`
      : '';
    const prompt = `Você é um analista financeiro especializado em ações brasileiras pagadoras de dividendos.

Analise a empresa ${company.ticker} (${company.name}) do setor de ${company.sector}.
${priceLine}

IMPORTANTE: use a busca na web para obter os dados REAIS e ATUAIS — resultados do último trimestre divulgado, dividendos efetivamente pagos nos últimos 12 meses, ROE e margem líquida reportados. Não use valores de memória nem estimativas inventadas.

Após pesquisar, responda SOMENTE com um JSON válido, sem markdown, sem texto antes ou depois. Formato exato:
{
  "trimestre": "string com o último trimestre divulgado ex: 1T26",
  "dy_12m": "string ex: 7,8%",
  "ultimo_dividendo": "string ex: R$ 0,42 por ação",
  "roe": "string ex: 22,3%",
  "margem_liquida": "string ex: 31,5%",
  "variacao_lucro": "string ex: +12,4% vs trimestre anterior",
  "tendencia_lucro": "up|down|neu",
  "recomendacao": "COMPRAR|MANTER|AGUARDAR",
  "motivo_recomendacao": "string curta em português, máximo 2 frases explicando o motivo",
  "resumo": "string em português, máximo 3 frases sobre o desempenho recente e perspectivas de dividendos"
}

Se algum dado não for encontrado na pesquisa, use "n/d" no campo correspondente — nunca invente um número.`;

    const raw  = await callClaude(apiKey, prompt, 2500);
    const info = parseJsonResponse(raw);

    infoCache[company.ticker] = info;
    return { html: buildInfoCard(company, idx, info) };

  } catch(err){
    console.error(`Erro ao buscar ${company.ticker}:`, err);
    return { html: `
      <div class="info-card" style="${cardStyle(getColorHex(company, idx))}">
        <div class="info-card-head">
          <div><div class="info-ticker">${esc(company.ticker)}</div><div class="info-quarter">${esc(company.name)}</div></div>
        </div>
        <div class="info-error">⚠️ ${esc(err.message || 'Não foi possível carregar os dados. Tente novamente.')}</div>
      </div>` };
  }
}

function buildInfoCard(company, idx, info){
  const recClass = {
    'COMPRAR':  'rec-comprar',
    'MANTER':   'rec-manter',
    'AGUARDAR': 'rec-aguardar'
  }[info.recomendacao] || 'rec-manter';

  const recIcon = {
    'COMPRAR':  '✅',
    'MANTER':   '⏸️',
    'AGUARDAR': '⛔'
  }[info.recomendacao] || '⏸️';

  const tendIcon  = info.tendencia_lucro === 'up' ? '↑' : info.tendencia_lucro === 'down' ? '↓' : '→';
  const tendClass = info.tendencia_lucro === 'up' ? 'up' : info.tendencia_lucro === 'down' ? 'down' : 'neu';

  return `
  <div class="info-card" style="${cardStyle(getColorHex(company, idx))};animation:fadeUp .5s ease both">
    <div class="info-card-head">
      <div>
        <div class="info-ticker">${esc(company.ticker)}</div>
        <div class="info-quarter">${esc(company.name)} · ${esc(info.trimestre)}</div>
      </div>
      <span class="rec-badge ${recClass}">${recIcon} ${esc(info.recomendacao)}</span>
    </div>

    <div class="info-metrics">
      <div class="info-metric">
        <div class="info-metric-label">DY 12 meses</div>
        <div class="info-metric-val up">${esc(info.dy_12m)}</div>
      </div>
      <div class="info-metric">
        <div class="info-metric-label">Último dividendo</div>
        <div class="info-metric-val">${esc(info.ultimo_dividendo)}</div>
      </div>
      <div class="info-metric">
        <div class="info-metric-label">ROE</div>
        <div class="info-metric-val">${esc(info.roe)}</div>
      </div>
      <div class="info-metric">
        <div class="info-metric-label">Margem líquida</div>
        <div class="info-metric-val">${esc(info.margem_liquida)}</div>
      </div>
      <div class="info-metric" style="grid-column:1/-1">
        <div class="info-metric-label">Variação do lucro</div>
        <div class="info-metric-val ${tendClass}">${tendIcon} ${esc(info.variacao_lucro)}</div>
      </div>
    </div>

    <div style="background:var(--bg3);border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:var(--text2);line-height:1.6">
      <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:4px">Por que ${esc(info.recomendacao)}?</span>
      ${esc(info.motivo_recomendacao)}
    </div>

    <div class="info-summary">${esc(info.resumo)}</div>
  </div>`;
}

// ─── PIN DE 4 DÍGITOS ────────────────────────────────────
// Proteção contra acesso casual em dispositivos compartilhados.
// O PIN nunca é salvo em texto: guarda-se apenas o hash SHA-256
// com salt aleatório. Após 10 tentativas erradas, TODOS os dados
// do app são apagados, sem recuperação.
//
// Limitação honesta: como o app é 100% local, alguém com acesso
// técnico ao navegador (DevTools) consegue ler o localStorage sem
// o PIN. Isso protege de curiosos, não de peritos.
const PIN_HASH_KEY     = 'best_pin_hash';
const PIN_SALT_KEY     = 'best_pin_salt';
const PIN_ATTEMPTS_KEY = 'best_pin_attempts';
const PIN_MAX_ATTEMPTS = 10;

let pinBuffer = '';

function pinEnabled(){ return !!localStorage.getItem(PIN_HASH_KEY); }

async function hashPin(pin, salt){
  const data = new TextEncoder().encode(salt + ':' + pin);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(){
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPin(pin){
  const salt = localStorage.getItem(PIN_SALT_KEY) || '';
  const hash = await hashPin(pin, salt);
  return hash === localStorage.getItem(PIN_HASH_KEY);
}

// Apaga TODOS os dados do app (acionado após 10 erros de PIN)
function wipeAllData(){
  [STORAGE_KEY, 'best_companies', BAZIN_KEY, APIKEY_KEY, BRAPI_KEY,
   PIN_HASH_KEY, PIN_SALT_KEY, PIN_ATTEMPTS_KEY].forEach(k => localStorage.removeItem(k));
}

function getPinAttempts(){ return parseInt(localStorage.getItem(PIN_ATTEMPTS_KEY)) || 0; }
function setPinAttempts(n){ localStorage.setItem(PIN_ATTEMPTS_KEY, String(n)); }

// ── Tela de bloqueio ──
function showLockScreen(){
  pinBuffer = '';
  const lock = document.getElementById('pin-lock');
  if(!lock) return;
  lock.style.display = 'flex';
  updatePinDots();
  updatePinAttemptsMsg();
}

function hideLockScreen(){
  const lock = document.getElementById('pin-lock');
  if(lock) lock.style.display = 'none';
}

function updatePinDots(){
  for(let i = 0; i < 4; i++){
    const dot = document.getElementById('pin-dot-' + i);
    if(dot) dot.classList.toggle('filled', i < pinBuffer.length);
  }
}

function updatePinAttemptsMsg(extra){
  const el = document.getElementById('pin-msg');
  if(!el) return;
  const left = PIN_MAX_ATTEMPTS - getPinAttempts();
  if(extra){
    el.style.color = 'var(--red)';
    el.textContent = extra;
  } else if(left <= 5){
    el.style.color = 'var(--red)';
    el.textContent = `⚠️ ${left} tentativa(s) restante(s) antes do apagamento dos dados`;
  } else {
    el.style.color = 'var(--text3)';
    el.textContent = '';
  }
}

function pinPress(d){
  if(pinBuffer.length >= 4) return;
  pinBuffer += String(d);
  updatePinDots();
  if(pinBuffer.length === 4) submitPin();
}

function pinBackspace(){
  pinBuffer = pinBuffer.slice(0, -1);
  updatePinDots();
}

async function submitPin(){
  const pin = pinBuffer;
  pinBuffer = '';
  const ok = await verifyPin(pin);
  if(ok){
    setPinAttempts(0);
    hideLockScreen();
    startApp();
    return;
  }
  const attempts = getPinAttempts() + 1;
  setPinAttempts(attempts);
  if(attempts >= PIN_MAX_ATTEMPTS){
    wipeAllData();
    const lock = document.getElementById('pin-lock');
    if(lock) lock.innerHTML = `<div style="text-align:center;padding:30px;max-width:320px">
      <div style="font-size:40px;margin-bottom:14px">🗑️</div>
      <div style="font-family:'DM Serif Display',serif;font-size:20px;color:var(--text);margin-bottom:10px">Dados apagados</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.7">O limite de ${PIN_MAX_ATTEMPTS} tentativas foi atingido e todos os dados deste app foram removidos do dispositivo, conforme configurado.</div>
      <button class="save-btn" style="margin-top:20px" onclick="location.reload()">Recomeçar</button>
    </div>`;
    return;
  }
  updatePinDots();
  const wrap = document.getElementById('pin-dots');
  if(wrap){
    wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
  }
  updatePinAttemptsMsg();
  if(PIN_MAX_ATTEMPTS - attempts > 5) updatePinAttemptsMsg('PIN incorreto');
}

// ── Configuração do PIN (aba Config) ──
function renderPinBox(){
  const wrap = document.getElementById('pin-config-body');
  if(!wrap) return;
  if(pinEnabled()){
    wrap.innerHTML = `
      <p style="font-size:12px;color:var(--green);margin-bottom:12px;font-family:'DM Mono',monospace">✓ PIN ativo — o app pede a senha ao abrir.</p>
      <div class="backup-row">
        <button class="backup-btn" onclick="changePin()">✏️ Alterar PIN</button>
        <button class="backup-btn" style="border-color:rgba(255,92,92,.3);color:var(--red)" onclick="disablePin()">🗑 Remover PIN</button>
      </div>`;
  } else {
    wrap.innerHTML = `
      <div class="backup-row">
        <button class="backup-btn" onclick="enablePin()">🔐 Criar PIN de 4 dígitos</button>
      </div>`;
  }
}

function askPin(label){
  const v = prompt(label);
  if(v === null) return null;
  if(!/^\d{4}$/.test(v.trim())){ alert('O PIN deve ter exatamente 4 dígitos numéricos.'); return null; }
  return v.trim();
}

async function enablePin(){
  alert('⚠️ IMPORTANTE: não existe recuperação de PIN.\n\nSe você errar 10 vezes, TODOS os dados do app serão apagados.\n\nRecomendamos exportar um backup (nesta mesma aba) antes de ativar.');
  const p1 = askPin('Digite o novo PIN de 4 dígitos:');
  if(p1 === null) return;
  const p2 = askPin('Confirme o PIN:');
  if(p2 === null) return;
  if(p1 !== p2){ alert('Os PINs não conferem. Tente novamente.'); return; }
  const salt = randomSalt();
  localStorage.setItem(PIN_SALT_KEY, salt);
  localStorage.setItem(PIN_HASH_KEY, await hashPin(p1, salt));
  setPinAttempts(0);
  renderPinBox();
  alert('✓ PIN ativado! Será solicitado na próxima vez que o app abrir.');
}

async function changePin(){
  const cur = askPin('Digite o PIN atual:');
  if(cur === null) return;
  if(!(await verifyPin(cur))){ alert('PIN atual incorreto.'); return; }
  const p1 = askPin('Digite o novo PIN:');
  if(p1 === null) return;
  const p2 = askPin('Confirme o novo PIN:');
  if(p2 === null) return;
  if(p1 !== p2){ alert('Os PINs não conferem.'); return; }
  const salt = randomSalt();
  localStorage.setItem(PIN_SALT_KEY, salt);
  localStorage.setItem(PIN_HASH_KEY, await hashPin(p1, salt));
  setPinAttempts(0);
  alert('✓ PIN alterado!');
}

async function disablePin(){
  const cur = askPin('Digite o PIN atual para remover a proteção:');
  if(cur === null) return;
  if(!(await verifyPin(cur))){ alert('PIN incorreto.'); return; }
  localStorage.removeItem(PIN_HASH_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
  setPinAttempts(0);
  renderPinBox();
  alert('PIN removido. O app não pedirá mais senha ao abrir.');
}


// ─── CONFIG: CARTEIRA (edição com rascunho) ──────────────
// As edições ficam num rascunho (configDraft) e só são
// aplicadas ao estado real quando o usuário clica em Salvar.
let configDraft = null;

function renderConfig(){
  const apikeyInp = document.getElementById('apikey-input');
  if(apikeyInp) apikeyInp.value = getApiKey();
  const brapiInp = document.getElementById('brapi-input');
  if(brapiInp) brapiInp.value = getBrapiToken();
  renderPinBox();

  configDraft = JSON.parse(JSON.stringify(COMPANIES)); // cópia profunda
  renderConfigList();
}

function renderConfigList(){
  const wrap = document.getElementById('config-list');
  if(!wrap || !configDraft) return;
  wrap.innerHTML = configDraft.map((c, i) => `
    <div class="box" style="margin-bottom:10px;border-left:3px solid ${getColorHex(c, i)}">
      <div style="font-family:'DM Serif Display',serif;font-size:16px;color:var(--text);margin-bottom:12px">${esc(c.ticker)} — ${esc(c.name)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="input-group"><label>Ticker</label><div class="inp-wrap"><input class="inp sm" style="padding-left:12px" value="${esc(c.ticker)}" oninput="configDraft[${i}].ticker=this.value.trim().toUpperCase()"></div></div>
        <div class="input-group"><label>Nome</label><div class="inp-wrap"><input class="inp sm" style="padding-left:12px" value="${esc(c.name)}" oninput="configDraft[${i}].name=this.value"></div></div>
        <div class="input-group"><label>Setor</label><div class="inp-wrap"><input class="inp sm" style="padding-left:12px" value="${esc(c.sector)}" oninput="configDraft[${i}].sector=this.value"></div></div>
        <div class="input-group"><label>DY anual (ex: 0.078 = 7,8%)</label><div class="inp-wrap"><input class="inp sm" style="padding-left:12px" type="number" step="0.001" min="0" max="1" value="${c.dy}" oninput="configDraft[${i}].dy=Math.min(1,Math.max(0,parseFloat(this.value)||0))"></div></div>
        <div class="input-group"><label>Preço teto (R$)</label><div class="inp-wrap"><span class="inp-pre">R$</span><input class="inp sm" type="number" min="0" value="${c.teto}" oninput="configDraft[${i}].teto=Math.max(0,parseFloat(this.value)||0)"></div></div>
        <div class="input-group"><label>Peso inicial (%)</label><div class="inp-wrap"><input class="inp sm" style="padding-left:12px" type="number" min="0" max="100" value="${c.peso}" oninput="configDraft[${i}].peso=Math.min(100,Math.max(0,parseInt(this.value)||0))"></div></div>
      </div>
      <button class="del-btn" style="font-size:12px;padding:6px 14px" onclick="removeCompanyDraft(${i})">🗑 Remover empresa</button>
    </div>
  `).join('');
}

function addCompany(){
  if(!configDraft) configDraft = JSON.parse(JSON.stringify(COMPANIES));
  const idx = configDraft.length;
  configDraft.push({ticker:'NOVA3', name:'Nova Empresa', sector:'Setor', color:getColorHex({}, idx), dy:0.08, teto:0, peso:10, risco:'Médio', anos:'0 anos'});
  renderConfigList();
}

function removeCompanyDraft(i){
  if(!confirm('Remover empresa? (a remoção só é aplicada ao clicar em "Salvar Alterações")')) return;
  configDraft.splice(i, 1);
  renderConfigList();
}

function saveAllCompanies(){
  if(!configDraft) return;
  if(!configDraft.length){ alert('A carteira precisa de pelo menos uma empresa.'); return; }

  // valida tickers duplicados
  const tickers = configDraft.map(c => c.ticker);
  if(new Set(tickers).size !== tickers.length){
    alert('Existem tickers duplicados. Corrija antes de salvar.');
    return;
  }

  // fixa cor estável (hex) para cada empresa
  configDraft.forEach((c, i) => { c.color = getColorHex(c, i); });

  COMPANIES = JSON.parse(JSON.stringify(configDraft));
  saveCompanies();
  pesos   = COMPANIES.map(c => c.peso || 10);
  enabled = COMPANIES.map(() => true);
  infoCache = {};
  buildCompanyCards();
  renderAportePanel();
  updateCalc();
  renderConfigList();
  alert('Alterações salvas');
}

// ─── BACKUP: EXPORTAR / IMPORTAR ─────────────────────────
function showBackupStatus(msg, color){
  const el = document.getElementById('backup-status');
  if(!el) return;
  el.style.color = color;
  el.textContent = msg;
  setTimeout(()=>{ el.textContent=''; }, 5000);
}

function downloadFile(filename, content, mime){
  const blob = new Blob([content], {type: mime});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportData(){
  // A chave de API NÃO é incluída no backup, por segurança.
  const payload = {
    app: 'calculadora-dividendos-best',
    version: 1,
    exported_at: new Date().toISOString(),
    companies: COMPANIES,
    aportes: aportes,
    bazin_hist: getBazinHist()
  };
  const stamp = new Date().toISOString().slice(0, 10);
  downloadFile(`dividendos-best-backup-${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json');
  showBackupStatus('✓ Backup exportado! Guarde o arquivo em local seguro.', 'var(--green)');
}

function exportCSV(){
  const keys = Object.keys(aportes).sort();
  if(!keys.length){ showBackupStatus('⚠️ Nenhum aporte registrado para exportar.', 'var(--amber)'); return; }
  const tickers = COMPANIES.map(c => c.ticker);
  const header  = ['Mes', ...tickers, 'Total'].join(';');
  const rows = keys.map(k => {
    const row  = aportes[k] || {};
    const vals = tickers.map(t => String(row[t] || 0).replace('.', ','));
    const tot  = tickers.reduce((s, t) => s + (row[t] || 0), 0);
    return [k, ...vals, String(tot).replace('.', ',')].join(';');
  });
  // BOM para o Excel brasileiro reconhecer acentos e ; como separador
  downloadFile('dividendos-best-aportes.csv', '\uFEFF' + [header, ...rows].join('\r\n'), 'text/csv;charset=utf-8');
  showBackupStatus('✓ CSV de aportes exportado!', 'var(--green)');
}

function importData(input){
  const file = input.files && input.files[0];
  input.value = ''; // permite reimportar o mesmo arquivo
  if(!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if(data.app !== 'calculadora-dividendos-best' || !Array.isArray(data.companies) || typeof data.aportes !== 'object'){
        throw new Error('Arquivo não reconhecido como backup desta calculadora.');
      }
      const companies = sanitizeCompanies(data.companies);
      if(!companies || !companies.length) throw new Error('O backup não contém empresas válidas.');
      // Sanitiza aportes: só pares mês → {ticker: número}
      const cleanAportes = {};
      for(const [k, v] of Object.entries(data.aportes || {})){
        if(!/^\d{4}-\d{2}$/.test(k) || typeof v !== 'object' || !v) continue;
        cleanAportes[k] = {};
        for(const [t, val] of Object.entries(v)){
          cleanAportes[k][String(t).slice(0, 12)] = Math.max(0, parseFloat(val) || 0);
        }
      }
      const nMeses = Object.keys(cleanAportes).length;
      if(!confirm(`Importar backup de ${data.exported_at ? new Date(data.exported_at).toLocaleDateString('pt-BR') : 'data desconhecida'}?\n\n` +
        `· ${companies.length} empresa(s)\n· ${nMeses} mês(es) de aportes\n\n` +
        `⚠️ Isso SUBSTITUI os dados atuais do app.`)) return;

      COMPANIES = companies;
      aportes   = cleanAportes;
      saveCompanies();
      await saveData();
      if(Array.isArray(data.bazin_hist)){
        saveBazinHist(data.bazin_hist.slice(0, 20).map(h => ({
          ticker: String(h?.ticker ?? '').slice(0, 12),
          nome:   String(h?.nome   ?? '').slice(0, 60),
          div:    Math.max(0, parseFloat(h?.div)  || 0),
          preco:  h?.preco ? Math.max(0, parseFloat(h.preco) || 0) : null,
          teto:   Math.max(0, parseFloat(h?.teto) || 0),
          dyReal: h?.dyReal ? Math.max(0, parseFloat(h.dyReal) || 0) : null,
          date:   String(h?.date ?? '').slice(0, 12)
        })).filter(h => h.ticker));
      }

      pesos   = COMPANIES.map(c => c.peso || 10);
      enabled = COMPANIES.map(() => true);
      infoCache = {};
      buildCompanyCards();
      renderAportePanel();
      updateCalc();
      renderConfig();
      showBackupStatus('✓ Backup importado com sucesso!', 'var(--green)');
    } catch(err){
      console.error('Import erro:', err);
      showBackupStatus('⚠️ ' + (err.message || 'Arquivo inválido.'), 'var(--red)');
    }
  };
  reader.onerror = () => showBackupStatus('⚠️ Não foi possível ler o arquivo.', 'var(--red)');
  reader.readAsText(file);
}

// ─── LISTENERS / INIT ────────────────────────────────────
document.getElementById('renda-slider').addEventListener('input', function(){
  document.getElementById('renda-input').value = this.value; updateCalc();
});
document.getElementById('renda-input').addEventListener('input', function(){
  const v = Math.min(15000, Math.max(1000, parseFloat(this.value) || 1000));
  document.getElementById('renda-slider').value = v; updateCalc();
});
document.getElementById('fixas-input').addEventListener('input', updateCalc);

// Bazin: Enter calcula
['bazin-ticker', 'bazin-div', 'bazin-preco', 'bazin-nome'].forEach(id => {
  const el = document.getElementById(id);
  if(el) el.addEventListener('keydown', e => { if(e.key === 'Enter') calcBazin(); });
});

async function startApp(){
  await loadData();
  buildCompanyCards();
  updateCalc();
}

(function init(){
  if(pinEnabled()){
    showLockScreen();
  } else {
    startApp();
  }
})();

// ─── PWA: SERVICE WORKER + INSTALL ───────────────────────
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/calculadora-dividendos/sw.js')
      .then(reg => console.log('[PWA] Service Worker registrado:', reg.scope))
      .catch(err => console.log('[PWA] Erro SW:', err));
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(() => {
    const banner = document.getElementById('install-banner');
    if(banner) banner.style.display = 'flex';
  }, 3000);
});

function installApp(){
  const banner = document.getElementById('install-banner');
  if(banner) banner.style.display = 'none';
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(r => {
      console.log('[PWA] Install choice:', r.outcome);
      deferredPrompt = null;
    });
  }
}

window.addEventListener('appinstalled', () => {
  const banner = document.getElementById('install-banner');
  if(banner) banner.style.display = 'none';
  console.log('[PWA] App instalado!');
});
