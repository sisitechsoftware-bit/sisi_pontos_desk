<template>
  <div class="flex flex-col gap-4">
    <!-- Cabeçalho: contexto + título + ações principais -->
    <header class="flex flex-col gap-2">
      <nav class="breadcrumbs" aria-label="Caminho">
        <ul>
          <li>Clientes</li>
          <li>{{ cliente ? cliente.nome : 'Detalhes' }}</li>
        </ul>
      </nav>

      <div class="flex flex-wrap items-center gap-3">
        <h1>Detalhes do cliente</h1>
        <div v-if="cliente" class="flex gap-2" style="margin-left: auto">
          <router-link class="btn btn-ghost" to="/">Voltar</router-link>
          <router-link class="btn" :to="`/clientes/${cliente.id}/editar`">Editar cliente</router-link>
          <router-link class="btn btn-primary" :to="rotaNovoAtendimento">Novo atendimento</router-link>
        </div>
      </div>
    </header>

    <!-- Carregando -->
    <div v-if="carregando" class="card" role="status" aria-live="polite">
      <div class="card-body flex items-center gap-3">
        <span class="loading"></span>
        <span>Carregando dados do cliente…</span>
      </div>
    </div>

    <!-- Erro com saída clara: tentar de novo ou voltar -->
    <div v-else-if="erro" class="alert alert-error" role="alert">
      <span>
        <span class="alert-title">Não foi possível abrir o cliente</span>
        {{ erro }}
      </span>
      <div class="flex gap-2">
        <button class="btn btn-sm" type="button" @click="carregar">Tentar novamente</button>
        <router-link class="btn btn-sm btn-ghost" to="/">Voltar para a lista</router-link>
      </div>
    </div>

    <template v-else-if="cliente">
      <!-- Dados cadastrais -->
      <section class="card" aria-labelledby="titulo-dados">
        <div class="card-body gap-3">
          <h2 id="titulo-dados" class="card-title">Dados do cliente</h2>

          <dl class="dados">
            <div>
              <dt class="text-2">Nome</dt>
              <dd>{{ cliente.nome }}</dd>
            </div>
            <div>
              <dt class="text-2">Telefone</dt>
              <dd>{{ cliente.telefone || 'Não informado' }}</dd>
            </div>
            <div>
              <dt class="text-2">Nº do cartão</dt>
              <dd class="flex items-center gap-2">
                <span>{{ cliente.numero_cartao }}</span>
                <button
                  class="btn btn-sm btn-ghost tooltip"
                  type="button"
                  :data-tip="copiado ? 'Copiado!' : 'Copiar número'"
                  aria-label="Copiar número do cartão"
                  @click="copiarCartao"
                >⧉</button>
              </dd>
            </div>
            <div>
              <dt class="text-2">ID</dt>
              <dd>{{ cliente.id }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- Saldo de pontos -->
      <section class="card" aria-labelledby="titulo-saldo">
        <div class="card-body gap-2">
          <h2 id="titulo-saldo" class="card-title">Saldo de pontos</h2>

          <p v-if="pontos !== null" class="saldo">
            {{ formatar(pontos) }} <span class="text-2">pontos</span>
          </p>

          <div v-else class="alert alert-warning" role="alert">
            <span>
              <span class="alert-title">Saldo indisponível</span>
              Não foi possível consultar os pontos agora.
            </span>
            <button class="btn btn-sm" type="button" @click="carregarPontos">Tentar novamente</button>
          </div>
        </div>
      </section>

      <!-- Atendimentos (GET atendimentos.php?cliente_id={id}) -->
      <section class="card" aria-labelledby="titulo-atendimentos">
        <div class="card-body gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <h2 id="titulo-atendimentos" class="card-title">Atendimentos</h2>
            <span v-if="totalAtendimentos" class="badge">{{ totalAtendimentos }}</span>
          </div>

          <div v-if="carregandoAtendimentos && atendimentos.length === 0" class="flex items-center gap-3" role="status" aria-live="polite">
            <span class="loading"></span>
            <span>Carregando atendimentos…</span>
          </div>

          <div v-else-if="erroAtendimentos" class="alert alert-warning" role="alert">
            <span>
              <span class="alert-title">Atendimentos indisponíveis</span>
              {{ erroAtendimentos }}
            </span>
            <button class="btn btn-sm" type="button" @click="carregarAtendimentos()">Tentar novamente</button>
          </div>

          <div v-else-if="atendimentos.length === 0" class="flex flex-col gap-3 items-start">
            <p class="text-2" style="margin: 0">Este cliente ainda não tem atendimentos.</p>
            <router-link class="btn btn-primary" :to="rotaNovoAtendimento">Registrar primeiro atendimento</router-link>
          </div>

          <template v-else>
            <ul class="lista-atendimentos">
              <li v-for="a in atendimentosOrdenados" :key="a.id" class="atendimento">
                <div class="flex flex-wrap items-center gap-2">
                  <strong>Atendimento #{{ a.id }}</strong>
                  <span class="badge" :class="classeStatus(a.status)">{{ rotuloStatus(a.status) }}</span>
                  <span style="margin-left: auto">
                    <strong>{{ a.pontos_total > 0 ? `+${formatar(a.pontos_total)}` : '0' }}</strong>
                    <span class="text-2"> pontos</span>
                  </span>
                </div>
                <p class="text-2">
                  Valor: {{ moeda(a.valor_total) }}
                  <template v-if="a.pontos_anteriores > 0">
                    · Pontos anteriores: {{ formatar(a.pontos_anteriores) }}
                  </template>
                </p>
              </li>
            </ul>

            <div class="flex items-center gap-3">
              <span class="text-2">Mostrando {{ atendimentos.length }} de {{ totalAtendimentos }}</span>
              <button
                v-if="pagina < ultimaPagina"
                class="btn btn-sm"
                type="button"
                :disabled="carregandoAtendimentos"
                @click="carregarAtendimentos(pagina + 1)"
              >
                <span v-if="carregandoAtendimentos" class="loading"></span>
                Ver mais
              </button>
            </div>
          </template>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const API_URL = 'http://localhost:8888/api-fidelidade/api/clientes.php' // ajuste aqui
const ATENDIMENTOS_URL = 'http://localhost:8888/api-fidelidade/api/atendimentos.php' // ajuste aqui

// Token: ajuste para onde o seu app guarda o login (store, localStorage, .env…)
const obterToken = () => localStorage.getItem('token') || import.meta.env.VITE_API_TOKEN || ''

const props = defineProps({ id: { type: [String, Number], required: true } })

const cliente = ref(null)
const pontos = ref(null)
const atendimentos = ref([])
const totalAtendimentos = ref(0)
const pagina = ref(1)
const ultimaPagina = ref(1)

const carregando = ref(true)
const carregandoAtendimentos = ref(false)
const erro = ref('')
const erroAtendimentos = ref('')
const copiado = ref(false)

let controlador = null // cancela requisições antigas ao trocar de cliente
let timerCopia = null

const nf = new Intl.NumberFormat('pt-BR')
const formatar = (n) => nf.format(Number(n) || 0)
const moeda = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0)

