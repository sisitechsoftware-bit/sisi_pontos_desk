<template>
  <div class="page">
    <header class="flex flex-col gap-2">
      <nav class="breadcrumbs" aria-label="Caminho">
        <ul>
          <li>Serviços</li>
          <li>{{ ehEdicao ? 'Editar' : 'Novo' }}</li>
        </ul>
      </nav>
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h1>{{ ehEdicao ? 'Editar serviço' : 'Novo serviço' }}</h1>
        <span v-if="sujo && !carregando" class="badge badge-warning">Alterações não salvas</span>
      </div>
      <p class="text-2">
        {{ ehEdicao
          ? 'Atualize os dados do serviço. As alterações só valem depois de salvar.'
          : 'Preencha os dados abaixo para cadastrar o serviço e definir quantos pontos ele rende ao cliente.' }}
      </p>
    </header>

    <!-- Estado: carregando serviço (edição) -->
    <div v-if="carregando" class="card">
      <div class="card-body gap-4" role="status" aria-live="polite">
        <div class="flex items-center gap-3">
          <span class="loading"></span>
          <span class="text-2">Carregando dados do serviço…</span>
        </div>
        <progress class="progress"></progress>
      </div>
    </div>

    <!-- Estado: falha ao carregar -->
    <div v-else-if="erroCarga" class="alert alert-error" role="alert">
      <span><span class="alert-title">Não foi possível abrir o serviço.</span> {{ erroCarga }}</span>
      <button type="button" class="btn btn-sm" @click="carregarServico">Tentar novamente</button>
    </div>

    <!-- Formulário -->
    <template v-else>
      <div v-if="erroGeral" ref="alertaEl" class="alert alert-error" role="alert" tabindex="-1">
        <span><span class="alert-title">Não foi possível salvar.</span> {{ erroGeral }}</span>
      </div>

      <form class="layout" novalidate @submit.prevent="salvar">
        <div class="card">
          <fieldset class="card-body gap-4 fieldset-reset" :disabled="salvando">
            <div class="flex flex-col gap-1">
              <h2>Dados do serviço</h2>
              <small>Campos marcados com * são obrigatórios.</small>
            </div>

            <div class="form-control">
              <label class="label-text semibold" for="nome">Nome do serviço *</label>
              <input id="nome" ref="nomeEl" v-model.trim="form.nome" class="input"
                :class="{ 'input-error': erros.nome.length }" type="text" maxlength="120" autocomplete="off"
                placeholder="Ex.: Corte de cabelo" :aria-invalid="erros.nome.length > 0" aria-describedby="nome-msg"
                @blur="aoSair('nome')">
              <div id="nome-msg" class="msg">
                <span v-for="(m, i) in erros.nome" :key="i" class="label-text-alt erro-txt">{{ m }}</span>
                <span v-if="form.nome.length >= 100" class="label-text-alt contador">{{ form.nome.length }}/120</span>
              </div>
            </div>

            <div class="form-control">
              <label class="label-text semibold" for="preco">Preço *</label>
              <div class="prefixo-wrap">
                <span class="prefixo" aria-hidden="true">R$</span>
                <input id="preco" ref="precoEl" :value="form.preco" class="input prefixo-input"
                  :class="{ 'input-error': erros.preco.length }" type="text" inputmode="numeric" autocomplete="off"
                  placeholder="0,00" :aria-invalid="erros.preco.length > 0" aria-describedby="preco-msg"
                  @input="aoDigitarPreco" @blur="aoSair('preco')">
              </div>
              <div id="preco-msg" class="msg">
                <span v-for="(m, i) in erros.preco" :key="i" class="label-text-alt erro-txt">{{ m }}</span>
                <span v-if="!erros.preco.length" class="label-text-alt">Digite apenas os números; a vírgula é
                  colocada automaticamente.</span>
              </div>
            </div>

            <hr>

            <div class="flex flex-col gap-1">
              <h2>Programa de fidelidade</h2>
              <small>Quantos pontos o cliente ganha ao realizar este serviço.</small>
            </div>

            <div class="form-control">
              <label class="label-text semibold" for="pontos">Pontos por serviço *</label>
              <input id="pontos" ref="pontosEl" :value="form.pontos" class="input" :class="{ 'input-error': erros.pontos.length }"
                type="text" inputmode="numeric" autocomplete="off" placeholder="Ex.: 10" :aria-invalid="erros.pontos.length > 0"
                aria-describedby="pontos-msg" @input="aoDigitarPontos" @blur="aoSair('pontos')">
              <div id="pontos-msg" class="msg">
                <span v-for="(m, i) in erros.pontos" :key="i" class="label-text-alt erro-txt">{{ m }}</span>
                <span v-if="!erros.pontos.length" class="label-text-alt">Use 0 se este serviço não gera pontos.</span>
              </div>
            </div>

            <div class="card-actions acoes">
              <button type="submit" class="btn btn-primary" :disabled="salvando || (ehEdicao && !sujo)">
                <span v-if="salvando" class="loading mini" aria-hidden="true"></span>
                {{ salvando ? 'Salvando…' : (ehEdicao ? 'Salvar alterações' : 'Cadastrar serviço') }}
              </button>
              <button type="button" class="btn" @click="cancelar">Cancelar</button>
              <span class="dica-atalho text-2">
                <template v-if="ehEdicao && !sujo">Nenhuma alteração para salvar</template>
                <template v-else><span class="kbd">Ctrl</span> <span class="kbd">S</span> para salvar</template>
              </span>
            </div>
            <progress v-if="salvando" class="progress" aria-label="Salvando"></progress>
          </fieldset>
        </div>

        <!-- Pré-visualização ao vivo -->
        <aside class="card" aria-label="Pré-visualização do serviço">
          <div class="card-body gap-4">
            <small>Pré-visualização</small>
            <div class="flex items-center gap-3">
              <span class="avatar" aria-hidden="true">{{ iniciais }}</span>
              <div class="flex flex-col preview-texto">
                <span class="semibold preview-nome">{{ form.nome || 'Nome do serviço' }}</span>
                <span class="text-2">{{ precoFormatado }}</span>
              </div>
            </div>
            <hr>
            <div class="flex items-center justify-between">
              <span class="text-2">Pontos</span>
              <span class="badge" :class="form.pontos !== '' ? 'badge-primary' : ''">
                {{ form.pontos !== '' ? `${form.pontos} ${Number(form.pontos) === 1 ? 'ponto' : 'pontos'}` : '—' }}
              </span>
            </div>
          </div>
        </aside>
      </form>
    </template>

    <!-- Confirmação ao sair com alterações pendentes -->
    <dialog ref="dlgSaida" class="modal" @cancel.prevent="responderSaida(false)">
      <div class="modal-box">
        <h2>Descartar alterações?</h2>
        <p class="text-2">Você preencheu dados que ainda não foram salvos. Se sair agora, eles serão perdidos.</p>
        <div class="modal-action">
          <button type="button" class="btn btn-primary" @click="responderSaida(false)">Continuar editando</button>
          <button type="button" class="btn" @click="responderSaida(true)">Descartar e sair</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'

