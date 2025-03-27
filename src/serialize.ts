export default function objToString(obj) {
  // Start with class declaration
  let str = 'class GeneratedClass {\n';

  for (const [p, val] of Object.entries(obj)) {
    if (typeof val === 'function') {
      // Get the full function text
      const funcText = val.toString();

      // Format as a class method
      let methodText;

      // Handle different function types (arrow, regular, or method shorthand)
      if (funcText.startsWith('function')) {
        // Regular function - convert to method syntax
        methodText = funcText
          .replace(/^function\s*\(/, `${p}(`)
          .replace(/\)\s*{/, ') {');
      } else if (funcText.includes('=>')) {
        // Arrow function - convert to method syntax
        const arrowParts = funcText.split('=>');
        const params = arrowParts[0].trim().replace(/^\(|\)$/g, '');
        const body = arrowParts[1].trim().replace(/^{\s*|\s*}$/g, '');
        methodText = `${p}(${params}) {\n    return ${body};\n  }`;
      } else {
        // Method shorthand or already in class method form
        methodText = funcText;
        // Ensure it has the proper name
        if (!methodText.startsWith(p)) {
          methodText = `${p}${methodText.substring(methodText.indexOf('('))}`;
        }
      }

      // Add the method to the class
      str += `  ${methodText}\n\n`;
    } else if (typeof val === 'object' && val !== null) {
      // For objects, create a property with the stringified object
      str += `  ${p} = ${JSON.stringify(val, null, 2)};\n\n`;
    } else if (typeof val === 'string') {
      // For strings, add quotes
      str += `  ${p} = "${val.replace(/"/g, '\\"')}";\n\n`;
    } else {
      // For other primitives
      str += `  ${p} = ${val};\n\n`;
    }
  }

  // Complete the class and export an instance
  str += '}\n\n// Export an instance\nconst instance = new GeneratedClass();\nexport default instance;';
  return str;
}