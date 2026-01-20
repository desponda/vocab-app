# HEIC Support Testing Guide

This document explains how to test HEIC (iPhone photo) support end-to-end.

## Test Files

### 1. `test-heic-workflow.ts` - Local Integration Test

**Purpose:** Test the complete HEIC processing pipeline locally without hitting the API.

**What it tests:**
- File validation (magic byte signatures)
- HEIC to JPEG conversion using heic-convert
- EXIF-based image rotation
- Image compression (4MB limit for Claude API)
- Base64 encoding (5MB limit for Claude API)
- Final image validity

**How to run:**
```bash
cd apps/api
npx tsx test-heic-workflow.ts
```

**Expected output:**
```
========================================
TEST PASSED ✅
========================================
All workflow steps completed successfully!
Original: 2.63 MB HEIC
Final: 2.67 MB IMAGE/JPEG
Base64: 3.56 MB (ready for Claude API)
========================================
```

**Output files:** `/tmp/heic-test/`
- `original.heic` - Input file
- `converted.jpg` - After HEIC conversion
- `final.jpg` - After rotation + compression (this is what Claude API sees)

---

### 2. `test-heic-api.sh` - API Integration Test

**Purpose:** Test HEIC upload via the actual API endpoint (requires running server).

**What it tests:**
- Authentication
- File upload with HEIC content
- API validation and processing
- Background job queuing

**How to run locally:**
```bash
# Start API server
pnpm dev --filter=api

# In another terminal
cd apps/api
./test-heic-api.sh http://localhost:3001 /workspace/IMG_2406.heic
```

**How to run against staging:**
```bash
cd apps/api
./test-heic-api.sh https://vocab-staging.dresponda.com /workspace/IMG_2406.heic
```

**Expected output:**
```
✅ UPLOAD SUCCESS!
Response:
{
  "id": "...",
  "filename": "IMG_2406.heic",
  "status": "PROCESSING",
  ...
}
```

---

## Test Files Location

- **Test HEIC file:** `/workspace/IMG_2406.heic` (2.63 MB iPhone photo)
- **Test scripts:** `/workspace/apps/api/test-heic-*`

---

## Verification Checklist

### Before Deployment
- [ ] `test-heic-workflow.ts` passes locally
- [ ] Docker image builds successfully
- [ ] Docker image includes Debian base with libheif

### After Deployment
- [ ] `test-heic-api.sh` uploads successfully
- [ ] Background job processes HEIC file
- [ ] Vocabulary extraction completes
- [ ] Test is created and visible in UI

### In Production (Manual)
1. Upload `IMG_2406.heic` via web UI
2. Check processing status
3. Verify test is created
4. Verify extracted vocabulary is correct

---

## Troubleshooting

### "bad seek" errors
**Cause:** Sharp trying to read HEIC before conversion
**Fix:** Ensure HEIC conversion happens BEFORE Sharp operations (line 319-329 in claude.ts)

### "Support for this compression format has not been built in"
**Cause:** Missing libheif native libraries
**Fix:** Verify Dockerfile uses Debian base with libheif packages:
```dockerfile
FROM node:20-bookworm-slim
RUN apt-get install -y libheif1 libde265-0 libaom3 x265
```

### "heif: Error while loading plugin"
**Cause:** heic-convert can't find libheif bindings
**Fix:** Ensure running on Debian-based system with libheif installed

### Base64 exceeds 5MB
**Cause:** Image too large after compression
**Fix:** Compression algorithm needs adjustment (reduce quality further or resize more aggressively)

---

## Docker Testing

To test HEIC support in the Docker image:

```bash
# Build image
docker build -f docker/api.Dockerfile -t vocab-api:heic-test .

# Run container
docker run -it --rm -v /workspace:/workspace vocab-api:heic-test bash

# Inside container
cd /workspace/apps/api
npx tsx test-heic-workflow.ts
```

---

## CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Test HEIC Support
  run: |
    cd apps/api
    npx tsx test-heic-workflow.ts
```

This ensures HEIC support is verified on every deployment.

---

## Performance Benchmarks

Based on `IMG_2406.heic` (2.63 MB, 4284x5712px):

| Step | Time | Size |
|------|------|------|
| HEIC → JPEG conversion | ~500ms | 4.15 MB |
| EXIF rotation | ~200ms | 2.67 MB |
| Compression (if needed) | ~300ms | 2.67 MB |
| Base64 encoding | ~50ms | 3.56 MB |
| **Total** | **~1.05s** | **3.56 MB** |

Claude API call: ~3-5 seconds
**Total processing time:** ~4-6 seconds per HEIC file

---

## Known Limitations

1. **Image size:** Max 25MB upload, must compress to <4MB for Claude API
2. **Docker image:** Debian base is ~100MB larger than Alpine
3. **Dependencies:** Requires native libheif bindings (can't use Alpine)
4. **Format support:** Only HEIC/HEIF, not Apple ProRAW or other exotic formats

---

## Related Issues

- Initial Alpine attempt: commit `80fe376e`
- WebAssembly attempt: commit `95ef3f84`
- Working Debian solution: commit `f11d383a`
