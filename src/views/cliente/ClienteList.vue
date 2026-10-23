<template>
    <div class="clientes-page flex flex-col gap-4">
        <!-- Cabeçalho -->
        <header class="flex justify-between items-center flex-wrap gap-4">
            <div class="flex flex-col gap-1">
                <h1 class="flex items-center gap-3">
                    <svg class="icon icon-lg title-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05A4.2 4.2 0 0 1 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
                    </svg>
                    <!-- <svg class="icone" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor"
                        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg> -->
                          <!-- <svg class="icone-vazio" viewBox="0 0 24 24" width="40" height="40" fill="none"
                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                        aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg> -->
                    Clientes
                </h1>
                <p class="text-2">Gerencie os clientes cadastrados no sistema.</p>
            </div>

            <div class="flex items-center flex-wrap gap-2">
                <div class="search">
                    <svg class="icon search-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 5 1.5-1.5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14Z" />
                    </svg>
                    <input v-model="busca" class="input" type="search"
                        placeholder="Buscar por nome, telefone ou cartão..." aria-label="Buscar clientes" />
                </div>

                <button class="btn btn-square tooltip" data-tip="Filtro" type="button" aria-label="Filtro">
                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M10 18h4v-2h-4v2ZM3 6v2h18V6H3Zm3 7h12v-2H6v2Z" />
                    </svg>
                </button>

                <router-link to="/clientes/novo" class="btn btn-primary no-underline">
                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z" />
                    </svg>
                    Novo cliente
                </router-link>
            </div>
        </header>

        <!-- Feedback de sucesso (some sozinho) -->
        <div v-if="mensagemSucesso" ref="sucessoEl" class="alert alert-sucesso" role="status" aria-live="polite"
            tabindex="-1">
            <span>{{ mensagemSucesso }}</span>
            <button class="btn btn-sm" type="button" @click="limparSucesso">Fechar</button>
        </div>

        <!-- Barra de letras -->
        <nav class="flex flex-wrap gap-1" aria-label="Filtro por letra">
            <button v-for="l in letras" :key="l" type="button" class="btn btn-sm btn-square semibold"
                :disabled="!gruposMap[l]" @click="irParaLetra(l)">
                {{ l }}
            </button>
        </nav>

        <div v-if="erro" class="alert alert-error" role="alert">
            <span><span class="alert-title">Não foi possível carregar.</span> {{ erro }}</span>
            <button class="btn btn-sm" type="button" @click="carregar(pagina)">Tentar novamente</button>
        </div>

        <div v-if="carregando" class="flex items-center gap-3 text-2" role="status" aria-live="polite">
            <span class="loading"></span> Carregando clientes…
        </div>

        <template v-else>
            <div v-if="clientes.length === 0 && !erro" class="alert">
                <span>Nenhum cliente cadastrado ainda. Use “Novo cliente” para começar.</span>
            </div>
            <div v-else-if="grupos.length === 0" class="alert">
                <span>Nenhum cliente encontrado para “{{ busca }}”. Tente buscar por outro nome, telefone ou
                    cartão.</span>
            </div>

            <!-- Grupos por letra -->
            <section v-for="g in grupos" :key="g.letra" :id="`letra-${g.letra}`" class="section grupo">
                <h2 class="grupo-letra">{{ g.letra }}</h2>

                <article v-for="c in g.itens" :key="c.id" class="card card-compact card-cliente">
                    <div class="card-body">
                        <div class="flex items-center gap-3">
                            <div class="avatar" aria-hidden="true">{{ iniciais(c.nome) }}</div>

                            <div class="flex flex-col grow card-nome">
                                <strong class="semibold nome-texto">{{ c.nome }}</strong>
                                <span class="flex items-center gap-1 caption">
                                    <svg class="icon icon-sm estrela" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" />
                                    </svg>
                                    {{ c.pontos ?? 0 }} pontos
                                </span>
                            </div>

                            <div class="flex items-center gap-1">
                                <router-link :to="`/clientes/${c.id}`"
                                    class="btn btn-ghost btn-square icon-link tooltip" data-tip="Ver detalhes"
                                    :aria-label="`Ver detalhes de ${c.nome}`">
                                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5ZM12 17a5 5 0 1 1 5-5 5 5 0 0 1-5 5Zm0-8a3 3 0 1 0 3 3 3 3 0 0 0-3-3Z" />
                                    </svg>
                                </router-link>

                                <router-link :to="`/clientes/${c.id}/editar`"
                                    class="btn btn-ghost btn-square icon-link tooltip" data-tip="Editar"
                                    :aria-label="`Editar ${c.nome}`">
                                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
                                    </svg>
                                </router-link>

                                <!-- Ação destrutiva: isolada das demais para evitar clique acidental -->
                                <span class="separador" aria-hidden="true"></span>

                                <button type="button" class="btn btn-ghost btn-square btn-excluir tooltip"
                                    data-tip="Excluir" :aria-label="`Excluir ${c.nome}`" @click="abrirExclusao(c)">
                                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div class="flex flex-col gap-1 text-2 card-info">
                            <div class="flex items-center gap-2">
                                <svg class="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.57 1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
                                </svg>
                                <span>{{ c.telefone || 'Sem telefone' }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <svg class="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 14H4v-6h16v6Zm0-10H4V6h16v2Z" />
                                </svg>
                                <span>Cartão {{ c.numero_cartao }}</span>
                            </div>
                        </div>
                    </div>
                </article>
            </section>

            <div v-if="totalPaginas > 1" class="flex items-center justify-center gap-4 mt-2">
                <button class="btn" type="button" @click="carregar(pagina - 1)" :disabled="pagina <= 1">‹
                    Anterior</button>
                <span class="text-2">Página {{ pagina }} de {{ totalPaginas }}</span>
                <button class="btn" type="button" @click="carregar(pagina + 1)"
                    :disabled="pagina >= totalPaginas">Próxima ›</button>
            </div>
        </template>

        <!-- Confirmação de exclusão -->
        <dialog ref="dlgExcluir" class="modal" aria-labelledby="excluir-titulo" aria-describedby="excluir-desc"
            @cancel.prevent="cancelarExclusao" @click="aoClicarFora">
            <div class="modal-box" :aria-busy="excluindo">
                <h2 id="excluir-titulo">Excluir {{ clienteParaExcluir?.nome }}?</h2>

                <p id="excluir-desc" class="text-2">
                    O cadastro, os pontos e o cartão deste cliente serão removidos do programa de
                    fidelidade. <strong class="semibold">Esta ação não pode ser desfeita.</strong>
                </p>

                <!-- Resumo para o usuário confirmar que é o cliente certo (nomes parecidos são comuns) -->
                <dl v-if="clienteParaExcluir" class="resumo-exclusao">
                    <div>
                        <dt class="text-2">Cartão</dt>
                        <dd class="semibold">{{ clienteParaExcluir.numero_cartao }}</dd>
                    </div>
                    <div>
                        <dt class="text-2">Telefone</dt>
                        <dd class="semibold">{{ clienteParaExcluir.telefone || '—' }}</dd>
                    </div>
                    <div>
                        <dt class="text-2">Pontos</dt>
                        <dd class="semibold">{{ clienteParaExcluir.pontos ?? 0 }}</dd>
                    </div>
                </dl>

                <!-- Erro dentro do próprio modal: o usuário não perde o contexto -->
                <div v-if="erroExclusao" class="alert alert-error" role="alert">
                    <span><span class="alert-title">Não foi possível excluir.</span> {{ erroExclusao }}</span>
                </div>

                <div class="modal-action">
                    <button ref="btnManterEl" type="button" class="btn" :disabled="excluindo" @click="cancelarExclusao">
                        Manter cliente
                    </button>
                    <button type="button" class="btn btn-perigo" :disabled="excluindo" @click="confirmarExclusao">
                        <span v-if="excluindo" class="loading mini" aria-hidden="true"></span>
                        {{ excluindo ? 'Excluindo…' : (erroExclusao ? 'Tentar novamente' : 'Excluir cliente') }}
                    </button>
                </div>
            </div>
        </dialog>
    </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const API_URL = 'http://localhost:8888/api-fidelidade/api/clientes.php' // ajuste aqui

const clientes = ref([])
const carregando = ref(true)
const erro = ref('')
const pagina = ref(1)
const totalPaginas = ref(1)
const busca = ref('')

/* Exclusão */
const dlgExcluir = ref(null)
const btnManterEl = ref(null)
const sucessoEl = ref(null)
const clienteParaExcluir = ref(null)
const excluindo = ref(false)
const erroExclusao = ref('')
const mensagemSucesso = ref('')
let timerSucesso = null

const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function semAcento(s) {
    return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function iniciais(nome) {
    const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean)
    if (partes.length === 0) return '?'
    if (partes.length === 1) return partes[0][0].toUpperCase()
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

const filtrados = computed(() => {
    const termo = semAcento(busca.value).toLowerCase().trim()
    if (!termo) return clientes.value
    return clientes.value.filter((c) =>
        [c.nome, c.telefone, c.numero_cartao].some((v) =>
            semAcento(v).toLowerCase().includes(termo)
        )
    )
})

const grupos = computed(() => {
    const ordenados = [...filtrados.value].sort((a, b) =>
        String(a.nome ?? '').localeCompare(String(b.nome ?? ''), 'pt-BR')
    )
    const mapa = {}
    for (const c of ordenados) {
        const primeira = semAcento(c.nome).trim().charAt(0).toUpperCase()
        const letra = /[A-Z]/.test(primeira) ? primeira : '#'
            ; (mapa[letra] ??= []).push(c)
    }
    return Object.keys(mapa)
        .sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
        .map((letra) => ({ letra, itens: mapa[letra] }))
})

const gruposMap = computed(() => Object.fromEntries(grupos.value.map((g) => [g.letra, g])))

function irParaLetra(l) {
    document.getElementById(`letra-${l}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* silencioso = atualiza a lista sem trocar tudo por "Carregando…" (evita pulo de tela e perda de scroll) */
async function carregar(p = 1, { silencioso = false } = {}) {
    if (!silencioso) carregando.value = true
    erro.value = ''
    try {
        const res = await fetch(`${API_URL}/`)
        // const res = await fetch(`${API_URL}/?page=${p}&limit=20`)
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error?.message || 'Erro ao carregar clientes.')

        // Normaliza possíveis formatos de resposta do Paginator
        clientes.value = json.data ?? json.items ?? (Array.isArray(json) ? json : [])
        pagina.value = Number(json.page ?? json.meta?.page ?? p)
        totalPaginas.value = Number(json.pages ?? json.last_page ?? json.meta?.pages ?? 1)
    } catch (e) {
        erro.value = e instanceof TypeError
            ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
            : e.message
    } finally {
        carregando.value = false
    }
}

/* ---------- Feedback de sucesso ---------- */
function mostrarSucesso(texto) {
    clearTimeout(timerSucesso)
    mensagemSucesso.value = texto
    timerSucesso = setTimeout(limparSucesso, 6000)
}

function limparSucesso() {
    clearTimeout(timerSucesso)
    mensagemSucesso.value = ''
}

/* ---------- Exclusão com modal de confirmação ---------- */
async function abrirExclusao(cliente) {
    limparSucesso()
    clienteParaExcluir.value = cliente
    erroExclusao.value = ''
    dlgExcluir.value?.showModal()
    // Foco inicial na opção segura: um "Enter" sem querer não apaga nada
    await nextTick()
    btnManterEl.value?.focus()
}

function fecharModal() {
    dlgExcluir.value?.close()
    clienteParaExcluir.value = null
    erroExclusao.value = ''
}

function cancelarExclusao() {
    if (excluindo.value) return // não fecha no meio da requisição
    fecharModal()
}

// Clique na área escura fora da caixa = cancelar
function aoClicarFora(e) {
    if (e.target === dlgExcluir.value) cancelarExclusao()
}

async function confirmarExclusao() {
    const cliente = clienteParaExcluir.value
    if (!cliente || excluindo.value) return

    excluindo.value = true
    erroExclusao.value = ''
    try {
        const res = await fetch(`${API_URL}/${cliente.id}`, { method: 'DELETE' })
        if (!res.ok) {
            const json = await res.json().catch(() => null)
            throw new Error(json?.error?.message || `Erro ${res.status} ao excluir.`)
        }

        const nome = cliente.nome
        fecharModal()

        const ultimoDaPagina = clientes.value.length === 1 && pagina.value > 1
        await carregar(ultimoDaPagina ? pagina.value - 1 : pagina.value, { silencioso: true })

        mostrarSucesso(`Cliente “${nome}” excluído.`)
        await nextTick()
        sucessoEl.value?.focus()
    } catch (e) {
        // Mantém o modal aberto e mostra o erro ali mesmo, com opção de tentar de novo
        erroExclusao.value = e instanceof TypeError
            ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
            : e.message
    } finally {
        excluindo.value = false
    }
}

onMounted(() => carregar(1))
onBeforeUnmount(() => clearTimeout(timerSucesso))
</script>

<style scoped>
/* Só o que o win11.css não cobre (ícones SVG e pequenos ajustes).
   Cores, bordas, botões, cards etc. vêm das classes/variáveis do win11.css */
.clientes-page {
    /* padding: 24px; */
}

/* Ícones */
.icon {
    width: 20px;
    height: 20px;
    fill: currentColor;
    flex-shrink: 0;
}

.icon-sm {
    width: 16px;
    height: 16px;
}

.icon-lg {
    width: 28px;
    height: 28px;
}

.title-icon {
    color: var(--accent);
}

.estrela {
    color: #f7b500;
}

/* Busca com ícone */
.search {
    position: relative;
    display: flex;
    align-items: center;
}

.search-icon {
    position: absolute;
    left: 10px;
    color: var(--text-2);
    pointer-events: none;
}

.search .input {
    width: 320px;
    max-width: 100%;
    padding-left: 36px;
}

/* <a> do router-link com .btn: evita sublinhado e troca de cor do estilo global de links */
.no-underline,
.icon-link {
    text-decoration: none;
}

.btn-primary.no-underline,
.btn-primary.no-underline:hover {
    color: var(--on-accent);
}

.icon-link,
.icon-link:hover {
    color: var(--text);
}

.btn-excluir:hover:not(:disabled) {
    color: var(--error);
}

/* Separa a ação destrutiva das ações seguras */
.separador {
    width: 1px;
    height: 20px;
    margin: 0 6px;
    background: currentColor;
    opacity: .2;
}

/* Grupos e cards */
.grupo {
    margin-bottom: 8px;
}

.grupo-letra {
    color: var(--accent);
}

.card-cliente {
    transition: background var(--t);
}

.card-cliente:hover {
    background: var(--fill-h);
}

.card-cliente .card-body {
    gap: 8px;
}

.card-nome {
    min-width: 0;
}

.nome-texto {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.card-info {
    padding-left: 52px;
    font-size: 13px;
}

/* Tooltip dos botões do card não pode ser cortado pelo overflow:hidden do .card */
.card-cliente {
    overflow: visible;
}

/* Feedback de sucesso */
.alert-sucesso {
    border-left: 4px solid #107c10;
    outline: none;
}

/* Modal de exclusão */
.resumo-exclusao {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin: 16px 0 0;
    padding: 12px;
    border: 1px solid currentColor;
    border-color: color-mix(in srgb, currentColor 15%, transparent);
    border-radius: 8px;
}

.resumo-exclusao dt {
    font-size: 12px;
}

.resumo-exclusao dd {
    margin: 2px 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.modal-box .alert {
    margin-top: 16px;
}

.btn-perigo {
    background: var(--error);
    border-color: var(--error);
    color: #fff;
}

.btn-perigo:hover:not(:disabled) {
    filter: brightness(.92);
}

.loading.mini {
    width: 14px;
    height: 14px;
    border-width: 2px;
}

@media (max-width: 600px) {

    .search,
    .search .input {
        width: 100%;
    }

    .card-info {
        padding-left: 0;
    }

    /* Botões do modal em largura total: alvo de toque maior */
    .modal-action {
        flex-direction: column;
    }

    .modal-action .btn {
        width: 100%;
    }

    .resumo-exclusao {
        grid-template-columns: 1fr 1fr;
    }
}
</style>