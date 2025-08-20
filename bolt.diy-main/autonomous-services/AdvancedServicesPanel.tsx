import React, { useState, useEffect } from 'react';
import { AICodeReviewAssistant } from './ai-code-review-assistant';
import { AutomatedTestingEngine } from './automated-testing-engine';
import { AutomatedDocumentationAssistant } from './automated-documentation-assistant';
import { AdvancedProjectAnalytics } from './advanced-project-analytics';

// Simple icon components as replacements
const IconCode = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>{'</>'}</div>;
const IconShield = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>🛡️</div>;
const IconTestPipe = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>🧪</div>;
const IconBook = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>📖</div>;
const IconChartBar = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>📊</div>;
const IconRefresh = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>🔄</div>;
const IconDownload = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>⬇️</div>;
const IconSettings = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>⚙️</div>;
const IconAlertTriangle = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>⚠️</div>;

interface ServiceStatus {
  codeReview: 'idle' | 'running' | 'completed' | 'error';
  testing: 'idle' | 'running' | 'completed' | 'error';
  documentation: 'idle' | 'running' | 'completed' | 'error';
  analytics: 'idle' | 'running' | 'completed' | 'error';
}

interface ServiceResults {
  codeReview?: any;
  testing?: any;
  documentation?: any;
  analytics?: any;
}

/**
 * Advanced Services Panel
 * 
 * React component that provides a comprehensive UI for accessing
 * all advanced AI-powered development services including:
 * - Code Review Assistant
 * - Automated Testing Engine  
 * - Documentation Assistant
 * - Project Analytics
 */
export function AdvancedServicesPanel() {
  const [activeTab, setActiveTab] = useState<'overview' | 'code-review' | 'testing' | 'documentation' | 'analytics'>('overview');
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    codeReview: 'idle',
    testing: 'idle', 
    documentation: 'idle',
    analytics: 'idle'
  });
  const [results, setResults] = useState<ServiceResults>({});
  const [services, setServices] = useState<{
    codeReview?: AICodeReviewAssistant;
    testing?: AutomatedTestingEngine;
    documentation?: AutomatedDocumentationAssistant;
    analytics?: AdvancedProjectAnalytics;
  }>({});

  useEffect(() => {
    // Initialize services
    setServices({
      codeReview: new AICodeReviewAssistant(),
      testing: new AutomatedTestingEngine(),
      documentation: new AutomatedDocumentationAssistant(),
      analytics: new AdvancedProjectAnalytics()
    });
  }, []);

  const runCodeReview = async () => {
    if (!services.codeReview) return;
    
    setServiceStatus(prev => ({ ...prev, codeReview: 'running' }));
    
    try {
      // Mock file analysis - in real implementation would get from workbench
      const mockCode = `
        function processData(data) {
          // TODO: Implement proper validation
          return data.map(item => item.value);
        }
      `;
      
      const result = await services.codeReview.reviewCode('mock-file.ts', mockCode);
      setResults(prev => ({ ...prev, codeReview: result }));
      setServiceStatus(prev => ({ ...prev, codeReview: 'completed' }));
    } catch (error) {
      console.error('Code review failed:', error);
      setServiceStatus(prev => ({ ...prev, codeReview: 'error' }));
    }
  };

  const runTestGeneration = async () => {
    if (!services.testing) return;
    
    setServiceStatus(prev => ({ ...prev, testing: 'running' }));
    
    try {
      const mockCode = `
        export class UserService {
          async getUser(id: string) {
            return { id, name: 'John Doe' };
          }
        }
      `;
      
      const result = await services.testing.generateTests('user.service.ts', mockCode);
      setResults(prev => ({ ...prev, testing: result }));
      setServiceStatus(prev => ({ ...prev, testing: 'completed' }));
    } catch (error) {
      console.error('Test generation failed:', error);
      setServiceStatus(prev => ({ ...prev, testing: 'error' }));
    }
  };

  const runDocumentationGeneration = async () => {
    if (!services.documentation) return;
    
    setServiceStatus(prev => ({ ...prev, documentation: 'running' }));
    
    try {
      const result = await services.documentation.generateDocumentation('/mock-project');
      setResults(prev => ({ ...prev, documentation: result }));
      setServiceStatus(prev => ({ ...prev, documentation: 'completed' }));
    } catch (error) {
      console.error('Documentation generation failed:', error);
      setServiceStatus(prev => ({ ...prev, documentation: 'error' }));
    }
  };

  const runProjectAnalysis = async () => {
    if (!services.analytics) return;
    
    setServiceStatus(prev => ({ ...prev, analytics: 'running' }));
    
    try {
      const result = await services.analytics.analyzeProject('/mock-project');
      setResults(prev => ({ ...prev, analytics: result }));
      setServiceStatus(prev => ({ ...prev, analytics: 'completed' }));
    } catch (error) {
      console.error('Project analysis failed:', error);
      setServiceStatus(prev => ({ ...prev, analytics: 'error' }));
    }
  };

  const runAllServices = async () => {
    await Promise.all([
      runCodeReview(),
      runTestGeneration(), 
      runDocumentationGeneration(),
      runProjectAnalysis()
    ]);
  };

  const getStatusIcon = (status: ServiceStatus[keyof ServiceStatus]) => {
    switch (status) {
      case 'running': return <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'completed': return <div className="w-4 h-4 bg-green-500 rounded-full" />;
      case 'error': return <IconAlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Advanced AI Services</h1>
            <p className="text-sm text-gray-600">Comprehensive development assistance powered by AI</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={runAllServices}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <IconRefresh className="w-4 h-4" />
              Run All Services
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <IconSettings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Service Status Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {getStatusIcon(serviceStatus.codeReview)}
            <span className="text-sm text-gray-600">Code Review</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(serviceStatus.testing)}
            <span className="text-sm text-gray-600">Testing</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(serviceStatus.documentation)}
            <span className="text-sm text-gray-600">Documentation</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(serviceStatus.analytics)}
            <span className="text-sm text-gray-600">Analytics</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex">
          {[
            { id: 'overview', label: 'Overview', icon: IconChartBar },
            { id: 'code-review', label: 'Code Review', icon: IconCode },
            { id: 'testing', label: 'Testing', icon: IconTestPipe },
            { id: 'documentation', label: 'Documentation', icon: IconBook },
            { id: 'analytics', label: 'Analytics', icon: IconShield }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === id 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && (
          <OverviewPanel 
            serviceStatus={serviceStatus}
            results={results}
            onRunService={(service) => {
              switch (service) {
                case 'codeReview': return runCodeReview();
                case 'testing': return runTestGeneration();
                case 'documentation': return runDocumentationGeneration();
                case 'analytics': return runProjectAnalysis();
              }
            }}
          />
        )}
        
        {activeTab === 'code-review' && (
          <CodeReviewPanel 
            status={serviceStatus.codeReview}
            results={results.codeReview}
            onRun={runCodeReview}
          />
        )}
        
        {activeTab === 'testing' && (
          <TestingPanel 
            status={serviceStatus.testing}
            results={results.testing}
            onRun={runTestGeneration}
          />
        )}
        
        {activeTab === 'documentation' && (
          <DocumentationPanel 
            status={serviceStatus.documentation}
            results={results.documentation}
            onRun={runDocumentationGeneration}
          />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsPanel 
            status={serviceStatus.analytics}
            results={results.analytics}
            onRun={runProjectAnalysis}
          />
        )}
      </div>
    </div>
  );
}

