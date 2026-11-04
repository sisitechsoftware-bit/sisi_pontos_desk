<template>
  <div class="page">
    <!-- Cabeçalho -->
    <header class="flex flex-col gap-2">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h1 class="titulo">
          <svg class="icone" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M15 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
            <path d="m9 14 2 2 4-4" />
          </svg>
          Atendimentos
        </h1>

        <div class="flex items-center gap-2">
          <button type="button" class="btn" :disabled="loading" @click="carregar">
            <span aria-hidden="true">↻</span> Atualizar
          </button>
          <button type="button" class="btn btn-primary" @click="novoAtendimento">
            <span aria-hidden="true">+</span> Novo atendimento
          </button>
        </div>
      </div>
      <p class="text-2">Acompanhe os atendimentos em andamento e os pagamentos pendentes.</p>
    </header>

    <!-- Estado: falha ao carregar -->
    <div v-if="erro" class="alert alert-error" role="alert">
      <span><span class="alert-title">Não foi possível carregar os atendimentos.</span> {{ erro }}</span>
      <button type="button" class="btn btn-sm" @click="carregar">Tentar novamente</button>
    </div>

    <!-- Filtro por situação -->
    <div class="tabs abas" role="tablist" aria-label="Filtrar por situação" @keydown="teclaAba">
      <button v-for="a in ABAS" :id="`aba-${a.valor || 'todos'}`" :key="a.valor" type="button" role="tab"
        class="tab" :class="{ 'tab-active': filtro === a.valor }" :aria-selected="filtro === a.valor"
        :aria-controls="'painel-lista'" :tabindex="filtro === a.valor ? 0 : -1" @click="filtro = a.valor">
        {{ a.label }}
      </button>
    </div>

    <!-- Fundo escuro do painel de detalhes no celular -->
    <div v-if="info" class="sheet-backdrop" aria-hidden="true" @click="fecharDetalhe"></div>

    <div class="layout">
      <!-- ========== Coluna da lista ========== -->
      <section id="painel-lista" class="coluna-lista" role="tabpanel" :aria-busy="loading">
        <div class="form-control">
          <label class="sr-only" for="busca">Buscar nesta página</label>
          <div class="busca">
            <svg class="busca-icone" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input id="busca" v-model.trim="busca" class="input" type="search" autocomplete="off"
              placeholder="Buscar por nome, telefone ou cartão nesta página">
          </div>
        </div>

        <progress v-if="loading" class="progress" aria-label="Carregando atendimentos"></progress>
        <div v-else class="progress-espaco"></div>

        <!-- Skeleton no primeiro carregamento -->
        <ul v-if="loading && !itens.length" class="lista" aria-hidden="true">
          <li v-for="n in 6" :key="'sk' + n" class="linha linha-skel">
            <span class="skel skel-avatar"></span>
            <span class="linha-info">
              <span class="skel" style="width: 55%"></span>
              <span class="skel" style="width: 80%"></span>
            </span>
            <span class="linha-fim">
              <span class="skel" style="width: 64px"></span>
              <span class="skel" style="width: 72px"></span>
            </span>
          </li>
        </ul>

        <!-- Lista -->
        <ul v-else-if="visiveis.length" class="lista" :class="{ carregando: loading }" @keydown="teclaLista">
          <li v-for="a in visiveis" :key="a.id">
            <button type="button" class="linha" :class="[`st-${a.status}`, { sel: a.id === selecionadoId }]"
              :aria-current="a.id === selecionadoId ? 'true' : undefined"
              :aria-label="`${nomeDe(a)}, ${rotulo(a.status)}, ${moeda(a.valor_total)}. Abrir detalhes`"
              @click="selecionar(a, $event)">
              <span class="avatar" aria-hidden="true">{{ iniciais(nomeDe(a)) }}</span>

              <span class="linha-info">
                <strong class="semibold nome">{{ nomeDe(a) }}</strong>
                <span class="caption sub">{{ subtitulo(a) }}</span>
              </span>

              <span class="linha-fim">
                <span class="semibold num">{{ moeda(a.valor_total) }}</span>
                <span class="badge" :class="STATUS[a.status]?.badge">{{ rotulo(a.status) }}</span>
              </span>
            </button>
          </li>
        </ul>

        <!-- Estados vazios -->
        <div v-else-if="!erro && !loading" class="vazio card" role="status">
          <svg class="icone-vazio" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M15 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
            <path d="m9 14 2 2 4-4" />
          </svg>
          <h3>{{ tituloVazio }}</h3>
          <p class="text-2">{{ textoVazio }}</p>
          <button v-if="busca" type="button" class="btn mt-2" @click="busca = ''">Limpar busca</button>
          <button v-else-if="filtro" type="button" class="btn mt-2" @click="filtro = ''">Ver todos os atendimentos</button>
          <button v-else type="button" class="btn btn-primary mt-2" @click="novoAtendimento">+ Novo atendimento</button>
        </div>

        <!-- Rodapé: resumo + paginação -->
        <footer class="rodape">
          <small role="status">{{ resumo }}</small>

          <nav v-if="lastPage > 1" class="paginacao" aria-label="Paginação">
            <button type="button" class="btn btn-sm" :disabled="page <= 1 || loading" @click="irPara(page - 1)">‹
              Anterior</button>
            <template v-for="(p, i) in paginas" :key="i">
              <span v-if="p === '…'" class="reticencias" aria-hidden="true">…</span>
              <button v-else type="button" class="btn btn-sm" :class="{ 'btn-active': p === page }"
                :aria-current="p === page ? 'page' : undefined" :aria-label="`Página ${p}`" :disabled="loading"
                @click="irPara(p)">{{ p }}</button>
            </template>
            <button type="button" class="btn btn-sm" :disabled="page >= lastPage || loading"
              @click="irPara(page + 1)">Próxima ›</button>
          </nav>
        </footer>
      </section>

      <!-- ========== Painel de detalhes ========== -->
      <aside class="detalhe" :class="{ aberto: !!info }" aria-label="Detalhes do atendimento">
        <div v-if="info" class="card">
          <div class="card-body gap-4">
            <!-- Cliente -->
            <div class="flex items-center gap-3">
              <span class="avatar avatar-lg" aria-hidden="true">{{ iniciais(nomeDe(info)) }}</span>
              <div class="flex flex-col grow det-cliente">
                <h2 class="nome">{{ nomeDe(info) }}</h2>
                <span class="text-2">{{ info.cliente?.telefone ?? clienteDe(info)?.telefone ?? 'Sem telefone' }}</span>
                <span v-if="cartaoDe(info)" class="caption">Cartão {{ cartaoDe(info) }}</span>
              </div>
              <button ref="btnFecharEl" type="button" class="btn btn-ghost btn-square fechar-sheet"
                aria-label="Fechar detalhes" @click="fecharDetalhe">×</button>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <span class="badge" :class="STATUS[info.status]?.badge">{{ rotulo(info.status) }}</span>
              <span class="caption">Atendimento #{{ info.id }}</span>
              <span v-if="dataDe(info)" class="caption">· {{ dataDe(info) }}</span>
            </div>

            <progress v-if="detalheCarregando" class="progress" aria-label="Carregando detalhes"></progress>

            <!-- Itens do atendimento (aparece só se a API informar) -->
            <dl v-if="itensResumo.length" class="kv">
              <div v-for="r in itensResumo" :key="r.k" class="kv-linha">
                <dt>{{ r.rotulo }}</dt>
                <dd>{{ r.n }}</dd>
              </div>
            </dl>

            <!-- Pontos -->
            <dl class="kv">
              <div class="kv-linha">
                <dt>Pontos gerados</dt>
                <dd><span class="badge badge-primary">+{{ info.pontos_total ?? 0 }} pts</span></dd>
              </div>
              <div v-if="info.pontos_resgatados != null" class="kv-linha">
                <dt>Pontos resgatados</dt>
                <dd>{{ info.pontos_resgatados }} pts</dd>
              </div>
              <div class="kv-linha">
                <dt>Saldo anterior</dt>
                <dd>{{ info.pontos_anteriores ?? 0 }} pts</dd>
              </div>
            </dl>

            <!-- Valores -->
            <dl class="kv">
              <div class="kv-linha">
                <dt>Valor total</dt>
                <dd>{{ moeda(info.valor_total) }}</dd>
              </div>
              <div class="kv-linha kv-destaque">
                <dt>Valor a pagar</dt>
                <dd>{{ valorPagar }}</dd>
              </div>
            </dl>

            <p v-if="info.funcionario_id != null" class="caption">Atendido por funcionário #{{ info.funcionario_id }}</p>

            <!-- Ação principal muda conforme a situação -->
            <div class="flex flex-col gap-2">
              <button type="button" class="btn btn-block"
                :class="{ 'btn-primary': info.status !== 'pago' }" @click="abrirAtendimento(info)">
                {{ ACAO[info.status] ?? 'Ver detalhes' }}
              </button>
            </div>

            <!-- Ação destrutiva isolada e discreta -->
            <hr>
            <button type="button" class="btn btn-ghost btn-block btn-excluir" @click="pedirExclusao(info, $event)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
              Excluir atendimento
            </button>
          </div>
        </div>

        <!-- Painel vazio (desktop) -->
        <div v-else class="card detalhe-vazio">
          <div class="card-body">
            <h3>Nenhum atendimento selecionado</h3>
            <p class="text-2">Clique em um atendimento da lista para ver pontos, valores e as ações disponíveis.</p>
          </div>
        </div>
      </aside>
    </div>

    <!-- Confirmação de exclusão -->
    <dialog ref="dlgExcluir" class="modal" aria-labelledby="dlg-titulo" aria-describedby="dlg-desc"
      @cancel="aoCancelarDialogo" @close="aoFecharDialogo">
      <div class="modal-box">
        <div class="dlg-topo">
          <span class="dlg-icone" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v5M14 11v5" />
            </svg>
          </span>
          <h2 id="dlg-titulo" class="dlg-titulo">Excluir atendimento de {{ alvo ? nomeDe(alvo) : '' }}?</h2>
        </div>

        <p id="dlg-desc" class="text-2">
          O atendimento será removido do histórico.
          <strong class="aviso-final">Esta ação não pode ser desfeita.</strong>
        </p>

        <div v-if="alvo?.status === 'pago'" class="alert alert-warning" role="alert">
          <span><span class="alert-title">Este atendimento já foi pago.</span> Excluí-lo pode afetar o histórico financeiro e
            os pontos do cliente.</span>
        </div>

        <!-- Resumo: ajuda a confirmar que é o item certo -->
        <dl v-if="alvo" class="resumo">
          <div class="resumo-item">
            <dt>Situação</dt>
            <dd>{{ rotulo(alvo.status) }}</dd>
          </div>
          <div class="resumo-item">
            <dt>Valor total</dt>
            <dd>{{ moeda(alvo.valor_total) }}</dd>
          </div>
          <div class="resumo-item">
            <dt>Pontos</dt>
            <dd>{{ alvo.pontos_total ?? 0 }} pts</dd>
          </div>
        </dl>

        <div v-if="erroExclusao" class="alert alert-error" role="alert">
          <span><span class="alert-title">Não foi possível excluir.</span> {{ erroExclusao }}</span>
        </div>

        <progress v-if="excluindo" class="progress" aria-label="Excluindo"></progress>

        <div class="modal-action">
          <!-- Foco inicial na opção segura, para evitar exclusão por Enter acidental -->
          <button type="button" class="btn" autofocus :disabled="excluindo" @click="fecharDialogo">
            Manter atendimento
          </button>
          <button type="button" class="btn btn-error" :disabled="excluindo" @click="confirmarExclusao">
            <span v-if="excluindo" class="loading mini" aria-hidden="true"></span>
            {{ excluindo ? 'Excluindo…' : (erroExclusao ? 'Tentar novamente' : 'Excluir atendimento') }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Avisos (toast) -->
    <div class="toast" role="status" aria-live="polite">
      <div v-for="t in toasts" :key="t.id" class="alert" :class="`alert-${t.tipo}`">
        <span>{{ t.texto }}</span>
        <button type="button" class="btn btn-ghost btn-sm" aria-label="Fechar aviso" @click="fecharToast(t.id)">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* ---------- Configuração ---------- */
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8888/api-fidelidade/api'
const getToken = () => import.meta.env.VITE_API_TOKEN ?? localStorage.getItem('token') ?? 'seu-token-aqui'

// Ajuste conforme suas rotas
const ROTA_NOVO = '/atendimentos/novo'
const rotaDetalhe = id => `/atendimentos/${id}`

const urlAtendimento = id => `${API_URL}/atendimentos.php/${id}`
const urlCliente = id => `${API_URL}/clientes.php/${id}`

const LIMIT = 20

/* ---------- Situações ---------- */
const STATUS = {
  em_andamento: { label: 'Em atendimento', badge: 'badge-warning' },
  pago: { label: 'Pago', badge: 'badge-success' },
  nao_pago: { label: 'Não pago', badge: 'badge-error' },
}
const ABAS = [
  { valor: '', label: 'Todos' },
  { valor: 'em_andamento', label: 'Em atendimento' },
  { valor: 'pago', label: 'Pago' },
  { valor: 'nao_pago', label: 'Não pago' },
]
// O botão principal diz exatamente o que acontece, conforme a situação
const ACAO = {
  em_andamento: 'Continuar atendimento',
  nao_pago: 'Receber pagamento',
  pago: 'Ver detalhes',
}
const rotulo = s => STATUS[s]?.label ?? s ?? '—'

const route = useRoute()
const router = useRouter()

/* ---------- Estado ---------- */
const filtroInicial = ABAS.some(a => a.valor === route.query.status) ? String(route.query.status) : ''

const itens = ref([])
const total = ref(0)
const page = ref(Math.max(Number(route.query.page) || 1, 1))
const lastPage = ref(1)
const loading = ref(false)
const erro = ref('')
const busca = ref('')
const filtro = ref(filtroInicial)

// Clientes (a listagem traz só cliente_id; nome/telefone/cartão vêm de clientes.php)
const clientes = ref({})
let lotePromessa = null

// Seleção e detalhes
const selecionadoId = ref(null)
const detalhes = ref({})
const detalheCarregandoId = ref(null)
const btnFecharEl = ref(null)
const mobile = ref(false)
let mq = null
let gatilhoLinha = null

// Exclusão
const dlgExcluir = ref(null)
const alvo = ref(null)
const excluindo = ref(false)
const erroExclusao = ref('')
let gatilho = null

// Toasts
const toasts = ref([])
let toastSeq = 0
const timers = new Map()

let controller = null

const cabecalhos = () => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
})

