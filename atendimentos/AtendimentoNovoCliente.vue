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
        <li class="passo ativo" aria-current="step"><span class="passo-n">1</span> Cliente</li>
        <li class="passo"><span class="passo-n">2</span> Profissional</li>
      </ol>
    </header>

    <section class="coluna" aria-labelledby="titulo-busca">
      <div class="form-control">
        <label id="titulo-busca" for="busca" class="semibold">Quem será atendido?</label>
        <div class="busca">
          <svg class="busca-icone" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input id="busca" ref="buscaEl" v-model="busca" class="input" type="search" autocomplete="off"
            aria-describedby="ajuda-busca" placeholder="Buscar cliente por nome, telefone ou CPF">
        </div>
        <span id="ajuda-busca" class="label-text-alt">Toque em um cliente para continuar.</span>
      </div>

      <progress v-if="carregando" class="progress" aria-label="Buscando clientes"></progress>
      <div v-else class="progress-espaco"></div>

      <div v-if="erro" class="alert alert-error" role="alert">
        <span><span class="alert-title">Não foi possível carregar os clientes.</span> {{ erro }}</span>
        <button type="button" class="btn btn-sm" @click="recarregar">Tentar novamente</button>
      </div>

      <!-- Skeleton -->
      <ul v-if="carregando && !visiveis.length" class="lista" aria-hidden="true">
        <li v-for="n in 6" :key="'sk' + n" class="linha linha-skel">
          <span class="skel skel-avatar"></span>
          <span class="linha-info">
            <span class="skel" style="width: 50%"></span>
            <span class="skel" style="width: 30%"></span>
          </span>
        </li>
      </ul>

      <!-- Lista -->
      <ul v-else-if="visiveis.length" class="lista" @keydown="teclaLista">
        <li v-for="c in visiveis" :key="c.id">
          <button type="button" class="linha" :aria-label="rotuloAria(c)" @click="escolher(c)">
            <span class="avatar" aria-hidden="true">{{ iniciais(c.nome) }}</span>
            <span class="linha-info">
              <strong class="semibold nome">{{ c.nome }}</strong>
              <span class="caption sub">{{ c.telefone || 'Sem telefone' }}</span>
            </span>
            <span class="linha-fim">
              <span v-if="participaPontos(c)" class="badge badge-primary">{{ c.pontos ?? 0 }} pts</span>
              <span v-else class="caption">Sem pontos</span>
            </span>
            <svg class="seta" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </li>
      </ul>

      <!-- Vazio -->
      <div v-else-if="!erro && !carregando" class="vazio card" role="status">
        <h3>{{ busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado' }}</h3>
        <p class="text-2">
          {{ busca ? 'Confira o nome, o telefone ou o CPF digitado. Se for um cliente novo, cadastre-o agora.'
            : 'Cadastre o primeiro cliente para iniciar um atendimento.' }}
        </p>
        <div class="flex gap-2 mt-2 flex-wrap justify-center">
          <button v-if="busca" type="button" class="btn" @click="busca = ''">Limpar busca</button>
          <router-link to="/clientes/novo" class="btn btn-primary no-underline">+ Cadastrar cliente</router-link>
        </div>
      </div>

      <!-- Rolagem infinita: o sentinela dispara o carregamento da próxima página -->
      <div ref="sentinela" class="sentinela" aria-hidden="true"></div>

      <p v-if="carregandoMais" class="rodape text-2" role="status">
        <span class="loading mini" aria-hidden="true"></span> Carregando mais clientes…
      </p>
      <div v-if="erroMais" class="alert alert-error" role="alert">
        <span>{{ erroMais }}</span>
        <button type="button" class="btn btn-sm" @click="carregarPagina(page + 1)">Tentar novamente</button>
      </div>
      <small v-else-if="fim && visiveis.length > 8" class="rodape" role="status">Você chegou ao fim da lista.</small>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* ---------- Configuração ---------- */
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8888/api-fidelidade/api'
const getToken = () => import.meta.env.VITE_API_TOKEN ?? localStorage.getItem('token') ?? 'seu-token-aqui'
const LIMIT = 20

// Ajuste conforme suas rotas
const rotaProximaEtapa = id => `/atendimentos/novo/${id}`

// Regra de negócio: só participa do programa de pontos quem tem CPF cadastrado.
// Se no seu cadastro a regra for outra (ex.: numero_cartao), troque aqui.
const participaPontos = c => Boolean(c?.cpf)

const route = useRoute()
const router = useRouter()

/* ---------- Estado ---------- */
const busca = ref(String(route.query.q ?? ''))
const itens = ref([])
const page = ref(0)
const lastPage = ref(1)
const carregando = ref(false)
const carregandoMais = ref(false)
const erro = ref('')
const erroMais = ref('')
const buscaEl = ref(null)
const sentinela = ref(null)

let controller = null
let timer = null
let observer = null

const fim = computed(() => page.value > 0 && page.value >= lastPage.value)

/* ---------- Utilitários ---------- */
const cabecalhos = () => ({ Accept: 'application/json', Authorization: `Bearer ${getToken()}` })
const semAcento = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const soDigitos = s => String(s ?? '').replace(/\D/g, '')
const extrairLista = json => json?.items ?? json?.data ?? (Array.isArray(json) ? json : [])

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

const rotuloAria = c =>
  `${c.nome}, ${c.telefone || 'sem telefone'}, ${participaPontos(c) ? `${c.pontos ?? 0} pontos` : 'sem pontos'}. Escolher cliente`

/* ---------- Busca ---------- */
// Filtro local instantâneo (garante o resultado mesmo se a API ignorar o parâmetro "busca")
const visiveis = computed(() => {
  const t = semAcento(busca.value).trim()
  const d = soDigitos(busca.value)
  if (!t) return itens.value
  return itens.value.filter(c =>
    semAcento(c.nome).includes(t) ||
    (d && [c.telefone, c.cpf, c.numero_cartao].some(v => soDigitos(v).includes(d))) ||
    semAcento(c.numero_cartao).includes(t),
  )
})

/* ---------- Carregamento paginado (rolagem infinita) ---------- */
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

    const res = await fetch(`${API_URL}/clientes.php?${params}`, { headers: cabecalhos(), signal: atual.signal })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(erroHttp(res, json))

    const lista = extrairLista(json).filter(c => c?.id != null)
    const jaTem = new Set(primeira ? [] : itens.value.map(c => c.id))
    const novos = lista.filter(c => !jaTem.has(c.id))
    itens.value = primeira ? novos : [...itens.value, ...novos]
    page.value = p

    // Sem novos itens = API sem paginação (ou fim real): para de pedir páginas
    const infoPaginas = json?.lastPage ?? json?.last_page ?? json?.pages ?? json?.meta?.pages
    if (!novos.length) lastPage.value = p
    else if (infoPaginas != null) lastPage.value = Math.max(Number(infoPaginas), p)
    else lastPage.value = lista.length >= LIMIT ? p + 1 : p
  } catch (e) {
    if (e.name === 'AbortError') return
    if (primeira) { erro.value = mensagemDeRede(e); itens.value = []; page.value = 0 }
    else erroMais.value = `Não foi possível carregar mais clientes. ${mensagemDeRede(e)}`
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

// Busca no servidor com debounce; o filtro local já responde enquanto o usuário digita
watch(busca, valor => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    router.replace({ query: { ...route.query, q: valor.trim() || undefined } })
    recarregar()
  }, 300)
})

