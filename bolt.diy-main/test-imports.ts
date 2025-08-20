import type { ToolCapability } from '~/types/tool-integration-types';
import { AVAILABLE_TOOLS } from '~/types/tool-integration-types';

console.log('Tools loaded:', AVAILABLE_TOOLS.length);
console.log('Tool capability interface available:', typeof ToolCapability);
