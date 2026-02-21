const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName.includes('expo-router/assets/unmatched.png')) {
        return {
            filePath: path.resolve(__dirname, 'assets/adaptive-icon.png'),
            type: 'sourceFile',
        };
    }
    if (moduleName.includes('expo-router/assets/error.png')) {
        return {
            filePath: path.resolve(__dirname, 'assets/adaptive-icon.png'),
            type: 'sourceFile',
        };
    }
    // Let Metro handle other requests
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
