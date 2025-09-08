// MINIMAL CONTENT SCRIPT TEST
console.log("🔴 MINIMAL CONTENT SCRIPT LOADED");
console.log("🔴 Current URL:", window.location.href);
console.log("🔴 Page Title:", document.title);

// Set a simple test object
window.EXTENSION_TEST = {
    loaded: true,
    timestamp: new Date().toISOString()
};

console.log("🔴 Test object set:", window.EXTENSION_TEST);
