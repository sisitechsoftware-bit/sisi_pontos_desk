<template>
  <div class="page">
    <!-- Cabeçalho -->
    <header class="flex flex-col gap-2">
      <nav class="breadcrumbs" aria-label="Caminho">
        <ul>
          <li><router-link to="/atendimentos">Atendimentos</router-link></li>
          <li>Em atendimento</li>
        </ul>
      </nav>
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <h1>Em atendimento</h1>
          <span class="badge badge-warning">Em andamento</span>
        </div>
        <p v-if="atendimento" class="salvo" :class="`salvo-${estadoSave}`" role="status" aria-live="polite">
          <template v-if="estadoSave === 'salvando'"><span class="loading mini" aria-hidden="true"></span> Salvando…</template>
          <template v-else-if="estadoSave === 'erro'">
            Não foi possível salvar.
            <button type="button" class="btn btn-link btn-sm" @click="salvar">Tentar novamente</button>
          </template>
          <template v-else-if="estadoSave === 'sujo'">Alterações pendentes…</template>
          <template v-else>✓ Alterações salvas</template>
        </p>
      </div>
    </header>

    <div v-if="erroCarga" class="alert alert-error" role="alert">
      <span><span class="alert-title">Não foi possível abrir o atendimento.</span> {{ erroCarga }}</span>
      <button type="button" class="btn btn-sm" @click="carregarAtendimento">Tentar novamente</button>
    </div>
    <progress v-else-if="!atendimento" class="progress" aria-label="Carregando atendimento"></progress>

    <template v-if="atendimento">
      <!-- Quem, com quem, quantos pontos -->
      <section class="card" aria-label="Dados do atendimento">
        <dl class="card-body ficha">
          <div class="ficha-item">
            <dt>Cliente</dt>
            <dd class="flex items-center gap-2 min0">
              <span class="avatar avatar-sm" aria-hidden="true">{{ iniciais(cliente?.nome) }}</span>
              <span class="min0"><strong class="semibold corta">{{ cliente?.nome ?? '—' }}</strong>
                <span class="caption corta">{{ cliente?.telefone || 'Sem telefone' }}</span></span>
            </dd>
          </div>
          <div class="ficha-item">
            <dt>Profissional</dt>
            <dd class="min0"><strong class="semibold corta">{{ funcionario?.nome ?? '—' }}</strong>
              <span class="caption corta">{{ funcionario?.especialidade || 'Sem especialidade informada' }}</span></dd>
          </div>
          <div class="ficha-item">
            <dt>Pontos</dt>
            <dd v-if="participa">
              <strong class="semibold">{{ saldo ?? '…' }} pts</strong>
              <span class="caption corta">{{ pontosDisponiveis }} livres para benefícios</span>
            </dd>
            <dd v-else><span class="caption">Cliente sem CPF: não participa dos pontos.</span></dd>
          </div>
        </dl>
      </section>

      <div v-if="erroAcao" class="alert alert-error" role="alert">
        <span>{{ erroAcao }}</span>
        <button type="button" class="btn btn-sm" @click="erroAcao = ''">Fechar</button>
      </div>

      <div class="layout">
        <!-- ========== Catálogo ========== -->
        <section class="catalogo" aria-label="Adicionar ao atendimento">
          <div class="tabs abas" role="tablist" aria-label="O que adicionar" @keydown="teclaAba">
            <button v-for="t in abas" :id="`aba-${t.chave}`" :key="t.chave" type="button" role="tab" class="tab"
              :class="{ 'tab-active': aba === t.chave }" :aria-selected="aba === t.chave" aria-controls="painel-catalogo"
              :tabindex="aba === t.chave ? 0 : -1" @click="aba = t.chave">
              {{ t.rotulo }}
              <span v-if="contagemAba(t.chave)" class="badge badge-primary">{{ contagemAba(t.chave) }}</span>
            </button>
          </div>

          <div id="painel-catalogo" role="tabpanel" :aria-labelledby="`aba-${aba}`" class="painel">
            <!-- Benefícios -->
            <template v-if="aba === 'beneficios'">
              <div class="card pontos-card">
                <div class="card-body gap-1">
                  <strong class="semibold">Você tem {{ saldo ?? 0 }} pontos</strong>
                  <span class="text-2">{{ pontosDisponiveis }} livres depois dos benefícios já usados neste atendimento.</span>
                </div>
              </div>

              <progress v-if="benefCarregando" class="progress" aria-label="Carregando benefícios"></progress>
              <div v-else-if="benefErro" class="alert alert-error" role="alert">
                <span>{{ benefErro }}</span>
                <button type="button" class="btn btn-sm" @click="carregarBeneficios">Tentar novamente</button>
              </div>
              <div v-else-if="!catalogoBeneficios.length" class="vazio card" role="status">
                <h3>Nenhum benefício cadastrado</h3>
                <p class="text-2">Quando houver benefícios no programa, eles aparecem aqui.</p>
              </div>

              <ul v-else class="lista">
                <li v-for="b in catalogoBeneficios" :key="b.id">
                  <div class="linha" :class="{ sel: aplicado(b.id), indisponivel: !aplicado(b.id) && !podeUsar(b) }">
                    <span class="linha-info">
                      <strong class="semibold nome">{{ b.nome }}</strong>
                      <span class="caption sub">{{ b.pontos }} pts · {{ descreverBeneficio(b) }}</span>
                    </span>
                    <button v-if="aplicado(b.id)" type="button" class="btn btn-sm" :aria-label="`Remover benefício ${b.nome}`"
                      @click="alternarBeneficio(b)">Remover</button>
                    <button v-else-if="podeUsar(b)" type="button" class="btn btn-sm btn-primary"
                      :aria-label="`Usar benefício ${b.nome}`" @click="alternarBeneficio(b)">Usar benefício</button>
                    <span v-else class="caption falta">Faltam {{ b.pontos - pontosDisponiveis }} pts</span>
                  </div>
                </li>
              </ul>
            </template>

            <!-- Serviços e produtos -->
            <template v-else>
              <div class="form-control">
                <label class="sr-only" for="busca-item">{{ aba === 'servicos' ? 'Buscar serviço' : 'Buscar produto' }}</label>
                <div class="busca">
                  <svg class="busca-icone" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input id="busca-item" v-model="catAtual.s.busca" class="input" type="search" autocomplete="off"
                    :placeholder="aba === 'servicos' ? 'Buscar serviço' : 'Buscar produto'" @input="catAtual.digitar()">
                </div>
              </div>

              <progress v-if="catAtual.s.carregando" class="progress" aria-label="Carregando"></progress>
              <div v-else class="progress-espaco"></div>

              <div v-if="catAtual.s.erro" class="alert alert-error" role="alert">
                <span>{{ catAtual.s.erro }}</span>
                <button type="button" class="btn btn-sm" @click="catAtual.recarregar()">Tentar novamente</button>
              </div>

              <ul v-if="catAtual.s.carregando && !itensVisiveis.length" class="lista" aria-hidden="true">
                <li v-for="n in 5" :key="'sk' + n" class="linha linha-skel">
                  <span class="linha-info"><span class="skel" style="width: 50%"></span><span class="skel" style="width: 25%"></span></span>
                  <span class="skel" style="width: 84px; height: 26px"></span>
                </li>
              </ul>

              <ul v-else-if="itensVisiveis.length" class="lista">
                <li v-for="it in itensVisiveis" :key="it.id">
                  <div class="linha" :class="{ sel: qtdDe(aba, it.id) > 0 }">
                    <span class="linha-info">
                      <strong class="semibold nome">{{ it.nome }}</strong>
                      <span class="caption sub">{{ moeda(it.preco) }}<template v-if="participa && it.pontos"> · +{{ it.pontos }} pts</template></span>
                    </span>

                    <div v-if="qtdDe(aba, it.id) > 0" class="stepper" role="group" :aria-label="`Quantidade de ${it.nome}`">
                      <button type="button" class="btn btn-sm btn-square"
                        :aria-label="qtdDe(aba, it.id) === 1 ? `Remover ${it.nome}` : `Diminuir quantidade de ${it.nome}`"
                        @click="mudarQtd(aba, it, -1)">−</button>
                      <output class="qtd" aria-live="polite">{{ qtdDe(aba, it.id) }}</output>
                      <button type="button" class="btn btn-sm btn-square" :aria-label="`Aumentar quantidade de ${it.nome}`"
                        @click="mudarQtd(aba, it, 1)">+</button>
                    </div>
                    <button v-else type="button" class="btn btn-sm" :aria-label="`Adicionar ${it.nome}`"
                      @click="mudarQtd(aba, it, 1)">+ Adicionar</button>
                  </div>
                </li>
              </ul>

              <div v-else-if="!catAtual.s.erro && !catAtual.s.carregando" class="vazio card" role="status">
                <h3>{{ catAtual.s.busca ? 'Nada encontrado' : (aba === 'servicos' ? 'Nenhum serviço cadastrado' : 'Nenhum produto cadastrado') }}</h3>
                <p class="text-2">{{ catAtual.s.busca ? 'Tente outro termo.' : 'Cadastre itens para poder adicioná-los ao atendimento.' }}</p>
                <button v-if="catAtual.s.busca" type="button" class="btn mt-2" @click="limparBusca">Limpar busca</button>
              </div>

              <div ref="sentinela" class="sentinela" aria-hidden="true"></div>
              <p v-if="catAtual.s.mais" class="rodape text-2" role="status">
                <span class="loading mini" aria-hidden="true"></span> Carregando mais…
              </p>
              <div v-if="catAtual.s.erroMais" class="alert alert-error" role="alert">
                <span>{{ catAtual.s.erroMais }}</span>
                <button type="button" class="btn btn-sm" @click="catAtual.pagina(catAtual.s.page + 1)">Tentar novamente</button>
              </div>
            </template>
          </div>
        </section>

        <!-- ========== Resumo (vira painel inferior no celular) ========== -->
        <div v-if="resumoAberto" class="sheet-backdrop" aria-hidden="true" @click="fecharResumo"></div>
        <aside class="resumo" :class="{ aberto: resumoAberto }" aria-label="Resumo do atendimento">
          <div class="card">
            <div class="card-body gap-4">
              <div class="flex items-center justify-between">
                <h2>Itens selecionados</h2>
                <button ref="btnFecharResumo" type="button" class="btn btn-ghost btn-square fechar-sheet"
                  aria-label="Fechar resumo" @click="fecharResumo">×</button>
              </div>

              <p v-if="!totalItens && !beneficiosAplicados.length" class="text-2">
                Nenhum item ainda. Escolha serviços ou produtos na lista para montar o atendimento.
              </p>

              <section v-for="g in grupos" :key="g.chave" class="grupo" :aria-label="g.rotulo">
                <h3 class="grupo-titulo">{{ g.rotulo }}</h3>
                <ul class="itens">
                  <li v-for="it in g.itens" :key="it.id" class="item">
                    <span class="min0">
                      <span class="corta">{{ it.nome }}</span>
                      <span class="caption">{{ it.qtd }} × {{ moeda(it.preco) }}</span>
                    </span>
                    <span class="item-fim">
                      <span class="semibold num">{{ moeda(it.preco * it.qtd) }}</span>
                      <button type="button" class="btn btn-ghost btn-sm btn-square" :aria-label="`Remover ${it.nome}`"
                        @click="remover(g.chave, it.id)">×</button>
                    </span>
                  </li>
                </ul>
              </section>

              <section v-if="beneficiosAplicados.length" class="grupo" aria-label="Benefícios">
                <h3 class="grupo-titulo">Benefícios</h3>
                <ul class="itens">
                  <li v-for="b in beneficiosAplicados" :key="b.id" class="item">
                    <span class="min0"><span class="corta">{{ b.nome }}</span><span class="caption">{{ b.pontos }} pts</span></span>
                    <span class="item-fim">
                      <span class="semibold num ok">−{{ moeda(b.valor) }}</span>
                      <button type="button" class="btn btn-ghost btn-sm btn-square" :aria-label="`Remover benefício ${b.nome}`"
                        @click="removerBeneficio(b.id)">×</button>
                    </span>
                  </li>
                </ul>
              </section>

              <dl class="kv">
                <div class="kv-linha"><dt>Subtotal</dt><dd>{{ moeda(subtotal) }}</dd></div>
                <div class="kv-linha"><dt>Benefícios</dt><dd :class="{ ok: descontoBeneficios > 0 }">{{ descontoBeneficios > 0 ? '−' : '' }}{{ moeda(descontoBeneficios) }}</dd></div>
                <div class="kv-linha kv-destaque"><dt>Total parcial</dt><dd>{{ moeda(totalParcial) }}</dd></div>
                <div v-if="participa" class="kv-linha"><dt>Pontos a gerar</dt><dd>+{{ pontosGerados }} pts</dd></div>
              </dl>

              <div class="flex flex-col gap-2">
                <button type="button" class="btn btn-primary btn-lg btn-block" :disabled="!totalItens || indoPagar"
                  aria-describedby="ajuda-pagar" @click="irParaPagamento">
                  <span v-if="indoPagar" class="loading mini" aria-hidden="true"></span>
                  {{ indoPagar ? 'Salvando…' : 'Ir para pagamento' }}
                </button>
                <small id="ajuda-pagar" class="centro">
                  {{ totalItens ? 'Você poderá dar desconto e escolher pago ou pendente na próxima etapa.' : 'Adicione ao menos um serviço ou produto.' }}
                </small>
              </div>

              <hr>
              <button type="button" class="btn btn-ghost btn-block btn-excluir" @click="abrirCancelar">Cancelar atendimento</button>
            </div>
          </div>
        </aside>
      </div>

      <!-- Barra do celular -->
      <div class="barra-mobile">
        <div class="min0">
          <strong class="semibold">{{ totalItens }} {{ totalItens === 1 ? 'item' : 'itens' }} · {{ moeda(totalParcial) }}</strong>
        </div>
        <button type="button" class="btn btn-primary" @click="abrirResumo">Revisar e pagar</button>
      </div>
    </template>

    <!-- Cancelar atendimento -->
    <dialog ref="dlgCancelar" class="modal" aria-labelledby="dlg-titulo" @cancel="aoCancelarDialogo">
      <div class="modal-box">
        <h2 id="dlg-titulo">Cancelar este atendimento?</h2>
        <p class="text-2">
          O atendimento de {{ cliente?.nome ?? 'cliente' }} será removido, junto com os itens já adicionados.
          <strong class="semibold">Esta ação não pode ser desfeita.</strong>
        </p>
        <div v-if="erroCancelar" class="alert alert-error" role="alert"><span>{{ erroCancelar }}</span></div>
        <div class="modal-action">
          <button type="button" class="btn" autofocus :disabled="cancelando" @click="dlgCancelar?.close()">Continuar atendimento</button>
          <button type="button" class="btn btn-error" :disabled="cancelando" @click="confirmarCancelar">
            {{ cancelando ? 'Cancelando…' : 'Cancelar atendimento' }}
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'

