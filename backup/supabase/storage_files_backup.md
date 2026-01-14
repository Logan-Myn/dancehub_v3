# DanceHub Supabase Storage Files Backup

> **Backup Date:** January 2025
> **Project ID:** rmnndxnjzacfhrbixxfo
> **Total Files:** 36
> **Total Size:** ~5.7 MB

---

## Storage Buckets Summary

| Bucket | Files | Size | Public |
|--------|-------|------|--------|
| avatars | 1 | 402 KB | Yes |
| community-images | 10 | 1.3 MB | Yes |
| course-images | 11 | 791 KB | Yes |
| images | 14 | 3.2 MB | Yes |

---

## Avatars Bucket (1 file)

| File | Size | Type |
|------|------|------|
| avatars/32502d3e-cb40-4ab3-b305-d367f815ca87-1737205864215.jpeg | 393 KB | image/jpeg |

---

## Community Images Bucket (10 files)

| File | Size | Type |
|------|------|------|
| 4ed8683f-a06d-4dd4-ae89-a4dcbec9f3a7/1736714028020.png | 69 KB | image/png |
| community-images/1737719180468.png | 69 KB | image/png |
| community-images/1737719586837.png | 69 KB | image/png |
| community-images/1747840003124.png | 69 KB | image/png |
| community-images/1747917234449.jpg | 148 KB | image/jpeg |
| community-images/1748017843137.png | 69 KB | image/png |
| community-images/1756796101989.png | 679 KB | image/png |
| community-images/1759739477027.png | 69 KB | image/png |
| community-images/1759915883709.webp | 9 KB | image/webp |
| fd23a553-a627-436e-b171-2cfd0ceddf8b/1757329532315.webp | 9 KB | image/webp |

---

## Course Images Bucket (11 files)

| File | Size | Type |
|------|------|------|
| 0cdf6b10-b4ab-4194-afa7-c2ad8a71857b-1736603296368.png | 67 KB | image/png |
| 15fc146b-f5b5-45e9-96fd-4c44984e0ee1.png | 67 KB | image/png |
| 4a3b65d6-51fb-4ca0-8425-29d6720c9734.png | 67 KB | image/png |
| 4b68afc1-aba6-4f4d-a633-07563fc24dce.png | 67 KB | image/png |
| 70ee881d-08a3-4c8e-be03-a4c38bf6d38f.png | 67 KB | image/png |
| 8c6d873c-f431-44a7-a496-42712b8a3154.png | 106 KB | image/png |
| 9faca9be-56fc-4894-8cc6-8bc87ad6494a.png | 67 KB | image/png |
| ab24e610-d58c-46f2-9899-ef778b8c50f5.png | 67 KB | image/png |
| bba28eca-b821-4699-9255-3bb0dee601c1.png | 16 KB | image/png |
| f72890f5-f3a4-4896-bee1-7d95320f9238.png | 67 KB | image/png |
| fc0a129c-c82b-40ee-8a70-d45b20b7873e.png | 114 KB | image/png |

---

## Images Bucket (14 files)

| File | Size | Type |
|------|------|------|
| community-pages/2b300bf2-6005-4fa4-9184-5fad0db40f10.webp | 290 KB | image/webp |
| community-pages/4bd2ee15-49e1-4230-9cfe-0fe3ecc18dff.webp | 290 KB | image/webp |
| community-pages/64adc847-333e-417e-8d0e-78268c843b02.webp | 290 KB | image/webp |
| community-pages/6573612e-872d-4cff-acc0-759e74b9bab1.webp | 290 KB | image/webp |
| community-pages/75e26125-f78b-45e4-bb93-e69e9f7fc205.webp | 290 KB | image/webp |
| community-pages/8c4d92bc-e9bf-4b07-8c69-f9758223dc3f.webp | 290 KB | image/webp |
| community-pages/8fc20d52-3192-430e-afac-ae464d988848.png | 69 KB | image/png |
| community-pages/8fd1892d-21f8-4874-ad78-3fd53218e0d1.png | 51 KB | image/png |
| community-pages/937365e2-e919-4055-bf09-c9bf8d2d9b1c.webp | 290 KB | image/webp |
| community-pages/98f8ca16-8d68-496b-a881-79bfcd816d80.png | 69 KB | image/png |
| community-pages/9b95f695-3bda-4345-9cbc-d87aa5e357ba.webp | 290 KB | image/webp |
| community-pages/b4febeb7-fff3-4251-8199-b2052058438e.webp | 290 KB | image/webp |
| community-pages/f8b74087-03cf-43c3-bdc6-4452f7e52ead.webp | 290 KB | image/webp |
| community-pages/fe7c6aae-2820-4f30-9361-18a41045d4a3.png | 51 KB | image/png |

---

## Migration Notes

### File URL Patterns

**Current Supabase URLs:**
```
https://rmnndxnjzacfhrbixxfo.supabase.co/storage/v1/object/public/{bucket}/{path}
```

**Example:**
```
https://rmnndxnjzacfhrbixxfo.supabase.co/storage/v1/object/public/avatars/avatars/32502d3e-cb40-4ab3-b305-d367f815ca87-1737205864215.jpeg
```

### Database Columns Storing File URLs

These columns in the database store Supabase storage URLs that will need updating:

1. **profiles.avatar_url** - User avatars
2. **communities.image_url** - Community header images
3. **courses.image_url** - Course cover images
4. **About page content** (stored in communities.about_page JSONB) - May contain image URLs

### Migration Strategy

1. Download all files from Supabase storage
2. Upload to Backblaze B2 with same folder structure
3. Generate new URLs (B2 format or Cloudflare CDN)
4. Update all database records with new URLs
5. Test all image loading
6. Keep Supabase storage running during transition period

### Download Commands

```bash
# Using Supabase CLI (if installed)
supabase storage download avatars --project-ref rmnndxnjzacfhrbixxfo
supabase storage download community-images --project-ref rmnndxnjzacfhrbixxfo
supabase storage download course-images --project-ref rmnndxnjzacfhrbixxfo
supabase storage download images --project-ref rmnndxnjzacfhrbixxfo
```

Or use the Supabase dashboard to manually download each bucket.