// Overview Panel Component
function OverviewPanel({ serviceStatus, results, onRunService }: {
  serviceStatus: ServiceStatus;
  results: ServiceResults;
  onRunService: (service: keyof ServiceStatus) => void;
}) {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Code Review Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <IconCode className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Code Review Assistant</h3>
                <p className="text-sm text-gray-600">AI-powered code analysis</p>
              </div>
            </div>
            <button
              onClick={() => onRunService('codeReview')}
              disabled={serviceStatus.codeReview === 'running'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {serviceStatus.codeReview === 'running' ? 'Running...' : 'Run Analysis'}
            </button>
          </div>
          
          {results.codeReview && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Issues Found:</span>
                <span className="font-medium">{results.codeReview.issues.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Security Score:</span>
                <span className="font-medium">{Math.round(results.codeReview.metrics.security * 100)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Quality Score:</span>
                <span className="font-medium">{Math.round(results.codeReview.metrics.maintainability * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Testing Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <IconTestPipe className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Automated Testing</h3>
                <p className="text-sm text-gray-600">Generate comprehensive tests</p>
              </div>
            </div>
            <button
              onClick={() => onRunService('testing')}
              disabled={serviceStatus.testing === 'running'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {serviceStatus.testing === 'running' ? 'Running...' : 'Generate Tests'}
            </button>
          </div>
          
          {results.testing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Test Cases:</span>
                <span className="font-medium">{results.testing.testCases.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Framework:</span>
                <span className="font-medium">{results.testing.framework}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Coverage Target:</span>
                <span className="font-medium">{Math.round(results.testing.coverage.expected * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Documentation Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <IconBook className="w-8 h-8 text-purple-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Documentation Assistant</h3>
                <p className="text-sm text-gray-600">Auto-generate documentation</p>
              </div>
            </div>
            <button
              onClick={() => onRunService('documentation')}
              disabled={serviceStatus.documentation === 'running'}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {serviceStatus.documentation === 'running' ? 'Running...' : 'Generate Docs'}
            </button>
          </div>
          
          {results.documentation && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>API Items:</span>
                <span className="font-medium">{results.documentation.apiDocs.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Quality Score:</span>
                <span className="font-medium">{Math.round(results.documentation.quality.overall * 100)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Coverage:</span>
                <span className="font-medium">{Math.round(results.documentation.metrics.coverage * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Analytics Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <IconShield className="w-8 h-8 text-orange-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Project Analytics</h3>
                <p className="text-sm text-gray-600">Comprehensive project health</p>
              </div>
            </div>
            <button
              onClick={() => onRunService('analytics')}
              disabled={serviceStatus.analytics === 'running'}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {serviceStatus.analytics === 'running' ? 'Running...' : 'Analyze Project'}
            </button>
          </div>
          
          {results.analytics && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Health Score:</span>
                <span className="font-medium">{Math.round(results.analytics.health.overall * 100)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Critical Issues:</span>
                <span className="font-medium">{results.analytics.technicalDebt.filter((item: any) => item.severity === 'critical').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Security Score:</span>
                <span className="font-medium">{Math.round(results.analytics.metrics.security.securityScore * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Individual Panel Components
function CodeReviewPanel({ status, results, onRun }: {
  status: ServiceStatus['codeReview'];
  results?: any;
  onRun: () => void;
}) {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Code Review Results</h2>
            <button
              onClick={onRun}
              disabled={status === 'running'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {status === 'running' ? 'Analyzing...' : 'Run Review'}
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {status === 'running' && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600">Analyzing code...</span>
            </div>
          )}
          
          {results && status === 'completed' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{results.issues.length}</div>
                  <div className="text-sm text-gray-600">Issues Found</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{Math.round(results.metrics.security * 100)}%</div>
                  <div className="text-sm text-gray-600">Security Score</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{Math.round(results.metrics.performance * 100)}%</div>
                  <div className="text-sm text-gray-600">Performance</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{results.metrics.complexity}</div>
                  <div className="text-sm text-gray-600">Complexity</div>
                </div>
              </div>

              {/* Issues List */}
              {results.issues.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Issues Found</h3>
                  <div className="space-y-3">
                    {results.issues.slice(0, 10).map((issue: any, index: number) => (
                      <div key={index} className={`p-4 rounded-lg border-l-4 ${
                        issue.severity === 'critical' ? 'bg-red-50 border-red-400' :
                        issue.severity === 'high' ? 'bg-orange-50 border-orange-400' :
                        issue.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{issue.message}</h4>
                            <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                            <p className="text-sm text-gray-500 mt-2">Line {issue.line} • {issue.type}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            issue.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {issue.severity}
                          </span>
                        </div>
                        {issue.suggestion && (
                          <div className="mt-3 p-3 bg-white rounded border">
                            <p className="text-sm text-gray-700"><strong>Suggestion:</strong> {issue.suggestion}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {results.suggestions && results.suggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
                  <ul className="space-y-2">
                    {results.suggestions.map((suggestion: string, index: number) => (
                      <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <IconAlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <span className="text-sm text-gray-700">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TestingPanel({ status, results, onRun }: {
  status: ServiceStatus['testing'];
  results?: any;
  onRun: () => void;
}) {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Test Generation</h2>
            <button
              onClick={onRun}
              disabled={status === 'running'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {status === 'running' ? 'Generating...' : 'Generate Tests'}
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {status === 'running' && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600">Generating tests...</span>
            </div>
          )}
          
          {results && status === 'completed' && (
            <div className="space-y-6">
              {/* Test Suite Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{results.testCases.length}</div>
                  <div className="text-sm text-gray-600">Test Cases</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{results.framework}</div>
                  <div className="text-sm text-gray-600">Framework</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{Math.round(results.coverage.expected * 100)}%</div>
                  <div className="text-sm text-gray-600">Target Coverage</div>
                </div>
              </div>

              {/* Generated Tests */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Generated Test Cases</h3>
                <div className="space-y-3">
                  {results.testCases.slice(0, 5).map((testCase: any, index: number) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">{testCase.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{testCase.description}</p>
                      
                      {testCase.test && (
                        <div className="mt-3">
                          <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                            <code>{testCase.test}</code>
                          </pre>
                        </div>
                      )}
                      
                      {testCase.assertions && testCase.assertions.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium text-gray-700">Assertions:</div>
                          <ul className="mt-1 text-sm text-gray-600">
                            {testCase.assertions.map((assertion: string, idx: number) => (
                              <li key={idx} className="ml-4">• {assertion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentationPanel({ status, results, onRun }: {
  status: ServiceStatus['documentation'];
  results?: any;
  onRun: () => void;
}) {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Documentation Generation</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={onRun}
                disabled={status === 'running'}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {status === 'running' ? 'Generating...' : 'Generate Docs'}
              </button>
              {results && (
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <IconDownload className="w-4 h-4" />
                  Export
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {status === 'running' && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600">Generating documentation...</span>
            </div>
          )}
          
          {results && status === 'completed' && (
            <div className="space-y-6">
              {/* Documentation Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{results.apiDocs.length}</div>
                  <div className="text-sm text-gray-600">API Items</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{Math.round(results.quality.overall * 100)}%</div>
                  <div className="text-sm text-gray-600">Quality Score</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{Math.round(results.metrics.coverage * 100)}%</div>
                  <div className="text-sm text-gray-600">Coverage</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{results.sections.length}</div>
                  <div className="text-sm text-gray-600">Sections</div>
                </div>
              </div>

              {/* Documentation Sections */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Generated Sections</h3>
                <div className="space-y-3">
                  {results.sections.map((section: any, index: number) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{section.title}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          section.type === 'api' ? 'bg-blue-100 text-blue-800' :
                          section.type === 'examples' ? 'bg-green-100 text-green-800' :
                          section.type === 'overview' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {section.type}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Quality: {Math.round(section.quality * 100)}% • 
                        Last updated: {new Date(section.lastUpdated).toLocaleDateString()}
                      </div>
                      <div className="mt-3 max-h-32 overflow-y-auto">
                        <pre className="text-xs bg-white p-3 rounded border whitespace-pre-wrap">
                          {section.content.substring(0, 500)}
                          {section.content.length > 500 && '...'}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* API Documentation */}
              {results.apiDocs.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">API Documentation</h3>
                  <div className="space-y-3">
                    {results.apiDocs.slice(0, 5).map((api: any, index: number) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{api.name}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            api.type === 'class' ? 'bg-blue-100 text-blue-800' :
                            api.type === 'function' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {api.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{api.description}</p>
                        
                        {api.parameters && api.parameters.length > 0 && (
                          <div className="mb-3">
                            <div className="text-sm font-medium text-gray-700 mb-1">Parameters:</div>
                            <div className="space-y-1">
                              {api.parameters.map((param: any, idx: number) => (
                                <div key={idx} className="text-xs text-gray-600 ml-4">
                                  • <code>{param.name}</code> ({param.type}
                                  {param.optional && ', optional'}) - {param.description}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {api.examples && api.examples.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">Example:</div>
                            <pre className="text-xs bg-gray-50 p-2 rounded border overflow-x-auto">
                              <code>{api.examples[0].substring(0, 200)}
                                {api.examples[0].length > 200 && '...'}
                              </code>
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsPanel({ status, results, onRun }: {
  status: ServiceStatus['analytics'];
  results?: any;
  onRun: () => void;
}) {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Project Analytics</h2>
            <button
              onClick={onRun}
              disabled={status === 'running'}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {status === 'running' ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {status === 'running' && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600">Analyzing project...</span>
            </div>
          )}
          
          {results && status === 'completed' && (
            <div className="space-y-6">
              {/* Health Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{Math.round(results.health.overall * 100)}%</div>
                  <div className="text-sm text-gray-600">Health Score</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{results.technicalDebt.filter((item: any) => item.severity === 'critical').length}</div>
                  <div className="text-sm text-gray-600">Critical Issues</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{Math.round(results.metrics.security.securityScore * 100)}%</div>
                  <div className="text-sm text-gray-600">Security Score</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{Math.round(results.metrics.testing.coverage * 100)}%</div>
                  <div className="text-sm text-gray-600">Test Coverage</div>
                </div>
              </div>

              {/* Technical Debt */}
              {results.technicalDebt.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Debt</h3>
                  <div className="space-y-3">
                    {results.technicalDebt.slice(0, 8).map((item: any, index: number) => (
                      <div key={index} className={`p-4 rounded-lg border-l-4 ${
                        item.severity === 'critical' ? 'bg-red-50 border-red-400' :
                        item.severity === 'high' ? 'bg-orange-50 border-orange-400' :
                        item.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.description}</h4>
                            <p className="text-sm text-gray-600 mt-1">{item.file}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span>Effort: {item.effort}h</span>
                              <span>Impact: {item.impact}/10</span>
                              <span>{item.type.replace('_', ' ')}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            item.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            item.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            item.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {item.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {results.health.recommendations && results.health.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
                  <div className="space-y-3">
                    {results.health.recommendations.map((rec: any, index: number) => (
                      <div key={index} className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{rec.title}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span><strong>Impact:</strong> {rec.impact}</span>
                          <span><strong>Effort:</strong> {rec.effort}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
