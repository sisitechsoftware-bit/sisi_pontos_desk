<template>
  <div class="page">
    <header class="flex flex-col gap-2">
      <nav class="breadcrumbs" aria-label="Caminho">
        <ul>
          <li><router-link to="/atendimentos">Atendimentos</router-link></li>
          <li>Novo atendimento</li>
        </ul>
      </nav>
      <h1>Novo atendimento</h1>
      <ol class="passos" aria-label="Etapas do atendimento">
        <li class="passo feito"><span class="passo-n">✓</span>
          <router-link to="/atendimentos/novo">Cliente</router-link>
        </li>
        <li class="passo ativo" aria-current="step"><span class="passo-n">2</span> Profissional</li>
      </ol>
    </header>

    <!-- Falha ao carregar o cliente -->
    <div v-if="erroCliente" class="alert alert-error" role="alert">
      <span><span class="alert-title">Não foi possível carregar o cliente.</span> {{ erroCliente }}</span>
      <button type="button" class="btn btn-sm" @click="carregarCliente">Tentar novamente</button>
    </div>

    <template v-else>
      <!-- Cliente escolhido -->
      <section class="card" aria-label="Cliente escolhido">
        <div class="card-body gap-3">
          <div class="flex items-center gap-3">
            <span class="avatar avatar-lg" aria-hidden="true">{{ cliente ? iniciais(cliente.nome) : '' }}</span>
            <div class="flex flex-col grow min0">
              <template v-if="cliente">
                <h2 class="nome">{{ cliente.nome }}</h2>
                <span class="text-2">{{ cliente.telefone || 'Sem telefone' }}</span>
              </template>
              <template v-else>
                <span class="skel" style="width: 160px; height: 16px"></span>
                <span class="skel" style="width: 110px"></span>
              </template>
            </div>
            <router-link to="/atendimentos/novo" class="btn btn-sm btn-ghost no-underline">Trocar cliente</router-link>
          </div>

          <dl v-if="cliente" class="kv">
            <div v-if="participa" class="kv-linha">
              <dt>Pontos atuais</dt>
              <dd>
                <span v-if="pontos !== null" class="badge badge-primary">{{ pontos }} pts</span>
                <span v-else class="skel" style="width: 56px"></span>
              </dd>
            </div>
            <div class="kv-linha">
              <dt>Último atendimento</dt>
              <dd>
                <span v-if="ultimoCarregado">{{ ultimoAtendimento || 'Primeira visita' }}</span>
                <span v-else class="skel" style="width: 80px"></span>
              </dd>
            </div>
          </dl>

          <div v-if="cliente && !participa" class="alert">
            <span>Este cliente ainda não participa do programa de pontos. Cadastre o CPF para que ele acumule pontos.</span>
            <router-link :to="`/clientes/${cliente.id}/editar`" class="btn btn-sm no-underline">Editar cadastro</router-link>
          </div>
        </div>
      </section>

      <!-- Já existe atendimento aberto para este cliente -->
      <div v-if="emAberto" class="alert alert-warning" role="alert">
        <span><span class="alert-title">{{ primeiroNome }} já tem um atendimento em andamento.</span>
          Continue esse atendimento para não duplicar o registro.</span>
        <router-link :to="`/atendimentos/${emAberto.id}`" class="btn btn-sm no-underline">Continuar atendimento</router-link>
      </div>

      <!-- Profissionais -->
      <section class="coluna" aria-labelledby="titulo-prof">
        <div class="form-control">
          <label id="titulo-prof" for="busca" class="semibold">Quem vai atender?</label>
          <div class="busca">
            <svg class="busca-icone" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input id="busca" v-model="busca" class="input" type="search" autocomplete="off"
              placeholder="Buscar profissional por nome ou especialidade">
          </div>
        </div>

        <progress v-if="carregando" class="progress" aria-label="Buscando profissionais"></progress>
        <div v-else class="progress-espaco"></div>

        <div v-if="erro" class="alert alert-error" role="alert">
          <span><span class="alert-title">Não foi possível carregar os profissionais.</span> {{ erro }}</span>
          <button type="button" class="btn btn-sm" @click="recarregar">Tentar novamente</button>
        </div>

        <ul v-if="carregando && !visiveis.length" class="lista" aria-hidden="true">
          <li v-for="n in 5" :key="'sk' + n" class="linha linha-skel">
            <span class="skel skel-avatar"></span>
            <span class="linha-info"><span class="skel" style="width: 50%"></span><span class="skel" style="width: 35%"></span></span>
          </li>
        </ul>

        <!-- Seleção única: botões de opção (setas ↑ ↓ trocam a escolha) -->
        <ul v-else-if="visiveis.length" class="lista" role="radiogroup" aria-labelledby="titulo-prof">
          <li v-for="f in visiveis" :key="f.id">
            <label class="linha" :class="{ sel: selecionado?.id === f.id }">
              <input type="radio" class="radio" name="profissional" :value="f.id"
                :checked="selecionado?.id === f.id" @change="selecionado = f">
              <span class="avatar" aria-hidden="true">{{ iniciais(f.nome) }}</span>
              <span class="linha-info">
                <strong class="semibold nome">{{ f.nome }}</strong>
                <span class="caption sub">{{ f.especialidade || 'Sem especialidade informada' }}</span>
              </span>
            </label>
          </li>
        </ul>

        <div v-else-if="!erro && !carregando" class="vazio card" role="status">
          <h3>{{ busca ? 'Nenhum profissional encontrado' : 'Nenhum profissional cadastrado' }}</h3>
          <p class="text-2">{{ busca ? 'Tente outro nome ou especialidade.' : 'Cadastre um profissional para iniciar atendimentos.' }}</p>
          <button v-if="busca" type="button" class="btn mt-2" @click="busca = ''">Limpar busca</button>
        </div>

        <div ref="sentinela" class="sentinela" aria-hidden="true"></div>
        <p v-if="carregandoMais" class="rodape text-2" role="status">
          <span class="loading mini" aria-hidden="true"></span> Carregando mais profissionais…
        </p>
        <div v-if="erroMais" class="alert alert-error" role="alert">
          <span>{{ erroMais }}</span>
          <button type="button" class="btn btn-sm" @click="carregarPagina(page + 1)">Tentar novamente</button>
        </div>
      </section>
    </template>

    <!-- Barra de ação fixa: o botão principal fica sempre ao alcance do polegar -->
    <footer class="acoes">
      <div v-if="erroIniciar" class="alert alert-error" role="alert">
        <span><span class="alert-title">Não foi possível iniciar.</span> {{ erroIniciar }}</span>
      </div>
      <div class="acoes-linha">
        <small id="ajuda-iniciar" class="ajuda" role="status">
          {{ selecionado ? `Atendimento com ${selecionado.nome}` : 'Escolha um profissional para continuar.' }}
        </small>
        <router-link to="/atendimentos/novo" class="btn no-underline">Voltar</router-link>
        <button type="button" class="btn btn-primary" :disabled="!selecionado || !cliente || iniciando"
          aria-describedby="ajuda-iniciar" @click="iniciar">
          <span v-if="iniciando" class="loading mini" aria-hidden="true"></span>
          {{ iniciando ? 'Iniciando…' : 'Iniciar atendimento' }}
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* ---------- Configuração ---------- */
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8888/api-fidelidade/api'
const getToken = () => import.meta.env.VITE_API_TOKEN ?? localStorage.getItem('token') ?? 'seu-token-aqui'
const LIMIT = 20
const rotaAtendimento = id => `/atendimentos/${id}`