const mensagemDeRede = e =>
  e instanceof TypeError ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente.' : e.message

function erroHttp(res, json) {
  if (res.status === 401 || res.status === 403) return 'Sessão expirada ou sem permissão. Faça login novamente.'
  return json?.error?.message || `O servidor respondeu com erro (${res.status}).`
}

/* ---------- Formatação ---------- */
const moeda = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0)

const semAcento = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function iniciais(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return '?'
  if (partes.length === 1) return partes[0][0].toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function dataDe(o) {
  const v = o?.created_at ?? o?.data_atendimento ?? o?.criado_em ?? o?.data
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/* ---------- Dados do cliente ---------- */
const clienteDe = a => clientes.value[a?.cliente_id] ?? a?.cliente ?? null
const nomeDe = a => clienteDe(a)?.nome ?? (a?.cliente_id != null ? `Cliente #${a.cliente_id}` : 'Cliente não informado')
const cartaoDe = a => clienteDe(a)?.numero_cartao ?? clienteDe(a)?.cartao ?? ''

function subtitulo(a) {
  const c = clienteDe(a)
  return [
    c?.telefone,
    cartaoDe(a) ? `Cartão ${cartaoDe(a)}` : null,
    `+${a.pontos_total ?? 0} pts`,
  ].filter(Boolean).join(' · ')
}

const extrairLista = json => json?.items ?? json?.data ?? (Array.isArray(json) ? json : [])

// Busca em lote uma vez (mesmo padrão da tela de clientes)
function carregarLote() {
  return (async () => {
    try {
      const res = await fetch(`${API_URL}/clientes.php?page=1&limit=100`, { headers: cabecalhos() })
      const json = await res.json().catch(() => null)
      if (!res.ok) return
      const mapa = { ...clientes.value }
      for (const c of extrairLista(json)) if (c?.id != null) mapa[c.id] = c
      clientes.value = mapa
    } catch { /* o fallback por id cobre os que faltarem */ }
  })()
}

// Fallback: busca individualmente quem não veio no lote
async function resolverClientes(lista) {
  const faltando = [...new Set(lista.map(a => a.cliente_id))].filter(id => id != null && !clientes.value[id])
  if (!faltando.length) return
  const resultados = await Promise.allSettled(faltando.map(async id => {
    const res = await fetch(urlCliente(id), { headers: cabecalhos() })
    if (!res.ok) throw new Error()
    const json = await res.json()
    return json?.data ?? json?.item ?? json
  }))
  const mapa = { ...clientes.value }
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value?.nome) mapa[faltando[i]] = r.value
  })
  clientes.value = mapa
}