const API_URL = 'http://localhost:8888/api-fidelidade/api/servicos.php' // ajuste aqui
const obterToken = () => localStorage.getItem('token') || '' // ajuste aqui: de onde vem o Bearer token

const route = useRoute()
const router = useRouter()

const id = computed(() => (route.params.id ? Number(route.params.id) : null))
const ehEdicao = computed(() => id.value !== null)

const CAMPOS = ['nome', 'preco', 'pontos']

// preco e pontos ficam como texto no formulário (preco já mascarado, ex.: "50,00");
// a conversão para número acontece só no envio
const form = reactive({ nome: '', preco: '', pontos: '' })
const original = reactive({ nome: '', preco: '', pontos: '' })
const erros = reactive({ nome: [], preco: [], pontos: [] })
const tocado = reactive({ nome: false, preco: false, pontos: false })

const erroGeral = ref('')
const erroCarga = ref('')
const salvando = ref(false)
const carregando = ref(false)
const saiuComSucesso = ref(false)

const nomeEl = ref(null)
const precoEl = ref(null)
const pontosEl = ref(null)
const alertaEl = ref(null)
const dlgSaida = ref(null)

const elementos = { nome: nomeEl, preco: precoEl, pontos: pontosEl }

/* ---------- Derivados ---------- */
const sujo = computed(() => CAMPOS.some((c) => form[c] !== original[c]))

