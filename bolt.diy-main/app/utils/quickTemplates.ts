export const QUICK_TEMPLATES = {
  'react-component': {
    name: 'React Component',
    description: 'Create a new React functional component',
    template: (componentName: string) => `import React from 'react';

interface ${componentName}Props {
  // Add your props here
}

export const ${componentName}: React.FC<${componentName}Props> = (props) => {
  return (
    <div>
      <h1>${componentName}</h1>
      {/* Component content */}
    </div>
  );
};

export default ${componentName};`
  },
  
  'typescript-function': {
    name: 'TypeScript Function',
    description: 'Create a typed utility function',
    template: (functionName: string) => `/**
 * ${functionName} - Add description here
 * @param param - Add parameter description
 * @returns Return value description
 */
export function ${functionName}(param: any): any {
  // Implementation here
  return param;
}

export default ${functionName};`
  },
  
  'api-route': {
    name: 'API Route',
    description: 'Create a new API endpoint',
    template: (routeName: string) => `import { json } from '@remix-run/node';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ request, params }: LoaderFunctionArgs) {
  // Handle GET requests
  return json({ message: '${routeName} GET endpoint' });
}

export async function action({ request, params }: ActionFunctionArgs) {
  // Handle POST, PUT, DELETE requests
  const formData = await request.formData();
  
  return json({ message: '${routeName} action completed' });
}`
  },
  
  'css-module': {
    name: 'CSS Module',
    description: 'Create a CSS module file',
    template: (moduleName: string) => `.${moduleName.toLowerCase()} {
  /* Base styles */
}

.${moduleName.toLowerCase()}__container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.${moduleName.toLowerCase()}__header {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-color);
}

.${moduleName.toLowerCase()}__content {
  flex: 1;
}

.${moduleName.toLowerCase()}__footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}`
  },
  
  'test-file': {
    name: 'Test File',
    description: 'Create a test file with basic structure',
    template: (testName: string) => `import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// import { render, screen, fireEvent } from '@testing-library/react';
// import { ${testName} } from './${testName}';

describe('${testName}', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should render correctly', () => {
    // Test implementation
    expect(true).toBe(true);
  });

  it('should handle user interactions', () => {
    // Test user interactions
    expect(true).toBe(true);
  });

  it('should handle edge cases', () => {
    // Test edge cases
    expect(true).toBe(true);
  });
});`
  }
};

export function getTemplateList(): Array<{ key: string; name: string; description: string }> {
  return Object.entries(QUICK_TEMPLATES).map(([key, template]) => ({
    key,
    name: template.name,
    description: template.description
  }));
}

export function generateTemplate(templateKey: string, name: string): string | null {
  const template = QUICK_TEMPLATES[templateKey as keyof typeof QUICK_TEMPLATES];
  if (!template) {
    return null;
  }
  
  return template.template(name);
}

export function detectTemplateFromMessage(message: string): { templateKey: string; name: string } | null {
  const lowerMessage = message.toLowerCase();
  
  // React component patterns
  if (lowerMessage.includes('create a component') || lowerMessage.includes('new react component')) {
    const match = message.match(/component\s+(?:called\s+)?([a-zA-Z][a-zA-Z0-9]*)/i);
    if (match) {
      return { templateKey: 'react-component', name: match[1] };
    }
  }
  
  // Function patterns
  if (lowerMessage.includes('create a function') || lowerMessage.includes('new function')) {
    const match = message.match(/function\s+(?:called\s+)?([a-zA-Z][a-zA-Z0-9]*)/i);
    if (match) {
      return { templateKey: 'typescript-function', name: match[1] };
    }
  }
  
  // API route patterns
  if (lowerMessage.includes('api route') || lowerMessage.includes('api endpoint')) {
    const match = message.match(/(?:route|endpoint)\s+(?:called\s+)?([a-zA-Z][a-zA-Z0-9]*)/i);
    if (match) {
      return { templateKey: 'api-route', name: match[1] };
    }
  }
  
  // CSS module patterns
  if (lowerMessage.includes('css module') || lowerMessage.includes('stylesheet')) {
    const match = message.match(/(?:module|stylesheet)\s+(?:for\s+)?([a-zA-Z][a-zA-Z0-9]*)/i);
    if (match) {
      return { templateKey: 'css-module', name: match[1] };
    }
  }
  
  // Test file patterns
  if (lowerMessage.includes('test file') || lowerMessage.includes('unit test')) {
    const match = message.match(/test\s+(?:file\s+)?(?:for\s+)?([a-zA-Z][a-zA-Z0-9]*)/i);
    if (match) {
      return { templateKey: 'test-file', name: match[1] };
    }
  }
  
  return null;
}