// Regra de negócio: só participa do programa de pontos quem tem CPF cadastrado.
const participaPontos = c => Boolean(c?.cpf)

const route = useRoute()
const router = useRouter()
const clienteId = computed(() => Number(route.params.clienteId))

/* ---------- Estado: cliente ---------- */
// Usa o cliente vindo da tela anterior para renderizar na hora e atualiza em segundo plano
const cliente = ref(history.state?.cliente?.id === clienteId.value ? history.state.cliente : null)
const pontos = ref(null)
const ultimoAtendimento = ref('')
const ultimoCarregado = ref(false)
const emAberto = ref(null)
const erroCliente = ref('')

const participa = computed(() => participaPontos(cliente.value))
const primeiroNome = computed(() => String(cliente.value?.nome ?? 'O cliente').split(' ')[0])

/* ---------- Estado: profissionais ---------- */
const busca = ref('')
const itens = ref([])
const page = ref(0)
const lastPage = ref(1)
const carregando = ref(false)
const carregandoMais = ref(false)
const erro = ref('')
const erroMais = ref('')
const sentinela = ref(null)
const selecionado = ref(null) // mantém a escolha mesmo se a busca esconder o profissional

const iniciando = ref(false)
const erroIniciar = ref('')

let controller = null
let timer = null
let observer = null
let ctrlCliente = null

const fim = computed(() => page.value > 0 && page.value >= lastPage.value)