/* ---------- Listagem ---------- */
async function carregar() {
  controller?.abort()
  const atual = new AbortController()
  controller = atual
  loading.value = true
  erro.value = ''
  detalhes.value = {}

  // Filtro e página na URL: o botão Voltar e o link compartilhado mantêm o contexto
  router.replace({ query: { ...route.query, status: filtro.value || undefined, page: page.value } })

  lotePromessa ??= carregarLote()

  try {
    const params = new URLSearchParams({ page: page.value, limit: LIMIT })
    if (filtro.value) params.set('status', filtro.value)

    const res = await fetch(`${API_URL}/atendimentos.php?${params}`, {
      method: 'GET',
      signal: atual.signal,
      headers: cabecalhos(),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(erroHttp(res, data))

    itens.value = Array.isArray(data?.items) ? data.items : []
    total.value = data?.total ?? itens.value.length
    lastPage.value = Math.max(data?.lastPage ?? 1, 1)

    // Página fora do intervalo (ex.: itens removidos): volta para a última
    if (page.value > lastPage.value) page.value = lastPage.value

    // Resolve nomes sem bloquear a lista
    const lista = itens.value
    lotePromessa.then(() => resolverClientes(lista))

    // Mantém a seleção só se o item ainda existe
    if (selecionadoId.value != null) {
      if (itens.value.some(a => a.id === selecionadoId.value)) carregarDetalhe(selecionadoId.value)
      else selecionadoId.value = null
    }
  } catch (e) {
    if (e.name === 'AbortError') return
    erro.value = mensagemDeRede(e)
    itens.value = []
    selecionadoId.value = null
  } finally {
    if (controller === atual) loading.value = false
  }
}

/* ---------- Lista visível (busca + defesa caso a API ignore o filtro) ---------- */
const visiveis = computed(() => {
  const termo = semAcento(busca.value).trim()
  return itens.value.filter(a => {
    if (filtro.value && a.status !== filtro.value) return false
    if (!termo) return true
    const c = clienteDe(a)
    return [c?.nome, c?.telefone, cartaoDe(a), a.id].some(v => semAcento(v).includes(termo))
  })
})

const tituloVazio = computed(() => {
  if (busca.value) return 'Nenhum resultado'
  if (filtro.value) return `Nenhum atendimento “${rotulo(filtro.value).toLowerCase()}”`
  return 'Nenhum atendimento ainda'
})
const textoVazio = computed(() => {
  if (busca.value) return 'Tente outro nome, telefone ou cartão, ou limpe a busca. A busca vale apenas para esta página.'
  if (filtro.value) return 'Quando houver atendimentos nesta situação, eles aparecem aqui.'
  return 'Inicie o primeiro atendimento para pontuar seus clientes.'
})

const resumo = computed(() => {
  if (loading.value && !itens.value.length) return 'Carregando…'
  if (!total.value) return 'Nenhum atendimento'
  const ini = (page.value - 1) * LIMIT + 1
  const fim = Math.min(page.value * LIMIT, total.value)
  const base = `Mostrando ${ini}–${fim} de ${total.value} atendimento${total.value > 1 ? 's' : ''}`
  return busca.value ? `${base} · ${visiveis.value.length} correspondem à busca` : base
})

// Janela de páginas: 1 … 4 5 [6] 7 8 … 20
const paginas = computed(() => {
  const t = lastPage.value, c = page.value
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  const nums = [...new Set([1, t, c - 1, c, c + 1])].filter(n => n >= 1 && n <= t).sort((a, b) => a - b)
  const out = []
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
})

function irPara(p) {
  if (p < 1 || p > lastPage.value || p === page.value) return
  page.value = p
}

/* ---------- Seleção e detalhes ---------- */
const selecionado = computed(() => itens.value.find(a => a.id === selecionadoId.value) ?? null)

// Mescla o que veio da lista com o detalhe completo (se a API tiver)
const info = computed(() => {
  const base = selecionado.value
  if (!base) return null
  const det = detalhes.value[base.id]
  return det && typeof det === 'object' ? { ...base, ...det } : base
})

const detalheCarregando = computed(() => detalheCarregandoId.value != null && detalheCarregandoId.value === selecionadoId.value)

const contagem = (o, k) => {
  const v = o?.[k]
  if (Array.isArray(v)) return v.length
  const n = o?.[`qtd_${k}`] ?? o?.[`total_${k}`]
  return n == null ? null : Number(n)
}

const itensResumo = computed(() => {
  if (!info.value) return []
  return [
    ['produtos', 'Produto', 'Produtos'],
    ['servicos', 'Serviço', 'Serviços'],
    ['beneficios', 'Benefício', 'Benefícios'],
  ]
    .map(([k, s, p]) => {
      const n = contagem(info.value, k)
      return n == null ? null : { k, n, rotulo: n === 1 ? s : p }
    })
    .filter(Boolean)
})

const valorPagar = computed(() => {
  const a = info.value
  if (!a) return ''
  if (a.status === 'em_andamento' && !Number(a.valor_final)) return 'Definido ao finalizar'
  return moeda(a.valor_final)
})

async function carregarDetalhe(id) {
  if (detalhes.value[id] !== undefined) return
  detalheCarregandoId.value = id
  try {
    const res = await fetch(urlAtendimento(id), { headers: cabecalhos() })
    const json = res.ok ? await res.json().catch(() => null) : null
    detalhes.value = { ...detalhes.value, [id]: json?.data ?? json?.item ?? json ?? null }
  } catch {
    detalhes.value = { ...detalhes.value, [id]: null } // a lista já tem o essencial
  } finally {
    if (detalheCarregandoId.value === id) detalheCarregandoId.value = null
  }
}

async function selecionar(a, evento) {
  gatilhoLinha = evento?.currentTarget ?? null
  selecionadoId.value = a.id
  carregarDetalhe(a.id)
  if (mobile.value) {
    await nextTick()
    btnFecharEl.value?.focus()
  }
}

function fecharDetalhe() {
  selecionadoId.value = null
  nextTick(() => gatilhoLinha?.isConnected && gatilhoLinha.focus())
}

/* ---------- Navegação ---------- */
const novoAtendimento = () => router.push(ROTA_NOVO)
const abrirAtendimento = a => router.push(rotaDetalhe(a.id))

/* ---------- Teclado ---------- */
// Abas: ← → Home End (padrão WAI-ARIA)
function teclaAba(e) {
  const i = ABAS.findIndex(a => a.valor === filtro.value)
  const n = ABAS.length
  let prox = null
  if (e.key === 'ArrowRight') prox = (i + 1) % n
  else if (e.key === 'ArrowLeft') prox = (i - 1 + n) % n
  else if (e.key === 'Home') prox = 0
  else if (e.key === 'End') prox = n - 1
  if (prox == null) return
  e.preventDefault()
  filtro.value = ABAS[prox].valor
  nextTick(() => document.getElementById(`aba-${ABAS[prox].valor || 'todos'}`)?.focus())
}

// Lista: ↑ ↓ movem o foco entre os atendimentos
function teclaLista(e) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  const botoes = [...e.currentTarget.querySelectorAll('.linha')]
  const i = botoes.indexOf(document.activeElement)
  if (i < 0) return
  e.preventDefault()
  botoes[Math.min(Math.max(i + (e.key === 'ArrowDown' ? 1 : -1), 0), botoes.length - 1)]?.focus()
}

// Esc fecha o painel de detalhes (o diálogo nativo cuida do próprio Esc)
function aoTeclar(e) {
  if (e.key === 'Escape' && selecionadoId.value != null && !dlgExcluir.value?.open) fecharDetalhe()
}

/* ---------- Exclusão ---------- */
function pedirExclusao(atendimento, evento) {
  gatilho = evento?.currentTarget ?? null
  alvo.value = atendimento
  erroExclusao.value = ''
  dlgExcluir.value?.showModal()
}

function fecharDialogo() {
  if (excluindo.value) return
  dlgExcluir.value?.close()
}

// ESC durante a exclusão não fecha o diálogo
function aoCancelarDialogo(e) {
  if (excluindo.value) e.preventDefault()
}

function aoFecharDialogo() {
  alvo.value = null
  erroExclusao.value = ''
  gatilho?.isConnected && gatilho.focus()
  gatilho = null
}

async function confirmarExclusao() {
  if (!alvo.value || excluindo.value) return
  const removido = alvo.value
  const nome = nomeDe(removido)
  excluindo.value = true
  erroExclusao.value = ''

  try {
    const res = await fetch(urlAtendimento(removido.id), { method: 'DELETE', headers: cabecalhos() })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      throw new Error(erroHttp(res, json))
    }

    gatilho = null // a linha deixa de existir
    if (selecionadoId.value === removido.id) selecionadoId.value = null
    dlgExcluir.value?.close()
    avisar(`Atendimento de “${nome}” excluído.`)

    // Se era o único item da última página, volta uma página (o watch recarrega)
    if (itens.value.length === 1 && page.value > 1) page.value -= 1
    else await carregar()
  } catch (e) {
    erroExclusao.value = mensagemDeRede(e) // o diálogo continua aberto, permitindo tentar de novo
  } finally {
    excluindo.value = false
  }
}

