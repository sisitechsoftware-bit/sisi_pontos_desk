<template>
  <div class="page">
    <header class="flex flex-col gap-2">
      <nav class="breadcrumbs" aria-label="Caminho">
        <ul>
          <li>Funcionários</li>
          <li>{{ ehEdicao ? 'Editar' : 'Novo' }}</li>
        </ul>
      </nav>
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h1>{{ ehEdicao ? 'Editar funcionário' : 'Novo funcionário' }}</h1>
        <span v-if="sujo && !carregando" class="badge badge-warning">Alterações não salvas</span>
      </div>
      <p class="text-2">
        {{ ehEdicao
          ? 'Atualize os dados do funcionário. As alterações só valem depois de salvar.'
          : 'Preencha os dados abaixo para cadastrar o funcionário no programa de fidelidade.' }}
      </p>
    </header>

    <!-- Estado: carregando funcionário (edição) -->
    <div v-if="carregando" class="card">
      <div class="card-body gap-4" role="status" aria-live="polite">
        <div class="flex items-center gap-3">
          <span class="loading"></span>
          <span class="text-2">Carregando dados do funcionário…</span>
        </div>
        <progress class="progress"></progress>
      </div>
    </div>

    <!-- Estado: falha ao carregar -->
    <div v-else-if="erroCarga" class="alert alert-error" role="alert">
      <span><span class="alert-title">Não foi possível abrir o funcionário.</span> {{ erroCarga }}</span>
      <button type="button" class="btn btn-sm" @click="carregarFuncionario">Tentar novamente</button>
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
              <h2>Dados do funcionário</h2>
              <small>Campos marcados com * são obrigatórios.</small>
            </div>

            <div class="form-control">
              <label class="label-text semibold" for="nome">Nome completo *</label>
              <input id="nome" ref="nomeEl" v-model.trim="form.nome" class="input"
                :class="{ 'input-error': erros.nome.length }" type="text" maxlength="120" autocomplete="name"
                placeholder="Ex.: João Santos" :aria-invalid="erros.nome.length > 0" aria-describedby="nome-msg"
                @blur="aoSair('nome')">
              <div id="nome-msg" class="msg">
                <span v-for="(m, i) in erros.nome" :key="i" class="label-text-alt erro-txt">{{ m }}</span>
                <span v-if="form.nome.length >= 100" class="label-text-alt contador">{{ form.nome.length }}/120</span>
              </div>
            </div>

            <div class="form-control">
              <label class="label-text semibold" for="telefone">
                Telefone <span class="text-2">(opcional)</span>
              </label>
              <input id="telefone" ref="telefoneEl" :value="form.telefone" class="input"
                :class="{ 'input-error': erros.telefone.length }" type="tel" inputmode="tel" autocomplete="tel-national"
                placeholder="(11) 91234-5678" :aria-invalid="erros.telefone.length > 0" aria-describedby="telefone-msg"
                @input="aoDigitarTelefone" @blur="aoSair('telefone')">
              <div id="telefone-msg" class="msg">
                <span v-for="(m, i) in erros.telefone" :key="i" class="label-text-alt erro-txt">{{ m }}</span>
                <span v-if="!erros.telefone.length" class="label-text-alt">Com DDD. O formato é aplicado
                  automaticamente.</span>
              </div>
            </div>

            <div class="card-actions acoes">
              <button type="submit" class="btn btn-primary" :disabled="salvando || (ehEdicao && !sujo)">
                <span v-if="salvando" class="loading mini" aria-hidden="true"></span>
                {{ salvando ? 'Salvando…' : (ehEdicao ? 'Salvar alterações' : 'Cadastrar funcionário') }}
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
        <aside class="card" aria-label="Pré-visualização do funcionário">
          <div class="card-body gap-4">
            <small>Pré-visualização</small>
            <div class="flex items-center gap-3">
              <span class="avatar" aria-hidden="true">{{ iniciais }}</span>
              <div class="flex flex-col preview-texto">
                <span class="semibold preview-nome">{{ form.nome || 'Nome do funcionário' }}</span>
                <span class="text-2">{{ form.telefone || 'Sem telefone' }}</span>
              </div>
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

const API_URL = 'http://localhost:8888/api-fidelidade/api/funcionarios.php' // ajuste aqui

// Token Bearer da API. Ajuste a chave/origem conforme o seu login (localStorage, store Pinia, etc.)
const TOKEN_KEY = 'token'
function obterToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

