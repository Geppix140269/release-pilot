#!/bin/bash

# Build and publish ReleasePilot Azure DevOps Extension
# Usage: ./build-and-publish.sh [publish]

echo "🚀 Building ReleasePilot Azure DevOps Extension..."

# Navigate to task directory
cd ReleasePilotTask/v1

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run build

# Go back to extension root
cd ../..

# Create extension package
echo "📦 Creating extension package..."
tfx extension create --manifest-globs vss-extension.json

echo "✅ Extension package created successfully!"

# Publish if requested
if [ "$1" == "publish" ]; then
    echo "📤 Publishing to Azure DevOps Marketplace..."
    tfx extension publish --manifest-globs vss-extension.json --share-with YOUR_ORGANIZATION
    echo "✅ Extension published successfully!"
else
    echo "💡 To publish, run: ./build-and-publish.sh publish"
fi

echo "🎉 Done!"