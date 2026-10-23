<script setup>
import { ref, computed } from 'vue'

// Para adicionar uma página nova, basta incluir um item aqui
const itens = [
  { to: '/', label: 'Clientes', exact: true },
  { to: '/atendimentos', label: 'Atendimentos' },
  { to: '/servicos', label: 'Serviços' },
  { to: '/produtos', label: 'Produtos' },
  { to: '/beneficios', label: 'Benefícios' },
  { to: '/funcionarios', label: 'Funcionários' },
]

const busca = ref('')

const itensFiltrados = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  return termo
    ? itens.filter((i) => i.label.toLowerCase().includes(termo))
    : itens
})
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <h2>SISI Pontos</h2>

      <!-- <input
        v-model="busca"
        class="input"
        type="search"
        placeholder="Buscar"
        aria-label="Buscar"
      /> -->

      <ul class="menu">
        <li v-for="item in itensFiltrados" :key="item.to">
          <router-link
            :to="item.to"
            custom
            v-slot="{ href, navigate, isActive, isExactActive }"
          >
            <a
              :href="href"
              :class="{ active: item.exact ? isExactActive : isActive }"
              :aria-current="(item.exact ? isExactActive : isActive) ? 'page' : null"
              @click="navigate"
            >
              {{ item.label }}
            </a>
          </router-link>
        </li>
        <li v-if="!itensFiltrados.length" class="menu-title">
          Nenhum resultado
        </li>
      </ul>
    </aside>

    <main class="main">
      <router-view />
    </main>
  </div>
</template>