function cabecalhos() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${obterToken()}`,
  }
}

const route = useRoute()
const router = useRouter()

const id = computed(() => (route.params.id ? Number(route.params.id) : null))
const ehEdicao = computed(() => id.value !== null)

const CAMPOS = ['nome', 'telefone']

const form = reactive({ nome: '', telefone: '' })
const original = reactive({ nome: '', telefone: '' })
const erros = reactive({ nome: [], telefone: [] })
const tocado = reactive({ nome: false, telefone: false })

const erroGeral = ref('')
const erroCarga = ref('')
const salvando = ref(false)
const carregando = ref(false)
const saiuComSucesso = ref(false)

const nomeEl = ref(null)
const telefoneEl = ref(null)
const alertaEl = ref(null)
const dlgSaida = ref(null)

const elementos = { nome: nomeEl, telefone: telefoneEl }

/* ---------- Derivados ---------- */
const sujo = computed(() => CAMPOS.some((c) => form[c] !== original[c]))

const iniciais = computed(() => {
  const partes = form.nome.split(/\s+/).filter(Boolean)
  if (!partes.length) return '?'
  const primeira = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
})

/* ---------- Validação ---------- */
const regras = {
  nome(v) {
    if (!v) return ['Informe o nome do funcionário.']
    if (v.length > 120) return ['O nome deve ter no máximo 120 caracteres.']
    return []
  },
  telefone(v) {
    if (!v) return []
    const digitos = v.replace(/\D/g, '').length
    return digitos < 10 || digitos > 11 ? ['Informe o DDD e o número (10 ou 11 dígitos).'] : []
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

/* ---------- Telefone ---------- */
function mascararTelefone(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function aoDigitarTelefone(e) {
  const mascarado = mascararTelefone(e.target.value)
  form.telefone = mascarado
  e.target.value = mascarado
}

/* ---------- API ---------- */
function mensagemDeRede(e) {
  return e instanceof TypeError
    ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
    : e.message
}

function trataErroApi(res, json) {
  if (res.status === 401) {
    erroGeral.value = 'Sua sessão expirou ou o token é inválido. Entre novamente para continuar.'
  } else {
    erroGeral.value = json?.error?.message || `Erro ${res.status}`
  }
  const detalhes = json?.error?.details || {}
  for (const [campo, msgs] of Object.entries(detalhes)) {
    if (erros[campo] !== undefined) {
      erros[campo] = Array.isArray(msgs) ? msgs : [String(msgs)]
      tocado[campo] = true // ao editar o campo, o erro do servidor é substituído pela validação local
    }
  }
  focarPrimeiroErro()
}

async function carregarFuncionario() {
  carregando.value = true
  erroCarga.value = ''
  try {
    const res = await fetch(`${API_URL}/${id.value}`, { headers: cabecalhos() })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(
        res.status === 401
          ? 'Sua sessão expirou ou o token é inválido. Entre novamente para continuar.'
          : json?.error?.message || 'Funcionário não encontrado.',
      )
    }
    form.nome = json.nome ?? ''
    const tel = json.telefone ?? ''
    form.telefone = /^\d+$/.test(tel) ? mascararTelefone(tel) : tel
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
    // Contrato da API: { "nome": "...", "telefone": "11999998888" } (telefone somente com dígitos)
    const corpo = {
      nome: form.nome,
      telefone: form.telefone.replace(/\D/g, ''),
    }
    const res = await fetch(url, {
      method: ehEdicao.value ? 'PUT' : 'POST', // PUT substitui todos os campos
      headers: cabecalhos(),
      body: JSON.stringify(corpo),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      trataErroApi(res, json)
      return
    }
    saiuComSucesso.value = true
    router.push(`/funcionarios/${ehEdicao.value ? id.value : json.id}`)
  } catch (e) {
    erroGeral.value = mensagemDeRede(e)
    await nextTick()
    alertaEl.value?.focus()
  } finally {
    salvando.value = false
  }
}

function cancelar() {
  router.push(ehEdicao.value ? `/funcionarios/${id.value}` : '/funcionarios')
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
  if (ehEdicao.value) carregarFuncionario()
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

/* Mensagem sob o campo: reserva altura para o layout não "pular" quando o erro aparece */
.msg {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 16px;
}

.msg-between {
  justify-content: space-between;
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