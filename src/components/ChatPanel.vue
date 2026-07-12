<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import Input from '@/components/ui/input/Input.vue'
import Button from '@/components/ui/button/Button.vue'
import { MessageSquare, Check, Copy, Swords, Send } from 'lucide-vue-next'
import { parseMessage } from '@/lib/utils'
import type { ChatMessage } from '@/composables/useVoiceRoom'

const props = defineProps<{
  messages: ChatMessage[]
  myId: string | null
}>()

const emit = defineEmits<{
  (e: 'sendMessage', text: string): void
}>()

const newMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const copiedLink = ref<string | null>(null)

watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    scrollToBottom()
  }
)

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function onSendMessage() {
  if (!newMessage.value.trim()) return
  emit('sendMessage', newMessage.value)
  newMessage.value = ''
  await nextTick()
  scrollToBottom()
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedLink.value = text
    setTimeout(() => {
      if (copiedLink.value === text) {
        copiedLink.value = null
      }
    }, 2000)
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

function handleLinkClick(part: any) {
  if (part.isCS && part.ip) {
    window.location.href = `steam://connect/${part.ip}`
  } else {
    copyToClipboard(part.text)
  }
}
</script>

<template>
  <div class="flex flex-col h-[400px] sm:h-[450px] xl:h-[500px] w-full space-y-4">
    <!-- Section Header -->
    <div class="flex items-center justify-between px-1 shrink-0">
      <h3 class="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <MessageSquare class="w-4 h-4" />
        Чат
      </h3>
      <div class="flex items-center gap-2">
        <div v-if="messages.length > 0" class="px-2 py-0.5 rounded-[6px] bg-white/5 border border-white/10">
          <span class="text-[10px] font-mono font-bold text-muted-foreground">{{ messages.length }} MSG</span>
        </div>
      </div>
    </div>

    <!-- Chat Container -->
    <div class="flex-1 bg-black/40 border border-white/10 backdrop-blur-md rounded-[24px] overflow-hidden shadow-2xl relative flex flex-col min-h-0">
      
      <!-- Messages Feed -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 scroll-smooth">
        <!-- Empty State -->
        <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-center opacity-40">
          <div class="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
             <MessageSquare class="w-5 h-5 text-muted-foreground" />
          </div>
          <p class="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Журнал пуст</p>
        </div>

        <!-- Messages -->
        <div v-for="msg in messages" :key="msg.id"
          class="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300"
          :class="msg.senderId === myId ? 'items-end' : 'items-start'">
          <span v-if="msg.senderId !== myId"
            class="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-1 mb-1.5 opacity-60">
            {{ msg.senderName }}
          </span>
          <div
            class="group relative max-w-[90%] px-3.5 py-2.5 shadow-sm transition-all text-sm leading-relaxed whitespace-pre-wrap border"
            :class="msg.senderId === myId ? 'bg-primary text-primary-foreground rounded-[16px] rounded-tr-[4px] border-primary/50' : 'bg-white/5 text-foreground rounded-[16px] rounded-tl-[4px] border-white/10'">
            <template v-for="part in parseMessage(msg.text)" :key="part.id">
              <button type="button" v-if="part.isLink"
                class="inline-flex items-center gap-1.5 align-middle px-1.5 py-0.5 rounded-[6px] cursor-pointer group/link transition-all active:scale-95 border"
                :class="msg.senderId === myId ? 'bg-black/20 border-black/10 hover:bg-black/30' : 'bg-black/40 border-white/5 hover:bg-black/60'"
                @click="handleLinkClick(part)">
                <template v-if="part.isCS">
                  <Swords class="h-3 w-3 text-orange-400 shrink-0" />
                </template>
                <template v-else>
                  <Check v-if="copiedLink === part.text" class="h-3 w-3 text-green-400 shrink-0" />
                  <Copy v-else class="h-3 w-3 opacity-40 group-hover/link:opacity-100 transition-opacity shrink-0" />
                </template>
                <span class="underline underline-offset-4 transition-all font-bold select-none truncate max-w-[120px] sm:max-w-[180px]">{{ part.text }}</span>
              </button>
              <span v-else>{{ part.text }}</span>
            </template>
            <div class="text-right mt-1.5 text-[8px] font-mono font-bold opacity-40">
              {{ new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Input Area -->
      <div class="p-3 sm:p-4 pt-2 bg-gradient-to-t from-black/80 to-transparent relative z-10">
        <form @submit.prevent="onSendMessage" class="relative group">
          <!-- Animated Glow Behind -->
          <div class="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 rounded-[18px] blur-md opacity-0 group-focus-within:opacity-100 transition duration-700 animate-pulse"></div>
          
          <!-- Container -->
          <div class="relative flex items-center bg-black/90 backdrop-blur-xl border border-white/10 rounded-[16px] p-1.5 transition-all duration-300 group-focus-within:border-primary/50 group-focus-within:bg-black shadow-2xl">
            <!-- Terminal Prompt -->
            <div class="pl-3 pr-1 text-primary/70 font-mono font-black select-none animate-pulse">></div>
            
            <!-- Input -->
            <Input id="chatMessageInput" name="message" autocomplete="off" aria-label="Сообщение" v-model="newMessage" placeholder="Написать..."
              class="flex-1 h-9 sm:h-11 border-none bg-transparent shadow-none text-sm px-2 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30 transition-all" />
            
            <!-- Send Button -->
            <Button aria-label="Отправить сообщение" type="submit" size="icon" 
              class="shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-[12px] transition-all duration-300"
              :class="newMessage.trim() ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.5)] scale-100' : 'bg-transparent text-muted-foreground scale-95 opacity-50 hover:bg-white/5 hover:opacity-100'"
              :disabled="!newMessage.trim()">
              <Send class="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
