-- ============================================================================
-- STORAGE BUCKET SETUP (SIMPLIFIED FOR PUBLIC BUCKET)
-- ============================================================================
-- PREREQUISITE: Create the bucket manually in Supabase Dashboard:
-- 1. Go to Storage → Create new bucket
-- 2. Name: world-assets
-- 3. Public bucket: YES (checked) ✓
----------------------------------------------------------------------------

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
