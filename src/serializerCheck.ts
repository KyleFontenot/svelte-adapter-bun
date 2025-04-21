function scanObjectForIssues(obj, path = '', results = [], visited = new WeakSet()) {
  // Handle null, undefined, or primitive values
  if (obj === null || obj === undefined || typeof obj !== 'object' && typeof obj !== 'function') {
    return results;
  }

  // Avoid circular references
  if (visited.has(obj)) {
    return results;
  }
  visited.add(obj);

  // Get all properties including non-enumerable ones
  const allProps = Object.getOwnPropertyNames(obj);

  // Add symbol properties if they exist
  try {
    const symbols = Object.getOwnPropertySymbols(obj);
    allProps.push(...symbols.map(s => Symbol.keyFor(s) || s.toString()));
  } catch (e) {
    // Some objects might not support getOwnPropertySymbols
    results.push({
      path: path,
      issue: 'Cannot get symbols',
      error: e.message
    });
  }

  // Check each property
  for (const prop of allProps) {
    const propName = String(prop);
    const currentPath = path ? `${path}.${propName}` : propName;

    try {
      const descriptor = Object.getOwnPropertyDescriptor(obj, prop);

      if (!descriptor) {
        continue; // Skip if no descriptor found
      }

      const issues = [];

      // Check property characteristics
      if (descriptor.writable === false) {
        issues.push('read-only');
      }

      if (descriptor.configurable === false) {
        issues.push('non-configurable');
      }

      if (descriptor.get && !descriptor.set) {
        issues.push('getter-only');
      }

      // Record issues if any were found
      if (issues.length > 0) {
        const value = obj[prop];
        let valueType = typeof value;
        let valuePreview = valueType === 'function' ? 'function()' :
          value === null ? 'null' :
            valueType === 'object' ? (Array.isArray(value) ? '[]' : '{}') :
              String(value);

        results.push({
          path: currentPath,
          type: valueType,
          preview: valuePreview,
          issues,
          descriptor: {
            writable: descriptor.writable,
            configurable: descriptor.configurable,
            enumerable: descriptor.enumerable,
            hasGetter: !!descriptor.get,
            hasSetter: !!descriptor.set
          }
        });
      }

      // Check the value itself
      const value = Object.prototype.hasOwnProperty.call(obj, prop) ? obj[prop] : undefined;

      // Recursively check functions and objects
      if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
        scanObjectForIssues(value, currentPath, results, visited);
      }

    } catch (error) {
      // If accessing a property throws an error, log it
      results.push({
        path: currentPath,
        issue: 'access error',
        error: error.message
      });
    }
  }

  // For arrays, also check numeric indices
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const currentPath = path ? `${path}[${i}]` : `[${i}]`;
      if (obj[i] !== null && typeof obj[i] === 'object') {
        scanObjectForIssues(obj[i], currentPath, results, visited);
      }
    }
  }

  return results;
}

/**
 * Create a clean copy of an object, avoiding problematic properties
 */
function createCleanCopy(obj, problematicPaths) {
  const pathSet = new Set(problematicPaths.map(p => p.path));

  function copy(source, sourcePath = '') {
    // Handle primitives
    if (source === null || source === undefined ||
      typeof source !== 'object' && typeof source !== 'function') {
      return source;
    }

    // Handle arrays
    if (Array.isArray(source)) {
      return source.map((item, index) => {
        const itemPath = sourcePath ? `${sourcePath}[${index}]` : `[${index}]`;
        return copy(item, itemPath);
      });
    }

    // Handle functions
    if (typeof source === 'function') {
      try {
        // Create a new function with the same code
        return new Function('return ' + source.toString())();
      } catch (e) {
        console.warn('Could not copy function:', e);
        return function () { console.warn('Placeholder for function that could not be copied'); };
      }
    }

    // Handle objects
    const result = {};

    for (const key of Object.keys(source)) {
      const currentPath = sourcePath ? `${sourcePath}.${key}` : key;

      // Skip problematic properties
      if (pathSet.has(currentPath)) {
        console.log(`Skipping problematic property: ${currentPath}`);
        continue;
      }

      try {
        // Handle methods/functions
        if (typeof source[key] === 'function') {
          result[key] = new Function('return ' + source[key].toString())();
        }
        // Handle nested objects
        else if (source[key] !== null && typeof source[key] === 'object') {
          result[key] = copy(source[key], currentPath);
        }
        // Handle primitives
        else {
          result[key] = source[key];
        }
      } catch (e) {
        console.warn(`Error copying property ${currentPath}:`, e);
      }
    }

    return result;
  }

  return copy(obj);
}

// Usage example
async function fixObjectForSerialization(objectToSerialize: Record<string | number | symbol, unknown>) {
  // Because bun sometimes has problem with some properties when using bun:jsc.serialize() such as read-onlly properties, this function creates a clean copy.
  const issues = scanObjectForIssues(objectToSerialize);
  if (issues.length === 0) {
    return objectToSerialize;
  }
  const cleanCopy = createCleanCopy(objectToSerialize, issues);
  return cleanCopy;
}

export default fixObjectForSerialization
