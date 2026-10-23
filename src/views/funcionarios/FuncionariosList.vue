<template>
    <div class="page">
        <header class="flex flex-col gap-2">
            <div class="flex items-center justify-between flex-wrap gap-3">
                <h1 class="titulo">
                    <!-- <svg class="icone" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg> -->
                    <svg class="icone" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor"
                        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="16" rx="2.5" />
                        <circle cx="9" cy="10.5" r="2.2" />
                        <path d="M5.8 16.5a3.4 3.4 0 0 1 6.4 0" />
                        <path d="M14.5 9.5H18" />
                        <path d="M14.5 13H18" />
                    </svg>
                    Funcionários
                </h1>

                <div class="flex items-center gap-2">
                    <button type="button" class="btn" :disabled="loading" @click="carregar">
                        <span aria-hidden="true">↻</span> Atualizar
                    </button>
                    <button type="button" class="btn btn-primary" @click="novoFuncionario">
                        <span aria-hidden="true">+</span> Novo funcionário
                    </button>
                </div>
            </div>
            <p class="text-2">Equipe cadastrada que realiza os atendimentos no programa de fidelidade.</p>
        </header>

        <!-- Estado: falha ao carregar -->
        <div v-if="erro" class="alert alert-error" role="alert">
            <span><span class="alert-title">Não foi possível carregar os funcionários.</span> {{ erro }}</span>
            <button type="button" class="btn btn-sm" @click="carregar">Tentar novamente</button>
        </div>

        <!-- Aviso: API sem id nos itens -->
        <div v-if="semId" class="alert alert-warning" role="alert">
            <span>
                <span class="alert-title">Editar e excluir indisponíveis.</span>
                A API não está retornando o campo <code>id</code> em cada funcionário. Inclua-o no retorno de
                <code>funcionarios.php</code>.
            </span>
        </div>

        <div class="card">
            <div class="card-body gap-4">
                <!-- Barra de ferramentas -->
                <div class="toolbar">
                    <div class="form-control busca">
                        <label class="label-text semibold" for="busca">Buscar nesta página</label>
                        <input id="busca" v-model.trim="busca" class="input" type="search"
                            placeholder="Ex.: João ou 11999998888" autocomplete="off">
                    </div>
                    <div class="form-control por-pagina">
                        <label class="label-text semibold" for="limite">Itens por página</label>
                        <select id="limite" v-model.number="limit" class="select">
                            <option v-for="n in LIMITES" :key="n" :value="n">{{ n }}</option>
                        </select>
                    </div>
                </div>

                <progress v-if="loading" class="progress" aria-label="Carregando funcionários"></progress>
                <div v-else class="progress-espaco"></div>

                <!-- Tabela -->
                <div v-if="loading || itensVisiveis.length" class="tabela-wrap"
                    :class="{ carregando: loading && itens.length }" :aria-busy="loading">
                    <table class="tabela">
                        <caption class="sr-only">Lista de funcionários com telefone e ações</caption>
                        <thead>
                            <tr>
                                <th scope="col" :aria-sort="ariaSort('nome')">
                                    <button type="button" class="th-btn" @click="ordenar('nome')">Funcionário {{
                                        seta('nome') }}</button>
                                </th>
                                <th scope="col" :aria-sort="ariaSort('telefone')">
                                    <button type="button" class="th-btn" @click="ordenar('telefone')">Telefone {{
                                        seta('telefone') }}</button>
                                </th>
                                <th scope="col" class="acoes-col"><span class="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Skeleton no primeiro carregamento -->
                            <template v-if="loading && !itens.length">
                                <tr v-for="n in 5" :key="'sk' + n" aria-hidden="true">
                                    <td><span class="skel" style="width: 60%"></span></td>
                                    <td><span class="skel" style="width: 120px"></span></td>
                                    <td class="acoes-col"><span class="skel" style="width: 64px"></span></td>
                                </tr>
                            </template>
                            <template v-else>
                                <tr v-for="(f, i) in itensVisiveis" :key="idDe(f) ?? f.nome + i">
                                    <td class="semibold">
                                        <router-link v-if="idDe(f) != null" class="nome-link" :to="rotaEditar(idDe(f))"
                                            :title="`Editar ${f.nome}`">{{ f.nome }}</router-link>
                                        <template v-else>{{ f.nome }}</template>
                                    </td>
                                    <td class="tel">
                                        <a v-if="soDigitos(f.telefone)" class="nome-link"
                                            :href="`tel:${soDigitos(f.telefone)}`" :title="`Ligar para ${f.nome}`">{{
                                                telefone(f.telefone) }}</a>
                                        <span v-else class="text-2">—</span>
                                    </td>
                                    <td class="acoes-col">
                                        <div class="acoes-linha">
                                            <button type="button" class="btn btn-ghost btn-square btn-sm"
                                                :title="`Editar ${f.nome}`" :aria-label="`Editar ${f.nome}`"
                                                @click="editar(f)">
                                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                                                    stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
                                                    stroke-linejoin="round" aria-hidden="true">
                                                    <path d="M12 20h9" />
                                                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                                </svg>
                                            </button>
                                            <button type="button" class="btn btn-ghost btn-square btn-sm btn-excluir"
                                                :title="`Excluir ${f.nome}`" :aria-label="`Excluir ${f.nome}`"
                                                @click="pedirExclusao(f, $event)">
                                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                                                    stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
                                                    stroke-linejoin="round" aria-hidden="true">
                                                    <path d="M3 6h18" />
                                                    <path d="M8 6V4h8v2" />
                                                    <path d="M19 6l-1 14H6L5 6" />
                                                    <path d="M10 11v5M14 11v5" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>

                <!-- Estados vazios -->
                <div v-else-if="!erro" class="vazio" role="status">
                    <svg class="icone-vazio" viewBox="0 0 24 24" width="40" height="40" fill="none"
                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                        aria-hidden="true">
                        <rect x="3" y="4" width="18" height="16" rx="2.5" />
                        <circle cx="9" cy="10.5" r="2.2" />
                        <path d="M5.8 16.5a3.4 3.4 0 0 1 6.4 0" />
                        <path d="M14.5 9.5H18" />
                        <path d="M14.5 13H18" />
                    </svg>
                    <h3>{{ busca ? 'Nenhum resultado' : 'Nenhum funcionário cadastrado' }}</h3>
                    <p class="text-2">
                        {{ busca ? 'Tente outro termo ou limpe a busca.' : 'Cadastre o primeiro funcionário para começar.' }}
                    </p>
                    <button v-if="busca" type="button" class="btn mt-2" @click="busca = ''">Limpar busca</button>
                    <button v-else type="button" class="btn btn-primary mt-2" @click="novoFuncionario">+ Novo
                        funcionário</button>
                </div>

                <!-- Rodapé: resumo + paginação -->
                <footer class="rodape">
                    <small role="status">{{ resumo }}</small>

                    <nav v-if="lastPage > 1" class="paginacao" aria-label="Paginação">
                        <button type="button" class="btn btn-sm" :disabled="page <= 1 || loading"
                            @click="irPara(page - 1)">‹
                            Anterior</button>
                        <template v-for="(p, i) in paginas" :key="i">
                            <span v-if="p === '…'" class="reticencias" aria-hidden="true">…</span>
                            <button v-else type="button" class="btn btn-sm" :class="{ 'btn-active': p === page }"
                                :aria-current="p === page ? 'page' : undefined" :aria-label="`Página ${p}`"
                                :disabled="loading" @click="irPara(p)">{{ p }}</button>
                        </template>
                        <button type="button" class="btn btn-sm" :disabled="page >= lastPage || loading"
                            @click="irPara(page + 1)">Próxima ›</button>
                    </nav>
                </footer>
            </div>
        </div>

        <!-- Confirmação de exclusão -->
        <dialog ref="dlgExcluir" class="modal" aria-labelledby="dlg-titulo" aria-describedby="dlg-desc"
            @cancel="aoCancelarDialogo" @close="aoFecharDialogo">
            <div class="modal-box">
                <div class="dlg-topo">
                    <span class="dlg-icone" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
                            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v5M14 11v5" />
                        </svg>
                    </span>
                    <h2 id="dlg-titulo" class="dlg-titulo">Excluir {{ alvo?.nome }}?</h2>
                </div>

                <p id="dlg-desc" class="text-2">
                    Este funcionário será removido do programa de fidelidade e não poderá mais ser vinculado a
                    atendimentos.
                    <strong class="aviso-final">Esta ação não pode ser desfeita.</strong>
                </p>

                <!-- Resumo: ajuda a confirmar que é o item certo -->
                <dl v-if="alvo" class="resumo">
                    <div class="resumo-item">
                        <dt>Telefone</dt>
                        <dd>{{ telefone(alvo.telefone) || '—' }}</dd>
                    </div>
                </dl>

                <div v-if="erroExclusao" class="alert alert-error" role="alert">
                    <span><span class="alert-title">Não foi possível excluir.</span> {{ erroExclusao }}</span>
                </div>

                <progress v-if="excluindo" class="progress" aria-label="Excluindo"></progress>

                <div class="modal-action">
                    <!-- Foco inicial na opção segura, para evitar exclusão por Enter acidental -->
                    <button type="button" class="btn" autofocus :disabled="excluindo" @click="fecharDialogo">
                        Manter funcionário
                    </button>
                    <button type="button" class="btn btn-error" :disabled="excluindo" @click="confirmarExclusao">
                        <span v-if="excluindo" class="loading mini" aria-hidden="true"></span>
                        {{ excluindo ? 'Excluindo…' : (erroExclusao ? 'Tentar novamente' : 'Excluir funcionário') }}
                    </button>
                </div>
            </div>
        </dialog>

        <!-- Avisos (toast) -->
        <div class="toast" role="status" aria-live="polite">
            <div v-for="t in toasts" :key="t.id" class="alert" :class="`alert-${t.tipo}`">
                <span>{{ t.texto }}</span>
                <button type="button" class="btn btn-ghost btn-sm" aria-label="Fechar aviso"
                    @click="fecharToast(t.id)">×</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* ---------- Configuração ---------- */
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8888/api-fidelidade/api'
const getToken = () => import.meta.env.VITE_API_TOKEN ?? localStorage.getItem('token') ?? 'seu-token-aqui'

