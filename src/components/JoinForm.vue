<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import { User, Hash, ArrowRight, Star } from 'lucide-vue-next'
import { useFavorites } from '@/composables/useFavorites'

const { favorites } = useFavorites()
const roomId = ref('')
const userName = ref('')
const userNameInput = ref<{ input: HTMLInputElement } | null>(null)
const emit = defineEmits<{ joined: [roomId: string, userName: string] }>()

const placeholders = [
  'Jamal Guy', 'Jamal Bestie', 'Jamal Ultra Pro Max', 'Jamal Original'
]

const randomPlaceholder = placeholders[Math.floor(Math.random() * placeholders.length)]

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const room = params.get('room')
  if (room) {
    roomId.value = room
  }

  const savedName = localStorage.getItem('surf4fun_username')
  if (savedName) {
    userName.value = savedName
  }

  // Auto-connect if both are present
  if (roomId.value && userName.value) {
    onSubmit()
  } else {
    // Focus if name is missing
    nextTick(() => {
      if (userNameInput.value?.input) {
        userNameInput.value.input.focus()
      }
    })
  }
})

function selectRoom(room: string) {
  roomId.value = room
  if (userName.value.trim()) {
    onSubmit()
  }
}

function onSubmit() {
  if (!roomId.value.trim() || !userName.value.trim()) return

  const finalName = userName.value.trim().slice(0, 20)
  const finalRoomId = roomId.value.trim().toLowerCase()

  localStorage.setItem('surf4fun_username', finalName)

  emit('joined', finalRoomId, finalName)
}
</script>

<template>
  <div class="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
    <div class="space-y-8">
      <div class="space-y-2">
        <h2 class="text-2xl font-bold tracking-tight">Enter the Grid</h2>
        <p class="text-sm text-muted-foreground">Identify yourself to join a session.</p>
      </div>

      <form @submit.prevent="onSubmit" class="space-y-6">
        <!-- Поле Имя -->
        <div class="space-y-2 relative group">
          <label for="userNameInput" class="text-xs font-bold uppercase tracking-widest text-muted-foreground group-focus-within:text-primary transition-colors flex justify-between"
            :class="{ 'text-primary animate-pulse': roomId && !userName }">
            <span>[01] Callsign</span>
            <span v-if="roomId && !userName" class="text-primary italic normal-case tracking-normal">— Required</span>
          </label>
          <div class="relative">
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors">
              <User class="h-4 w-4" />
            </div>
            <Input id="userNameInput" name="username" autocomplete="username" ref="userNameInput" v-model="userName" :placeholder="`e.g. ${randomPlaceholder}`"
              class="h-14 pl-12 pr-4 rounded-2xl border border-white/10 bg-black/50 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary transition-all text-base font-bold w-full"
              :class="{ 'border-primary ring-1 ring-primary bg-primary/5': roomId && !userName }" maxlength="20"
              @keyup.enter="onSubmit" />
          </div>
        </div>

        <!-- Поле ID комнаты -->
        <div class="space-y-2 relative group">
          <label for="roomIdInput"
            class="text-xs font-bold uppercase tracking-widest text-muted-foreground group-focus-within:text-primary transition-colors block">
            [02] Node ID
          </label>
          <div class="relative">
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors">
              <Hash class="h-4 w-4" />
            </div>
            <Input id="roomIdInput" name="room" autocomplete="off" v-model="roomId" placeholder="Enter room ID..."
              class="h-14 pl-12 pr-4 rounded-2xl border border-white/10 bg-black/50 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary transition-all text-base font-bold uppercase tracking-widest w-full"
              @keyup.enter="onSubmit" @input="roomId = roomId.toLowerCase()" />
          </div>

          <!-- Любимые комнаты -->
          <div v-if="favorites.length > 0" class="mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div class="flex items-center gap-2 mb-3">
              <Star class="h-3 w-3 text-primary" />
              <span class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Known Nodes</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button v-for="fav in favorites" :key="fav" type="button" @click="selectRoom(fav)"
                class="px-3 py-2 border border-white/10 rounded-xl bg-black/40 hover:border-primary hover:bg-primary/10 transition-all text-xs font-mono text-muted-foreground hover:text-primary active:scale-95 flex items-center gap-2 group cursor-pointer"
                :class="{ 'border-primary bg-primary/10 text-primary': roomId === fav }">
                <span class="truncate max-w-[120px]">{{ fav }}</span>
                <ArrowRight class="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </button>
            </div>
          </div>
        </div>

        <!-- Доп инфо -->
        <div class="flex items-start gap-3 p-4 rounded-2xl bg-black/40 border-l-2 border-primary/50 text-muted-foreground">
          <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 animate-pulse shrink-0 shadow-[0_0_8px_rgba(0,255,100,0.8)]"></div>
          <p class="text-xs font-mono leading-relaxed">
            P2P connection established. Max 5 peers per node. <br />
            End-to-end encrypted. No trace.
          </p>
        </div>

        <!-- Кнопка входа -->
        <Button
          type="submit"
          class="w-full h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold uppercase tracking-widest transition-all hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(var(--color-primary),0.3)] active:scale-[0.98] active:translate-y-0 group cursor-pointer disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          :disabled="!roomId.trim() || !userName.trim()">
          <span class="flex items-center gap-3">
            <template v-if="roomId.trim() && !userName.trim()">
              Awaiting Callsign
            </template>
            <template v-else>
              Initialize Connection
            </template>
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Button>
      </form>
    </div>
  </div>
</template>
