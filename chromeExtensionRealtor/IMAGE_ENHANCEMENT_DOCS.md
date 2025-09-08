# Image Quality Enhancement for Chrome Extension

## Overview

We've implemented an intelligent image quality enhancement system for the Realtor.com Chrome extension that automatically upgrades low-resolution images to higher quality versions while preserving all original formatting.

## Features

### 🖼️ Smart Image Enhancement
- **Profile Photos**: Automatically upgraded to 768px width/height (optimal for profile pictures)
- **Property Photos**: Automatically upgraded to 1024px width/height (optimal for property listings)
- **Realtor Profile Pictures**: Special handling for 260x260 → 768x768 conversion
- **Preserves Original Format**: Maintains file extension (.webp, .jpg, .png) and parameters (_r7, etc.)
- **Conservative Approach**: Only upgrades if current resolution is lower than target

### 🎯 Target Resolutions
- **Profile Images**: 768px width/height (optimized for realtor profile pictures)
- **Property Images**: 1024px width/height (high quality for property showcases)

## Implementation

### Core Method: `enhanceImageQuality(url, isProfile = false)`

```javascript
// Example transformations:
// Realtor Profile: https://ap.rdcpix.com/.../image-c0rd-w260_h260.webp
//               → https://ap.rdcpix.com/.../image-c0rd-w768_h768.webp

// Profile: https://p.rdcpix.com/v01/ga0471500-c0rd-w144_r7.webp
//       → https://p.rdcpix.com/v01/ga0471500-c0rd-w768_r7.webp

// Property: https://ap.rdcpix.com/.../image-e0rd-w144_r7.webp  
//        → https://ap.rdcpix.com/.../image-e0rd-w1024_r7.webp
```

### Key Benefits
1. **Width+Height Format Support**: Handles both `-w260_h260` and `-w260` patterns
2. **Special 260x260 Handling**: Automatically converts realtor profile pictures to 768x768
3. **Format Preservation**: Keeps original .webp/.jpg extensions
4. **Parameter Retention**: Maintains _r7 rounding and other Akamai parameters
5. **Intelligent Upgrading**: Only enhances images that need it
6. **Fallback Support**: Gracefully handles non-rdcpix URLs

## Usage in Extension

The enhancement is automatically applied to:
- Agent profile photos during data extraction
- Property listing images
- Additional property photos
- All image arrays processed by the extension

## Testing

Run the test suite to verify functionality:
```bash
node test-image-enhancement.js
```

### Test Coverage
- ✅ Profile image enhancement (144px → 768px)
- ✅ Property image enhancement (144px → 1024px)  
- ✅ Realtor profile picture enhancement (260x260 → 768x768)
- ✅ Width+height format support (-w260_h260)
- ✅ Width-only format support (-w260)
- ✅ Non-rdcpix URL preservation
- ✅ High-resolution image preservation (no downgrade)

## Technical Details

### URL Pattern Recognition
- Detects rdcpix.com URLs (Realtor.com's CDN)
- Uses regex pattern: `/-w(\d+)/i` to find width parameters
- Simple replacement preserves all other URL components

### Error Handling
- Graceful fallback to original URL on any error
- Console logging for debugging
- No disruption to data extraction process

## Integration Points

The enhancement is integrated at multiple points in the extraction pipeline:

1. **Agent Data Processing** (`prepareAgentData`)
2. **Property Data Processing** (`preparePropertyData`) 
3. **Image Normalization** (`normalizeImageUrl`)
4. **Direct Image Extraction** (profile photo methods)

This ensures all images are consistently enhanced regardless of extraction path.