// Ajuste conforme suas rotas
const ROTA_NOVO = '/funcionarios/novo'
const rotaEditar = id => `/funcionarios/${id}/editar`

// Excluir: DELETE {API_URL}/funcionarios.php/{id}
const urlFuncionario = id => `${API_URL}/funcionarios.php/${id}`

// O retorno da listagem precisa trazer o identificador de cada funcionário
const idDe = f => f?.id ?? f?.id_funcionario ?? f?.idFuncionario ?? null

const route = useRoute()
const router = useRouter()

/* ---------- Estado ---------- */
const LIMITES = [10, 20, 50, 100]
const limiteInicial = Number(route.query.limit)

const itens = ref([])
const total = ref(0)
const page = ref(Math.max(Number(route.query.page) || 1, 1))
const limit = ref(LIMITES.includes(limiteInicial) ? limiteInicial : 20)
const lastPage = ref(1)
const loading = ref(false)
const erro = ref('')
const busca = ref('')
const ordem = ref({ campo: null, dir: 'asc' })

// Exclusão
const dlgExcluir = ref(null)
const alvo = ref(null)
const excluindo = ref(false)
const erroExclusao = ref('')
let gatilho = null // botão que abriu o diálogo, para devolver o foco

// Toasts
const toasts = ref([])
let toastSeq = 0
const timers = new Map()