/* ---------- Toasts ---------- */
function avisar(texto, tipo = 'success') {
  const id = ++toastSeq
  toasts.value.push({ id, texto, tipo })
  timers.set(id, setTimeout(() => fecharToast(id), tipo === 'error' ? 8000 : 5000))
}

function fecharToast(id) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  toasts.value = toasts.value.filter(t => t.id !== id)
}

/* ---------- Ciclo de vida ---------- */
watch(page, carregar)
watch(filtro, () => {
  selecionadoId.value = null
  if (page.value !== 1) page.value = 1 // dispara o watch de page
  else carregar()
})

onMounted(() => {
  mq = window.matchMedia('(max-width: 900px)')
  mobile.value = mq.matches
  mq.addEventListener('change', aoMudarTela)
  document.addEventListener('keydown', aoTeclar)
  carregar()
})

function aoMudarTela(e) {
  mobile.value = e.matches
}

onBeforeUnmount(() => {
  controller?.abort()
  timers.forEach(clearTimeout)
  mq?.removeEventListener('change', aoMudarTela)
  document.removeEventListener('keydown', aoTeclar)
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.titulo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icone {
  color: var(--accent);
  flex: none;
}

/* ---------- Abas ---------- */
.abas {
  overflow-x: auto;
  scrollbar-width: none;
}

.abas::-webkit-scrollbar {
  display: none;
}

.abas .tab {
  white-space: nowrap;
}

/* ---------- Layout mestre-detalhe ---------- */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  align-items: start;
}

.coluna-lista {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.busca {
  position: relative;
  display: flex;
  align-items: center;
}

.busca-icone {
  position: absolute;
  left: 10px;
  color: var(--text-2);
  pointer-events: none;
}

.busca .input {
  padding-left: 36px;
}

.progress-espaco {
  height: 3px;
}

/* ---------- Lista ---------- */
.lista {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  transition: opacity var(--t);
}

.lista.carregando {
  opacity: .55;
}

.linha {
  --cor: var(--text-dis);
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px 10px 16px;
  border: 1px solid var(--stroke);
  border-radius: var(--r-lg);
  background: var(--card);
  box-shadow: inset 3px 0 0 var(--cor), var(--shadow-card);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--t), border-color var(--t);
}

.linha:hover {
  background: var(--fill-h);
}

.linha:active {
  background: var(--fill-a);
}

.linha.sel {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 7%, var(--card));
}

