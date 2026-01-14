import { AppState } from 'react-native'
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'


export const supabase = createClient(
  'https://bpgyexlphkobmyrlebnx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZ3lleGxwaGtvYm15cmxlYm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5ODAxNDYsImV4cCI6MjA4MjU1NjE0Nn0.5-5cjEKztwwPJQgArqAiTx-Kk7vUhg4mjto0sg45nPo',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })


AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})