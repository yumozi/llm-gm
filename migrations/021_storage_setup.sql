-- ============================================================================
-- STORAGE BUCKET AND RLS POLICIES SETUP
-- ============================================================================
-- This migration sets up the world-assets storage bucket and its security policies
-- for image uploads and public access.

-- Create the world-assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'world-assets',
  'world-assets',
  true, -- Public bucket for easy access to images
  52428800, -- 50MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to upload files to world-assets bucket
CREATE POLICY "Allow authenticated uploads to world-assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'world-assets');

-- Policy 2: Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates to world-assets" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'world-assets');

-- Policy 3: Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes from world-assets" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'world-assets');

-- Policy 4: Allow public read access to world-assets bucket
CREATE POLICY "Allow public reads from world-assets" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'world-assets');

-- ============================================================================
-- HELPER FUNCTIONS (Optional)
-- ============================================================================

-- Function to get public URL for a file in world-assets bucket
CREATE OR REPLACE FUNCTION get_world_asset_url(file_path TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'https://' || current_setting('app.settings.supabase_url', true) || '/storage/v1/object/public/world-assets/' || file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned files (files in storage but not referenced in database)
CREATE OR REPLACE FUNCTION cleanup_orphaned_world_assets()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  file_record RECORD;
BEGIN
  -- Find files in world-assets that are not referenced in any image_url field
  FOR file_record IN
    SELECT name, bucket_id
    FROM storage.objects
    WHERE bucket_id = 'world-assets'
    AND name NOT IN (
      SELECT DISTINCT 
        CASE 
          WHEN image_url IS NOT NULL THEN 
            substring(image_url from 'world-assets/(.*)$')
          ELSE NULL
        END
      FROM worlds
      WHERE image_url IS NOT NULL
      UNION
      SELECT DISTINCT 
        CASE 
          WHEN image_url IS NOT NULL THEN 
            substring(image_url from 'world-assets/(.*)$')
          ELSE NULL
        END
      FROM npcs
      WHERE image_url IS NOT NULL
    )
  LOOP
    -- Delete the orphaned file
    DELETE FROM storage.objects 
    WHERE name = file_record.name AND bucket_id = file_record.bucket_id;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_world_asset_url(TEXT) IS 'Helper function to generate public URLs for world-assets files';
COMMENT ON FUNCTION cleanup_orphaned_world_assets() IS 'Cleans up storage files that are no longer referenced in the database';

-- Add comments to the bucket
COMMENT ON TABLE storage.buckets IS 'Storage buckets for the application. world-assets contains world images, NPC portraits, and other game assets.';
