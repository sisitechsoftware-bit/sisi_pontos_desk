<template>
  <div class="page">
    <header class="flex flex-col gap-2">
      <nav class="breadcrumbs" aria-label="Caminho">
        <ul>
          <li><router-link to="/atendimentos">Atendimentos</router-link></li>
          <li>{{ titulo }}</li>
        </ul>
      </nav>
      <div class="flex items-center gap-3 flex-wrap">
        <h1 ref="tituloEl" tabindex="-1">{{ titulo }}</h1>
        <span v-if="a" class="badge" :class="STATUS[a.status]?.badge">{{ STATUS[a.status]?.label }}</span>
      </div>
    </header>

    <div v-if="erroCarga" class="alert alert-error" role="alert">
      <span><span class="alert-title">Não foi possível abrir o atendimento.</span> {{ erroCarga }}</span>
      <button type="button" class="btn btn-sm" @click="carregar">Tentar novamente</button>
    </div>
    <progress v-else-if="!a" class="progress" aria-label="Carregando atendimento"></progress>

    <template v-if="a">
      <!-- Atendimento concluído agora -->
      <section v-if="concluidoAgora" class="card sucesso" role="status">
        <div class="card-body gap-3">
          <div class="flex items-center gap-3">
            <span class="sucesso-icone" :class="{ pendente: a.status === 'nao_pago' }" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10" /></svg>
            </span>
            <div class="flex flex-col">
              <h2>{{ a.status === 'pago' ? 'Atendimento concluído' : 'Atendimento concluído com pagamento pendente' }}</h2>
              <span class="text-2">
                {{ a.status === 'pago' ? `${moeda(totalFinalExibido)} recebido de ${primeiroNome}.`
                  : `${moeda(totalFinalExibido)} ficou pendente para ${primeiroNome}. Receba depois pela lista de atendimentos.` }}
              </span>
            </div>
          </div>
          <div class="flex gap-2 flex-wrap">
            <router-link to="/atendimentos/novo" class="btn btn-primary no-underline">+ Novo atendimento</router-link>
            <router-link to="/atendimentos" class="btn no-underline">Ver atendimentos</router-link>
          </div>
        </div>
      </section>

      <div class="layout" :class="{ 'layout-unico': somenteLeitura }">
        <!-- ========== Formulário ========== -->
        <div v-if="!somenteLeitura" class="coluna">
          <!-- Situação -->
          <fieldset v-if="modo === 'novo'" class="card secao">
            <legend class="sr-only">Situação do pagamento</legend>
            <div class="card-body gap-3">
              <h2 aria-hidden="true">Situação do pagamento</h2>
              <div class="opcoes" role="radiogroup" aria-label="Situação do pagamento">
                <label class="opcao" :class="{ ativa: situacao === 'pago' }">
                  <input v-model="situacao" type="radio" class="radio" name="situacao" value="pago">
                  <span class="opcao-txt"><strong class="semibold">Pago agora</strong><span class="caption">O cliente paga neste momento</span></span>
                </label>
                <label class="opcao" :class="{ ativa: situacao === 'nao_pago' }">
                  <input v-model="situacao" type="radio" class="radio" name="situacao" value="nao_pago">
                  <span class="opcao-txt"><strong class="semibold">Pendente</strong><span class="caption">Receber depois</span></span>
                </label>
              </div>
            </div>
          </fieldset>

          <!-- Forma de pagamento -->
          <fieldset v-if="situacao === 'pago'" class="card secao">
            <legend class="sr-only">Forma de pagamento</legend>
            <div class="card-body gap-3">
              <h2 aria-hidden="true">Forma de pagamento</h2>
              <div class="opcoes opcoes-col" role="radiogroup" aria-label="Forma de pagamento" aria-describedby="erro-forma">
                <label v-for="f in FORMAS" :key="f.valor" class="opcao" :class="{ ativa: forma === f.valor }">
                  <input ref="formaEls" v-model="forma" type="radio" class="radio" name="forma" :value="f.valor"
                    @change="erroForma = ''">
                  <span class="opcao-txt"><strong class="semibold">{{ f.rotulo }}</strong></span>
                </label>
              </div>
              <span v-if="erroForma" id="erro-forma" class="label-text-alt erro-txt" role="alert">{{ erroForma }}</span>
            </div>
          </fieldset>

          <div v-else class="alert">
            <span><span class="alert-title">A forma de pagamento será definida no recebimento.</span>
              Por enquanto o atendimento fica salvo com o valor e o desconto combinados.</span>
          </div>

          <!-- Desconto -->
          <fieldset v-if="modo === 'novo'" class="card secao">
            <legend class="sr-only">Desconto</legend>
            <div class="card-body gap-3">
              <h2 aria-hidden="true">Desconto</h2>
              <div class="chips" role="radiogroup" aria-label="Desconto">
                <label v-for="d in DESCONTOS" :key="d.valor" class="chip" :class="{ ativa: descontoOpcao === d.valor }">
                  <input v-model="descontoOpcao" type="radio" class="sr-only" name="desconto" :value="d.valor">
                  {{ d.rotulo }}
                </label>
              </div>

              <div v-if="descontoOpcao === 'manual'" class="form-control">
                <label class="label-text semibold" for="desc-manual">Valor do desconto</label>
                <input id="desc-manual" ref="manualEl" :value="manualTxt" class="input" :class="{ 'input-error': erroManual }"
                  type="text" inputmode="numeric" autocomplete="off" placeholder="R$ 0,00"
                  :aria-invalid="Boolean(erroManual)" aria-describedby="msg-manual" @input="aoDigitarManual">
                <span id="msg-manual" class="label-text-alt" :class="{ 'erro-txt': erroManual }">
                  {{ erroManual || `Máximo de ${moeda(totalParcial)}.` }}
                </span>
              </div>
              <p v-else-if="descontoOpcao" class="caption">Calculado sobre {{ moeda(totalParcial) }}, já considerando os benefícios.</p>
            </div>
          </fieldset>
        </div>

        <!-- ========== Resumo ========== -->
        <aside class="resumo" aria-label="Resumo do pagamento">
          <div class="card">
            <div class="card-body gap-4">
              <h2>Resumo do pagamento</h2>

              <div class="flex items-center gap-3">
                <span class="avatar" aria-hidden="true">{{ iniciais(cliente?.nome) }}</span>
                <div class="flex flex-col min0">
                  <strong class="semibold corta">{{ cliente?.nome ?? '—' }}</strong>
                  <span class="caption corta">Atendido por {{ funcionario?.nome ?? '—' }}</span>
                </div>
              </div>

              <details class="collapse" :open="somenteLeitura">
                <summary class="semibold">Itens do atendimento ({{ totalItens }})</summary>
                <div class="collapse-content">
                  <p v-if="!todosItens.length && !beneficios.length" class="text-2">Os itens não foram informados pelo servidor.</p>
                  <ul class="itens">
                    <li v-for="i in todosItens" :key="i.chave" class="item">
                      <span class="min0"><span class="corta">{{ i.nome }}</span><span class="caption">{{ i.qtd }} × {{ moeda(i.preco) }}</span></span>
                      <span class="semibold num">{{ moeda(i.preco * i.qtd) }}</span>
                    </li>
                    <li v-for="b in beneficios" :key="'b' + b.id" class="item">
                      <span class="min0"><span class="corta">{{ b.nome }}</span><span class="caption">Benefício · {{ b.pontos }} pts</span></span>
                      <span class="semibold num ok">−{{ moeda(b.valor) }}</span>
                    </li>
                  </ul>
                </div>
              </details>

              <dl class="kv">
                <div class="kv-linha"><dt>Subtotal</dt><dd>{{ moeda(subtotal) }}</dd></div>
                <div v-if="descontoBeneficios > 0" class="kv-linha"><dt>Benefícios</dt><dd class="ok">−{{ moeda(descontoBeneficios) }}</dd></div>
                <div v-if="descontoExibido > 0 || modo === 'novo'" class="kv-linha">
                  <dt>Desconto{{ rotuloPercentual }}</dt>
                  <dd :class="{ ok: descontoExibido > 0 }">{{ descontoExibido > 0 ? '−' : '' }}{{ moeda(descontoExibido) }}</dd>
                </div>
                <div class="kv-linha kv-destaque"><dt>Total final</dt><dd>{{ moeda(totalFinalExibido) }}</dd></div>
                <div v-if="somenteLeitura && a.status === 'pago' && formaExibida" class="kv-linha"><dt>Forma de pagamento</dt><dd>{{ formaExibida }}</dd></div>
                <div v-if="participa && pontosExibidos != null && somenteLeitura && a.status === 'pago'" class="kv-linha">
                  <dt>Pontos gerados</dt><dd><span class="badge badge-primary">+{{ pontosExibidos }} pts</span></dd>
                </div>
              </dl>

              <!-- Ação principal -->
              <template v-if="!somenteLeitura">
                <div v-if="erroEnvio" class="alert alert-error" role="alert" ref="erroEl" tabindex="-1">
                  <span><span class="alert-title">Não foi possível concluir.</span> {{ erroEnvio }}</span>
                </div>

                <div class="info" role="note">
                  <span class="info-i" aria-hidden="true">i</span>
                  <span>{{ textoInfo }}</span>
                </div>

                <div class="flex flex-col gap-2">
                  <button type="button" class="btn btn-primary btn-lg btn-block" :disabled="enviando" @click="concluir">
                    <span v-if="enviando" class="loading mini" aria-hidden="true"></span>
                    {{ enviando ? 'Salvando…' : textoBotao }}
                  </button>
                  <button v-if="modo === 'novo' && situacao === 'nao_pago'" type="button" class="btn btn-block" @click="escolherPago">
                    Receber agora
                  </button>
                  <router-link v-if="modo === 'novo'" :to="`/atendimentos/${id}`" class="btn btn-ghost btn-block no-underline">
                    Voltar aos itens
                  </router-link>
                  <router-link v-else to="/atendimentos" class="btn btn-ghost btn-block no-underline">Voltar à lista</router-link>
                </div>
              </template>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* ---------- Configuração ---------- */
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8888/api-fidelidade/api'
const getToken = () => import.meta.env.VITE_API_TOKEN ?? localStorage.getItem('token') ?? 'seu-token-aqui'