/* ---------- Utilitários ---------- */
const cabecalhos = (comCorpo = false) => ({
  Accept: 'application/json',
  ...(comCorpo ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${getToken()}`,
})
const semAcento = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const extrairLista = json => json?.items ?? json?.data ?? (Array.isArray(json) ? json : [])
const extrairItem = json => json?.data ?? json?.item ?? json

const mensagemDeRede = e =>
  e instanceof TypeError ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente.' : e.message

function erroHttp(res, json) {
  if (res.status === 401 || res.status === 403) return 'Sessão expirada ou sem permissão. Faça login novamente.'
  return json?.error?.message || `O servidor respondeu com erro (${res.status}).`
}

function iniciais(nome) {
  const p = String(nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

const dataCurta = v => {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

/* ---------- Cliente, pontos e último atendimento ---------- */
async function carregarCliente() {
  ctrlCliente?.abort()
  ctrlCliente = new AbortController()
  const signal = ctrlCliente.signal
  erroCliente.value = ''
  ultimoCarregado.value = false

  try {
    const res = await fetch(`${API_URL}/clientes.php/${clienteId.value}`, { headers: cabecalhos(), signal })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(erroHttp(res, json))
    cliente.value = extrairItem(json)
  } catch (e) {
    if (e.name === 'AbortError') return
    if (!cliente.value) erroCliente.value = mensagemDeRede(e) // se já há dados da tela anterior, segue com eles
  }
  if (!cliente.value) return

  // Pontos e histórico não bloqueiam a tela: se falharem, o fluxo continua
  const pedidos = []
  if (participa.value) {
    pedidos.push(
      fetch(`${API_URL}/clientes.php/${clienteId.value}/pontos`, { headers: cabecalhos(), signal })
        .then(r => (r.ok ? r.json() : null))
        .then(j => { pontos.value = Number(j?.pontos ?? 0) })
        .catch(() => { pontos.value = 0 }),
    )
  }
  pedidos.push(
    fetch(`${API_URL}/atendimentos.php?cliente_id=${clienteId.value}&page=1&limit=20`, { headers: cabecalhos(), signal })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        const lista = extrairLista(j)
        emAberto.value = lista.find(a => a.status === 'em_andamento') ?? null
        const datas = lista
          .filter(a => a.status !== 'em_andamento')
          .map(a => new Date(a.created_at ?? a.data_atendimento ?? a.criado_em ?? a.data))
          .filter(d => !Number.isNaN(d.getTime()))
          .sort((a, b) => b - a)
        ultimoAtendimento.value = datas.length ? dataCurta(datas[0]) : ''
      })
      .catch(() => { /* histórico é opcional */ }),
  )
  await Promise.all(pedidos)
  if (!signal.aborted) ultimoCarregado.value = true
}

/* ---------- Profissionais (rolagem infinita) ---------- */
async function carregarPagina(p) {
  controller?.abort()
  const atual = new AbortController()
  controller = atual
  const primeira = p === 1

  if (primeira) { carregando.value = true; erro.value = ''; erroMais.value = '' }
  else { carregandoMais.value = true; erroMais.value = '' }

  try {
    const params = new URLSearchParams({ page: p, limit: LIMIT })
    if (busca.value.trim()) params.set('busca', busca.value.trim())

    const res = await fetch(`${API_URL}/funcionarios.php?${params}`, { headers: cabecalhos(), signal: atual.signal })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(erroHttp(res, json))

    const lista = extrairLista(json).filter(f => f?.id != null)
    const jaTem = new Set(primeira ? [] : itens.value.map(f => f.id))
    const novos = lista.filter(f => !jaTem.has(f.id))
    itens.value = primeira ? novos : [...itens.value, ...novos]
    page.value = p

    const infoPaginas = json?.lastPage ?? json?.last_page ?? json?.pages ?? json?.meta?.pages
    if (!novos.length) lastPage.value = p
    else if (infoPaginas != null) lastPage.value = Math.max(Number(infoPaginas), p)
    else lastPage.value = lista.length >= LIMIT ? p + 1 : p
  } catch (e) {
    if (e.name === 'AbortError') return
    if (primeira) { erro.value = mensagemDeRede(e); itens.value = []; page.value = 0 }
    else erroMais.value = `Não foi possível carregar mais profissionais. ${mensagemDeRede(e)}`
  } finally {
    if (controller === atual) { carregando.value = false; carregandoMais.value = false }
    nextTick(reobservar)
  }
}

function recarregar() {
  page.value = 0
  lastPage.value = 1
  carregarPagina(1)
}

const visiveis = computed(() => {
  const t = semAcento(busca.value).trim()
  if (!t) return itens.value
  return itens.value.filter(f => semAcento(f.nome).includes(t) || semAcento(f.especialidade).includes(t))
})

watch(busca, () => {
  clearTimeout(timer)
  timer = setTimeout(recarregar, 300)
})

/* ---------- IntersectionObserver ---------- */
const podeCarregarMais = () =>
  page.value > 0 && !fim.value && !carregando.value && !carregandoMais.value && !erroMais.value && !erro.value

function reobservar() {
  if (!observer || !sentinela.value) return
  observer.unobserve(sentinela.value)
  observer.observe(sentinela.value)
}

/* ---------- Iniciar atendimento ---------- */
async function iniciar() {
  if (!selecionado.value || !cliente.value || iniciando.value) return
  iniciando.value = true
  erroIniciar.value = ''
  try {
    const res = await fetch(`${API_URL}/atendimentos.php`, {
      method: 'POST',
      headers: cabecalhos(true),
      body: JSON.stringify({ cliente_id: cliente.value.id, funcionario_id: selecionado.value.id }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(erroHttp(res, json))

    const criado = extrairItem(json)
    const id = criado?.id ?? json?.id
    if (id == null) throw new Error('O servidor não informou o número do atendimento criado.')
    router.replace(rotaAtendimento(id)) // replace: "Voltar" não recria o atendimento
  } catch (e) {
    erroIniciar.value = mensagemDeRede(e)
  } finally {
    iniciando.value = false
  }
}

/* ---------- Ciclo de vida ---------- */
onMounted(() => {
  observer = new IntersectionObserver(
    entradas => { if (entradas[0].isIntersecting && podeCarregarMais()) carregarPagina(page.value + 1) },
    { rootMargin: '240px 0px' },
  )
  observer.observe(sentinela.value)
  carregarCliente()
  carregarPagina(1)
})

onBeforeUnmount(() => {
  controller?.abort()
  ctrlCliente?.abort()
  clearTimeout(timer)
  observer?.disconnect()
})
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; max-width: 720px; padding-bottom: 96px; }

.passos { display: flex; gap: 16px; margin: 0; padding: 0; list-style: none; }
.passo { display: flex; align-items: center; gap: 8px; color: var(--text-2); }
.passo-n { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
  border: 1px solid var(--stroke-2); font-size: 12px; font-weight: 600; }
.passo.ativo { color: var(--text); font-weight: 600; }
.passo.ativo .passo-n { background: var(--accent); border-color: transparent; color: #fff; }
.passo.feito .passo-n { background: var(--success-bg); border-color: transparent; color: var(--success); }

.min0 { min-width: 0; }
.nome, .sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.avatar-lg { width: 48px; height: 48px; flex: none; font-size: 16px; }
.no-underline, .no-underline:hover { text-decoration: none; }

.kv { display: flex; flex-direction: column; gap: 1px; margin: 0; overflow: hidden; background: var(--divider);
  border: 1px solid var(--stroke-2); border-radius: var(--r-lg); }
.kv-linha { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: var(--card); }
.kv dt { color: var(--text-2); }
.kv dd { margin: 0; font-weight: 600; text-align: right; }

.coluna { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.busca { position: relative; display: flex; align-items: center; }
.busca-icone { position: absolute; left: 10px; color: var(--text-2); pointer-events: none; }
.busca .input { padding-left: 36px; min-height: 40px; }
.progress-espaco { height: 3px; }

.lista { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; }
.linha { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 64px; padding: 10px 14px;
  border: 1px solid var(--stroke); border-radius: var(--r-lg); background: var(--card); box-shadow: var(--shadow-card);
  color: var(--text); cursor: pointer; transition: background var(--t), border-color var(--t); }
.linha:hover { background: var(--fill-h); border-color: var(--stroke-2); }
.linha.sel { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--card)); }
.linha:has(.radio:focus-visible) { outline: 2px solid var(--text); outline-offset: 2px; }
.linha .radio:focus-visible { outline: 0; }
.linha-skel { cursor: default; }
.linha-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.avatar { flex: none; }

.vazio { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 40px 16px; text-align: center; }
.sentinela { height: 1px; }
.rodape { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 0; }
.loading.mini { width: 14px; height: 14px; border-width: 2px; }

.skel { display: inline-block; height: 12px; border-radius: 6px;
  background: linear-gradient(90deg, var(--press) 25%, var(--hover) 50%, var(--press) 75%); background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite; }
.skel-avatar { width: 40px; height: 40px; border-radius: 50%; flex: none; }
@keyframes shimmer { to { background-position: -200% 0; } }

/* Barra fixa de ação */
.acoes { position: fixed; z-index: 30; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; gap: 8px;
  padding: 12px clamp(16px, 4vw, 48px); background: var(--layer); border-top: 1px solid var(--divider); }
.acoes-linha { display: flex; align-items: center; justify-content: flex-end; gap: 8px; max-width: 720px; width: 100%; }
.ajuda { flex: 1; min-width: 0; margin-right: auto; }
.acoes .btn { min-height: 36px; }

@media (min-width: 801px) { .acoes { left: 288px; } } /* respeita a largura da .sidebar do win11.css */
@media (max-width: 520px) {
  .acoes-linha { flex-wrap: wrap; }
  .ajuda { flex-basis: 100%; }
  .acoes-linha .btn-primary { flex: 1; }
}
</style>
