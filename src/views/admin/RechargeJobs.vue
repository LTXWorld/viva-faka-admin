<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { adminAPI } from '@/api/admin'
import TableSkeleton from '@/components/TableSkeleton.vue'
import ListPagination from '@/components/ListPagination.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw } from 'lucide-vue-next'

interface RechargeJob {
  id: number
  provider: string
  product_type: string
  card_key: string
  upstream_job_id?: string
  status: string
  message?: string
  activation_email?: string
  plan_name?: string
  submitted_at?: string | null
  finished_at?: string | null
  created_at: string
  updated_at: string
}

const loading = ref(true)
const refreshing = ref(false)
const jobs = ref<RechargeJob[]>([])
const pagination = reactive({
  page: 1,
  page_size: 20,
  total: 0,
  total_page: 1,
})
const filters = reactive({
  provider: '__all__',
  product_type: '__all__',
  status: '__all__',
  card_key: '',
  job_id: '',
})

const statusOptions = [
  { value: '__all__', label: '全部状态' },
  { value: 'submitted', label: '已提交' },
  { value: 'queued', label: '排队中' },
  { value: 'running', label: '处理中' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' },
]

const pageSizeOptions = [10, 20, 50, 100]

const statusLabel = (status: string) => {
  const item = statusOptions.find((opt) => opt.value === status)
  return item?.label || status || '-'
}

const statusClass = (status: string) => {
  switch (status) {
    case 'success': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'failed': return 'bg-red-100 text-red-700 border-red-200'
    case 'cancelled': return 'bg-slate-100 text-slate-700 border-slate-200'
    case 'queued':
    case 'running': return 'bg-sky-100 text-sky-700 border-sky-200'
    default: return 'bg-amber-100 text-amber-700 border-amber-200'
  }
}

const formatTime = (raw?: string | null) => {
  if (!raw) return '-'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString()
}

const truncate = (value?: string, len = 18) => {
  if (!value) return '-'
  if (value.length <= len) return value
  return `${value.slice(0, Math.floor(len / 2))}...${value.slice(-Math.floor(len / 2))}`
}

const buildParams = (page = pagination.page) => {
  const params: Record<string, unknown> = { page, page_size: pagination.page_size }
  if (filters.provider !== '__all__') params.provider = filters.provider
  if (filters.product_type !== '__all__') params.product_type = filters.product_type
  if (filters.status !== '__all__') params.status = filters.status
  if (filters.card_key.trim()) params.card_key = filters.card_key.trim()
  if (filters.job_id.trim()) params.job_id = filters.job_id.trim()
  return params
}

const fetchJobs = async (page = 1, preserveRows = false) => {
  if (!preserveRows) loading.value = true
  try {
    const res = await adminAPI.getRechargeJobs(buildParams(page))
    jobs.value = (res.data.data || []) as RechargeJob[]
    const p = res.data.pagination
    if (p) {
      pagination.page = p.page
      pagination.page_size = p.page_size
      pagination.total = p.total
      pagination.total_page = p.total_page
    }
  } catch {
    if (!preserveRows) jobs.value = []
  } finally {
    if (!preserveRows) loading.value = false
  }
}

const search = () => fetchJobs(1, true)
const debouncedSearch = useDebounceFn(search, 300)

const refresh = async () => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await fetchJobs(pagination.page, true)
  } finally {
    refreshing.value = false
  }
}

const changePage = (page: number) => {
  if (page < 1 || page > pagination.total_page) return
  fetchJobs(page)
}

const changePageSize = (size: number) => {
  pagination.page_size = size
  fetchJobs(1)
}

onMounted(() => fetchJobs(1))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">兑换记录</h1>
        <p class="text-sm text-muted-foreground">查看 ChatGPT Plus 等上游直充任务的本地记录。</p>
      </div>
      <Button variant="outline" :disabled="refreshing" @click="refresh">
        <RefreshCw class="mr-2 h-4 w-4" :class="refreshing ? 'animate-spin' : ''" />
        刷新
      </Button>
    </div>

    <div class="rounded-lg border bg-card p-4 shadow-sm">
      <div class="grid gap-3 md:grid-cols-5">
        <Input v-model="filters.card_key" placeholder="搜索卡密" @input="debouncedSearch" />
        <Input v-model="filters.job_id" placeholder="搜索上游任务ID" @input="debouncedSearch" />
        <Select v-model="filters.provider" @update:modelValue="search">
          <SelectTrigger><SelectValue placeholder="供应商" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部供应商</SelectItem>
            <SelectItem value="lyxazy">lyxazy</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filters.product_type" @update:modelValue="search">
          <SelectTrigger><SelectValue placeholder="产品类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部产品</SelectItem>
            <SelectItem value="chatgpt_plus">ChatGPT Plus</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filters.status" @update:modelValue="search">
          <SelectTrigger><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="overflow-hidden rounded-lg border bg-card shadow-sm">
      <TableSkeleton v-if="loading" :rows="8" :columns="9" />
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th class="px-4 py-3">ID</th>
              <th class="px-4 py-3">卡密</th>
              <th class="px-4 py-3">供应商/产品</th>
              <th class="px-4 py-3">任务ID</th>
              <th class="px-4 py-3">状态</th>
              <th class="px-4 py-3">充值账号</th>
              <th class="px-4 py-3">套餐</th>
              <th class="px-4 py-3">消息</th>
              <th class="px-4 py-3">更新时间</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-if="jobs.length === 0">
              <td colspan="9" class="px-4 py-10 text-center text-muted-foreground">暂无兑换记录</td>
            </tr>
            <tr v-for="job in jobs" :key="job.id" class="hover:bg-muted/40">
              <td class="px-4 py-3 font-medium">{{ job.id }}</td>
              <td class="px-4 py-3 font-mono" :title="job.card_key">{{ truncate(job.card_key, 24) }}</td>
              <td class="px-4 py-3">
                <div class="font-medium">{{ job.provider }}</div>
                <div class="text-xs text-muted-foreground">{{ job.product_type }}</div>
              </td>
              <td class="px-4 py-3 font-mono" :title="job.upstream_job_id">{{ truncate(job.upstream_job_id, 22) }}</td>
              <td class="px-4 py-3">
                <span :class="['inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', statusClass(job.status)]">
                  {{ statusLabel(job.status) }}
                </span>
              </td>
              <td class="px-4 py-3" :title="job.activation_email">{{ truncate(job.activation_email, 24) }}</td>
              <td class="px-4 py-3">{{ job.plan_name || '-' }}</td>
              <td class="max-w-[260px] truncate px-4 py-3" :title="job.message">{{ job.message || '-' }}</td>
              <td class="px-4 py-3 whitespace-nowrap">{{ formatTime(job.updated_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ListPagination
        :page="pagination.page"
        :total-page="pagination.total_page"
        :total="pagination.total"
        :page-size="pagination.page_size"
        :page-size-options="pageSizeOptions"
        @change-page="changePage"
        @change-page-size="changePageSize"
      />
    </div>
  </div>
</template>