.linha.st-em_andamento {
  --cor: var(--warning);
}

.linha.st-pago {
  --cor: var(--success);
}

.linha.st-nao_pago {
  --cor: var(--error);
}

.linha-skel {
  cursor: default;
  box-shadow: var(--shadow-card);
}

.linha-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.nome,
.sub {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.linha-fim {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex: none;
}

.num {
  font-variant-numeric: tabular-nums;
}

.linha .avatar {
  flex: none;
}

/* ---------- Painel de detalhes ---------- */
.detalhe {
  position: sticky;
  top: 16px;
}

.avatar-lg {
  width: 48px;
  height: 48px;
  flex: none;
  font-size: 16px;
}

.det-cliente {
  min-width: 0;
}

.det-cliente .nome {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fechar-sheet {
  display: none;
  align-self: flex-start;
  font-size: 20px;
}

.kv {
  display: flex;
  flex-direction: column;
  margin: 0;
  border: 1px solid var(--stroke-2);
  border-radius: var(--r-lg);
  overflow: hidden;
  background: var(--divider);
  gap: 1px;
}

.kv-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: var(--card);
}

.kv dt {
  color: var(--text-2);
}

.kv dd {
  margin: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.kv-destaque dd {
  font-size: 18px;
  line-height: 24px;
}

.detalhe hr {
  margin: 0;
}

.btn-excluir:hover:not(:disabled),
.btn-excluir:focus-visible {
  color: var(--error);
  background: var(--error-bg);
}

.detalhe-vazio {
  background: transparent;
  border-style: dashed;
  border-color: var(--stroke-2);
  box-shadow: none;
}

.sheet-backdrop {
  display: none;
}

/* ---------- Vazio / skeleton ---------- */
.vazio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 48px 16px;
  text-align: center;
}

.icone-vazio {
  color: var(--text-dis);
  margin-bottom: 8px;
}

.skel {
  display: inline-block;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--press) 25%, var(--hover) 50%, var(--press) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
}

