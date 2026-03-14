<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import { User, Hash, ArrowRight } from 'lucide-vue-next'

const roomId = ref('')
const userName = ref('')
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
  }
})

function onSubmit() {
  if (!roomId.value.trim() || !userName.value.trim()) return
  
  const finalName = userName.value.trim().slice(0, 20)
  const finalRoomId = roomId.value.trim().toLowerCase()
  
  localStorage.setItem('surf4fun_username', finalName)
  
  emit('joined', finalRoomId, finalName)
}
</script>

<template>
  <div class="w-full max-w-md animate-in fade-in zoom-in duration-500 relative">
    <Card class="border-none shadow-2xl bg-gradient-to-br from-card to-muted/30 overflow-hidden relative z-10">
      <CardHeader class="pt-10 pb-6 text-center">
        <div class="mx-auto w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center mb-6 ring-1 ring-primary/10 shadow-2xl overflow-hidden">
          <img src="/logo.webp" alt="Surf 4 Fun Logo" class="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500" />
        </div>
        <div class="relative inline-block mx-auto">
          <CardTitle class="text-4xl font-black tracking-tighter text-foreground uppercase">
            Surf 4 Fun
          </CardTitle>
          <span class="absolute -bottom-4 right-0 text-[10px] font-black uppercase tracking-widest text-primary/60 italic">
            by Jamal
          </span>
        </div>
      </CardHeader>

      <CardContent class="px-8 pb-10 space-y-6">
        <!-- Поле Имя -->
        <div class="space-y-0">
          <label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 block mb-1.5">Как тебя зовут?</label>
          <div class="relative group">
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors">
              <User class="h-5 w-5" />
            </div>
            <Input 
              v-model="userName" 
              :placeholder="`Например: ${randomPlaceholder}`" 
              class="h-14 pl-12 pr-4 rounded-2xl border-none bg-background/50 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-base font-bold"
              maxlength="20"
              @keyup.enter="onSubmit" 
            />
          </div>
          <p class="text-[9px] text-muted-foreground/40 mt-1 ml-1 font-bold uppercase tracking-tighter">Макс. 20 символов</p>
        </div>

        <!-- Поле ID комнаты -->
        <div class="space-y-0">
          <label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 block mb-1.5">Куда входим?</label>
          <div class="relative group">
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors">
              <Hash class="h-5 w-5" />
            </div>
            <Input 
              v-model="roomId" 
              placeholder="ID или название комнаты" 
              class="h-14 pl-12 pr-4 rounded-2xl border-none bg-background/50 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-base font-bold uppercase tracking-tight"
              @keyup.enter="onSubmit" 
              @input="roomId = roomId.toLowerCase()"
            />
          </div>
        </div>

        <!-- Доп инфо -->
        <div class="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 animate-pulse"></div>
          <p class="text-xs font-medium text-primary/80 leading-relaxed">
            Комнаты приватные. Максимум 5 человек. <br/>
            Никакой регистрации — просто заходи.
          </p>
        </div>

        <!-- Кнопка входа -->
        <Button 
          class="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group cursor-pointer" 
          @click="onSubmit"
          :disabled="!roomId.trim() || !userName.trim()"
        >
          Войти
          <ArrowRight class="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>

    <footer class="mt-8 text-center">
      <p class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
        &copy; {{ new Date().getFullYear() }} Surf 4 Fun &bull; No Strings Attached
      </p>
    </footer>
  </div>
</template>