// Rota do novo atendimento já com o cliente selecionado (ajuste ao seu router)
const rotaNovoAtendimento = computed(() => `/clientes/${props.id}/atendimentos/novo`)

// Mais recentes primeiro
const atendimentosOrdenados = computed(() => [...atendimentos.value].sort((a, b) => b.id - a.id))

const STATUS = {
  pago: { texto: 'Pago', classe: 'badge-success' },
  em_andamento: { texto: 'Em andamento', classe: 'badge-primary' },
}
const rotuloStatus = (s) => STATUS[s]?.texto ?? String(s ?? '—').replace(/_/g, ' ')
const classeStatus = (s) => STATUS[s]?.classe ?? ''

async function buscar(caminho, signal) {
  const res = await fetch(`${API_URL}/${props.id}${caminho}`, { signal })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error?.message || `Erro ${res.status}`)
  return json
}

async function carregarPontos() {
  try {
    pontos.value = (await buscar('/pontos', controlador?.signal)).pontos ?? null
  } catch (e) {
    if (e.name !== 'AbortError') pontos.value = null
  }
}

// GET atendimentos.php?cliente_id={id}&page={n}  (com Bearer token)
async function carregarAtendimentos(page = 1) {
  carregandoAtendimentos.value = true
  erroAtendimentos.value = ''
  try {
    const url = `${ATENDIMENTOS_URL}?${new URLSearchParams({ cliente_id: props.id, page })}`
    const res = await fetch(url, {
      method: 'GET',
      signal: controlador?.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${obterToken()}`,
      },
    })
    const json = await res.json().catch(() => null)
    if (res.status === 401) throw new Error('Sessão expirada. Entre novamente.')
    if (!res.ok) throw new Error(json?.error?.message || `Erro ${res.status}`)

    const itens = json?.items ?? []
    atendimentos.value = page === 1 ? itens : [...atendimentos.value, ...itens]
    totalAtendimentos.value = json?.total ?? atendimentos.value.length
    pagina.value = json?.page ?? page
    ultimaPagina.value = json?.lastPage ?? 1
  } catch (e) {
    if (e.name === 'AbortError') return
    erroAtendimentos.value =
      e instanceof TypeError ? 'Sem conexão com o servidor.' : e.message || 'Tente novamente em instantes.'
  } finally {
    carregandoAtendimentos.value = false
  }
}

async function carregar() {
  controlador?.abort()
  controlador = new AbortController()

  carregando.value = true
  erro.value = ''
  cliente.value = null
  pontos.value = null
  atendimentos.value = []
  totalAtendimentos.value = 0
  pagina.value = 1
  ultimaPagina.value = 1

  try {
    cliente.value = await buscar('', controlador.signal)
  } catch (e) {
    if (e.name === 'AbortError') return
    erro.value =
      e instanceof TypeError
        ? 'Sem conexão com o servidor. Verifique sua rede e tente novamente.'
        : e.message || 'Cliente não encontrado.'
    return
  } finally {
    carregando.value = false
  }

  // Em paralelo; falha em um não derruba a página
  await Promise.all([carregarPontos(), carregarAtendimentos()])
}

async function copiarCartao() {
  try {
    await navigator.clipboard.writeText(String(cliente.value.numero_cartao))
    copiado.value = true
    clearTimeout(timerCopia)
    timerCopia = setTimeout(() => (copiado.value = false), 2000)
  } catch {
    /* sem permissão de área de transferência: ignora */
  }
}

watch(() => props.id, carregar, { immediate: true })

onBeforeUnmount(() => {
  controlador?.abort()
  clearTimeout(timerCopia)
})
</script>

<style scoped>
/*
  Botões feitos com <router-link> (<a>): o win11.css define a:hover { color: azul },
  que vence .btn e deixava o texto azul (ou azul sobre azul no primário) ao passar o mouse.
  Aqui fixamos as cores para ficarem idênticas às de um <button class="btn">.
*/
a.btn,
a.btn:hover,
a.btn:focus,
a.btn:visited {
  text-decoration: none;
  color: var(--text);
}
a.btn:active {
  text-decoration: none;
  color: var(--text-2);
}

a.btn.btn-primary,
a.btn.btn-primary:hover,
a.btn.btn-primary:focus,
a.btn.btn-primary:visited {
  color: var(--on-accent);
}
a.btn.btn-primary:active {
  color: rgba(255, 255, 255, 0.7);
}

.dados {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 0;
}
.dados dt {
  font-size: 0.875rem;
}
.dados dd {
  margin: 2px 0 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.saldo {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 600;
  line-height: 1.1;
}
.saldo .text-2 {
  font-size: 1rem;
  font-weight: 400;
}

.lista-atendimentos {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.atendimento {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 0;
  border-bottom: 1px solid var(--stroke, rgba(0, 0, 0, 0.08));
}
.atendimento:last-child {
  border-bottom: 0;
}
.atendimento p {
  margin: 0;
}
</style>