/* ---------- Configuração ---------- */
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8888/api-fidelidade/api'
const getToken = () => import.meta.env.VITE_API_TOKEN ?? localStorage.getItem('token') ?? 'seu-token-aqui'
const LIMIT = 20
const ROTA_LISTA = '/atendimentos'
const rotaPagamento = id => `/atendimentos/${id}/pagamento`

// Regra de negócio: só participa do programa de pontos quem tem CPF cadastrado.
const participaPontos = c => Boolean(c?.cpf)

const route = useRoute()
const router = useRouter()
const id = computed(() => Number(route.params.id))

/* ---------- Utilitários ---------- */
const cabecalhos = (comCorpo = false) => ({
  Accept: 'application/json',
  ...(comCorpo ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${getToken()}`,
})
const moeda = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0)
const num = v => Number(v) || 0
const arredonda = v => Math.round((Number(v) + Number.EPSILON) * 100) / 100
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

/* ---------- Atendimento ---------- */
const atendimento = ref(null)
const cliente = ref(null)
const funcionario = ref(null)
const saldo = ref(null)
const erroCarga = ref('')
const erroAcao = ref('')
const participa = computed(() => participaPontos(cliente.value))

// Itens escolhidos: { id, nome, preco, pontos, qtd }
const sel = reactive({ servicos: [], produtos: [] })
const beneficioIds = ref([])
const benefInfo = ref({}) // id -> { id, nome, pontos, valor, tipo }
const pronto = ref(false)

// Aceita tanto { servico_id, quantidade, nome, preco } quanto objetos aninhados
function normItem(x, tipo) {
  const base = x?.[tipo] ?? {}
  return {
    id: x?.[`${tipo}_id`] ?? x?.item_id ?? base.id ?? x?.id,
    nome: x?.nome ?? base.nome ?? 'Item',
    preco: num(x?.preco ?? x?.preco_unitario ?? x?.valor ?? base.preco),
    pontos: num(x?.pontos ?? base.pontos),
    qtd: Math.max(1, num(x?.quantidade ?? x?.qtd ?? 1)),
  }
}

function normBeneficio(x) {
  const base = x?.beneficio ?? {}
  return {
    id: x?.beneficio_id ?? base.id ?? x?.id,
    nome: x?.nome ?? base.nome ?? 'Benefício',
    pontos: num(x?.pontos_necessarios ?? x?.pontos ?? base.pontos_necessarios ?? base.pontos),
    valor: num(x?.valor_desconto ?? x?.valor ?? x?.preco ?? base.valor_desconto ?? base.valor),
    tipo: x?.tipo ?? base.tipo ?? 'desconto',
  }
}

async function carregarAtendimento() {
  erroCarga.value = ''
  try {
    const res = await fetch(`${API_URL}/atendimentos.php/${id.value}`, { headers: cabecalhos() })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(erroHttp(res, json))
    const a = extrairItem(json)

    // Atendimento já concluído (ou pendente): este não é mais o lugar dele
    if (a.status && a.status !== 'em_andamento') {
      router.replace(rotaPagamento(id.value))
      return
    }

    cliente.value = a.cliente ?? (await buscarUm('clientes.php', a.cliente_id))
    funcionario.value = a.funcionario ?? (await buscarUm('funcionarios.php', a.funcionario_id))

    sel.servicos = (a.servicos ?? []).map(x => normItem(x, 'servico'))
    sel.produtos = (a.produtos ?? []).map(x => normItem(x, 'produto'))
    const aplicados = (a.beneficios ?? []).map(normBeneficio)
    benefInfo.value = Object.fromEntries(aplicados.map(b => [b.id, b]))
    beneficioIds.value = aplicados.map(b => b.id)
    atendimento.value = a

    await nextTick()
    pronto.value = true // só a partir daqui as mudanças contam como edição do usuário

    if (participa.value) {
      fetch(`${API_URL}/clientes.php/${cliente.value.id}/pontos`, { headers: cabecalhos() })
        .then(r => (r.ok ? r.json() : null))
        .then(j => { saldo.value = num(j?.pontos) })
        .catch(() => { saldo.value = num(cliente.value?.pontos) })
      carregarBeneficios()
    }
    carregarCatalogo('servicos')
  } catch (e) {
    erroCarga.value = mensagemDeRede(e)
  }
}

async function buscarUm(arquivo, idRef) {
  if (idRef == null) return null
  try {
    const res = await fetch(`${API_URL}/${arquivo}/${idRef}`, { headers: cabecalhos() })
    return res.ok ? extrairItem(await res.json()) : null
  } catch { return null }
}

/* ---------- Catálogo paginado (serviços e produtos) ---------- */
function criarCatalogo(arquivo) {
  const s = reactive({ itens: [], page: 0, lastPage: 1, carregando: false, mais: false, erro: '', erroMais: '', busca: '' })
  let ctrl = null
  let timer = null

  async function pagina(p) {
    ctrl?.abort()
    const atual = new AbortController()
    ctrl = atual
    const primeira = p === 1
    if (primeira) { s.carregando = true; s.erro = ''; s.erroMais = '' } else { s.mais = true; s.erroMais = '' }

    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (s.busca.trim()) params.set('busca', s.busca.trim())
      const res = await fetch(`${API_URL}/${arquivo}?${params}`, { headers: cabecalhos(), signal: atual.signal })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(erroHttp(res, json))

      const lista = extrairLista(json).filter(x => x?.id != null)
        .map(x => ({ id: x.id, nome: x.nome, preco: num(x.preco), pontos: num(x.pontos) }))
      const jaTem = new Set(primeira ? [] : s.itens.map(x => x.id))
      const novos = lista.filter(x => !jaTem.has(x.id))
      s.itens = primeira ? novos : [...s.itens, ...novos]
      s.page = p

      const info = json?.lastPage ?? json?.last_page ?? json?.pages ?? json?.meta?.pages
      if (!novos.length) s.lastPage = p
      else if (info != null) s.lastPage = Math.max(Number(info), p)
      else s.lastPage = lista.length >= LIMIT ? p + 1 : p
    } catch (e) {
      if (e.name === 'AbortError') return
      if (primeira) { s.erro = mensagemDeRede(e); s.itens = []; s.page = 0 }
      else s.erroMais = `Não foi possível carregar mais itens. ${mensagemDeRede(e)}`
    } finally {
      if (ctrl === atual) { s.carregando = false; s.mais = false }
      nextTick(reobservar)
    }
  }

  const recarregar = () => { s.page = 0; s.lastPage = 1; return pagina(1) }
  const digitar = () => { clearTimeout(timer); timer = setTimeout(recarregar, 300) }
  const podeMais = () => s.page > 0 && s.page < s.lastPage && !s.carregando && !s.mais && !s.erro && !s.erroMais
  const parar = () => { ctrl?.abort(); clearTimeout(timer) }

  return { s, pagina, recarregar, digitar, podeMais, parar, iniciado: false }
}

const cat = { servicos: criarCatalogo('servicos.php'), produtos: criarCatalogo('produtos.php') }

function carregarCatalogo(chave) {
  if (cat[chave].iniciado) return
  cat[chave].iniciado = true
  cat[chave].pagina(1)
}

/* ---------- Abas ---------- */
const aba = ref('servicos')
const abas = computed(() => [
  { chave: 'servicos', rotulo: 'Serviços' },
  { chave: 'produtos', rotulo: 'Produtos' },
  ...(participa.value ? [{ chave: 'beneficios', rotulo: 'Benefícios' }] : []),
])
const catAtual = computed(() => cat[aba.value] ?? cat.servicos)

const contagemAba = chave =>
  chave === 'beneficios' ? beneficioIds.value.length : (sel[chave] ?? []).reduce((t, i) => t + i.qtd, 0)

watch(aba, async nova => {
  if (nova !== 'beneficios') carregarCatalogo(nova)
  await nextTick()
  reobservar()
})

function teclaAba(e) {
  const lista = abas.value
  const i = lista.findIndex(a => a.chave === aba.value)
  let prox = null
  if (e.key === 'ArrowRight') prox = (i + 1) % lista.length
  else if (e.key === 'ArrowLeft') prox = (i - 1 + lista.length) % lista.length
  else if (e.key === 'Home') prox = 0
  else if (e.key === 'End') prox = lista.length - 1
  if (prox == null) return
  e.preventDefault()
  aba.value = lista[prox].chave
  nextTick(() => document.getElementById(`aba-${lista[prox].chave}`)?.focus())
}

// Filtro local instantâneo enquanto o servidor responde
const itensVisiveis = computed(() => {
  const t = semAcento(catAtual.value.s.busca).trim()
  return t ? catAtual.value.s.itens.filter(i => semAcento(i.nome).includes(t)) : catAtual.value.s.itens
})

function limparBusca() {
  catAtual.value.s.busca = ''
  catAtual.value.recarregar()
}

/* ---------- Rolagem infinita ---------- */
const sentinela = ref(null)
let observer = null

function reobservar() {
  if (!observer || !sentinela.value) return
  observer.unobserve(sentinela.value)
  observer.observe(sentinela.value)
}

/* ---------- Itens ---------- */
const qtdDe = (tipo, itemId) => sel[tipo]?.find(i => i.id === itemId)?.qtd ?? 0

function mudarQtd(tipo, item, delta) {
  const lista = sel[tipo]
  const atual = lista.find(i => i.id === item.id)
  if (!atual) {
    if (delta > 0) lista.push({ id: item.id, nome: item.nome, preco: item.preco, pontos: item.pontos, qtd: 1 })
    return
  }
  atual.qtd = Math.min(atual.qtd + delta, 99)
  if (atual.qtd <= 0) remover(tipo, item.id)
}

function remover(tipo, itemId) {
  sel[tipo] = sel[tipo].filter(i => i.id !== itemId)
}

const grupos = computed(() =>
  [{ chave: 'servicos', rotulo: 'Serviços', itens: sel.servicos },
   { chave: 'produtos', rotulo: 'Produtos', itens: sel.produtos }].filter(g => g.itens.length),
)

/* ---------- Benefícios ---------- */
const catalogoBeneficios = ref([])
const benefCarregando = ref(false)
const benefErro = ref('')

async function carregarBeneficios() {
  benefCarregando.value = true
  benefErro.value = ''
  try {
    const res = await fetch(`${API_URL}/beneficios.php?page=1&limit=100`, { headers: cabecalhos() })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(erroHttp(res, json))
    const lista = extrairLista(json).map(normBeneficio).filter(b => b.id != null)
    catalogoBeneficios.value = lista
    benefInfo.value = { ...benefInfo.value, ...Object.fromEntries(lista.map(b => [b.id, b])) }
  } catch (e) {
    benefErro.value = `Não foi possível carregar os benefícios. ${mensagemDeRede(e)}`
  } finally {
    benefCarregando.value = false
  }
}

const aplicado = bid => beneficioIds.value.includes(bid)
const beneficiosAplicados = computed(() => beneficioIds.value.map(b => benefInfo.value[b]).filter(Boolean))
const pontosUsados = computed(() => beneficiosAplicados.value.reduce((t, b) => t + b.pontos, 0))
const pontosDisponiveis = computed(() => Math.max(0, (saldo.value ?? 0) - pontosUsados.value))
const podeUsar = b => b.pontos <= pontosDisponiveis.value

function alternarBeneficio(b) {
  if (aplicado(b.id)) beneficioIds.value = beneficioIds.value.filter(x => x !== b.id)
  else if (podeUsar(b)) beneficioIds.value = [...beneficioIds.value, b.id]
}
const removerBeneficio = bid => { beneficioIds.value = beneficioIds.value.filter(x => x !== bid) }

function descreverBeneficio(b) {
  if (b.tipo === 'desconto') return `Desconto de ${moeda(b.valor)}`
  return b.valor > 0 ? `Cortesia (vale ${moeda(b.valor)})` : 'Cortesia'
}

/* ---------- Totais ---------- */
const todosItens = computed(() => [...sel.servicos, ...sel.produtos])
const totalItens = computed(() => todosItens.value.reduce((t, i) => t + i.qtd, 0))
const subtotal = computed(() => arredonda(todosItens.value.reduce((t, i) => t + i.preco * i.qtd, 0)))
// O desconto de benefícios nunca passa do subtotal (o total não fica negativo)
const descontoBeneficios = computed(() =>
  Math.min(subtotal.value, arredonda(beneficiosAplicados.value.reduce((t, b) => t + b.valor, 0))))
const totalParcial = computed(() => arredonda(subtotal.value - descontoBeneficios.value))
const pontosGerados = computed(() => todosItens.value.reduce((t, i) => t + i.pontos * i.qtd, 0))

/* ---------- Salvamento automático ---------- */
// 'salvo' | 'sujo' | 'salvando' | 'erro'
const estadoSave = ref('salvo')
let timerSave = null
let repetir = false

const corpoSalvar = () => ({
  servicos: sel.servicos.map(i => ({ servico_id: i.id, quantidade: i.qtd })),
  produtos: sel.produtos.map(i => ({ produto_id: i.id, quantidade: i.qtd })),
  beneficios: beneficioIds.value.map(b => ({ beneficio_id: b })),
  valor_total: subtotal.value,
  pontos_resgatados: pontosUsados.value,
})

watch([() => sel.servicos, () => sel.produtos, beneficioIds], () => {
  if (!pronto.value) return
  estadoSave.value = 'sujo'
  clearTimeout(timerSave)
  timerSave = setTimeout(salvar, 700)
}, { deep: true })

async function salvar() {
  clearTimeout(timerSave)
  timerSave = null
  if (estadoSave.value === 'salvando') { repetir = true; return }
  estadoSave.value = 'salvando'
  try {
    const res = await fetch(`${API_URL}/atendimentos.php/${id.value}`, {
      method: 'PUT', headers: cabecalhos(true), body: JSON.stringify(corpoSalvar()),
    })
    if (!res.ok) throw new Error(erroHttp(res, await res.json().catch(() => null)))
    estadoSave.value = repetir ? 'sujo' : 'salvo'
  } catch (e) {
    estadoSave.value = 'erro'
    erroAcao.value = `Suas últimas alterações não foram salvas. ${mensagemDeRede(e)}`
  } finally {
    const denovo = repetir
    repetir = false
    if (denovo && estadoSave.value !== 'erro') salvar()
  }
}

// Garante que o servidor tem tudo antes de sair da tela
async function garantirSalvo() {
  if (estadoSave.value === 'sujo' || estadoSave.value === 'erro') await salvar()
  while (estadoSave.value === 'salvando' || (estadoSave.value === 'sujo' && timerSave === null)) {
    await new Promise(r => setTimeout(r, 80))
  }
  return estadoSave.value === 'salvo'
}

/* ---------- Navegação ---------- */
const indoPagar = ref(false)
let saindo = false

async function irParaPagamento() {
  if (!totalItens.value || indoPagar.value) return
  indoPagar.value = true
  erroAcao.value = ''
  const ok = await garantirSalvo()
  indoPagar.value = false
  if (!ok) { fecharResumo(); return }
  saindo = true
  router.push(rotaPagamento(id.value))
}

onBeforeRouteLeave(async () => {
  if (saindo || estadoSave.value === 'salvo') return true
  if (await garantirSalvo()) return true
  return window.confirm('Algumas alterações não foram salvas. Sair mesmo assim?')
})

function avisarAntesDeFechar(e) {
  if (estadoSave.value !== 'salvo') { e.preventDefault(); e.returnValue = '' }
}

/* ---------- Resumo no celular ---------- */
const resumoAberto = ref(false)
const btnFecharResumo = ref(null)

async function abrirResumo() {
  resumoAberto.value = true
  await nextTick()
  btnFecharResumo.value?.focus()
}
const fecharResumo = () => { resumoAberto.value = false }

function aoTeclar(e) {
  if (e.key === 'Escape' && resumoAberto.value && !dlgCancelar.value?.open) fecharResumo()
}

/* ---------- Cancelar atendimento ---------- */
const dlgCancelar = ref(null)
const cancelando = ref(false)
const erroCancelar = ref('')

function abrirCancelar() {
  erroCancelar.value = ''
  dlgCancelar.value?.showModal()
}
function aoCancelarDialogo(e) { if (cancelando.value) e.preventDefault() }

async function confirmarCancelar() {
  if (cancelando.value) return
  cancelando.value = true
  erroCancelar.value = ''
  try {
    const res = await fetch(`${API_URL}/atendimentos.php/${id.value}`, { method: 'DELETE', headers: cabecalhos() })
    if (!res.ok) throw new Error(erroHttp(res, await res.json().catch(() => null)))
    saindo = true
    dlgCancelar.value?.close()
    router.replace(ROTA_LISTA)
  } catch (e) {
    erroCancelar.value = mensagemDeRede(e)
  } finally {
    cancelando.value = false
  }
}

/* ---------- Ciclo de vida ---------- */
onMounted(() => {
  observer = new IntersectionObserver(entradas => {
    if (!entradas[0].isIntersecting || aba.value === 'beneficios') return
    const c = catAtual.value
    if (c.podeMais()) c.pagina(c.s.page + 1)
  }, { rootMargin: '240px 0px' })
  document.addEventListener('keydown', aoTeclar)
  window.addEventListener('beforeunload', avisarAntesDeFechar)
  carregarAtendimento()
})

// O sentinela só existe nas abas de serviços e produtos: observa quando ele aparece
watch(sentinela, el => { if (el && observer) { observer.disconnect(); observer.observe(el) } })

onBeforeUnmount(() => {
  clearTimeout(timerSave)
  cat.servicos.parar()
  cat.produtos.parar()
  observer?.disconnect()
  document.removeEventListener('keydown', aoTeclar)
  window.removeEventListener('beforeunload', avisarAntesDeFechar)
})
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.min0 { min-width: 0; }
.corta { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.centro { text-align: center; }
.ok { color: var(--success); }

/* Indicador de salvamento */
.salvo { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-2); }
.salvo-erro { color: var(--error); }
.loading.mini { width: 14px; height: 14px; border-width: 2px; }

/* Ficha */
.ficha { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 0; }
.ficha-item { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ficha dt { font-size: 12px; line-height: 16px; color: var(--text-2); }
.ficha dd { margin: 0; display: flex; }
.ficha dd:not(.flex) { flex-direction: column; }
.avatar-sm { width: 32px; height: 32px; flex: none; font-size: 12px; }

/* Layout */
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 16px; align-items: start; }
.catalogo { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.painel { display: flex; flex-direction: column; gap: 8px; }
.abas { overflow-x: auto; scrollbar-width: none; }
.abas::-webkit-scrollbar { display: none; }
.abas .tab { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }

.busca { position: relative; display: flex; align-items: center; }
.busca-icone { position: absolute; left: 10px; color: var(--text-2); pointer-events: none; }
.busca .input { padding-left: 36px; min-height: 40px; }
.progress-espaco { height: 3px; }

/* Linhas */
.lista { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; }
.linha { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 14px;
  border: 1px solid var(--stroke); border-radius: var(--r-lg); background: var(--card); box-shadow: var(--shadow-card);
  transition: background var(--t), border-color var(--t); }
.linha.sel { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--card)); }
.linha.indisponivel { background: transparent; box-shadow: none; }
.linha.indisponivel .linha-info { opacity: .65; }
.linha-skel { cursor: default; }
.linha-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.nome, .sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.falta { flex: none; text-align: right; }

.stepper { display: flex; align-items: center; gap: 4px; flex: none; }
.stepper .btn-square { width: 32px; min-height: 32px; font-size: 16px; }
.qtd { min-width: 28px; text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; }
.linha > .btn { flex: none; min-height: 32px; }

.pontos-card { background: color-mix(in srgb, var(--accent) 6%, var(--card)); }
.vazio { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 40px 16px; text-align: center; }
.sentinela { height: 1px; }
.rodape { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 0; }

.skel { display: inline-block; height: 12px; border-radius: 6px;
  background: linear-gradient(90deg, var(--press) 25%, var(--hover) 50%, var(--press) 75%); background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }

/* Resumo */
.resumo { position: sticky; top: 16px; }
.grupo { display: flex; flex-direction: column; gap: 4px; }
.grupo-titulo { font-size: 13px; line-height: 18px; color: var(--text-2); }
.itens { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.item { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--divider); }
.item:last-child { border-bottom: 0; }
.item-fim { display: flex; align-items: center; gap: 4px; flex: none; }
.num { font-variant-numeric: tabular-nums; }
.item-fim .btn-square { width: 28px; }

.kv { display: flex; flex-direction: column; gap: 1px; margin: 0; overflow: hidden; background: var(--divider);
  border: 1px solid var(--stroke-2); border-radius: var(--r-lg); }
.kv-linha { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: var(--card); }
.kv dt { color: var(--text-2); }
.kv dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }
.kv-destaque dd { font-size: 18px; line-height: 24px; }
.resumo hr { margin: 0; }
.btn-excluir:hover:not(:disabled), .btn-excluir:focus-visible { color: var(--error); background: var(--error-bg); }

.fechar-sheet { display: none; font-size: 20px; }
.sheet-backdrop { display: none; }
.barra-mobile { display: none; }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

/* Tablet e celular: resumo vira painel inferior, com barra fixa de totais */
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .page { padding-bottom: 72px; }
  .ficha { grid-template-columns: 1fr; gap: 12px; }

  .resumo { position: fixed; z-index: 40; left: 0; right: 0; bottom: 0; top: auto; display: none;
    max-height: 88vh; overflow-y: auto; box-shadow: var(--shadow-flyout); border-radius: var(--r-lg) var(--r-lg) 0 0; }
  .resumo.aberto { display: block; }
  .resumo .card { border-radius: var(--r-lg) var(--r-lg) 0 0; }
  .sheet-backdrop { display: block; position: fixed; z-index: 39; inset: 0; background: rgba(0, 0, 0, .35); }
  .fechar-sheet { display: inline-flex; }

  .barra-mobile { position: fixed; z-index: 30; left: 0; right: 0; bottom: 0; display: flex; align-items: center;
    justify-content: space-between; gap: 12px; padding: 10px 16px; background: var(--layer); border-top: 1px solid var(--divider); }
}
@media (max-width: 600px) {
  .modal-action { flex-direction: column; }
  .modal-action .btn { width: 100%; }
}
</style>