let controller = null

const MSG_SEM_ID = 'Este funcionário não tem identificador (id) no retorno da API. Inclua o campo id em funcionarios.php.'

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

const semId = computed(() => itens.value.length > 0 && itens.value.some(f => idDe(f) == null))

/* ---------- Listagem ---------- */
async function carregar() {
    controller?.abort()
    const atual = new AbortController()
    controller = atual
    loading.value = true
    erro.value = ''

    // Página e limite na URL: o botão Voltar e o link compartilhado mantêm o contexto
    router.replace({ query: { ...route.query, page: page.value, limit: limit.value } })

    try {
        const res = await fetch(`${API_URL}/funcionarios.php?page=${page.value}&limit=${limit.value}`, {
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
    } catch (e) {
        if (e.name === 'AbortError') return
        erro.value = mensagemDeRede(e)
        itens.value = []
    } finally {
        if (controller === atual) loading.value = false
    }
}

/* ---------- Editar ---------- */
function editar(funcionario) {
    const id = idDe(funcionario)
    if (id == null) return avisar(MSG_SEM_ID, 'error')
    router.push(rotaEditar(id))
}

/* ---------- Exclusão ---------- */
function pedirExclusao(funcionario, evento) {
    if (idDe(funcionario) == null) return avisar(MSG_SEM_ID, 'error')
    gatilho = evento?.currentTarget ?? null
    alvo.value = funcionario
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
    excluindo.value = true
    erroExclusao.value = ''

    try {
        const res = await fetch(urlFuncionario(idDe(removido)), { method: 'DELETE', headers: cabecalhos() })
        if (!res.ok) {
            const json = await res.json().catch(() => null)
            throw new Error(erroHttp(res, json))
        }

        gatilho = null // a linha deixa de existir; o foco vai para o corpo da página
        dlgExcluir.value?.close()
        avisar(`Funcionário “${removido.nome}” excluído.`)

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

/* ---------- Derivados ---------- */
const soDigitos = v => String(v ?? '').replace(/\D/g, '')

// 11999998888 → (11) 99999-8888 | 1133334444 → (11) 3333-4444
function telefone(v) {
    const d = soDigitos(v)
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return String(v ?? '')
}

const itensVisiveis = computed(() => {
    const termo = busca.value.toLowerCase()
    const termoDigitos = soDigitos(busca.value)
    const lista = termo
        ? itens.value.filter(f =>
            f.nome?.toLowerCase().includes(termo) ||
            (termoDigitos && soDigitos(f.telefone).includes(termoDigitos)))
        : [...itens.value]

    const { campo, dir } = ordem.value
    if (campo) {
        const m = dir === 'asc' ? 1 : -1
        lista.sort((a, b) => {
            if (campo === 'telefone') return (soDigitos(a.telefone) - soDigitos(b.telefone)) * m
            return String(a[campo] ?? '').localeCompare(String(b[campo] ?? ''), 'pt-BR') * m
        })
    }
    return lista
})

const resumo = computed(() => {
    if (loading.value && !itens.value.length) return 'Carregando…'
    if (!total.value) return 'Nenhum funcionário'
    const ini = (page.value - 1) * limit.value + 1
    const fim = Math.min(page.value * limit.value, total.value)
    const base = `Mostrando ${ini}–${fim} de ${total.value} funcionário${total.value > 1 ? 's' : ''}`
    return busca.value ? `${base} · ${itensVisiveis.value.length} correspondem à busca` : base
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

/* ---------- Ações ---------- */
const novoFuncionario = () => router.push(ROTA_NOVO)

function irPara(p) {
    if (p < 1 || p > lastPage.value || p === page.value) return
    page.value = p
}

// Alterna: crescente → decrescente → sem ordem
function ordenar(campo) {
    const o = ordem.value
    if (o.campo !== campo) ordem.value = { campo, dir: 'asc' }
    else if (o.dir === 'asc') ordem.value = { campo, dir: 'desc' }
    else ordem.value = { campo: null, dir: 'asc' }
}
const seta = c => (ordem.value.campo === c ? (ordem.value.dir === 'asc' ? '↑' : '↓') : '')
const ariaSort = c => (ordem.value.campo === c ? (ordem.value.dir === 'asc' ? 'ascending' : 'descending') : 'none')

/* ---------- Ciclo de vida ---------- */
watch(page, carregar)
watch(limit, () => {
    if (page.value !== 1) page.value = 1 // dispara o watch de page
    else carregar()
})

onMounted(carregar)
onBeforeUnmount(() => {
    controller?.abort()
    timers.forEach(clearTimeout)
})
</script>

<style scoped>
.page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 960px;
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

.toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-end;
}

.busca {
    flex: 1;
    min-width: 220px;
}

.por-pagina {
    width: 140px;
}

.progress-espaco {
    height: 3px;
}

.tabela-wrap {
    overflow-x: auto;
    border: 1px solid var(--stroke);
    border-radius: var(--r-lg);
    transition: opacity var(--t);
}

.tabela-wrap.carregando {
    opacity: .55;
}

.tabela {
    width: 100%;
    border-collapse: collapse;
}

.tabela th,
.tabela td {
    padding: 0 16px;
    height: 44px;
    text-align: left;
    border-bottom: 1px solid var(--divider);
}

.tabela thead th {
    background: var(--layer);
    color: var(--text-2);
    font-weight: 600;
    font-size: 12px;
}

.tabela tbody tr:last-child td {
    border-bottom: 0;
}

.tabela tbody tr:hover {
    background: var(--hover);
}

.tabela .num,
.tabela .tel {
    font-variant-numeric: tabular-nums;
}

.tabela .num {
    text-align: right;
}

.acoes-col {
    width: 1%;
    white-space: nowrap;
    text-align: right !important;
}

.acoes-linha {
    display: inline-flex;
    gap: 2px;
}

/* Ação destrutiva só ganha cor de alerta ao interagir */
.btn-excluir:hover:not(:disabled),
.btn-excluir:focus-visible {
    color: var(--error);
    background: var(--error-bg);
}

.nome-link {
    color: var(--text);
    text-decoration: none;
}

.nome-link:hover {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 2px;
}

.th-btn {
    all: unset;
    cursor: pointer;
    padding: 4px 8px;
    margin: 0 -8px;
    border-radius: var(--r);
    color: inherit;
    font: inherit;
}

.th-btn:hover {
    background: var(--hover);
    color: var(--text);
}

.th-btn:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
}

.skel {
    display: inline-block;
    height: 12px;
    border-radius: 6px;
    background: linear-gradient(90deg, var(--press) 25%, var(--hover) 50%, var(--press) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
}

@keyframes shimmer {
    to {
        background-position: -200% 0;
    }
}

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

.rodape {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
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
    grid-template-columns: minmax(0, 1fr);
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

code {
    padding: 0 4px;
    border-radius: var(--r);
    background: var(--press);
    font-size: 12px;
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
</style>