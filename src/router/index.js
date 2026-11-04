import { createRouter, createWebHashHistory } from 'vue-router'
import ClienteList from '../views/cliente/ClienteList.vue'
import ClienteForm from '../views/cliente/ClienteForm.vue'
import ClienteDetail from '../views/cliente/ClienteDetail.vue'

import AtendimentosList from '../views/atendimentos/AtendimentosList.vue'
import AtendimentoEmAndamento from '../views/atendimentos/AtendimentoEmAndamento.vue'
import AtendimentoNovoCliente from '../views/atendimentos/AtendimentoNovoCliente.vue'
import AtendimentoNovoRevisarCliente from '../views/atendimentos/AtendimentoNovoRevisarCliente.vue'
import AtendimentoNovoProfissional from '../views/atendimentos/AtendimentoNovoProfissional.vue'
import AtendimentoPagamento from '../views/atendimentos/AtendimentoPagamento.vue'
// import AtendimentoNovoProfissional from '../views/atendimentos/AtendimentoNovoProfissional.vue'

import ServicosList from '../views/servicos/ServicosList.vue'
import ServicoForm from '../views/servicos/ServicoForm.vue'

import ProdutosList from '../views/produtos/ProdutosList.vue'
import ProdutoForm from '../views/produtos/ProdutoForm.vue'

import BeneficiosList from '../views/beneficios/BeneficiosList.vue'
import BeneficioForm from '../views/beneficios/BeneficioForm.vue'

import FuncionariosList from '../views/funcionarios/FuncionariosList.vue'
import FuncionarioForm from '../views/funcionarios/FuncionarioForm.vue'

import ConsultaCartao from '../views/cartao/ConsultaCartao.vue'

const routes = [
  { path: '/', component: ClienteList },
  { path: '/clientes/novo', component: ClienteForm },
  { path: '/clientes/:id', component: ClienteDetail, props: true },
  { path: '/clientes/:id/editar', component: ClienteForm },

  { path: '/atendimentos', component: AtendimentosList },
  { path: '/atendimentos/:id', component: AtendimentoEmAndamento },
  { path: '/atendimentos/novo', component: AtendimentoNovoCliente },
  { path: '/atendimentos/novo/:clienteId', component: AtendimentoNovoRevisarCliente },
  { path: '/atendimentos/novo/:clienteId/profissional', component: AtendimentoNovoProfissional },
  { path: '/atendimentos/:id/pagamento', component: AtendimentoPagamento },
  { path: '/atendimentos/:id/pagamento', component: AtendimentoPagamento },

  

  { path: '/servicos', component: ServicosList },
  { path: '/servicos/novo', component: ServicoForm },
  { path: '/servicos/:id/editar', component: ServicoForm },

  { path: '/produtos', component: ProdutosList },
  { path: '/produtos/novo', component: ProdutoForm },
  { path: '/produtos/:id/editar', component: ProdutoForm },

  { path: '/beneficios', component: BeneficiosList },
  { path: '/beneficios/novo', component: BeneficioForm },
  { path: '/beneficios/:id/editar', component: BeneficioForm },

  { path: '/funcionarios', component: FuncionariosList },
  { path: '/funcionarios/novo', component: FuncionarioForm },
  { path: '/funcionarios/:id/editar', component: FuncionarioForm },

  { path: '/consulta-cartao', component: ConsultaCartao },
  
]

// hash history: funciona abrindo o index.html direto no navegador (file://)
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
