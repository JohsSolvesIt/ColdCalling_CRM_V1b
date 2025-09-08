#!/bin/bash

echo "🚀 Setting up CSV-to-CRM Local Database Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm found"

# Install dependencies
echo "📦 Installing server dependencies..."
npm install

echo "📦 Installing client dependencies..."
cd client && npm install && cd ..

echo "🏗️  Building client application..."
cd client && npm run build && cd ..

echo "📁 Creating necessary directories..."
mkdir -p databases uploads

echo "✅ Setup complete!"
echo ""
echo "🎉 To start the application:"
echo "   npm start"
echo ""
echo "🌐 Then open your browser to: http://localhost:5000"
echo ""
echo "📝 For development (with auto-reload):"
echo "   npm run dev"
