
import { supabase } from "./supabase";

/**
 * Supabase Storage Service
 * Handles uploading media to Supabase Storage Buckets.
 */

const BUCKET_NAME = 'PingSpace_App';

export const storageService = {
  uploadFile: async (file: File): Promise<string> => {
    // Sanitize filename to prevent upload issues with special characters or spaces
    const cleanFileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const fileName = `${Date.now()}_${cleanFileName}`;
    
    // Check if user is authenticated before attempting upload
    // Use getUser() for better security and session freshness
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("You must be logged in to upload files. Please sign in and try again.");
    }

    // Attempt the upload
    // We set upsert: false to avoid needing UPDATE permissions in the RLS policy
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false, 
        contentType: file.type
      });
    
    if (error) {
      console.error("Supabase Storage Upload Error:", error);
      
      // Handle RLS Policy violations with specific instructions for the user
      if (error.message.includes('row-level security policy') || (error as any).status === 403) {
        const sqlFix = `
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO FIX STORAGE PERMISSIONS:

-- 1. Ensure the bucket is created and set to PUBLIC in the dashboard

-- 2. Allow authenticated users to upload files to '${BUCKET_NAME}'
CREATE POLICY "Allow Authenticated Uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = '${BUCKET_NAME}');

-- 3. Allow public access to read files from '${BUCKET_NAME}'
CREATE POLICY "Allow Public Access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = '${BUCKET_NAME}');
        `;
        
        console.warn(">>> SUPABASE RLS FIX REQUIRED <<<", sqlFix);
        
        throw new Error(
          `Permission Denied: Your Supabase RLS policies are blocking the upload to '${BUCKET_NAME}'. ` +
          `Please check the browser console (F12) for the SQL script to fix this.`
        );
      }
      
      // Handle missing bucket
      if (error.message.includes('Bucket not found')) {
        throw new Error(`Storage bucket '${BUCKET_NAME}' not found. Please create a bucket named '${BUCKET_NAME}' in your Supabase dashboard and set it to 'Public'.`);
      }
      
      throw error;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);
    
    return publicUrl;
  }
};