.skel-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex: none;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

/* ---------- Rodapé / paginação ---------- */
.rodape {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.paginacao {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.paginacao .btn-sm {
  min-width: 32px;
}

.reticencias {
  padding: 0 4px;
  color: var(--text-2);
}

.loading.mini {
  width: 14px;
  height: 14px;
  border-width: 2px;
}

/* ---------- Diálogo de exclusão ---------- */
.dlg-topo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dlg-icone {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--error-bg);
  color: var(--error);
}

.dlg-titulo {
  min-width: 0;
  overflow-wrap: anywhere;
}

.aviso-final {
  color: var(--text);
  font-weight: 600;
}

.resumo {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin: 4px 0;
  overflow: hidden;
  border: 1px solid var(--stroke-2);
  border-radius: var(--r-lg);
  background: var(--divider);
}

.resumo-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  background: var(--card);
}

.resumo dt {
  font-size: 12px;
  line-height: 16px;
  color: var(--text-2);
}

.resumo dd {
  margin: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.toast .alert {
  justify-content: space-between;
}

.toast .alert .btn {
  margin-left: auto;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ---------- Tablet / celular: detalhes viram painel inferior ---------- */
@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .detalhe {
    position: fixed;
    z-index: 40;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    display: none;
    max-height: 88vh;
    overflow-y: auto;
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    box-shadow: var(--shadow-flyout);
  }

  .detalhe.aberto {
    display: block;
  }

  .detalhe .card {
    border-radius: var(--r-lg) var(--r-lg) 0 0;
  }

  .sheet-backdrop {
    display: block;
    position: fixed;
    z-index: 39;
    inset: 0;
    background: rgba(0, 0, 0, .35);
  }

  .fechar-sheet {
    display: inline-flex;
  }

  .detalhe-vazio {
    display: none;
  }
}

@media (max-width: 600px) {
  .resumo {
    grid-template-columns: 1fr;
  }

  .modal-action {
    flex-direction: column;
  }

  .modal-action .btn {
    width: 100%;
  }
}
</style>