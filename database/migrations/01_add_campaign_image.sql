-- Migration: Add image support to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS image_url VARCHAR(2048);

-- Table to store temporary image-to-transaction mappings
-- This allows us to link an uploaded image to a campaign before the indexer sees it.
CREATE TABLE IF NOT EXISTS campaign_image_mappings (
    tx_hash     VARCHAR(64) PRIMARY KEY,
    image_url   VARCHAR(2048) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
