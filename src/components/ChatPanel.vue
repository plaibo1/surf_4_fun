<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
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
  <Card
    class="border-none shadow-2xl bg-gradient-to-br from-card to-muted/20 overflow-hidden flex flex-col h-[400px] rounded-none sm:rounded-2xl">
    <CardHeader class="border-b bg-muted/30 pb-3 px-4 sm:px-6">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-primary/10 text-primary">
            <MessageSquare class="h-4 w-4" />
          </div>
          <CardTitle class="text-base sm:text-lg font-black tracking-tight">Чат</CardTitle>
        </div>
        <div
          class="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {{ messages.length }} msg
        </div>
      </div>
    </CardHeader>
    <CardContent class="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 scroll-smooth">
        <div v-if="messages.length === 0"
          class="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
          <MessageSquare class="h-6 w-6 sm:h-8 sm:w-8" />
          <p class="text-[10px] sm:text-xs font-bold uppercase">Пусто</p>
        </div>
        <div v-for="msg in messages" :key="msg.id"
          class="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300"
          :class="msg.senderId === myId ? 'items-end' : 'items-start'">
          <span v-if="msg.senderId !== myId"
            class="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-2 mb-1">{{
              msg.senderName
            }}</span>
          <div
            class="group relative max-w-[90%] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm transition-all"
            :class="msg.senderId === myId ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border border-border/50 text-foreground rounded-tl-none'">
            <div class="text-[11px] sm:text-xs font-medium leading-relaxed whitespace-pre-wrap">
              <template v-for="part in parseMessage(msg.text)" :key="part.id">
                <span v-if="part.isLink"
                  class="inline-flex items-center gap-1.5 align-middle bg-black/10 dark:bg-white/5 px-1 sm:px-1.5 py-0.5 rounded-lg cursor-pointer group/link transition-all hover:bg-black/20 dark:hover:bg-white/10 active:scale-95"
                  @click="handleLinkClick(part)">
                  <template v-if="part.isCS">
                    <Swords class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-400 shrink-0" />
                  </template>
                  <template v-else>
                    <Check v-if="copiedLink === part.text"
                      class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-400 shrink-0" />
                    <Copy v-else
                      class="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-40 group-hover/link:opacity-100 transition-opacity shrink-0" />
                  </template>
                  <span
                    class="underline underline-offset-2 transition-all font-bold select-none truncate max-w-[120px] sm:max-w-[180px]"
                    :class="msg.senderId === myId ? 'text-white' : 'text-primary'">{{ part.text }}</span>
                </span>
                <span v-else>{{ part.text }}</span>
              </template>
            </div>
            <div class="text-right mt-1 text-[7px] sm:text-[8px] font-bold opacity-50">{{ new
              Date(msg.timestamp).toLocaleTimeString([], {
                hour:
                  '2-digit', minute: '2-digit'
              }) }}</div>
          </div>
        </div>
      </div>
      <div class="p-2 sm:p-3 bg-muted/40 border-t backdrop-blur-xl">
        <form @submit.prevent="onSendMessage" class="flex items-center gap-2">
          <Input v-model="newMessage" placeholder="Сообщение..."
            class="flex-1 h-9 sm:h-10 rounded-lg sm:rounded-xl border-none bg-background/60 shadow-inner text-[11px] sm:text-xs px-3" />
          <Button type="submit" size="icon" class="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl"
            :disabled="!newMessage.trim()">
            <Send class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </form>
      </div>
    </CardContent>
  </Card>
</template>
