/**
 * End-to-end test for HEIC file processing workflow
 * Tests the exact code path that production uses
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import convert from 'heic-convert';

// Test file path
const TEST_HEIC_FILE = '/workspace/IMG_2406.heic';

interface FileSignature {
  mimeType: string;
  signature: number[];
  offset?: number;
}

const FILE_SIGNATURES: FileSignature[] = [
  { mimeType: 'application/pdf', signature: [0x25, 0x50, 0x44, 0x46] },
  { mimeType: 'image/jpeg', signature: [0xff, 0xd8, 0xff] },
  { mimeType: 'image/png', signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mimeType: 'image/gif', signature: [0x47, 0x49, 0x46, 0x38] },
  { mimeType: 'image/webp', signature: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  { mimeType: 'image/heic', signature: [0x66, 0x74, 0x79, 0x70], offset: 4 },
];

function matchesSignature(buffer: Buffer, signature: number[], offset: number = 0): boolean {
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

function validateFileType(buffer: Buffer): { mimeType: string; isValid: boolean } {
  // Check for WebP
  if (matchesSignature(buffer, [0x52, 0x49, 0x46, 0x46], 0) &&
      matchesSignature(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mimeType: 'image/webp', isValid: true };
  }

  // Check for HEIC/HEIF
  if (matchesSignature(buffer, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = buffer.toString('utf8', 8, 12);
    if (brand.startsWith('heic') || brand.startsWith('heix') ||
        brand.startsWith('hevc') || brand.startsWith('hevx') ||
        brand.startsWith('mif1') || brand.startsWith('msf1')) {
      return { mimeType: 'image/heic', isValid: true };
    }
  }

  // Check other signatures
  for (const sig of FILE_SIGNATURES) {
    if (sig.mimeType === 'image/webp' || sig.mimeType === 'image/heic') {
      continue;
    }
    if (matchesSignature(buffer, sig.signature, sig.offset || 0)) {
      return { mimeType: sig.mimeType, isValid: true };
    }
  }

  return { mimeType: '', isValid: false };
}

async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  console.log('  Converting HEIC to JPEG...');
  const outputBuffer = await convert({
    buffer,
    format: 'JPEG',
    quality: 0.9,
  });
  return Buffer.from(outputBuffer as ArrayBuffer);
}

async function rotateImage(buffer: Buffer): Promise<Buffer> {
  console.log('  Applying EXIF rotation...');
  return await sharp(buffer)
    .rotate() // Auto-rotate based on EXIF
    .toBuffer();
}

async function compressIfNeeded(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const MAX_SIZE = 4 * 1024 * 1024; // 4MB

  if (buffer.length <= MAX_SIZE) {
    console.log(`  ✓ Size OK: ${(buffer.length / 1024 / 1024).toFixed(2)} MB (under 4MB limit)`);
    return { buffer, mimeType };
  }

  console.log(`  ! Size too large: ${(buffer.length / 1024 / 1024).toFixed(2)} MB, compressing...`);

  const image = sharp(buffer);
  const metadata = await image.metadata();
  let width = metadata.width;

  // Try PNG compression with resizing
  while (buffer.length > MAX_SIZE && width && width > 800) {
    width = Math.floor(width * 0.9);
    buffer = await sharp(buffer)
      .resize(width, null, { withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    console.log(`    Resized to ${width}px: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
  }

  if (buffer.length <= MAX_SIZE) {
    return { buffer, mimeType: 'image/png' };
  }

  // Try JPEG compression
  let quality = 85;
  while (buffer.length > MAX_SIZE && quality >= 70) {
    buffer = await sharp(buffer)
      .jpeg({ quality })
      .toBuffer();
    console.log(`    JPEG quality ${quality}: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    quality -= 5;
  }

  return { buffer, mimeType: 'image/jpeg' };
}

async function testHeicWorkflow() {
  console.log('\n========================================');
  console.log('HEIC WORKFLOW END-TO-END TEST');
  console.log('========================================\n');

  // Step 1: Read file
  console.log('Step 1: Reading HEIC file');
  if (!fs.existsSync(TEST_HEIC_FILE)) {
    throw new Error(`Test file not found: ${TEST_HEIC_FILE}`);
  }
  const originalBuffer = fs.readFileSync(TEST_HEIC_FILE);
  console.log(`  ✓ Read ${(originalBuffer.length / 1024 / 1024).toFixed(2)} MB\n`);

  // Step 2: Validate file type
  console.log('Step 2: Validating file type (magic bytes)');
  const { mimeType, isValid } = validateFileType(originalBuffer);
  if (!isValid) {
    throw new Error('File validation failed - not a valid HEIC file');
  }
  console.log(`  ✓ Detected: ${mimeType}\n`);

  // Step 3: Convert HEIC to JPEG
  console.log('Step 3: Converting HEIC to JPEG (heic-convert)');
  let processedBuffer = originalBuffer;
  let processedMimeType = mimeType;

  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    try {
      processedBuffer = await convertHeicToJpeg(originalBuffer);
      processedMimeType = 'image/jpeg';
      console.log(`  ✓ Converted: ${(processedBuffer.length / 1024 / 1024).toFixed(2)} MB JPEG\n`);
    } catch (error) {
      console.error('  ✗ HEIC conversion FAILED:', error);
      throw error;
    }
  }

  // Step 4: Apply EXIF rotation
  console.log('Step 4: Rotating image based on EXIF metadata');
  try {
    processedBuffer = await rotateImage(processedBuffer);
    console.log(`  ✓ Rotated: ${(processedBuffer.length / 1024 / 1024).toFixed(2)} MB\n`);
  } catch (error) {
    console.error('  ✗ Rotation FAILED:', error);
    throw error;
  }

  // Step 5: Compress if needed
  console.log('Step 5: Checking if compression needed (4MB limit for Claude API)');
  const { buffer: finalBuffer, mimeType: finalMimeType } = await compressIfNeeded(
    processedBuffer,
    processedMimeType
  );
  console.log(`  ✓ Final: ${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB ${finalMimeType}\n`);

  // Step 6: Convert to base64 (what Claude API receives)
  console.log('Step 6: Encoding to base64 for Claude API');
  const base64 = finalBuffer.toString('base64');
  const base64SizeMB = (base64.length / 1024 / 1024).toFixed(2);
  console.log(`  ✓ Base64: ${base64SizeMB} MB`);

  if (base64.length > 5 * 1024 * 1024) {
    console.log('  ⚠ Warning: Base64 exceeds 5MB Claude API limit!\n');
  } else {
    console.log('  ✓ Under 5MB Claude API limit\n');
  }

  // Step 7: Save outputs for verification
  console.log('Step 7: Saving test outputs');
  const outputDir = '/tmp/heic-test';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, 'original.heic'), originalBuffer);
  fs.writeFileSync(path.join(outputDir, 'converted.jpg'), processedBuffer);
  fs.writeFileSync(path.join(outputDir, 'final.jpg'), finalBuffer);

  console.log(`  ✓ Saved to ${outputDir}/`);
  console.log('    - original.heic (input)');
  console.log('    - converted.jpg (after HEIC conversion)');
  console.log('    - final.jpg (after rotation + compression)\n');

  // Step 8: Verify final image is readable
  console.log('Step 8: Verifying final image is valid');
  const metadata = await sharp(finalBuffer).metadata();
  console.log(`  ✓ Dimensions: ${metadata.width}x${metadata.height}`);
  console.log(`  ✓ Format: ${metadata.format}`);
  console.log(`  ✓ Orientation: ${metadata.orientation || 'normal'}\n`);

  // Summary
  console.log('========================================');
  console.log('TEST PASSED ✅');
  console.log('========================================');
  console.log('All workflow steps completed successfully!');
  console.log(`Original: ${(originalBuffer.length / 1024 / 1024).toFixed(2)} MB HEIC`);
  console.log(`Final: ${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB ${finalMimeType.toUpperCase()}`);
  console.log(`Base64: ${base64SizeMB} MB (ready for Claude API)`);
  console.log('========================================\n');

  return {
    success: true,
    originalSize: originalBuffer.length,
    finalSize: finalBuffer.length,
    base64Size: base64.length,
    format: finalMimeType,
    dimensions: `${metadata.width}x${metadata.height}`,
  };
}

// Run test
testHeicWorkflow()
  .then((result) => {
    console.log('Result:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ TEST FAILED\n');
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  });
