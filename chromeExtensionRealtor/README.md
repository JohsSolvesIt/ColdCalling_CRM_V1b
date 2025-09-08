# Realtor Data Extractor Chrome Extension

A powerful Chrome extension that extracts comprehensive data from Realtor.com agent and property pages.

## Features

### 🏠 Comprehensive Data Extraction
- **Agent Information**: Name, photo, bio, years of experience, license number, languages
- **Contact Details**: Phone, email, website
- **Office Information**: Brokerage name, address, phone
- **Reviews & Ratings**: Overall ratings, individual reviews with text and ratings
- **Recommendations**: Up to 10 client recommendations with author and text
- **Listings**: Active and sold listings with property details
- **Specializations**: Areas of expertise and specialties
- **Credentials**: Certifications and professional designations
- **Social Media**: Facebook, LinkedIn, Twitter, Instagram profiles
- **Performance Data**: Sales volume, average sale price, days on market

### 📊 Export Options
- **JSON Format**: Complete structured data
- **CSV Format**: Flattened data for spreadsheet analysis
- **Copy to Clipboard**: Quick access to extracted data
- **Download Files**: Save data locally for further analysis

### 🎯 User-Friendly Interface
- **Floating Extract Button**: One-click extraction directly on the page
- **Popup Interface**: Full control panel with status and options
- **Data Preview**: View extracted data before export
- **Real-time Status**: Live feedback during extraction process

### ⚙️ Advanced Features
- **Auto-extraction**: Automatically extract data when visiting Realtor.com pages
- **Context Menu**: Right-click to extract data
- **Data Persistence**: Save extraction history
- **Notifications**: Get notified when extraction is complete
- **Responsive Design**: Works on all screen sizes

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your Chrome toolbar

## Usage

### Method 1: Floating Button
1. Visit any Realtor.com page (agent profile, property listing, etc.)
2. Look for the red "📊 Extract Data" button in the top-right corner
3. Click the button to extract and view data
4. Use the modal to copy, download, or view the extracted data

### Method 2: Extension Popup
1. Click the extension icon in your Chrome toolbar
2. Click "Extract Data" button
3. Use the popup controls to copy or download data

### Method 3: Right-Click Context Menu
1. Right-click anywhere on a Realtor.com page
2. Select "Extract Realtor Data" from the context menu

### Method 4: Auto-Extraction (Optional)
- Enable "Auto-extract on page load" in the popup settings
- Data will be automatically extracted when you visit Realtor.com pages

## Enhanced Recommendation Extraction

The extension now includes powerful recommendation extraction capabilities:

### 🎯 Key Features
- **Text-Only Extraction**: Extracts only the recommendation text and author name
- **Maximum 10 Recommendations**: Limits extraction to the most relevant recommendations
- **Multiple Detection Methods**: Uses various techniques to find recommendations across different page layouts
- **Universal Compatibility**: Works on any website, not just Realtor.com
- **Duplicate Prevention**: Automatically filters out duplicate recommendations
- **Content Validation**: Ensures extracted text is actually a recommendation

### 📝 Extraction Methods
1. **Structured Selectors**: Looks for common CSS classes and data attributes
2. **Text Pattern Recognition**: Uses regex patterns to find author-text combinations
3. **Generic Page Analysis**: Analyzes any webpage for testimonial/recommendation sections
4. **Context-Aware Extraction**: Considers surrounding elements for better accuracy

### 🔍 Supported Patterns
- "John Smith - 2 years ago: Great service and very professional!"
- "Amazing experience working with this agent. - Sarah Johnson"
- "Mike Wilson says: Outstanding results and excellent communication."
- Testimonial: "Highly recommend this professional" - Carol White

### 📊 Data Format
Each recommendation includes:
- **Text**: The actual recommendation content
- **Author**: Name of the person giving the recommendation
- **Date**: When the recommendation was given (if available)
- **Source**: How the recommendation was found (structured/text_pattern/generic_page)

## Data Structure

The extension extracts data in the following structure:

