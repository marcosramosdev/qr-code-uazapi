-- Migration: CRM Notion provisioning support
-- Run this in your Supabase SQL editor before using the CRM provisioning feature.

-- 1. Add link_crm_notion column to contas table (if not exists)
ALTER TABLE contas ADD COLUMN IF NOT EXISTS link_crm_notion TEXT;

-- 2. Ensure contatos table exists
CREATE TABLE IF NOT EXISTS contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id UUID NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
