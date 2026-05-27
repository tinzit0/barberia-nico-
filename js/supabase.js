// ============================================
// js/supabase.js — Cliente Supabase
// ============================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://skmeijhahrdovivtqpgo.supabase.co'
const SUPABASE_KEY = 'sb_publishable__qSerIH-2GFNLmx8kOIrHg_GeYy7kib'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
