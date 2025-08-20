import React, { useState, useEffect } from 'react';

// Use simple icon components instead of @tabler/icons-react
const IconDeviceAnalytics = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>📊</div>;
const IconShield = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>🛡️</div>;
const IconFileText = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>📄</div>;
const IconTestPipe = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>🧪</div>;
const IconBug = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>🐛</div>;
const IconRocket = ({ className }: { className?: string }) => <div className={`${className} text-center font-bold`}>🚀</div>;

// Import our new services (we'll create lightweight versions)
import AICodeReviewAssistant from '~/autonomous-services/ai-code-review-assistant';
import AutomatedTestingEngine from '~/autonomous-services/automated-testing-engine';
import AutomatedDocumentationAssistant from '~/autonomous-services/automated-documentation-assistant';
import AdvancedProjectAnalytics from '~/autonomous-services/advanced-project-analytics';
import { workbenchStore } from '~/lib/stores/workbench';

interface AdvancedServicesData {
  codeReview: any;
  testing: any;
  documentation: any;
  analytics: any;
}

interface ServiceStatus {
  name: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  progress: number;
  lastRun?: string;
}

export function AdvancedServicesPanel() {
  // Fix workbenchStore usage
  const { files } = workbenchStore;
  const [activeTab, setActiveTab] = useState<'dashboard' | 'review' | 'testing' | 'docs' | 'analytics'>('dashboard');
  const [servicesData, setServicesData] = useState<AdvancedServicesData>({
    codeReview: null,
    testing: null,
    documentation: null,
    analytics: null
  });
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([
    { name: 'Code Review', status: 'idle', progress: 0 },
    { name: 'Testing Engine', status: 'idle', progress: 0 },
    { name: 'Documentation', status: 'idle', progress: 0 },
    { name: 'Analytics', status: 'idle', progress: 0 }
  ]);

  // Initialize services
  const [services, setServices] = useState<{
    codeReview?: AICodeReviewAssistant;
    testing?: AutomatedTestingEngine;
    documentation?: AutomatedDocumentationAssistant;
    analytics?: AdvancedProjectAnalytics;
  }>({});

  useEffect(() => {
    const webContainer = workbenchStore.webContainer;
    if (webContainer) {
      setServices({
        codeReview: new AICodeReviewAssistant(webContainer),
        testing: new AutomatedTestingEngine(webContainer),
        documentation: new AutomatedDocumentationAssistant(webContainer),
        analytics: new AdvancedProjectAnalytics(webContainer)
      });
    }
  }, [workbenchStore.webContainer]);

  const runCodeReview = async (filePath?: string) => {
    if (!services.codeReview) return;

    updateServiceStatus('Code Review', 'running', 20);
    
    try {
      const targetFile = filePath || getCurrentFile();
      if (!targetFile) return;

      updateServiceStatus('Code Review', 'running', 60);
      
      const result = await services.codeReview.reviewCode(targetFile, {
        includeSecurityScan: true,
        includePerformanceAnalysis: true,
        includeStyleGuide: true,
        generateFixes: true,
        severity: 'medium',
        frameworks: ['react', 'typescript']
      });

      updateServiceStatus('Code Review', 'complete', 100);
      setServicesData(prev => ({ ...prev, codeReview: result }));
    } catch (error) {
      updateServiceStatus('Code Review', 'error', 0);
      console.error('Code review failed:', error);
    }
  };

  const runTestGeneration = async (filePath?: string) => {
    if (!services.testing) return;

    updateServiceStatus('Testing Engine', 'running', 30);
    
    try {
      const targetFile = filePath || getCurrentFile();
      if (!targetFile) return;

      updateServiceStatus('Testing Engine', 'running', 70);
      
      const testFiles = await services.testing.generateTests(targetFile, {
        testTypes: ['unit', 'integration'],
        coverageTarget: 80,
        generateMocks: true,
        includeEdgeCases: true,
        testFramework: 'vitest'
      });

      updateServiceStatus('Testing Engine', 'complete', 100);
      setServicesData(prev => ({ ...prev, testing: { testFiles } }));
    } catch (error) {
      updateServiceStatus('Testing Engine', 'error', 0);
      console.error('Test generation failed:', error);
    }
  };

  const runDocumentationGeneration = async (filePath?: string) => {
    if (!services.documentation) return;

    updateServiceStatus('Documentation', 'running', 25);
    
    try {
      const targetFile = filePath || getCurrentFile();
      if (!targetFile) return;

      updateServiceStatus('Documentation', 'running', 75);
      
      const result = await services.documentation.generateDocumentation(targetFile, {
        includePrivate: false,
        generateExamples: true,
        includeTypeInfo: true,
        outputFormat: 'markdown',
        language: 'en',
        includeUsageExamples: true,
        generateTutorials: false
      });

      updateServiceStatus('Documentation', 'complete', 100);
      setServicesData(prev => ({ ...prev, documentation: result }));
    } catch (error) {
      updateServiceStatus('Documentation', 'error', 0);
      console.error('Documentation generation failed:', error);
    }
  };

  const runProjectAnalytics = async () => {
    if (!services.analytics) return;

    updateServiceStatus('Analytics', 'running', 40);
    
    try {
      const projectPath = workbenchStore.currentFilePath || '/project';
      
      updateServiceStatus('Analytics', 'running', 80);
      
      const result = await services.analytics.analyzeProject(projectPath);

      updateServiceStatus('Analytics', 'complete', 100);
      setServicesData(prev => ({ ...prev, analytics: result }));
    } catch (error) {
      updateServiceStatus('Analytics', 'error', 0);
      console.error('Analytics failed:', error);
    }
  };

  const updateServiceStatus = (serviceName: string, status: ServiceStatus['status'], progress: number) => {
    setServiceStatuses(prev => prev.map(service => 
      service.name === serviceName 
        ? { ...service, status, progress, lastRun: status === 'complete' ? new Date().toISOString() : service.lastRun }
        : service
    ));
  };

  const getCurrentFile = (): string | null => {
    return workbenchStore.currentFilePath || null;
  };

  const runAllServices = async () => {
    const currentFile = getCurrentFile();
    if (!currentFile) return;

    await Promise.all([
      runCodeReview(currentFile),
      runTestGeneration(currentFile),
      runDocumentationGeneration(currentFile),
      runProjectAnalytics()
    ]);
  };

  return (
    <div className="h-full flex flex-col bg-bolt-elements-background-depth-1">
      {/* Header */}
      <div className="p-4 border-b border-bolt-elements-borderColor">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary flex items-center gap-2">
            <IconRocket className="w-6 h-6" />
            Advanced AI Services
          </h2>
          <button
            onClick={runAllServices}
            className="px-4 py-2 bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text rounded-lg transition-colors"
          >
            Run All Services
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: IconDeviceAnalytics },
            { key: 'review', label: 'Code Review', icon: IconBug },
            { key: 'testing', label: 'Testing', icon: IconTestPipe },
            { key: 'docs', label: 'Documentation', icon: IconFileText },
            { key: 'analytics', label: 'Analytics', icon: IconShield }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === key
                  ? 'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text'
                  : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {activeTab === 'dashboard' && (
          <DashboardView 
            serviceStatuses={serviceStatuses}
            servicesData={servicesData}
            onRunService={{
              codeReview: runCodeReview,
              testing: runTestGeneration,
              documentation: runDocumentationGeneration,
              analytics: runProjectAnalytics
            }}
          />
        )}
        
        {activeTab === 'review' && (
          <CodeReviewView 
            data={servicesData.codeReview}
            onRun={runCodeReview}
            status={serviceStatuses.find(s => s.name === 'Code Review')}
          />
        )}
        
        {activeTab === 'testing' && (
          <TestingView 
            data={servicesData.testing}
            onRun={runTestGeneration}
            status={serviceStatuses.find(s => s.name === 'Testing Engine')}
          />
        )}
        
        {activeTab === 'docs' && (
          <DocumentationView 
            data={servicesData.documentation}
            onRun={runDocumentationGeneration}
            status={serviceStatuses.find(s => s.name === 'Documentation')}
          />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsView 
            data={servicesData.analytics}
            onRun={runProjectAnalytics}
            status={serviceStatuses.find(s => s.name === 'Analytics')}
          />
        )}
      </div>
    </div>
  );
}

