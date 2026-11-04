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
        <li class="passo ativo" aria-current="step"><span class="passo-n">2</span> Revisão</li>
        <li class="passo"><span class="passo-n">3</span> Profissional</li>
      </ol>
    </header>

    <div v-if="erroCliente" class="alert alert-error" role="alert">
      <span><span class="alert-title">Não foi possível carregar o cliente.</span> {{ erroCliente }}</span>
      <button type="button" class="btn btn-sm" @click="carregar">Tentar novamente</button>
    </div>

    <template v-else>
      <!-- Identificação -->
      <section class="card" aria-label="Cliente selecionado">
        <div class="card-body">
          <div class="flex items-center gap-3">
            <span class="avatar avatar-lg" aria-hidden="true">{{ cliente ? iniciais(cliente.nome) : '' }}</span>
            <div class="flex flex-col grow min0">
              <template v-if="cliente">
                <h2 class="corta">{{ cliente.nome }}</h2>
                <span class="text-2">{{ cliente.telefone || 'Sem telefone' }}</span>
              </template>
              <template v-else>
                <span class="skel" style="width: 160px; height: 16px"></span>
                <span class="skel" style="width: 110px"></span>
              </template>
            </div>
            <router-link to="/atendimentos/novo" class="btn btn-sm btn-ghost no-underline">Trocar cliente</router-link>
          </div>
        </div>
      </section>

      <!-- Dados do cliente -->
      <section class="flex flex-col gap-2" aria-labelledby="titulo-dados">
        <h2 id="titulo-dados">Dados do cliente</h2>
        <dl class="kv">
          <div class="kv-linha"><dt>Nome</dt><dd>{{ cliente?.nome ?? '…' }}</dd></div>
          <div class="kv-linha"><dt>Telefone</dt><dd>{{ cliente ? (cliente.telefone || '—') : '…' }}</dd></div>
          <div v-if="!cliente || participa" class="kv-linha">
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
          <span><span class="alert-title">Cliente ainda não participa do sistema de pontos.</span>
            Cadastre o CPF para que ele acumule e use pontos.</span>
          <router-link :to="`/clientes/${cliente.id}/editar`" class="btn btn-sm no-underline">Editar cadastro</router-link>
        </div>
      </section>

      <!-- Já existe atendimento aberto -->
      <div v-if="emAberto" class="alert alert-warning" role="alert">
        <span><span class="alert-title">{{ primeiroNome }} já tem um atendimento em andamento.</span>
          Continue esse atendimento para não duplicar o registro.</span>
        <router-link :to="`/atendimentos/${emAberto.id}`" class="btn btn-sm no-underline">Continuar atendimento</router-link>
      </div>
    </template>

    <footer class="acoes">
      <div class="acoes-linha">
        <router-link to="/atendimentos/novo" class="btn no-underline">Voltar</router-link>
        <button type="button" class="btn btn-primary" :disabled="!cliente" @click="continuar">Continuar</button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* ---------- Configuração ---------- */
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8888/api-fidelidade/api'
const getToken = () => import.meta.env.VITE_API_TOKEN ?? localStorage.getItem('token') ?? 'seu-token-aqui'
const rotaProfissional = id => `/atendimentos/novo/${id}/profissional`

// Regra de negócio: só participa do programa de pontos quem tem CPF cadastrado.
const participaPontos = c => Boolean(c?.cpf)

const route = useRoute()
const router = useRouter()
const clienteId = computed(() => Number(route.params.clienteId))

/* ---------- Estado ---------- */
// Usa o cliente da tela anterior para renderizar na hora e atualiza em segundo plano
const cliente = ref(history.state?.cliente?.id === clienteId.value ? history.state.cliente : null)
const pontos = ref(null)
const ultimoAtendimento = ref('')
const ultimoCarregado = ref(false)
const emAberto = ref(null)
const erroCliente = ref('')
let controller = null

const participa = computed(() => participaPontos(cliente.value))
const primeiroNome = computed(() => String(cliente.value?.nome ?? 'O cliente').split(' ')[0])

/* ---------- Utilitários ---------- */
const cabecalhos = () => ({ Accept: 'application/json', Authorization: `Bearer ${getToken()}` })
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

const dataCurta = d => d.toLocaleDateString('pt-BR')

/* ---------- Carregamento ---------- */
async function carregar() {
  controller?.abort()
  controller = new AbortController()
  const signal = controller.signal
  erroCliente.value = ''
  ultimoCarregado.value = false

  try {
    const res = await fetch(`${API_URL}/clientes.php/${clienteId.value}`, { headers: cabecalhos(), signal })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(erroHttp(res, json))
    cliente.value = extrairItem(json)
  } catch (e) {
    if (e.name === 'AbortError') return
    if (!cliente.value) erroCliente.value = mensagemDeRede(e) // com dados da tela anterior, segue com eles
  }
  if (!cliente.value) return

  // Pontos e histórico não bloqueiam a tela: se falharem, o fluxo continua
  const pedidos = []
  if (participa.value) {
    pedidos.push(
      fetch(`${API_URL}/clientes.php/${clienteId.value}/pontos`, { headers: cabecalhos(), signal })
        .then(r => (r.ok ? r.json() : null))
        .then(j => { pontos.value = Number(j?.pontos ?? 0) })
        .catch(() => { pontos.value = Number(cliente.value?.pontos ?? 0) }),
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

/* ---------- Navegação ---------- */
function continuar() {
  if (!cliente.value) return
  router.push({ path: rotaProfissional(cliente.value.id), state: { cliente: JSON.parse(JSON.stringify(cliente.value)) } })
}

onMounted(carregar)
onBeforeUnmount(() => controller?.abort())
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; max-width: 720px; padding-bottom: 96px; }
.min0 { min-width: 0; }
.corta { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.no-underline, .no-underline:hover { text-decoration: none; }
.avatar-lg { width: 48px; height: 48px; flex: none; font-size: 16px; }

.passos { display: flex; flex-wrap: wrap; gap: 16px; margin: 0; padding: 0; list-style: none; }
.passo { display: flex; align-items: center; gap: 8px; color: var(--text-2); }
.passo-n { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
  border: 1px solid var(--stroke-2); font-size: 12px; font-weight: 600; }
.passo.ativo { color: var(--text); font-weight: 600; }
.passo.ativo .passo-n { background: var(--accent); border-color: transparent; color: #fff; }
.passo.feito .passo-n { background: var(--success-bg); border-color: transparent; color: var(--success); }

.kv { display: flex; flex-direction: column; gap: 1px; margin: 0; overflow: hidden; background: var(--divider);
  border: 1px solid var(--stroke-2); border-radius: var(--r-lg); }
.kv-linha { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; background: var(--card); }
.kv dt { color: var(--text-2); }
.kv dd { margin: 0; font-weight: 600; text-align: right; overflow-wrap: anywhere; }

.skel { display: inline-block; height: 12px; border-radius: 6px;
  background: linear-gradient(90deg, var(--press) 25%, var(--hover) 50%, var(--press) 75%); background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }

/* Barra fixa de ação */
.acoes { position: fixed; z-index: 30; left: 0; right: 0; bottom: 0; padding: 12px clamp(16px, 4vw, 48px);
  background: var(--layer); border-top: 1px solid var(--divider); }
.acoes-linha { display: flex; justify-content: flex-end; gap: 8px; max-width: 720px; width: 100%; }
.acoes .btn { min-height: 36px; }
@media (min-width: 801px) { .acoes { left: 288px; } } /* respeita a .sidebar do win11.css */
@media (max-width: 520px) { .acoes-linha .btn-primary { flex: 1; } }
</style>
