-- ============================================
-- Migration: 20260624000000_app_settings.sql
-- Description: Add app_settings table to sync global store settings across devices
-- Version: 2.5
-- Idempotent: Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT)
-- ============================================

-- ============================================
-- APP SETTINGS TABLE (single-row, JSONB config)
-- ============================================
-- Stores global store-wide settings (receipt, currency, general, bank, unit)
-- so they sync across all devices. Printer/station configs stay local per machine.
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed the singleton row so upserts always have a target.
INSERT INTO public.app_settings (id, settings)
  VALUES ('singleton', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated users to read and upsert app_settings
CREATE POLICY "Allow anonymous read on app_settings"
  ON public.app_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous upsert on app_settings"
  ON public.app_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- SCHEMA VERSION
-- ============================================

INSERT INTO public.schema_version (version, description) VALUES
  ('2.5', 'Add app_settings table for cross-device global settings sync')
ON CONFLICT (version) DO UPDATE SET applied_at = timezone('utc'::text, now());

-- ============================================
-- END OF MIGRATION
-- ============================================
