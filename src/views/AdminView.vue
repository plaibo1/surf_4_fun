<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import { Users, RefreshCw, Lock } from 'lucide-vue-next'

interface Room {
  id: string;
  participantsCount: number;
  participants: Array<{
    id: string;
    userName: string;
    streaming?: { isVideoEnabled: boolean; isScreenSharing: boolean };
    muteStatus?: { isMuted: boolean; isTotalMuted: boolean };
  }>;
}

const rooms = ref<Room[]>([])
const loading = ref(false)
const error = ref('')
const isAuthenticated = ref(false)
const username = ref('admin')
const password = ref('')

async function fetchRooms() {
  if (!isAuthenticated.value) return;
  loading.value = true
  error.value = ''
  try {
    const credentials = btoa(`${username.value}:${password.value}`)
    const res = await fetch('/api/rooms', {
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    })
    
    if (res.status === 401) {
      isAuthenticated.value = false
      error.value = 'Invalid credentials'
      return
    }
    
    if (!res.ok) throw new Error('Failed to fetch')
    
    rooms.value = await res.json()
  } catch (e: any) {
    error.value = e.message || 'Error fetching rooms'
  } finally {
    loading.value = false
  }
}

async function login() {
  error.value = ''
  isAuthenticated.value = true
  await fetchRooms()
  if (isAuthenticated.value && !interval) {
    interval = setInterval(fetchRooms, 10000)
  }
}

let interval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  if (isAuthenticated.value) {
    fetchRooms()
    interval = setInterval(fetchRooms, 10000)
  }
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <div class="min-h-screen bg-neutral-950 p-4 sm:p-8 text-neutral-100 flex items-center justify-center" v-if="!isAuthenticated">
    <Card class="w-full max-w-sm bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-white justify-center text-2xl">
          <Lock class="w-5 h-5 text-indigo-400" />
          Admin Login
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="login" class="space-y-4">
          <div v-if="error" class="bg-red-500/10 text-red-400 text-sm p-3 rounded border border-red-500/20 text-center">
            {{ error }}
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-neutral-400">Username</label>
            <Input v-model="username" placeholder="Username" class="bg-neutral-950 border-neutral-800 text-white" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-neutral-400">Password</label>
            <Input v-model="password" type="password" placeholder="Password" class="bg-neutral-950 border-neutral-800 text-white" />
          </div>
          <Button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white" :disabled="loading">
            <span v-if="loading">Logging in...</span>
            <span v-else>Login</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>

  <div v-else class="min-h-screen bg-neutral-950 p-4 sm:p-8 text-neutral-100">
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold tracking-tight text-white">Admin Dashboard</h1>
        <Button @click="fetchRooms" :disabled="loading" variant="outline" class="gap-2">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </Button>
      </div>

      <div v-if="error" class="bg-red-500/20 text-red-200 p-4 rounded-md border border-red-500/50">
        {{ error }}
      </div>
      
      <div v-if="!loading && rooms.length === 0" class="text-center py-12 text-neutral-500 text-lg">
        No active rooms at the moment.
      </div>

      <div class="grid gap-6">
        <Card v-for="room in rooms" :key="room.id" class="bg-neutral-900 border-neutral-800">
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <CardTitle class="text-xl font-semibold flex items-center gap-2 text-white">
              <span class="text-emerald-500">#</span> {{ room.id }}
            </CardTitle>
            <div class="flex items-center gap-2 text-neutral-300 bg-neutral-800 px-3 py-1 rounded-full text-sm">
              <Users class="w-4 h-4" />
              {{ room.participantsCount }}
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-3 mt-4">
              <div v-for="p in room.participants" :key="p.id" class="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800/50">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-medium text-sm border border-indigo-500/30">
                    {{ p.userName.charAt(0).toUpperCase() }}
                  </div>
                  <span class="font-medium text-neutral-200">{{ p.userName }}</span>
                  <span class="text-xs text-neutral-500 font-mono">{{ p.id.slice(0, 6) }}</span>
                </div>
                <div class="flex gap-2 text-xs font-medium">
                  <span v-if="p.muteStatus?.isMuted" class="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded">Muted</span>
                  <span v-if="p.muteStatus?.isTotalMuted" class="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-1 rounded">Deafened</span>
                  <span v-if="p.streaming?.isVideoEnabled" class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded">Video</span>
                  <span v-if="p.streaming?.isScreenSharing" class="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded">Screen</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
