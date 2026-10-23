<template>
  <div>
    <h1>Consultar por Número do Cartão</h1>

    <form @submit.prevent="consultar">
      <input v-model.trim="numero" type="text" placeholder="Ex.: 123456">
      <button type="submit" :disabled="buscando || !numero">
        {{ buscando ? 'Buscando…' : 'Consultar' }}
      </button>
    </form>

    <p v-if="erro" class="erro">{{ erro }}</p>

    <div v-if="cliente">
      <hr>
      <p><strong>ID:</strong> {{ cliente.id }}</p>
      <p><strong>Nome:</strong> {{ cliente.nome }}</p>
      <p><strong>Telefone:</strong> {{ cliente.telefone || '—' }}</p>
      <p><strong>Nº Cartão:</strong> {{ cliente.numero_cartao }}</p>
      <router-link :to="`/clientes/${cliente.id}`">Ver detalhes completos</router-link>
    </div>

    <br>
    <router-link to="/">← Voltar para a lista</router-link>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const API_URL = 'http://localhost:8888/api-fidelidade/api/clientes.php' // ajuste aqui

const numero = ref('')
const cliente = ref(null)
const buscando = ref(false)
const erro = ref('')

async function consultar() {
  if (!numero.value) return
  buscando.value = true
  erro.value = ''
  cliente.value = null
  try {
    const res = await fetch(`${API_URL}/cartao/${encodeURIComponent(numero.value)}`)
    const json = await res.json()
    if (!res.ok) {
      throw new Error(res.status === 404
        ? `Nenhum cliente encontrado com o cartão "${numero.value}".`
        : json?.error?.message || 'Erro na consulta.')
    }
    cliente.value = json
  } catch (e) {
    erro.value = e.message
  } finally {
    buscando.value = false
  }
}
</script>

<style scoped>
.erro { color: red; }
input { padding: .4rem; margin-right: .5rem; }
</style>