// Dashboard View Component
function DashboardView({ serviceStatuses, servicesData, onRunService }: {
  serviceStatuses: ServiceStatus[];
  servicesData: AdvancedServicesData;
  onRunService: any;
}) {
  return (
    <div className="space-y-6">
      <div className="text-lg font-medium text-bolt-elements-textPrimary">Service Overview</div>
      
      {/* Service Status Grid */}
      <div className="grid grid-cols-2 gap-4">
        {serviceStatuses.map((service, index) => (
          <div key={service.name} className="p-4 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-bolt-elements-textPrimary">{service.name}</div>
              <div className={`px-2 py-1 rounded text-xs ${getStatusColor(service.status)}`}>
                {service.status}
              </div>
            </div>
            
            {service.status === 'running' && (
              <div className="w-full bg-bolt-elements-background-depth-3 rounded-full h-2 mb-2">
                <div 
                  className="bg-bolt-elements-button-primary-background h-2 rounded-full transition-all duration-300"
                  style={{ width: `${service.progress}%` }}
                />
              </div>
            )}
            
            {service.lastRun && (
              <div className="text-xs text-bolt-elements-textSecondary">
                Last run: {new Date(service.lastRun).toLocaleTimeString()}
              </div>
            )}

            <button
              onClick={() => {
                switch(service.name) {
                  case 'Code Review': onRunService.codeReview(); break;
                  case 'Testing Engine': onRunService.testing(); break;
                  case 'Documentation': onRunService.documentation(); break;
                  case 'Analytics': onRunService.analytics(); break;
                }
              }}
              className="mt-2 px-3 py-1 bg-bolt-elements-button-secondary-background hover:bg-bolt-elements-button-secondary-backgroundHover text-bolt-elements-button-secondary-text rounded transition-colors text-sm"
            >
              Run {service.name}
            </button>
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="space-y-4">
        <div className="text-lg font-medium text-bolt-elements-textPrimary">Quick Insights</div>
        
        {servicesData.analytics && (
          <div className="p-4 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor">
            <div className="font-medium text-bolt-elements-textPrimary mb-2">Project Health</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-bolt-elements-textSecondary">Code Quality</div>
                <div className="text-lg font-semibold text-bolt-elements-textPrimary">
                  {servicesData.analytics.metrics?.codeQuality?.overallScore || 0}%
                </div>
              </div>
              <div>
                <div className="text-bolt-elements-textSecondary">Security Score</div>
                <div className="text-lg font-semibold text-bolt-elements-textPrimary">
                  {servicesData.analytics.metrics?.security?.securityScore || 0}%
                </div>
              </div>
              <div>
                <div className="text-bolt-elements-textSecondary">Test Coverage</div>
                <div className="text-lg font-semibold text-bolt-elements-textPrimary">
                  {servicesData.analytics.metrics?.testing?.testCoverage || 0}%
                </div>
              </div>
            </div>
          </div>
        )}

        {servicesData.codeReview && (
          <div className="p-4 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor">
            <div className="font-medium text-bolt-elements-textPrimary mb-2">Recent Code Review</div>
            <div className="text-sm text-bolt-elements-textSecondary">
              Found {servicesData.codeReview.issues?.length || 0} issues, 
              {servicesData.codeReview.securityVulnerabilities?.length || 0} security vulnerabilities
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Code Review View Component
function CodeReviewView({ data, onRun, status }: { data: any; onRun: () => void; status?: ServiceStatus }) {
  if (!data) {
    return (
      <div className="text-center py-12">
        <IconBug className="w-12 h-12 text-bolt-elements-textSecondary mx-auto mb-4" />
        <div className="text-bolt-elements-textSecondary mb-4">No code review data available</div>
        <button
          onClick={onRun}
          disabled={status?.status === 'running'}
          className="px-4 py-2 bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text rounded-lg transition-colors disabled:opacity-50"
        >
          {status?.status === 'running' ? 'Running Review...' : 'Start Code Review'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium text-bolt-elements-textPrimary">Code Review Results</div>
        <button
          onClick={onRun}
          className="px-4 py-2 bg-bolt-elements-button-secondary-background hover:bg-bolt-elements-button-secondary-backgroundHover text-bolt-elements-button-secondary-text rounded-lg transition-colors"
        >
          Re-run Review
        </button>
      </div>

      {/* Quality Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-bolt-elements-background-depth-2">
          <div className="text-sm text-bolt-elements-textSecondary">Overall Score</div>
          <div className="text-2xl font-bold text-bolt-elements-textPrimary">
            {data.metrics?.overallScore || 0}%
          </div>
        </div>
        <div className="p-4 rounded-lg bg-bolt-elements-background-depth-2">
          <div className="text-sm text-bolt-elements-textSecondary">Issues Found</div>
          <div className="text-2xl font-bold text-bolt-elements-textPrimary">
            {data.issues?.length || 0}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-bolt-elements-background-depth-2">
          <div className="text-sm text-bolt-elements-textSecondary">Security Issues</div>
          <div className="text-2xl font-bold text-bolt-elements-textPrimary">
            {data.securityVulnerabilities?.length || 0}
          </div>
        </div>
      </div>

      {/* Issues List */}
      {data.issues && data.issues.length > 0 && (
        <div className="space-y-4">
          <div className="font-medium text-bolt-elements-textPrimary">Issues</div>
          {data.issues.slice(0, 10).map((issue: any, index: number) => (
            <div key={index} className="p-3 rounded-lg bg-bolt-elements-background-depth-2 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div className="font-medium text-bolt-elements-textPrimary">{issue.message}</div>
                <div className={`px-2 py-1 rounded text-xs ${getSeverityColor(issue.severity)}`}>
                  {issue.severity}
                </div>
              </div>
              <div className="text-sm text-bolt-elements-textSecondary mt-1">
                Line {issue.line}: {issue.description}
              </div>
              {issue.suggestion && (
                <div className="text-sm text-bolt-elements-textSecondary mt-1 italic">
                  💡 {issue.suggestion}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Testing View Component
function TestingView({ data, onRun, status }: { data: any; onRun: () => void; status?: ServiceStatus }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium text-bolt-elements-textPrimary">Testing Engine</div>
        <button
          onClick={onRun}
          disabled={status?.status === 'running'}
          className="px-4 py-2 bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text rounded-lg transition-colors disabled:opacity-50"
        >
          {status?.status === 'running' ? 'Generating Tests...' : 'Generate Tests'}
        </button>
      </div>

      {data?.testFiles ? (
        <div className="space-y-4">
          <div className="font-medium text-bolt-elements-textPrimary">Generated Test Files</div>
          {data.testFiles.map((file: string, index: number) => (
            <div key={index} className="p-3 rounded-lg bg-bolt-elements-background-depth-2">
              <div className="font-medium text-bolt-elements-textPrimary">{file}</div>
              <div className="text-sm text-bolt-elements-textSecondary">Test file generated successfully</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <IconTestPipe className="w-12 h-12 text-bolt-elements-textSecondary mx-auto mb-4" />
          <div className="text-bolt-elements-textSecondary">No test data available</div>
        </div>
      )}
    </div>
  );
}

// Documentation View Component
function DocumentationView({ data, onRun, status }: { data: any; onRun: () => void; status?: ServiceStatus }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium text-bolt-elements-textPrimary">Documentation Assistant</div>
        <button
          onClick={onRun}
          disabled={status?.status === 'running'}
          className="px-4 py-2 bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text rounded-lg transition-colors disabled:opacity-50"
        >
          {status?.status === 'running' ? 'Generating Docs...' : 'Generate Documentation'}
        </button>
      </div>

      {data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-bolt-elements-background-depth-2">
              <div className="text-sm text-bolt-elements-textSecondary">Coverage</div>
              <div className="text-2xl font-bold text-bolt-elements-textPrimary">
                {data.quality?.coverage || 0}%
              </div>
            </div>
            <div className="p-4 rounded-lg bg-bolt-elements-background-depth-2">
              <div className="text-sm text-bolt-elements-textSecondary">API Items</div>
              <div className="text-2xl font-bold text-bolt-elements-textPrimary">
                {data.apiDocs?.length || 0}
              </div>
            </div>
          </div>
          
          {data.suggestions && data.suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="font-medium text-bolt-elements-textPrimary">Suggestions</div>
              {data.suggestions.map((suggestion: string, index: number) => (
                <div key={index} className="p-2 rounded bg-bolt-elements-background-depth-3 text-sm text-bolt-elements-textSecondary">
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <IconFileText className="w-12 h-12 text-bolt-elements-textSecondary mx-auto mb-4" />
          <div className="text-bolt-elements-textSecondary">No documentation data available</div>
        </div>
      )}
    </div>
  );
}

// Analytics View Component
function AnalyticsView({ data, onRun, status }: { data: any; onRun: () => void; status?: ServiceStatus }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium text-bolt-elements-textPrimary">Project Analytics</div>
        <button
          onClick={onRun}
          disabled={status?.status === 'running'}
          className="px-4 py-2 bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text rounded-lg transition-colors disabled:opacity-50"
        >
          {status?.status === 'running' ? 'Analyzing...' : 'Run Analytics'}
        </button>
      </div>

      {data ? (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-bolt-elements-background-depth-2">
              <div className="text-sm text-bolt-elements-textSecondary">Code Quality</div>
              <div className="text-2xl font-bold text-bolt-elements-textPrimary">
                {data.metrics?.codeQuality?.overallScore || 0}%
              </div>
            </div>
            <div className="p-4 rounded-lg bg-bolt-elements-background-depth-2">
              <div className="text-sm text-bolt-elements-textSecondary">Security</div>
              <div className="text-2xl font-bold text-bolt-elements-textPrimary">
                {data.metrics?.security?.securityScore || 0}%
              </div>
            </div>
            <div className="p-4 rounded-lg bg-bolt-elements-background-depth-2">
              <div className="text-sm text-bolt-elements-textSecondary">Performance</div>
              <div className="text-2xl font-bold text-bolt-elements-textPrimary">
                {data.metrics?.performance?.performanceScore || 0}%
              </div>
            </div>
            <div className="p-4 rounded-lg bg-bolt-elements-background-depth-2">
              <div className="text-sm text-bolt-elements-textSecondary">Test Coverage</div>
              <div className="text-2xl font-bold text-bolt-elements-textPrimary">
                {data.metrics?.testing?.testCoverage || 0}%
              </div>
            </div>
          </div>

          {/* Insights */}
          {data.insights && data.insights.length > 0 && (
            <div className="space-y-4">
              <div className="font-medium text-bolt-elements-textPrimary">Key Insights</div>
              {data.insights.slice(0, 5).map((insight: any, index: number) => (
                <div key={index} className="p-4 rounded-lg bg-bolt-elements-background-depth-2 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-bolt-elements-textPrimary">{insight.title}</div>
                    <div className={`px-2 py-1 rounded text-xs ${getImpactColor(insight.impact)}`}>
                      {insight.impact}
                    </div>
                  </div>
                  <div className="text-sm text-bolt-elements-textSecondary">{insight.description}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations && data.recommendations.length > 0 && (
            <div className="space-y-4">
              <div className="font-medium text-bolt-elements-textPrimary">Recommendations</div>
              {data.recommendations.slice(0, 3).map((rec: any, index: number) => (
                <div key={index} className="p-4 rounded-lg bg-bolt-elements-background-depth-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-bolt-elements-textPrimary">{rec.title}</div>
                    <div className={`px-2 py-1 rounded text-xs ${getPriorityColor(rec.priority)}`}>
                      {rec.priority}
                    </div>
                  </div>
                  <div className="text-sm text-bolt-elements-textSecondary mb-2">{rec.description}</div>
                  <div className="text-xs text-bolt-elements-textSecondary">
                    Effort: {rec.effort} | Impact: {rec.impact} | Est. {rec.estimatedHours}h
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <IconDeviceAnalytics className="w-12 h-12 text-bolt-elements-textSecondary mx-auto mb-4" />
          <div className="text-bolt-elements-textSecondary">No analytics data available</div>
        </div>
      )}
    </div>
  );
}

// Helper functions for styling
function getStatusColor(status: string): string {
  switch (status) {
    case 'running': return 'bg-yellow-100 text-yellow-800';
    case 'complete': return 'bg-green-100 text-green-800';
    case 'error': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getImpactColor(impact: string): string {
  switch (impact) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default AdvancedServicesPanel;