/* ---------- IntersectionObserver ---------- */
const podeCarregarMais = () =>
  page.value > 0 && !fim.value && !carregando.value && !carregandoMais.value && !erroMais.value && !erro.value

function reobservar() {
  // unobserve + observe força nova checagem (a lista pode ser curta e o sentinela continuar visível)
  if (!observer || !sentinela.value) return
  observer.unobserve(sentinela.value)
  observer.observe(sentinela.value)
}

onMounted(() => {
  observer = new IntersectionObserver(
    entradas => { if (entradas[0].isIntersecting && podeCarregarMais()) carregarPagina(page.value + 1) },
    { rootMargin: '240px 0px' },
  )
  observer.observe(sentinela.value)
  buscaEl.value?.focus()
  carregarPagina(1)
})

onBeforeUnmount(() => {
  controller?.abort()
  clearTimeout(timer)
  observer?.disconnect()
})

/* ---------- Navegação ---------- */
function escolher(c) {
  // O estado de navegação evita uma tela em branco na próxima etapa (ela recarrega os dados atualizados)
  router.push({ path: rotaProximaEtapa(c.id), state: { cliente: JSON.parse(JSON.stringify(c)) } })
}

// ↑ ↓ movem o foco entre os clientes
function teclaLista(e) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  const botoes = [...e.currentTarget.querySelectorAll('.linha')]
  const i = botoes.indexOf(document.activeElement)
  if (i < 0) return
  e.preventDefault()
  botoes[Math.min(Math.max(i + (e.key === 'ArrowDown' ? 1 : -1), 0), botoes.length - 1)]?.focus()
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; max-width: 720px; }

/* Etapas: a ordem importa, então aqui a numeração é informação */
.passos { display: flex; gap: 16px; margin: 0; padding: 0; list-style: none; }
.passo { display: flex; align-items: center; gap: 8px; color: var(--text-2); }
.passo-n { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
  border: 1px solid var(--stroke-2); font-size: 12px; font-weight: 600; }
.passo.ativo { color: var(--text); font-weight: 600; }
.passo.ativo .passo-n { background: var(--accent); border-color: transparent; color: #fff; }

.coluna { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.busca { position: relative; display: flex; align-items: center; }
.busca-icone { position: absolute; left: 10px; color: var(--text-2); pointer-events: none; }
.busca .input { padding-left: 36px; min-height: 40px; }
.progress-espaco { height: 3px; }

.lista { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; }
.linha { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 64px; padding: 10px 14px;
  border: 1px solid var(--stroke); border-radius: var(--r-lg); background: var(--card); box-shadow: var(--shadow-card);
  color: var(--text); font: inherit; text-align: left; cursor: pointer; transition: background var(--t), border-color var(--t); }
.linha:hover { background: var(--fill-h); border-color: var(--stroke-2); }
.linha:active { background: var(--fill-a); }
.linha-skel { cursor: default; }
.linha-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.nome, .sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.linha-fim { flex: none; }
.seta { flex: none; color: var(--text-2); }
.avatar { flex: none; }

.vazio { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 40px 16px; text-align: center; }
.justify-center { justify-content: center; }
.no-underline, .no-underline:hover { text-decoration: none; }
.btn-primary.no-underline, .btn-primary.no-underline:hover { color: var(--on-accent); }

.sentinela { height: 1px; }
.rodape { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 0 24px; text-align: center; }
.loading.mini { width: 14px; height: 14px; border-width: 2px; }

.skel { display: inline-block; height: 12px; border-radius: 6px;
  background: linear-gradient(90deg, var(--press) 25%, var(--hover) 50%, var(--press) 75%); background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite; }
.skel-avatar { width: 40px; height: 40px; border-radius: 50%; flex: none; }
@keyframes shimmer { to { background-position: -200% 0; } }
</style>