```json
{
  "url": "https://www.realtor.com/realestateagents/...",
  "extractedAt": "2025-01-01T12:00:00.000Z",
  "pageType": "agent",
  "agent": {
    "name": "Agent Name",
    "photo": "https://...",
    "bio": "Agent biography...",
    "experience": "10 years",
    "license": "License #12345",
    "languages": "English, Spanish"
  },
  "office": {
    "name": "Brokerage Name",
    "address": "123 Main St, City, State",
    "phone": "(555) 123-4567"
  },
  "contact": {
    "phone": "(555) 123-4567",
    "email": "agent@email.com",
    "website": "https://agentwebsite.com"
  },
  "reviews": {
    "overall": {
      "rating": "4.8",
      "count": "25 reviews"
    },
    "individual": [
      {
        "rating": "5",
        "text": "Great agent...",
        "author": "John D.",
        "date": "2024-12-15",
        "verified": true
      }
    ],
    "recommendations": [
      {
        "id": 1,
        "text": "Outstanding service! Helped us find our dream home.",
        "author": "Sarah Johnson",
        "date": "March 2024",
        "source": "structured"
      }
    ]
  },
  "listings": {
    "totalActive": 15,
    "totalSold": 45,
    "active": [...],
    "sold": [...]
  },
  "specializations": ["First Time Buyers", "Luxury Homes"],
  "credentials": ["CRS", "ABR"],
  "socialMedia": {
    "facebook": "https://facebook.com/...",
    "linkedin": "https://linkedin.com/..."
  },
  "performance": {
    "salesVolume": "$5.2M",
    "avgSalePrice": "$425K",
    "avgDaysOnMarket": "18 days"
  }
}
```

## Supported Pages

- Agent profile pages (`/realestateagents/...`)
- Property listing pages (`/realestateandhomes-detail/...`)
- Search results pages (`/realestateandhomes-search/...`)

## Privacy & Legal

- This extension only extracts publicly available data from Realtor.com
- No personal data is collected or transmitted to external servers
- All data is processed locally in your browser
- Extracted data is stored locally on your device
- Please respect Realtor.com's terms of service and robots.txt
- Use extracted data responsibly and in compliance with applicable laws

## Technical Details

### Files Structure
```
chromeExtensionRealtor/
├── manifest.json          # Extension configuration
├── content.js            # Main extraction logic
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
├── background.js        # Background service worker
├── styles.css           # Styling for modals and UI
├── icons/              # Extension icons
└── README.md           # This file
```

### Permissions
- `activeTab`: Access to the current tab for data extraction
- `storage`: Save settings and extraction history
- `downloads`: Download extracted data files

## Troubleshooting

### Common Issues

1. **Extension button not appearing**
   - Make sure you're on a Realtor.com page
   - Refresh the page after installing the extension
   - Check if the extension is enabled in Chrome

2. **No data extracted**
   - Realtor.com may have updated their page structure
   - Try refreshing the page and extracting again
   - Some pages may have different layouts

3. **Download not working**
   - Check if your browser blocks downloads
   - Try copying the data instead
   - Ensure you have write permissions in your download folder

### Error Messages
- "Please navigate to a Realtor.com page": You're not on a supported Realtor.com page
- "Error extracting data": The page structure may have changed or the page hasn't fully loaded

## Development

To modify or extend the extension:

1. Edit the relevant files
2. Reload the extension in `chrome://extensions/`
3. Test on various Realtor.com pages

### Key Components
- `content.js`: Contains all extraction logic with CSS selectors
- `popup.js`: Manages the extension popup interface
- `background.js`: Handles auto-extraction and context menus
- `manifest.json`: Extension permissions and configuration

## Support

If you encounter issues or have suggestions:
1. Check the troubleshooting section above
2. Verify you're using the latest version of Chrome
3. Test on different Realtor.com pages
4. Check the browser console for error messages

## License

This project is for educational and personal use only. Please respect Realtor.com's terms of service and use responsibly.