// Regra de negócio: só participa do programa de pontos quem tem CPF cadastrado.
const participaPontos = c => Boolean(c?.cpf)

const STATUS = {
  em_andamento: { label: 'Em atendimento', badge: 'badge-warning' },
  pago: { label: 'Pago', badge: 'badge-success' },
  nao_pago: { label: 'Pendente', badge: 'badge-error' },
}
const FORMAS = [
  { valor: 'pix', rotulo: 'PIX' },
  { valor: 'cartao', rotulo: 'Cartão (débito ou crédito)' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
]
const DESCONTOS = [
  { valor: '', rotulo: 'Sem desconto' },
  { valor: '5', rotulo: '5%' },
  { valor: '10', rotulo: '10%' },
  { valor: '15', rotulo: '15%' },
  { valor: 'manual', rotulo: 'Valor manual' },
]

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

// Máscara monetária (mesmo comportamento do ProdutoForm): digita 1850 → "18,50"
function mascararPreco(valor) {
  const digitos = String(valor).replace(/\D/g, '').replace(/^0+/, '').slice(0, 9)
  if (!digitos) return ''
  return (Number(digitos) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const precoParaNumero = t => (t ? Number(t.replace(/\./g, '').replace(',', '.')) : 0)

/* ---------- Estado ---------- */
const a = ref(null)
const cliente = ref(null)
const funcionario = ref(null)
const erroCarga = ref('')
const tituloEl = ref(null)

const todosItens = ref([])
const beneficios = ref([])

const situacao = ref('pago') // 'pago' | 'nao_pago'
const forma = ref('')
const descontoOpcao = ref('')
const manualTxt = ref('')
const erroForma = ref('')
const erroManual = ref('')
const erroEnvio = ref('')
const enviando = ref(false)
const concluidoAgora = ref(false)

const formaEls = ref([])
const manualEl = ref(null)
const erroEl = ref(null)

const participa = computed(() => participaPontos(cliente.value))
const primeiroNome = computed(() => String(cliente.value?.nome ?? 'o cliente').split(' ')[0])

/**
 * modo:
 *  - 'novo'    → atendimento em andamento: escolhe pago/pendente, forma e desconto
 *  - 'receber' → atendimento pendente: valor e desconto já combinados, só registra o recebimento
 *  - 'leitura' → atendimento pago: comprovante
 */
const modo = computed(() => ({ nao_pago: 'receber', pago: 'leitura' }[a.value?.status] ?? 'novo'))
const somenteLeitura = computed(() => modo.value === 'leitura' || concluidoAgora.value)

const titulo = computed(() => {
  if (concluidoAgora.value) return 'Atendimento concluído'
  return { novo: 'Pagamento', receber: 'Receber pagamento', leitura: 'Detalhes do atendimento' }[modo.value]
})

/* ---------- Carregamento ---------- */
function normItem(x, tipo) {
  const base = x?.[tipo] ?? {}
  return {
    chave: `${tipo}-${x?.[`${tipo}_id`] ?? base.id ?? x?.id}`,
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
  }
}

async function buscarUm(arquivo, ref_) {
  if (ref_ == null) return null
  try {
    const res = await fetch(`${API_URL}/${arquivo}/${ref_}`, { headers: cabecalhos() })
    return res.ok ? extrairItem(await res.json()) : null
  } catch { return null }
}

async function carregar() {
  erroCarga.value = ''
  try {
    const res = await fetch(`${API_URL}/atendimentos.php/${id.value}`, { headers: cabecalhos() })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(erroHttp(res, json))
    const dado = extrairItem(json)

    cliente.value = dado.cliente ?? (await buscarUm('clientes.php', dado.cliente_id))
    funcionario.value = dado.funcionario ?? (await buscarUm('funcionarios.php', dado.funcionario_id))
    todosItens.value = [
      ...(dado.servicos ?? []).map(x => normItem(x, 'servico')),
      ...(dado.produtos ?? []).map(x => normItem(x, 'produto')),
    ]
    beneficios.value = (dado.beneficios ?? []).map(normBeneficio)
    a.value = dado

    // Desconto já combinado (atendimento pendente ou pago)
    if (modo.value !== 'novo') {
      forma.value = dado.forma_pagamento ?? ''
    }
    await nextTick()
    tituloEl.value?.focus()
  } catch (e) {
    erroCarga.value = mensagemDeRede(e)
  }
}

/* ---------- Totais ---------- */
const totalItens = computed(() => todosItens.value.reduce((t, i) => t + i.qtd, 0))
const subtotal = computed(() => {
  const calculado = arredonda(todosItens.value.reduce((t, i) => t + i.preco * i.qtd, 0))
  return todosItens.value.length ? calculado : num(a.value?.valor_total)
})
const descontoBeneficios = computed(() =>
  Math.min(subtotal.value, arredonda(beneficios.value.reduce((t, b) => t + b.valor, 0))))
const totalParcial = computed(() => arredonda(subtotal.value - descontoBeneficios.value))

// Desconto que o usuário está montando (só no modo "novo")
const descontoBruto = computed(() => {
  if (!descontoOpcao.value) return 0
  if (descontoOpcao.value === 'manual') return precoParaNumero(manualTxt.value)
  return arredonda(totalParcial.value * Number(descontoOpcao.value) / 100)
})
const descontoEfetivo = computed(() => Math.min(descontoBruto.value, totalParcial.value))
const totalFinal = computed(() => arredonda(totalParcial.value - descontoEfetivo.value))

// Nos modos "receber" e "leitura" vale o que foi combinado e salvo
const descontoExibido = computed(() =>
  modo.value === 'novo' && !concluidoAgora.value ? descontoEfetivo.value : num(a.value?.desconto_valor))
const totalFinalExibido = computed(() => {
  if (modo.value === 'novo' && !concluidoAgora.value) return totalFinal.value
  const salvo = a.value?.valor_final
  return salvo != null && salvo !== '' ? num(salvo) : arredonda(Math.max(0, totalParcial.value - descontoExibido.value))
})
const rotuloPercentual = computed(() => {
  if (modo.value === 'novo' && !concluidoAgora.value) {
    return /^\d+$/.test(descontoOpcao.value) ? ` (${descontoOpcao.value}%)` : ''
  }
  return a.value?.desconto_percentual ? ` (${num(a.value.desconto_percentual)}%)` : ''
})

const formaExibida = computed(() => FORMAS.find(f => f.valor === a.value?.forma_pagamento)?.rotulo ?? '')
const pontosExibidos = computed(() =>
  a.value?.pontos_total != null ? num(a.value.pontos_total) : todosItens.value.reduce((t, i) => t + i.pontos * i.qtd, 0))

/* ---------- Textos que mudam com a escolha ---------- */
const textoBotao = computed(() => {
  if (modo.value === 'receber') return 'Confirmar recebimento'
  return situacao.value === 'pago' ? 'Confirmar pagamento e concluir' : 'Concluir e deixar pendente'
})
const textoInfo = computed(() => {
  if (modo.value === 'receber') return 'Registra a forma de pagamento e confirma o recebimento do valor combinado.'
  return situacao.value === 'pago'
    ? 'Registra a forma de pagamento, confirma o recebimento e conclui o atendimento.'
    : 'Registra os serviços e produtos, mantém o total e o desconto combinados e deixa o recebimento pendente.'
})

/* ---------- Interações ---------- */
function aoDigitarManual(e) {
  const m = mascararPreco(e.target.value)
  manualTxt.value = m
  e.target.value = m
}

watch([manualTxt, descontoOpcao], () => { erroManual.value = '' })

watch(descontoOpcao, async v => {
  if (v !== 'manual') return
  await nextTick()
  manualEl.value?.focus()
})

async function escolherPago() {
  situacao.value = 'pago'
  await nextTick()
  formaEls.value?.[0]?.focus()
}

function validar() {
  erroForma.value = ''
  erroManual.value = ''

  if (modo.value === 'novo' && descontoOpcao.value === 'manual') {
    if (!manualTxt.value || descontoBruto.value <= 0) erroManual.value = 'Informe o valor do desconto ou escolha “Sem desconto”.'
    else if (descontoBruto.value > totalParcial.value) erroManual.value = `O desconto não pode passar de ${moeda(totalParcial.value)}.`
    if (erroManual.value) { manualEl.value?.focus(); return false }
  }

  const exigeForma = modo.value === 'receber' || situacao.value === 'pago'
  if (exigeForma && !forma.value) {
    erroForma.value = 'Escolha como o cliente pagou para concluir.'
    nextTick(() => formaEls.value?.[0]?.focus())
    return false
  }
  return true
}

/* ---------- Concluir ---------- */
async function concluir() {
  if (enviando.value || !validar()) return
  enviando.value = true
  erroEnvio.value = ''

  const corpo = modo.value === 'receber'
    ? { status: 'pago', forma_pagamento: forma.value }
    : {
        status: situacao.value,
        forma_pagamento: situacao.value === 'pago' ? forma.value : null,
        desconto_tipo: descontoOpcao.value === '' ? null : (descontoOpcao.value === 'manual' ? 'valor' : 'percentual'),
        desconto_percentual: /^\d+$/.test(descontoOpcao.value) ? Number(descontoOpcao.value) : null,
        desconto_valor: descontoEfetivo.value,
        valor_total: subtotal.value,
        valor_final: totalFinal.value,
      }

  try {
    const res = await fetch(`${API_URL}/atendimentos.php/${id.value}`, {
      method: 'PUT', headers: cabecalhos(true), body: JSON.stringify(corpo),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(erroHttp(res, json))

    const resposta = extrairItem(json)
    a.value = { ...a.value, ...corpo, ...(resposta && typeof resposta === 'object' ? resposta : {}) }
    concluidoAgora.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
    await nextTick()
    tituloEl.value?.focus()
  } catch (e) {
    erroEnvio.value = mensagemDeRede(e) // permanece na tela, sem perder as escolhas
    await nextTick()
    erroEl.value?.focus()
  } finally {
    enviando.value = false
  }
}

/* ---------- Atalhos e proteção ---------- */
function avisarAntesDeFechar(e) {
  if (enviando.value) { e.preventDefault(); e.returnValue = '' }
}

onMounted(() => {
  window.addEventListener('beforeunload', avisarAntesDeFechar)
  carregar()
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', avisarAntesDeFechar))
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.min0 { min-width: 0; }
.corta { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.no-underline, .no-underline:hover { text-decoration: none; }
.btn-primary.no-underline, .btn-primary.no-underline:hover { color: var(--on-accent); }
.ok { color: var(--success); }
.erro-txt { color: var(--error); }
h1:focus { outline: 0; }
.loading.mini { width: 14px; height: 14px; border-width: 2px; }

.layout { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 16px; align-items: start; }
.layout-unico { grid-template-columns: minmax(0, 560px); }
.coluna { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.resumo { position: sticky; top: 16px; }

fieldset.secao { margin: 0; min-width: 0; border: 1px solid var(--stroke); padding: 0; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

/* Opções (radio em cartão) */
.opcoes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.opcoes-col { grid-template-columns: 1fr; }
.opcao { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 10px 14px; cursor: pointer;
  border: 1px solid var(--stroke-2); border-radius: var(--r-lg); background: var(--card); transition: background var(--t), border-color var(--t); }
.opcao:hover { background: var(--fill-h); }
.opcao.ativa { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--card)); }
.opcao:has(.radio:focus-visible) { outline: 2px solid var(--text); outline-offset: 2px; }
.opcao .radio:focus-visible { outline: 0; }
.opcao-txt { display: flex; flex-direction: column; }

/* Chips de desconto */
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 0 16px; cursor: pointer;
  border: 1px solid var(--stroke-2); border-radius: 18px; background: var(--card); transition: background var(--t); user-select: none; }
.chip:hover { background: var(--fill-h); }
.chip.ativa { background: var(--accent); border-color: transparent; color: #fff; }
.chip:has(input:focus-visible) { outline: 2px solid var(--text); outline-offset: 2px; }

/* Resumo */
.collapse > summary { min-height: 40px; }
.collapse-content { padding: 8px 16px; }
.itens { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.item { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--divider); }
.item:last-child { border-bottom: 0; }
.num { font-variant-numeric: tabular-nums; }

.kv { display: flex; flex-direction: column; gap: 1px; margin: 0; overflow: hidden; background: var(--divider);
  border: 1px solid var(--stroke-2); border-radius: var(--r-lg); }
.kv-linha { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: var(--card); }
.kv dt { color: var(--text-2); }
.kv dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }
.kv-destaque dd { font-size: 20px; line-height: 28px; }

.info { display: flex; gap: 10px; align-items: flex-start; color: var(--text-2); font-size: 13px; line-height: 18px; }
.info-i { flex: none; display: grid; place-items: center; width: 16px; height: 16px; margin-top: 1px; border-radius: 50%;
  background: var(--text-2); color: #fff; font: 700 11px/1 var(--font); }

/* Sucesso */
.sucesso { border-color: color-mix(in srgb, var(--success) 40%, transparent); background: var(--success-bg); }
.sucesso-icone { flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--success); color: #fff; }
.sucesso-icone.pendente { background: var(--warning); }

@media (max-width: 900px) {
  .layout, .layout-unico { grid-template-columns: 1fr; }
  .resumo { position: static; }
}
@media (max-width: 480px) { .opcoes { grid-template-columns: 1fr; } }
</style>