const iniciais = computed(() => {
  const partes = form.nome.split(/\s+/).filter(Boolean)
  if (!partes.length) return '?'
  const primeira = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
})

const precoFormatado = computed(() => (form.preco ? `R$ ${form.preco}` : 'Sem preço'))

/* ---------- Preço e pontos ---------- */
function mascararPreco(valor) {
  const digitos = String(valor).replace(/\D/g, '').replace(/^0+/, '').slice(0, 9)
  if (!digitos) return ''
  return (Number(digitos) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function precoParaNumero(texto) {
  if (!texto) return 0
  return Number(texto.replace(/\./g, '').replace(',', '.'))
}

function numeroParaPreco(n) {
  return mascararPreco(Math.round(Number(n) * 100))
}

function aoDigitarPreco(e) {
  const mascarado = mascararPreco(e.target.value)
  form.preco = mascarado
  e.target.value = mascarado
}

function aoDigitarPontos(e) {
  const limpo = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 6)
  form.pontos = limpo
  e.target.value = limpo
}

/* ---------- Validação ---------- */
const regras = {
  nome(v) {
    if (!v) return ['Informe o nome do serviço.']
    if (v.length > 120) return ['O nome deve ter no máximo 120 caracteres.']
    return []
  },
  preco(v) {
    if (!v) return ['Informe o preço do serviço.']
    if (precoParaNumero(v) <= 0) return ['O preço deve ser maior que zero.']
    return []
  },
  pontos(v) {
    if (v === '') return ['Informe os pontos (use 0 se o serviço não gera pontos).']
    return []
  },
}

function validarCampo(campo) {
  erros[campo] = regras[campo](form[campo])
}

function validarTudo() {
  CAMPOS.forEach((c) => {
    tocado[c] = true
    validarCampo(c)
  })
  return CAMPOS.every((c) => erros[c].length === 0)
}

function limparErros() {
  CAMPOS.forEach((c) => (erros[c] = []))
  erroGeral.value = ''
}

// Valida ao sair do campo; depois de "tocado", revalida enquanto digita (feedback imediato, sem ser invasivo)
function aoSair(campo) {
  tocado[campo] = true
  validarCampo(campo)
}
CAMPOS.forEach((c) =>
  watch(
    () => form[c],
    () => { if (tocado[c]) validarCampo(c) },
  ),
)

async function focarPrimeiroErro() {
  await nextTick()
  const campo = CAMPOS.find((c) => erros[c].length)
  if (campo) elementos[campo].value?.focus()
  else alertaEl.value?.focus()
}

/* ---------- API ---------- */
function cabecalhos(comCorpo = false) {
  const h = { Accept: 'application/json', Authorization: `Bearer ${obterToken()}` }
  if (comCorpo) h['Content-Type'] = 'application/json'
  return h
}

function mensagemDeRede(e) {
  return e instanceof TypeError
    ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
    : e.message
}

function trataErroApi(res, json) {
  erroGeral.value =
    res.status === 401
      ? 'Sua sessão expirou. Entre novamente para continuar.'
      : json?.error?.message || `Erro ${res.status}`
  const detalhes = json?.error?.details || {}
  for (const [campo, msgs] of Object.entries(detalhes)) {
    if (erros[campo] !== undefined) {
      erros[campo] = Array.isArray(msgs) ? msgs : [String(msgs)]
      tocado[campo] = true // ao editar o campo, o erro do servidor é substituído pela validação local
    }
  }
  focarPrimeiroErro()
}

async function carregarServico() {
  carregando.value = true
  erroCarga.value = ''
  try {
    const res = await fetch(`${API_URL}/${id.value}`, { headers: cabecalhos() })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(json?.error?.message || 'Serviço não encontrado.')
    form.nome = json.nome ?? ''
    form.preco = json.preco != null ? numeroParaPreco(json.preco) : ''
    form.pontos = json.pontos != null ? String(json.pontos) : ''
    CAMPOS.forEach((c) => (original[c] = form[c]))
  } catch (e) {
    erroCarga.value = mensagemDeRede(e)
  } finally {
    carregando.value = false
    await nextTick()
    nomeEl.value?.focus()
  }
}

async function salvar() {
  if (salvando.value) return
  limparErros()
  if (!validarTudo()) {
    focarPrimeiroErro()
    return
  }
  salvando.value = true
  try {
    const url = ehEdicao.value ? `${API_URL}/${id.value}` : `${API_URL}/`
    const res = await fetch(url, {
      method: ehEdicao.value ? 'PUT' : 'POST', // PUT substitui todos os campos
      headers: cabecalhos(true),
      body: JSON.stringify({
        nome: form.nome,
        preco: precoParaNumero(form.preco),
        pontos: Number(form.pontos),
      }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      trataErroApi(res, json)
      return
    }
    saiuComSucesso.value = true
    router.push(`/servicos`)
  } catch (e) {
    erroGeral.value = mensagemDeRede(e)
    await nextTick()
    alertaEl.value?.focus()
  } finally {
    salvando.value = false
  }
}

function cancelar() {
  router.push('/servicos')
}

/* ---------- Proteção contra perda de dados ---------- */
let resolverSaida = null

function confirmarSaida() {
  dlgSaida.value?.showModal()
  return new Promise((resolve) => { resolverSaida = resolve })
}

function responderSaida(sair) {
  dlgSaida.value?.close()
  resolverSaida?.(sair)
  resolverSaida = null
}

onBeforeRouteLeave(() => {
  if (!sujo.value || saiuComSucesso.value) return true
  return confirmarSaida()
})

function avisarAntesDeFechar(e) {
  if (sujo.value && !saiuComSucesso.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

/* ---------- Atalho Ctrl/Cmd + S ---------- */
function atalhos(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    if (!carregando.value && !erroCarga.value) salvar()
  }
}

onMounted(() => {
  window.addEventListener('keydown', atalhos)
  window.addEventListener('beforeunload', avisarAntesDeFechar)
  if (ehEdicao.value) carregarServico()
  else nomeEl.value?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', atalhos)
  window.removeEventListener('beforeunload', avisarAntesDeFechar)
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 960px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 16px;
  align-items: start;
}

@media (max-width: 800px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .layout>aside {
    order: -1;
  }

  /* no celular, a pré-visualização vem primeiro e fica compacta */
}

.fieldset-reset {
  border: 0;
  margin: 0;
  min-width: 0;
}

.fieldset-reset:disabled {
  opacity: .7;
}

/* Prefixo "R$" colado ao campo de preço: o símbolo fica fora do valor digitado */
.prefixo-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.prefixo {
  position: absolute;
  left: 12px;
  pointer-events: none;
  font-size: 14px;
  opacity: .7;
}

.prefixo-input {
  padding-left: 40px;
  width: 100%;
  font-variant-numeric: tabular-nums;
}

/* Mensagem sob o campo: reserva altura para o layout não "pular" quando o erro aparece */
.msg {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 16px;
}

.erro-txt {
  color: var(--error);
}

.contador {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.acoes {
  align-items: center;
  margin-top: 8px;
}

.dica-atalho {
  margin-left: auto;
  font-size: 12px;
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.loading.mini {
  width: 14px;
  height: 14px;
  border-width: 2px;
}

.preview-texto {
  min-width: 0;
}

.preview-nome {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>